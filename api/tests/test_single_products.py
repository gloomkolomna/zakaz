from __future__ import annotations

import datetime
import io

from PIL import Image

import config
from models import DonorCache, ProductImage
from tests.conftest import make_user_client
from tests.factories import make_card, make_product, make_section, make_step


def _png(color=(200, 30, 30)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), color).save(buf, format="PNG")
    return buf.getvalue()


def _single(db, price=1500, stock=0, early_until=None, title="Кружка"):
    section = make_section(db, "Одиночные товары")
    product = make_product(
        db,
        section,
        title,
        mode="single",
        price=price,
        stock=stock,
        early_until=early_until,
    )
    product.image_url = "/uploads/main.jpg"
    db.commit()
    return product


def test_admin_creates_single_product_with_price(admin_client, db):
    section = make_section(db, "Одиночные товары")

    response = admin_client.post(
        "/api/admin/products",
        json={
            "section_id": section.id,
            "title": "Кружка",
            "mode": "single",
            "price": 1250,
            "is_active": True,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["mode"] == "single"
    assert data["price"] == 1250
    assert data["from_price"] == 1250
    assert data["steps"] == []
    assert data["images"] == []

    with make_user_client(123) as player_client:
        catalog = player_client.get("/api/catalog").json()
        brief = catalog["sections"][0]["products"][0]
        assert brief["mode"] == "single"
        assert brief["from_price"] == 1250
        assert brief["steps_count"] == 0

        detail = player_client.get(f"/api/products/{data['id']}").json()
        assert detail["mode"] == "single"
        assert detail["price"] == 1250
        assert detail["from_price"] == 1250
        assert detail["steps"] == []
        assert detail["images"] == []


def test_single_product_mode_and_price_validation(admin_client, db):
    section = make_section(db)

    assert admin_client.post(
        "/api/admin/products",
        json={"section_id": section.id, "title": "Без цены", "mode": "single"},
    ).status_code == 400
    assert admin_client.post(
        "/api/admin/products",
        json={"section_id": section.id, "title": "Минус", "mode": "single", "price": -1},
    ).status_code == 400
    assert admin_client.post(
        "/api/admin/products",
        json={"section_id": section.id, "title": "Кривой режим", "mode": "other"},
    ).status_code == 400

    build = admin_client.post(
        "/api/admin/products",
        json={"section_id": section.id, "title": "Сборный"},
    ).json()
    assert build["mode"] == "build"
    assert build["price"] is None

    assert admin_client.put(
        f"/api/admin/products/{build['id']}",
        json={"mode": "single"},
    ).status_code == 400

    switched = admin_client.put(
        f"/api/admin/products/{build['id']}",
        json={"mode": "single", "price": 700},
    )
    assert switched.status_code == 200
    assert switched.json()["price"] == 700

    assert admin_client.put(
        f"/api/admin/products/{build['id']}",
        json={"price": -10},
    ).status_code == 400


def test_single_order_uses_price_and_quantity(admin_client, player_client, db):
    product = _single(db, price=500)

    response = player_client.post("/api/orders", json={"product_id": product.id, "qty": 3})
    assert response.status_code == 201
    data = response.json()
    assert data["total"] == 1500
    assert data["items_count"] == 1
    assert data["product_title"] == "Кружка"
    assert data["status"] == "new"
    assert data["queue_position"] == 1

    item = data["items"][0]
    assert item["card_id"] is None
    assert item["step_title"] == "Товар"
    assert item["card_title"] == "Кружка"
    assert item["image_url"] == "/uploads/main.jpg"
    assert item["price"] == 500
    assert item["qty"] == 3
    assert item["sum"] == 1500

    product.price = 99999
    product.title = "Переименована"
    product.image_url = "/uploads/other.jpg"
    db.commit()

    saved = player_client.get(f"/api/orders/{data['id']}").json()
    assert saved["total"] == 1500
    assert saved["product_title"] == "Кружка"
    assert saved["items"][0]["price"] == 500
    assert saved["items"][0]["card_title"] == "Кружка"
    assert saved["items"][0]["image_url"] == "/uploads/main.jpg"

    my_orders = player_client.get("/api/me/orders").json()
    assert my_orders["items"][0]["total"] == 1500


def test_single_order_validation(player_client, db):
    product = _single(db, price=500)

    assert player_client.post("/api/orders", json={"product_id": product.id}).status_code == 400
    assert player_client.post(
        "/api/orders", json={"product_id": product.id, "qty": 0}
    ).status_code == 400
    assert player_client.post(
        "/api/orders", json={"product_id": product.id, "qty": 100}
    ).status_code == 400
    assert player_client.post(
        "/api/orders",
        json={
            "product_id": product.id,
            "qty": 1,
            "items": [{"card_id": 1, "qty": 1}],
        },
    ).status_code == 400

    unpriced = _single(db, title="Без цены", price=None)
    assert player_client.post(
        "/api/orders", json={"product_id": unpriced.id, "qty": 1}
    ).status_code == 400

    product.is_active = False
    db.commit()
    assert player_client.post(
        "/api/orders", json={"product_id": product.id, "qty": 1}
    ).status_code == 400


def test_single_order_quantity_bounds(player_client, db):
    product = _single(db, price=1)

    assert player_client.post(
        "/api/orders", json={"product_id": product.id, "qty": 99}
    ).status_code == 201


def test_single_stock_counts_orders_not_quantity(player_client, db):
    product = _single(db, price=500, stock=1)

    assert player_client.post(
        "/api/orders", json={"product_id": product.id, "qty": 5}
    ).status_code == 201

    with make_user_client(124) as other:
        response = other.post("/api/orders", json={"product_id": product.id, "qty": 1})
    assert response.status_code == 409
    assert response.json()["detail"] == {"code": "sold_out", "message": "Товар закончился"}

    detail = player_client.get(f"/api/products/{product.id}").json()
    assert detail["sold_out"] is True


def test_single_early_access_blocks_non_donor(player_client, db):
    product = _single(
        db,
        price=500,
        early_until=datetime.datetime.utcnow() + datetime.timedelta(hours=5),
    )

    response = player_client.post("/api/orders", json={"product_id": product.id, "qty": 1})
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "early_access"

    db.add(DonorCache(vk_id=123, is_don=True))
    db.commit()
    assert player_client.post(
        "/api/orders", json={"product_id": product.id, "qty": 1}
    ).status_code == 201


def test_product_images_upload_order_and_detail(admin_client, db, tmp_path, monkeypatch):
    monkeypatch.setattr(config, "UPLOADS_DIR", str(tmp_path))
    product = _single(db, price=500)

    urls = []
    for index in range(3):
        response = admin_client.post(
            f"/api/admin/products/{product.id}/images",
            files={"file": ("photo.png", _png((40 * index, 30, 30)), "image/png")},
        )
        assert response.status_code == 200
        urls.append(response.json()["url"])

    images = admin_client.get(f"/api/admin/products/{product.id}").json()["images"]
    assert [image["url"] for image in images] == urls

    with make_user_client(123) as player_client:
        detail = player_client.get(f"/api/products/{product.id}").json()
    assert [image["url"] for image in detail["images"]] == urls

    main = admin_client.post(
        f"/api/admin/products/{product.id}/image",
        files={"file": ("main.png", _png((10, 200, 10)), "image/png")},
    )
    assert main.status_code == 200

    with make_user_client(123) as player_client:
        order = player_client.post(
            "/api/orders", json={"product_id": product.id, "qty": 2}
        ).json()
    assert order["items"][0]["image_url"] == main.json()["url"]
    assert order["total"] == 1000


def test_product_images_limit_reorder_delete_and_permissions(
    admin_client, db, tmp_path, monkeypatch
):
    monkeypatch.setattr(config, "UPLOADS_DIR", str(tmp_path))
    product = _single(db)

    ids = []
    for index in range(10):
        response = admin_client.post(
            f"/api/admin/products/{product.id}/images",
            files={"file": ("photo.png", _png((20 * index, 30, 30)), "image/png")},
        )
        assert response.status_code == 200
        ids.append(response.json()["id"])

    over_limit = admin_client.post(
        f"/api/admin/products/{product.id}/images",
        files={"file": ("photo.png", _png(), "image/png")},
    )
    assert over_limit.status_code == 400
    assert "10" in over_limit.json()["detail"]

    reordered = admin_client.post(
        f"/api/admin/products/{product.id}/images/reorder",
        json={"ids": [ids[2], ids[0], ids[1], ids[3], ids[4], ids[5], ids[6], ids[7], ids[8], ids[9]]},
    )
    assert reordered.status_code == 200
    images = admin_client.get(f"/api/admin/products/{product.id}").json()["images"]
    assert [image["id"] for image in images][:3] == [ids[2], ids[0], ids[1]]

    assert admin_client.delete(
        f"/api/admin/products/{product.id}/images/{ids[2]}"
    ).status_code == 200
    images = admin_client.get(f"/api/admin/products/{product.id}").json()["images"]
    assert [image["id"] for image in images] == [ids[0], ids[1], ids[3], ids[4], ids[5], ids[6], ids[7], ids[8], ids[9]]

    with make_user_client(123) as player:
        assert player.post(
            f"/api/admin/products/{product.id}/images",
            files={"file": ("photo.png", _png(), "image/png")},
        ).status_code == 403
        assert player.delete(
            f"/api/admin/products/{product.id}/images/{ids[0]}"
        ).status_code == 403
        assert player.post(
            f"/api/admin/products/{product.id}/images/reorder",
            json={"ids": [ids[0]]},
        ).status_code == 403

    assert admin_client.post(
        "/api/admin/products/99999/images",
        files={"file": ("photo.png", _png(), "image/png")},
    ).status_code == 404


def test_mode_switch_keeps_steps_and_build_order(admin_client, db):
    section = make_section(db)
    product = make_product(db, section, "Трекер")
    step = make_step(db, product, "Размер", is_required=True)
    card = make_card(db, step, "30 × 40", price=1000)

    switched = admin_client.put(
        f"/api/admin/products/{product.id}",
        json={"mode": "single", "price": 2000},
    )
    assert switched.status_code == 200
    assert switched.json()["steps"][0]["id"] == step.id

    with make_user_client(123) as player_client:
        catalog = player_client.get("/api/catalog").json()
        brief = catalog["sections"][0]["products"][0]
        assert brief["mode"] == "single"
        assert brief["from_price"] == 2000
        assert brief["steps_count"] == 0

        single_order = player_client.post(
            "/api/orders", json={"product_id": product.id, "qty": 2}
        )
    assert single_order.status_code == 201
    assert single_order.json()["total"] == 4000

    back = admin_client.put(f"/api/admin/products/{product.id}", json={"mode": "build"})
    assert back.status_code == 200

    with make_user_client(123) as player_client:
        catalog = player_client.get("/api/catalog").json()
        brief = catalog["sections"][0]["products"][0]
        assert brief["mode"] == "build"
        assert brief["from_price"] == 1000
        assert brief["steps_count"] == 1

        build_order = player_client.post(
            "/api/orders",
            json={"product_id": product.id, "items": [{"card_id": card.id, "qty": 1}]},
        )
    assert build_order.status_code == 201
    assert build_order.json()["total"] == 1000


def test_deleting_single_product_removes_carousel(admin_client, db, tmp_path, monkeypatch):
    monkeypatch.setattr(config, "UPLOADS_DIR", str(tmp_path))
    product = _single(db)

    assert admin_client.post(
        f"/api/admin/products/{product.id}/images",
        files={"file": ("photo.png", _png(), "image/png")},
    ).status_code == 200
    assert db.query(ProductImage).count() == 1

    assert admin_client.delete(f"/api/admin/products/{product.id}").status_code == 200
    assert db.query(ProductImage).count() == 0


def test_single_product_in_admin_list(admin_client, db):
    _single(db, price=1500)

    rows = admin_client.get("/api/admin/products").json()
    assert rows[0]["mode"] == "single"
    assert rows[0]["price"] == 1500
    assert rows[0]["from_price"] == 1500


def test_single_order_comment_is_saved_and_visible_to_admin(admin_client, db):
    product = _single(db, price=500)

    with make_user_client(123) as player:
        response = player.post(
            "/api/orders",
            json={
                "product_id": product.id,
                "qty": 2,
                "comment": "  Подарочная упаковка и открытка  ",
            },
        )
    assert response.status_code == 201
    order = response.json()
    assert order["comment"] == "Подарочная упаковка и открытка"

    admin_order = admin_client.get(f"/api/admin/orders/{order['id']}").json()
    assert admin_order["comment"] == "Подарочная упаковка и открытка"

    with make_user_client(123) as player:
        buyer_order = player.get(f"/api/orders/{order['id']}").json()
        my_orders = player.get("/api/me/orders").json()
    assert buyer_order["comment"] == "Подарочная упаковка и открытка"
    assert my_orders["items"][0]["comment"] == "Подарочная упаковка и открытка"


def test_single_order_comment_validation(player_client, db):
    product = _single(db, price=500)

    empty = player_client.post(
        "/api/orders",
        json={"product_id": product.id, "qty": 1, "comment": "   "},
    )
    assert empty.status_code == 201
    assert empty.json()["comment"] is None

    too_long = player_client.post(
        "/api/orders",
        json={"product_id": product.id, "qty": 1, "comment": "x" * 1001},
    )
    assert too_long.status_code == 400
    assert "1000" in too_long.json()["detail"]
