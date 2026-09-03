@echo off
setlocal EnableExtensions

pushd "%~dp0.." >nul 2>nul
if errorlevel 1 (
  echo.
  echo FinanceSensor no pudo abrir su runtime local desde esta ruta.
  echo No se accedio a Gmail ni a estados de cuenta.
  echo.
  pause
  exit /b 1
)

title FinanceSensor - Bank Statement Recovery DEV

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo FinanceSensor necesita Node.js para Windows disponible en PATH.
  echo No se accedio a Gmail ni a estados de cuenta.
  echo.
  popd
  pause
  exit /b 1
)

echo FinanceSensor - preparando parser PDF local exact-pinned...
call npm ci --omit=optional --ignore-scripts --no-audit --no-fund >nul
if errorlevel 1 (
  echo.
  echo FinanceSensor no pudo preparar el parser PDF local verificado por package-lock.
  echo Se detuvo antes de OAuth y antes de descargar estados de cuenta.
  echo.
  popd
  pause
  exit /b 1
)

node live\windows-dpapi-preflight.mjs
if errorlevel 1 (
  echo.
  echo FinanceSensor no pudo validar Windows DPAPI para tu usuario.
  echo Se detuvo antes de seleccionar credenciales y antes de acceder a Gmail.
  echo.
  popd
  pause
  exit /b 1
)

echo.
echo FinanceSensor - Bank Statement Recovery DEV
echo --------------------------------------------
echo Scope exacto: gmail.readonly
echo PDF password: SOLO MEMORIA LOCAL / NO SE GUARDA
echo PDF descifrado: NO DURABLE
echo iOS: NO TOCADO
echo.
echo IMPORTANTE: si Gmail History sigue RUNNING, el importador se negara a
echo escribir el vault hasta que ese proceso termine o se detenga.
echo.
echo Selecciona el JSON OAuth Desktop DEV de FinanceSensor.
echo.

set "FINANCESENSOR_GOOGLE_CREDENTIALS_PATH="
for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -STA -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Filter = 'Google OAuth credentials JSON (*.json)|*.json'; $d.Title = 'Selecciona FinanceSensor DEV Google OAuth Desktop credentials'; $d.Multiselect = $false; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Write($d.FileName) }"`) do set "FINANCESENSOR_GOOGLE_CREDENTIALS_PATH=%%I"

if not defined FINANCESENSOR_GOOGLE_CREDENTIALS_PATH (
  echo.
  echo No seleccionaste credencial. FinanceSensor se detuvo antes de OAuth.
  echo.
  popd
  pause
  exit /b 1
)

echo.
echo El navegador se abrira automaticamente.
echo Solo tendras que conectar Gmail y, para cada grupo de EECC que quieras

echo importar, escribir la Clave del PDF en el formulario LOCAL.
echo Nunca pegues esa clave en ChatGPT ni en GitHub.
echo.

node live\owned-oauth-bank-statements-viewer.mjs
set "FS_EXIT=%ERRORLEVEL%"
set "FINANCESENSOR_GOOGLE_CREDENTIALS_PATH="

echo.
if "%FS_EXIT%"=="0" (
  echo FinanceSensor Bank Statement Recovery finalizo.
) else (
  echo FinanceSensor se detuvo de forma segura.
)
echo.
popd
pause
exit /b %FS_EXIT%
