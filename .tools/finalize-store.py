from pathlib import Path

from PIL import Image

ROOT = Path("D:/Боты/СобериЗаказ/docs/store")
RAW = ROOT / "raw"


def downscale(src: str, dst: str, size: tuple[int, int]) -> None:
    im = Image.open(RAW / src).convert("RGB")
    im.resize(size, Image.LANCZOS).save(ROOT / dst, optimize=True)


def to_jpg(src: str, dst: str, size: tuple[int, int]) -> None:
    im = Image.open(ROOT / src).convert("RGB")
    im.save(ROOT / dst, quality=92, optimize=True, progressive=True)


downscale("icon-576@2x.png", "icon-576.png", (576, 576))
to_jpg("icon-576.png", "icon-576.jpg", (576, 576))

downscale("snippet-1120x630@2x.png", "snippet-1120x630.png", (1120, 630))
to_jpg("snippet-1120x630.png", "snippet-1120x630.jpg", (1120, 630))

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
