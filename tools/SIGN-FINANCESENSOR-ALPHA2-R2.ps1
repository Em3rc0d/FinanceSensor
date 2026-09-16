$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Candidate = '0.2.0-alpha.2+2013'
$ProductSourceCommit = 'da6176f9acba1854c470ce2caea471bb6b66d8f2'
$CanonicalSourceCommit = 'fd6b2ba75a63e650626f2fcece6c13f0bea4f541'
$ExpectedInputSha256 = 'bcb6db29b9fb567dcffc99d875674a6834938c837fd2fe7f1aa83cc29c3b0da1'
$ExpectedInputBytes = 182538547
$CanonicalRunId = '35043945554'
$CanonicalArtifactId = '10425404905'
$ExpectedSignerSha1 = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
$ExpectedPackage = 'com.financesensor.lab.gmailconnection.r2'
$ExpectedScope = 'gmail.readonly'

$BaseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InputApk = Join-Path $BaseDir 'FinanceSensor-ALPHA2-CANONICAL-INPUT.apk'
$ApkSignerJar = Join-Path $BaseDir 'public-signing-tool\lib\apksigner.jar'
$OutputApk = Join-Path $BaseDir 'FinanceSensor-ALPHA2-R2-STABLE-0.2.0-alpha.2+2013.apk'

