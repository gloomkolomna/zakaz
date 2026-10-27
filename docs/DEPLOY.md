# Деплой «СобериЗаказ»

Сервер: `user@belovolovhome.ru` (sudo), домен `https://belovolovhome.ru/zakaz/`.
Каталог: `/opt/zakaz`, API `127.0.0.1:8006`, БД `api/zakaz.db`, бэкапы
`/opt/zakaz-backups`, логи `/var/log/zakaz`.

## 1. Первичная установка

```bash
ssh user@belovolovhome.ru
sudo mkdir -p /opt/zakaz /var/log/zakaz
sudo chown -R "$USER":"$USER" /opt/zakaz /var/log/zakaz
git clone https://github.com/gloomkolomna/zakaz.git /opt/zakaz
cd /opt/zakaz
python3 -m venv api/venv
api/venv/bin/pip install -r api/requirements.txt
```

Создать `api/.env` (не коммитится):

```env
VK_APP_ID=54856596
VK_APP_SECRET=...
VK_SERVICE_TOKEN=...
VK_GROUP_ID=206593200
ADMIN_VK_IDS=400977,795384
MEMBER_GATE_ENABLED=true
APP_ENV=production
DEV_LOGIN_ENABLED=false
SECRET_KEY=<openssl rand -hex 32>
DATABASE_URL=sqlite:///zakaz.db
FRONTEND_URL=https://belovolovhome.ru/zakaz
DONUT_API_URL=
DONUT_API_KEY=
DONOR_SYNC_INTERVAL_MINUTES=30
EARLY_ACCESS_HOURS=48
UPLOAD_MAX_BYTES=10485760
VIDEO_MAX_MB=100
LOG_RETENTION_DAYS=30
S3_ENABLED=false
S3_BUCKET_NAME=korgiholidays
S3_PREFIX=zakaz
```

Применить схему и собрать фронт:

```bash
cd /opt/zakaz/api
venv/bin/python -m alembic upgrade head
cd /opt/zakaz/frontend
npm install --no-audit --no-fund
npm run build
```

## 2. systemd

```bash
sudo cp /opt/zakaz/deploy/zakaz-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now zakaz-api
systemctl status zakaz-api --no-pager
curl -fsS http://127.0.0.1:8006/api/
```

## 3. nginx

Вставить `deploy/nginx-zakaz.conf` в include-файл домена (FastPanel2:
`/etc/nginx/fastpanel2-sites/belovolovhom_usr/belovolovhome.ru.includes`), затем:

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -I https://belovolovhome.ru/zakaz/
```

Лимит тела — 120 МБ (видео до 100 МБ). Отдача `/zakaz/api/uploads/` идёт
через FastAPI StaticFiles с поддержкой `Range` (проверено `206 Partial Content`).

## 4. Бэкапы

```bash
chmod +x /opt/zakaz/deploy/backup.sh
crontab -e
# 0 3 * * * /opt/zakaz/deploy/backup.sh >> /var/log/zakaz/backup.log 2>&1
```

## 5. Обновление

```bash
cd /opt/zakaz
./deploy/deploy.sh
```

Скрипт делает tar-бэкап, WAL-safe бэкап БД, `git reset --hard FETCH_HEAD`,
`alembic upgrade head`, сборку фронта, рестарт, health-check и полный откат
БД/кода/dist при ошибке. Восстановление из архива:

```bash
./deploy/deploy.sh -recovery
```

## 6. VK

В настройках мини-приложения указать URL `https://belovolovhome.ru/zakaz/`
и включить приложение в сообществе `206593200`. Мобильная платформа — iframe
VK WebView; проверить вход подписчиком и не-подписчиком.

## 7. Smoke после деплоя

- `/zakaz/` открывается, шрифты и обложки загружаются.
- Не-подписчик видит экран подписки, подписчик — каталог.
- Товар «до анонса»: не-дон видит дату, дон и админ — кнопку.
- Сквозной заказ с количеством, «Мои заказы», отмена.
- Админка: очередь, стрелки, «Выполнить», плашка отмены, CSV в Excel.
- `systemctl status zakaz-api`, `/var/log/zakaz/api-error.log` без 5xx.
