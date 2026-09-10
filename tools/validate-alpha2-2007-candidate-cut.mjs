import fs from 'node:fs';
import './validate-ci-runner-policy.mjs';
import './validate-alpha2-od3-mobile-fetch-remediation.mjs';

const workflowPath = '.github/workflows/alpha2-integrated-runtime.yml';
const scannerPath = 'spikes/mobile-shell/native/android/Alpha2StatementDiscoveryScanner.kt';
const campaignPath = 'graph/alpha2-r2-owned-device-campaign.json';
const canonicalPath = 'graph/alpha2-canonical-candidate.json';
const r1Path = 'graph/alpha2-r1-signing-handoff.json';

const workflow = fs.readFileSync(workflowPath, 'utf8');
const scanner = fs.readFileSync(scannerPath, 'utf8');
const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
const canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
const r1 = JSON.parse(fs.readFileSync(r1Path, 'utf8'));
const fail = message => { throw new Error(`ALPHA2_2007_CANDIDATE_CUT_FAILED:${message}`); };

for (const marker of [
  '--build-number 2007',
  "versionCode='2007'",
  'CANDIDATE_ID=0.2.0-alpha.2+2007',
  'financesensor-alpha2-2007-candidate-${{ github.run_id }}',
  'CANONICAL_PROMOTION_PENDING=YES',
  'R1_TRUSTED_EDGE_RESIGN_REQUIRED=YES'
]) if (!workflow.includes(marker)) fail(`WORKFLOW_MARKER_MISSING:${marker}`);
if (workflow.includes('--build-number 2006')) fail('OLD_BUILD_NUMBER_STILL_ACTIVE');
if (workflow.includes('CANDIDATE_ID=0.2.0-alpha.2+2006')) fail('OLD_CANDIDATE_ID_STILL_ACTIVE');

for (const marker of [
  'ATTACHMENT_READ_TIMEOUT_MS = 30_000',
  'ATTACHMENT_MAX_ATTEMPTS = 3',
  'Base64.URL_SAFE or Base64.NO_WRAP',
  'ALPHA2_STATEMENT_ATTACHMENT_TIMEOUT',
  'ALPHA2_STATEMENT_ATTACHMENT_SIZE_MISMATCH'
]) if (!scanner.includes(marker)) fail(`OD3_REMEDIATION_NOT_IN_SOURCE:${marker}`);

if (canonical.candidate !== '0.2.0-alpha.2+2007' || canonical.sourceCommit !== '8a4aa307b9b3328e67232c919a94994e80446331') fail('CANONICAL_2007_PROMOTION_MISSING');
if (canonical.authority?.apkSha256 !== 'a84f0d047366d08c0d3e4850919c73b3aa79a290e9c878315434cebf81775197') fail('CANONICAL_2007_APK_IDENTITY_MISMATCH');
if (r1.candidate !== canonical.candidate || r1.status !== 'READY_FOR_TRUSTED_EDGE_SIGNING' || r1.trustedEdgeSigningPass !== false) fail('R1_2007_MUST_REMAIN_OPEN');
if (campaign.candidate?.id !== canonical.candidate || campaign.status !== 'BLOCKED_BY_R1_TRUSTED_EDGE_SIGNING') fail('R2_2007_RESET_MISSING');
if (campaign.historicalInvalidatedCampaign?.candidate !== '0.2.0-alpha.2+2006' || campaign.historicalInvalidatedCampaign?.evidenceInheritanceAllowed !== false) fail('OLD_2006_PHYSICAL_EVIDENCE_NOT_ISOLATED');
if (campaign.laws?.anyCandidateIdentityChangeInvalidatesCampaign !== true) fail('CANDIDATE_CHANGE_INVALIDATION_LAW_MISSING');
if (campaign.currentState?.buildReady !== false || campaign.currentState?.releaseReady !== false) fail('PREMATURE_READY_PROMOTION');

console.log('ALPHA2_2007_CANDIDATE_CUT=PASS');
console.log('CI_RUNNER_POLICY=GATED');
console.log('OD3_REMEDIATION=GATED');
console.log('SOURCE_BASE=LATEST_OD3_REMEDIATION');
console.log('CANDIDATE_ID=0.2.0-alpha.2+2007');
console.log('CANONICAL_PROMOTION=PASS');
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('R2_EVIDENCE_INHERITANCE_ALLOWED=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
