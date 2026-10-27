from __future__ import annotations

from urllib.parse import urlparse

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from db import get_db
from deps import require_role
from models import Order, OrderItem, Product, ProductStep, Section, StepCard, User, utcnow
from services.catalog import filled_steps, from_price_map
from services.early import is_early
from services.uploads import remove_upload, save_image, save_video

router = APIRouter(prefix="/api/admin", tags=["admin-catalog"])


def _title(value: str) -> str:
    cleaned = (value or "").strip()
    if not cleaned:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Название не может быть пустым")
    return cleaned


def _url(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ссылка должна начинаться с http:// или https://")
    return cleaned


def _next_section_order(db: Session) -> int:
    current = db.query(func.max(Section.sort_order)).scalar()
    return (current or 0) + 1


def _next_product_order(db: Session, section_id: int) -> int:
    current = (
        db.query(func.max(Product.sort_order))
        .filter(Product.section_id == section_id)
        .scalar()
    )
    return (current or 0) + 1


def _next_step_order(db: Session, product_id: int) -> int:
    current = (
        db.query(func.max(ProductStep.sort_order))
        .filter(ProductStep.product_id == product_id)
        .scalar()
    )
    return (current or 0) + 1


def _next_card_order(db: Session, step_id: int) -> int:
    current = (
        db.query(func.max(StepCard.sort_order))
        .filter(StepCard.step_id == step_id)
        .scalar()
    )
    return (current or 0) + 1


def _section_out(section: Section) -> dict:
    return {
        "id": section.id,
        "title": section.title,
        "sort_order": section.sort_order,
        "is_active": bool(section.is_active),
        "products_count": len(section.products),
    }


def _video(product: Product) -> dict | None:
    if not (product.video_url or product.video_file_url or product.video_poster_url):
        return None
    return {
        "url": product.video_url,
        "file_url": product.video_file_url,
        "poster_url": product.video_poster_url,
    }


def _admin_product(product: Product, db: Session) -> dict:
    steps = sorted(product.steps, key=lambda step: (step.sort_order, step.id))
    return {
        "id": product.id,
        "section_id": product.section_id,
        "title": product.title,
        "description": product.description,
        "image_url": product.image_url,
        "video": _video(product),
        "video_url": product.video_url,
        "video_file_url": product.video_file_url,
        "video_poster_url": product.video_poster_url,
        "early_until": product.early_until.isoformat() if product.early_until else None,
        "is_early": is_early(product),
        "sort_order": product.sort_order,
        "is_active": bool(product.is_active),
        "from_price": from_price_map(db, [product.id]).get(product.id),
        "steps": [
            {
                "id": step.id,
                "title": step.title,
                "hint": step.hint,
                "selection_mode": step.selection_mode,
                "is_required": bool(step.is_required),
                "sort_order": step.sort_order,
                "is_active": bool(step.is_active),
                "cards_count": len(step.cards),
            }
            for step in steps
        ],
    }


class SectionIn(BaseModel):
    title: str
    sort_order: int | None = None
    is_active: bool | None = None


class ReorderIn(BaseModel):
    ids: list[int]


class ProductIn(BaseModel):
    section_id: int | None = None
    title: str | None = None
    description: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class VideoUrlIn(BaseModel):
    url: str | None = None


class EarlyIn(BaseModel):
    enabled: bool


class StepIn(BaseModel):
    title: str | None = None
    hint: str | None = None
    selection_mode: str | None = None
    is_required: bool | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class StepCreateIn(BaseModel):
    title: str
    hint: str | None = None
    selection_mode: str = "single"
    is_required: bool = False
    sort_order: int | None = None


class CardIn(BaseModel):
    title: str | None = None
    description: str | None = None
    price: int | None = None
    max_qty: int | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class CardCreateIn(BaseModel):
    title: str
    description: str | None = None
    price: int
    max_qty: int = 10
    sort_order: int | None = None


class StepReorderIn(BaseModel):
    product_id: int
    ids: list[int]


class CardReorderIn(BaseModel):
    step_id: int
    ids: list[int]


def _section(db: Session, section_id: int) -> Section:
    row = db.query(Section).filter(Section.id == section_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Раздел не найден")
    return row


def _product(db: Session, product_id: int) -> Product:
    row = db.query(Product).filter(Product.id == product_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Товар не найден")
    return row


def _has_orders(db: Session, product_id: int) -> bool:
    if db.query(Order.id).filter(Order.product_id == product_id).first() is not None:
        return True
    return (
        db.query(OrderItem.id)
        .join(StepCard, StepCard.id == OrderItem.card_id)
        .join(ProductStep, ProductStep.id == StepCard.step_id)
        .filter(ProductStep.product_id == product_id)
        .first()
        is not None
    )


def _remove_product_files(product: Product) -> None:
    remove_upload(product.image_url)
    remove_upload(product.video_file_url)
    remove_upload(product.video_poster_url)
    for step in product.steps:
        for card in step.cards:
            remove_upload(card.image_url)


def _detach_orders(db, product: Product) -> None:
    db.query(Order).filter(Order.product_id == product.id).update(
        {Order.product_id: None}, synchronize_session=False
    )
    card_ids = [card.id for step in product.steps for card in step.cards]
    if card_ids:
        db.query(OrderItem).filter(OrderItem.card_id.in_(card_ids)).update(
            {OrderItem.card_id: None}, synchronize_session=False
        )


def _step(db: Session, step_id: int) -> ProductStep:
    row = db.query(ProductStep).filter(ProductStep.id == step_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Шаг не найден")
    return row


def _card(db: Session, card_id: int) -> StepCard:
    row = db.query(StepCard).filter(StepCard.id == card_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Карточка не найдена")
    return row


@router.get("/sections")
def list_sections(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    rows = db.query(Section).order_by(Section.sort_order, Section.id).all()
    return [_section_out(row) for row in rows]


@router.post("/sections", status_code=status.HTTP_201_CREATED)
def create_section(data: SectionIn, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = Section(
        title=_title(data.title),
        sort_order=data.sort_order if data.sort_order is not None else _next_section_order(db),
        is_active=False if data.is_active is None else data.is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _section_out(row)


@router.post("/sections/reorder")
def reorder_sections(data: ReorderIn, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    if not data.ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Список пуст")
    rows = db.query(Section).filter(Section.id.in_(data.ids)).all()
    by_id = {row.id: row for row in rows}
    if len(by_id) != len(set(data.ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Раздел не найден")
    for index, section_id in enumerate(data.ids):
        by_id[section_id].sort_order = index
    db.commit()
    return {"ok": True}


@router.put("/sections/{section_id}")
def update_section(section_id: int, data: SectionIn, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = _section(db, section_id)
    row.title = _title(data.title)
    if data.sort_order is not None:
        row.sort_order = data.sort_order
    if data.is_active is not None:
        row.is_active = data.is_active
    db.commit()
    db.refresh(row)
    return _section_out(row)


@router.delete("/sections/{section_id}")
def delete_section(section_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = _section(db, section_id)
    for product in row.products:
        if not _has_orders(db, product.id):
            _remove_product_files(product)
        _detach_orders(db, product)
    db.delete(row)
    db.commit()
    return {"ok": True, "mode": "deleted"}


@router.get("/products")
def list_products(
    section_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    query = db.query(Product)
    if section_id is not None:
        query = query.filter(Product.section_id == section_id)
    rows = query.order_by(Product.section_id, Product.sort_order, Product.id).all()
    prices = from_price_map(db, [row.id for row in rows])
    return [
        {
            "id": row.id,
            "section_id": row.section_id,
            "section_title": row.section.title if row.section else "",
            "title": row.title,
            "description": row.description,
            "image_url": row.image_url,
            "video": _video(row),
            "early_until": row.early_until.isoformat() if row.early_until else None,
            "is_early": is_early(row),
            "sort_order": row.sort_order,
            "is_active": bool(row.is_active),
            "steps_count": len(filled_steps(row)),
            "from_price": prices.get(row.id),
        }
        for row in rows
    ]


@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_product(data: ProductIn, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    if data.section_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Выберите раздел")
    section = _section(db, data.section_id)
    row = Product(
        section_id=section.id,
        title=_title(data.title or ""),
        description=data.description,
        sort_order=data.sort_order if data.sort_order is not None else _next_product_order(db, section.id),
        is_active=False if data.is_active is None else data.is_active,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _admin_product(row, db)


@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    return _admin_product(_product(db, product_id), db)


@router.put("/products/{product_id}")
def update_product(product_id: int, data: ProductIn, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = _product(db, product_id)
    if data.title is not None:
        row.title = _title(data.title)
    if data.description is not None:
        row.description = data.description
    if data.section_id is not None:
        row.section_id = _section(db, data.section_id).id
    if data.sort_order is not None:
        row.sort_order = data.sort_order
    if data.is_active is not None:
        row.is_active = data.is_active
    db.commit()
    db.refresh(row)
    return _admin_product(row, db)


@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = _product(db, product_id)
    has_orders = _has_orders(db, product_id)
    _detach_orders(db, row)
    if not has_orders:
        _remove_product_files(row)
    db.delete(row)
    db.commit()
    return {"ok": True, "mode": "deleted"}


@router.post("/products/{product_id}/image")
def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    row = _product(db, product_id)
    url = save_image(file, "product", 1400)
    remove_upload(row.image_url)
    row.image_url = url
    db.commit()
    return {"url": url}


@router.delete("/products/{product_id}/image")
def delete_product_image(product_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = _product(db, product_id)
    remove_upload(row.image_url)
    row.image_url = None
    db.commit()
    return {"ok": True}


@router.post("/products/{product_id}/video")
def upload_product_video(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    row = _product(db, product_id)
    url = save_video(file, "video")
    remove_upload(row.video_file_url)
    row.video_file_url = url
    db.commit()
    return {"url": url}


@router.put("/products/{product_id}/video-url")
def set_product_video_url(
    product_id: int,
    data: VideoUrlIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    row = _product(db, product_id)
    row.video_url = _url(data.url)
    db.commit()
    return {"url": row.video_url}


@router.delete("/products/{product_id}/video")
def delete_product_video(product_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = _product(db, product_id)
    remove_upload(row.video_file_url)
    row.video_file_url = None
    row.video_url = None
    db.commit()
    return {"ok": True}


@router.post("/products/{product_id}/video-poster")
def upload_video_poster(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    row = _product(db, product_id)
    url = save_image(file, "video_poster", 1600)
    remove_upload(row.video_poster_url)
    row.video_poster_url = url
    db.commit()
    return {"url": url}


@router.delete("/products/{product_id}/video-poster")
def delete_video_poster(product_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = _product(db, product_id)
    remove_upload(row.video_poster_url)
    row.video_poster_url = None
    db.commit()
    return {"ok": True}


@router.post("/products/{product_id}/early")
def set_product_early(
    product_id: int,
    data: EarlyIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    import datetime

    import config

    row = _product(db, product_id)
    row.early_until = (
        utcnow() + datetime.timedelta(hours=config.EARLY_ACCESS_HOURS)
        if data.enabled
        else None
    )
    db.commit()
    return {"early_until": row.early_until.isoformat() if row.early_until else None}


@router.get("/products/{product_id}/steps")
def list_steps(product_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    _product(db, product_id)
    rows = (
        db.query(ProductStep)
        .filter(ProductStep.product_id == product_id)
        .order_by(ProductStep.sort_order, ProductStep.id)
        .all()
    )
    return [
        {
            "id": row.id,
            "product_id": row.product_id,
            "title": row.title,
            "hint": row.hint,
            "selection_mode": row.selection_mode,
            "is_required": bool(row.is_required),
            "sort_order": row.sort_order,
            "is_active": bool(row.is_active),
            "cards_count": len(row.cards),
        }
        for row in rows
    ]


@router.post("/products/{product_id}/steps", status_code=status.HTTP_201_CREATED)
def create_step(
    product_id: int,
    data: StepCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    _product(db, product_id)
    mode = data.selection_mode if data.selection_mode in ("single", "multi") else "single"
    row = ProductStep(
        product_id=product_id,
        title=_title(data.title),
        hint=data.hint,
        selection_mode=mode,
        is_required=data.is_required,
        sort_order=data.sort_order if data.sort_order is not None else _next_step_order(db, product_id),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.put("/steps/{step_id}")
def update_step(step_id: int, data: StepIn, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = _step(db, step_id)
    if data.title is not None:
        row.title = _title(data.title)
    if data.hint is not None:
        row.hint = data.hint
    if data.selection_mode is not None:
        if data.selection_mode not in ("single", "multi"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Режим: single или multi")
        row.selection_mode = data.selection_mode
    if data.is_required is not None:
        row.is_required = data.is_required
    if data.sort_order is not None:
        row.sort_order = data.sort_order
    if data.is_active is not None:
        row.is_active = data.is_active
    db.commit()
    return {"ok": True}


@router.delete("/steps/{step_id}")
def delete_step(step_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = _step(db, step_id)
    row.is_active = False
    db.commit()
    return {"ok": True}


@router.post("/steps/reorder")
def reorder_steps(data: StepReorderIn, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    _product(db, data.product_id)
    rows = (
        db.query(ProductStep)
        .filter(ProductStep.product_id == data.product_id, ProductStep.id.in_(data.ids))
        .all()
    )
    by_id = {row.id: row for row in rows}
    if len(by_id) != len(set(data.ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Шаг не найден")
    for index, step_id in enumerate(data.ids):
        by_id[step_id].sort_order = index
    db.commit()
    return {"ok": True}


@router.get("/steps/{step_id}/cards")
def list_cards(step_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    _step(db, step_id)
    rows = (
        db.query(StepCard)
        .filter(StepCard.step_id == step_id)
        .order_by(StepCard.sort_order, StepCard.id)
        .all()
    )
    return [
        {
            "id": row.id,
            "step_id": row.step_id,
            "title": row.title,
            "description": row.description,
            "image_url": row.image_url,
            "price": row.price,
            "max_qty": row.max_qty,
            "sort_order": row.sort_order,
            "is_active": bool(row.is_active),
        }
        for row in rows
    ]


@router.post("/steps/{step_id}/cards", status_code=status.HTTP_201_CREATED)
def create_card(
    step_id: int,
    data: CardCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    _step(db, step_id)
    if data.price < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Цена не может быть отрицательной")
    if not 1 <= data.max_qty <= 99:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Количество: от 1 до 99")
    row = StepCard(
        step_id=step_id,
        title=_title(data.title),
        description=data.description,
        price=data.price,
        max_qty=data.max_qty,
        sort_order=data.sort_order if data.sort_order is not None else _next_card_order(db, step_id),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.put("/cards/{card_id}")
def update_card(card_id: int, data: CardIn, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = _card(db, card_id)
    if data.title is not None:
        row.title = _title(data.title)
    if data.description is not None:
        row.description = data.description
    if data.price is not None:
        if data.price < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Цена не может быть отрицательной")
        row.price = data.price
    if data.max_qty is not None:
        if not 1 <= data.max_qty <= 99:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Количество: от 1 до 99")
        row.max_qty = data.max_qty
    if data.sort_order is not None:
        row.sort_order = data.sort_order
    if data.is_active is not None:
        row.is_active = data.is_active
    db.commit()
    return {"ok": True}


@router.delete("/cards/{card_id}")
def delete_card(card_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = _card(db, card_id)
    row.is_active = False
    db.commit()
    return {"ok": True}


@router.post("/cards/{card_id}/image")
def upload_card_image(
    card_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    row = _card(db, card_id)
    url = save_image(file, "card", 1400)
    remove_upload(row.image_url)
    row.image_url = url
    db.commit()
    return {"url": url}


@router.delete("/cards/{card_id}/image")
def delete_card_image(card_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    row = _card(db, card_id)
    remove_upload(row.image_url)
    row.image_url = None
    db.commit()
    return {"ok": True}


@router.post("/cards/reorder")
def reorder_cards(data: CardReorderIn, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    _step(db, data.step_id)
    rows = (
        db.query(StepCard)
        .filter(StepCard.step_id == data.step_id, StepCard.id.in_(data.ids))
        .all()
    )
    by_id = {row.id: row for row in rows}
    if len(by_id) != len(set(data.ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Карточка не найдена")
    for index, card_id in enumerate(data.ids):
        by_id[card_id].sort_order = index
    db.commit()
    return {"ok": True}
