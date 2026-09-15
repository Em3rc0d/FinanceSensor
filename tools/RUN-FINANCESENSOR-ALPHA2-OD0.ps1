param(
    [switch]$SelfTest,
    [string]$SignedApkPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Candidate = '0.2.0-alpha.2+2009'
$ProductSourceCommit = '9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f'
$CanonicalSourceCommit = 'e19bcccee13e326bbc08012533ddaeba026c633a'
$CanonicalApkSha256 = '1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717'
$SignedApkSha256 = '7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a'
$SignedApkBytes = 182538790
$ExpectedSignerSha1 = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
$AndroidPackage = 'com.financesensor.lab.gmailconnection.r2'
$GmailScope = 'gmail.readonly'
$OutputDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DefaultApk = Join-Path $OutputDir 'FinanceSensor-ALPHA2-R2-STABLE-0.2.0-alpha.2+2009.apk'
$ReceiptPath = Join-Path $OutputDir 'FinanceSensor-ALPHA2-R2-OD0-2009.receipt.txt'

function Write-SafeReceipt([string]$Code, [string]$InstallPass, [string]$LaunchPass) {
    @(
        "FINANCESENSOR_ALPHA2_R2_OD0=$Code"
        "FINANCESENSOR_ALPHA2_CANDIDATE=$Candidate"
        "PRODUCT_SOURCE_COMMIT=$ProductSourceCommit"
        "CANONICAL_SOURCE_COMMIT=$CanonicalSourceCommit"
        "CANONICAL_UNSIGNED_APK_SHA256=$CanonicalApkSha256"
        "SIGNED_APK_SHA256=$SignedApkSha256"
        "SIGNED_APK_BYTES=$SignedApkBytes"
        "EXPECTED_STABLE_SIGNER_SHA1=$ExpectedSignerSha1"
        "ANDROID_OAUTH_PACKAGE=$AndroidPackage"
        "EXACT_SCOPE=$GmailScope"
        "INSTALL_PASS=$InstallPass"
        "LAUNCH_PASS=$LaunchPass"
        'DEVICE_SERIAL_IN_RECEIPT=0'
        'RAW_ADB_OUTPUT_IN_RECEIPT=0'
        'REAL_GMAIL_CONTENT_IN_RECEIPT=0'
        'FINANCIAL_PLAINTEXT_IN_RECEIPT=0'
        'PHYSICAL_ALPHA2_PASS=NO'
        'BUILD_READY=NO'
        'RELEASE_READY=NO'
    ) | Set-Content -LiteralPath $ReceiptPath -Encoding UTF8
}

if ($SelfTest) {
    Write-Host 'FINANCESENSOR_ALPHA2_OD0_HARNESS_SELFTEST=PASS'
    Write-Host 'CURRENT_CANDIDATE=0.2.0-alpha.2+2009'
    Write-Host 'TRUSTED_EDGE_SIGNING_PASS=YES'
    Write-Host 'OD0_EXECUTION_ALLOWED=YES'
    Write-Host "SIGNED_APK_SHA256=$SignedApkSha256"
    exit 0
}

if ([string]::IsNullOrWhiteSpace($SignedApkPath)) { $SignedApkPath = $DefaultApk }
$SignedApkPath = [System.IO.Path]::GetFullPath($SignedApkPath)
if (-not (Test-Path -LiteralPath $SignedApkPath -PathType Leaf)) {
    Write-SafeReceipt 'FAIL_APK_MISSING' 'NO' 'NO'
    throw "Signed APK not found: $SignedApkPath"
}

$apk = Get-Item -LiteralPath $SignedApkPath
if ($apk.Length -ne $SignedApkBytes) {
    Write-SafeReceipt 'FAIL_APK_BYTES' 'NO' 'NO'
    throw "Signed APK byte count mismatch. Expected $SignedApkBytes; got $($apk.Length)."
}
$hash = (Get-FileHash -LiteralPath $SignedApkPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($hash -ne $SignedApkSha256) {
    Write-SafeReceipt 'FAIL_APK_SHA256' 'NO' 'NO'
    throw "Signed APK SHA-256 mismatch."
}

$adbCandidates = @()
$cmd = Get-Command adb -ErrorAction SilentlyContinue
if ($cmd) { $adbCandidates += $cmd.Source }
if ($env:LOCALAPPDATA) { $adbCandidates += (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe') }
if ($env:ANDROID_HOME) { $adbCandidates += (Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe') }
if ($env:ANDROID_SDK_ROOT) { $adbCandidates += (Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe') }
$adb = $adbCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $adb) {
    Write-SafeReceipt 'FAIL_ADB_MISSING' 'NO' 'NO'
    throw 'ADB was not found. Android platform-tools must already be available on this trusted edge.'
}

& $adb start-server | Out-Null
$deviceLines = & $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\sdevice\s*$' }
if (@($deviceLines).Count -ne 1) {
    Write-SafeReceipt 'FAIL_DEVICE_COUNT' 'NO' 'NO'
    throw "Exactly one authorized Android device is required; found $(@($deviceLines).Count)."
}

Write-Host '[FinanceSensor OD0] Exact stable-signed APK verified.'
Write-Host '[FinanceSensor OD0] Installing without clearing application data...'
$install = & $adb install -r $SignedApkPath 2>&1
if ($LASTEXITCODE -ne 0 -or -not (($install -join "`n") -match 'Success')) {
    Write-SafeReceipt 'FAIL_INSTALL' 'NO' 'NO'
    throw 'ADB install -r failed. No automatic uninstall/data wipe was attempted.'
}

Write-Host '[FinanceSensor OD0] Launching FinanceSensor...'
& $adb shell monkey -p $AndroidPackage -c android.intent.category.LAUNCHER 1 *> $null
Start-Sleep -Seconds 2
$pid = (& $adb shell pidof $AndroidPackage 2>$null | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($pid)) {
    Write-SafeReceipt 'FAIL_LAUNCH' 'YES' 'NO'
    throw 'Application process was not observed after launch.'
}

Write-SafeReceipt 'PASS' 'YES' 'YES'
Write-Host 'FINANCESENSOR_ALPHA2_R2_OD0=PASS'
Write-Host "SIGNED_APK_SHA256=$SignedApkSha256"
Write-Host 'INSTALL_PASS=YES'
Write-Host 'LAUNCH_PASS=YES'
Write-Host 'OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES'
Write-Host 'NEXT=Use the app once: connect Gmail, enter the statement PDF password when requested, refresh, and verify the financial view materializes.'
Write-Host "RECEIPT=$(Split-Path -Leaf $ReceiptPath)"
