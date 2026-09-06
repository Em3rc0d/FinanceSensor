param(
  [string]$InputApk,
  [string]$ApkSignerJar,
  [string]$OutputApk
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Candidate = '0.1.0-alpha.1+1001'
$ExpectedSourceCommit = '9d990fc579429cc0bc8e5c02306d8ebe4622e145'
$ExpectedInputSha256 = 'c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d'
$ExpectedSignerSha1 = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
$ExpectedPackage = 'com.financesensor.lab.gmailconnection.r2'
$ExpectedScope = 'gmail.readonly'
$DefaultOutputName = 'FinanceSensor-R2-STABLE-0.1.0-alpha.1+1001.apk'

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

function Choose-File([string]$Title, [string]$Filter, [string]$FallbackPrompt) {
  try {
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = $Title
    $dialog.Filter = $Filter
    $dialog.Multiselect = $false
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { return $dialog.FileName }
  } catch { }
  return (Read-Host $FallbackPrompt).Trim('"')
}

function Find-BundledApkSignerJar([string]$InputPath) {
  $cursor = Split-Path -Parent $InputPath
  while ($cursor) {
    $candidate = Join-Path $cursor 'public-signing-tool\lib\apksigner.jar'
    if (Test-Path -LiteralPath $candidate) { return $candidate }
    $parent = Split-Path -Parent $cursor
    if (-not $parent -or $parent -eq $cursor) { break }
    $cursor = $parent
  }
  return $null
}

function Choose-Keystore {
  return Choose-File -Title 'Select private FINANCESENSOR_R2_LAB keystore' -Filter 'Java keystore (*.jks;*.keystore)|*.jks;*.keystore|All files (*.*)|*.*' -FallbackPrompt 'Full path to private FINANCESENSOR_R2_LAB keystore'
}

function Remove-OutputArtifacts([string]$OutputPath) {
  Remove-Item -LiteralPath $OutputPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath "$OutputPath.sha256" -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath "$OutputPath.receipt.txt" -Force -ErrorAction SilentlyContinue
}

$java = Resolve-Java
if (-not $java) { throw 'Java was not found. Install Android Studio/JDK or expose java.exe locally.' }
$keytool = Resolve-Keytool -JavaExe $java
if (-not $keytool) { throw 'keytool.exe could not be resolved from the installed Java runtime.' }

if ([string]::IsNullOrWhiteSpace($InputApk)) {
  $InputApk = Choose-File -Title 'Select certified FinanceSensor Human Test APK' -Filter 'Android package (*.apk)|*.apk|All files (*.*)|*.*' -FallbackPrompt 'Full path to certified Human Test APK'
}
if ([string]::IsNullOrWhiteSpace($InputApk) -or -not (Test-Path -LiteralPath $InputApk)) {
  throw 'Certified input APK was not selected or does not exist.'
}
$InputFull = (Resolve-Path -LiteralPath $InputApk).Path

if ([string]::IsNullOrWhiteSpace($ApkSignerJar)) {
  $ApkSignerJar = Find-BundledApkSignerJar -InputPath $InputFull
}
if ([string]::IsNullOrWhiteSpace($ApkSignerJar)) {
  $ApkSignerJar = Choose-File -Title 'Select bundled public apksigner.jar' -Filter 'Java archive (*.jar)|*.jar|All files (*.*)|*.*' -FallbackPrompt 'Full path to bundled public apksigner.jar'
}
if ([string]::IsNullOrWhiteSpace($ApkSignerJar) -or -not (Test-Path -LiteralPath $ApkSignerJar)) {
  throw 'apksigner.jar was not found or selected.'
}
$SignerJarFull = (Resolve-Path -LiteralPath $ApkSignerJar).Path

if ([string]::IsNullOrWhiteSpace($OutputApk)) {
  $OutputFull = Join-Path (Split-Path -Parent $InputFull) $DefaultOutputName
} elseif ([IO.Path]::IsPathRooted($OutputApk)) {
  $OutputFull = [IO.Path]::GetFullPath($OutputApk)
} else {
  $OutputFull = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputApk))
}

if ([string]::Equals($InputFull, $OutputFull, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'Output APK must be different from the certified input APK.'
}

$InputHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $InputFull).Hash.ToLowerInvariant()
if ($InputHash -ne $ExpectedInputSha256) {
  throw "Certified input APK mismatch. Observed=$InputHash Expected=$ExpectedInputSha256. Nothing was signed."
}

& $java -jar $SignerJarFull verify --print-certs $InputFull *> $null
if ($LASTEXITCODE -ne 0) { throw 'The certified input APK failed apksigner verification. Nothing was signed.' }

$Keystore = Choose-Keystore
if ([string]::IsNullOrWhiteSpace($Keystore) -or -not (Test-Path -LiteralPath $Keystore)) {
  throw 'Keystore was not selected or does not exist.'
}

$StoreSecure = Read-Host 'Keystore password (trusted-edge session only)' -AsSecureString
$StorePass = Convert-SecureStringToPlain $StoreSecure
$env:FINANCESENSOR_R2_STORE_PASS = $StorePass
$env:FINANCESENSOR_R2_KEY_PASS = $StorePass

