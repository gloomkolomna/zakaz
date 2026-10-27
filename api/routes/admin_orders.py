from __future__ import annotations

import csv
import datetime
import io

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from db import get_db
from deps import require_role
from models import Log, Order, Product, User, utcnow
from services.donor import donor_flags
from services.msk_time import MSK, msk_day_end_utc, msk_day_start_utc
from services.order_view import order_brief, order_detail
from services.queue import move_order, queue_map

router = APIRouter(prefix="/api/admin", tags=["admin-orders"])

STATUSES = ("new", "done", "cancelled")
STATUS_LABELS = {"new": "В работе", "done": "Выполнен", "cancelled": "Отменён"}


def _date(value: str | None, label: str) -> datetime.date | None:
    if not value:
        return None
    try:
        return datetime.date.fromisoformat(value)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{label}: формат YYYY-MM-DD")


def _base_query(
    db: Session,
    section_id: int | None,
    product_id: int | None,
    date_from: datetime.date | None,
    date_to: datetime.date | None,
    q: str | None,
    unread: int,
    order_status: str | None,
    queue_only: int,
    cancel_unread: int,
):
    query = db.query(Order)
    if section_id is not None:
        query = query.join(Product, Product.id == Order.product_id).filter(Product.section_id == section_id)
    if product_id is not None:
        query = query.filter(Order.product_id == product_id)
    if date_from is not None:
        query = query.filter(Order.created_at >= msk_day_start_utc(date_from))
    if date_to is not None:
        query = query.filter(Order.created_at < msk_day_end_utc(date_to))
    if q:
        value = q.strip()
        if value.isdigit():
            query = query.filter(Order.id == int(value))
        else:
            term = f"%{value}%"
            query = query.filter(or_(
                Order.buyer_name.ilike(term),
                Order.product_title.ilike(term),
                Order.section_title.ilike(term),
            ))
    if unread:
        query = query.filter(Order.read_at.is_(None))
    if order_status:
        if order_status not in STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неизвестный статус")
        query = query.filter(Order.status == order_status)
    if queue_only:
        query = query.filter(Order.status == "new")
    if cancel_unread:
        query = query.filter(Order.status == "cancelled", Order.cancel_seen_at.is_(None))
    return query


def _export_rows(
    db: Session,
    section_id: int | None,
    product_id: int | None,
    date_from: datetime.date | None,
    date_to: datetime.date | None,
    q: str | None,
    unread: int,
    order_status: str | None,
    queue_only: int,
    cancel_unread: int,
):
    base = _base_query(
        db, section_id, product_id, date_from, date_to, q,
        unread, order_status, queue_only, cancel_unread,
    )
    rows = (
        base.options(selectinload(Order.items))
        .order_by(func.coalesce(Order.queue_order, 1_000_000_000), Order.created_at, Order.id)
        .all()
    )
    return rows, queue_map(db)


