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

from src.auth_helpers import require_user

router = APIRouter(prefix="/api/kexxy", tags=["kexxy"])

CACHE = Path(os.environ.get("KEXXY_PANEL_CACHE", "/app/kexxy-panel/cache.json"))


@router.get("/panel")
async def panel_estado(request: Request, _user: str = Depends(require_user)):
    """Estado completo del panel: proyectos, alertas, finanzas y máquina.

    Devuelve 503 y no 404 cuando el cache falta: el recurso existe
    conceptualmente, lo que no está es la corrida del panel que lo genera.
    La interfaz usa esa distinción para explicar qué hacer.
    """
    if not CACHE.exists():
        raise HTTPException(
            503,
            "El panel todavía no generó su cache. Abrí el panel una vez "
            "(Panel.bat en el repo `panel`) y volvé a intentar.",
        )
    try:
        with CACHE.open(encoding="utf-8") as f:
            datos = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        raise HTTPException(503, f"El cache del panel no se pudo leer: {e}") from e

    return datos
