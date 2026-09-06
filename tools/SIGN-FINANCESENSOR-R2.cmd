@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" (
  echo Usage: SIGN-FINANCESENSOR-R2.cmd ^<certified-input-apk^> ^<apksigner-jar^> [output-apk]
  exit /b 2
)
if "%~2"=="" (
  echo Usage: SIGN-FINANCESENSOR-R2.cmd ^<certified-input-apk^> ^<apksigner-jar^> [output-apk]
  exit /b 2
)

set OUTPUT=%~3
if "%OUTPUT%"=="" set OUTPUT=FinanceSensor-R2-STABLE-0.1.0-alpha.1+1001.apk

echo FinanceSensor R2 trusted-edge signer
echo.
echo This signer is pinned to the certified Human Test Alpha build.
echo It refuses any input APK whose SHA-256 is not the frozen build receipt.
echo Private signing material stays on this computer.
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SIGN-FINANCESENSOR-R2.ps1" -InputApk "%~1" -ApkSignerJar "%~2" -OutputApk "%OUTPUT%"
set ERR=%ERRORLEVEL%

echo.
if not "%ERR%"=="0" (
  echo SIGNING NOT COMPLETED. Code: %ERR%
  echo No output APK should be trusted from this attempt.
) else (
  echo SIGNING COMPLETED.
  echo Verify the generated .sha256 and .receipt.txt files before installation.
)
exit /b %ERR%
