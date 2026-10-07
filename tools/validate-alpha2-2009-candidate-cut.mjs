import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';
import './validate-alpha2-od3-mobile-fetch-remediation.mjs';
import './validate-alpha2-human-intervention-gate.mjs';

const workflow = fs.readFileSync('.github/workflows/alpha2-integrated-runtime.yml', 'utf8');
const pipeline = fs.readFileSync('spikes/mobile-shell/lib/alpha2/alpha2_pipeline.dart', 'utf8');
const projection = fs.readFileSync('spikes/mobile-shell/lib/alpha2/alpha2_projection.dart', 'utf8');
const pdfReader = fs.readFileSync('spikes/mobile-shell/lib/alpha2/alpha2_statement_pdf_reader.dart', 'utf8');
const regression = fs.readFileSync('spikes/mobile-shell/test/alpha2_statement_import_isolation_test.dart', 'utf8');
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const campaign = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json', 'utf8'));
const observation = JSON.parse(fs.readFileSync('graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-POSTPASSWORD-IMPORT-FAILURE-2008-2026-09-14.json', 'utf8'));
const fail = message => { throw new Error(`ALPHA2_2009_CANDIDATE_CUT_FAILED:${message}`); };
const signed2008 = 'a6e9e9441842f9de78147d8bef0103c63c1ad5b499963303111dbb99dfcd5277';

