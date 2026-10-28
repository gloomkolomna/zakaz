from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from deps import require_role
from models import Product, ReserveEntry, User
from services.stock import is_sold_out, ordered_map

router = APIRouter(prefix="/api/admin", tags=["admin-reserve"])


@router.get("/reserve")
def list_reserve(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    rows = (
        db.query(ReserveEntry, Product, User)
        .join(Product, Product.id == ReserveEntry.product_id)
        .join(User, User.vk_id == ReserveEntry.user_id)
        .order_by(ReserveEntry.created_at, ReserveEntry.id)
        .all()
    )
    ordered = ordered_map(db, [product.id for _, product, _ in rows])
    items = []
    for entry, product, buyer in rows:
        count = ordered.get(product.id, 0)
        sold_out = is_sold_out(product, count)
        items.append({
            "id": entry.id,
            "product_id": product.id,
            "product_title": product.title,
            "product_image_url": product.image_url,
            "product_is_active": bool(product.is_active),
            "stock": int(product.stock or 0),
            "ordered_count": count,
            "sold_out": sold_out,
            "available": not sold_out and bool(product.is_active),
            "user_id": entry.user_id,
            "buyer_name": buyer.display_name or f"Покупатель {entry.user_id}",
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
        })
    ready = [item for item in items if item["available"]]
    return {
        "items": items,
        "summary": {
            "waiting": len(items),
            "products": len({item["product_id"] for item in items}),
            "ready": len(ready),
        },
    }


@router.delete("/reserve/{entry_id}")
def remove_reservation(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    entry = db.query(ReserveEntry).filter(ReserveEntry.id == entry_id).first()
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заявка не найдена")
    db.delete(entry)
    db.commit()
    return {"ok": True}
