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

echo FinanceSensor Gmail Level C v2 - controlled local probe
echo -------------------------------------------------------
echo Browser consent will open automatically.
echo No token or Gmail content will be printed or saved.
echo No historical mailbox list will run.
echo Maximum changed messages per attempt: 5; maximum FULL fetch: 1.
echo.
node live\owned-oauth-level-c-v2.mjs

echo.
echo FinanceSensor Level C process finished.
pause
endlocal
