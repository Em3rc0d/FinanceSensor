@echo off
setlocal
cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo FinanceSensor Level C needs Node.js installed on this computer.
  echo No OAuth request was made and no Gmail data was accessed.
  echo.
  pause
  exit /b 1
)

echo FinanceSensor Gmail Level C - controlled local probe
echo ----------------------------------------------------
echo Browser consent will open automatically.
echo No token or Gmail content will be printed or saved.
echo Maximum Gmail scan: 5 recent messages; maximum FULL fetch: 1.
echo.
node live\owned-oauth-level-c.mjs

echo.
echo FinanceSensor Level C process finished.
pause
endlocal
