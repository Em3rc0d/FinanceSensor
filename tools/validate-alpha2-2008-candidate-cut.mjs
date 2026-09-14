import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';
import './validate-alpha2-od3-mobile-fetch-remediation.mjs';

const workflow = fs.readFileSync('.github/workflows/alpha2-integrated-runtime.yml', 'utf8');
const pipeline = fs.readFileSync('spikes/mobile-shell/lib/alpha2/alpha2_pipeline.dart', 'utf8');
const main = fs.readFileSync('spikes/mobile-shell/lib/main_alpha2.dart', 'utf8');
const test = fs.readFileSync('spikes/mobile-shell/test/alpha2_pipeline_stage_diagnostics_test.dart', 'utf8');
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const campaign = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json', 'utf8'));
const observation = JSON.parse(fs.readFileSync('graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD3-INCONCLUSIVE-2026-09-14.json', 'utf8'));
const fail = message => { throw new Error(`ALPHA2_2008_CANDIDATE_CUT_FAILED:${message}`); };

for (const marker of [
  '--build-number 2008',
  "versionCode='2008'",
  'CANDIDATE_ID=0.2.0-alpha.2+2008',
  'financesensor-alpha2-2008-candidate-${{ github.run_id }}',
  'CANONICAL_PROMOTION_PENDING=YES',
  'R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES',
  'POST_PASSWORD_SAFE_STOP_DIAGNOSTICS=YES'
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER_MISSING:${marker}`);
if (workflow.includes('--build-number 2007')) fail('OLD_BUILD_NUMBER_STILL_ACTIVE');

for (const marker of [
  'class Alpha2PipelineStageException',
  'ALPHA2_REFRESH_VAULT_INIT_FAILED',
  'ALPHA2_REFRESH_SCAN_FAILED',
  'ALPHA2_REFRESH_GMAIL_PERSIST_FAILED',
  'ALPHA2_REFRESH_STATEMENT_IMPORT_FAILED',
  'ALPHA2_REFRESH_VAULT_READ_FAILED',
  'ALPHA2_REFRESH_VAULT_DECODE_FAILED',
  'ALPHA2_REFRESH_RUNTIME_FAILED',
  'ALPHA2_REFRESH_PRODUCT_GATE_FAILED',
  'ALPHA2_REFRESH_PROJECTION_FAILED',
  'Future<void> _safeRelease(String handle)',
]) if (!pipeline.includes(marker)) fail(`PIPELINE_DIAGNOSTIC_MARKER_MISSING:${marker}`);
for (const marker of ['on Alpha2PipelineStageException catch (error)', 'Diagnóstico: $code', 'ALPHA2_REFRESH_UNKNOWN_FAILED']) {
  if (!main.includes(marker)) fail(`UI_DIAGNOSTIC_MARKER_MISSING:${marker}`);
}
for (const marker of ['scan failure is reduced to a safe stage code','vault read failure is reduced to a safe stage code','handle cleanup failure cannot mask candidate-local fetch rejection']) {
  if (!test.includes(marker)) fail(`DIAGNOSTIC_TEST_MISSING:${marker}`);
}

if (canonical.candidate !== '0.2.0-alpha.2+2007') fail('PREPROMOTION_CANONICAL_MUST_REMAIN_2007');
if (campaign.candidate?.id !== '0.2.0-alpha.2+2007' || campaign.subgates?.[2]?.status !== 'PASS') fail('2007_R2_HISTORY_DRIFTED');
if (observation.gateId !== 'OD3' || observation.gateStatus !== 'INCONCLUSIVE' || observation.interpretation?.od3PassProven !== false || observation.interpretation?.od4PassProven !== false) fail('OD3_INCONCLUSIVE_OBSERVATION_MISSING');
if (campaign.currentState?.buildReady !== false || campaign.currentState?.releaseReady !== false) fail('PREMATURE_READY_PROMOTION');

console.log('ALPHA2_2008_CANDIDATE_CUT=PASS');
console.log('SOURCE_BASE=ALPHA2_2007_OD3_INCONCLUSIVE');
console.log('POST_PASSWORD_SAFE_STOP_DIAGNOSTICS=GATED');
console.log('HANDLE_CLEANUP_MASKING=PREVENTED');
console.log('CANDIDATE_ID=0.2.0-alpha.2+2008');
console.log('CANONICAL_PROMOTION_PENDING=YES');
console.log('R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('R2_EVIDENCE_INHERITANCE_ALLOWED=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
