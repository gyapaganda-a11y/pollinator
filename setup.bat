@echo off
REM Pollinate Studio — Windows setup
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Node.js is not installed.
  echo Opening the official download page...
  echo Install Node.js LTS, then re-run this script.
  echo.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)
echo Node.js detected. Launching Pollinate Studio...
node server.mjs
