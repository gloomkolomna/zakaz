from __future__ import annotations

import io

from PIL import Image

import config
from tests.conftest import make_user_client
from tests.factories import make_card, make_product, make_section, make_step


def _png(color=(200, 30, 30)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), color).save(buf, format="PNG")
    return buf.getvalue()


def _shop(db):
    section = make_section(db)
    product = make_product(db, section)
    step = make_step(db, product, is_required=True)
    card = make_card(db, step, price=1000)
    return product, step, card


def _upload(client, card_id, color=(200, 30, 30)):
    return client.post(
        f"/api/admin/cards/{card_id}/images",
        files={"file": ("card.png", _png(color), "image/png")},
    )


def test_card_images_upload_list_and_public_detail(
    admin_client, db, tmp_path, monkeypatch
):
    monkeypatch.setattr(config, "UPLOADS_DIR", str(tmp_path))
    product, step, card = _shop(db)

    urls = []
    for index in range(3):
        response = _upload(admin_client, card.id, (40 * index, 30, 30))
        assert response.status_code == 200
        urls.append(response.json()["url"])

    cards = admin_client.get(f"/api/admin/steps/{step.id}/cards").json()
    assert [image["url"] for image in cards[0]["images"]] == urls
    assert cards[0]["image_url"] == urls[0]

    with make_user_client(123) as player:
        data = player.get(f"/api/products/{product.id}").json()
    item = data["steps"][0]["cards"][0]
    assert [image["url"] for image in item["images"]] == urls
    assert item["image_url"] == urls[0]


def test_card_images_limit_ten(admin_client, db, tmp_path, monkeypatch):
    monkeypatch.setattr(config, "UPLOADS_DIR", str(tmp_path))
    _, _, card = _shop(db)

    for index in range(10):
        assert _upload(admin_client, card.id, (20 * index, 30, 30)).status_code == 200

    response = _upload(admin_client, card.id)
    assert response.status_code == 400
    assert "10" in response.json()["detail"]


def test_card_images_delete_and_reorder(admin_client, db, tmp_path, monkeypatch):
    monkeypatch.setattr(config, "UPLOADS_DIR", str(tmp_path))
    _, step, card = _shop(db)

    ids = []
    for index in range(3):
        response = _upload(admin_client, card.id, (40 * index, 30, 30))
        assert response.status_code == 200
        ids.append(response.json()["id"])

    reordered = admin_client.post(
        f"/api/admin/cards/{card.id}/images/reorder",
        json={"ids": [ids[2], ids[0], ids[1]]},
    )
    assert reordered.status_code == 200

    cards = admin_client.get(f"/api/admin/steps/{step.id}/cards").json()
    assert [image["id"] for image in cards[0]["images"]] == [ids[2], ids[0], ids[1]]
    assert cards[0]["image_url"] == cards[0]["images"][0]["url"]

    assert admin_client.delete(f"/api/admin/cards/{card.id}/images/{ids[2]}").status_code == 200
    cards = admin_client.get(f"/api/admin/steps/{step.id}/cards").json()
    assert [image["id"] for image in cards[0]["images"]] == [ids[0], ids[1]]


def test_order_snapshot_uses_first_card_image(
    admin_client, db, tmp_path, monkeypatch
):
    monkeypatch.setattr(config, "UPLOADS_DIR", str(tmp_path))
    product, _, card = _shop(db)

    first = _upload(admin_client, card.id, (40, 30, 30))
    assert _upload(admin_client, card.id, (80, 30, 30)).status_code == 200
    assert first.status_code == 200

    with make_user_client(123) as player:
        response = player.post(
            "/api/orders",
            json={"product_id": product.id, "items": [{"card_id": card.id, "qty": 1}]},
        )
    assert response.status_code == 201
    assert response.json()["items"][0]["image_url"] == first.json()["url"]


def test_card_images_validation_and_permissions(
    admin_client, db, tmp_path, monkeypatch
):
    monkeypatch.setattr(config, "UPLOADS_DIR", str(tmp_path))
    _, _, card = _shop(db)

    bad = admin_client.post(
        f"/api/admin/cards/{card.id}/images",
        files={"file": ("card.txt", b"hello", "text/plain")},
    )
    assert bad.status_code == 400

    with make_user_client(123) as player:
        assert player.post(
            f"/api/admin/cards/{card.id}/images",
            files={"file": ("card.png", _png(), "image/png")},
        ).status_code == 403

    uploaded = _upload(admin_client, card.id)
    assert uploaded.status_code == 200
    image_id = uploaded.json()["id"]

    with make_user_client(123) as player:
        assert player.delete(f"/api/admin/cards/{card.id}/images/{image_id}").status_code == 403
        assert player.post(
            f"/api/admin/cards/{card.id}/images/reorder",
            json={"ids": [image_id]},
        ).status_code == 403
    assert admin_client.post(
        "/api/admin/cards/99999/images",
        files={"file": ("card.png", _png(), "image/png")},
    ).status_code == 404
