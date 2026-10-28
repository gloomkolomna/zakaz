from __future__ import annotations

from tests.conftest import make_user_client
from tests.factories import make_card, make_product, make_section, make_step


def _shop(db, stock=1, is_active=True, section_active=True):
    section = make_section(db, is_active=section_active)
    product = make_product(db, section, stock=stock, is_active=is_active)
    step = make_step(db, product, is_required=True)
    card = make_card(db, step, price=1000)
    return product, card


def _order(client, product, card):
    return client.post(
        "/api/orders",
        json={"product_id": product.id, "items": [{"card_id": card.id, "qty": 1}]},
    )


def test_reserve_only_for_sold_out_product(player_client, db):
    product, card = _shop(db)
    assert player_client.post(f"/api/products/{product.id}/reserve").status_code == 400
    assert _order(player_client, product, card).status_code == 201

    with make_user_client(124) as other:
        first = other.post(f"/api/products/{product.id}/reserve")
        assert first.status_code == 200
        assert first.json()["reserved"] is True
        second = other.post(f"/api/products/{product.id}/reserve")
        assert second.status_code == 200
        assert second.json()["reserved"] is True
        assert other.get(f"/api/products/{product.id}").json()["reserved"] is True

    assert player_client.get(f"/api/products/{product.id}").json()["reserved"] is False


def test_reserve_zero_stock_is_unlimited(player_client, db):
    product, card = _shop(db, stock=0)
    assert player_client.post(f"/api/products/{product.id}/reserve").status_code == 400


def test_reserve_requires_visible_product(player_client, db):
    hidden, card = _shop(db, is_active=False)
    assert player_client.post(f"/api/products/{hidden.id}/reserve").status_code == 404

    hidden_section, card = _shop(db, section_active=False)
    assert player_client.post(f"/api/products/{hidden_section.id}/reserve").status_code == 404


def test_reserve_can_be_cancelled(player_client, db):
    product, card = _shop(db)
    assert _order(player_client, product, card).status_code == 201

    with make_user_client(124) as other:
        assert other.post(f"/api/products/{product.id}/reserve").status_code == 200
        assert other.delete(f"/api/products/{product.id}/reserve").status_code == 200
        assert other.delete(f"/api/products/{product.id}/reserve").status_code == 200
        assert other.get(f"/api/products/{product.id}").json()["reserved"] is False


def test_admin_reserve_list_and_signal(player_client, db):
    product, card = _shop(db)
    order = _order(player_client, product, card)
    assert order.status_code == 201

    with make_user_client(124) as other:
        assert other.post(f"/api/products/{product.id}/reserve").status_code == 200

    with make_user_client(400977, "admin") as admin:
        data = admin.get("/api/admin/reserve").json()
        assert data["summary"] == {
            "waiting": 1,
            "products": 1,
            "ready": 0,
        }
        item = data["items"][0]
        assert item["available"] is False
        assert item["sold_out"] is True
        assert item["product_id"] == product.id
        assert item["product_title"] == product.title
        assert item["user_id"] == 124
        assert item["buyer_name"] == "Покупатель 124"
        assert item["created_at"]

    assert player_client.post(f"/api/orders/{order.json()['id']}/cancel").status_code == 200

    with make_user_client(400977, "admin") as admin:
        data = admin.get("/api/admin/reserve").json()
        assert data["summary"]["ready"] == 1
        assert data["items"][0]["available"] is True

        assert admin.delete(f"/api/admin/reserve/{item['id']}").status_code == 200
        assert admin.get("/api/admin/reserve").json()["items"] == []
        assert admin.delete("/api/admin/reserve/99999").status_code == 404


def test_admin_reserve_forbidden_for_player(player_client):
    assert player_client.get("/api/admin/reserve").status_code == 403
    assert player_client.delete("/api/admin/reserve/1").status_code == 403
