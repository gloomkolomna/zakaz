from __future__ import annotations

import datetime

from models import DonorCache, Order
from tests.conftest import make_user_client
from tests.factories import make_card, make_product, make_section, make_step


def _shop(db, early_until=None, title="Трекер", section_title="Наборы"):
    section = make_section(db, section_title)
    product = make_product(db, section, title, early_until=early_until)
    size = make_step(db, product, "Размер", selection_mode="single", is_required=True, sort_order=1)
    small = make_card(db, size, "30 × 40", price=1000, max_qty=2, sort_order=1)
    large = make_card(db, size, "40 × 50", price=1500, max_qty=2, sort_order=2)
    base = make_step(db, product, "Основа", selection_mode="multi", sort_order=2)
    linen = make_card(db, base, "Лён", price=120, max_qty=5, sort_order=1)
    return product, small, large, linen


def _payload(product, items):
    return {"product_id": product.id, "items": items}


def test_create_order_happy(player_client, db):
    product, small, large, linen = _shop(db)
    resp = player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 1}, {"card_id": linen.id, "qty": 2}]),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["total"] == 1240
    assert data["items_count"] == 2
    assert data["status"] == "new"
    assert data["queue_position"] == 1
    assert data["buyer_name"] == "Покупатель 123"
    assert [(item["card_title"], item["qty"], item["sum"]) for item in data["items"]] == [
        ("30 × 40", 1, 1000),
        ("Лён", 2, 240),
    ]
    assert data["product_title"] == "Трекер"
    assert data["section_title"] == "Наборы"
    assert db.query(Order).count() == 1


def test_create_order_validation(player_client, db):
    product, small, large, linen = _shop(db)
    other_product, other_small, _, _ = _shop(db, title="Другой", section_title="Другой раздел")

    assert player_client.post("/api/orders", json=_payload(product, [])).status_code == 400
    assert player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 1}, {"card_id": small.id, "qty": 1}]),
    ).status_code == 400
    assert player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": other_small.id, "qty": 1}]),
    ).status_code == 400
    assert player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 0}]),
    ).status_code == 400
    assert player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 3}]),
    ).status_code == 400
    assert player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 1}, {"card_id": large.id, "qty": 1}]),
    ).status_code == 400
    assert db.query(Order).count() == 0


def test_required_step_must_not_be_empty(player_client, db):
    section = make_section(db)
    product = make_product(db, section)
    required = make_step(db, product, "Обязательный", is_required=True)
    make_card(db, required, "Вариант")
    optional = make_step(db, product, "Необязательный")
    card = make_card(db, optional, "Другой")
    resp = player_client.post("/api/orders", json=_payload(product, [{"card_id": card.id, "qty": 1}]))
    assert resp.status_code == 400
    assert "нужно выбрать" in resp.json()["detail"]


def test_order_uses_server_prices_and_keeps_snapshots(player_client, db):
    product, small, large, linen = _shop(db)
    order_id = player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 1}, {"card_id": linen.id, "qty": 1}]),
    ).json()["id"]

    small.price = 99999
    small.title = "Новая цена"
    linen.title = "Новый лён"
    product.title = "Переименован"
    db.commit()

    data = player_client.get(f"/api/orders/{order_id}").json()
    assert data["total"] == 1120
    assert data["product_title"] == "Трекер"
    assert [item["price"] for item in data["items"]] == [1000, 120]
    assert [item["card_title"] for item in data["items"]] == ["30 × 40", "Лён"]


def test_my_orders_only_own_and_sorted(player_client, db):
    product, small, large, linen = _shop(db)
    first = player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 1}]),
    ).json()["id"]

    with make_user_client(124) as other:
        other.post("/api/orders", json=_payload(product, [{"card_id": large.id, "qty": 1}]))

    data = player_client.get("/api/me/orders").json()
    assert [item["id"] for item in data["items"]] == [first]
    assert data["items"][0]["total"] == 1000
    assert data["items"][0]["queue_position"] == 1

    other_data = None
    with make_user_client(124) as other:
        other_data = other.get("/api/me/orders").json()
    assert len(other_data["items"]) == 1
    assert other_data["items"][0]["id"] != first


def test_foreign_order_is_forbidden(player_client, db):
    product, small, large, linen = _shop(db)
    with make_user_client(124) as other:
        order_id = other.post(
            "/api/orders",
            json=_payload(product, [{"card_id": small.id, "qty": 1}]),
        ).json()["id"]

    assert player_client.get(f"/api/orders/{order_id}").status_code == 403
    assert player_client.post(f"/api/orders/{order_id}/cancel").status_code == 403

    with make_user_client(400977, "admin") as admin:
        assert admin.get(f"/api/orders/{order_id}").status_code == 200


