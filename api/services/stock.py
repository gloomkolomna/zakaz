from __future__ import annotations

from sqlalchemy import func

from models import Order


def ordered_map(db, product_ids: list[int]) -> dict[int, int]:
    if not product_ids:
        return {}
    rows = (
        db.query(Order.product_id, func.count(Order.id))
        .filter(Order.product_id.in_(product_ids), Order.status != "cancelled")
        .group_by(Order.product_id)
        .all()
    )
    return {int(product_id): int(count) for product_id, count in rows if product_id is not None}


def ordered_count(db, product_id: int) -> int:
    return ordered_map(db, [product_id]).get(product_id, 0)


def is_sold_out(product, ordered: int) -> bool:
    limit = int(product.stock or 0)
    return limit > 0 and ordered >= limit
