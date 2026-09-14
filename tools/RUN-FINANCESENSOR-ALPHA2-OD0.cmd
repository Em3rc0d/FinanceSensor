@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN-FINANCESENSOR-ALPHA2-OD0.ps1"
set EXITCODE=%ERRORLEVEL%
echo.
if %EXITCODE% EQU 0 (
  echo FinanceSensor Alpha.2 OD0 completed. Return only the generated OD0 JSON receipt.
) else (
  echo FinanceSensor Alpha.2 OD0 did not pass. Return only FinanceSensor-ALPHA2-R2-OD0-FAILURE.txt.
)
pause
exit /b %EXITCODE%
