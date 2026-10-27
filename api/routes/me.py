from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import User
from services.donor import is_donor_user

router = APIRouter(prefix="/api", tags=["me"])


class MeResponse(BaseModel):
    vk_id: int
    display_name: str | None
    role: str
    is_donor: bool
    donor_exempt: bool


@router.get("/me", response_model=MeResponse)
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return MeResponse(
        vk_id=user.vk_id,
        display_name=user.display_name,
        role=user.role,
        is_donor=is_donor_user(db, user),
        donor_exempt=bool(user.donor_exempt),
    )
