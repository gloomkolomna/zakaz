from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db import get_db
from deps import require_role
from models import DiscountGrant, Order, User
from services.discounts import discount_out, grant_manual_discount, revoke_discount

router = APIRouter(prefix="/api/admin/discounts", tags=["admin-discounts"], dependencies=[Depends(require_role("admin"))])

STATUSES = ("available", "used", "revoked")


class DiscountIn(BaseModel):
    vk_id: int = Field(gt=0)
    percent: int = Field(default=5, ge=1, le=99)


@router.get("")
def list_discounts(
    vk_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    if status is not None and status not in STATUSES:
        raise HTTPException(status_code=400, detail="Неизвестный статус скидки")
    query = db.query(DiscountGrant)
    if vk_id is not None:
        query = query.filter(DiscountGrant.vk_id == vk_id)
    if status is not None:
        query = query.filter(DiscountGrant.status == status)
    grants = query.order_by(DiscountGrant.created_at.desc(), DiscountGrant.id.desc()).limit(500).all()
    user_ids = {grant.vk_id for grant in grants}
    order_ids = {grant.order_id for grant in grants if grant.order_id is not None}
    users = {row.vk_id: row for row in db.query(User).filter(User.vk_id.in_(user_ids)).all()} if user_ids else {}
    orders = {row.id: row for row in db.query(Order).filter(Order.id.in_(order_ids)).all()} if order_ids else {}
    return {
        "items": [
            {
                **discount_out(grant, grant.vk_id in users),
                "display_name": users[grant.vk_id].display_name if grant.vk_id in users else None,
                "order_title": orders[grant.order_id].product_title if grant.order_id in orders else None,
            }
            for grant in grants
        ]
    }


@router.post("", status_code=201)
def create_discount(data: DiscountIn, db: Session = Depends(get_db)):
    return grant_manual_discount(db, data.vk_id, data.percent)


@router.post("/{grant_id}/revoke")
def revoke_grant(grant_id: int, db: Session = Depends(get_db)):
    grant = db.query(DiscountGrant).filter(DiscountGrant.id == grant_id).first()
    if grant is None:
        raise HTTPException(status_code=404, detail="Скидка не найдена")
    return revoke_discount(db, grant.external_reward_id)
