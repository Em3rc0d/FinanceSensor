import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';
import './validate-alpha2-od3-mobile-fetch-remediation.mjs';

const workflowPath = '.github/workflows/alpha2-integrated-runtime.yml';
const scannerPath = 'spikes/mobile-shell/native/android/Alpha2StatementDiscoveryScanner.kt';
const campaignPath = 'graph/alpha2-r2-owned-device-campaign.json';

const workflow = fs.readFileSync(workflowPath, 'utf8');
const scanner = fs.readFileSync(scannerPath, 'utf8');
const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
const fail = message => { throw new Error(`ALPHA2_2007_CANDIDATE_CUT_FAILED:${message}`); };

for (const marker of [
  '--build-number 2007',
  "versionCode='2007'",
  'CANDIDATE_ID=0.2.0-alpha.2+2007',
  'financesensor-alpha2-2007-candidate-${{ github.run_id }}',
  'CANONICAL_PROMOTION_PENDING=YES',
  'R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES'
]) {
  if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER_MISSING:${marker}`);
}
if (workflow.includes('--build-number 2006')) fail('OLD_BUILD_NUMBER_STILL_ACTIVE');
if (workflow.includes('CANDIDATE_ID=0.2.0-alpha.2+2006')) fail('OLD_CANDIDATE_ID_STILL_ACTIVE');
if (workflow.includes('financesensor-alpha2-2006-candidate-${{ github.run_id }}')) fail('OLD_ARTIFACT_NAME_STILL_ACTIVE');

for (const marker of [
  'ATTACHMENT_READ_TIMEOUT_MS = 30_000',
  'ATTACHMENT_MAX_ATTEMPTS = 3',
  'Base64.URL_SAFE or Base64.NO_WRAP',
  'ALPHA2_STATEMENT_ATTACHMENT_TIMEOUT',
  'ALPHA2_STATEMENT_ATTACHMENT_SIZE_MISMATCH'
]) {
  if (!scanner.includes(marker)) fail(`OD3_REMEDIATION_NOT_IN_SOURCE:${marker}`);
}

if (campaign.candidate?.id !== '0.2.0-alpha.2+2006') fail('CURRENT_CANONICAL_CAMPAIGN_HISTORY_DRIFTED');
if (campaign.laws?.anyCandidateIdentityChangeInvalidatesCampaign !== true) fail('CANDIDATE_CHANGE_INVALIDATION_LAW_MISSING');
if (campaign.currentState?.buildReady !== false || campaign.currentState?.releaseReady !== false) fail('PREMATURE_READY_PROMOTION');

console.log('ALPHA2_2007_CANDIDATE_CUT=PASS');
console.log('CI_RUNNER_POLICY=GATED');
console.log('OD3_REMEDIATION=GATED');
console.log('SOURCE_BASE=LATEST_OD3_REMEDIATION');
console.log('CANDIDATE_ID=0.2.0-alpha.2+2007');
console.log('CANONICAL_PROMOTION_PENDING=YES');
console.log('R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES');
console.log('R2_EVIDENCE_INHERITANCE_ALLOWED=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
