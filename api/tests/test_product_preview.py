from __future__ import annotations

from tests.factories import make_card, make_product, make_section, make_step


def _hidden_product(db):
    section = make_section(db, "Скрытый раздел", is_active=False)
    product = make_product(db, section, "Скрытый товар", is_active=False)
    step = make_step(db, product, "Размер")
    make_card(db, step, "30 × 40", price=1250)
    return product


def test_admin_previews_hidden_product(admin_client, db):
    product = _hidden_product(db)

    res = admin_client.get(f"/api/products/{product.id}")

    assert res.status_code == 200
    body = res.json()
    assert body["is_hidden"] is True
    assert body["title"] == "Скрытый товар"
    assert body["steps"][0]["cards"][0]["title"] == "30 × 40"


def test_player_cannot_open_hidden_product(player_client, db):
    product = _hidden_product(db)

    assert player_client.get(f"/api/products/{product.id}").status_code == 404


def test_admin_previews_product_in_hidden_section(admin_client, db):
    section = make_section(db, "Скрытый раздел", is_active=False)
    product = make_product(db, section, "Товар в скрытом разделе")
    step = make_step(db, product)
    make_card(db, step)

    res = admin_client.get(f"/api/products/{product.id}")

    assert res.status_code == 200
    assert res.json()["is_hidden"] is True


def test_player_cannot_open_product_in_hidden_section(player_client, db):
    section = make_section(db, "Скрытый раздел", is_active=False)
    product = make_product(db, section, "Товар в скрытом разделе")

    assert player_client.get(f"/api/products/{product.id}").status_code == 404


def test_visible_product_is_not_hidden(player_client, db):
    section = make_section(db)
    product = make_product(db, section)
    step = make_step(db, product)
    make_card(db, step)

    res = player_client.get(f"/api/products/{product.id}")

    assert res.status_code == 200
    assert res.json()["is_hidden"] is False


def test_admin_preview_of_missing_product_is_404(admin_client):
    assert admin_client.get("/api/products/99999").status_code == 404


def test_hidden_product_cannot_be_ordered_even_by_admin(admin_client, db):
    product = _hidden_product(db)
    card = product.steps[0].cards[0]

    res = admin_client.post(
        "/api/orders",
        json={"product_id": product.id, "items": [{"card_id": card.id, "qty": 1}]},
    )

    assert res.status_code == 400
    assert res.json()["detail"] == "Товар недоступен"
