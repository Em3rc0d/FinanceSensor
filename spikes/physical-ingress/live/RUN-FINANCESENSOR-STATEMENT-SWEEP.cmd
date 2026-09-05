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

title FinanceSensor - Statement Sweep DEV

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

node live\recover-stale-historical-writer.mjs
if errorlevel 1 (
  echo.
  echo FinanceSensor no pudo resolver de forma segura el estado del escritor historico.
  echo Cierra Gmail Transaction History si sigue abierto y vuelve a intentar.
  echo.
  popd
  pause
  exit /b 1
)

echo.
echo FinanceSensor - Statement Sweep DEV
echo -----------------------------------
echo Scope exacto: gmail.readonly
echo Barrido: SOLO LECTURA / NO ESCRIBE NUEVAS EVIDENCIAS
echo Passwords PDF: SOLO MEMORIA LOCAL / NO SE GUARDAN
echo PDF descifrado, texto y geometria: NO DURABLE
echo BCP ahorro: SWEEP ENABLED
echo BCP credito: SWEEP ENABLED
echo Ripley credito: SWEEP ENABLED
echo Interbank ahorro: archivo local opcional en esta misma ejecucion
echo iOS: NO TOCADO
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
echo Opcional: selecciona un EECC Interbank Cuenta Simple para incluirlo en el mismo barrido.
echo Si cancelas, el barrido continuara solo con los EECC detectados en Gmail.
echo.

set "FINANCESENSOR_INTERBANK_STATEMENT_PATH="
for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -STA -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Filter = 'Estado de cuenta PDF (*.pdf)|*.pdf'; $d.Title = 'Opcional - selecciona EECC Interbank Cuenta Simple'; $d.Multiselect = $false; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Write($d.FileName) }"`) do set "FINANCESENSOR_INTERBANK_STATEMENT_PATH=%%I"

if defined FINANCESENSOR_INTERBANK_STATEMENT_PATH (
  echo Interbank local: SELECTED
) else (
  echo Interbank local: NOT SELECTED
)

echo.
echo El navegador se abrira automaticamente.
echo Escribe las claves solo en el formulario LOCAL y pulsa una sola vez:
echo Auditar todos los EECC.
echo Nunca pegues una clave de PDF en ChatGPT ni en GitHub.
rem FINANCESENSOR_STATEMENT_PASSWORD_CHAT_OR_REPO=FORBIDDEN
echo.

set "FINANCESENSOR_LOCAL_AUDIT_DIAGNOSTICS=1"
node ./live/owned-oauth-bank-statements-sweep.mjs
set "FS_EXIT=%ERRORLEVEL%"
set "FINANCESENSOR_LOCAL_AUDIT_DIAGNOSTICS="
set "FINANCESENSOR_GOOGLE_CREDENTIALS_PATH="
set "FINANCESENSOR_INTERBANK_STATEMENT_PATH="

echo.
if "%FS_EXIT%"=="0" (
  echo FinanceSensor Statement Sweep finalizo.
) else (
  echo FinanceSensor se detuvo de forma segura.
)
echo.
popd
pause
exit /b %FS_EXIT%
