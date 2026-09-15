param(
    [switch]$SelfTest
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Candidate = '0.2.0-alpha.2+2009'
$ProductSourceCommit = '9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f'
$CanonicalSourceCommit = 'e19bcccee13e326bbc08012533ddaeba026c633a'
$CanonicalApkSha256 = '1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717'
$ExpectedSignerSha1 = '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
$AndroidPackage = 'com.financesensor.lab.gmailconnection.r2'
$GmailScope = 'gmail.readonly'
$OutputDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($SelfTest) {
    Write-Host 'FINANCESENSOR_ALPHA2_OD0_HARNESS_SELFTEST=PASS'
    Write-Host 'CURRENT_CANDIDATE=0.2.0-alpha.2+2009'
    Write-Host 'OD0_EXECUTION_ALLOWED=NO'
    Write-Host 'BLOCKER=TRUSTED_EDGE_SIGNING_2009_REQUIRED'
    exit 0
}

$failurePath = Join-Path $OutputDir 'FinanceSensor-ALPHA2-R2-OD0-BLOCKED.txt'
@(
    'FINANCESENSOR_ALPHA2_R2_OD0=BLOCKED'
    "FINANCESENSOR_ALPHA2_CANDIDATE=$Candidate"
    "PRODUCT_SOURCE_COMMIT=$ProductSourceCommit"
    "CANONICAL_SOURCE_COMMIT=$CanonicalSourceCommit"
    "CANONICAL_UNSIGNED_APK_SHA256=$CanonicalApkSha256"
    "EXPECTED_STABLE_SIGNER_SHA1=$ExpectedSignerSha1"
    "ANDROID_OAUTH_PACKAGE=$AndroidPackage"
    "EXACT_SCOPE=$GmailScope"
    'STABLE_RESULT_CODE=OD0_BLOCKED_BY_R1_SIGNING'
    'TRUSTED_EDGE_SIGNING_PASS=NO'
    'OD0_EXECUTION_ALLOWED=NO'
    'ADB_EXECUTED=0'
    'DEVICE_TOUCHED=0'
    'DEVICE_SERIAL_IN_RECEIPT=0'
    'RAW_ADB_OUTPUT_IN_RECEIPT=0'
    'REAL_GMAIL_CONTENT_IN_RECEIPT=0'
    'FINANCIAL_PLAINTEXT_IN_RECEIPT=0'
    'PHYSICAL_ALPHA2_PASS=NO'
    'BUILD_READY=NO'
    'RELEASE_READY=NO'
) | Set-Content -LiteralPath $failurePath -Encoding UTF8

Write-Host '[FinanceSensor OD0] BLOCKED: trusted-edge signing for the exact +2009 canonical APK must PASS first.'
Write-Host '[FinanceSensor OD0] No device operation was attempted.'
Write-Host "[FinanceSensor OD0] Safe status: $(Split-Path -Leaf $failurePath)"
exit 2
