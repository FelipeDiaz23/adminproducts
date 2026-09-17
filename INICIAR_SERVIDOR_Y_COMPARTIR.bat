@echo off
title PANEL DE CATALOGO - SERVIDOR Y BASE DE DATOS LOCAL
color 0A
cls
echo =======================================================================
echo           INICIANDO SERVIDOR Y BASE DE DATOS LOCAL EN ESTE PC
echo =======================================================================
echo.
echo 1. Arrancando servidor local (Node.js)...
start /b "" node server.js > server.log 2>&1
timeout /t 2 /nobreak > nul

echo 2. Creando enlace publico gratuito para compartir...
echo.
echo =======================================================================
echo   TU SERVIDOR ESTA LISTO. EN UNOS SEGUNDOS APARECERA TU ENLACE PUBLICO:
echo   (Copia el enlace que termina en .trycloudflare.com y mandalo por WhatsApp)
echo =======================================================================
echo.
start "" "http://localhost:8080"
.\cloudflared.exe tunnel --url http://localhost:8080
pause