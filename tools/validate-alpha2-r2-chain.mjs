import fs from 'node:fs';
import './validate-build-readiness.mjs';

const r1 = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json', 'utf8'));

const expectedR1Receipt = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2006-2026-09-08.json';
const expectedR2Receipt = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD2-2026-09-09.json';
const expectedSignedSha = '36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0';
const expectedSignedBytes = 182125094;

if (r1.candidate !== '0.2.0-alpha.2+2006' || r1.sourceCommit !== 'e26bab7cd87c5e686898998e867d8fb25c99db27') throw new Error('R1 must bind the +2006 post-merge authority');
if (r2.candidate?.id !== r1.candidate || r2.candidate?.sourceCommit !== r1.sourceCommit || r2.candidate?.canonicalInputApkSha256 !== r1.inputApk?.sha256) throw new Error('R1/R2 +2006 authority chain drifted');
if (r1.status !== 'TRUSTED_EDGE_SIGNING_PASS' || r1.trustedEdgeSigningPass !== true) throw new Error('R1 must remain trusted-edge signing PASS');
if (r1.physicalReceipt?.path !== expectedR1Receipt || r2.r1PhysicalReceipt !== expectedR1Receipt) throw new Error('R1/R2 signing receipt chain drifted');
if (r1.signedApkSha256 !== expectedSignedSha || r1.signedApkBytes !== expectedSignedBytes) throw new Error('R1 stable +2006 APK identity drifted');
if (r2.candidate?.signedApkSha256 !== expectedSignedSha || r2.candidate?.signedApkBytes !== expectedSignedBytes) throw new Error('R2 stable +2006 APK identity drifted');

if (r2.status !== 'PHYSICAL_CAMPAIGN_IN_PROGRESS' || r2.currentState?.r2PhysicalCampaign !== 'IN_PROGRESS') throw new Error('R2 must remain in progress');
if (r2.receipt?.current !== expectedR2Receipt || !fs.existsSync(expectedR2Receipt)) throw new Error('current cumulative OD2 receipt missing or drifted');

const expectedStatuses = ['PASS','PASS','PASS','READY_FOR_PHYSICAL',...Array(8).fill('BLOCKED_BY_PRIOR_GATE')];
for (let i = 0; i < expectedStatuses.length; i += 1) {
  const gate = r2.subgates?.[i];
  if (gate?.id !== `OD${i}` || gate?.status !== expectedStatuses[i]) throw new Error(`OD${i} chain state drifted`);
}
if (r2.currentState?.nextGate !== 'OD3_BOUNDED_FETCH_ONLY_FOR_ALLOWED_PROFILE') throw new Error('OD3 must be the next physical gate');
if (r2.currentState?.currentBlocker !== 'OD3_ALLOWED_PROFILE_ATTACHMENT_FETCH_REJECTED') throw new Error('OD3 blocker must remain explicit');

if (r2.currentState?.buildReady !== false || r2.currentState?.releaseReady !== false) throw new Error('R1/R2 transition cannot promote readiness');
if (r2.currentState?.q003 !== 'ACTIVE' || r2.currentState?.q004 !== 'ACTIVE' || r2.currentState?.q005 !== 'ACTIVE') throw new Error('R1/R2 evidence cannot close Q003/Q004/Q005');
if (r2.currentState?.gMk0 !== 'OPEN') throw new Error('G-MK0 must remain OPEN');

console.log('ALPHA2_R2_PREBUILD_CHAIN=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2006_POSTMERGE');
console.log('PREBUILD_DESIGN_AND_BUILD_READINESS=BOUND');
console.log('R1_TRUSTED_EDGE_SIGNING=PASS');
console.log('OD0_INSTALL_AND_LAUNCH=PASS');
console.log('OD1_EXACT_GMAIL_READONLY_OAUTH=PASS');
console.log('OD2_METADATA_FIRST_STATEMENT_DISCOVERY=PASS');
console.log('R2_PHYSICAL_CAMPAIGN=IN_PROGRESS');
console.log('NEXT_GATE=OD3_BOUNDED_FETCH_ONLY_FOR_ALLOWED_PROFILE');
console.log('CURRENT_BLOCKER=OD3_ALLOWED_PROFILE_ATTACHMENT_FETCH_REJECTED');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
