@echo off
setlocal
cd /d "%~dp0"

echo FinanceSensor R2 trusted-edge signer
echo.
echo This signer is pinned to the certified Human Test Alpha build.
echo It refuses any input APK whose SHA-256 is not the frozen build receipt.
echo Private signing material stays on this computer.
echo.

if "%~1"=="" goto INTERACTIVE
if "%~2"=="" goto INPUT_ONLY
if "%~3"=="" goto INPUT_AND_SIGNER

goto FULL_ARGS

:INTERACTIVE
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SIGN-FINANCESENSOR-R2.ps1"
goto RESULT

:INPUT_ONLY
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SIGN-FINANCESENSOR-R2.ps1" -InputApk "%~1"
goto RESULT

:INPUT_AND_SIGNER
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SIGN-FINANCESENSOR-R2.ps1" -InputApk "%~1" -ApkSignerJar "%~2"
goto RESULT

:FULL_ARGS
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SIGN-FINANCESENSOR-R2.ps1" -InputApk "%~1" -ApkSignerJar "%~2" -OutputApk "%~3"

:RESULT
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" (
  echo SIGNING NOT COMPLETED. Code: %ERR%
  echo No output APK should be trusted from this attempt.
) else (
  echo SIGNING COMPLETED.
  echo Verify the generated .sha256 and .receipt.txt files before installation.
)
echo.
pause
exit /b %ERR%
