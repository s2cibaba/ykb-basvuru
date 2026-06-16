"""Generate Meta ad creatives at exact pixel dimensions."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets"

BLUE_DARK = (0, 73, 144)
BLUE_MID = (19, 102, 178)
BLUE_LIGHT = (10, 163, 241)
GOLD = (245, 166, 35)
WHITE = (255, 255, 255)
SILVER = (167, 169, 172)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        color = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        draw.line([(0, y), (w, y)], fill=color)
    return img


def draw_glow_circle(draw: ImageDraw.ImageDraw, center: tuple[int, int], radius: int, fill: tuple[int, int, int, int]):
    x, y = center
    bbox = [x - radius, y - radius, x + radius, y + radius]
    draw.ellipse(bbox, fill=fill)


def draw_stylized_logo(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    scale: float = 1.0,
    wordmark: bool = True,
):
    """Simplified Y/K-inspired twin loop mark (not exact trademark)."""
    s = scale
    cx, cy = x + int(28 * s), y + int(22 * s)
    r = int(18 * s)
    stroke = max(2, int(3 * s))

    draw.arc(
        [cx - r, cy - r, cx + r, cy + r],
        start=200,
        end=340,
        fill=SILVER,
        width=stroke,
    )
    draw.arc(
        [cx - int(8 * s), cy - r, cx + int(28 * s), cy + r],
        start=20,
        end=160,
        fill=SILVER,
        width=stroke,
    )
    draw.ellipse(
        [
            cx + int(10 * s) - stroke,
            cy - stroke,
            cx + int(10 * s) + stroke,
            cy + stroke,
        ],
        fill=WHITE,
    )

    if wordmark:
        font = load_font(int(22 * s), bold=True)
        draw.text((x + int(58 * s), y + int(8 * s)), "YAPI KREDİ", fill=WHITE, font=font)


def draw_cta(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], label: str):
    draw.rounded_rectangle(box, radius=8, fill=WHITE)
    font = load_font(28, bold=True)
    tw = draw.textlength(label, font=font)
    x0, y0, x1, y1 = box
    draw.text(((x0 + x1 - tw) / 2, y0 + (y1 - y0 - 28) / 2 - 2), label, fill=BLUE_DARK, font=font)


def wrap_centered(draw: ImageDraw.ImageDraw, text: str, font, y: int, width: int, fill=WHITE, line_gap: int = 8) -> int:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= width - 80 or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    for line in lines:
        tw = draw.textlength(line, font=font)
        draw.text(((width - tw) / 2, y), line, fill=fill, font=font)
        bbox = draw.textbbox((0, 0), line, font=font)
        y += bbox[3] - bbox[1] + line_gap
    return y


def create_9x16() -> Image.Image:
    w, h = 1080, 1920
    img = vertical_gradient((w, h), BLUE_DARK, BLUE_MID)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    draw_glow_circle(odraw, (900, 420), 260, (255, 255, 255, 18))
    draw_glow_circle(odraw, (180, 1500), 220, (10, 163, 241, 35))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    draw_stylized_logo(draw, 72, 72, scale=1.35)

    badge_font = load_font(34, bold=True)
    badge_text = "%0 FAİZ"
    badge_w = draw.textlength(badge_text, font=badge_font) + 56
    badge_box = [72, 250, 72 + int(badge_w), 330]
    draw.rounded_rectangle(badge_box, radius=12, fill=GOLD)
    draw.text((badge_box[0] + 28, badge_box[1] + 18), badge_text, fill=WHITE, font=badge_font)

    title_font = load_font(72, bold=True)
    title = "Bireysel İhtiyaç Kredisi"
    tw = draw.textlength(title, font=title_font)
    draw.text(((w - tw) / 2, 420), title, fill=WHITE, font=title_font)

    sub_font = load_font(38)
    y = wrap_centered(
        draw,
        "36 aya kadar vade · Şubeye gitmeden başvur",
        sub_font,
        560,
        w,
    )

    accent_font = load_font(32)
    wrap_centered(
        draw,
        "Dijital başvuru · Anında kullanım",
        accent_font,
        y + 20,
        w,
        fill=(220, 235, 250),
    )

    draw_cta(draw, (120, h - 220, w - 120, h - 120), "Hemen Başvur")
    return img


def create_1x1() -> Image.Image:
    w, h = 1080, 1080
    img = vertical_gradient((w, h), BLUE_DARK, BLUE_LIGHT)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    draw_glow_circle(odraw, (540, 420), 300, (255, 255, 255, 16))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)

    logo_w = draw.textlength("YAPI KREDİ", font=load_font(24, bold=True)) + 90
    draw_stylized_logo(draw, int((w - logo_w) / 2), 56, scale=1.0)

    badge_font = load_font(42, bold=True)
    badge_text = "%0 FAİZ"
    badge_w = draw.textlength(badge_text, font=badge_font) + 64
    bx0 = (w - badge_w) / 2
    draw.rounded_rectangle([bx0, 150, bx0 + badge_w, 240], radius=14, fill=GOLD)
    draw.text((bx0 + 32, 172), badge_text, fill=WHITE, font=badge_font)

    title_font = load_font(54, bold=True)
    title = "Bireysel İhtiyaç Kredisi"
    tw = draw.textlength(title, font=title_font)
    draw.text(((w - tw) / 2, 290), title, fill=WHITE, font=title_font)

    bullet_font = load_font(34)
    bullets = ["36 aya kadar vade", "Anında kullanım", "Dijital başvuru"]
    y = 420
    for item in bullets:
        draw.ellipse([300, y + 10, 318, y + 28], fill=GOLD)
        draw.text((340, y), item, fill=WHITE, font=bullet_font)
        y += 58

    draw_cta(draw, (180, 860, w - 180, 960), "Hemen Başvur")
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    nine = create_9x16()
    square = create_1x1()
    p9 = OUT / "meta-ad-campaign-9x16.png"
    p1 = OUT / "meta-ad-campaign-1x1.png"
    nine.save(p9, format="PNG", optimize=True)
    square.save(p1, format="PNG", optimize=True)
    print(f"{p9}: {nine.size[0]}x{nine.size[1]}")
    print(f"{p1}: {square.size[0]}x{square.size[1]}")


if __name__ == "__main__":
    main()