def test_cancel_keeps_composition_and_blocks_repeat(player_client, db):
    product, small, large, linen = _shop(db)
    order_id = player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 2}, {"card_id": linen.id, "qty": 1}]),
    ).json()["id"]

    resp = player_client.post(f"/api/orders/{order_id}/cancel")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "cancelled"
    assert data["cancelled_at"] is not None
    assert data["queue_position"] is None
    assert data["total"] == 2120
    assert len(data["items"]) == 2

    assert player_client.post(f"/api/orders/{order_id}/cancel").status_code == 409
    detail = player_client.get(f"/api/orders/{order_id}").json()
    assert detail["status"] == "cancelled"
    assert len(detail["items"]) == 2


def test_done_order_cannot_be_cancelled(player_client, db):
    product, small, large, linen = _shop(db)
    order_id = player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 1}]),
    ).json()["id"]
    with make_user_client(400977, "admin") as admin:
        assert admin.post(f"/api/admin/orders/{order_id}/complete").status_code == 200
    assert player_client.post(f"/api/orders/{order_id}/cancel").status_code == 409


def test_early_access_blocks_non_donor(player_client, db):
    product, small, large, linen = _shop(db, early_until=datetime.datetime.utcnow() + datetime.timedelta(hours=5))
    resp = player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 1}]),
    )
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "early_access"

    db.add(DonorCache(vk_id=123, is_don=True))
    db.commit()
    assert player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 1}]),
    ).status_code == 201


def test_early_access_allows_admin_and_expired(player_client, db):
    product, small, large, linen = _shop(db, early_until=datetime.datetime.utcnow() + datetime.timedelta(hours=5))
    with make_user_client(400977, "admin") as admin:
        assert admin.post(
            "/api/orders",
            json=_payload(product, [{"card_id": small.id, "qty": 1}]),
        ).status_code == 201

    product.early_until = datetime.datetime.utcnow() - datetime.timedelta(minutes=1)
    db.commit()
    assert player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 1}]),
    ).status_code == 201


def test_inactive_card_and_product_rejected(player_client, db):
    product, small, large, linen = _shop(db)
    small.is_active = False
    db.commit()
    assert player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 1}]),
    ).status_code == 400

    product.is_active = False
    db.commit()
    assert player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": linen.id, "qty": 1}]),
    ).status_code == 400


def test_order_rate_limit_per_user(player_client, db, monkeypatch):
    import config

    monkeypatch.setattr(config, "ORDER_RATE_LIMIT_PER_MINUTE", 2)
    product, small, large, linen = _shop(db)

    for _ in range(2):
        assert player_client.post(
            "/api/orders",
            json=_payload(product, [{"card_id": small.id, "qty": 1}]),
        ).status_code == 201

    resp = player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 1}]),
    )
    assert resp.status_code == 429
    assert resp.json()["detail"]["code"] == "rate_limited"
    assert resp.headers["Retry-After"] == "60"

    with make_user_client(124) as other:
        assert other.post(
            "/api/orders",
            json=_payload(product, [{"card_id": small.id, "qty": 1}]),
        ).status_code == 201

    with make_user_client(400977, "admin") as admin:
        for _ in range(3):
            assert admin.post(
                "/api/orders",
                json=_payload(product, [{"card_id": small.id, "qty": 1}]),
            ).status_code == 201


def test_order_queue_positions_and_compression(player_client, db):
    product, small, large, linen = _shop(db)

    first_id = player_client.post(
        "/api/orders",
        json=_payload(product, [{"card_id": small.id, "qty": 1}]),
    ).json()["id"]
    with make_user_client(124) as second:
        second_id = second.post(
            "/api/orders",
            json=_payload(product, [{"card_id": small.id, "qty": 1}]),
        ).json()["id"]
    with make_user_client(125) as third:
        third_id = third.post(
            "/api/orders",
            json=_payload(product, [{"card_id": small.id, "qty": 1}]),
        ).json()["id"]

    assert player_client.get(f"/api/orders/{first_id}").json()["queue_position"] == 1
    with make_user_client(124) as second:
        assert second.get(f"/api/orders/{second_id}").json()["queue_position"] == 2
    with make_user_client(125) as third:
        assert third.get(f"/api/orders/{third_id}").json()["queue_position"] == 3

    with make_user_client(400977, "admin") as admin:
        assert admin.post(f"/api/admin/orders/{first_id}/complete").status_code == 200
    with make_user_client(124) as second:
        assert second.get(f"/api/orders/{second_id}").json()["queue_position"] == 1
    with make_user_client(125) as third:
        assert third.get(f"/api/orders/{third_id}").json()["queue_position"] == 2
