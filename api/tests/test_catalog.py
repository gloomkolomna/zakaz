from __future__ import annotations

import datetime
import io

from PIL import Image

import config
from models import DonorCache, ProductStep, Section, StepCard
from tests.conftest import make_user_client
from tests.factories import make_card, make_product, make_section, make_step


def _png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), (200, 30, 30)).save(buf, format="PNG")
    return buf.getvalue()


def _catalog_tree(db):
    section_b = make_section(db, "Второй", sort_order=2)
    section_a = make_section(db, "Первый", sort_order=1)
    product_a = make_product(db, section_a, "Трекер", sort_order=1)
    step_size = make_step(db, product_a, "Размер", sort_order=1)
    make_card(db, step_size, "30 × 40", price=1000, sort_order=1)
    make_card(db, step_size, "40 × 50", price=1500, sort_order=2)
    step_base = make_step(db, product_a, "Основа", selection_mode="multi", sort_order=2)
    make_card(db, step_base, "Экрю", price=120, sort_order=1)
    hidden_card = make_card(db, step_base, "Скрытая", price=999, sort_order=2, is_active=False)
    step_hidden = make_step(db, product_a, "Скрытый шаг", sort_order=3, is_active=False)
    make_card(db, step_hidden, "Не считается", price=5000)
    product_empty = make_product(db, section_a, "Скоро", sort_order=2)
    hidden_product = make_product(db, section_b, "Скрытый товар", is_active=False)
    make_step(db, hidden_product, "Шаг")
    make_product(db, section_b, "Второй товар", sort_order=1)
    return section_a, section_b, product_a, product_empty, hidden_card


def test_catalog_requires_auth(client):
    assert client.get("/api/catalog").status_code == 401


def test_catalog_empty(player_client):
    resp = player_client.get("/api/catalog")
    assert resp.status_code == 200
    data = resp.json()
    assert data["sections"] == []
    assert data["title"] == "Наборы для вышивки"
    assert data["description"].startswith("Трекеры на год и для хобби")


def test_catalog_orders_and_hides_inactive(player_client, db):
    _catalog_tree(db)
    data = player_client.get("/api/catalog").json()
    assert [section["title"] for section in data["sections"]] == ["Первый", "Второй"]
    products = data["sections"][0]["products"]
    assert [product["title"] for product in products] == ["Трекер", "Скоро"]
    tracker = products[0]
    assert tracker["from_price"] == 1120
    assert tracker["steps_count"] == 2
    assert products[1]["from_price"] is None
    assert products[1]["steps_count"] == 0
    assert [p["title"] for p in data["sections"][1]["products"]] == ["Второй товар"]


