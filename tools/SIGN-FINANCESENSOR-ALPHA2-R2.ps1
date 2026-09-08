param(
  [string]$InputApk,
  [string]$ApkSignerJar,
  [string]$OutputApk
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Candidate = '0.2.0-alpha.2+2004'
$ExpectedSourceCommit = 'c90bea088fc866aca28cadc945986dbcccebada5'
$ExpectedInputSha256 = '783efd8a93082199614cb86a8c3a69b29aff6995cceb8f51748f572d654113f9'
$ExpectedInputBytes = 182091971
$CanonicalRunId = '34240411480'
$CanonicalArtifactId = '10062059799'
$ExpectedSignerSha1 = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
$ExpectedPackage = 'com.financesensor.lab.gmailconnection.r2'
$ExpectedScope = 'gmail.readonly'
$DefaultOutputName = 'FinanceSensor-ALPHA2-R2-STABLE-0.2.0-alpha.2+2004.apk'

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
  $cmd = Get-Command java -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
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
  $cmd = Get-Command keytool -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @((Join-Path (Split-Path -Parent $JavaExe) 'keytool.exe'))
  if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME 'bin\keytool.exe') }
  if ($env:ProgramFiles) { $candidates += (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr\bin\keytool.exe') }
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

function Quote-ProcessArgument([string]$Value) {
  if ($null -eq $Value) { return '""' }
  return '"' + $Value.Replace('"', '\"') + '"'
}

function Invoke-ProcessWithStdin([string]$FileName, [string[]]$Arguments, [string[]]$InputLines) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FileName
  $psi.Arguments = (($Arguments | ForEach-Object { Quote-ProcessArgument $_ }) -join ' ')
  $psi.UseShellExecute = $false
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $psi
  if (-not $process.Start()) { throw "Could not start native process: $FileName" }

  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()
  foreach ($line in $InputLines) { $process.StandardInput.WriteLine($line) }
  $process.StandardInput.Close()
  $process.WaitForExit()

  $stdout = $stdoutTask.Result
  $stderr = $stderrTask.Result
  $combined = @()
  if ($stdout) { $combined += ($stdout -split "`r?`n") }
  if ($stderr) { $combined += ($stderr -split "`r?`n") }

  return [pscustomobject]@{
    ExitCode = $process.ExitCode
    Lines = @($combined | Where-Object { $_ -ne '' })
  }
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
  $InputApk = Choose-File -Title 'Select canonical FinanceSensor Alpha.2 APK' -Filter 'Android package (*.apk)|*.apk|All files (*.*)|*.*' -FallbackPrompt 'Full path to canonical Alpha.2 APK'
}
if ([string]::IsNullOrWhiteSpace($InputApk) -or -not (Test-Path -LiteralPath $InputApk)) {
  throw 'Canonical Alpha.2 input APK was not selected or does not exist.'
}
$InputFull = (Resolve-Path -LiteralPath $InputApk).Path

if ([string]::IsNullOrWhiteSpace($ApkSignerJar)) { $ApkSignerJar = Find-BundledApkSignerJar -InputPath $InputFull }
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
  throw 'Output APK must be different from the canonical input APK.'
}

$InputInfo = Get-Item -LiteralPath $InputFull
$InputHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $InputFull).Hash.ToLowerInvariant()
if ($InputHash -ne $ExpectedInputSha256 -or $InputInfo.Length -ne $ExpectedInputBytes) {
  throw "Canonical input mismatch. SHA256=$InputHash Bytes=$($InputInfo.Length). Expected SHA256=$ExpectedInputSha256 Bytes=$ExpectedInputBytes. Nothing was signed."
}

& $java -jar $SignerJarFull verify --print-certs $InputFull *> $null
if ($LASTEXITCODE -ne 0) { throw 'Canonical input failed apksigner verification. Nothing was signed.' }

$Keystore = Choose-File -Title 'Select private FINANCESENSOR_R2_LAB keystore' -Filter 'Java keystore (*.jks;*.keystore)|*.jks;*.keystore|All files (*.*)|*.*' -FallbackPrompt 'Full path to private FINANCESENSOR_R2_LAB keystore'
if ([string]::IsNullOrWhiteSpace($Keystore) -or -not (Test-Path -LiteralPath $Keystore)) { throw 'Keystore was not selected or does not exist.' }

$StoreSecure = Read-Host 'Keystore password (trusted-edge session only)' -AsSecureString
$StorePass = Convert-SecureStringToPlain $StoreSecure
if ([string]::IsNullOrEmpty($StorePass)) { throw 'Empty keystore password is not accepted.' }

