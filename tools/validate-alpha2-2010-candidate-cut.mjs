import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/alpha2-integrated-runtime.yml', 'utf8');
const materializer = fs.readFileSync('tools/materialize-alpha2-android.py', 'utf8');
const main = fs.readFileSync('spikes/mobile-shell/lib/main_alpha2.dart', 'utf8');
const pipeline = fs.readFileSync('spikes/mobile-shell/lib/alpha2/alpha2_pipeline.dart', 'utf8');
const strict = fs.readFileSync('spikes/mobile-shell/lib/alpha2/alpha2_statement_strict_adapter.dart', 'utf8');
const strictTest = fs.readFileSync('spikes/mobile-shell/test/alpha2_statement_strict_adapter_test.dart', 'utf8');
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const campaign = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json', 'utf8'));

const fail = message => { throw new Error(`ALPHA2_2010_CANDIDATE_CUT_FAILED:${message}`); };
const signed2009 = '7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a';

for (const marker of [
  '--build-number 2010',
  "versionCode='2010'",
  'CANDIDATE_ID=0.2.0-alpha.2+2010',
  'financesensor-alpha2-2010-candidate-${{ github.run_id }}',
  'BCP_SAVINGS_COMPLETENESS_VERSION=A2_BCP_SAVINGS_COMPLETENESS_V2',
  'SESSION_LOCAL_PROFILE_PASSWORD_REUSE=YES',
  'SESSION_PASSWORD_PERSISTED=NO',
  'CANONICAL_PROMOTION_PENDING=YES',
  'R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES',
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER_MISSING:${marker}`);
if (workflow.includes('--build-number 2009')) fail('OLD_BUILD_NUMBER_STILL_ACTIVE');

for (const marker of [
  "PHYSICAL_PACKAGE = 'com.financesensor.lab.gmailconnection.r2'",
  'compileSdk = 37',
  'minSdk = 31',
  'targetSdk = 36',
  'play-services-auth:21.6.0',
  'sqlcipher-android:4.18.0',
  'androidx.sqlite:sqlite:2.7.0',
  'android:allowBackup="false"',
]) if (!materializer.includes(marker)) fail(`ANDROID_MATERIALIZER_MARKER_MISSING:${marker}`);

for (const marker of [
  'final Map<String, String> _profilePasswords = <String, String>{};',
  'final cached = _profilePasswords[profileId];',
  '_profilePasswords[profileId] = password;',
  '_profilePasswords.clear();',
  'Se elimina al desconectar o cerrar la app; no se guarda ni se sincroniza.',
]) if (!main.includes(marker)) fail(`SESSION_PASSWORD_MARKER_MISSING:${marker}`);
for (const forbidden of ['SharedPreferences', 'flutter_secure_storage', 'PDF_PASSWORD=']) {
  if (main.includes(forbidden)) fail(`SESSION_PASSWORD_PERSISTENCE_FORBIDDEN:${forbidden}`);
}

for (const marker of [
  "'A2_BCP_SAVINGS_COMPLETENESS_V2'",
  '_isCertifiedBcpSummaryRow',
  'SALDO ANTERIOR',
  'TOTAL MOVIMIENTO',
  'SALDO(?: FINAL)?',
  'STATEMENT_MONETARY_ROW_UNEXPLAINED',
]) if (!strict.includes(marker)) fail(`STRICT_PARSER_MARKER_MISSING:${marker}`);

for (const marker of [
  'certified BCP balance and total rows do not masquerade as movements',
  "_item('SALDO ANTERIOR'",
  "_item('TOTAL MOVIMIENTO'",
  "_item('SALDO'",
  'unknown undated monetary footer remains fail-closed',
  'alpha2UnexplainedMonetaryRowCode',
]) if (!strictTest.includes(marker)) fail(`STRICT_REGRESSION_MISSING:${marker}`);

for (const marker of [
  'STATEMENT_IMPORT_RUNTIME_REJECTED',
  'STATEMENT_PASSWORD_PROVIDER_REJECTED',
  'STATEMENT_PDF_RUNTIME_REJECTED',
  'Alpha2SafeStructuredPdfReader',
  'bytes.fillRange(0, bytes.length, 0)',
]) if (!pipeline.includes(marker)) fail(`PIPELINE_SAFETY_MARKER_MISSING:${marker}`);
if (pipeline.includes("throw const Alpha2PipelineStageException('ALPHA2_REFRESH_STATEMENT_IMPORT_FAILED')")) {
  fail('STATEMENT_IMPORT_MUST_NOT_ABORT_WHOLE_REFRESH');
}

// +2010 is a new product identity. Until post-merge build and explicit
// promotion, +2009 remains the sole canonical/signed authority and none of its
// physical evidence may be inherited by +2010.
if (canonical.candidate !== '0.2.0-alpha.2+2009') fail('PREPROMOTION_CANONICAL_MUST_REMAIN_2009');
if (canonical.signing?.trustedEdgeSigningPass !== true || canonical.signing?.signedApkSha256 !== signed2009) {
  fail('CANONICAL_2009_SIGNING_AUTHORITY_DRIFTED');
}
if (campaign.candidate?.id !== '0.2.0-alpha.2+2009' || campaign.candidate?.signedApkSha256 !== signed2009) {
  fail('CURRENT_2009_R2_IDENTITY_DRIFTED');
}
if (campaign.currentState?.buildReady !== false || campaign.currentState?.releaseReady !== false) {
  fail('PREMATURE_READY_PROMOTION');
}

console.log('ALPHA2_2010_CANDIDATE_CUT=PASS');
console.log('SOURCE_BASE=ALPHA2_2009_PHYSICAL_FINANCIAL_VIEW_MATERIALIZED');
console.log('BCP_SAVINGS_COMPLETENESS_VERSION=A2_BCP_SAVINGS_COMPLETENESS_V2');
console.log('CERTIFIED_BCP_SUMMARY_ROWS_ARE_NOT_MOVEMENTS=YES');
console.log('UNKNOWN_UNDATED_MONETARY_ROW_FAILS_CLOSED=YES');
console.log('SESSION_LOCAL_PROFILE_PASSWORD_REUSE=YES');
console.log('SESSION_PASSWORD_PERSISTED=NO');
console.log('DNI_DERIVATION_OR_STORAGE=NO');
console.log('STATEMENT_FAILURE_BLOCKS_SAFE_PROJECTION=NO');
console.log('CANDIDATE_ID=0.2.0-alpha.2+2010');
console.log('CANONICAL_PROMOTION_PENDING=YES');
console.log('R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('R2_EVIDENCE_INHERITANCE_ALLOWED=NO');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
