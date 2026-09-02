@echo off
setlocal
cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo FinanceSensor Level C needs Node.js installed on this computer.
  echo No OAuth request was made and no Gmail data was accessed.
  echo.
  pause
  exit /b 1
)

echo FinanceSensor Gmail Level C v8 - controlled local proof
echo -------------------------------------------------------
echo Select the Google OAuth Desktop credentials JSON downloaded from Google Cloud.
echo The file contents stay local and are never printed or copied to evidence.
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

echo.
echo Credential selected locally. Browser consent will open automatically.
echo No historical mailbox sweep will run.
echo Gmail Search query is not used for the anchor.
echo Each anchor attempt lists at most 5 recent INBOX IDs and inspects Subject metadata locally only.
echo At most 2 anchor attempts are allowed in the whole run.
echo The Gmail profile is used only to identify the authorized mailbox, never as startHistoryId.
echo Maximum changed messages per probe attempt: 5; maximum FULL fetch: 1.
echo v8 additionally proves a successful real refresh before revoke and verifies the refreshed bearer against Gmail.
echo v8 records sanitized endpoint-class counts, HTTP body byte totals, response byte totals and elapsed timings only.
echo URL query values, raw HTTP payloads, Gmail IDs, Gmail content and OAuth secrets are never written to result evidence.
echo Any post-authorization failure attempts provider revocation before local OAuth authority is cleared.
echo Level C v8 PASS requires the message-history anchor, FULL, extraction, replay, successful refresh, refreshed-bearer Gmail use, network evidence, revoke and post-revoke denial.
echo.
node live\owned-oauth-level-c-v8.mjs

set "FINANCESENSOR_GOOGLE_CREDENTIALS_PATH="
echo.
echo FinanceSensor Level C process finished.
pause
endlocal