try {
  Write-Host "FINANCESENSOR_ALPHA2_CANDIDATE=$Candidate"
  Write-Host "SOURCE_COMMIT=$ExpectedSourceCommit"
  Write-Host "INPUT_APK_SHA256=$InputHash"

  $keytoolResult = Invoke-ProcessWithStdin -FileName $keytool -Arguments @('-J-Duser.language=en', '-J-Duser.country=US', '-list', '-v', '-keystore', $Keystore) -InputLines @($StorePass)
  if ($keytoolResult.ExitCode -ne 0) { throw 'Could not open the selected keystore with that password.' }
  $listing = $keytoolResult.Lines

  $Alias = $null
  $CurrentAlias = $null
  foreach ($line in $listing) {
    $text = [string]$line
    if ($text -match '^Alias name:\s*(.+)$') { $CurrentAlias = $Matches[1].Trim(); continue }
    if ($CurrentAlias -and $text -match '^\s*SHA1:\s*([0-9A-Fa-f:]+)\s*$') {
      if ((Normalize-Sha1 $Matches[1]) -eq $ExpectedSignerSha1) { $Alias = $CurrentAlias; break }
    }
  }
  if (-not $Alias) { throw "Selected keystore does not contain frozen R2 identity $ExpectedSignerSha1. Nothing was signed." }

  Remove-OutputArtifacts -OutputPath $OutputFull
  $signResult = Invoke-ProcessWithStdin -FileName $java -Arguments @('-jar', $SignerJarFull, 'sign', '--ks', $Keystore, '--ks-key-alias', $Alias, '--ks-pass', 'stdin', '--key-pass', 'stdin', '--out', $OutputFull, $InputFull) -InputLines @($StorePass, $StorePass)
  if ($signResult.ExitCode -ne 0) {
    Remove-OutputArtifacts -OutputPath $OutputFull
    $KeySecure = Read-Host 'Private key password (only if different from keystore password)' -AsSecureString
    $KeyPass = Convert-SecureStringToPlain $KeySecure
    if ([string]::IsNullOrEmpty($KeyPass)) { throw 'Signing failed and no distinct key password was provided.' }
    $signResult = Invoke-ProcessWithStdin -FileName $java -Arguments @('-jar', $SignerJarFull, 'sign', '--ks', $Keystore, '--ks-key-alias', $Alias, '--ks-pass', 'stdin', '--key-pass', 'stdin', '--out', $OutputFull, $InputFull) -InputLines @($StorePass, $KeyPass)
    if ($signResult.ExitCode -ne 0) { Remove-OutputArtifacts -OutputPath $OutputFull; throw 'Local signing failed. No output APK or receipt was retained.' }
  }

  $verify = & $java -jar $SignerJarFull verify --print-certs $OutputFull 2>&1
  if ($LASTEXITCODE -ne 0) { Remove-OutputArtifacts -OutputPath $OutputFull; throw 'Signed APK failed apksigner verification. Output deleted.' }

  $ObservedSigner = $null
  foreach ($line in $verify) {
    if ([string]$line -match 'certificate SHA-1 digest:\s*([0-9A-Fa-f:]+)') { $ObservedSigner = Normalize-Sha1 $Matches[1]; break }
  }
  if ($ObservedSigner -ne $ExpectedSignerSha1) { Remove-OutputArtifacts -OutputPath $OutputFull; throw "Signer mismatch. Observed=$ObservedSigner Expected=$ExpectedSignerSha1. Output deleted." }

  $SignedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $OutputFull).Hash.ToLowerInvariant()
  $SignedBytes = (Get-Item -LiteralPath $OutputFull).Length
  "$SignedHash  $(Split-Path -Leaf $OutputFull)" | Set-Content -LiteralPath "$OutputFull.sha256" -Encoding ascii

  @(
    'FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING=PASS',
    "FINANCESENSOR_ALPHA2_CANDIDATE=$Candidate",
    "SOURCE_COMMIT=$ExpectedSourceCommit",
    "CANONICAL_RUN_ID=$CanonicalRunId",
    "CANONICAL_ARTIFACT_ID=$CanonicalArtifactId",
    "INPUT_APK_SHA256=$InputHash",
    "INPUT_APK_BYTES=$ExpectedInputBytes",
    "SIGNED_APK_SHA256=$SignedHash",
    "SIGNED_APK_BYTES=$SignedBytes",
    "SIGNER_SHA1=$ObservedSigner",
    "ANDROID_OAUTH_PACKAGE=$ExpectedPackage",
    "EXACT_SCOPE=$ExpectedScope",
    'PRIVATE_SIGNING_MATERIAL_IN_GITHUB=0',
    'REAL_OAUTH_EXECUTED_BY_SIGNING_STEP=0',
    'REAL_GMAIL_EXECUTED_BY_SIGNING_STEP=0',
    'ALPHA2_MOBILE_INTEGRATION_CI=PASS',
    'ALPHA2_MOBILE_INTEGRATION_PHYSICAL=OPEN',
    'PHYSICAL_SQLCIPHER_PASS=NO',
    'PHYSICAL_ALPHA2_PASS=NO',
    'BUILD_READY=NO',
    'RELEASE_READY=NO'
  ) | Set-Content -LiteralPath "$OutputFull.receipt.txt" -Encoding ascii

  Write-Host 'FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING=PASS'
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
  $StorePass = $null
  if (Get-Variable KeyPass -ErrorAction SilentlyContinue) { $KeyPass = $null }
  $StoreSecure = $null
  if (Get-Variable KeySecure -ErrorAction SilentlyContinue) { $KeySecure = $null }
}
