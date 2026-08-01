@echo off
setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$desktop=[Environment]::GetFolderPath('Desktop');" ^
  "$shortcut=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop 'HILLGRAM.lnk'));" ^
  "$shortcut.TargetPath=(Join-Path '%~dp0' 'START_HILLGRAM.bat');" ^
  "$shortcut.WorkingDirectory='%~dp0';" ^
  "$shortcut.Description='Launch HILLGRAM cinematic social video studio';" ^
  "$shortcut.Save();" ^
  "$publicShortcut=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop 'HILLGRAM PUBLIC HTTPS.lnk'));" ^
  "$publicShortcut.TargetPath=(Join-Path '%~dp0' 'START_HILLGRAM_PUBLIC.bat');" ^
  "$publicShortcut.WorkingDirectory='%~dp0';" ^
  "$publicShortcut.Description='Launch HILLGRAM with a public Safari-compatible HTTPS link';" ^
  "$publicShortcut.Save();"

echo HILLGRAM local and public HTTPS desktop shortcuts created.
pause
