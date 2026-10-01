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
const signedHash = 'a6e9e9441842f9de78147d8bef0103c63c1ad5b499963303111dbb99dfcd5277';

for (const marker of ['--build-number 2008',"versionCode='2008'",'CANDIDATE_ID=0.2.0-alpha.2+2008','financesensor-alpha2-2008-candidate-${{ github.run_id }}','CANONICAL_PROMOTION_PENDING=YES','R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES','POST_PASSWORD_SAFE_STOP_DIAGNOSTICS=YES']) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER_MISSING:${marker}`);
if (workflow.includes('--build-number 2007')) fail('OLD_BUILD_NUMBER_STILL_ACTIVE');
for (const marker of ['class Alpha2PipelineStageException','ALPHA2_REFRESH_VAULT_INIT_FAILED','ALPHA2_REFRESH_SCAN_FAILED','ALPHA2_REFRESH_GMAIL_PERSIST_FAILED','ALPHA2_REFRESH_STATEMENT_IMPORT_FAILED','ALPHA2_REFRESH_VAULT_READ_FAILED','ALPHA2_REFRESH_VAULT_DECODE_FAILED','ALPHA2_REFRESH_RUNTIME_FAILED','ALPHA2_REFRESH_PRODUCT_GATE_FAILED','ALPHA2_REFRESH_PROJECTION_FAILED','Future<void> _safeRelease(String handle)']) if (!pipeline.includes(marker)) fail(`PIPELINE_DIAGNOSTIC_MARKER_MISSING:${marker}`);
for (const marker of ['on Alpha2PipelineStageException catch (error)', 'Diagnóstico: $code', 'ALPHA2_REFRESH_UNKNOWN_FAILED']) if (!main.includes(marker)) fail(`UI_DIAGNOSTIC_MARKER_MISSING:${marker}`);
for (const marker of ['scan failure is reduced to a safe stage code','vault read failure is reduced to a safe stage code','handle cleanup failure cannot mask candidate-local fetch rejection']) if (!test.includes(marker)) fail(`DIAGNOSTIC_TEST_MISSING:${marker}`);

if (canonical.candidate !== '0.2.0-alpha.2+2008' || canonical.sourceCommit !== '45b605d29fe0b90f528e4f0f952ab878080b2f0b') fail('CANONICAL_2008_PROMOTION_MISSING');
if (canonical.authority?.apkSha256 !== 'eb4afc91357204419b3693efa973ba5bbcbd09a8037c3932269cea25363e7238' || canonical.authority?.apkBytes !== 182515867) fail('CANONICAL_2008_APK_IDENTITY_DRIFTED');
if (canonical.signing?.trustedEdgeSigningPass !== true || canonical.signing?.signedApkSha256 !== signedHash || canonical.signing?.receipt !== 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2008-2026-09-14.json') fail('R1_2008_CERTIFIED_SIGNING_PASS_MISSING');
if (campaign.candidate?.id !== '0.2.0-alpha.2+2008' || campaign.candidate?.signedApkSha256 !== signedHash || campaign.status !== 'IN_PROGRESS') fail('2008_R2_OD0_FRONTIER_MISSING');
if (campaign.subgates?.[0]?.status !== 'READY_FOR_PHYSICAL') fail('OD0_MUST_BE_READY_AFTER_R1_PASS');
if (observation.gateId !== 'OD3' || observation.gateStatus !== 'INCONCLUSIVE' || observation.interpretation?.od3PassProven !== false || observation.interpretation?.od4PassProven !== false) fail('HISTORICAL_2007_OD3_INCONCLUSIVE_OBSERVATION_MISSING');
if (campaign.historicalInvalidatedCampaign?.candidate !== '0.2.0-alpha.2+2007' || campaign.historicalInvalidatedCampaign?.evidenceInheritanceAllowed !== false) fail('2007_NON_INHERITANCE_BOUNDARY_MISSING');
if (campaign.currentState?.r1TrustedEdgeSigning !== 'PASS' || campaign.currentState?.nextGate !== 'OD0') fail('CURRENT_2008_FRONTIER_MUST_BE_OD0');
if (campaign.currentState?.buildReady !== false || campaign.currentState?.releaseReady !== false) fail('PREMATURE_READY_PROMOTION');

console.log('ALPHA2_2008_CANDIDATE_CUT=PASS');
console.log('SOURCE_BASE=ALPHA2_2007_OD3_INCONCLUSIVE');
console.log('POST_PASSWORD_SAFE_STOP_DIAGNOSTICS=GATED');
console.log('HANDLE_CLEANUP_MASKING=PREVENTED');
console.log('CANDIDATE_ID=0.2.0-alpha.2+2008');
console.log('CANONICAL_PROMOTION=PASS');
console.log('R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES_AT_CANDIDATE_CUT');
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('R2_EVIDENCE_INHERITANCE_ALLOWED=NO');
console.log('R2_PHYSICAL_CAMPAIGN=IN_PROGRESS');
console.log('R2_NEXT_GATE=OD0');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