def test_product_detail_hides_inactive_steps_and_cards(player_client, db):
    _catalog_tree(db)
    product = db.query(Section).filter(Section.title == "Первый").first().products[0]
    resp = player_client.get(f"/api/products/{product.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["from_price"] == 1120
    assert [step["title"] for step in data["steps"]] == ["Размер", "Основа"]
    sizes = data["steps"][0]["cards"]
    assert [card["title"] for card in sizes] == ["30 × 40", "40 × 50"]
    assert data["steps"][0]["mode"] == "single"
    assert data["steps"][1]["mode"] == "multi"


def test_product_detail_404_when_inactive_or_section_hidden(player_client, db):
    section = make_section(db, is_active=False)
    product = make_product(db, section)
    assert player_client.get(f"/api/products/{product.id}").status_code == 404
    active_section = make_section(db, "Активный")
    inactive = make_product(db, active_section, is_active=False)
    assert player_client.get(f"/api/products/{inactive.id}").status_code == 404
    assert player_client.get("/api/products/99999").status_code == 404


def test_early_access_fields_and_donor(player_client, db):
    section = make_section(db)
    product = make_product(db, section, early_until=datetime.datetime.utcnow() + datetime.timedelta(hours=5))

    player_data = player_client.get(f"/api/products/{product.id}").json()
    assert player_data["is_early"] is True
    assert player_data["can_order"] is False
    assert player_data["early_reason"] == "early_access"

    with make_user_client(400977, "admin") as admin:
        admin_data = admin.get(f"/api/products/{product.id}").json()
    assert admin_data["can_order"] is True

    db.add(DonorCache(vk_id=123, is_don=True))
    db.commit()
    donor_data = player_client.get(f"/api/products/{product.id}").json()
    assert donor_data["can_order"] is True
    assert donor_data["early_reason"] is None


def test_early_expires_automatically(player_client, db):
    section = make_section(db)
    product = make_product(db, section, early_until=datetime.datetime.utcnow() - datetime.timedelta(minutes=1))
    data = player_client.get(f"/api/products/{product.id}").json()
    assert data["is_early"] is False
    assert data["can_order"] is True


def test_info_public(client):
    resp = client.get("/api/info")
    assert resp.status_code == 200
    assert resp.json() == {"delivery": "", "payment": "", "contacts": "", "privacy": ""}


def test_catalog_header_texts_editable(admin_client, db):
    with make_user_client(999) as player:
        data = player.get("/api/catalog").json()
    assert data["title"] == "Наборы для вышивки"
    assert data["description"].startswith("Трекеры на год и для хобби")

    saved = admin_client.put(
        "/api/admin/texts",
        json={
            "catalog_title": "Мои наборы",
            "catalog_description": "Собираем вручную, по шагам.",
            "delivery": "Доставка",
            "payment": "Оплата",
            "contacts": "Контакты",
            "privacy": "Политика",
        },
    )
    assert saved.status_code == 200
    assert saved.json()["catalog_title"] == "Мои наборы"
    assert saved.json()["catalog_description"] == "Собираем вручную, по шагам."

    with make_user_client(999) as player:
        data = player.get("/api/catalog").json()
        info = player.get("/api/info").json()
    assert data["title"] == "Мои наборы"
    assert data["description"] == "Собираем вручную, по шагам."
    assert "catalog_title" not in info
    assert "catalog_description" not in info


def test_admin_sections_crud_and_reorder(admin_client, db):
    first = admin_client.post("/api/admin/sections", json={"title": "Первый"}).json()
    second = admin_client.post("/api/admin/sections", json={"title": "Второй"}).json()
    assert first["sort_order"] == 1
    assert second["sort_order"] == 2

    renamed = admin_client.put(
        f"/api/admin/sections/{first['id']}",
        json={"title": "Первый (новый)"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["title"] == "Первый (новый)"

    reordered = admin_client.post(
        "/api/admin/sections/reorder",
        json={"ids": [second["id"], first["id"]]},
    )
    assert reordered.status_code == 200
    rows = admin_client.get("/api/admin/sections").json()
    assert [row["title"] for row in rows] == ["Второй", "Первый (новый)"]

    assert admin_client.delete(f"/api/admin/sections/{second['id']}").status_code == 200
    rows = admin_client.get("/api/admin/sections").json()
    assert rows[0]["is_active"] is False
    with make_user_client(999) as catalog_client:
        catalog = catalog_client.get("/api/catalog").json()
    assert [section["title"] for section in catalog["sections"]] == ["Первый (новый)"]


def test_admin_routes_forbidden_for_player(player_client):
    assert player_client.get("/api/admin/sections").status_code == 403
    assert player_client.post("/api/admin/sections", json={"title": "Нет"}).status_code == 403


def test_admin_section_validation(admin_client):
    assert admin_client.post("/api/admin/sections", json={"title": "   "}).status_code == 400
    assert admin_client.put("/api/admin/sections/99999", json={"title": "Нет"}).status_code == 404


def test_admin_products_crud_and_hidden_from_catalog(admin_client, db):
    section = make_section(db)
    created = admin_client.post(
        "/api/admin/products",
        json={"section_id": section.id, "title": "Трекер", "description": "Описание"},
    )
    assert created.status_code == 201
    product_id = created.json()["id"]

    assert admin_client.post(
        "/api/admin/products",
        json={"section_id": 99999, "title": "Нет"},
    ).status_code == 404
    assert admin_client.post(
        "/api/admin/products",
        json={"section_id": section.id, "title": "  "},
    ).status_code == 400

    updated = admin_client.put(
        f"/api/admin/products/{product_id}",
        json={"title": "Новый трекер", "is_active": False},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Новый трекер"
    assert updated.json()["is_active"] is False

    with make_user_client(999) as catalog_client:
        assert catalog_client.get("/api/catalog").json()["sections"][0]["products"] == []
    listing = admin_client.get("/api/admin/products").json()
    assert listing[0]["is_active"] is False
    assert listing[0]["section_title"] == section.title


def test_admin_product_validation_and_404(admin_client, db):
    section = make_section(db)
    product = make_product(db, section)
    assert admin_client.put("/api/admin/products/99999", json={"title": "Нет"}).status_code == 404
    assert admin_client.get("/api/admin/products/99999").status_code == 404
    assert admin_client.delete("/api/admin/products/99999").status_code == 404


def test_product_image_upload_and_reset(admin_client, db, tmp_path, monkeypatch):
    monkeypatch.setattr(config, "UPLOADS_DIR", str(tmp_path))
    section = make_section(db)
    product = make_product(db, section)
    resp = admin_client.post(
        f"/api/admin/products/{product.id}/image",
        files={"file": ("cover.png", _png(), "image/png")},
    )
    assert resp.status_code == 200
    url = resp.json()["url"]
    assert url.startswith("/api/uploads/product_")
    assert (tmp_path / url.rsplit("/", 1)[-1]).exists()
    assert admin_client.delete(f"/api/admin/products/{product.id}/image").status_code == 200
    assert not (tmp_path / url.rsplit("/", 1)[-1]).exists()


def test_product_image_rejects_non_image(admin_client, db):
    section = make_section(db)
    product = make_product(db, section)
    resp = admin_client.post(
        f"/api/admin/products/{product.id}/image",
        files={"file": ("cover.txt", b"hello", "text/plain")},
    )
    assert resp.status_code == 400


def test_video_url_validation_and_early_toggle(admin_client, db):
    section = make_section(db)
    product = make_product(db, section)
    assert admin_client.put(
        f"/api/admin/products/{product.id}/video-url",
        json={"url": "ftp://example.com/video.mp4"},
    ).status_code == 400
    assert admin_client.put(
        f"/api/admin/products/{product.id}/video-url",
        json={"url": "https://youtu.be/abc"},
    ).json()["url"] == "https://youtu.be/abc"

    enabled = admin_client.post(f"/api/admin/products/{product.id}/early", json={"enabled": True})
    assert enabled.status_code == 200
    until = datetime.datetime.fromisoformat(enabled.json()["early_until"])
    assert datetime.timedelta(hours=47) < until - datetime.datetime.utcnow() <= datetime.timedelta(hours=48)
    disabled = admin_client.post(f"/api/admin/products/{product.id}/early", json={"enabled": False})
    assert disabled.json()["early_until"] is None


def test_video_upload_and_delete(admin_client, db, tmp_path, monkeypatch):
    monkeypatch.setattr(config, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(config, "UPLOAD_VIDEO_MAX_BYTES", 1024)
    section = make_section(db)
    product = make_product(db, section)

    resp = admin_client.post(
        f"/api/admin/products/{product.id}/video",
        files={"file": ("clip.mp4", b"fake-mp4-bytes", "video/mp4")},
    )
    assert resp.status_code == 200
    url = resp.json()["url"]
    name = url.rsplit("/", 1)[-1]
    assert (tmp_path / name).exists()

    assert admin_client.delete(f"/api/admin/products/{product.id}/video").status_code == 200
    assert not (tmp_path / name).exists()
    detail = admin_client.get(f"/api/admin/products/{product.id}").json()
    assert detail["video_file_url"] is None
    assert detail["video_url"] is None


def test_video_upload_rejects_bad_type_and_size(admin_client, db, tmp_path, monkeypatch):
    monkeypatch.setattr(config, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(config, "UPLOAD_VIDEO_MAX_BYTES", 4)
    section = make_section(db)
    product = make_product(db, section)
    assert admin_client.post(
        f"/api/admin/products/{product.id}/video",
        files={"file": ("clip.avi", b"12345", "video/x-msvideo")},
    ).status_code == 400
    assert admin_client.post(
        f"/api/admin/products/{product.id}/video",
        files={"file": ("clip.mp4", b"12345", "video/mp4")},
    ).status_code == 400


def test_steps_and_cards_crud_reorder_and_from_price(admin_client, db):
    section = make_section(db)
    product = make_product(db, section)
    step = admin_client.post(
        f"/api/admin/products/{product.id}/steps",
        json={"title": "Размер", "selection_mode": "single"},
    )
    assert step.status_code == 201
    step_id = step.json()["id"]
    assert admin_client.post(
        f"/api/admin/products/{product.id}/steps",
        json={"title": "  "},
    ).status_code == 400

    card = admin_client.post(
        f"/api/admin/steps/{step_id}/cards",
        json={"title": "30 × 40", "price": 1250, "max_qty": 5},
    )
    assert card.status_code == 201
    card_id = card.json()["id"]
    assert admin_client.post(
        f"/api/admin/steps/{step_id}/cards",
        json={"title": "Бесплатно", "price": -1},
    ).status_code == 400

    assert admin_client.put(
        f"/api/admin/cards/{card_id}",
        json={"price": 1400, "max_qty": 3},
    ).status_code == 200
    detail = admin_client.get(f"/api/admin/products/{product.id}").json()
    assert detail["from_price"] == 1400

    cards = admin_client.get(f"/api/admin/steps/{step_id}/cards").json()
    assert cards[0]["max_qty"] == 3
    assert admin_client.post("/api/admin/cards/reorder", json={"step_id": step_id, "ids": [card_id]}).status_code == 200
    assert admin_client.post("/api/admin/steps/reorder", json={"product_id": product.id, "ids": [step_id]}).status_code == 200

    assert admin_client.delete(f"/api/admin/cards/{card_id}").status_code == 200
    assert admin_client.delete(f"/api/admin/steps/{step_id}").status_code == 200
    detail = admin_client.get(f"/api/admin/products/{product.id}").json()
    assert detail["steps"][0]["is_active"] is False
    assert detail["from_price"] is None
