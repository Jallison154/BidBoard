@echo off
setlocal
cd /d "%~dp0.."
title BidBoard

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed yet. Running the installer...
  call "%~dp0Install BidBoard.bat"
  exit /b %errorlevel%
)

if not exist "node_modules\" (
  echo BidBoard is not installed yet. Running the installer...
  call "%~dp0Install BidBoard.bat"
  exit /b %errorlevel%
)

if not exist "dist\index.html" (
  echo Building BidBoard...
  call npm run build
  if errorlevel 1 (
    echo.
    echo Build failed. Run Install BidBoard.bat in the windows folder and check the message above.
    pause
    exit /b 1
  )
)

echo BidBoard is running in the taskbar.
echo Hover the BidBoard icon to see the IP address.
echo Right-click it for Open, Settings, and Exit.
echo This window will close. BidBoard keeps running until you choose Exit.
echo.
start "" powershell.exe -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0scripts\bidboard-tray.ps1"
timeout /t 2 /nobreak >nul
exit /b 0
