@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0SIGN-FINANCESENSOR-ALPHA2-2018.ps1"
set EXITCODE=%ERRORLEVEL%
echo.
if not "%EXITCODE%"=="0" (
  echo SIGNING NOT COMPLETED. Code: %EXITCODE%
  echo No output APK should be trusted from this attempt.
) else (
  echo Alpha.2 +2018 trusted-edge signing completed. Verify the generated receipt before install.
)
pause
exit /b %EXITCODE%
