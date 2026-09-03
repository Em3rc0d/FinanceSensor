@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

title FinanceSensor P1 - Controlled Gmail Lifecycle

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo FinanceSensor P1 needs Node.js installed on this computer.
  echo No OAuth request was made and no Gmail data was accessed.
  echo.
  pause
  exit /b 1
)

echo FinanceSensor P1 - controlled local Gmail lifecycle proof
echo ---------------------------------------------------------
echo This run stays on the controlled local edge.
echo Raw Gmail/OAuth evidence is never uploaded automatically.
echo.
echo Select the FinanceSensor DEV Google OAuth Desktop credentials JSON.
echo The credential file stays local and its contents are never printed.
echo.

set "FINANCESENSOR_GOOGLE_CREDENTIALS_PATH="
for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -STA -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Filter = 'Google OAuth credentials JSON (*.json)|*.json'; $d.Title = 'Select FinanceSensor DEV Google OAuth credentials JSON'; $d.Multiselect = $false; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Write($d.FileName) }"`) do set "FINANCESENSOR_GOOGLE_CREDENTIALS_PATH=%%I"

if not defined FINANCESENSOR_GOOGLE_CREDENTIALS_PATH (
  echo.
  echo No credential file selected. FinanceSensor stopped before OAuth.
  echo No Gmail data was accessed.
  echo.
  pause
  exit /b 1
)

if exist "financesensor-p1-production-lifecycle-result.json" del /q "financesensor-p1-production-lifecycle-result.json"
if exist "financesensor-p1-sanitized-receipt.json" del /q "financesensor-p1-sanitized-receipt.json"

echo.
echo Credential selected locally.
echo The browser will open automatically.
echo.
echo During the browser flow you will only need to:
echo   1. authorize FinanceSensor DEV;
echo   2. send the synthetic anchor shown on screen;
echo   3. send the synthetic purchase shown on screen;
echo   4. click the final refresh - revoke - verify button.
echo.
echo Safety bounds:
echo   - exact scope: gmail.readonly only;
echo   - historical mailbox sweep: NO;
echo   - Gmail Search anchor: NO;
echo   - recent Inbox IDs per anchor attempt: at most 5;
echo   - anchor attempts: at most 2;
echo   - history message IDs: at most 5;
echo   - FULL Gmail retrievals: exactly at most 1, synthetic target only;
echo   - provider revoke PASS requires HTTP 200;
echo   - old refresh authority PASS requires HTTP 400 + invalid_grant;
echo   - timeout, 5xx, other 4xx or provider grace never count as PASS.
echo.

node live\owned-oauth-p1-production-lifecycle.mjs
set "P1_RUN_EXIT=%ERRORLEVEL%"
set "FINANCESENSOR_GOOGLE_CREDENTIALS_PATH="

echo.
if not exist "financesensor-p1-production-lifecycle-result.json" (
  echo P1 finished without a local result artifact.
  echo No physical PASS is claimed.
  echo.
  pause
  exit /b 1
)

echo P1 local execution finished. Validating and reducing locally...
node ..\..\tools\reduce-p1-production-lifecycle-result.mjs "financesensor-p1-production-lifecycle-result.json" > "financesensor-p1-sanitized-receipt.json"
if errorlevel 1 (
  if exist "financesensor-p1-sanitized-receipt.json" del /q "financesensor-p1-sanitized-receipt.json"
  echo.
  echo The local result did NOT satisfy every P1 gate.
  echo No sanitized PASS receipt was created.
  echo The raw local result remains ignored by Git and must stay local.
  echo.
  pause
  exit /b 1
)

echo.
echo =========================================================
echo P1 CONTROLLED RUN: LOCAL PASS CANDIDATE
necho =========================================================
echo The raw result remains LOCAL ONLY:
echo   financesensor-p1-production-lifecycle-result.json
echo.
echo Sanitized receipt candidate:
echo   financesensor-p1-sanitized-receipt.json
echo.
echo This is still NOT a repository P1 PASS until Jett reviews the
echo sanitized receipt and binds it immutably into the evidence graph.
echo Do not upload or share the raw result or OAuth credential JSON.
echo =========================================================
echo.
pause
exit /b %P1_RUN_EXIT%
