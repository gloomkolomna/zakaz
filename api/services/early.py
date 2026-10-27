from __future__ import annotations

import datetime


def is_early(product) -> bool:
    return product.early_until is not None and product.early_until > datetime.datetime.utcnow()


def can_order(db, user, product) -> tuple[bool, str | None]:
    if not is_early(product):
        return True, None
    from services.donor import is_donor_user

    if is_donor_user(db, user):
        return True, None
    return False, "early_access"
