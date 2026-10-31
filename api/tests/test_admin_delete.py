from __future__ import annotations

from models import OrderItem
from tests.factories import make_card, make_item, make_order, make_product, make_section, make_step


def _tree(db):
    section = make_section(db)
    product = make_product(db, section)
    step = make_step(db, product, "Размер")
    card = make_card(db, step, "30 × 40", price=1250)
    return product, step, card


def test_admin_deletes_step_with_cards(admin_client, db):
    product, step, card = _tree(db)

    assert admin_client.delete(f"/api/admin/steps/{step.id}").status_code == 200

    assert admin_client.get(f"/api/admin/products/{product.id}").json()["steps"] == []
    assert admin_client.get(f"/api/admin/steps/{step.id}/cards").status_code == 404
    assert admin_client.put(f"/api/admin/steps/{step.id}", json={"title": "x"}).status_code == 404
    assert admin_client.delete(f"/api/admin/cards/{card.id}").status_code == 404


def test_admin_deletes_card_only(admin_client, db):
    product, step, card = _tree(db)

    assert admin_client.delete(f"/api/admin/cards/{card.id}").status_code == 200

    assert admin_client.get(f"/api/admin/steps/{step.id}/cards").json() == []
    detail = admin_client.get(f"/api/admin/products/{product.id}").json()
    assert detail["steps"][0]["cards_count"] == 0
    assert admin_client.delete(f"/api/admin/cards/{card.id}").status_code == 404


def test_hidden_step_stays_but_is_inactive(admin_client, db):
    product, step, _card = _tree(db)

    assert admin_client.put(f"/api/admin/steps/{step.id}", json={"is_active": False}).status_code == 200
    detail = admin_client.get(f"/api/admin/products/{product.id}").json()
    assert detail["steps"][0]["id"] == step.id
    assert detail["steps"][0]["is_active"] is False

    assert admin_client.put(f"/api/admin/steps/{step.id}", json={"is_active": True}).status_code == 200
    assert admin_client.get(f"/api/admin/products/{product.id}").json()["steps"][0]["is_active"] is True


def test_delete_card_keeps_order_snapshot(admin_client, db):
    product, _step, card = _tree(db)
    order = make_order(db, 123, product, total=1250)
    item = make_item(db, order, card, qty=1, price=1250)

    assert admin_client.delete(f"/api/admin/cards/{card.id}").status_code == 200

    db.expire_all()
    stored = db.query(OrderItem).filter(OrderItem.id == item.id).one()
    assert stored.card_id is None
    assert stored.card_title == "30 × 40"
    assert stored.sum == 1250


def test_player_cannot_delete_catalog(player_client, db):
    product, step, card = _tree(db)

    assert player_client.delete(f"/api/admin/steps/{step.id}").status_code == 403
    assert player_client.delete(f"/api/admin/cards/{card.id}").status_code == 403
    assert player_client.get(f"/api/admin/products/{product.id}").status_code == 403
