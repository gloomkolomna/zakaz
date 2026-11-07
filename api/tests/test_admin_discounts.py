from __future__ import annotations

from models import DiscountGrant, User
from tests.conftest import make_user_client


def test_admin_discounts_forbidden_for_player(player_client):
    assert player_client.get("/api/admin/discounts").status_code == 403
    assert player_client.post("/api/admin/discounts", json={"vk_id": 123, "percent": 5}).status_code == 403
    assert player_client.post("/api/admin/discounts/1/revoke").status_code == 403


def test_admin_grants_manual_discount_before_registration(admin_client, db):
    response = admin_client.post("/api/admin/discounts", json={"vk_id": 999, "percent": 10})
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["source"] == "manual"
    assert data["percent"] == 10
    assert data["status"] == "available"
    assert data["user_registered"] is False
    assert data["external_reward_id"].startswith("manual:")

    listed = admin_client.get("/api/admin/discounts?vk_id=999&status=available").json()
    assert len(listed["items"]) == 1
    assert listed["items"][0]["id"] == data["id"]
    assert admin_client.get("/api/admin/discounts?vk_id=999&status=used").json()["items"] == []

    with make_user_client(999) as player:
        available = player.get("/api/me/discounts").json()["items"]
    assert [item["percent"] for item in available] == [10]


def test_admin_discount_validation(admin_client):
    assert admin_client.post("/api/admin/discounts", json={"vk_id": 0, "percent": 5}).status_code == 422
    assert admin_client.post("/api/admin/discounts", json={"vk_id": 123, "percent": 0}).status_code == 422
    assert admin_client.post("/api/admin/discounts", json={"vk_id": 123, "percent": 100}).status_code == 422


def test_admin_list_includes_customer_and_order_data(admin_client, db):
    db.add(User(vk_id=123, role="player", display_name="Тестовый Покупатель"))
    db.commit()
    created = admin_client.post("/api/admin/discounts", json={"vk_id": 123, "percent": 5}).json()
    grant = db.get(DiscountGrant, created["id"])
    grant.status = "used"
    grant.order_id = 77
    db.commit()

    row = admin_client.get("/api/admin/discounts?vk_id=123&status=used").json()["items"][0]
    assert row["display_name"] == "Тестовый Покупатель"
    assert row["order_id"] == 77
    assert row["source"] == "manual"


def test_admin_revokes_only_unused_discount(admin_client, db):
    created = admin_client.post("/api/admin/discounts", json={"vk_id": 123, "percent": 5}).json()
    response = admin_client.post(f"/api/admin/discounts/{created['id']}/revoke")
    assert response.status_code == 200
    assert db.get(DiscountGrant, created["id"]).status == "revoked"

    other = admin_client.post("/api/admin/discounts", json={"vk_id": 123, "percent": 5}).json()
    grant = db.get(DiscountGrant, other["id"])
    grant.status = "used"
    db.commit()
    assert admin_client.post(f"/api/admin/discounts/{other['id']}/revoke").status_code == 409
    assert admin_client.post("/api/admin/discounts/999999/revoke").status_code == 404
