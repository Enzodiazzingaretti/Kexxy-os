"""Ornamento horizontal derivado del emblema KEXXY.

No se dibuja nada nuevo: se recorta la banda de brazos laterales del propio
logo, que ya es simétrica.

Igual que el emblema, se compone con margen propio. Los brazos del logo
llegan al borde del lienzo original, así que sin aire el ornamento se ve
cortado a los costados.
"""
from PIL import Image
import os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kexxy-logo-white.png")
OUT = os.path.dirname(os.path.abspath(__file__))

mask = Image.open(os.path.abspath(SRC)).convert("RGBA").getchannel("A")
W, H = mask.size

# Fila con mayor extensión horizontal: el centro de los brazos.
best_row, best_span = 0, 0
for y in range(0, H, 8):
    bbox = mask.crop((0, y, W, y + 1)).getbbox()
    if bbox and (bbox[2] - bbox[0]) > best_span:
        best_span, best_row = bbox[2] - bbox[0], y
print(f"fila más ancha: y={best_row} ({best_span}px de {W})")

band_h = int(H * 0.16)
top = max(0, best_row - band_h // 2)
band = mask.crop((0, top, W, min(H, top + band_h)))
band = band.crop(band.getbbox())

# Composición con margen: 6% a cada lado.
ART_RATIO = 0.88
canvas_w = 700
art_w = int(canvas_w * ART_RATIO)
art_h = int(art_w * band.height / band.width)
canvas_h = int(art_h / ART_RATIO)

art = band.resize((art_w, art_h), Image.LANCZOS)
alpha = Image.new("L", (canvas_w, canvas_h), 0)
alpha.paste(art, ((canvas_w - art_w) // 2, (canvas_h - art_h) // 2))

orn = Image.new("RGBA", alpha.size, (255, 255, 255, 255))
orn.putalpha(alpha)
p = os.path.join(OUT, "ornament-h.png")
orn.save(p, optimize=True)
print(f"ornament-h.png  {orn.size[0]}x{orn.size[1]}  arte={int(ART_RATIO*100)}%  {os.path.getsize(p):,} B")
