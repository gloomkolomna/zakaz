from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

import config
from db import get_db
from deps import get_current_user
from models import Order, OrderItem, Product, ProductStep, StepCard, User, utcnow
from services.catalog import filled_steps
from services.early import can_order
from services.order_view import order_brief, order_detail
from services.queue import next_queue_order, queue_map
from services.stock import is_sold_out, ordered_count

router = APIRouter(prefix="/api", tags=["orders"])


class ItemIn(BaseModel):
    card_id: int
    qty: int


class OrderIn(BaseModel):
    product_id: int
    items: list[ItemIn] = []
    qty: int | None = None
    comment: str | None = None


MAX_COMMENT = 1000


def _bad(message: str):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)


def _comment(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if len(cleaned) > MAX_COMMENT:
        _bad(f"Комментарий слишком длинный (макс. {MAX_COMMENT} символов)")
    return cleaned


def _cover(card: StepCard) -> str | None:
    images = sorted(card.images, key=lambda row: (row.sort_order, row.id))
    return images[0].image_url if images else None


def _check_rate_limit(db: Session, user: User) -> None:
    if user.role == "admin":
        return
    limit = config.ORDER_RATE_LIMIT_PER_MINUTE
    if limit <= 0:
        return
    cutoff = utcnow() - datetime.timedelta(minutes=1)
    recent = (
        db.query(func.count(Order.id))
        .filter(Order.user_id == user.vk_id, Order.created_at >= cutoff)
        .scalar()
        or 0
    )
    if recent >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "rate_limited",
                "message": "Слишком много заказов подряд. Подождите минуту и попробуйте снова.",
            },
            headers={"Retry-After": "60"},
        )


def _own_order(db: Session, order_id: int, user: User) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")
    if order.user_id != user.vk_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Это чужой заказ")
    return order


@router.post("/orders", status_code=status.HTTP_201_CREATED)
def create_order(data: OrderIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if product is None or not product.is_active or not product.section.is_active:
        _bad("Товар недоступен")

    allowed, reason = can_order(db, user, product)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": reason or "early_access",
                "message": "Товар ещё не открыт для всех — сейчас доступен донам сообщества",
            },
        )

    if is_sold_out(product, ordered_count(db, product.id)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "sold_out", "message": "Товар закончился"},
        )

    _check_rate_limit(db, user)
    comment = _comment(data.comment)

    if product.mode == "single":
        return _single_order(db, user, product, data, comment)

    return _build_order(db, user, product, data, comment)


def _build_order(
    db: Session, user: User, product: Product, data: OrderIn, comment: str | None
) -> dict:
    if not 1 <= len(data.items) <= 100:
        _bad("В заказе должно быть от 1 до 100 позиций")

    seen: set[int] = set()
    for item in data.items:
        if item.card_id in seen:
            _bad("Одна и та же карточка указана дважды")
        seen.add(item.card_id)

    cards = (
        db.query(StepCard)
        .options(selectinload(StepCard.images))
        .join(ProductStep, ProductStep.id == StepCard.step_id)
        .filter(StepCard.id.in_(seen), ProductStep.product_id == product.id)
        .all()
    )
    by_id = {card.id: card for card in cards}
    if len(by_id) != len(seen):
        _bad("Карточка не принадлежит этому товару")

    steps_by_card: dict[int, ProductStep] = {}
    for card in cards:
        if not card.is_active or not card.step.is_active:
            _bad(f"Позиция «{card.title}» больше недоступна")
        if not 1 <= item_qty(data.items, card.id) <= card.max_qty:
            _bad(f"Количество для «{card.title}»: от 1 до {card.max_qty}")
        steps_by_card[card.id] = card.step

    selected_by_step: dict[int, int] = {}
    for card_id in seen:
        step_id = steps_by_card[card_id].id
        selected_by_step[step_id] = selected_by_step.get(step_id, 0) + 1

    for step in product.steps:
        if not step.is_active:
            continue
        count = selected_by_step.get(step.id, 0)
        if step.selection_mode == "single" and count > 1:
            _bad(f"В шаге «{step.title}» можно выбрать только один вариант")
        if step.is_required and count == 0:
            _bad(f"В шаге «{step.title}» нужно выбрать хотя бы один вариант")

    if not filled_steps(product):
        _bad("Товар пока нельзя собрать")

    qty_by_card = {item.card_id: item.qty for item in data.items}
    total = 0
    items: list[OrderItem] = []
    for card in cards:
        qty = qty_by_card[card.id]
        line_sum = card.price * qty
        total += line_sum
        items.append(
            OrderItem(
                card_id=card.id,
                step_title=card.step.title,
                card_title=card.title,
                image_url=_cover(card),
                price=card.price,
                qty=qty,
                sum=line_sum,
            )
        )
    return _place_order(db, user, product, items, total, comment)


def _single_order(
    db: Session, user: User, product: Product, data: OrderIn, comment: str | None
) -> dict:
    if data.items:
        _bad("Для одиночного товара состав не передаётся")
    if product.price is None:
        _bad("У товара не указана цена")
    qty = data.qty if data.qty is not None else 0
    if not 1 <= qty <= 99:
        _bad("Количество: от 1 до 99")
    price = int(product.price)
    total = price * qty
    item = OrderItem(
        card_id=None,
        step_title="Товар",
        card_title=product.title,
        image_url=product.image_url,
        price=price,
        qty=qty,
        sum=total,
    )
    return _place_order(db, user, product, [item], total, comment)


def _place_order(
    db: Session,
    user: User,
    product: Product,
    items: list[OrderItem],
    total: int,
    comment: str | None,
) -> dict:
    order = Order(
        user_id=user.vk_id,
        buyer_name=user.display_name or f"Покупатель {user.vk_id}",
        product_id=product.id,
        product_title=product.title,
        section_title=product.section.title,
        total=total,
        items_count=len(items),
        comment=comment,
        status="new",
        queue_order=next_queue_order(db),
        created_at=utcnow(),
        items=items,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order_detail(db, order)


def item_qty(items: list[ItemIn], card_id: int) -> int:
    for item in items:
        if item.card_id == card_id:
            return item.qty
    return 0


@router.get("/me/orders")
def my_orders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = (
        db.query(Order)
        .filter(Order.user_id == user.vk_id)
        .order_by(Order.created_at.desc(), Order.id.desc())
        .limit(100)
        .all()
    )
    positions = queue_map(db)
    return {"items": [order_brief(db, order, positions) for order in rows]}


@router.get("/orders/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")
    if order.user_id != user.vk_id and user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Это чужой заказ")
    return order_detail(db, order)


@router.post("/orders/{order_id}/cancel")
def cancel_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = _own_order(db, order_id, user)
    if order.status == "cancelled":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Заказ уже отменён")
    if order.status == "done":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Выполненный заказ отменить нельзя")
    order.status = "cancelled"
    order.cancelled_at = utcnow()
    order.cancel_seen_at = None
    order.queue_order = None
    db.commit()
    db.refresh(order)
    return order_detail(db, order)
