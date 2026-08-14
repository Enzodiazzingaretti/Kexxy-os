"""
panel_mcp.py

Servidor MCP que le da a la IA local acceso de LECTURA al panel de proyectos
y finanzas (repo `panel`).

Por qué lee un archivo y no la API del panel
--------------------------------------------
El panel expone `/api/accion` y `/api/git`, que **ejecutan comandos** (clone,
pull, scp). Darle esos endpoints a un modelo es darle un ejecutor, y abrir el
panel a la red para que el contenedor lo alcance expondría esas acciones sin
autenticación.

Leyendo `cache.json` el acceso es de sólo lectura **por construcción**: no hay
endpoint que llamar, no hay nada que disparar, y el panel sigue escuchando
sólo en 127.0.0.1 como estaba.

El costo es que los datos son tan frescos como la última corrida del panel.
Por eso todas las respuestas informan la antigüedad del cache: el modelo tiene
que poder decir "esto es de hace 6 horas" en vez de afirmarlo como actual.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

server = Server("kexxy_panel")

CACHE = Path(os.environ.get("KEXXY_PANEL_CACHE", "/app/kexxy-panel/cache.json"))


class PanelNoDisponible(Exception):
    """El cache no existe o no se puede leer."""


def _leer():
    if not CACHE.exists():
        raise PanelNoDisponible(
            f"No encuentro el cache del panel en {CACHE}. "
            "Suele significar que el volumen no está montado o que el panel "
            "nunca corrió en esta máquina."
        )
    try:
        with CACHE.open(encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        raise PanelNoDisponible(f"El cache del panel no se pudo leer: {e}") from e


def _antiguedad(datos):
    """Texto legible de cuán viejo es el cache. El modelo lo necesita para no
    presentar datos de ayer como si fueran de ahora."""
    generado = datos.get("generado")
    if not generado:
        return "antigüedad desconocida"
    try:
        t = datetime.fromisoformat(generado.replace("Z", "+00:00"))
    except ValueError:
        return f"generado {generado}"
    delta = datetime.now(timezone.utc) - t
    horas = delta.total_seconds() / 3600
    if horas < 1:
        cuando = f"hace {int(delta.total_seconds() / 60)} minutos"
    elif horas < 48:
        cuando = f"hace {int(horas)} horas"
    else:
        cuando = f"hace {int(horas / 24)} días"
    return f"datos generados {cuando} ({t.astimezone().strftime('%Y-%m-%d %H:%M')})"


def _encabezado(datos):
    maquina = datos.get("maquina") or {}
    etiqueta = maquina.get("etiqueta") or maquina.get("hostname") or "máquina desconocida"
    return f"[{etiqueta} · {_antiguedad(datos)}]"


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="panel_resumen",
            description=(
                "Resumen del estado general de los proyectos y las finanzas de Enzo, "
                "desde su panel local. Devuelve cuántos proyectos hay, cuántas alertas "
                "por severidad, y los totales de cobros pendientes y vencidos. "
                "Usar como primera consulta cuando se pregunta '¿cómo viene todo?' o "
                "'¿qué tengo pendiente?'."
            ),
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="panel_alertas",
            description=(
                "Lista las alertas del panel: fichas de la bóveda desactualizadas "
                "respecto del código, commits sin traer o sin subir, carpetas que no "
                "son repos, conflictos de Drive. Se puede filtrar por severidad."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "severidad": {
                        "type": "string",
                        "enum": ["alta", "media", "baja"],
                        "description": "Filtrar por severidad. Omitir para ver todas.",
                    }
                },
            },
        ),
        Tool(
            name="panel_finanzas",
            description=(
                "Cobros y pagos registrados: suscripciones y servicios, con montos, "
                "vencimientos y totales. Distingue vencidos, pendientes y próximos. "
                "Usar para preguntas de plata: qué se debe, cuánto, y qué está vencido."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "estado": {
                        "type": "string",
                        "enum": ["vencidos", "pendientes", "proximos", "todos"],
                        "description": "Qué subconjunto listar. Por defecto: todos.",
                    }
                },
            },
        ),
        Tool(
            name="panel_proyectos",
            description=(
                "Estado de git de cada proyecto: rama, archivos sin commitear, commits "
                "adelante o atrás del remoto, y el último commit. Se puede pedir uno solo."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "nombre": {
                        "type": "string",
                        "description": "Nombre del proyecto. Omitir para ver todos.",
                    }
                },
            },
        ),
    ]


def _fmt_resumen(d):
    alertas = d.get("alertas") or []
    porsev = {}
    for a in alertas:
        porsev[a.get("severidad", "?")] = porsev.get(a.get("severidad", "?"), 0) + 1
    fin = d.get("finanzas") or {}
    proyectos = d.get("proyectos") or []

    sucios = sum(1 for p in proyectos if (p.get("git") or {}).get("sucios"))
    atras = sum(1 for p in proyectos if (p.get("git") or {}).get("atras"))

    lineas = [
        _encabezado(d),
        "",
        f"Proyectos: {len(proyectos)}"
        + (f" · {sucios} con cambios sin commitear" if sucios else "")
        + (f" · {atras} atrás del remoto" if atras else ""),
        "Alertas: "
        + (", ".join(f"{n} {sev}" for sev, n in sorted(porsev.items())) if porsev else "ninguna"),
    ]

    if fin:
        lineas.append(
            f"Cobros: vencidos {fin.get('totalVencido', 0)} "
            f"· pendientes {fin.get('totalPendiente', 0)} "
            f"· próximos {fin.get('totalProximos', 0)}"
        )
        if fin.get("vencidos"):
            lineas.append(f"  ATENCIÓN: {len(fin['vencidos'])} vencidos")
    return "\n".join(lineas)


def _fmt_alertas(d, severidad=None):
    alertas = d.get("alertas") or []
    if severidad:
        alertas = [a for a in alertas if a.get("severidad") == severidad]
    if not alertas:
        return f"{_encabezado(d)}\n\nSin alertas" + (f" de severidad {severidad}" if severidad else "")
    lineas = [_encabezado(d), ""]
    for a in alertas:
        lineas.append(f"[{a.get('severidad', '?')}] {a.get('texto', '')}")
    return "\n".join(lineas)


def _fmt_finanzas(d, estado="todos"):
    fin = d.get("finanzas") or {}
    if not fin:
        return f"{_encabezado(d)}\n\nEl panel no tiene datos de finanzas."

    lineas = [
        _encabezado(d),
        "",
        f"Total mensual: {fin.get('totalMensual', 0)}",
        f"Vencido: {fin.get('totalVencido', 0)} · Pendiente: {fin.get('totalPendiente', 0)}"
        f" · Próximo: {fin.get('totalProximos', 0)}",
        "",
    ]

    grupos = (
        [("vencidos", "VENCIDOS"), ("pendientes", "PENDIENTES"), ("proximos", "PRÓXIMOS")]
        if estado in (None, "todos")
        else [(estado, estado.upper())]
    )
    for clave, titulo in grupos:
        items = fin.get(clave) or []
        if not items:
            continue
        lineas.append(f"— {titulo} ({len(items)})")
        for it in items:
            concepto = it.get("concepto", "?") if isinstance(it, dict) else str(it)
            detalle = it.get("filaTexto", "") if isinstance(it, dict) else ""
            lineas.append(f"  · {concepto}" + (f" — {detalle[:90]}" if detalle else ""))
        lineas.append("")

    if fin.get("aRevisar"):
        lineas.append(f"A revisar: {len(fin['aRevisar'])} ítems sin monto o ambiguos.")
    return "\n".join(lineas).rstrip()


def _fmt_proyectos(d, nombre=None):
    proyectos = d.get("proyectos") or []
    if nombre:
        proyectos = [p for p in proyectos if p.get("nombre", "").lower() == nombre.lower()]
        if not proyectos:
            disponibles = ", ".join(p.get("nombre", "?") for p in (d.get("proyectos") or []))
            return f"No hay un proyecto llamado '{nombre}'. Están: {disponibles}"

    lineas = [_encabezado(d), ""]
    for p in proyectos:
        g = p.get("git") or {}
        if not g.get("esRepo"):
            lineas.append(f"{p.get('nombre', '?')}: no es repo de git")
            continue
        partes = [f"rama {g.get('rama', '?')}"]
        if g.get("sucios"):
            partes.append(f"{g['sucios']} sin commitear")
        if g.get("adelante"):
            partes.append(f"{g['adelante']} sin subir")
        if g.get("atras"):
            partes.append(f"{g['atras']} sin traer")
        ultimo = g.get("ultimo") or {}
        cola = f" · último: {ultimo.get('mensaje', '')[:60]} ({ultimo.get('fecha', '')})" if ultimo else ""
        lineas.append(f"{p.get('nombre', '?')}: " + ", ".join(partes) + cola)
    return "\n".join(lineas)


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:
        datos = _leer()
    except PanelNoDisponible as e:
        return [TextContent(type="text", text=f"Error: {e}")]

    args = arguments or {}
    if name == "panel_resumen":
        texto = _fmt_resumen(datos)
    elif name == "panel_alertas":
        texto = _fmt_alertas(datos, args.get("severidad"))
    elif name == "panel_finanzas":
        texto = _fmt_finanzas(datos, args.get("estado", "todos"))
    elif name == "panel_proyectos":
        texto = _fmt_proyectos(datos, args.get("nombre"))
    else:
        texto = f"Error: herramienta desconocida '{name}'"
    return [TextContent(type="text", text=texto)]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
