from __future__ import annotations

from models import DiscountGrant, User, utcnow


def discount_out(grant: DiscountGrant, user_registered: bool | None = None) -> dict:
    data = {
        "id": grant.id,
        "vk_id": grant.vk_id,
        "percent": grant.percent,
        "status": grant.status,
        "source": grant.source,
        "external_reward_id": grant.external_reward_id,
        "created_at": grant.created_at.isoformat() if grant.created_at else None,
        "used_at": grant.used_at.isoformat() if grant.used_at else None,
        "revoked_at": grant.revoked_at.isoformat() if grant.revoked_at else None,
        "order_id": grant.order_id,
    }
    if user_registered is not None:
        data["user_registered"] = user_registered
    return data


def grant_discount(db, vk_id: int, percent: int, external_reward_id: str) -> dict:
    grant = db.query(DiscountGrant).filter(
        DiscountGrant.external_reward_id == external_reward_id,
    ).first()
    user = db.query(User).filter(User.vk_id == vk_id).first()
    if grant is None:
        grant = DiscountGrant(
            vk_id=vk_id,
            percent=percent,
            external_reward_id=external_reward_id,
            status="available",
            created_at=utcnow(),
        )
        db.add(grant)
        db.commit()
        db.refresh(grant)
    return discount_out(grant, user is not None)


def grant_manual_discount(db, vk_id: int, percent: int) -> dict:
    import uuid

    user = db.query(User).filter(User.vk_id == vk_id).first()
    grant = DiscountGrant(
        vk_id=vk_id,
        percent=percent,
        source="manual",
        external_reward_id=f"manual:{uuid.uuid4().hex}",
        status="available",
        created_at=utcnow(),
    )
    db.add(grant)
    db.commit()
    db.refresh(grant)
    return discount_out(grant, user is not None)


def available_discounts(db, vk_id: int) -> list[DiscountGrant]:
    return db.query(DiscountGrant).filter(
        DiscountGrant.vk_id == vk_id,
        DiscountGrant.status == "available",
    ).order_by(DiscountGrant.id).all()


def get_for_order(db, grant_id: int | None, vk_id: int) -> DiscountGrant | None:
    if grant_id is None:
        return None
    grant = db.query(DiscountGrant).filter(
        DiscountGrant.id == grant_id,
        DiscountGrant.vk_id == vk_id,
        DiscountGrant.status == "available",
    ).first()
    if grant is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=409, detail="Скидка недоступна или уже использована")
    return grant


def discount_amount(subtotal: int, percent: int) -> int:
    return (subtotal * percent + 50) // 100


def revoke_discount(db, external_reward_id: str) -> dict:
    from fastapi import HTTPException

    grant = db.query(DiscountGrant).filter(
        DiscountGrant.external_reward_id == external_reward_id,
    ).first()
    if grant is None:
        raise HTTPException(status_code=404, detail="Скидка не найдена")
    if grant.status == "used":
        raise HTTPException(status_code=409, detail="Скидка уже использована — отозвать нельзя")
    if grant.status == "available":
        grant.status = "revoked"
        grant.revoked_at = utcnow()
        db.commit()
    return {"ok": True, "status": "revoked"}


def return_for_cancelled_order(db, order) -> None:
    if not order.discount_grant_id:
        return
    grant = db.query(DiscountGrant).filter(
        DiscountGrant.id == order.discount_grant_id,
        DiscountGrant.order_id == order.id,
        DiscountGrant.status == "used",
    ).first()
    if grant:
        grant.status = "available"
        grant.order_id = None
        grant.used_at = None