@router.get("/orders")
def list_orders(
    section_id: int | None = None,
    product_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    q: str | None = None,
    unread: int = 0,
    status_filter: str | None = Query(default=None, alias="status"),
    queue: int = 0,
    cancel_unread: int = 0,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    start = _date(date_from, "Дата с")
    end = _date(date_to, "Дата по")
    limit = max(1, min(limit, 200))
    offset = max(0, offset)
    base = _base_query(db, section_id, product_id, start, end, q, unread, status_filter, queue, cancel_unread)

    total = base.count()
    summary = {
        "count": total,
        "queue": base.filter(Order.status == "new").count(),
        "unread": base.filter(Order.read_at.is_(None)).count(),
        "sum": int(base.with_entities(func.coalesce(func.sum(Order.total), 0)).scalar() or 0),
        "cancelled": base.filter(Order.status == "cancelled").count(),
        "cancelled_unread": base.filter(Order.status == "cancelled", Order.cancel_seen_at.is_(None)).count(),
    }

    if queue:
        rows = (
            base.order_by(func.coalesce(Order.queue_order, 1_000_000_000), Order.created_at, Order.id)
            .offset(offset)
            .limit(limit)
            .all()
        )
    else:
        rows = base.order_by(Order.created_at.desc(), Order.id.desc()).offset(offset).limit(limit).all()

    positions = queue_map(db)
    return {
        "items": [order_brief(db, order, positions) for order in rows],
        "total": total,
        "summary": summary,
    }


@router.get("/orders/export.csv")
def export_orders(
    section_id: int | None = None,
    product_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    q: str | None = None,
    unread: int = 0,
    status_filter: str | None = Query(default=None, alias="status"),
    queue: int = 0,
    cancel_unread: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    start = _date(date_from, "Дата с")
    end = _date(date_to, "Дата по")
    rows, positions = _export_rows(
        db, section_id, product_id, start, end, q,
        unread, status_filter, queue, cancel_unread,
    )

    out = io.StringIO()
    writer = csv.writer(out, delimiter=";", lineterminator="\r\n")
    writer.writerow([
        "№", "Очередь", "Дата", "Раздел", "Товар", "Состав",
        "Кол-во позиций", "Сумма", "Статус", "VK ID", "Имя",
    ])
    for order in rows:
        created = order.created_at.replace(tzinfo=datetime.timezone.utc).astimezone(MSK)
        composition = ", ".join(f"{item.card_title} × {item.qty}" for item in order.items)
        writer.writerow([
            order.id,
            positions.get(order.id, ""),
            created.strftime("%d.%m.%Y %H:%M"),
            order.section_title,
            order.product_title,
            composition,
            order.items_count,
            order.total,
            STATUS_LABELS.get(order.status, order.status),
            order.user_id,
            order.buyer_name,
        ])

    body = "\ufeff" + out.getvalue()
    return Response(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="zakaz-orders.csv"'},
    )


@router.get("/orders/export.pdf")
def export_orders_pdf(
    section_id: int | None = None,
    product_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    q: str | None = None,
    unread: int = 0,
    status_filter: str | None = Query(default=None, alias="status"),
    queue: int = 0,
    cancel_unread: int = 0,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    from services.orders_pdf import render_orders_pdf

    start = _date(date_from, "Дата с")
    end = _date(date_to, "Дата по")
    rows, positions = _export_rows(
        db, section_id, product_id, start, end, q,
        unread, status_filter, queue, cancel_unread,
    )
    return Response(
        content=render_orders_pdf(rows, positions),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="zakaz-orders.pdf"'},
    )


@router.get("/orders/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")
    return order_detail(db, order)


@router.post("/orders/{order_id}/read")
def mark_read(order_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")
    if order.read_at is None:
        order.read_at = utcnow()
        db.commit()
        db.refresh(order)
    return order_detail(db, order)


@router.post("/orders/{order_id}/complete")
def complete_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")
    if order.status != "new":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Заказ уже не в работе")
    order.status = "done"
    order.done_at = utcnow()
    order.queue_order = None
    db.commit()
    db.refresh(order)
    return order_detail(db, order)


class MoveIn(BaseModel):
    direction: str


@router.post("/orders/{order_id}/move")
def move(order_id: int, data: MoveIn, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")
    if not move_order(db, order, data.direction):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Переместить нельзя")
    return {"ok": True, "queue_position": queue_map(db).get(order.id)}


@router.post("/orders/{order_id}/cancel-seen")
def cancel_seen(order_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")
    if order.status != "cancelled":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Заказ не отменён")
    order.cancel_seen_at = utcnow()
    db.commit()
    db.refresh(order)
    return order_detail(db, order)


class TextIn(BaseModel):
    delivery: str | None = None
    payment: str | None = None
    contacts: str | None = None
    privacy: str | None = None
    catalog_title: str | None = None
    catalog_description: str | None = None


@router.get("/texts")
def get_admin_texts(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    from services.texts import get_all_texts

    return get_all_texts(db)


@router.put("/texts")
def put_admin_texts(data: TextIn, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    from services.texts import set_texts

    return set_texts(db, data.model_dump(exclude_unset=True))


@router.get("/logs")
def get_logs(
    level: str | None = "error",
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    limit = max(1, min(limit, 500))
    query = db.query(Log)
    if level:
        query = query.filter(Log.level == level)
    rows = query.order_by(Log.created_at.desc(), Log.id.desc()).limit(limit).all()
    return [
        {
            "id": row.id,
            "source": row.source,
            "level": row.level,
            "event": row.event,
            "method": row.method,
            "path": row.path,
            "status_code": row.status_code,
            "message": row.message,
            "details": row.details,
            "user_id": row.user_id,
            "client_ip": row.client_ip,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.get("/players")
def list_players(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    rows = db.query(User).order_by(User.created_at.desc()).limit(500).all()
    flags = donor_flags(db, [row.vk_id for row in rows])
    return [
        {
            "vk_id": row.vk_id,
            "display_name": row.display_name or f"Покупатель {row.vk_id}",
            "role": row.role,
            "status": row.status,
            "is_donor": bool(row.role == "admin" or flags.get(row.vk_id)),
            "donor_exempt": bool(row.donor_exempt),
        }
        for row in rows
    ]


class DonorExemptIn(BaseModel):
    enabled: bool


@router.post("/players/{vk_id}/donor-exempt")
def set_donor_exempt(
    vk_id: int,
    data: DonorExemptIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    target = db.query(User).filter(User.vk_id == vk_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказчик не найден")
    target.donor_exempt = data.enabled
    db.commit()
    return {"vk_id": target.vk_id, "donor_exempt": bool(target.donor_exempt)}


@router.post("/donors/sync")
def sync_donors(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    from services.donor import sync_all_users

    return {"synced": sync_all_users(db)}
