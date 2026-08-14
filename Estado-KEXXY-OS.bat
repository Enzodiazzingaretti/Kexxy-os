@echo off
setlocal
title Estado - KEXXY OS
set "OLLAMA_HOST=127.0.0.1:11434"
set "OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"

REM ============================================================
REM  Estado-KEXXY-OS.bat - chequeo de salud
REM
REM  Responde, en orden, las preguntas que hay que hacerse cuando
REM  "no anda":
REM    - esta vivo Docker?
REM    - estan los contenedores arriba?
REM    - responde la app?
REM    - esta Ollama y lo ALCANZA el contenedor?  <- el que mas falla
REM    - hay algun modelo cargado, y en GPU o en CPU?
REM    - si la app no responde: chownea o esta colgada?
REM ============================================================

set "PROJ=%~dp0"
if "%PROJ:~-1%"=="\" set "PROJ=%PROJ:~0,-1%"
cd /d "%PROJ%"

echo.
echo   ESTADO DE KEXXY OS
echo   ==========================================================
echo.

REM ---------- Docker ----------
docker info >nul 2>&1
if errorlevel 1 (
  echo   DOCKER      : CAIDO
  echo.
  echo   Es la causa mas comun de que "se rompa" el proyecto sin
  echo   que se haya roto nada. Ejecutar KEXXY-OS.bat, lo arranca.
  echo.
  pause
  exit /b 1
)
echo   DOCKER      : OK
echo.

REM ---------- Contenedores ----------
echo   CONTENEDORES
docker compose ps --format "     {{.Name}}  {{.Status}}" 2>nul
echo.

REM ---------- App ----------
for /f %%c in ('curl -s -o nul -w "%%{http_code}" --max-time 6 http://localhost:7000/ 2^>nul') do set CODE=%%c
if "%CODE%"=="000" (
  echo   APP         : NO RESPONDE
  echo.
  echo   Procesos dentro del contenedor:
  docker exec odysseus-odysseus-1 sh -c "ps -eo pid,etime,args | head -5" 2>nul
  echo.
  echo   Si arriba aparece un "find ... chown", esta trabajando:
  echo   el arranque recorre data/ entero. Esperar, no reiniciar.
) else (
  echo   APP         : OK  ^(HTTP %CODE%^)  http://localhost:7000
)
echo.

REM ---------- Ollama (la GPU) ----------
curl -s -o nul --max-time 5 http://127.0.0.1:11434/api/version >nul 2>&1
if errorlevel 1 (
  echo   OLLAMA      : NO CORRE  -^> sin modelos locales, sin GPU
  echo                 Ejecutar KEXXY-OS.bat, que lo levanta.
) else (
  echo   OLLAMA      : OK en el host
  REM Que responda en el host NO alcanza: si quedo atado a 127.0.0.1
  REM el contenedor no lo ve y los modelos no aparecen en la interfaz.
  docker exec odysseus-odysseus-1 curl -s --max-time 8 http://host.docker.internal:11434/v1/models >nul 2>&1
  if errorlevel 1 (
    echo   PUENTE      : el contenedor NO alcanza a Ollama
    echo                 Ollama quedo escuchando solo en 127.0.0.1.
    echo                 Cerralo desde la bandeja y usa KEXXY-OS.bat.
  ) else (
    echo   PUENTE      : el contenedor ve a Ollama  ^(modelos disponibles^)
  )
)
echo.

REM ---------- Modelo cargado ----------
if exist "%OLLAMA_EXE%" (
  echo   MODELO CARGADO
  "%OLLAMA_EXE%" ps 2>nul
  echo   ^(la columna PROCESSOR dice si esta en GPU o en CPU^)
)
echo.

REM ---------- GPU ----------
nvidia-smi --query-gpu=memory.used,memory.total,utilization.gpu --format=csv,noheader 2>nul
if errorlevel 1 (
  echo   GPU         : nvidia-smi no disponible en el host
) else (
  echo   ^(arriba: VRAM usada, VRAM total, %% de uso^)
)
echo.

REM ---------- Reinicios ----------
for /f %%r in ('docker inspect odysseus-odysseus-1 --format "{{.RestartCount}}" 2^>nul') do set RC=%%r
if defined RC echo   REINICIOS   : %RC%   ^(si crece solo, algo lo esta matando^)
echo.
pause
