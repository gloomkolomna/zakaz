from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

API_DIR = os.path.dirname(os.path.abspath(__file__))


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "")
    try:
        return int(str(raw).strip())
    except (ValueError, TypeError):
        return default


def _env_list_int(name: str) -> set[int]:
    raw = os.getenv(name, "")
    if not raw:
        return set()
    return {int(x.strip()) for x in raw.split(",") if x.strip().isdigit()}


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if raw == "":
        return default
    return raw in ("1", "true", "yes")


SECRET_KEY = os.getenv("SECRET_KEY", "change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = _env_int("ACCESS_TOKEN_EXPIRE_MINUTES", 259200)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///zakaz.db")
APP_ENV = os.getenv("APP_ENV", "production").strip().lower()
DEV_LOGIN_ENABLED = APP_ENV == "dev"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5177")

VK_APP_ID = _env_int("VK_APP_ID", 0)
VK_APP_SECRET = os.getenv("VK_APP_SECRET", "")
VK_SERVICE_TOKEN = os.getenv("VK_SERVICE_TOKEN", "")
VK_GROUP_ID = _env_int("VK_GROUP_ID", 0)
ADMIN_VK_IDS = _env_list_int("ADMIN_VK_IDS")

MEMBER_GATE_ENABLED = _env_bool("MEMBER_GATE_ENABLED", True)

DONUT_API_URL = os.getenv("DONUT_API_URL", "").strip().rstrip("/")
DONUT_API_KEY = os.getenv("DONUT_API_KEY", "")
DONUT_TIMEOUT_SECONDS = _env_int("DONUT_TIMEOUT_SECONDS", 5)
DONOR_SYNC_INTERVAL_MINUTES = _env_int("DONOR_SYNC_INTERVAL_MINUTES", 30)
EARLY_ACCESS_HOURS = _env_int("EARLY_ACCESS_HOURS", 48)
ORDER_RATE_LIMIT_PER_MINUTE = _env_int("ORDER_RATE_LIMIT_PER_MINUTE", 10)

LOG_RETENTION_DAYS = _env_int("LOG_RETENTION_DAYS", 30)

UPLOADS_DIR = os.getenv("UPLOADS_DIR", os.path.join(API_DIR, "uploads"))
os.makedirs(UPLOADS_DIR, exist_ok=True)
UPLOAD_MAX_BYTES = _env_int("UPLOAD_MAX_BYTES", 10 * 1024 * 1024)
VIDEO_MAX_MB = _env_int("VIDEO_MAX_MB", 100)
UPLOAD_VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024

S3_ENABLED = _env_bool("S3_ENABLED", False)
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "https://storage.yandexcloud.net")
S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID", "")
S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY", "")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "korgiholidays")
S3_PUBLIC_URL = os.getenv("S3_PUBLIC_URL", "").rstrip("/")
S3_PREFIX = os.getenv("S3_PREFIX", "zakaz").strip("/")


def get_admin_vk_ids() -> set[int]:
    return ADMIN_VK_IDS
