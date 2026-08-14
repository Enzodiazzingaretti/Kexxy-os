"""Genera el .ico de escritorio a partir del emblema KEXXY.

Un .ico lleva varias resoluciones adentro y Windows elige según el contexto
(escritorio, barra de tareas, alt-tab). Las chicas se dilatan un poco porque
las puntas del emblema se pierden en el resample, igual que en el favicon.
"""
from PIL import Image, ImageFilter
import os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kexxy-logo-white.png")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kexxy.ico")
ACCENT = (255, 176, 0)

mask = Image.open(os.path.abspath(SRC)).convert("RGBA").getchannel("A")


def render(size, dilate, art_ratio):
    h = int(size * art_ratio)
    w = int(h * mask.width / mask.height)
    if w > size * art_ratio:
        w = int(size * art_ratio)
        h = int(w * mask.height / mask.width)
    work = mask.resize((w * 4, h * 4), Image.LANCZOS)
    for _ in range(dilate):
        work = work.filter(ImageFilter.MaxFilter(3))
    art = work.resize((w, h), Image.LANCZOS)
    layer = Image.new("RGBA", (w, h), ACCENT + (255,))
    layer.putalpha(art)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(layer, ((size - w) // 2, (size - h) // 2), layer)
    return canvas


# Cada resolución se renderiza aparte para poder dilatar sólo las chicas.
frames = [
    render(256, 0, 0.94),
    render(128, 0, 0.94),
    render(64, 1, 0.94),
    render(48, 1, 0.96),
    render(32, 1, 0.96),
    render(16, 1, 0.98),
]

frames[0].save(OUT, format="ICO",
               sizes=[(f.width, f.height) for f in frames],
               append_images=frames[1:])
print(f"kexxy.ico -> {os.path.getsize(OUT):,} B  ({len(frames)} resoluciones: "
      + ", ".join(str(f.width) for f in frames) + ")")
