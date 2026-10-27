# Деплой «СобериЗаказ»

Сервер: `root@5.188.26.214` (root), домен `https://belovolovhome.ru/zakaz/`.
Каталог: `/opt/zakaz`, API `127.0.0.1:8006`, БД `api/zakaz.db`, бэкапы
`/opt/zakaz-backups`, логи `/var/log/zakaz`.

## 1. Первичная установка

`deploy/deploy.sh` — это **обновление уже установленного** проекта. Первый
разворот делается вручную по этому разделу: скрипт не создаёт venv, `.env`,
systemd-юнит и nginx-локейшн.

```bash
ssh root@5.188.26.214
mkdir -p /opt/zakaz /var/log/zakaz
git clone https://github.com/gloomkolomna/zakaz.git /opt/zakaz
cd /opt/zakaz
python3 -m venv api/venv
api/venv/bin/pip install -r api/requirements.txt
```

Создать `api/.env` (не коммитится). `SECRET_KEY` — новый:

```bash
echo "SECRET_KEY=$(openssl rand -hex 32)"
```

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
DONUT_API_URL=https://belovolovhome.ru/krestiki-s-korgi/api/donor
DONUT_API_KEY=<ключ донат-бота>
DONUT_TIMEOUT_SECONDS=5
DONOR_SYNC_INTERVAL_MINUTES=30
EARLY_ACCESS_HOURS=48
ORDER_RATE_LIMIT_PER_MINUTE=10
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
cp /opt/zakaz/deploy/zakaz-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now zakaz-api
systemctl status zakaz-api --no-pager
curl -fsS http://127.0.0.1:8006/api/
```

## 3. nginx

Вставить `deploy/nginx-zakaz.conf` в include-файл домена (FastPanel2:
`/etc/nginx/fastpanel2-sites/belovolovhom_usr/belovolovhome.ru.includes`), затем:

```bash
nginx -t && systemctl reload nginx
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

Ты подключаешься как root, поэтому `sudo` не нужен: скрипт вызывает
`systemctl` напрямую. Все файлы в `/opt/zakaz` при этом принадлежат root.

Что делает обычный `deploy.sh`:

1. Запоминает git-ревизию и текущую ревизию Alembic.
2. Делает полный tar-архив `/opt/zakaz-backups/zakaz_full_*.tar.gz`
   (ротация 5), WAL-safe бэкап БД в `api/backups/zakaz.db.bak.*` (ротация 10)
   и копию `frontend/dist`.
3. `git fetch` + `git reset --hard FETCH_HEAD` — **локальные правки на сервере
   будут перезаписаны**.
4. `pip install -r requirements.txt`, `alembic upgrade head` (на пустой БД —
   `init_db()` + `alembic stamp head`).
5. `npm install`, `npm run build`, рестарт `zakaz-api`, health-check
   `http://127.0.0.1:8006/api/` (5 попыток).
6. При любой ошибке на шагах 3–6: downgrade/бэкап БД, `git reset --hard`
   к предыдущей ревизии, возврат `dist`, переустановка зависимостей, рестарт.

Восстановление из архива (интерактивно, с бэкапом текущего состояния):

```bash
cd /opt/zakaz
./deploy/deploy.sh -recovery
```

Важно: архив содержит `.env` и БД, поэтому `/opt/zakaz-backups` должен быть
закрыт от посторонних (`chmod 700`).

## 6. VK

В настройках мини-приложения указать URL `https://belovolovhome.ru/zakaz/`
и включить приложение в сообществе `206593200`. Мобильная платформа — iframe
VK WebView; проверить вход подписчиком и не-подписчиком.

`VK_APP_SECRET` и `VK_SERVICE_TOKEN` берутся из настроек VK-приложения;
сервисный токен нужен для `groups.isMember` (гейт подписки) и `users.get`.

## 7. Доноры и «до анонса»

Проверка донат-бота (он уже отвечает на сервере):

