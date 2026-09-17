@echo off
setlocal
cd /d "%~dp0"
echo FinanceSensor Alpha.2 +2013 - OD0 trusted owned-device gate - harness revision 3
echo Exact stable-signed APK only. Data-preserving install only.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN-FINANCESENSOR-ALPHA2-OD0.ps1"
set EXITCODE=%ERRORLEVEL%
echo.
if "%EXITCODE%"=="0" (
  echo OD0 PASS. Do not delete app data or reinstall another APK.
  echo Return the generated OD0 receipt to continue the consolidated UAT.
) else (
  echo OD0 did not pass. No physical PASS should be inferred.
  echo The harness is fail-closed and does not use uninstall or pm clear.
)
pause
exit /b %EXITCODE%
