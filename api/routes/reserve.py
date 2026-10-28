from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import ReserveEntry, User
from services.catalog import visible_product
from services.stock import is_sold_out, ordered_count

router = APIRouter(prefix="/api", tags=["reserve"])


def _sold_out_product(db: Session, product_id: int):
    product = visible_product(db, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Товар недоступен")
    if not is_sold_out(product, ordered_count(db, product.id)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Товар есть в наличии")
    return product


@router.post("/products/{product_id}/reserve")
def create_reservation(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = _sold_out_product(db, product_id)
    entry = (
        db.query(ReserveEntry)
        .filter(ReserveEntry.product_id == product.id, ReserveEntry.user_id == user.vk_id)
        .first()
    )
    if entry is None:
        entry = ReserveEntry(product_id=product.id, user_id=user.vk_id)
        db.add(entry)
        try:
            db.commit()
            db.refresh(entry)
        except IntegrityError:
            db.rollback()
            entry = (
                db.query(ReserveEntry)
                .filter(ReserveEntry.product_id == product.id, ReserveEntry.user_id == user.vk_id)
                .first()
            )
            if entry is None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Не удалось создать заявку")
    return {"reserved": True, "created_at": entry.created_at.isoformat()}


@router.delete("/products/{product_id}/reserve")
def delete_reservation(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = (
        db.query(ReserveEntry)
        .filter(ReserveEntry.product_id == product_id, ReserveEntry.user_id == user.vk_id)
        .first()
    )
    if entry is not None:
        db.delete(entry)
        db.commit()
    return {"reserved": False}
