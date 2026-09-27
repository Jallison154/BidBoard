@echo off
setlocal
cd /d "%~dp0.."
title Install BidBoard

net session >nul 2>&1
if errorlevel 1 (
  echo BidBoard needs permission to install Node.js and allow phones on the network.
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  if errorlevel 1 (
    echo.
    echo Permission was not granted, so the installer stopped.
    pause
    exit /b 1
  )
  exit /b 0
)

echo Checking Node.js...
set "NODEFILE=%TEMP%\bidboard-nodehome.txt"
del "%NODEFILE%" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure-node.ps1" -OutFile "%NODEFILE%"
if errorlevel 1 (
  echo.
  echo Could not install Node.js. Leave this window open and check the message above.
  pause
  exit /b 1
)
set "NODEHOME="
set /p NODEHOME=<"%NODEFILE%"
if not defined NODEHOME (
  echo.
  echo Could not install Node.js. Leave this window open and check the message above.
  pause
  exit /b 1
)
set "PATH=%NODEHOME%;%PATH%"

if not exist "package.json" (
  echo.
  echo BidBoard's program files were not found in this folder:
  echo   %CD%
  echo Copy the whole BidBoard folder, not just the windows folder, and run the installer again.
  pause
  exit /b 1
)

echo.
echo Installing BidBoard dependencies...
call npm install || goto :failed

echo.
echo Building BidBoard...
call npm run build || goto :failed

echo.
echo Adding BidBoard to the Desktop and Start Menu...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-windows-shortcuts.ps1"
if errorlevel 1 (
  echo Could not create the shortcuts. You can still double-click Start BidBoard.bat in the windows folder.
)

echo.
echo BidBoard is installed.
echo Use the BidBoard shortcut on the Desktop or in the Start Menu to run an event.
echo Leave that window open while BidBoard is running.
echo.
pause
exit /b 0

:failed
echo.
echo Install failed. Leave this window open and check the message above.
pause
exit /b 1
