@echo off
setlocal
cd /d "%~dp0"
title HILLGRAM

if not exist ".venv\Scripts\python.exe" (
  echo HILLGRAM could not find the local Python environment.
  echo Run: py -m venv .venv
  pause
  exit /b 1
)

start "" powershell -NoProfile -WindowStyle Hidden -Command ^
  "$url='http://127.0.0.1:8501/';" ^
  "for($attempt=0;$attempt -lt 30;$attempt++){" ^
  "try{Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 ^| Out-Null; Start-Process $url; exit}catch{Start-Sleep -Seconds 1}}"

echo HILLGRAM is starting for this computer and phones on the same Wi-Fi.
echo Computer: http://127.0.0.1:8501/
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
  for /f "tokens=*" %%B in ("%%A") do echo Phone: http://%%B:8501/
)

".venv\Scripts\python.exe" -m streamlit run app.py --server.port 8501 --server.address 0.0.0.0 --server.headless true --browser.gatherUsageStats false
