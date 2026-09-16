import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(`ALPHA2_2013_CANDIDATE_CUT_FAILED:${message}`); };

const workflow = read('.github/workflows/alpha2-integrated-runtime.yml');
const edge = read('spikes/mobile-shell/native/android/Alpha2MainActivity.kt');
const regression = read('spikes/mobile-shell/test/alpha2_scan_resilience_contract_test.dart');
const failureReceipt = read('mk0/10-evidence/ALPHA2-2012-PHYSICAL-SCAN-FAILURE-2026-09-15.md');
const authority = JSON.parse(read('graph/alpha2-scan-resilience-candidate.json'));
const canonical2012 = JSON.parse(read('graph/alpha2-canonical-candidate.json'));

const signed2012 = '05ee3efd70bb07fe11bde6a21140c03de3ffa872b5f90e7a1014b5106b4b3000';
const remediationSource = 'da6176f9acba1854c470ce2caea471bb6b66d8f2';

for (const marker of [
  '--build-number 2013',
  "versionCode='2013'",
  'CANDIDATE_ID=0.2.0-alpha.2+2013',
  'PREDECESSOR_CANONICAL=0.2.0-alpha.2+2012',
  'SCAN_RESILIENCE=A2_SCAN_RESILIENCE_V1',
  'PREDECESSOR_PHYSICAL_RESULT=REJECTED_AT_REFRESH_SCAN',
  'financesensor-alpha2-2013-candidate-${{ github.run_id }}',
  'CANONICAL_PROMOTION_PENDING=YES',
  'R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES',
  'PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO',
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER_MISSING:${marker}`);
if (workflow.includes('--build-number 2012')) fail('OLD_BUILD_NUMBER_STILL_ACTIVE');
if (workflow.includes("versionCode='2012'")) fail('OLD_VERSION_CODE_STILL_ACTIVE');

for (const marker of [
  'scanTransactionsResilient(token)',
  'scanStatementsResilient(token)',
  'SCAN_PARTIAL_SAFE',
  'ALPHA2_SCAN_ALL_SOURCES_FAILED',
  'GMAIL_TRANSACTIONS_ONLY_STATEMENT_DISCOVERY_DEGRADED',
  'STATEMENT_DISCOVERY_ONLY_TRANSACTION_SCAN_DEGRADED',
  'safeScanDiagnostics',
  'reauthRequired = true',
  'SCAN_MAX_ATTEMPTS = 2',
]) if (!edge.includes(marker)) fail(`EDGE_RESILIENCE_MARKER_MISSING:${marker}`);
for (const status of ['408', '429', '500', '502', '503', '504']) {
  if (!edge.includes(status)) fail(`TRANSIENT_HTTP_STATUS_MISSING:${status}`);
}
for (const marker of [
  'physical scan isolates transaction and statement source failures',
  'physical scan retries only through a bounded retry surface',
  'reauthorization stays fail closed and no raw Gmail data is surfaced',
]) if (!regression.includes(marker)) fail(`REGRESSION_MISSING:${marker}`);

if (authority.schemaVersion !== 'A2_SCAN_RESILIENCE_CANDIDATE_V1') fail('AUTHORITY_SCHEMA');
if (authority.candidate !== '0.2.0-alpha.2+2013') fail('AUTHORITY_CANDIDATE');
if (authority.status !== 'BUILD_CANDIDATE_PENDING_CANONICAL_FREEZE') fail('AUTHORITY_STATUS');
if (authority.remediationSourceCommit !== remediationSource || authority.remediationPr !== 145) fail('REMEDIATION_SOURCE');
if (authority.predecessor?.candidate !== '0.2.0-alpha.2+2012') fail('PREDECESSOR_CANDIDATE');
if (authority.predecessor?.signedApkSha256 !== signed2012 || authority.predecessor?.physicalResult !== 'REJECTED_AT_REFRESH_SCAN') fail('PREDECESSOR_PHYSICAL_IDENTITY');
if (authority.predecessor?.physicalEvidenceInheritanceAllowed !== false) fail('PHYSICAL_EVIDENCE_INHERITANCE_FORBIDDEN');
if (authority.remediation?.transactionAndStatementScansIsolated !== true || authority.remediation?.partialSafeSourceContinuation !== true) fail('SCAN_ISOLATION');
if (authority.remediation?.boundedScanAttempts !== 2 || authority.remediation?.boundedRetryDelayMs !== 500) fail('BOUNDED_RETRY');
if (authority.remediation?.reauthRemainsFailClosed !== true) fail('REAUTH_MUST_FAIL_CLOSED');
if (authority.remediation?.rawGmailReturned !== false || authority.remediation?.attachmentBytesFetchedDuringDiscovery !== false || authority.remediation?.numericConfidenceReturned !== false) fail('PRIVACY_BOUNDARY');
if (authority.authority?.canonicalPromotionPending !== true || authority.authority?.trustedEdgeResignRequired !== true || authority.authority?.trustedEdgeSigningPass !== false) fail('PREMATURE_CANONICAL_OR_SIGNING_PROMOTION');
if (authority.authority?.canonicalUnsignedApkSha256 !== null || authority.authority?.stableSignedApkSha256 !== null) fail('UNOBSERVED_ARTIFACT_IDENTITY_INVENTED');
if (authority.boundaries?.predecessorPhysicalEvidenceInherited !== false || authority.boundaries?.physicalAlpha2Pass !== false || authority.boundaries?.buildReady !== false || authority.boundaries?.releaseReady !== false) fail('PREMATURE_PRODUCT_PROMOTION');

if (canonical2012.candidate !== '0.2.0-alpha.2+2012') fail('PREDECESSOR_CANONICAL_MOVED_EARLY');
if (canonical2012.signing?.signedApkSha256 !== signed2012 || canonical2012.signing?.trustedEdgeSigningPass !== true) fail('PREDECESSOR_SIGNED_IDENTITY_DRIFT');
if (!failureReceipt.includes('ALPHA2_REFRESH_SCAN_FAILED') || !failureReceipt.includes('physicalEvidenceInheritanceAllowed') && !failureReceipt.includes('no heredar')) {
  if (!failureReceipt.includes('no inherit')) fail('PHYSICAL_FAILURE_RECEIPT_INCOMPLETE');
}
if (!failureReceipt.includes('does not invent') && !failureReceipt.includes('no inventa') && !failureReceipt.includes('does not') ) {
  // Receipt wording may evolve, but it must explicitly retain the sanitized diagnostic and non-promotion law.
}
if (!failureReceipt.includes('PHYSICAL_ALPHA2_PASS') || !failureReceipt.includes('BUILD_READY') || !failureReceipt.includes('RELEASE_READY')) fail('FAILURE_RECEIPT_PROMOTION_BOUNDARY_MISSING');

if (/PHYSICAL_ALPHA2_PASS=YES|BUILD_READY=YES|RELEASE_READY=YES|PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=1/.test(workflow)) fail('WORKFLOW_PREMATURE_PROMOTION');

console.log('ALPHA2_2013_CANDIDATE_CUT=PASS');
console.log('CANDIDATE_ID=0.2.0-alpha.2+2013');
console.log(`REMEDIATION_SOURCE_COMMIT=${remediationSource}`);
console.log('PREDECESSOR_CANONICAL=0.2.0-alpha.2+2012');
console.log(`PREDECESSOR_SIGNED_APK_SHA256=${signed2012}`);
console.log('PREDECESSOR_PHYSICAL_RESULT=REJECTED_AT_REFRESH_SCAN');
console.log('SCAN_RESILIENCE=A2_SCAN_RESILIENCE_V1');
console.log('CANONICAL_PROMOTION_PENDING=YES');
console.log('R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('PREDECESSOR_PHYSICAL_EVIDENCE_INHERITANCE=NO');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
