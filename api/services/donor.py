from __future__ import annotations

import datetime
import threading
import time

import config


def _now_iso() -> str:
    return datetime.datetime.utcnow().isoformat()


def _fetch_remote(vk_id: int) -> dict | None:
    if not config.DONUT_API_URL or not config.DONUT_API_KEY:
        return None
    import httpx

    try:
        resp = httpx.get(
            f"{config.DONUT_API_URL}/{vk_id}",
            headers={"X-API-Key": config.DONUT_API_KEY},
            timeout=config.DONUT_TIMEOUT_SECONDS,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
    except Exception:
        return None
    return data if isinstance(data, dict) else None


def sync_user(db, vk_id: int) -> bool | None:
    from models import DonorCache

    data = _fetch_remote(vk_id)
    if data is None:
        return None
    is_don = bool(data.get("is_don"))

    row = db.query(DonorCache).filter(DonorCache.vk_id == vk_id).first()
    if row is None:
        row = DonorCache(vk_id=vk_id)
        db.add(row)
    row.is_don = is_don
    row.don_since = str(data.get("don_since")) if data.get("don_since") else None
    row.updated_at = str(data.get("updated_at")) if data.get("updated_at") else None
    row.last_synced_at = _now_iso()
    db.commit()
    return is_don


def is_donor(db, vk_id: int) -> bool:
    from models import DonorCache

    row = db.query(DonorCache).filter(DonorCache.vk_id == vk_id).first()
    return bool(row is not None and row.is_don)


def is_donor_user(db, user) -> bool:
    if user is None:
        return False
    return bool(user.role == "admin" or user.donor_exempt or is_donor(db, user.vk_id))


def donor_flags(db, vk_ids: list[int]) -> dict[int, bool]:
    from models import DonorCache

    if not vk_ids:
        return {}
    rows = db.query(DonorCache).filter(DonorCache.vk_id.in_(vk_ids)).all()
    return {row.vk_id: bool(row.is_don) for row in rows}


def sync_all_users(db) -> int:
    from models import User

    synced = 0
    for user in db.query(User).filter(User.role != "admin").all():
        if sync_user(db, user.vk_id) is not None:
            synced += 1
    return synced


def donor_loop() -> None:
    from db import SessionLocal

    while True:
        try:
            db = SessionLocal()
            try:
                sync_all_users(db)
            finally:
                db.close()
        except Exception:
            pass
        time.sleep(max(60, config.DONOR_SYNC_INTERVAL_MINUTES * 60))


def start_donor_sync_thread() -> threading.Thread | None:
    if not (config.DONUT_API_URL and config.DONUT_API_KEY):
        return None
    thread = threading.Thread(target=donor_loop, daemon=True, name="donor-sync")
    thread.start()
    return thread
