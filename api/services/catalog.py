from __future__ import annotations

from sqlalchemy import func

from models import ProductStep, StepCard


def from_price_map(db, product_ids: list[int]) -> dict[int, int | None]:
    if not product_ids:
        return {}
    rows = (
        db.query(ProductStep.product_id, StepCard.step_id, func.min(StepCard.price))
        .join(StepCard, StepCard.step_id == ProductStep.id)
        .filter(
            ProductStep.product_id.in_(product_ids),
            ProductStep.is_active.is_(True),
            StepCard.is_active.is_(True),
        )
        .group_by(ProductStep.product_id, StepCard.step_id)
        .all()
    )
    totals: dict[int, list[int]] = {}
    for product_id, _step_id, price in rows:
        totals.setdefault(product_id, []).append(int(price))
    return {product_id: sum(prices) for product_id, prices in totals.items()}


def from_price(db, product_id: int) -> int | None:
    return from_price_map(db, [product_id]).get(product_id)


def filled_steps(product) -> list[ProductStep]:
    return [step for step in product.steps if step.is_active and any(card.is_active for card in step.cards)]