```bash
curl -fsS https://belovolovhome.ru/krestiki-s-korgi/api/health
# {"status":"ok","service":"donut-backend"}
```

Контракт, который ждёт «СобериЗаказ»:

```http
GET {DONUT_API_URL}/{vk_id}
X-API-Key: {DONUT_API_KEY}
```

Успех — `200` и JSON:

```json
{"vk_id": 795384, "is_don": true, "don_since": "2025-01-01T00:00:00"}
```

`is_don` обязателен; `don_since` и `updated_at` сохраняются, если пришли.
Таймаут, не-200 или невалидный JSON не стирают прошлый кэш — доступ остаётся
по последнему известному значению.

### Что заполнить в `api/.env`

| Переменная | Значение |
|---|---|
| `DONUT_API_URL` | `https://belovolovhome.ru/krestiki-s-korgi/api/donor` — **без** `/{vk_id}` на конце; приложение само добавит id |
| `DONUT_API_KEY` | то же значение `API_KEY`, что в `/opt/donut-backend/.env` (или в `.env` проекта `ДонатБот` на сервере) |
| `DONUT_TIMEOUT_SECONDS` | `5` (можно не задавать) |
| `DONOR_SYNC_INTERVAL_MINUTES` | `30` |
| `EARLY_ACCESS_HOURS` | `48` |

Если донат-бот и «СобериЗаказ» на одном сервере, можно ходить напрямую, без
nginx/TLS:

```env
DONUT_API_URL=http://127.0.0.1:8002/api/donor
```

Порт `8002` — из деплой-плана `ДонатБот` (`donut-backend`). Публичный URL
удобнее, если бот за другим прокси; главное — API должен быть доступен
с хоста `zakaz-api` и ключ совпадать.

После правки `.env`:

```bash
systemctl restart zakaz-api
```

Проверка ключа:

```bash
KEY='<DONUT_API_KEY>'
curl -fsS -H "X-API-Key: $KEY" \
  https://belovolovhome.ru/krestiki-s-korgi/api/donor/795384
```

Без ключа endpoint отвечает `403` — это ожидаемо. Неверный ключ в
`DONUT_API_KEY` выглядит так же: синк молча не обновляет кэш.

### Как это работает в приложении

- При входе не-админа вызывается `sync_user`; результат пишется в
  `donor_cache` (`is_don`, `don_since`, `updated_at`, `last_synced_at`).
- Фоновый поток раз в `DONOR_SYNC_INTERVAL_MINUTES` синхронизирует всех
  не-админов; поток стартует только если заданы и URL, и ключ.
- `/me` отдаёт `is_donor` и `donor_exempt`; админ всегда считается доном.
- Товар с `early_until > now`: дон/админ/`donor_exempt` заказывает, остальные
  видят дату и получают `403 early_access` на `POST /orders`.
- Если бот недоступен, остаётся последний кэш. Ручной фолбэк — галочка
  `donor_exempt` во вкладке **«Игроки»** админки.
- Без `DONUT_API_URL`/`DONUT_API_KEY` приложение работает, но «до анонса»
  открыто только админу и пользователям с `donor_exempt`.

### Проверка сценария

1. Убедиться, что у тестового VK ID есть донат в боте (или включить
   `donor_exempt` в админке).
2. Войти этим VK ID → `GET /api/me` → `"is_donor": true`.
3. Включить «до анонса» у товара на 48 часов.
4. Доном — «Собрать заказ» доступна; не-доном — дата и заблокированная CTA.

## 8. Smoke после деплоя

- `/zakaz/` открывается, шрифты и обложки загружаются.
- Не-подписчик видит экран подписки, подписчик — каталог.
- Товар «до анонса»: не-дон видит дату, дон и админ — кнопку.
- Сквозной заказ с количеством, «Мои заказы», отмена.
- Админка: очередь, стрелки, «Выполнить», плашка отмены, CSV в Excel.
- `systemctl status zakaz-api`, `/var/log/zakaz/api-error.log` без 5xx.
