@echo off
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  echo Usage: SIGN-FINANCESENSOR-R2.cmd ^<input-apk^> ^<apksigner-jar^> [output-apk]
  exit /b 2
)
if "%~2"=="" (
  echo Usage: SIGN-FINANCESENSOR-R2.cmd ^<input-apk^> ^<apksigner-jar^> [output-apk]
  exit /b 2
)
set OUTPUT=%~3
if "%OUTPUT%"=="" set OUTPUT=FinanceSensor-R2-STABLE.apk

echo FinanceSensor R2 trusted-edge signer
echo La clave privada no sale de este equipo.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0SIGN-FINANCESENSOR-R2.ps1" -InputApk "%~1" -ApkSignerJar "%~2" -OutputApk "%OUTPUT%"
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" (
  echo FIRMA NO COMPLETADA. Codigo: %ERR%
) else (
  echo FIRMA COMPLETADA.
)
exit /b %ERR%
