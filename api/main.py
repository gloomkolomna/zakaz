from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

import config
from db import SessionLocal, init_db
from middleware import log_failed_requests
from routes.admin_catalog import router as admin_catalog_router
from routes.admin_orders import router as admin_orders_router
from routes.auth import router as auth_router
from routes.catalog import router as catalog_router
from routes.me import router as me_router
from routes.orders import router as orders_router

init_db()

from services.vk_group_member import gate_misconfigured

if gate_misconfigured():
    print(
        "WARNING: MEMBER_GATE_ENABLED включён, но VK_SERVICE_TOKEN/VK_GROUP_ID не заданы — "
        "гейт подписки фактически отключён (fail-open)",
        flush=True,
    )

from services.donor import start_donor_sync_thread

start_donor_sync_thread()


app = FastAPI(title="Магазин игр API")
app.state.session_factory = SessionLocal

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys([
        config.FRONTEND_URL,
        "http://127.0.0.1:5177",
        "http://localhost:5177",
        "https://vk.com",
        "https://m.vk.com",
    ])),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(BaseHTTPMiddleware, dispatch=log_failed_requests)

app.mount("/api/uploads", StaticFiles(directory=config.UPLOADS_DIR), name="uploads")

app.include_router(auth_router)
app.include_router(me_router)
app.include_router(catalog_router)
app.include_router(orders_router)
app.include_router(admin_catalog_router)
app.include_router(admin_orders_router)


@app.get("/api/")
def health():
    return {"status": "ok", "service": "zakaz-api"}
