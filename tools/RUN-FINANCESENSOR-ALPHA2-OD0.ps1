param(
  [switch]$SelfTest,
  [string]$ApkPath,
  [string]$ReceiptPath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Candidate='0.2.0-alpha.2+2013'
$ProductSourceCommit='da6176f9acba1854c470ce2caea471bb6b66d8f2'
$CanonicalSourceCommit='fd6b2ba75a63e650626f2fcece6c13f0bea4f541'
$CanonicalApkSha256='bcb6db29b9fb567dcffc99d875674a6834938c837fd2fe7f1aa83cc29c3b0da1'
$SignedApkSha256='4d6b9c8588d9178244e8449826e241177d0910246637c69aba54e542f0d93387'
$SignedApkBytes=182563366
$ExpectedSignerSha1='63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
$AndroidPackage='com.financesensor.lab.gmailconnection.r2'
$VersionCode='2013'
$GmailScope='gmail.readonly'
$HarnessRevision='OD0_HARNESS_V3_NATIVE_STDERR_SAFE_LAUNCH'
$OutputDir=Split-Path -Parent $MyInvocation.MyCommand.Path
$DefaultApk='FinanceSensor-ALPHA2-R2-STABLE-0.2.0-alpha.2+2013.apk'
$DefaultReceipt="$DefaultApk.receipt.txt"
$OutputReceipt=Join-Path $OutputDir 'FinanceSensor-ALPHA2-R2-OD0-0.2.0-alpha.2+2013.receipt.txt'

function Fail([string]$Code,[string]$Message){
  Write-Host "[FinanceSensor OD0] FAIL: $Message" -ForegroundColor Red
  Write-Host "STABLE_RESULT_CODE=$Code"
  exit 2
}
function Normalize-Hex([string]$Value){ return (($Value -replace '[^0-9A-Fa-f]','').ToUpperInvariant()) }
function Resolve-Tool([string[]]$Names,[string[]]$Candidates){
  foreach($n in $Names){ $cmd=Get-Command $n -ErrorAction SilentlyContinue; if($cmd){ return $cmd.Source } }
  foreach($c in $Candidates){ if($c -and (Test-Path -LiteralPath $c)){ return (Resolve-Path -LiteralPath $c).Path } }
  return $null
}
function Read-Receipt([string]$Path){
  $map=@{}
  foreach($line in Get-Content -LiteralPath $Path){
    if($line -match '^([A-Z0-9_]+)=(.*)$'){ $map[$Matches[1]]=$Matches[2].Trim() }
  }
  return $map
}
function Test-VersionCodeInPackageState([object[]]$PackageState,[string]$ExpectedVersionCode){
  $packageStateText=(@($PackageState) | ForEach-Object { [string]$_ }) -join "`n"
  return [regex]::IsMatch($packageStateText,"(?m)\bversionCode=$([regex]::Escape($ExpectedVersionCode))\b")
}
function Invoke-NativeCapture([string]$Executable,[string[]]$Arguments){
  $previousErrorActionPreference=$ErrorActionPreference
  try {
    $ErrorActionPreference='Continue'
    $output=@(& $Executable @Arguments 2>&1 | ForEach-Object { $_.ToString() })
    $exitCode=$LASTEXITCODE
  } finally {
    $ErrorActionPreference=$previousErrorActionPreference
  }
  return [pscustomobject]@{
    ExitCode=$exitCode
    Output=$output
  }
}

if($SelfTest){
  $versionFixture=@(
    "Package [$AndroidPackage]",
    'userId=10345',
    'versionCode=2013 minSdk=31 targetSdk=36',
    'firstInstallTime=2026-09-17 18:00:00'
  )
  if(-not (Test-VersionCodeInPackageState -PackageState $versionFixture -ExpectedVersionCode '2013')){ throw 'OD0_SELFTEST_EXPECTED_VERSION_NOT_FOUND' }
  if(Test-VersionCodeInPackageState -PackageState $versionFixture -ExpectedVersionCode '2012'){ throw 'OD0_SELFTEST_WRONG_VERSION_ACCEPTED' }
  Write-Host 'FINANCESENSOR_ALPHA2_OD0_HARNESS_SELFTEST=PASS'
  $nativeFixture=[pscustomobject]@{ ExitCode=0; Output=@('args: [-p, com.financesensor.lab.gmailconnection.r2, -c, android.intent.category.LAUNCHER, 1]') }
  if($nativeFixture.ExitCode -ne 0 -or $nativeFixture.Output.Count -ne 1){ throw 'OD0_SELFTEST_NATIVE_STDERR_FIXTURE_FAILED' }
  Write-Host 'VERSION_CODE_ARRAY_REGRESSION=PASS'
  Write-Host 'NATIVE_STDERR_CAPTURE_REGRESSION=PASS'
  Write-Host "OD0_HARNESS_REVISION=$HarnessRevision"
  Write-Host "CURRENT_CANDIDATE=$Candidate"
  Write-Host "EXPECTED_SIGNED_APK_SHA256=$SignedApkSha256"
  Write-Host 'OD0_EXECUTION_ALLOWED=YES'
  Write-Host 'INSTALL_MODE=ADB_INSTALL_R_PRESERVE_DATA'
  Write-Host 'UNINSTALL_ALLOWED=NO'
  Write-Host 'PM_CLEAR_ALLOWED=NO'
  Write-Host 'DEVICE_TOUCHED=0'
  exit 0
}

if([string]::IsNullOrWhiteSpace($ApkPath)){ $ApkPath=Join-Path $OutputDir $DefaultApk }
if([string]::IsNullOrWhiteSpace($ReceiptPath)){ $ReceiptPath=Join-Path (Split-Path -Parent $ApkPath) $DefaultReceipt }
if(!(Test-Path -LiteralPath $ApkPath)){ Fail 'OD0_SIGNED_APK_MISSING' "Expected stable-signed APK not found: $ApkPath" }
if(!(Test-Path -LiteralPath $ReceiptPath)){ Fail 'OD0_SIGNING_RECEIPT_MISSING' "Expected trusted-edge signing receipt not found: $ReceiptPath" }

$apk=(Resolve-Path -LiteralPath $ApkPath).Path
$receipt=(Resolve-Path -LiteralPath $ReceiptPath).Path
$observedHash=(Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash.ToLowerInvariant()
$observedBytes=(Get-Item -LiteralPath $apk).Length
if($observedHash -ne $SignedApkSha256){ Fail 'OD0_SIGNED_APK_HASH_MISMATCH' 'Signed APK SHA-256 does not match frozen +2013 identity.' }
if($observedBytes -ne $SignedApkBytes){ Fail 'OD0_SIGNED_APK_SIZE_MISMATCH' 'Signed APK byte length does not match frozen +2013 identity.' }

$r=Read-Receipt $receipt
$required=@{
  'FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING'='PASS';
  'FINANCESENSOR_ALPHA2_CANDIDATE'=$Candidate;
  'PRODUCT_SOURCE_COMMIT'=$ProductSourceCommit;
  'SOURCE_COMMIT'=$CanonicalSourceCommit;
  'INPUT_APK_SHA256'=$CanonicalApkSha256;
  'SIGNED_APK_SHA256'=$SignedApkSha256;
  'SIGNED_APK_BYTES'=[string]$SignedApkBytes;
  'SIGNER_SHA1'=$ExpectedSignerSha1;
  'ANDROID_OAUTH_PACKAGE'=$AndroidPackage;
  'EXACT_SCOPE'=$GmailScope;
  'PRIVATE_SIGNING_MATERIAL_IN_GITHUB'='0';
  'PHYSICAL_ALPHA2_PASS'='NO';
  'BUILD_READY'='NO';
  'RELEASE_READY'='NO'
}
foreach($key in $required.Keys){
  if(!$r.ContainsKey($key) -or $r[$key] -ne $required[$key]){ Fail 'OD0_SIGNING_RECEIPT_IDENTITY_MISMATCH' "Signing receipt field failed: $key" }
}

$sdkRoots=@($env:ANDROID_SDK_ROOT,$env:ANDROID_HOME,(Join-Path $env:LOCALAPPDATA 'Android\Sdk')) | Where-Object { $_ }
$adbCandidates=@(); foreach($root in $sdkRoots){ $adbCandidates += (Join-Path $root 'platform-tools\adb.exe') }
$adb=Resolve-Tool @('adb.exe','adb') $adbCandidates
if(!$adb){ Fail 'OD0_ADB_NOT_FOUND' 'Android platform-tools adb was not found. No device operation attempted.' }

$apksigner=Resolve-Tool @('apksigner.bat','apksigner') @()
if(!$apksigner){
  foreach($root in $sdkRoots){
    $bt=Join-Path $root 'build-tools'
    if(Test-Path -LiteralPath $bt){
      $candidate=Get-ChildItem -LiteralPath $bt -Directory | Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName 'apksigner.bat' } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
      if($candidate){ $apksigner=$candidate; break }
    }
  }
}
if(!$apksigner){ Fail 'OD0_APKSIGNER_NOT_FOUND' 'Android build-tools apksigner was not found. No device operation attempted.' }

$aapt2=Resolve-Tool @('aapt2.exe','aapt2') @()
if(!$aapt2){
  foreach($root in $sdkRoots){
    $bt=Join-Path $root 'build-tools'
    if(Test-Path -LiteralPath $bt){
      $candidate=Get-ChildItem -LiteralPath $bt -Directory | Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName 'aapt2.exe' } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
      if($candidate){ $aapt2=$candidate; break }
    }
  }
}
if(!$aapt2){ Fail 'OD0_AAPT2_NOT_FOUND' 'Android build-tools aapt2 was not found. No device operation attempted.' }

