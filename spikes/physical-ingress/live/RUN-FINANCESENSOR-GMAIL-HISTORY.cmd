@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

title FinanceSensor - Gmail Transaction History DEV

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo FinanceSensor necesita Node.js instalado en esta computadora.
  echo No se hizo ninguna solicitud OAuth y Gmail no fue accedido.
  echo.
  pause
  exit /b 1
)

echo FinanceSensor - Gmail Transaction History DEV
echo ---------------------------------------------
echo Todo este flujo corre en el edge local controlado.
echo Scope exacto: gmail.readonly
echo iOS: NO TOCADO
echo.
echo Selecciona el JSON OAuth Desktop DEV de FinanceSensor.
echo El archivo queda local y su contenido nunca se imprime.
echo.

set "FINANCESENSOR_GOOGLE_CREDENTIALS_PATH="
for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -STA -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Filter = 'Google OAuth credentials JSON (*.json)|*.json'; $d.Title = 'Selecciona FinanceSensor DEV Google OAuth Desktop credentials'; $d.Multiselect = $false; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Write($d.FileName) }"`) do set "FINANCESENSOR_GOOGLE_CREDENTIALS_PATH=%%I"

if not defined FINANCESENSOR_GOOGLE_CREDENTIALS_PATH (
  echo.
  echo No seleccionaste credencial. FinanceSensor se detuvo antes de OAuth.
  echo Gmail no fue accedido.
  echo.
  pause
  exit /b 1
)

echo.
echo Credencial seleccionada localmente.
echo El navegador se abrira automaticamente.
echo.
echo Solo tendras que:
echo   1. pulsar Conectar Gmail;
echo   2. elegir tu cuenta Google;
echo   3. aceptar el scope gmail.readonly.
echo.
echo Despues FinanceSensor recorrera el buzon activo por paginas y el
echo dashboard se actualizara solo. PREVIEW no significa cobertura completa.
echo COMPLETE aparece unicamente cuando Gmail ya no devuelve nextPageToken.
echo.
echo Estado local derivado:
echo   %%LOCALAPPDATA%%\FinanceSensor\gmail-history-dev
echo La snapshot queda cifrada AES-256-GCM y la clave queda protegida con
 echo Windows DPAPI para tu usuario. No se persisten cuerpos Gmail ni tokens.
echo.

node live\owned-oauth-gmail-history-viewer.mjs
set "FS_EXIT=%ERRORLEVEL%"
set "FINANCESENSOR_GOOGLE_CREDENTIALS_PATH="

echo.
if "%FS_EXIT%"=="0" (
  echo FinanceSensor Gmail History finalizo.
) else (
  echo FinanceSensor se detuvo de forma segura. Los checkpoints cifrados
  echo completados permanecen locales y pueden reutilizarse en el siguiente run.
)
echo.
pause
exit /b %FS_EXIT%
