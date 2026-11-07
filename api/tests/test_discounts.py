from __future__ import annotations

import pytest

from models import DiscountGrant, Order
from tests.conftest import make_user_client
from tests.factories import make_card, make_product, make_section, make_step


@pytest.fixture
def integration_key(monkeypatch):
    import config
    monkeypatch.setattr(config, "HOLIDAYS_INTEGRATION_KEY", "test-integration-key")
    return {"X-Integration-Key": "test-integration-key"}


def _grant(client, vk_id=123, external_id="holidays:purchase:1", percent=5, headers=None):
    return client.post(
        "/api/internal/rewards/discount",
        json={"vk_id": vk_id, "external_reward_id": external_id, "percent": percent},
        headers=headers or {},
    )


def _build_product(db, price=1000):
    section = make_section(db)
    product = make_product(db, section)
    step = make_step(db, product, is_required=True)
    card = make_card(db, step, price=price)
    return product, card


def test_internal_discount_requires_key(client, integration_key):
    assert _grant(client).status_code == 403


def test_discount_reserved_before_registration_and_idempotent(client, player_client, db, integration_key):
    first = _grant(client, headers=integration_key)
    second = _grant(client, headers=integration_key)

    assert first.status_code == second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["user_registered"] is False
    assert db.query(DiscountGrant).count() == 1

    available = player_client.get("/api/me/discounts")
    assert available.status_code == 200
    assert available.json()["items"][0]["percent"] == 5


def test_build_order_applies_discount_and_snapshots_it(player_client, db, integration_key):
    product, card = _build_product(db, 1240)
    grant_id = _grant(player_client, headers=integration_key).json()["id"]

    response = player_client.post("/api/orders", json={
        "product_id": product.id,
        "items": [{"card_id": card.id, "qty": 1}],
        "discount_grant_id": grant_id,
    })

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["subtotal"] == 1240
    assert data["discount_percent"] == 5
    assert data["discount_amount"] == 62
    assert data["total"] == 1178
    assert data["discount_grant_id"] == grant_id
    grant = db.get(DiscountGrant, grant_id)
    assert grant.status == "used"
    assert grant.order_id == data["id"]


def test_single_order_discount_rounds_to_nearest_ruble(player_client, db, integration_key):
    section = make_section(db)
    product = make_product(db, section, mode="single", price=1990)
    grant_id = _grant(player_client, headers=integration_key).json()["id"]

    response = player_client.post("/api/orders", json={
        "product_id": product.id,
        "qty": 1,
        "discount_grant_id": grant_id,
    })

    assert response.status_code == 201, response.text
    assert response.json()["subtotal"] == 1990
    assert response.json()["discount_amount"] == 100
    assert response.json()["total"] == 1890


def test_foreign_or_used_discount_cannot_be_applied(player_client, db, integration_key):
    product, card = _build_product(db)
    grant_id = _grant(player_client, headers=integration_key).json()["id"]
    payload = {
        "product_id": product.id,
        "items": [{"card_id": card.id, "qty": 1}],
        "discount_grant_id": grant_id,
    }

    with make_user_client(124) as other:
        assert other.post("/api/orders", json=payload).status_code == 409

    assert player_client.post("/api/orders", json=payload).status_code == 201
    assert player_client.post("/api/orders", json=payload).status_code == 409
    assert db.query(Order).count() == 1


def test_cancel_returns_discount_and_allows_reuse(player_client, db, integration_key):
    product, card = _build_product(db)
    grant_id = _grant(player_client, headers=integration_key).json()["id"]
    payload = {
        "product_id": product.id,
        "items": [{"card_id": card.id, "qty": 1}],
        "discount_grant_id": grant_id,
    }
    order_id = player_client.post("/api/orders", json=payload).json()["id"]

    assert player_client.post(f"/api/orders/{order_id}/cancel").status_code == 200
    grant = db.get(DiscountGrant, grant_id)
    assert grant.status == "available"
    assert grant.order_id is None
    assert player_client.get(f"/api/orders/{order_id}").json()["discount_amount"] == 50

    assert player_client.post("/api/orders", json=payload).status_code == 201
    db.refresh(grant)
    assert grant.status == "used"


def test_revoke_only_available_discount(client, player_client, db, integration_key):
    grant_id = _grant(player_client, headers=integration_key).json()["id"]
    response = client.post(
        "/api/internal/rewards/discount/revoke",
        json={"external_reward_id": "holidays:purchase:1"},
        headers=integration_key,
    )
    assert response.status_code == 200
    assert db.get(DiscountGrant, grant_id).status == "revoked"

    product, card = _build_product(db)
    payload = {
        "product_id": product.id,
        "items": [{"card_id": card.id, "qty": 1}],
        "discount_grant_id": grant_id,
    }
    assert player_client.post("/api/orders", json=payload).status_code == 409


def test_order_without_discount_has_zero_discount(player_client, db):
    product, card = _build_product(db)
    response = player_client.post("/api/orders", json={
        "product_id": product.id,
        "items": [{"card_id": card.id, "qty": 1}],
    })
    assert response.status_code == 201
    assert response.json()["subtotal"] == 1000
    assert response.json()["discount_amount"] == 0
    assert response.json()["discount_percent"] == 0