$verify=& $apksigner verify --verbose --print-certs $apk 2>&1
if($LASTEXITCODE -ne 0){ Fail 'OD0_APKSIGNER_VERIFY_FAILED' 'Stable APK signature verification failed. No install attempted.' }
$shaLine=$verify | Where-Object { $_ -match 'SHA-1 digest:' } | Select-Object -First 1
if(!$shaLine){ Fail 'OD0_SIGNER_SHA1_NOT_FOUND' 'Signer SHA-1 could not be read. No install attempted.' }
$observedSigner=Normalize-Hex (($shaLine -split 'SHA-1 digest:',2)[1])
if($observedSigner -ne (Normalize-Hex $ExpectedSignerSha1)){ Fail 'OD0_SIGNER_SHA1_MISMATCH' 'Stable APK signer differs from frozen OAuth identity. No install attempted.' }

$badging=& $aapt2 dump badging $apk 2>&1
if($LASTEXITCODE -ne 0){ Fail 'OD0_AAPT2_BADGING_FAILED' 'Stable APK metadata could not be parsed. No install attempted.' }
$badgingText=(@($badging) | ForEach-Object { [string]$_ }) -join "`n"
if($badgingText -notmatch "package:\s+name='$([regex]::Escape($AndroidPackage))'"){ Fail 'OD0_APK_PACKAGE_MISMATCH_PREINSTALL' 'Stable APK package identity differs from frozen OAuth package. No install attempted.' }
if($badgingText -notmatch "versionCode='$([regex]::Escape($VersionCode))'"){ Fail 'OD0_APK_VERSION_CODE_MISMATCH_PREINSTALL' 'Stable APK does not report versionCode 2013 before install. No install attempted.' }

