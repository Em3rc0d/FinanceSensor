param([switch]$SelfTest)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Candidate='0.2.0-alpha.2+2012'
$ProductSourceCommit='e46eef4f406dec3220d3f1a2bda51bf7a4fd7202'
$CanonicalSourceCommit='b75cc39318ee749a1123971f19d895d71e35bd91'
$CanonicalApkSha256='74e690e9858fd0ef72d0e39f0863371fa1f1f9cfa726a5078e237d33439c587e'
$ExpectedSignerSha1='63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
$AndroidPackage='com.financesensor.lab.gmailconnection.r2'
$GmailScope='gmail.readonly'
$OutputDir=Split-Path -Parent $MyInvocation.MyCommand.Path
if($SelfTest){
  Write-Host 'FINANCESENSOR_ALPHA2_OD0_HARNESS_SELFTEST=PASS'
  Write-Host "CURRENT_CANDIDATE=$Candidate"
  Write-Host 'OD0_EXECUTION_ALLOWED=NO'
  Write-Host 'BLOCKER=TRUSTED_EDGE_SIGNING_2012_REQUIRED'
  exit 0
}
$path=Join-Path $OutputDir 'FinanceSensor-ALPHA2-R2-OD0-BLOCKED.txt'
@(
 'FINANCESENSOR_ALPHA2_R2_OD0=BLOCKED',
 "FINANCESENSOR_ALPHA2_CANDIDATE=$Candidate",
 "PRODUCT_SOURCE_COMMIT=$ProductSourceCommit",
 "CANONICAL_SOURCE_COMMIT=$CanonicalSourceCommit",
 "CANONICAL_UNSIGNED_APK_SHA256=$CanonicalApkSha256",
 "EXPECTED_STABLE_SIGNER_SHA1=$ExpectedSignerSha1",
 "ANDROID_OAUTH_PACKAGE=$AndroidPackage",
 "EXACT_SCOPE=$GmailScope",
 'STABLE_RESULT_CODE=OD0_BLOCKED_BY_R1_SIGNING',
 'TRUSTED_EDGE_SIGNING_PASS=NO','OD0_EXECUTION_ALLOWED=NO','ADB_EXECUTED=0','DEVICE_TOUCHED=0',
 'DEVICE_SERIAL_IN_RECEIPT=0','RAW_ADB_OUTPUT_IN_RECEIPT=0','REAL_GMAIL_CONTENT_IN_RECEIPT=0','FINANCIAL_PLAINTEXT_IN_RECEIPT=0',
 'PHYSICAL_ALPHA2_PASS=NO','BUILD_READY=NO','RELEASE_READY=NO'
) | Set-Content -LiteralPath $path -Encoding UTF8
Write-Host '[FinanceSensor OD0] BLOCKED: trusted-edge signing for exact +2012 must PASS first.'
Write-Host '[FinanceSensor OD0] No device operation was attempted.'
exit 2
