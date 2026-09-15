@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN-FINANCESENSOR-ALPHA2-OD0.ps1"
set EXITCODE=%ERRORLEVEL%
echo.
if "%EXITCODE%"=="2" (
  echo FinanceSensor Alpha.2 +2012 OD0 is intentionally BLOCKED until trusted-edge signing passes.
  echo No Android device operation was attempted.
) else if not "%EXITCODE%"=="0" (
  echo FinanceSensor Alpha.2 OD0 did not execute. No physical PASS should be inferred.
) else (
  echo Self-test only. OD0 physical execution remains blocked.
)
pause
exit /b %EXITCODE%