for (const marker of [
  '--build-number 2009',
  "versionCode='2009'",
  'CANDIDATE_ID=0.2.0-alpha.2+2009',
  'financesensor-alpha2-2009-candidate-${{ github.run_id }}',
  'CANONICAL_PROMOTION_PENDING=YES',
  'R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES',
  'POST_PASSWORD_IMPORT_ISOLATION=YES',
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER_MISSING:${marker}`);
if (workflow.includes('--build-number 2008')) fail('OLD_BUILD_NUMBER_STILL_ACTIVE');

for (const marker of [
  'class Alpha2PipelineStageException',
  'ALPHA2_REFRESH_VAULT_INIT_FAILED',
  'ALPHA2_REFRESH_SCAN_FAILED',
  'ALPHA2_REFRESH_GMAIL_PERSIST_FAILED',
  'ALPHA2_REFRESH_VAULT_READ_FAILED',
  'ALPHA2_REFRESH_VAULT_DECODE_FAILED',
  'ALPHA2_REFRESH_RUNTIME_FAILED',
  'ALPHA2_REFRESH_PRODUCT_GATE_FAILED',
  'ALPHA2_REFRESH_PROJECTION_FAILED',
  'STATEMENT_IMPORT_RUNTIME_REJECTED',
  'STATEMENT_PASSWORD_PROVIDER_REJECTED',
  'STATEMENT_SOURCE_RECEIPT_REJECTED',
  'STATEMENT_PDF_RUNTIME_REJECTED',
  'STATEMENT_ENCRYPTED_PERSISTENCE_REJECTED',
  'Alpha2SafeStructuredPdfReader',
  'Future<void> _safeRelease(String handle)',
]) if (!pipeline.includes(marker)) fail(`PIPELINE_ISOLATION_MARKER_MISSING:${marker}`);
if (pipeline.includes('ALPHA2_REFRESH_STATEMENT_IMPORT_FAILED')) fail('STATEMENT_IMPORT_MUST_NOT_ABORT_WHOLE_REFRESH');

for (const marker of [
  'class Alpha2PublicDashboardProjection',
  'buildAlpha2PublicProjection',
  "'STATEMENT_PDF_REJECTED'",
  "'STATEMENT_STRICT_REVIEW_REQUIRED'",
]) if (!projection.includes(marker)) fail(`PROJECTION_ISOLATION_MARKER_MISSING:${marker}`);

for (const marker of [
  'class Alpha2SafeStructuredPdfReader',
  'await document?.dispose()',
  'catch (_)',
  'workingBytes.fillRange(0, workingBytes.length, 0)',
]) if (!pdfReader.includes(marker)) fail(`PDF_READER_SAFETY_MARKER_MISSING:${marker}`);

for (const marker of [
  'unexpected PDF runtime failure is candidate-local and Gmail evidence still reaches dashboard projection',
  'password-provider runtime failure is sanitized and cannot abort dashboard projection',
  'result.projection.transactions',
  'result.projection.cashflow',
  "gap.reason == 'STATEMENT_PDF_REJECTED'",
  "gap.reason == 'STATEMENT_STRICT_REVIEW_REQUIRED'",
  'alpha2StatementPdfRuntimeRejected',
  'alpha2StatementPasswordProviderRejected',
]) if (!regression.includes(marker)) fail(`REGRESSION_TEST_MISSING:${marker}`);

if (canonical.candidate !== '0.2.0-alpha.2+2008') fail('PREPROMOTION_CANONICAL_MUST_REMAIN_2008');
if (canonical.sourceCommit !== '45b605d29fe0b90f528e4f0f952ab878080b2f0b') fail('CANONICAL_2008_SOURCE_DRIFTED');
if (canonical.authority?.apkSha256 !== 'eb4afc91357204419b3693efa973ba5bbcbd09a8037c3932269cea25363e7238' || canonical.authority?.apkBytes !== 182515867) fail('CANONICAL_2008_APK_IDENTITY_DRIFTED');
if (canonical.signing?.trustedEdgeSigningPass !== true || canonical.signing?.signedApkSha256 !== signed2008) fail('CANONICAL_2008_SIGNING_AUTHORITY_DRIFTED');
if (campaign.candidate?.id !== '0.2.0-alpha.2+2008' || campaign.candidate?.signedApkSha256 !== signed2008 || campaign.status !== 'IN_PROGRESS') fail('CURRENT_2008_R2_STATE_DRIFTED');
if (campaign.currentState?.buildReady !== false || campaign.currentState?.releaseReady !== false) fail('PREMATURE_READY_PROMOTION');

if (observation.candidateId !== '0.2.0-alpha.2+2008' || observation.signedApkSha256 !== signed2008) fail('PHYSICAL_OBSERVATION_IDENTITY_DRIFTED');
if (observation.gateStatus !== 'INCONCLUSIVE' || observation.stableResultCode !== 'POSTPASSWORD_STATEMENT_IMPORT_ABORTED_REFRESH') fail('PHYSICAL_OBSERVATION_CLASSIFICATION_DRIFTED');
if (observation.observations?.passwordValueCaptured !== false || observation.observations?.dashboardProjectionRendered !== false) fail('PHYSICAL_OBSERVATION_PRIVACY_OR_RESULT_DRIFTED');
if (observation.interpretation?.r2PassProven !== false || observation.interpretation?.candidateBlocked !== true) fail('PHYSICAL_OBSERVATION_MUST_BLOCK_2008');
if (observation.privacy?.rawScreenshotInGitHub !== false || observation.privacy?.pdfPasswordInGitHub !== false || observation.privacy?.financialPlaintextInGitHub !== false) fail('PHYSICAL_OBSERVATION_SANITIZATION_DRIFTED');

console.log('ALPHA2_2009_CANDIDATE_CUT=PASS');
console.log('SOURCE_BASE=ALPHA2_2008_POSTPASSWORD_IMPORT_FAILURE');
console.log('POST_PASSWORD_IMPORT_ISOLATION=GATED');
console.log('SYNTHETIC_DASHBOARD_PROJECTION_AFTER_STATEMENT_FAILURE=GATED');
console.log('STATEMENT_FAILURE_BLOCKS_SAFE_PROJECTION=NO');
console.log('HUMAN_INTERVENTION_POLICY=EXCEPTION_ONLY_CERTIFICATION');
console.log('HUMAN_DISCOVERY_TESTING=FORBIDDEN');
console.log('SIGNING_REQUEST_ALLOWED=NO_UNTIL_EXPLICIT_GATE_PASS');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO_UNTIL_EXPLICIT_GATE_PASS');
console.log('CANDIDATE_ID=0.2.0-alpha.2+2009');
console.log('CANONICAL_PROMOTION_PENDING=YES');
console.log('R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('R2_EVIDENCE_INHERITANCE_ALLOWED=NO');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