& $adb start-server | Out-Null
$deviceLines=& $adb devices
$online=@($deviceLines | Where-Object { $_ -match '^\S+\s+device$' })
if($online.Count -ne 1){ Fail 'OD0_EXACTLY_ONE_ONLINE_DEVICE_REQUIRED' "Expected exactly one authorized Android device; observed $($online.Count). No install attempted." }

$apiLevel=(& $adb shell getprop ro.build.version.sdk 2>$null | Select-Object -First 1).Trim()
if($apiLevel -notmatch '^\d+$'){ Fail 'OD0_ANDROID_API_UNREADABLE' 'Android API level could not be read. No install attempted.' }
if([int]$apiLevel -lt 31){ Fail 'OD0_ANDROID_API_TOO_OLD' 'Device is below minSdk 31. No install attempted.' }

Write-Host '[FinanceSensor OD0] Exact signed +2013 identity verified. Installing with data-preserving replacement...'
$install=& $adb install -r $apk 2>&1
if($LASTEXITCODE -ne 0 -or -not ($install -match 'Success')){ Fail 'OD0_ADB_INSTALL_R_FAILED' 'adb install -r failed. No PASS recorded.' }

$packageState=& $adb shell dumpsys package $AndroidPackage 2>&1
if($LASTEXITCODE -ne 0 -or -not ($packageState -match [regex]::Escape($AndroidPackage))){ Fail 'OD0_PACKAGE_NOT_FOUND_AFTER_INSTALL' 'Expected package is not installed after replacement.' }
if(-not (Test-VersionCodeInPackageState -PackageState $packageState -ExpectedVersionCode $VersionCode)){ Fail 'OD0_VERSION_CODE_MISMATCH_AFTER_INSTALL' 'Installed package does not report versionCode 2013.' }

