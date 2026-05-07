@echo off
title Dashboard Pessoal - Stop
echo [Dashboard] Parando servidor...
taskkill /F /IM node.exe >nul 2>&1
echo [Dashboard] Pronto.
timeout /t 2 /nobreak >nul
exit /b 0
