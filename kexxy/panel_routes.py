"""
panel_routes.py

Sirve el estado del panel de proyectos y finanzas a la interfaz de KEXXY OS.

Por qué existe una ruta y no se sirve el archivo como estático
--------------------------------------------------------------
`/static` es público: responde 200 sin sesión (verificado). El cache del
panel tiene los cobros y los montos, así que servirlo desde ahí sería
publicar las finanzas a cualquiera que alcance el puerto.

Esta ruta pasa por `require_user`, igual que el resto de la app.

Lee el mismo archivo montado en :ro que usa el servidor MCP, así que la
interfaz y el modelo ven exactamente lo mismo — no hay dos fuentes de
verdad que puedan divergir.
"""

import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse

from src.auth_helpers import require_user

router = APIRouter(prefix="/api/kexxy", tags=["kexxy"])

CACHE = Path(os.environ.get("KEXXY_PANEL_CACHE", "/app/kexxy-panel/cache.json"))
THUMBS = CACHE.parent / "thumbs"


def _cargar():
    if not CACHE.exists():
        raise HTTPException(
            503,
            "El panel todavía no generó su cache. Abrí el panel una vez "
            "(Panel.bat en el repo `panel`) y volvé a intentar.",
        )
    try:
        with CACHE.open(encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        raise HTTPException(503, f"El cache del panel no se pudo leer: {e}") from e


@router.get("/panel")
async def panel_estado(request: Request, _user: str = Depends(require_user)):
    """Estado completo del panel: proyectos, alertas, finanzas y máquina.

    Devuelve 503 y no 404 cuando el cache falta: el recurso existe
    conceptualmente, lo que no está es la corrida del panel que lo genera.
    La interfaz usa esa distinción para explicar qué hacer.
    """
    return _cargar()


@router.get("/panel/thumb/{nombre}")
async def panel_miniatura(nombre: str, _user: str = Depends(require_user)):
    """Miniatura de un proyecto.

    El nombre se valida contra una LISTA BLANCA construida del propio cache:
    sólo se sirven archivos que algún proyecto declara como `miniatura`. Con
    eso, un nombre como `../../etc/passwd` no puede llegar al disco, porque
    ningún proyecto lo declara — no depende de sanitizar la cadena bien.
    """
    datos = _cargar()
    permitidas = {
        p.get("miniatura")
        for p in (datos.get("proyectos") or [])
        if p.get("miniatura")
    }
    if nombre not in permitidas:
        raise HTTPException(404, "Miniatura desconocida")

    ruta = THUMBS / nombre
    if not ruta.is_file():
        raise HTTPException(404, "La miniatura no está en disco")
    return FileResponse(ruta)
