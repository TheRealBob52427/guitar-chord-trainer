#!/usr/bin/env python3
"""Erzeugt die PWA-Icons (Pick + G) ohne externe Design-Tools."""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

SIZE = 512
SS = 4  # Supersampling
OUT = Path(__file__).resolve().parent.parent / "app" / "icons"
FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def bezier(p0, p1, p2, p3, steps=48):
    points = []
    for i in range(steps + 1):
        t = i / steps
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        points.append((x, y))
    return points


def pick_points(scale=1.0, dx=0.0, dy=0.0):
    raw = []
    raw += bezier((150, 152), (215, 132), (297, 132), (362, 152))  # Oberkante
    raw += bezier((362, 152), (392, 232), (330, 382), (256, 426))  # rechte Flanke
    raw += bezier((256, 426), (182, 382), (120, 232), (150, 152))  # linke Flanke
    return [(256 + (x - 256) * scale + dx, 276 + (y - 276) * scale + dy) for x, y in raw]


def vertical_gradient(size, top, bottom):
    image = Image.new("RGB", (size, size), bottom)
    draw = ImageDraw.Draw(image)
    for y in range(size):
        t = y / max(1, size - 1)
        color = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        draw.line([(0, y), (size, y)], fill=color)
    return image


def radial_glow(size, color, alpha=70):
    small = 128
    layer = Image.new("L", (small, small), 0)
    pixels = layer.load()
    cx = cy = small / 2
    for y in range(small):
        for x in range(small):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / (small / 2)
            pixels[x, y] = max(0, int(alpha * (1 - dist) ** 2))
    layer = layer.resize((size, size), Image.LANCZOS)
    glow = Image.new("RGBA", (size, size), color + (0,))
    glow.putalpha(layer)
    return glow


def draw_icon(path, size=SIZE, maskable=False):
    s = SIZE * SS
    unit = s / 512

    bg = vertical_gradient(s, (27, 27, 52), (13, 13, 26))

    if maskable:
        canvas = bg.convert("RGBA")
    else:
        rounded = Image.new("L", (s, s), 0)
        ImageDraw.Draw(rounded).rounded_rectangle([0, 0, s - 1, s - 1], radius=int(112 * unit), fill=255)
        canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        canvas.paste(bg, (0, 0), rounded)

    canvas.alpha_composite(radial_glow(s, (233, 69, 96), 78))

    scale = 0.80 if maskable else 1.0
    points = [(x * unit, y * unit) for x, y in pick_points(scale=scale)]
    pick_mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(pick_mask).polygon(points, fill=255)

    # Schatten
    shadow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).polygon(
        [(x, y + 10 * unit) for x, y in points], fill=(0, 0, 0, 150)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(16 * unit))
    canvas.alpha_composite(shadow)

    # Verlauf im Pick
    pick_gradient = vertical_gradient(s, (255, 118, 136), (201, 42, 69))
    pick = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    pick.paste(pick_gradient, (0, 0), pick_mask)

    outline = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(outline).line(points + [points[0]], fill=(255, 255, 255, 60), width=int(2.2 * unit), joint="curve")

    canvas.alpha_composite(pick)
    canvas.alpha_composite(outline)

    font = ImageFont.truetype(FONT_PATH, int(176 * unit * scale))
    draw = ImageDraw.Draw(canvas)
    center_y = (276 + 10) * unit if not maskable else 276 * unit
    draw.text((259 * unit, center_y), "G", font=font, fill=(255, 255, 255, 245), anchor="mm")

    if not maskable:
        # Außerhalb der abgerundeten Fläche echte Transparenz herstellen,
        # sonst blutet der rote Glow beim Downsampling als Pink-Saum durch.
        clean = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        canvas = Image.composite(canvas, clean, rounded)

    final = canvas.resize((size, size), Image.LANCZOS)
    if not maskable:
        # Der Glow wird über die ganze Fläche gelegt – Ecken erneut ausstanzen.
        corner_mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(corner_mask).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=round(size * (112 / 512)), fill=255
        )
        final.putalpha(ImageChops.multiply(final.getchannel("A"), corner_mask))
    final.save(path, "PNG", optimize=True)
    print(f"wrote {path} ({path.stat().st_size} bytes)")


def write_favicon():
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b1b34"/>
      <stop offset="1" stop-color="#0d0d1a"/>
    </linearGradient>
    <linearGradient id="pick" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff7688"/>
      <stop offset="1" stop-color="#c92a45"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>
  <path d="M19 19c8-2 18-2 26 0 4 10-1 24-13 34C20 43 15 29 19 19Z" fill="url(#pick)" stroke="#ffffff" stroke-opacity=".18"/>
  <text x="32" y="37" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="21" font-weight="700" fill="#fff">G</text>
</svg>
"""
    path = OUT / "favicon.svg"
    path.write_text(svg, encoding="utf-8")
    print(f"wrote {path}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    draw_icon(OUT / "icon-512.png", 512)
    draw_icon(OUT / "icon-maskable-512.png", 512, maskable=True)
    draw_icon(OUT / "icon-192.png", 192)
    draw_icon(OUT / "icon-180.png", 180)
    write_favicon()


if __name__ == "__main__":
    main()
