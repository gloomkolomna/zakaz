from pathlib import Path
import os

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "docs" / "store"
RAW = ROOT / "raw"


def _replace_save(im: Image.Image, path: Path, **kwargs) -> None:
    tmp = path.with_name(f"{path.stem}.tmp{path.suffix}")
    im.save(tmp, **kwargs)
    os.replace(tmp, path)


def downscale(src: str, dst: str, size: tuple[int, int]) -> None:
    im = Image.open(RAW / src).convert("RGB")
    _replace_save(im.resize(size, Image.LANCZOS), ROOT / dst, optimize=True)


def to_jpg(src: str, dst: str) -> None:
    im = Image.open(ROOT / src).convert("RGB")
    _replace_save(im, ROOT / dst, quality=92, optimize=True, progressive=True)


downscale("icon-576@2x.png", "icon-576.png", (576, 576))
to_jpg("icon-576.png", "icon-576.jpg")

downscale("snippet-1120x630@2x.png", "snippet-1120x630.png", (1120, 630))
to_jpg("snippet-1120x630.png", "snippet-1120x630.jpg")

shots = [
    ("screen-1-catalog@2x.png", "screen-1-catalog-600x1200.png"),
    ("screen-2-product@2x.png", "screen-2-product-600x1200.png"),
    ("screen-3-step@2x.png", "screen-3-step-600x1200.png"),
    ("screen-4-review@2x.png", "screen-4-review-600x1200.png"),
]
for src, dst in shots:
    downscale(src, dst, (600, 1200))

for f in sorted(ROOT.glob("*.png")) + sorted(ROOT.glob("*.jpg")):
    im = Image.open(f)
    print(f"{f.name}: {im.width}x{im.height} {f.stat().st_size // 1024} KB")
