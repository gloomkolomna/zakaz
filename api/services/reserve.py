from __future__ import annotations

from models import ReserveEntry


def has_reservation(db, product_id: int, user_id: int) -> bool:
    return (
        db.query(ReserveEntry.id)
        .filter(ReserveEntry.product_id == product_id, ReserveEntry.user_id == user_id)
        .first()
        is not None
    )
