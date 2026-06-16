"""Export Meta ads: crop AI artwork to exact Meta sizes."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
CURSOR_ASSETS = Path(
    r"C:\Users\Shadow\.cursor\projects\c-Users-Shadow-Documents-login\assets"
)


def crop_center(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    src_w, src_h = img.size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h

    # Story format: scale to cover target frame, then center-crop (less empty sides).
    if target_ratio < src_ratio:
        scale = target_h / src_h
        resized = img.resize(
            (int(src_w * scale), target_h), Image.Resampling.LANCZOS
        )
        left = (resized.width - target_w) // 2
        return resized.crop((left, 0, left + target_w, target_h))

    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        new_h = src_h
    else:
        new_w = src_w
        new_h = int(src_w / target_ratio)

    left = (src_w - new_w) // 2
    top = (src_h - new_h) // 2
    cropped = img.crop((left, top, left + new_w, top + new_h))
    return cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)

    src_916 = CURSOR_ASSETS / "meta-ad-source-9x16.png"
    src_11 = CURSOR_ASSETS / "meta-ad-source-1x1.png"

    if not src_916.exists() or not src_11.exists():
        raise SystemExit("Source images missing. Regenerate meta-ad-source-*.png first.")

    out_916 = ASSETS / "meta-ad-campaign-9x16.png"
    out_11 = ASSETS / "meta-ad-campaign-1x1.png"

    img916 = Image.open(src_916).convert("RGB")
    img11 = Image.open(src_11).convert("RGB")

    final916 = crop_center(img916, 1080, 1920)
    final11 = crop_center(img11, 1080, 1080)

    final916.save(out_916, format="PNG", optimize=True)
    final11.save(out_11, format="PNG", optimize=True)

    print(f"{out_916}: {final916.size[0]}x{final916.size[1]}")
    print(f"{out_11}: {final11.size[0]}x{final11.size[1]}")


if __name__ == "__main__":
    main()
