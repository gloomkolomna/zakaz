from __future__ import annotations

import datetime

from models import Order, OrderItem, Product, ProductStep, Section, StepCard


def make_section(db, title="Раздел", sort_order=0, is_active=True):
    row = Section(title=title, sort_order=sort_order, is_active=is_active)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def make_product(
    db,
    section,
    title="Товар",
    sort_order=0,
    is_active=True,
    early_until=None,
    stock=0,
    mode="build",
    price=None,
):
    row = Product(
        section_id=section.id,
        title=title,
        description="Описание",
        sort_order=sort_order,
        is_active=is_active,
        early_until=early_until,
        stock=stock,
        mode=mode,
        price=price,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def make_step(
    db,
    product,
    title="Шаг",
    selection_mode="single",
    is_required=False,
    sort_order=0,
    is_active=True,
    hint=None,
):
    row = ProductStep(
        product_id=product.id,
        title=title,
        hint=hint,
        selection_mode=selection_mode,
        is_required=is_required,
        sort_order=sort_order,
        is_active=is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def make_card(
    db,
    step,
    title="Карточка",
    price=100,
    max_qty=10,
    sort_order=0,
    is_active=True,
):
    row = StepCard(
        step_id=step.id,
        title=title,
        price=price,
        max_qty=max_qty,
        sort_order=sort_order,
        is_active=is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def make_order(db, user_id, product, total=100, status="new", queue_order=1, **kwargs):
    row = Order(
        user_id=user_id,
        buyer_name=kwargs.pop("buyer_name", "Покупатель"),
        product_id=product.id if product else None,
        product_title=product.title if product else "Товар",
        section_title=product.section.title if product else "Раздел",
        total=total,
        items_count=kwargs.pop("items_count", 1),
        status=status,
        queue_order=queue_order,
        created_at=kwargs.pop("created_at", datetime.datetime.utcnow()),
        **kwargs,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def make_item(db, order, card, qty=1, price=100):
    row = OrderItem(
        order_id=order.id,
        card_id=card.id,
        step_title=card.step.title,
        card_title=card.title,
        price=price,
        qty=qty,
        sum=price * qty,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
