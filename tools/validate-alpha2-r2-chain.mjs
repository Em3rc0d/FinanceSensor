import fs from 'node:fs';
import './validate-build-readiness.mjs';

const r1 = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json', 'utf8'));
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json', 'utf8'));
const currentR1 = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2008-2026-09-14.json';
const historicalR1 = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.json';
const historicalOd3 = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD3-INCONCLUSIVE-2026-09-14.json';
const signedHash = 'a6e9e9441842f9de78147d8bef0103c63c1ad5b499963303111dbb99dfcd5277';
const signedBytes = 182538790;

if (canonical.candidate !== '0.2.0-alpha.2+2008' || canonical.sourceCommit !== '45b605d29fe0b90f528e4f0f952ab878080b2f0b') throw new Error('canonical +2008 authority drifted');
if (canonical.authority?.apkSha256 !== 'eb4afc91357204419b3693efa973ba5bbcbd09a8037c3932269cea25363e7238' || canonical.authority?.apkBytes !== 182515867) throw new Error('canonical +2008 APK authority drifted');
if (canonical.signing?.trustedEdgeSigningPass !== true || canonical.signing?.signedApkSha256 !== signedHash || canonical.signing?.signedApkBytes !== signedBytes || canonical.signing?.receipt !== currentR1) throw new Error('canonical +2008 stable signing PASS drifted');
if (r1.candidate !== canonical.candidate || r1.sourceCommit !== canonical.sourceCommit || r1.inputApk?.sha256 !== canonical.authority?.apkSha256) throw new Error('canonical/R1 +2008 authority chain drifted');
if (r2.candidate?.id !== r1.candidate || r2.candidate?.sourceCommit !== r1.sourceCommit || r2.candidate?.canonicalInputApkSha256 !== r1.inputApk?.sha256) throw new Error('R1/R2 +2008 authority chain drifted');
if (r1.status !== 'TRUSTED_EDGE_SIGNING_PASS' || r1.trustedEdgeSigningPass !== true || r1.physicalReceipt?.path !== currentR1) throw new Error('R1 +2008 PASS receipt binding drifted');
if (r1.signedApkSha256 !== signedHash || r1.signedApkBytes !== signedBytes || r2.candidate?.signedApkSha256 !== signedHash || r2.candidate?.signedApkBytes !== signedBytes) throw new Error('+2008 stable-signed identity chain drifted');
if (r2.r1PhysicalReceipt !== currentR1 || r2.receipt?.current !== null) throw new Error('R2 must bind R1 receipt while OD0 receipt remains absent');

if (r2.status !== 'IN_PROGRESS' || r2.currentState?.r2PhysicalCampaign !== 'IN_PROGRESS' || r2.currentState?.r1TrustedEdgeSigning !== 'PASS') throw new Error('R2 must be in progress after R1 PASS');
if (r2.subgates?.[0]?.id !== 'OD0' || r2.subgates?.[0]?.status !== 'READY_FOR_PHYSICAL') throw new Error('OD0 must be ready for physical execution');
for (let i = 1; i <= 11; i += 1) {
  const gate = r2.subgates?.[i];
  if (gate?.id !== `OD${i}` || gate?.status !== 'BLOCKED_BY_PRIOR_GATE') throw new Error(`OD${i} current chain state drifted`);
}
if (r2.currentState?.nextGate !== 'OD0' || r2.currentState?.currentBlocker !== 'OWNED_ANDROID_OD0_INSTALL_AND_LAUNCH_REQUIRED') throw new Error('current next gate/blocker drifted');

const historical = r2.historicalInvalidatedCampaign ?? {};
if (historical.candidate !== '0.2.0-alpha.2+2007' || historical.lastSanitizedReceipt !== historicalOd3 || historical.evidenceInheritanceAllowed !== false || historical.continuationAllowed !== false) throw new Error('+2007 campaign must remain historical and non-inheritable');
if (!fs.existsSync(currentR1) || !fs.existsSync(historicalR1) || !fs.existsSync(historicalOd3)) throw new Error('current/historical R1/R2 evidence missing');

if (r2.currentState?.buildReady !== false || r2.currentState?.releaseReady !== false) throw new Error('R1 PASS/R2 OD0-ready transition cannot promote readiness');
if (r2.currentState?.q003 !== 'ACTIVE' || r2.currentState?.q004 !== 'ACTIVE' || r2.currentState?.q005 !== 'ACTIVE') throw new Error('R1 physical evidence cannot close Q003/Q004/Q005');
if (r2.currentState?.gMk0 !== 'OPEN') throw new Error('G-MK0 must remain OPEN');

console.log('ALPHA2_R2_PREBUILD_CHAIN=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2008_STABLE_SIGNED');
console.log('PREBUILD_DESIGN_AND_BUILD_READINESS=BOUND');
console.log('R1_TRUSTED_EDGE_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('R2_PHYSICAL_CAMPAIGN=IN_PROGRESS');
console.log('OD0_INSTALL_AND_LAUNCH=READY_FOR_PHYSICAL');
console.log('OD0_OD11=NO_CURRENT_PASS');
console.log('ALPHA2_2007_R2_RECEIPT=HISTORICAL_ONLY');
console.log('NEXT_GATE=OD0');
console.log('CURRENT_BLOCKER=OWNED_ANDROID_OD0_INSTALL_AND_LAUNCH_REQUIRED');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
