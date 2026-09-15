@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN-FINANCESENSOR-ALPHA2-OD0.ps1"
set EXITCODE=%ERRORLEVEL%
echo.
if not "%EXITCODE%"=="0" (
  echo FinanceSensor Alpha.2 +2009 did not complete OD0. No physical PASS should be inferred.
  echo Do not uninstall the app automatically; preserve local data and return only the sanitized OD0 receipt if one was generated.
) else (
  echo FinanceSensor Alpha.2 +2009 installed and launched with the exact stable-signed APK.
  echo Continue in the app: connect Gmail, unlock the BCP SAVINGS statement when requested, refresh, and verify that the financial view appears.
  echo Return the sanitized OD0 receipt plus the final visible result; do not send passwords, tokens, PDFs, or account numbers.
)
pause
exit /b %EXITCODE%
