"""Set de assets del logo KEXXY para la UI de KEXXY OS.

Genera todo desde kexxy-logo-white.png usando el canal alfa como máscara.

Reglas que hay detrás de los números:

  - MARGEN. El arte original llega EXACTO al borde del lienzo: las puntas
    rozan el filo (1-3 px de tinta en la fila 0 y en la última). Sin margen
    propio, en cualquier caja CSS el emblema se ve chocando contra el borde
    y parece cortado. Por eso todo se compone con padding.

  - LIENZO CUADRADO en la máscara. El logo es retrato (0.8), pero las cajas
    donde se usa son cuadradas (loader, sigilo de fondo). Con la máscara ya
    cuadrada, `mask-size: contain` da un resultado predecible en todas.

  - DILATACIÓN en tamaños chicos. Las puntas miden 1-2 px una vez reducidas
    a tamaño favicon y desaparecen en el resample. Una pasada de MaxFilter
    conserva la silueta; dos la empastan.
"""
from PIL import Image, ImageFilter
import os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kexxy-logo-white.png")
OUT = os.path.dirname(os.path.abspath(__file__))
ACCENT = (255, 176, 0)

mask = Image.open(os.path.abspath(SRC)).convert("RGBA").getchannel("A")


def compose(canvas_size, art_ratio, dilate=0, square=True):
    """Emblema centrado en un lienzo, ocupando art_ratio de su alto."""
    cw = canvas_size
    ch = canvas_size if square else int(canvas_size * mask.height / mask.width)
    target_h = int(ch * art_ratio)
    target_w = int(target_h * mask.width / mask.height)
    if target_w > cw * art_ratio:
        target_w = int(cw * art_ratio)
        target_h = int(target_w * mask.height / mask.width)

    work = mask.resize((target_w * 4, target_h * 4), Image.LANCZOS)
    for _ in range(dilate):
        work = work.filter(ImageFilter.MaxFilter(3))
    art = work.resize((target_w, target_h), Image.LANCZOS)

    canvas = Image.new("L", (cw, ch), 0)
    canvas.paste(art, ((cw - target_w) // 2, (ch - target_h) // 2))
    return canvas


def tint(alpha, color):
    img = Image.new("RGBA", alpha.size, color + (255,))
    img.putalpha(alpha)
    return img


jobs = [
    # (archivo, lienzo, proporción del arte, dilatación, color)
    # Máscara para CSS: blanca, cuadrada, con margen generoso. La usan el
    # loader, el sigilo de fondo de la bienvenida y el login.
    ("logo-mask.png", 640, 0.78, 0, (255, 255, 255)),
    # Íconos PWA / apple-touch.
    ("icon-512.png", 512, 0.76, 0, ACCENT),
    ("icon-192.png", 192, 0.76, 0, ACCENT),
    # Favicons: poco margen (se ven a 16-32px, conviene que ocupen) y una
    # pasada de dilatación para que las puntas sobrevivan.
    ("favicon-64.png", 64, 0.90, 1, ACCENT),
    ("favicon-32.png", 32, 0.90, 1, ACCENT),
    ("favicon-16.png", 16, 0.92, 1, ACCENT),
]

for name, size, ratio, dil, color in jobs:
    alpha = compose(size, ratio, dil)
    img = tint(alpha, color)
    p = os.path.join(OUT, name)
    img.save(p, optimize=True)
    print(f"{name:18} {img.size[0]:>4}x{img.size[1]:<4} arte={int(ratio*100)}%  {os.path.getsize(p):>7,} B")