try {
  Write-Host "FINANCESENSOR_CANDIDATE=$Candidate"
  Write-Host "SOURCE_COMMIT=$ExpectedSourceCommit"
  Write-Host "INPUT_APK_SHA256=$InputHash"

  $listing = & $keytool '-J-Duser.language=en' '-J-Duser.country=US' -list -v -keystore $Keystore -storepass:env FINANCESENSOR_R2_STORE_PASS 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'Could not open the selected keystore with that password.' }

  $Alias = $null
  $CurrentAlias = $null
  foreach ($line in $listing) {
    $text = [string]$line
    if ($text -match '^Alias name:\s*(.+)$') { $CurrentAlias = $Matches[1].Trim(); continue }
    if ($CurrentAlias -and $text -match '^\s*SHA1:\s*([0-9A-Fa-f:]+)\s*$') {
      if ((Normalize-Sha1 $Matches[1]) -eq $ExpectedSignerSha1) { $Alias = $CurrentAlias; break }
    }
  }
  if (-not $Alias) {
    throw "Selected keystore does not contain the frozen FINANCESENSOR_R2_LAB identity ($ExpectedSignerSha1). Nothing was signed."
  }

  Remove-OutputArtifacts -OutputPath $OutputFull

  & $java -jar $SignerJarFull sign --ks $Keystore --ks-key-alias $Alias --ks-pass env:FINANCESENSOR_R2_STORE_PASS --key-pass env:FINANCESENSOR_R2_KEY_PASS --out $OutputFull $InputFull
  if ($LASTEXITCODE -ne 0) {
    Remove-OutputArtifacts -OutputPath $OutputFull
    $KeySecure = Read-Host 'Private key password (only if different from keystore password)' -AsSecureString
    $KeyPass = Convert-SecureStringToPlain $KeySecure
    $env:FINANCESENSOR_R2_KEY_PASS = $KeyPass
    & $java -jar $SignerJarFull sign --ks $Keystore --ks-key-alias $Alias --ks-pass env:FINANCESENSOR_R2_STORE_PASS --key-pass env:FINANCESENSOR_R2_KEY_PASS --out $OutputFull $InputFull
    if ($LASTEXITCODE -ne 0) {
      Remove-OutputArtifacts -OutputPath $OutputFull
      throw 'Local signing failed. No output APK or receipt was retained.'
    }
  }

  $verify = & $java -jar $SignerJarFull verify --print-certs $OutputFull 2>&1
  if ($LASTEXITCODE -ne 0) {
    Remove-OutputArtifacts -OutputPath $OutputFull
    throw 'apksigner could not verify the locally signed APK. Output deleted.'
  }

  $ObservedSigner = $null
  foreach ($line in $verify) {
    $text = [string]$line
    if ($text -match 'certificate SHA-1 digest:\s*([0-9A-Fa-f:]+)') {
      $ObservedSigner = Normalize-Sha1 $Matches[1]
      break
    }
  }
  if ($ObservedSigner -ne $ExpectedSignerSha1) {
    Remove-OutputArtifacts -OutputPath $OutputFull
    throw "Produced APK signer mismatch. Observed=$ObservedSigner Expected=$ExpectedSignerSha1. Output deleted."
  }

  $SignedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $OutputFull).Hash.ToLowerInvariant()
  $SignedBytes = (Get-Item -LiteralPath $OutputFull).Length
  "$SignedHash  $(Split-Path -Leaf $OutputFull)" | Set-Content -LiteralPath "$OutputFull.sha256" -Encoding ascii

  @(
    "FINANCESENSOR_R2_TRUSTED_EDGE_SIGNING=PASS",
    "FINANCESENSOR_HUMAN_TEST_CANDIDATE=$Candidate",
    "SOURCE_COMMIT=$ExpectedSourceCommit",
    "INPUT_APK_SHA256=$InputHash",
    "SIGNED_APK_SHA256=$SignedHash",
    "SIGNED_APK_BYTES=$SignedBytes",
    "SIGNER_SHA1=$ObservedSigner",
    "ANDROID_OAUTH_PACKAGE=$ExpectedPackage",
    "EXACT_SCOPE=$ExpectedScope",
    "PRIVATE_SIGNING_MATERIAL_IN_GITHUB=0",
    "REAL_OAUTH_EXECUTED_BY_SIGNING_STEP=0",
    "REAL_GMAIL_EXECUTED_BY_SIGNING_STEP=0",
    "ALPHA2_MOBILE_INTEGRATION=OPEN",
    "BUILD_READY=NO",
    "RELEASE_READY=NO"
  ) | Set-Content -LiteralPath "$OutputFull.receipt.txt" -Encoding ascii

  Write-Host 'FINANCESENSOR_R2_TRUSTED_EDGE_SIGNING=PASS'
  Write-Host "INPUT_APK_SHA256=$InputHash"
  Write-Host "SIGNER_SHA1=$ObservedSigner"
  Write-Host "SIGNED_APK_SHA256=$SignedHash"
  Write-Host "SIGNED_APK_BYTES=$SignedBytes"
  Write-Host "RECEIPT=$(Split-Path -Leaf "$OutputFull.receipt.txt")"
}
catch {
  Remove-OutputArtifacts -OutputPath $OutputFull
  throw
}
finally {
  # PowerShell/.NET strings do not provide deterministic zeroization. The contract
  # is session-only custody plus prompt/env cleanup; no stronger claim is made.
  $StorePass = $null
  if (Get-Variable KeyPass -ErrorAction SilentlyContinue) { $KeyPass = $null }
  $StoreSecure = $null
  if (Get-Variable KeySecure -ErrorAction SilentlyContinue) { $KeySecure = $null }
  Remove-Item Env:FINANCESENSOR_R2_STORE_PASS -ErrorAction SilentlyContinue
  Remove-Item Env:FINANCESENSOR_R2_KEY_PASS -ErrorAction SilentlyContinue
}
