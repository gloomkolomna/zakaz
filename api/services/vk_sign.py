from __future__ import annotations

import base64
import hashlib
import hmac
from typing import Optional

import config


def _calc_sign(query: str) -> str:
    digest = hmac.new(
        key=config.VK_APP_SECRET.encode(),
        msg=query.encode(),
        digestmod=hashlib.sha256,
    ).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def verify_launch_params(params: dict) -> Optional[int]:
    if config.DEV_LOGIN_ENABLED:
        vk_id = params.get("vk_user_id")
        if vk_id:
            try:
                return int(vk_id)
            except (ValueError, TypeError):
                return None
        return None

    sign = params.get("sign")
    if not sign:
        return None

    vk_pairs = sorted(
        (k, v) for k, v in params.items() if k.startswith("vk_") and k != "sign"
    )
    query = "&".join(f"{k}={v}" for k, v in vk_pairs)
    calculated = _calc_sign(query)

    if hmac.compare_digest(calculated, sign):
        vk_id = params.get("vk_user_id")
        try:
            return int(vk_id) if vk_id else None
        except (ValueError, TypeError):
            return None
    return None
