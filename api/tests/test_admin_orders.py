from __future__ import annotations

import datetime

from models import DonorCache, Log, Order, User
from tests.conftest import make_user_client
from tests.factories import make_card, make_product, make_section, make_step


def _shop(db, title="Трекер"):
    section = make_section(db, "Наборы")
    product = make_product(db, section, title)
    step = make_step(db, product, "Размер", is_required=True)
    card = make_card(db, step, "30 × 40", price=1000, max_qty=5)
    return section, product, card


def _make_orders(db):
    section, product, card = _shop(db)
    with make_user_client(123) as first:
        first_id = first.post(
            "/api/orders", json={"product_id": product.id, "items": [{"card_id": card.id, "qty": 1}]}
        ).json()["id"]
    with make_user_client(124) as second:
        second_id = second.post(
            "/api/orders", json={"product_id": product.id, "items": [{"card_id": card.id, "qty": 2}]}
        ).json()["id"]
    with make_user_client(125) as third:
        third_id = third.post(
            "/api/orders", json={"product_id": product.id, "items": [{"card_id": card.id, "qty": 3}]}
        ).json()["id"]
    return section, product, card, first_id, second_id, third_id


def test_admin_orders_requires_admin(player_client):
    assert player_client.get("/api/admin/orders").status_code == 403
    assert player_client.get("/api/admin/orders/export.csv").status_code == 403


def test_list_filters_summary_and_pagination(admin_client, db):
    section, product, card, first_id, second_id, third_id = _make_orders(db)
    with make_user_client(124) as second:
        second.post(f"/api/orders/{second_id}/cancel")

    data = admin_client.get("/api/admin/orders").json()
    assert data["total"] == 3
    assert data["summary"] == {
        "count": 3,
        "queue": 2,
        "unread": 3,
        "sum": 6000,
        "cancelled": 1,
        "cancelled_unread": 1,
    }

    queue = admin_client.get("/api/admin/orders?queue=1").json()
    assert {item["id"] for item in queue["items"]} == {first_id, third_id}
    assert queue["summary"]["queue"] == 2
    assert [item["queue_position"] for item in queue["items"]] == [1, 2]

    cancelled = admin_client.get("/api/admin/orders?status=cancelled").json()
    assert [item["id"] for item in cancelled["items"]] == [second_id]

    cancel_unread = admin_client.get("/api/admin/orders?cancel_unread=1").json()
    assert [item["id"] for item in cancel_unread["items"]] == [second_id]

    by_product = admin_client.get(f"/api/admin/orders?product_id={product.id}").json()
    assert by_product["total"] == 3
    by_section = admin_client.get(f"/api/admin/orders?section_id={section.id}").json()
    assert by_section["total"] == 3

    search = admin_client.get("/api/admin/orders?q=Покупатель 124").json()
    assert [item["id"] for item in search["items"]] == [second_id]
    search_id = admin_client.get(f"/api/admin/orders?q={third_id}").json()
    assert [item["id"] for item in search_id["items"]] == [third_id]

    page = admin_client.get("/api/admin/orders?limit=1&offset=1").json()
    assert len(page["items"]) == 1
    assert page["total"] == 3

    bad_status = admin_client.get("/api/admin/orders?status=bad")
    assert bad_status.status_code == 400


def test_date_filter_uses_msk_day(admin_client, db):
    section, product, card, first_id, second_id, third_id = _make_orders(db)
    order = db.query(Order).filter(Order.id == first_id).first()
    order.created_at = datetime.datetime(2026, 10, 26, 20, 0)
    db.commit()

    row = admin_client.get("/api/admin/orders?date_from=2026-10-26&date_to=2026-10-26").json()
    assert [item["id"] for item in row["items"]] == [first_id]
    assert row["total"] == 1

    row = admin_client.get("/api/admin/orders?date_from=2026-10-27").json()
    assert first_id not in [item["id"] for item in row["items"]]
    assert row["total"] == 2

    assert admin_client.get("/api/admin/orders?date_from=2026-13-01").status_code == 400


