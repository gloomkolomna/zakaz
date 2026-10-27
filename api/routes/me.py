from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from deps import get_current_user
from models import User

router = APIRouter(prefix="/api", tags=["me"])


class MeResponse(BaseModel):
    vk_id: int
    display_name: str | None
    role: str


@router.get("/me", response_model=MeResponse)
def get_me(user: User = Depends(get_current_user)):
    return MeResponse(vk_id=user.vk_id, display_name=user.display_name, role=user.role)
