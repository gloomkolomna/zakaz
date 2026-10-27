from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import Product, Section, User
from services.catalog import filled_steps, from_price_map
from services.early import can_order, is_early
from services.texts import get_texts

router = APIRouter(prefix="/api", tags=["catalog"])


def _product_brief(product: Product, prices: dict[int, int | None]) -> dict:
    steps = filled_steps(product)
    return {
        "id": product.id,
        "title": product.title,
        "image_url": product.image_url,
        "from_price": prices.get(product.id) if steps else None,
        "steps_count": len(steps),
        "is_early": is_early(product),
        "early_until": product.early_until.isoformat() if product.early_until else None,
    }


@router.get("/catalog")
def catalog(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    sections = (
        db.query(Section)
        .filter(Section.is_active.is_(True))
        .order_by(Section.sort_order, Section.id)
        .all()
    )
    product_ids = [
        product.id
        for section in sections
        for product in section.products
        if product.is_active
    ]
    prices = from_price_map(db, product_ids)
    return {
        "sections": [
            {
                "id": section.id,
                "title": section.title,
                "products": [
                    _product_brief(product, prices)
                    for product in sorted(section.products, key=lambda row: (row.sort_order, row.id))
                    if product.is_active
                ],
            }
            for section in sections
        ]
    }


@router.get("/products/{product_id}")
def product_detail(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None or not product.is_active or not product.section.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Товар недоступен")

    steps = filled_steps(product)
    prices = from_price_map(db, [product.id])
    allowed, reason = can_order(db, user, product)
    return {
        "id": product.id,
        "title": product.title,
        "description": product.description,
        "image_url": product.image_url,
        "section_title": product.section.title,
        "from_price": prices.get(product.id) if steps else None,
        "video": {
            "url": product.video_url,
            "file_url": product.video_file_url,
            "poster_url": product.video_poster_url,
        }
        if (product.video_url or product.video_file_url or product.video_poster_url)
        else None,
        "early_until": product.early_until.isoformat() if product.early_until else None,
        "is_early": is_early(product),
        "can_order": allowed,
        "early_reason": reason,
        "steps": [
            {
                "id": step.id,
                "title": step.title,
                "hint": step.hint,
                "mode": step.selection_mode,
                "is_required": bool(step.is_required),
                "cards": [
                    {
                        "id": card.id,
                        "title": card.title,
                        "description": card.description,
                        "image_url": card.image_url,
                        "price": card.price,
                        "max_qty": card.max_qty,
                    }
                    for card in sorted(step.cards, key=lambda row: (row.sort_order, row.id))
                    if card.is_active
                ],
            }
            for step in steps
        ],
    }


@router.get("/info")
def info(db: Session = Depends(get_db)):
    return get_texts(db)
