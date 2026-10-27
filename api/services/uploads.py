from __future__ import annotations

import io
import os
import time

from fastapi import HTTPException, UploadFile, status

import config

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

try:
    from PIL import Image as _PILImage

    _PILImage.MAX_IMAGE_PIXELS = 40_000_000
except ImportError:
    pass

MAX_IMAGE_PIXELS = 40_000_000
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_VIDEO_EXTENSIONS = {"mp4", "webm", "mov"}


def _get_s3():
    if not config.S3_ENABLED:
        return None
    import services.s3_storage as s3

    return s3


def _read_with_limit(upload: UploadFile, limit: int, label: str) -> bytes:
    buf = bytearray()
    while True:
        chunk = upload.file.read(64 * 1024)
        if not chunk:
            break
        buf += chunk
        if len(buf) > limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{label} слишком большой (макс. {limit // (1024 * 1024)} МБ)",
            )
    return bytes(buf)


def _open_image(buf: bytes):
    from PIL import Image

    try:
        img = Image.open(io.BytesIO(buf))
    except Image.DecompressionBombError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Изображение слишком большое по разрешению")
    except (OSError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не удалось прочитать изображение: файл повреждён или формат не поддерживается",
        )
    if img.width * img.height > MAX_IMAGE_PIXELS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Изображение слишком большое по разрешению")
    try:
        img.load()
    except Image.DecompressionBombError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Изображение слишком большое по разрешению")
    except (OSError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Не удалось прочитать изображение")
    return img


def _process_image(buf: bytes, max_size: int) -> tuple[bytes, bool]:
    from PIL import Image

    img = _open_image(buf)
    has_alpha = img.mode in ("RGBA", "LA", "PA") or (img.mode == "P" and "transparency" in img.info)

    if img.mode == "P":
        img = img.convert("RGBA")
    elif img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if has_alpha else "RGB")

    width, height = img.size
    longest = max(width, height)
    if longest > max_size:
        scale = max_size / longest
        img = img.resize((max(1, int(width * scale)), max(1, int(height * scale))), Image.LANCZOS)

    out = io.BytesIO()
    if has_alpha:
        img.save(out, format="PNG", optimize=True)
        return out.getvalue(), True
    img.save(out, format="JPEG", quality=85, optimize=True)
    return out.getvalue(), False


def _public_url(prefix: str, name: str) -> str:
    return f"/api/uploads/{name}"


def save_image(upload: UploadFile, prefix: str, max_size: int = 1400) -> str:
    ctype = (upload.content_type or "").lower()
    if not ctype.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл должен быть изображением")
    buf = _read_with_limit(upload, config.UPLOAD_MAX_BYTES, "Файл")
    processed, is_png = _process_image(buf, max_size)
    ext = "png" if is_png else "jpg"
    name = f"{prefix}_{int(time.time())}_{os.urandom(3).hex()}.{ext}"

    s3 = _get_s3()
    if s3:
        content_type = "image/png" if is_png else "image/jpeg"
        return s3.upload_bytes(f"{config.S3_PREFIX}/{prefix}/{name}", processed, content_type)

    with open(os.path.join(config.UPLOADS_DIR, name), "wb") as fh:
        fh.write(processed)
    return _public_url(prefix, name)


def save_video(upload: UploadFile, prefix: str) -> str:
    ext = os.path.splitext(upload.filename or "")[1].lower().lstrip(".")
    ctype = (upload.content_type or "").lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Видео должно быть MP4, WebM или MOV",
        )
    if ctype and ctype not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неподдерживаемый тип видео")
    buf = _read_with_limit(upload, config.UPLOAD_VIDEO_MAX_BYTES, "Видео")
    name = f"{prefix}_{int(time.time())}_{os.urandom(3).hex()}.{ext}"

    s3 = _get_s3()
    if s3:
        return s3.upload_bytes(f"{config.S3_PREFIX}/{prefix}/{name}", buf, ctype or f"video/{ext}")

    with open(os.path.join(config.UPLOADS_DIR, name), "wb") as fh:
        fh.write(buf)
    return _public_url(prefix, name)


def remove_upload(url: str | None) -> None:
    if not url:
        return
    s3 = _get_s3()
    if s3:
        key = s3.s3_key_from_url(url)
        if key:
            s3.delete_object(key)
            return
    name = url.rsplit("/", 1)[-1]
    if not name or name in (".", ".."):
        return
    path = os.path.join(config.UPLOADS_DIR, name)
    if os.path.isfile(path):
        try:
            os.remove(path)
        except OSError:
            pass
