@echo off
setlocal enabledelayedexpansion
title KEXXY OS

REM ============================================================
REM  KEXXY OS - lanzador
REM
REM  Deja el sistema entero listo, en el orden que corresponde:
REM    1. Ollama en el host  -> es quien usa la GPU de verdad.
REM    2. Docker Desktop     -> ya paso que se cayera y pareciera
REM                             que el proyecto estaba roto.
REM    3. Los contenedores.
REM    4. Espera a que la app responda y abre el navegador.
REM
REM  Por que Ollama y no el contenedor: la imagen es slim y no trae
REM  el toolkit de CUDA (no hay nvcc), asi que Cookbook compila
REM  llama.cpp CPU-only y la placa queda sin usar. Ollama corre en
REM  Windows con CUDA nativo y Odysseus lo consume por red.
REM
REM  OLLAMA_HOST=0.0.0.0 es imprescindible: si Ollama escucha solo
REM  en 127.0.0.1, el contenedor no lo alcanza.
REM ============================================================

set "PROJ=%~dp0"
if "%PROJ:~-1%"=="\" set "PROJ=%PROJ:~0,-1%"
set "URL=http://localhost:7000"
set "DOCKER_EXE=C:\Program Files\Docker\Docker\Docker Desktop.exe"
set "OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
set "OLLAMA_HOST=0.0.0.0:11434"

REM Cuanto tiempo queda el modelo cargado en la VRAM sin usarse.
REM El default de Ollama son 5 minutos, y medido en esta maquina el costo de
REM volver a subir los 5.8 GB del modelo principal es de 60 a 104 segundos:
REM el primer mensaje despues de una pausa parece que la app se colgo.
REM 30m cubre una sesion de trabajo entera. No se usa -1 (para siempre) a
REM proposito: dejaria 5.8 GB de los 8 tomados aunque estes jugando o usando
REM TouchDesigner.
set "OLLAMA_KEEP_ALIVE=30m"

REM NO activar OLLAMA_FLASH_ATTENTION en esta maquina. Se probo: el modelo
REM paso de 5.8 a 6.5 GB, dejo de entrar en los 8 de la placa y el 29% se
REM fue a CPU. Las respuestas pasaron de 1 segundo a 70.

echo.
echo   K E X X Y   O S
echo   ----------------------------------------------------------
echo.

REM ---------- 1. Ollama (la GPU) ----------
curl -s -o nul --max-time 4 http://127.0.0.1:11434/api/version >nul 2>&1
if not errorlevel 1 (
  echo   [1/4] Ollama ya estaba corriendo.
  goto docker
)

REM Zombies de llama-server. Ollama levanta un llama-server.exe por modelo, y
REM si se mata ollama.exe a la fuerza los hijos NO mueren: quedan reteniendo
REM VRAM. Medido: 4 huerfanos dejaron 7.7 de 8 GB tomados, el modelo se cargo
REM 75% en CPU y las respuestas pasaron de 1 segundo a 70.
REM Como llegamos hasta aca, Ollama no responde: cualquier llama-server vivo
REM es huerfano por definicion.
tasklist /FI "IMAGENAME eq llama-server.exe" 2>nul | find /I "llama-server.exe" >nul
if not errorlevel 1 (
  echo   [1/4] Limpiando servidores de modelo huerfanos...
  taskkill /F /IM llama-server.exe >nul 2>&1
  timeout /t 2 /nobreak >nul
)

if not exist "%OLLAMA_EXE%" (
  echo   [1/4] Ollama no encontrado. Se sigue sin GPU local.
  goto docker
)

echo   [1/4] Arrancando Ollama ^(GPU^)...
start "" /min "%OLLAMA_EXE%" serve
set /a espera=0
:esperaollama
timeout /t 3 /nobreak >nul
curl -s -o nul --max-time 4 http://127.0.0.1:11434/api/version >nul 2>&1
if not errorlevel 1 (
  echo         Ollama listo tras !espera! segundos.
  goto docker
)
set /a espera+=3
if !espera! lss 90 goto esperaollama
echo         Ollama no respondio en 90s. Se sigue igual, pero sin GPU local.

REM ---------- 2. Docker ----------
:docker
docker info >nul 2>&1
if not errorlevel 1 (
  echo   [2/4] Docker ya estaba corriendo.
  goto stack
)

echo   [2/4] Docker no responde. Arrancando Docker Desktop...
if not exist "%DOCKER_EXE%" (
  echo.
  echo   No encontre Docker Desktop en:
  echo     %DOCKER_EXE%
  echo   Abrilo a mano y volve a ejecutar este acceso directo.
  echo.
  pause
  exit /b 1
)
start "" "%DOCKER_EXE%"

set /a espera=0
:esperadocker
timeout /t 5 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 (
  echo         Docker listo tras !espera! segundos.
  goto stack
)
set /a espera+=5
if !espera! lss 240 goto esperadocker
echo.
echo   Docker no levanto en 4 minutos. Revisa Docker Desktop.
echo.
pause
exit /b 1

REM ---------- 3. Contenedores ----------
:stack
cd /d "%PROJ%"
echo   [3/4] Levantando contenedores...
docker compose up -d >nul 2>&1
if errorlevel 1 (
  echo         Fallo el compose. Detalle:
  docker compose up -d
  pause
  exit /b 1
)

REM ---------- 4. Esperar a la app ----------
echo   [4/4] Esperando a que la app responda...
echo         ^(el arranque hace chown sobre data/, puede tardar varios minutos^)
echo.

set /a espera=0
:esperaapp
curl -s -o nul --max-time 4 "%URL%" >nul 2>&1
if not errorlevel 1 goto listo
timeout /t 5 /nobreak >nul
set /a espera+=5
set /a resto=!espera! %% 30
if !resto! equ 0 echo         ... !espera!s
if !espera! lss 900 goto esperaapp

echo.
echo   La app no respondio en 15 minutos.
echo   Para ver si trabaja o esta colgada:
echo     docker exec odysseus-odysseus-1 sh -c "ps -eo pid,etime,args ^| head -5"
echo   Si aparece un "find ... chown", esta trabajando: esperar.
echo.
pause
exit /b 1

:listo
echo.
echo   App lista en !espera! segundos.

REM El chequeo que de verdad importa: que el contenedor ALCANCE a Ollama.
REM Que Ollama responda en el host no alcanza; si quedo atado a 127.0.0.1
REM el contenedor no lo ve y los modelos locales no aparecen en la UI.
docker exec odysseus-odysseus-1 curl -s --max-time 8 http://host.docker.internal:11434/v1/models >nul 2>&1
if errorlevel 1 (
  echo   AVISO: el contenedor NO alcanza a Ollama.
  echo          Los modelos locales no van a aparecer en la interfaz.
  echo          Suele ser que Ollama quedo escuchando solo en 127.0.0.1:
  echo          cerralo desde la bandeja y volve a ejecutar este acceso directo.
) else (
  echo   GPU: el contenedor ve a Ollama. Modelos locales disponibles.
)

echo.
echo   Abriendo %URL%
start "" "%URL%"
timeout /t 2 /nobreak >nul
exit /b 0
