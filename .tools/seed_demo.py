from __future__ import annotations

import io
import sys

import httpx
from PIL import Image, ImageDraw

API = "http://127.0.0.1:8006/api"


def image(bg: str, accent: str) -> bytes:
    img = Image.new("RGB", (800, 1000), bg)
    draw = ImageDraw.Draw(img)
    for x in range(0, 800, 50):
        draw.line((x, 0, x, 1000), fill=accent, width=1)
    for y in range(0, 1000, 50):
        draw.line((0, y, 800, y), fill=accent, width=1)
    draw.rectangle((160, 200, 640, 800), outline=accent, width=6)
    draw.line((260, 500, 380, 620), fill=accent, width=12)
    draw.line((380, 620, 560, 380), fill=accent, width=12)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def session(vk_id: int) -> dict[str, str]:
    resp = httpx.post(f"{API}/auth/session", json={"params": {"vk_user_id": str(vk_id)}})
    resp.raise_for_status()
    return {"Authorization": f"Bearer {resp.json()['token']}"}


def main() -> None:
    admin = session(400977)
    catalog = httpx.get(f"{API}/catalog", headers=admin).json()
    if catalog["sections"]:
        print("catalog already has data, skipping")
        return

    section1 = httpx.post(f"{API}/admin/sections", headers=admin, json={"title": "Трекер на год"}).json()
    section2 = httpx.post(f"{API}/admin/sections", headers=admin, json={"title": "Трекеры своих хобби"}).json()

    def product(section_id: int, title: str, description: str, color: tuple[str, str], video: str | None = None) -> dict:
        row = httpx.post(
            f"{API}/admin/products",
            headers=admin,
            json={"section_id": section_id, "title": title, "description": description},
        ).json()
        cover = image(*color)
        httpx.post(
            f"{API}/admin/products/{row['id']}/image",
            headers=admin,
            files={"file": ("cover.png", cover, "image/png")},
        ).raise_for_status()
        if video:
            httpx.put(
                f"{API}/admin/products/{row['id']}/video-url",
                headers=admin,
                json={"url": video},
            ).raise_for_status()
        return row

    def step(product_id: int, title: str, mode: str, required: bool, cards: list[tuple[str, int, tuple[str, str]]]) -> None:
        row = httpx.post(
            f"{API}/admin/products/{product_id}/steps",
            headers=admin,
            json={"title": title, "selection_mode": mode, "is_required": required},
        ).json()
        for card_title, price, color in cards:
            card = httpx.post(
                f"{API}/admin/steps/{row['id']}/cards",
                headers=admin,
                json={"title": card_title, "price": price, "max_qty": 10},
            ).json()
            httpx.post(
                f"{API}/admin/cards/{card['id']}/image",
                headers=admin,
                files={"file": ("card.png", image(*color), "image/png")},
            ).raise_for_status()

    p1 = product(
        section1["id"],
        "Трекер на год · Цветение",
        "Трекер на год с разметкой месяцев и полем для вышивки. Размер, основа и упаковка собираются по шагам.",
        ("#E7E2D8", "#C97B84"),
        "https://vk.com/video-206593200_456239017",
    )
    step(p1["id"], "Размер", "single", True, [
        ("30 × 40 см", 1250, ("#F0E7DD", "#C97B84")),
        ("40 × 50 см", 1690, ("#E8E3D8", "#8D6A86")),
    ])
    step(p1["id"], "Основа", "multi", False, [
        ("Экрю", 120, ("#F3EEE4", "#8B6E4E")),
        ("Графит", 140, ("#D9DDD6", "#4C544E")),
    ])
    step(p1["id"], "Упаковка", "single", False, [
        ("Подарочная", 250, ("#F7E8E5", "#B02A21")),
        ("Крафт", 90, ("#E8DCC8", "#8B6E4E")),
    ])

    p2 = product(
        section1["id"],
        "Трекер на год · Ночной сад",
        "Тёмная палитра, луна и травы. Товар открывается донам за 48 часов до общего анонса.",
        ("#DDE3E0", "#4F7C86"),
    )
    step(p2["id"], "Размер", "single", True, [
        ("30 × 40 см", 1350, ("#DDE3E0", "#4F7C86")),
        ("40 × 50 см", 1790, ("#D8DFDC", "#8D6A86")),
    ])
    step(p2["id"], "Основа", "multi", False, [
        ("Экрю", 120, ("#F3EEE4", "#8B6E4E")),
        ("Ночь", 150, ("#CFD8D6", "#1A201B")),
    ])
    httpx.post(f"{API}/admin/products/{p2['id']}/early", headers=admin, json={"enabled": True}).raise_for_status()

    p3 = product(
        section2["id"],
        "Трекер хобби · Сад",
        "Для тех, кто считает урожай и цветение: грядки, травы, ягоды.",
        ("#E4E8DE", "#7C9A6D"),
    )
    step(p3["id"], "Размер", "single", True, [
        ("20 × 30 см", 990, ("#E4E8DE", "#7C9A6D")),
        ("30 × 40 см", 1290, ("#DDE5D6", "#8B6E4E")),
    ])
    step(p3["id"], "Разметка", "multi", False, [
        ("Месяцы", 90, ("#F0EDE4", "#7C9A6D")),
        ("Дни", 70, ("#EAE6DC", "#D3A23F")),
    ])

    p4 = product(
        section2["id"],
        "Трекер хобби · Море",
        "Волны, соль и горизонт: спокойная схема для вечернего вышивания.",
        ("#DCE5E6", "#4F7C86"),
    )
    step(p4["id"], "Размер", "single", True, [
        ("20 × 30 см", 990, ("#DCE5E6", "#4F7C86")),
        ("30 × 40 см", 1290, ("#D6E0E1", "#8D6A86")),
    ])

    httpx.put(
        f"{API}/admin/texts",
        headers=admin,
        json={
            "delivery": "Отправляю Почтой России или СДЭКом после согласования в личных сообщениях. Стоимость доставки зависит от региона.",
            "payment": "Оплата переводом после подтверждения заказа. Реквизиты пришлю в переписке ВКонтакте.",
            "contacts": "Сообщество ВКонтакте: https://vk.com/club206593200\nОтвечаю в личных сообщениях.",
            "privacy": "Храню только VK ID, имя и состав заказов. Телефон, адрес и платёжные данные в приложении не собираются.",
        },
    ).raise_for_status()

    catalog = httpx.get(f"{API}/catalog", headers=admin).json()
    product_id = catalog["sections"][0]["products"][0]["id"]
    detail = httpx.get(f"{API}/products/{product_id}", headers=admin).json()
    size_cards = {card["title"]: card["id"] for card in detail["steps"][0]["cards"]}
    base_cards = {card["title"]: card["id"] for card in detail["steps"][1]["cards"]}
    pack_cards = {card["title"]: card["id"] for card in detail["steps"][2]["cards"]}

    def order(vk_id: int, items: list[dict]) -> dict:
        resp = httpx.post(
            f"{API}/orders",
            headers=session(vk_id),
            json={"product_id": product_id, "items": items},
        )
        resp.raise_for_status()
        return resp.json()

    o1 = order(123, [
        {"card_id": size_cards["30 × 40 см"], "qty": 1},
        {"card_id": base_cards["Экрю"], "qty": 2},
        {"card_id": pack_cards["Подарочная"], "qty": 1},
    ])
    o2 = order(124, [
        {"card_id": size_cards["40 × 50 см"], "qty": 1},
        {"card_id": base_cards["Графит"], "qty": 1},
    ])
    o3 = order(125, [
        {"card_id": size_cards["30 × 40 см"], "qty": 1},
        {"card_id": pack_cards["Крафт"], "qty": 1},
    ])

    httpx.post(f"{API}/orders/{o2['id']}/cancel", headers=session(124)).raise_for_status()
    httpx.post(f"{API}/admin/orders/{o1['id']}/complete", headers=admin).raise_for_status()
    httpx.post(f"{API}/admin/orders/{o3['id']}/read", headers=admin).raise_for_status()

    print({
        "sections": 2,
        "products": 4,
        "orders": [o1["id"], o2["id"], o3["id"]],
    })


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"seed failed: {exc}", file=sys.stderr)
        raise
