param(
  [Parameter(Mandatory = $true)][string]$InputApk,
  [Parameter(Mandatory = $true)][string]$ApkSignerJar,
  [string]$OutputApk = 'FinanceSensor-R2-STABLE.apk'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ExpectedSha1 = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'

function Convert-SecureStringToPlain([Security.SecureString]$Secure) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Normalize-Sha1([string]$Value) {
  $hex = ($Value -replace '[^0-9A-Fa-f]', '').ToUpperInvariant()
  if ($hex.Length -ne 40) { return '' }
  return (($hex -split '(.{2})' | Where-Object { $_ }) -join ':')
}

function Resolve-Java {
  $command = Get-Command java -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $candidates = @()
  if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME 'bin\java.exe') }
  if ($env:ProgramFiles) {
    $candidates += (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr\bin\java.exe')
    $candidates += (Join-Path $env:ProgramFiles 'Android\Android Studio\jre\bin\java.exe')
  }
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
  }
  return $null
}

function Resolve-Keytool([string]$JavaExe) {
  $command = Get-Command keytool -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $candidates = @()
  $javaDir = Split-Path -Parent $JavaExe
  if ($javaDir) { $candidates += (Join-Path $javaDir 'keytool.exe') }
  if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME 'bin\keytool.exe') }

  try {
    $settings = & $JavaExe '-XshowSettings:properties' '-version' 2>&1
    foreach ($line in $settings) {
      $text = [string]$line
      if ($text -match '^\s*java\.home\s*=\s*(.+?)\s*$') {
        $candidates += (Join-Path $Matches[1].Trim() 'bin\keytool.exe')
      }
    }
  } catch { }

  if ($env:ProgramFiles) {
    $candidates += (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr\bin\keytool.exe')
    $candidates += (Join-Path $env:ProgramFiles 'Android\Android Studio\jre\bin\keytool.exe')
  }

  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
  }
  return $null
}

function Choose-Keystore {
  try {
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = 'Select private FINANCESENSOR_R2_LAB keystore'
    $dialog.Filter = 'Java keystore (*.jks;*.keystore)|*.jks;*.keystore|All files (*.*)|*.*'
    $dialog.Multiselect = $false
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { return $dialog.FileName }
  } catch { }
  return (Read-Host 'Full path to private FINANCESENSOR_R2_LAB keystore').Trim('"')
}

$java = Resolve-Java
if (-not $java) { throw 'Java was not found. Install Android Studio/JDK or expose java.exe locally.' }
$keytool = Resolve-Keytool -JavaExe $java
if (-not $keytool) { throw 'keytool.exe could not be resolved from the installed Java runtime.' }
if (-not (Test-Path -LiteralPath $InputApk)) { throw "Input APK not found: $InputApk" }
if (-not (Test-Path -LiteralPath $ApkSignerJar)) { throw "apksigner.jar not found: $ApkSignerJar" }

$Keystore = Choose-Keystore
if ([string]::IsNullOrWhiteSpace($Keystore) -or -not (Test-Path -LiteralPath $Keystore)) { throw 'Keystore was not selected or does not exist.' }

$StoreSecure = Read-Host 'Keystore password (local memory only)' -AsSecureString
$StorePass = Convert-SecureStringToPlain $StoreSecure
$env:FINANCESENSOR_R2_STORE_PASS = $StorePass
$env:FINANCESENSOR_R2_KEY_PASS = $StorePass

try {
  Write-Host "JAVA=$java"
  Write-Host "KEYTOOL=$keytool"
  $listing = & $keytool '-J-Duser.language=en' '-J-Duser.country=US' -list -v -keystore $Keystore -storepass:env FINANCESENSOR_R2_STORE_PASS 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'Could not open the selected keystore with that password.' }

  $Alias = $null
  $CurrentAlias = $null
  foreach ($line in $listing) {
    $text = [string]$line
    if ($text -match '^Alias name:\s*(.+)$') { $CurrentAlias = $Matches[1].Trim(); continue }
    if ($CurrentAlias -and $text -match '^\s*SHA1:\s*([0-9A-Fa-f:]+)\s*$') {
      if ((Normalize-Sha1 $Matches[1]) -eq $ExpectedSha1) { $Alias = $CurrentAlias; break }
    }
  }
  if (-not $Alias) { throw "The selected keystore does not contain the expected stable R2 identity ($ExpectedSha1). No APK was signed." }

  if (Test-Path -LiteralPath $OutputApk) { Remove-Item -LiteralPath $OutputApk -Force }
  & $java -jar $ApkSignerJar sign --ks $Keystore --ks-key-alias $Alias --ks-pass env:FINANCESENSOR_R2_STORE_PASS --key-pass env:FINANCESENSOR_R2_KEY_PASS --out $OutputApk $InputApk
  if ($LASTEXITCODE -ne 0) {
    if (Test-Path -LiteralPath $OutputApk) { Remove-Item -LiteralPath $OutputApk -Force }
    $KeySecure = Read-Host 'Private key password (only if different from keystore password)' -AsSecureString
    $KeyPass = Convert-SecureStringToPlain $KeySecure
    $env:FINANCESENSOR_R2_KEY_PASS = $KeyPass
    & $java -jar $ApkSignerJar sign --ks $Keystore --ks-key-alias $Alias --ks-pass env:FINANCESENSOR_R2_STORE_PASS --key-pass env:FINANCESENSOR_R2_KEY_PASS --out $OutputApk $InputApk
    if ($LASTEXITCODE -ne 0) { throw 'Local signing failed. No accepted APK was produced.' }
  }

  $verify = & $java -jar $ApkSignerJar verify --print-certs $OutputApk 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'apksigner could not verify the signed APK.' }
  $Observed = $null
  foreach ($line in $verify) {
    $text = [string]$line
    if ($text -match 'certificate SHA-1 digest:\s*([0-9A-Fa-f:]+)') { $Observed = Normalize-Sha1 $Matches[1]; break }
  }
  if ($Observed -ne $ExpectedSha1) {
    Remove-Item -LiteralPath $OutputApk -Force -ErrorAction SilentlyContinue
    throw "Produced APK signer mismatch. Observed=$Observed Expected=$ExpectedSha1. Output deleted."
  }

  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $OutputApk).Hash.ToLowerInvariant()
  "$hash  $(Split-Path -Leaf $OutputApk)" | Set-Content -LiteralPath "$OutputApk.sha256" -Encoding ascii
  Write-Host 'FINANCESENSOR_R2_TRUSTED_EDGE_SIGNING=PASS'
  Write-Host "SIGNER_SHA1=$Observed"
  Write-Host "APK_SHA256=$hash"
}
finally {
  $StorePass = $null
  if (Get-Variable KeyPass -ErrorAction SilentlyContinue) { $KeyPass = $null }
  Remove-Item Env:FINANCESENSOR_R2_STORE_PASS -ErrorAction SilentlyContinue
  Remove-Item Env:FINANCESENSOR_R2_KEY_PASS -ErrorAction SilentlyContinue
}