function Convert-SecureToPlain([Security.SecureString]$Secure) {
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Normalize-Sha1([string]$Value) {
  $hex = ($Value -replace '[^0-9A-Fa-f]', '').ToUpperInvariant()
  if ($hex.Length -ne 40) { return '' }
  return (($hex -split '(.{2})' | Where-Object { $_ }) -join ':')
}

function Resolve-Exe([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  if ($env:JAVA_HOME) {
    $candidate = Join-Path $env:JAVA_HOME "bin\$Name.exe"
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  if ($env:ProgramFiles) {
    $candidate = Join-Path $env:ProgramFiles "Android\Android Studio\jbr\bin\$Name.exe"
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  return $null
}

function Choose-Keystore {
  try {
    Add-Type -AssemblyName System.Windows.Forms
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = 'Select private FINANCESENSOR_R2_LAB keystore'
    $dialog.Filter = 'Java keystore (*.jks;*.keystore)|*.jks;*.keystore|All files (*.*)|*.*'
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { return $dialog.FileName }
  } catch { }
  return (Read-Host 'Full path to private FINANCESENSOR_R2_LAB keystore').Trim('"')
}

function Quote-Arg([string]$Value) { return '"' + $Value.Replace('"', '\"') + '"' }

function Invoke-WithStdin([string]$FileName, [string[]]$Arguments, [string[]]$InputLines) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FileName
  $psi.Arguments = (($Arguments | ForEach-Object { Quote-Arg $_ }) -join ' ')
  $psi.UseShellExecute = $false
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  if (-not $p.Start()) { throw "Could not start $FileName" }
  $stdout = $p.StandardOutput.ReadToEndAsync()
  $stderr = $p.StandardError.ReadToEndAsync()
  foreach ($line in $InputLines) { $p.StandardInput.WriteLine($line) }
  $p.StandardInput.Close()
  $p.WaitForExit()
  return [pscustomobject]@{
    ExitCode = $p.ExitCode
    Lines = @(($stdout.Result + "`n" + $stderr.Result) -split "`r?`n" | Where-Object { $_ -ne '' })
  }
}

function Remove-Outputs {
  Remove-Item -LiteralPath $OutputApk -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath "$OutputApk.sha256" -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath "$OutputApk.receipt.txt" -Force -ErrorAction SilentlyContinue
}

$java = Resolve-Exe 'java'
$keytool = Resolve-Exe 'keytool'
if (-not $java -or -not $keytool) { throw 'Java/keytool not found. Install Android Studio/JDK or expose JAVA_HOME.' }
if (-not (Test-Path -LiteralPath $InputApk)) { throw 'Frozen canonical +2013 APK is missing from this bundle.' }
if (-not (Test-Path -LiteralPath $ApkSignerJar)) { throw 'Bundled public apksigner.jar is missing.' }

$inputInfo = Get-Item -LiteralPath $InputApk
$inputHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $InputApk).Hash.ToLowerInvariant()
if ($inputHash -ne $ExpectedInputSha256 -or $inputInfo.Length -ne $ExpectedInputBytes) {
  throw "Canonical input mismatch. SHA256=$inputHash Bytes=$($inputInfo.Length). Nothing was signed."
}
& $java -jar $ApkSignerJar verify --print-certs $InputApk *> $null
if ($LASTEXITCODE -ne 0) { throw 'Canonical input failed apksigner verification.' }

$Keystore = Choose-Keystore
if ([string]::IsNullOrWhiteSpace($Keystore) -or -not (Test-Path -LiteralPath $Keystore)) { throw 'Keystore was not selected.' }
$StoreSecure = Read-Host 'Keystore password (trusted-edge session only)' -AsSecureString
$StorePass = Convert-SecureToPlain $StoreSecure
if ([string]::IsNullOrEmpty($StorePass)) { throw 'Empty keystore password is not accepted.' }

try {
  Write-Host "FINANCESENSOR_ALPHA2_CANDIDATE=$Candidate"
  Write-Host "PRODUCT_SOURCE_COMMIT=$ProductSourceCommit"
  Write-Host "CANONICAL_SOURCE_COMMIT=$CanonicalSourceCommit"
  Write-Host "INPUT_APK_SHA256=$inputHash"

  $listing = Invoke-WithStdin $keytool @('-J-Duser.language=en','-J-Duser.country=US','-list','-v','-keystore',$Keystore) @($StorePass)
  if ($listing.ExitCode -ne 0) { throw 'Could not open the selected keystore with that password.' }
  $Alias = $null; $CurrentAlias = $null
  foreach ($line in $listing.Lines) {
    if ($line -match '^Alias name:\s*(.+)$') { $CurrentAlias = $Matches[1].Trim(); continue }
    if ($CurrentAlias -and $line -match '^\s*SHA1:\s*([0-9A-Fa-f:]+)\s*$' -and (Normalize-Sha1 $Matches[1]) -eq $ExpectedSignerSha1) { $Alias = $CurrentAlias; break }
  }
  if (-not $Alias) { throw "Selected keystore does not contain frozen R2 identity $ExpectedSignerSha1." }

  Remove-Outputs
  $signArgs = @('-jar',$ApkSignerJar,'sign','--ks',$Keystore,'--ks-key-alias',$Alias,'--ks-pass','stdin','--key-pass','stdin','--out',$OutputApk,$InputApk)
  $sign = Invoke-WithStdin $java $signArgs @($StorePass,$StorePass)
  if ($sign.ExitCode -ne 0) {
    Remove-Outputs
    $KeySecure = Read-Host 'Private key password (only if different from keystore password)' -AsSecureString
    $KeyPass = Convert-SecureToPlain $KeySecure
    if ([string]::IsNullOrEmpty($KeyPass)) { throw 'Signing failed and no distinct key password was provided.' }
    $sign = Invoke-WithStdin $java $signArgs @($StorePass,$KeyPass)
    if ($sign.ExitCode -ne 0) { throw 'Local signing failed.' }
  }

  $verify = & $java -jar $ApkSignerJar verify --print-certs $OutputApk 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'Signed APK failed apksigner verification.' }
  $ObservedSigner = $null
  foreach ($line in $verify) { if ([string]$line -match 'certificate SHA-1 digest:\s*([0-9A-Fa-f:]+)') { $ObservedSigner = Normalize-Sha1 $Matches[1]; break } }
  if ($ObservedSigner -ne $ExpectedSignerSha1) { throw "Signer mismatch. Observed=$ObservedSigner Expected=$ExpectedSignerSha1." }

  $SignedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $OutputApk).Hash.ToLowerInvariant()
  $SignedBytes = (Get-Item -LiteralPath $OutputApk).Length
  "$SignedHash  $(Split-Path -Leaf $OutputApk)" | Set-Content -LiteralPath "$OutputApk.sha256" -Encoding ascii
  @(
    'FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING=PASS',
    "FINANCESENSOR_ALPHA2_CANDIDATE=$Candidate",
    "PRODUCT_SOURCE_COMMIT=$ProductSourceCommit",
    "SOURCE_COMMIT=$CanonicalSourceCommit",
    "CANONICAL_RUN_ID=$CanonicalRunId",
    "CANONICAL_ARTIFACT_ID=$CanonicalArtifactId",
    "INPUT_APK_SHA256=$inputHash",
    "INPUT_APK_BYTES=$ExpectedInputBytes",
    "SIGNED_APK_SHA256=$SignedHash",
    "SIGNED_APK_BYTES=$SignedBytes",
    "SIGNER_SHA1=$ObservedSigner",
    "ANDROID_OAUTH_PACKAGE=$ExpectedPackage",
    "EXACT_SCOPE=$ExpectedScope",
    'SCAN_RESILIENCE=A2_SCAN_RESILIENCE_V1',
    'PRIVATE_SIGNING_MATERIAL_IN_GITHUB=0',
    'REAL_OAUTH_EXECUTED_BY_SIGNING_STEP=0',
    'REAL_GMAIL_EXECUTED_BY_SIGNING_STEP=0',
    'PHYSICAL_ALPHA2_PASS=NO',
    'BUILD_READY=NO',
    'RELEASE_READY=NO'
  ) | Set-Content -LiteralPath "$OutputApk.receipt.txt" -Encoding ascii

  Write-Host 'FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING=PASS'
  Write-Host "SIGNED_APK_SHA256=$SignedHash"
  Write-Host "SIGNED_APK_BYTES=$SignedBytes"
  Write-Host "RECEIPT=$(Split-Path -Leaf "$OutputApk.receipt.txt")"
}
catch {
  Remove-Outputs
  throw
}
finally {
  $StorePass = $null; $StoreSecure = $null
  if (Get-Variable KeyPass -ErrorAction SilentlyContinue) { $KeyPass = $null }
  if (Get-Variable KeySecure -ErrorAction SilentlyContinue) { $KeySecure = $null }
}
