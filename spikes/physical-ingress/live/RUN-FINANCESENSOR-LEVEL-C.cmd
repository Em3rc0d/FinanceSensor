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

echo FinanceSensor Gmail Level C v3 - controlled local probe
echo -------------------------------------------------------
echo Select the Google OAuth Desktop credentials JSON downloaded from Google Cloud.
echo The file contents will stay local and will never be printed or copied to evidence.
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
echo No credential, token or Gmail content will be printed or saved by the runner.
echo No historical mailbox list will run.
echo Maximum changed messages per attempt: 5; maximum FULL fetch: 1.
echo.
node live\owned-oauth-level-c-v3.mjs

set "FINANCESENSOR_GOOGLE_CREDENTIALS_PATH="
echo.
echo FinanceSensor Level C process finished.
pause
endlocal
