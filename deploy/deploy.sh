#!/bin/bash
#
# Деплой «СобериЗаказ» на прод. Черновик этапа 0: полный откат,
# ротация архивов и режим -recovery доводятся на этапе 5.
#
#   ./deploy.sh
#
# 1. Фиксирует git-ревизию и ревизию Alembic.
# 2. Делает tar-архив проекта и WAL-safe бэкап БД.
# 3. git pull, pip install, alembic upgrade head.
# 4. Собирает фронтенд, перезапускает zakaz-api, проверяет health.
# 5. При ошибке возвращает git, БД и dist, перезапускает сервис.

set -euo pipefail

APP_DIR="/opt/zakaz"
API_DIR="$APP_DIR/api"
FRONTEND_DIR="$APP_DIR/frontend"
DB_FILE="$API_DIR/zakaz.db"
BACKUP_DIR="/opt/zakaz-backups"
FULL_BACKUPS_TO_KEEP=5
GIT_REMOTE="https://github.com/gloomkolomna/zakaz.git"
GIT_BRANCH="main"
HEALTH_URL="http://127.0.0.1:8006/api/"
LOG_FILE="$API_DIR/deploy.log"

PREV_GIT=""
FULL_ARCHIVE=""
DB_BACKUP=""
DIST_BACKUP=""
MIGRATION_RAN=0
SERVICES_RESTARTED=0

mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

PY_BIN="$API_DIR/venv/bin/python"
[ -x "$PY_BIN" ] || PY_BIN="python3"

sqlite_backup() {
    "$PY_BIN" -c "import sqlite3,sys; s=sqlite3.connect(sys.argv[1]); d=sqlite3.connect(sys.argv[2]); s.backup(d); d.close(); s.close()" "$1" "$2"
}

rollback() {
    log "ОТКАТ: останавливаю zakaz-api"
    systemctl stop zakaz-api 2>/dev/null || true

    if [ -n "$DB_BACKUP" ] && [ -f "$DB_BACKUP" ]; then
        rm -f "$DB_FILE-wal" "$DB_FILE-shm"
        cp "$DB_BACKUP" "$DB_FILE"
        log "ОТКАТ: БД восстановлена из $DB_BACKUP"
    fi

    if [ -n "$PREV_GIT" ]; then
        cd "$APP_DIR"
        git reset --hard "$PREV_GIT"
        git clean -fd 2>/dev/null || true
        log "ОТКАТ: git сброшен к $PREV_GIT"
    fi

    if [ -d "$DIST_BACKUP" ]; then
        rm -rf "$FRONTEND_DIR/dist"
        mv "$DIST_BACKUP" "$FRONTEND_DIR/dist"
        log "ОТКАТ: dist восстановлен"
    fi

    cd "$API_DIR"
    source venv/bin/activate
    pip install -r requirements.txt || log "ОТКАТ: pip install завершился с ошибкой"

    systemctl start zakaz-api || true
    log "ОТКАТ завершён. API: $(systemctl is-active zakaz-api || true)."
}

on_error() {
    local exit_code=$?
    log "ДЕПЛОЙ ПРОВАЛЕН (код $exit_code). Запускаю откат..."
    trap - ERR
    rollback
    exit "$exit_code"
}
trap on_error ERR

log "=== 1. Фиксация текущего состояния ==="
cd "$APP_DIR"
PREV_GIT=$(git rev-parse HEAD 2>/dev/null || echo "")
log "Git-ревизия до деплоя: ${PREV_GIT:-неизвестна}"

cd "$API_DIR"
source venv/bin/activate
PREV_REV=$(python -m alembic current 2>/dev/null | awk '{print $1}' | head -n1)
log "Ревизия БД до деплоя: ${PREV_REV:-пустая}"

log "=== 2. Резервное копирование ==="
FULL_ARCHIVE="$BACKUP_DIR/zakaz_full_$(date '+%Y%m%d_%H%M%S').tar.gz"
if tar -czf "$FULL_ARCHIVE" \
    --exclude="$API_DIR/venv" \
    --exclude="$FRONTEND_DIR/node_modules" \
    --exclude="$APP_DIR/.git" \
    --exclude='*.log' \
    -C "$(dirname "$APP_DIR")" "$(basename "$APP_DIR")" 2>/dev/null; then
    log "Полный архив создан: $FULL_ARCHIVE ($(du -h "$FULL_ARCHIVE" | cut -f1))"
    ls -1t "$BACKUP_DIR"/zakaz_full_*.tar.gz 2>/dev/null | tail -n +$((FULL_BACKUPS_TO_KEEP + 1)) | while read -r old; do
        rm -f "$old"
    done
else
    log "ВНИМАНИЕ: полный архив не создан, продолжаю без него"
    FULL_ARCHIVE=""
fi

if [ -f "$DB_FILE" ]; then
    DB_BACKUP="$BACKUP_DIR/zakaz.db.bak.$(date '+%Y%m%d_%H%M%S')"
    if sqlite_backup "$DB_FILE" "$DB_BACKUP"; then
        log "Бэкап БД создан: $DB_BACKUP"
    else
        log "ВНИМАНИЕ: бэкап БД не создан"
        DB_BACKUP=""
    fi
fi

if [ -d "$FRONTEND_DIR/dist" ]; then
    DIST_BACKUP="$FRONTEND_DIR/dist.bak"
    rm -rf "$DIST_BACKUP"
    cp -r "$FRONTEND_DIR/dist" "$DIST_BACKUP"
    log "Бэкап dist создан"
fi

log "=== 3. Git pull ==="
cd "$APP_DIR"
rm -f frontend/tsconfig.tsbuildinfo
git fetch "$GIT_REMOTE" "$GIT_BRANCH"
git reset --hard FETCH_HEAD

log "=== 4. Зависимости и миграции ==="
cd "$API_DIR"
source venv/bin/activate
pip install -r requirements.txt
python -m alembic upgrade head
MIGRATION_RAN=1
log "Текущая ревизия БД: $(python -m alembic current 2>/dev/null | awk '{print $1}' | head -n1)"

log "=== 5. Сборка фронтенда ==="
cd "$FRONTEND_DIR"
npm install --no-audit --no-fund --prefer-offline
rm -rf dist
npm run build

log "=== 6. Перезапуск и health-check ==="
systemctl restart zakaz-api
SERVICES_RESTARTED=1
sleep 3

HEALTH_OK=0
for i in 1 2 3 4 5; do
    if curl -fsS -o /dev/null "$HEALTH_URL"; then
        HEALTH_OK=1
        break
    fi
    log "Health-check $i/5 неудачен, ждём"
    sleep 3
done

if [ "$HEALTH_OK" -ne 1 ]; then
    log "Health-check провалился"
    false
fi

rm -rf "$DIST_BACKUP" 2>/dev/null || true
log "=== Деплой успешно завершён ==="
