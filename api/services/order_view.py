from __future__ import annotations

from services.queue import queue_map


def early_fields(product) -> dict:
    from services.early import is_early

    return {
        "is_early": is_early(product),
        "early_until": product.early_until.isoformat() if product.early_until else None,
    }


def order_brief(db, order, positions: dict[int, int] | None = None) -> dict:
    if positions is None:
        positions = queue_map(db)
    return {
        "id": order.id,
        "total": order.total,
        "status": order.status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "cancelled_at": order.cancelled_at.isoformat() if order.cancelled_at else None,
        "done_at": order.done_at.isoformat() if order.done_at else None,
        "product_id": order.product_id,
        "product_title": order.product_title,
        "section_title": order.section_title,
        "items_count": order.items_count,
        "buyer_name": order.buyer_name,
        "user_id": order.user_id,
        "read_at": order.read_at.isoformat() if order.read_at else None,
        "cancel_seen_at": order.cancel_seen_at.isoformat() if order.cancel_seen_at else None,
        "queue_position": positions.get(order.id) if order.status == "new" else None,
    }


def order_detail(db, order, positions: dict[int, int] | None = None) -> dict:
    data = order_brief(db, order, positions)
    data["items"] = [
        {
            "id": item.id,
            "card_id": item.card_id,
            "step_title": item.step_title,
            "card_title": item.card_title,
            "image_url": item.image_url,
            "price": item.price,
            "qty": item.qty,
            "sum": item.sum,
        }
        for item in order.items
    ]
    return data
