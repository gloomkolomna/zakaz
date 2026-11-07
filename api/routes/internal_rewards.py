from __future__ import annotations

import hmac

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import config
from db import get_db
from services.discounts import grant_discount, revoke_discount

router = APIRouter(prefix="/api/internal/rewards", tags=["internal-rewards"])


class DiscountGrantIn(BaseModel):
    vk_id: int = Field(gt=0)
    external_reward_id: str = Field(min_length=1, max_length=200)
    percent: int = Field(ge=1, le=99)


class DiscountRevokeIn(BaseModel):
    external_reward_id: str = Field(min_length=1, max_length=200)


def require_integration_key(x_integration_key: str = Header(default="")):
    if not config.HOLIDAYS_INTEGRATION_KEY:
        raise HTTPException(status_code=503, detail="Интеграция не настроена")
    if not hmac.compare_digest(x_integration_key, config.HOLIDAYS_INTEGRATION_KEY):
        raise HTTPException(status_code=403, detail="Неверный ключ интеграции")


@router.post("/discount", dependencies=[Depends(require_integration_key)])
def create_discount(data: DiscountGrantIn, db: Session = Depends(get_db)):
    return grant_discount(db, data.vk_id, data.percent, data.external_reward_id.strip())


@router.post("/discount/revoke", dependencies=[Depends(require_integration_key)])
def revoke(data: DiscountRevokeIn, db: Session = Depends(get_db)):
    return revoke_discount(db, data.external_reward_id.strip())
