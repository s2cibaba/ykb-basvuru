"""Smart composite Meta ads to exact dimensions without cutting off text."""

from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
CURSOR_ASSETS = Path(
    r"C:\Users\Shadow\.cursor\projects\c-Users-Shadow-Documents-login\assets"
)

def process_9x16(src_path: Path, out_path: Path):
    img = Image.open(src_path).convert("RGB") # Expected 1536x1024
    
    # Crop the center 1024x1024 to make it square (removes empty sides)
    left = (img.width - img.height) // 2
    img_sq = img.crop((left, 0, left + img.height, img.height))
    
    # Resize to 1080x1080
    img_1080 = img_sq.resize((1080, 1080), Image.Resampling.LANCZOS)
    
    # Create 1080x1920 canvas
    canvas = Image.new("RGB", (1080, 1920))
    
    # Paste the 1080x1080 image in the center
    paste_y = (1920 - 1080) // 2  # 420
    canvas.paste(img_1080, (0, paste_y))
    
    # Fill top 420px by stretching the top row of pixels
    top_edge = img_1080.crop((0, 0, 1080, 1))
    top_ext = top_edge.resize((1080, paste_y), Image.Resampling.LANCZOS)
    canvas.paste(top_ext, (0, 0))
    
    # Fill bottom 420px by stretching the bottom row of pixels
    bottom_edge = img_1080.crop((0, 1079, 1080, 1080))
    bottom_ext = bottom_edge.resize((1080, paste_y), Image.Resampling.LANCZOS)
    canvas.paste(bottom_ext, (0, paste_y + 1080))
    
    canvas.save(out_path, format="PNG", optimize=True)
    return canvas.size

def process_1x1(src_path: Path, out_path: Path):
    img = Image.open(src_path).convert("RGB")
    
    # Crop center 1024x1024
    left = (img.width - img.height) // 2
    img_sq = img.crop((left, 0, left + img.height, img.height))
    
    # Resize to 1080x1080
    img_1080 = img_sq.resize((1080, 1080), Image.Resampling.LANCZOS)
    
    img_1080.save(out_path, format="PNG", optimize=True)
    return img_1080.size

def main():
    ASSETS.mkdir(parents=True, exist_ok=True)

    src_916 = CURSOR_ASSETS / "meta-ad-source-9x16.png"
    src_11 = CURSOR_ASSETS / "meta-ad-source-1x1-with-logo.png"

    if not src_916.exists() or not src_11.exists():
        raise SystemExit("Source images missing.")

    out_916 = ASSETS / "meta-ad-campaign-9x16.png"
    out_11 = ASSETS / "meta-ad-campaign-1x1.png"

    size916 = process_9x16(src_916, out_916)
    size11 = process_1x1(src_11, out_11)

    print(f"{out_916}: {size916[0]}x{size916[1]}")
    print(f"{out_11}: {size11[0]}x{size11[1]}")

if __name__ == "__main__":
    main()
