import fs from 'node:fs';
import './validate-build-readiness.mjs';

const r1 = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json', 'utf8'));

const expectedReceipt = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2006-2026-09-08.json';
const expectedSignedSha = '36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0';
const expectedSignedBytes = 182125094;

if (r1.candidate !== '0.2.0-alpha.2+2006' || r1.sourceCommit !== 'e26bab7cd87c5e686898998e867d8fb25c99db27') throw new Error('R1 must bind the +2006 post-merge authority');
if (r2.candidate?.id !== r1.candidate || r2.candidate?.sourceCommit !== r1.sourceCommit || r2.candidate?.canonicalInputApkSha256 !== r1.inputApk?.sha256) throw new Error('R1/R2 +2006 authority chain drifted');

const signed = r1.physicalReceipt !== null;
if (!signed) {
  if (!['READY_FOR_TRUSTED_EDGE_SIGNING_BUNDLE_STAGING','READY_FOR_TRUSTED_EDGE_SIGNING'].includes(r1.status)) throw new Error(`open R1 has unexpected status ${r1.status}`);
  if (r1.trustedEdgeSigningPass !== false || r1.signedApkSha256 !== null || r1.signedApkBytes !== null) throw new Error('open R1 cannot bind stable signing');
  if (r2.status !== 'BLOCKED_BY_R1_SIGNING' || r2.currentState?.r2PhysicalCampaign !== 'BLOCKED_BY_R1') throw new Error('R2 must remain blocked until +2006 R1 trusted-edge signing PASS');
  if (r2.r1PhysicalReceipt !== null || r2.candidate?.signedApkSha256 !== null || r2.candidate?.signedApkBytes !== null) throw new Error('R2 cannot bind a signed APK before R1 receipt');
  if (r2.subgates?.[0]?.status !== 'BLOCKED_BY_R1_SIGNING') throw new Error('OD0 must remain blocked by R1');
} else {
  if (r1.status !== 'TRUSTED_EDGE_SIGNING_PASS' || r1.trustedEdgeSigningPass !== true) throw new Error('receipt-bound R1 must be PASS');
  if (r1.physicalReceipt?.path !== expectedReceipt || r2.r1PhysicalReceipt !== expectedReceipt) throw new Error('R1/R2 receipt chain drifted');
  if (r1.signedApkSha256 !== expectedSignedSha || r1.signedApkBytes !== expectedSignedBytes) throw new Error('R1 stable +2006 APK identity drifted');
  if (r2.candidate?.signedApkSha256 !== expectedSignedSha || r2.candidate?.signedApkBytes !== expectedSignedBytes) throw new Error('R2 stable +2006 APK identity drifted');
  if (r2.status !== 'READY_FOR_PHYSICAL_CAMPAIGN' || r2.currentState?.r2PhysicalCampaign !== 'READY') throw new Error('R2 must be ready after current +2006 R1 PASS');
  if (r2.subgates?.[0]?.status !== 'READY_FOR_PHYSICAL') throw new Error('OD0 must be ready after R1 PASS');
}

for (const gate of r2.subgates?.slice(1) ?? []) if (gate.status !== 'BLOCKED_BY_PRIOR_GATE') throw new Error(`${gate.id} must remain blocked by prior gate`);
if (r2.currentState?.buildReady !== false || r2.currentState?.releaseReady !== false) throw new Error('R1/R2 transition cannot promote readiness');
if (r2.currentState?.q003 !== 'ACTIVE' || r2.currentState?.q004 !== 'ACTIVE' || r2.currentState?.q005 !== 'ACTIVE') throw new Error('R1 receipt cannot close Q003/Q004/Q005');
if (r2.currentState?.gMk0 !== 'OPEN') throw new Error('G-MK0 must remain OPEN');

console.log('ALPHA2_R2_PREBUILD_CHAIN=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2006_POSTMERGE');
console.log('PREBUILD_DESIGN_AND_BUILD_READINESS=BOUND');
console.log(`R1_TRUSTED_EDGE_SIGNING=${signed ? 'PASS' : 'OPEN'}`);
console.log(`R2_PHYSICAL_CAMPAIGN=${signed ? 'READY' : 'BLOCKED_BY_R1'}`);
console.log(`NEXT_GATE=${signed ? 'OD0_SIGNED_APK_INSTALL_AND_LAUNCH' : 'R1_TRUSTED_EDGE_SIGNING'}`);
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
