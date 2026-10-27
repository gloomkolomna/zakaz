from __future__ import annotations

import datetime

import services.donor as donor_svc
from models import DonorCache, User


def test_sync_user_writes_cache(db, monkeypatch):
    monkeypatch.setattr(
        donor_svc,
        "_fetch_remote",
        lambda vk_id: {"is_don": True, "don_since": "2025-01-01", "updated_at": "2026-10-27"},
    )
    assert donor_svc.sync_user(db, 123) is True
    row = db.query(DonorCache).filter(DonorCache.vk_id == 123).first()
    assert row.is_don is True
    assert row.don_since == "2025-01-01"
    assert row.last_synced_at


def test_sync_user_keeps_last_value_when_bot_down(db, monkeypatch):
    db.add(DonorCache(vk_id=123, is_don=True, last_synced_at="old"))
    db.commit()
    monkeypatch.setattr(donor_svc, "_fetch_remote", lambda vk_id: None)
    assert donor_svc.sync_user(db, 123) is None
    row = db.query(DonorCache).filter(DonorCache.vk_id == 123).first()
    assert row.is_don is True
    assert row.last_synced_at == "old"


def test_donor_flags_and_access(db):
    db.add(DonorCache(vk_id=123, is_don=True))
    db.add(User(vk_id=123, role="player"))
    db.add(User(vk_id=124, role="player", donor_exempt=True))
    db.add(User(vk_id=400977, role="admin"))
    db.commit()

    assert donor_svc.donor_flags(db, [123, 124, 999]) == {123: True}
    assert donor_svc.is_donor_user(db, db.query(User).filter(User.vk_id == 123).first()) is True
    assert donor_svc.is_donor_user(db, db.query(User).filter(User.vk_id == 124).first()) is True
    assert donor_svc.is_donor_user(db, db.query(User).filter(User.vk_id == 400977).first()) is True


def test_me_reports_donor_status(player_client, db):
    db.add(User(vk_id=123, role="player"))
    db.add(DonorCache(vk_id=123, is_don=True))
    db.commit()
    data = player_client.get("/api/me").json()
    assert data["is_donor"] is True
    assert data["donor_exempt"] is False

    user = db.query(User).filter(User.vk_id == 123).first()
    user.donor_exempt = True
    db.commit()
    data = player_client.get("/api/me").json()
    assert data["is_donor"] is True
    assert data["donor_exempt"] is True


def test_session_syncs_donor_on_login(client, monkeypatch):
    calls: list[int] = []
    monkeypatch.setattr(donor_svc, "sync_user", lambda db, vk_id: calls.append(vk_id))
    resp = client.post("/api/auth/session", json={"params": {"vk_user_id": 123}})
    assert resp.status_code == 200
    assert calls == [123]


def test_sync_all_users_skips_admins(db, monkeypatch):
    db.add(User(vk_id=123, role="player"))
    db.add(User(vk_id=124, role="player"))
    db.add(User(vk_id=400977, role="admin"))
    db.commit()
    seen: list[int] = []

    def fake_sync(db_session, vk_id):
        seen.append(vk_id)
        return True

    monkeypatch.setattr(donor_svc, "sync_user", fake_sync)
    assert donor_svc.sync_all_users(db) == 2
    assert sorted(seen) == [123, 124]
