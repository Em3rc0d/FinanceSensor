param(
    [switch]$SelfTest
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Candidate = '0.2.0-alpha.2+2008'
$SourceCommit = '45b605d29fe0b90f528e4f0f952ab878080b2f0b'
$ExpectedApkSha256 = 'a6e9e9441842f9de78147d8bef0103c63c1ad5b499963303111dbb99dfcd5277'
$ExpectedApkBytes = 182538790
$ExpectedSignerSha1 = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
$AndroidPackage = 'com.financesensor.lab.gmailconnection.r2'
$GmailScope = 'gmail.readonly'
$OutputDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-SafeStatus([string]$Message) {
    Write-Host "[FinanceSensor OD0] $Message"
}

function Write-SafeFailure([string]$Code) {
    $failurePath = Join-Path $OutputDir 'FinanceSensor-ALPHA2-R2-OD0-FAILURE.txt'
    @(
        'FINANCESENSOR_ALPHA2_R2_OD0=FAIL'
        "FINANCESENSOR_ALPHA2_CANDIDATE=$Candidate"
        "SOURCE_COMMIT=$SourceCommit"
        "EXPECTED_SIGNED_APK_SHA256=$ExpectedApkSha256"
        "STABLE_RESULT_CODE=$Code"
        'SANITIZATION_PASS=true'
        'DEVICE_SERIAL_IN_RECEIPT=0'
        'RAW_ADB_OUTPUT_IN_RECEIPT=0'
        'REAL_GMAIL_CONTENT_IN_RECEIPT=0'
        'FINANCIAL_PLAINTEXT_IN_RECEIPT=0'
        'BUILD_READY=NO'
        'RELEASE_READY=NO'
    ) | Set-Content -LiteralPath $failurePath -Encoding UTF8
    Write-SafeStatus "FAIL ($Code). Return only FinanceSensor-ALPHA2-R2-OD0-FAILURE.txt."
    exit 1
}

function Normalize-Sha1([string]$Digest) {
    $hex = ($Digest -replace '[^0-9A-Fa-f]', '').ToUpperInvariant()
    if ($hex.Length -ne 40) { return '' }
    return (($hex -split '(.{2})' | Where-Object { $_ }) -join ':')
}

function Find-Adb {
    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($root in @($env:ANDROID_SDK_ROOT, $env:ANDROID_HOME, (Join-Path $env:LOCALAPPDATA 'Android\Sdk'))) {
        if (-not [string]::IsNullOrWhiteSpace($root)) {
            $candidates.Add((Join-Path $root 'platform-tools\adb.exe'))
        }
    }
    $cmd = Get-Command adb.exe -ErrorAction SilentlyContinue
    if ($cmd) { $candidates.Add($cmd.Source) }
    foreach ($candidate in $candidates | Select-Object -Unique) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    return $null
}

function Find-ApkSigner([string]$ApkDirectory) {
    $roots = @($env:ANDROID_SDK_ROOT, $env:ANDROID_HOME, (Join-Path $env:LOCALAPPDATA 'Android\Sdk')) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    foreach ($root in $roots) {
        $buildTools = Join-Path $root 'build-tools'
        if (Test-Path -LiteralPath $buildTools) {
            $found = Get-ChildItem -LiteralPath $buildTools -Directory -ErrorAction SilentlyContinue |
                Sort-Object Name -Descending |
                ForEach-Object { Join-Path $_.FullName 'apksigner.bat' } |
                Where-Object { Test-Path -LiteralPath $_ } |
                Select-Object -First 1
            if ($found) { return [pscustomobject]@{ Type = 'bat'; Path = $found } }
        }
    }
    $jarCandidates = @(
        (Join-Path $ApkDirectory 'public-signing-tool\lib\apksigner.jar'),
        (Join-Path (Split-Path -Parent $ApkDirectory) 'public-signing-tool\lib\apksigner.jar')
    )
    foreach ($jar in $jarCandidates) {
        if (Test-Path -LiteralPath $jar) { return [pscustomobject]@{ Type = 'jar'; Path = $jar } }
    }
    return $null
}

function Get-ApkSignerSha1([string]$ApkPath, $ApkSigner) {
    if ($ApkSigner.Type -eq 'bat') {
        $output = & $ApkSigner.Path verify --print-certs $ApkPath 2>&1 | Out-String
    } else {
        $java = Get-Command java.exe -ErrorAction SilentlyContinue
        if (-not $java -and $env:JAVA_HOME) {
            $javaPath = Join-Path $env:JAVA_HOME 'bin\java.exe'
            if (Test-Path -LiteralPath $javaPath) { $java = [pscustomobject]@{ Source = $javaPath } }
        }
        if (-not $java) { return $null }
        $output = & $java.Source -jar $ApkSigner.Path verify --print-certs $ApkPath 2>&1 | Out-String
    }
    $match = [regex]::Match($output, 'certificate SHA-1 digest:\s*([0-9A-Fa-f:]+)', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if (-not $match.Success) { return $null }
    return Normalize-Sha1 $match.Groups[1].Value
}

function Invoke-Adb([string]$Adb, [string]$Serial, [string[]]$Arguments) {
    $all = @()
    if ($Serial) { $all += @('-s', $Serial) }
    $all += $Arguments
    $output = & $Adb @all 2>&1 | Out-String
    return [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = $output }
}

function New-GateResults([string]$Od0Status, [string]$Od0Code) {
    $results = New-Object System.Collections.Generic.List[object]
    $results.Add([ordered]@{
        gateId = 'OD0'
        gateStatus = $Od0Status
        stableResultCode = $Od0Code
        coarseCounters = [ordered]@{
            installObservations = 1
            physicalLaunchObservations = 1
        }
    })
    foreach ($index in 1..11) {
        $results.Add([ordered]@{
            gateId = "OD$index"
            gateStatus = 'INCONCLUSIVE'
            stableResultCode = 'NOT_EXECUTED_PRIOR_GATE_OPEN'
            coarseCounters = [ordered]@{}
        })
    }
    return $results
}

if ($SelfTest) {
    if ($Candidate -ne '0.2.0-alpha.2+2008') { throw 'candidate drift' }
    if ($ExpectedApkSha256.Length -ne 64) { throw 'apk sha drift' }
    if ((Normalize-Sha1 $ExpectedSignerSha1) -ne $ExpectedSignerSha1) { throw 'signer sha1 drift' }
    $gates = New-GateResults 'PASS' 'R1_BOUND_SIGNED_APK_INSTALL_AND_LAUNCH_PASS'
    if ($gates.Count -ne 12 -or $gates[0].gateId -ne 'OD0' -or $gates[11].gateId -ne 'OD11') { throw 'gate shape drift' }
    Write-Output 'FINANCESENSOR_ALPHA2_OD0_HARNESS_SELFTEST=PASS'
    exit 0
}

Add-Type -AssemblyName System.Windows.Forms
$picker = New-Object System.Windows.Forms.OpenFileDialog
$picker.Title = 'Select FinanceSensor stable-signed Alpha.2 +2008 APK'
$picker.Filter = 'Android APK (*.apk)|*.apk'
$picker.Multiselect = $false
if ($picker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
    Write-SafeFailure 'OD0_APK_SELECTION_CANCELLED'
}
$apkPath = $picker.FileName
$apkFile = Get-Item -LiteralPath $apkPath

Write-SafeStatus 'Verifying exact stable-signed APK identity...'
$actualHash = (Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $ExpectedApkSha256) { Write-SafeFailure 'OD0_APK_SHA256_MISMATCH' }
if ($apkFile.Length -ne $ExpectedApkBytes) { Write-SafeFailure 'OD0_APK_BYTES_MISMATCH' }

$apkSigner = Find-ApkSigner $apkFile.DirectoryName
if (-not $apkSigner) { Write-SafeFailure 'OD0_APKSIGNER_NOT_FOUND' }
$actualSigner = Get-ApkSignerSha1 $apkPath $apkSigner
if (-not $actualSigner) { Write-SafeFailure 'OD0_SIGNER_READ_FAILED' }
if ($actualSigner -ne $ExpectedSignerSha1) { Write-SafeFailure 'OD0_SIGNER_SHA1_MISMATCH' }
Write-SafeStatus 'APK hash, bytes and stable signer match the certified +2008 identity.'

$adb = Find-Adb
if (-not $adb) { Write-SafeFailure 'OD0_ADB_NOT_FOUND' }
$devicesRaw = & $adb devices 2>&1 | Out-String
$deviceLines = $devicesRaw -split "`r?`n" | Where-Object { $_ -match '^\s*(\S+)\s+device\s*$' }
if ($deviceLines.Count -ne 1) { Write-SafeFailure 'OD0_EXACTLY_ONE_AUTHORIZED_DEVICE_REQUIRED' }
$serial = ([regex]::Match($deviceLines[0], '^\s*(\S+)\s+device\s*$')).Groups[1].Value

$apiResult = Invoke-Adb $adb $serial @('shell','getprop','ro.build.version.sdk')
$apiLevel = 0
if ($apiResult.ExitCode -ne 0 -or -not [int]::TryParse($apiResult.Output.Trim(), [ref]$apiLevel)) { Write-SafeFailure 'OD0_ANDROID_API_READ_FAILED' }
if ($apiLevel -lt 31) { Write-SafeFailure 'OD0_ANDROID_API_BELOW_MIN_SDK' }
Write-SafeStatus "Owned Android device authorized (API $apiLevel). Device identity is not recorded."

$existing = Invoke-Adb $adb $serial @('shell','pm','path',$AndroidPackage)
if ($existing.ExitCode -eq 0 -and $existing.Output -match 'package:') {
    Write-SafeStatus 'Removing prior app installation so OD0 starts from a clean candidate state...'
    $uninstall = Invoke-Adb $adb $serial @('uninstall',$AndroidPackage)
    if ($uninstall.ExitCode -ne 0 -or $uninstall.Output -notmatch 'Success') { Write-SafeFailure 'OD0_PRIOR_INSTALL_REMOVAL_FAILED' }
}

Write-SafeStatus 'Installing exact stable-signed +2008 APK...'
$install = Invoke-Adb $adb $serial @('install',$apkPath)
if ($install.ExitCode -ne 0 -or $install.Output -notmatch 'Success') { Write-SafeFailure 'OD0_INSTALL_FAILED' }
$installed = Invoke-Adb $adb $serial @('shell','pm','path',$AndroidPackage)
if ($installed.ExitCode -ne 0 -or $installed.Output -notmatch 'package:') { Write-SafeFailure 'OD0_PACKAGE_RESOLUTION_FAILED' }

Write-SafeStatus 'Launching FinanceSensor...'
$launch = Invoke-Adb $adb $serial @('shell','monkey','-p',$AndroidPackage,'-c','android.intent.category.LAUNCHER','1')
if ($launch.ExitCode -ne 0 -or $launch.Output -notmatch 'Events injected:\s*1') { Write-SafeFailure 'OD0_LAUNCH_FAILED' }
Start-Sleep -Seconds 3
$process = Invoke-Adb $adb $serial @('shell','pidof',$AndroidPackage)
if ($process.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($process.Output)) { Write-SafeFailure 'OD0_APP_PROCESS_NOT_OBSERVED' }

$receiptDate = Get-Date -Format 'yyyy-MM-dd'
$receiptPath = Join-Path $OutputDir "ALPHA2-R2-OWNED-ANDROID-OD0-$receiptDate.json"
$receipt = [ordered]@{
    schemaVersion = 'A2_R2_SANITIZED_RECEIPT_V1'
    candidateId = $Candidate
    sourceCommit = $SourceCommit
    signedApkSha256 = $ExpectedApkSha256
    signedApkBytes = $ExpectedApkBytes
    signerSha1 = $ExpectedSignerSha1
    androidPackage = $AndroidPackage
    gmailScope = $GmailScope
    deviceClass = 'OWNED_ANDROID_PHONE'
    androidApiLevel = $apiLevel
    gateResults = @(New-GateResults 'PASS' 'R1_BOUND_SIGNED_APK_INSTALL_AND_LAUNCH_PASS')
    sanitizationPass = $true
}
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $receiptPath -Encoding UTF8

Write-SafeStatus 'OD0 PASS: exact APK installed and launched on the owned Android device.'
Write-SafeStatus "Return only: $(Split-Path -Leaf $receiptPath)"
Write-Host 'FINANCESENSOR_ALPHA2_R2_OD0=PASS'
Write-Host "SIGNED_APK_SHA256=$ExpectedApkSha256"
Write-Host 'DEVICE_SERIAL_IN_RECEIPT=0'
Write-Host 'RAW_ADB_OUTPUT_IN_RECEIPT=0'
Write-Host 'BUILD_READY=NO'
Write-Host 'RELEASE_READY=NO'
