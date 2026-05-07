@echo off
REM Dashboard Pessoal — Inicializador com console visivel (clique manual)
REM Para iniciar invisivel em background, use start-dashboard.vbs
title Dashboard Pessoal - Launcher
cd /d "%~dp0"

netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [Dashboard] Servidor ja esta rodando.
    goto :open
)

echo [Dashboard] Subindo servidor invisivel...
wscript "%~dp0_start-server.vbs"

echo [Dashboard] Aguardando porta 3000...
:waitloop
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if %errorlevel% neq 0 goto :waitloop

timeout /t 1 /nobreak >nul

:open
echo [Dashboard] Abrindo app...
start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000
exit /b 0
