@echo off
setlocal
cd /d "%~dp0"
title HILLGRAM Public HTTPS

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_HILLGRAM_PUBLIC.ps1"

echo.
echo HILLGRAM public access has stopped.
pause
