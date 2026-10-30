from __future__ import annotations

from sqlalchemy import func

from models import Product, ProductStep, StepCard


def visible_product(db, product_id: int) -> Product | None:
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None or not product.is_active or not product.section.is_active:
        return None
    return product


def from_price_map(db, product_ids: list[int]) -> dict[int, int | None]:
    if not product_ids:
        return {}
    result: dict[int, int | None] = {}
    single_rows = (
        db.query(Product.id, Product.price)
        .filter(Product.id.in_(product_ids), Product.mode == "single")
        .all()
    )
    for product_id, price in single_rows:
        result[int(product_id)] = int(price) if price is not None else None
    rows = (
        db.query(ProductStep.product_id, StepCard.step_id, func.min(StepCard.price))
        .join(StepCard, StepCard.step_id == ProductStep.id)
        .join(Product, Product.id == ProductStep.product_id)
        .filter(
            ProductStep.product_id.in_(product_ids),
            Product.mode == "build",
            ProductStep.is_active.is_(True),
            StepCard.is_active.is_(True),
        )
        .group_by(ProductStep.product_id, StepCard.step_id)
        .all()
    )
    totals: dict[int, list[int]] = {}
    for product_id, _step_id, price in rows:
        totals.setdefault(product_id, []).append(int(price))
    for product_id, prices in totals.items():
        result[product_id] = sum(prices)
    return result


def from_price(db, product_id: int) -> int | None:
    return from_price_map(db, [product_id]).get(product_id)


def filled_steps(product) -> list[ProductStep]:
    return [step for step in product.steps if step.is_active and any(card.is_active for card in step.cards)]


def visible_steps(product) -> list[ProductStep]:
    if product.mode == "single":
        return []
    return filled_steps(product)
