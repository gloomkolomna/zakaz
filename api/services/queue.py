from __future__ import annotations

from sqlalchemy import func

from models import Order

QUEUE_LAST = 1_000_000_000


def queue_map(db) -> dict[int, int]:
    rows = (
        db.query(Order.id)
        .filter(Order.status == "new")
        .order_by(func.coalesce(Order.queue_order, QUEUE_LAST), Order.created_at, Order.id)
        .all()
    )
    return {order_id: index + 1 for index, (order_id,) in enumerate(rows)}


def next_queue_order(db) -> int:
    current = (
        db.query(func.max(Order.queue_order))
        .filter(Order.status == "new")
        .scalar()
    )
    return (current or 0) + 1


def queue_position(db, order) -> int | None:
    if order.status != "new":
        return None
    return queue_map(db).get(order.id)


def _active_orders(db) -> list[Order]:
    return (
        db.query(Order)
        .filter(Order.status == "new")
        .order_by(func.coalesce(Order.queue_order, QUEUE_LAST), Order.created_at, Order.id)
        .all()
    )


def move_order(db, order, direction: str) -> bool:
    if order.status != "new" or direction not in ("up", "down"):
        return False
    orders = _active_orders(db)
    index = next((i for i, row in enumerate(orders) if row.id == order.id), None)
    if index is None:
        return False
    target = index - 1 if direction == "up" else index + 1
    if target < 0 or target >= len(orders):
        return False

    for position, row in enumerate(orders, start=1):
        row.queue_order = position
    db.flush()

    neighbour = orders[target]
    order.queue_order, neighbour.queue_order = neighbour.queue_order, order.queue_order
    db.commit()
    return True
