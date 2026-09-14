import fs from 'node:fs';
import './validate-build-readiness.mjs';

const r1 = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json', 'utf8'));
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const currentR1Receipt = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.json';
const currentOd2Receipt = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD2-2026-09-14.json';
const historicalR2 = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD2-2026-09-09.json';
const stableSha = '40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab';
const stableBytes = 182145574;

if (canonical.candidate !== '0.2.0-alpha.2+2007' || canonical.sourceCommit !== '8a4aa307b9b3328e67232c919a94994e80446331') throw new Error('canonical +2007 authority drifted');
if (r1.candidate !== canonical.candidate || r1.sourceCommit !== canonical.sourceCommit || r1.inputApk?.sha256 !== canonical.authority?.apkSha256) throw new Error('canonical/R1 +2007 authority chain drifted');
if (r2.candidate?.id !== r1.candidate || r2.candidate?.sourceCommit !== r1.sourceCommit || r2.candidate?.canonicalInputApkSha256 !== r1.inputApk?.sha256) throw new Error('R1/R2 +2007 authority chain drifted');
if (canonical.signing?.trustedEdgeSigningPass !== true || canonical.signing?.signedApkSha256 !== stableSha || canonical.signing?.signedApkBytes !== stableBytes) throw new Error('canonical stable signing identity drifted');
if (r1.status !== 'TRUSTED_EDGE_SIGNING_PASS' || r1.trustedEdgeSigningPass !== true || r1.physicalReceipt?.path !== currentR1Receipt) throw new Error('R1 +2007 must remain closed by current sanitized receipt');
if (r1.signedApkSha256 !== stableSha || r1.signedApkBytes !== stableBytes || r2.candidate?.signedApkSha256 !== stableSha || r2.candidate?.signedApkBytes !== stableBytes) throw new Error('stable +2007 APK identity chain drifted');
if (r2.r1PhysicalReceipt !== currentR1Receipt || r2.receipt?.current !== currentOd2Receipt) throw new Error('R2 current R1/OD2 receipt chain drifted');
if (!fs.existsSync(currentOd2Receipt)) throw new Error('current +2007 OD2 sanitized receipt missing');

if (r2.status !== 'PHYSICAL_CAMPAIGN_IN_PROGRESS' || r2.currentState?.r2PhysicalCampaign !== 'IN_PROGRESS') throw new Error('R2 must remain in progress after OD2 PASS');
const expectedStatuses = ['PASS', 'PASS', 'PASS', 'READY_FOR_PHYSICAL', ...Array(8).fill('BLOCKED_BY_PRIOR_GATE')];
for (let i = 0; i < expectedStatuses.length; i += 1) {
  const gate = r2.subgates?.[i];
  if (gate?.id !== `OD${i}` || gate?.status !== expectedStatuses[i]) throw new Error(`OD${i} current chain state drifted`);
}
if (r2.currentState?.nextGate !== 'OD3_BOUNDED_FETCH_ONLY_FOR_ALLOWED_PROFILE' || r2.currentState?.currentBlocker !== 'OD3_ALLOWED_PROFILE_ATTACHMENT_FETCH_NOT_YET_OBSERVED') throw new Error('current next gate/blocker drifted');

const receipt = JSON.parse(fs.readFileSync(currentOd2Receipt, 'utf8'));
if (receipt.candidateId !== canonical.candidate || receipt.sourceCommit !== canonical.sourceCommit || receipt.signedApkSha256 !== stableSha || receipt.signedApkBytes !== stableBytes) throw new Error('OD2 receipt stable candidate binding drifted');
for (let i = 0; i <= 2; i += 1) if (receipt.gateResults?.[i]?.gateId !== `OD${i}` || receipt.gateResults?.[i]?.gateStatus !== 'PASS') throw new Error(`OD${i} cumulative PASS missing from OD2 receipt`);
if (receipt.gateResults?.[3]?.gateId !== 'OD3' || receipt.gateResults?.[3]?.gateStatus !== 'INCONCLUSIVE') throw new Error('OD3 must remain inconclusive in current incremental receipt');

const historical = r2.historicalInvalidatedCampaign ?? {};
if (historical.candidate !== '0.2.0-alpha.2+2006' || historical.lastSanitizedReceipt !== historicalR2 || historical.evidenceInheritanceAllowed !== false || historical.continuationAllowed !== false) throw new Error('+2006 campaign must remain historical and non-inheritable');
if (!fs.existsSync(historicalR2)) throw new Error('historical +2006 R2 receipt missing');

if (r2.currentState?.buildReady !== false || r2.currentState?.releaseReady !== false) throw new Error('R1/R2 transition cannot promote readiness');
if (r2.currentState?.q003 !== 'ACTIVE' || r2.currentState?.q004 !== 'ACTIVE' || r2.currentState?.q005 !== 'ACTIVE') throw new Error('R1/OD0/OD1/OD2 evidence cannot close Q003/Q004/Q005');
if (r2.currentState?.gMk0 !== 'OPEN') throw new Error('G-MK0 must remain OPEN');

console.log('ALPHA2_R2_PREBUILD_CHAIN=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2007_STABLE_SIGNED');
console.log('PREBUILD_DESIGN_AND_BUILD_READINESS=BOUND');
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('R2_PHYSICAL_CAMPAIGN=IN_PROGRESS');
console.log('OD0_OD1_OD2=PASS');
console.log('OD3_BOUNDED_FETCH_ONLY_FOR_ALLOWED_PROFILE=READY_FOR_PHYSICAL');
console.log('CURRENT_OD0_OD11_PASS=OD0_OD1_OD2');
console.log('ALPHA2_2006_R2_RECEIPT=HISTORICAL_ONLY');
console.log('NEXT_GATE=OD3_BOUNDED_FETCH_ONLY_FOR_ALLOWED_PROFILE');
console.log('CURRENT_BLOCKER=OD3_ALLOWED_PROFILE_ATTACHMENT_FETCH_NOT_YET_OBSERVED');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