def test_read_complete_and_queue_move(admin_client, db):
    section, product, card, first_id, second_id, third_id = _make_orders(db)
    with make_user_client(124) as second:
        second.post(f"/api/orders/{second_id}/cancel")

    read = admin_client.post(f"/api/admin/orders/{first_id}/read")
    assert read.status_code == 200
    assert read.json()["read_at"] is not None
    again = admin_client.post(f"/api/admin/orders/{first_id}/read")
    assert again.json()["read_at"] == read.json()["read_at"]

    moved = admin_client.post(f"/api/admin/orders/{third_id}/move", json={"direction": "up"})
    assert moved.status_code == 200
    assert moved.json()["queue_position"] == 1
    assert admin_client.get(f"/api/admin/orders/{third_id}").json()["queue_position"] == 1
    assert admin_client.get(f"/api/admin/orders/{first_id}").json()["queue_position"] == 2

    assert admin_client.post(f"/api/admin/orders/{third_id}/move", json={"direction": "up"}).status_code == 409
    assert admin_client.post(f"/api/admin/orders/{third_id}/move", json={"direction": "down"}).status_code == 200
    assert admin_client.post(f"/api/admin/orders/{third_id}/move", json={"direction": "down"}).status_code == 409
    assert admin_client.post(f"/api/admin/orders/{second_id}/move", json={"direction": "up"}).status_code == 409

    complete = admin_client.post(f"/api/admin/orders/{first_id}/complete")
    assert complete.status_code == 200
    assert complete.json()["status"] == "done"
    assert complete.json()["done_at"] is not None
    assert complete.json()["queue_position"] is None
    assert admin_client.post(f"/api/admin/orders/{first_id}/complete").status_code == 409
    assert admin_client.post(f"/api/admin/orders/{second_id}/complete").status_code == 409


def test_cancel_seen_banner(admin_client, db):
    section, product, card, first_id, second_id, third_id = _make_orders(db)
    with make_user_client(124) as second:
        second.post(f"/api/orders/{second_id}/cancel")

    before = admin_client.get("/api/admin/orders").json()["summary"]
    assert before["cancelled_unread"] == 1

    resp = admin_client.post(f"/api/admin/orders/{second_id}/cancel-seen")
    assert resp.status_code == 200
    assert resp.json()["cancel_seen_at"] is not None

    after = admin_client.get("/api/admin/orders").json()["summary"]
    assert after["cancelled_unread"] == 0
    assert admin_client.post(f"/api/admin/orders/{first_id}/cancel-seen").status_code == 409


def test_export_csv(admin_client, db):
    section, product, card, first_id, second_id, third_id = _make_orders(db)
    with make_user_client(124) as second:
        second.post(f"/api/orders/{second_id}/cancel")

    resp = admin_client.get("/api/admin/orders/export.csv")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert resp.content.startswith(b"\xef\xbb\xbf")
    text = resp.content.decode("utf-8-sig")
    lines = text.splitlines()
    assert lines[0] == "№;Очередь;Дата;Раздел;Товар;Состав;Кол-во позиций;Сумма;Статус;VK ID;Имя"
    assert len(lines) == 4
    assert "Отменён" in text
    assert "30 × 40 × 2" in text

    filtered = admin_client.get("/api/admin/orders/export.csv?status=new")
    assert len(filtered.content.decode("utf-8-sig").splitlines()) == 3


def test_texts_read_and_write(admin_client, db):
    resp = admin_client.put(
        "/api/admin/texts",
        json={"delivery": "Доставка по России", "payment": "Перевод", "contacts": "@shop", "privacy": "Политика"},
    )
    assert resp.status_code == 200
    assert resp.json()["delivery"] == "Доставка по России"
    assert admin_client.get("/api/admin/texts").json()["contacts"] == "@shop"
    with make_user_client(999) as player:
        assert player.get("/api/info").json()["privacy"] == "Политика"
        assert player.put("/api/admin/texts", json={"delivery": "Нет"}).status_code == 403


def test_logs_visible_to_admin(admin_client, db):
    admin_client.get("/api/missing-page")
    rows = admin_client.get("/api/admin/logs?level=warn").json()
    assert any(row["path"] == "/api/missing-page" and row["status_code"] == 404 for row in rows)
    assert admin_client.get("/api/admin/logs?level=bad").json() == []


def test_players_and_donor_exempt(admin_client, db):
    db.add(User(vk_id=123, role="player", display_name="Анна"))
    db.add(User(vk_id=124, role="player", display_name="Борис"))
    db.add(DonorCache(vk_id=124, is_don=True))
    db.commit()

    players = admin_client.get("/api/admin/players").json()
    by_id = {row["vk_id"]: row for row in players}
    assert by_id[123]["is_donor"] is False
    assert by_id[124]["is_donor"] is True

    resp = admin_client.post("/api/admin/players/123/donor-exempt", json={"enabled": True})
    assert resp.status_code == 200
    assert resp.json()["donor_exempt"] is True
    players = admin_client.get("/api/admin/players").json()
    assert {row["vk_id"]: row for row in players}[123]["donor_exempt"] is True

    assert admin_client.post("/api/admin/players/999/donor-exempt", json={"enabled": True}).status_code == 404


def test_donor_sync_endpoint(admin_client, monkeypatch):
    import services.donor as donor_svc

    monkeypatch.setattr(donor_svc, "sync_all_users", lambda db: 7)
    assert admin_client.post("/api/admin/donors/sync").json() == {"synced": 7}