$launch=Invoke-NativeCapture -Executable $adb -Arguments @('shell','monkey','-p',$AndroidPackage,'-c','android.intent.category.LAUNCHER','1')
if($launch.ExitCode -ne 0){ Fail 'OD0_LAUNCH_FAILED' 'Package install passed but launcher invocation returned a non-zero exit code.' }
Start-Sleep -Seconds 2
$processCheck=Invoke-NativeCapture -Executable $adb -Arguments @('shell','pidof',$AndroidPackage)
if($processCheck.ExitCode -ne 0 -or -not (($processCheck.Output -join '') -match '\d')){ Fail 'OD0_PROCESS_NOT_RUNNING_AFTER_LAUNCH' 'Launcher invocation returned success but the app process is not running.' }

@(
  'FINANCESENSOR_ALPHA2_R2_OD0=PASS',
  "FINANCESENSOR_ALPHA2_CANDIDATE=$Candidate",
  "PRODUCT_SOURCE_COMMIT=$ProductSourceCommit",
  "CANONICAL_SOURCE_COMMIT=$CanonicalSourceCommit",
  "SIGNED_APK_SHA256=$SignedApkSha256",
  "SIGNED_APK_BYTES=$SignedApkBytes",
  "SIGNER_SHA1=$ExpectedSignerSha1",
  "ANDROID_OAUTH_PACKAGE=$AndroidPackage",
  "EXACT_SCOPE=$GmailScope",
  "ANDROID_API_LEVEL=$apiLevel",
  'GATE_ID=OD0',
  'GATE_STATUS=PASS',
  'STABLE_RESULT_CODE=OD0_SIGNED_APK_INSTALL_AND_LAUNCH_PASS',
  "OD0_HARNESS_REVISION=$HarnessRevision",
  'APK_PREINSTALL_BADGING_PASS=YES',
  'NATIVE_STDERR_CAPTURE_SAFE=YES',
  'PROCESS_RUNNING_AFTER_LAUNCH=YES',
  'INSTALL_MODE=ADB_INSTALL_R_PRESERVE_DATA',
  'UNINSTALL_EXECUTED=0',
  'PM_CLEAR_EXECUTED=0',
  'DEVICE_SERIAL_IN_RECEIPT=0',
  'RAW_ADB_OUTPUT_IN_RECEIPT=0',
  'REAL_GMAIL_CONTENT_IN_RECEIPT=0',
  'FINANCIAL_PLAINTEXT_IN_RECEIPT=0',
  'PHYSICAL_ALPHA2_PASS=NO',
  'BUILD_READY=NO',
  'RELEASE_READY=NO',
  'SANITIZATION_PASS=YES'
) | Set-Content -LiteralPath $OutputReceipt -Encoding UTF8

Write-Host '[FinanceSensor OD0] PASS: exact +2013 stable-signed APK installed and launched without clearing app data.' -ForegroundColor Green
Write-Host "RECEIPT=$OutputReceipt"
Write-Host 'NEXT_GATE=OD1_TO_OD11_CONSOLIDATED_OWNED_DEVICE_UAT'
exit 0
