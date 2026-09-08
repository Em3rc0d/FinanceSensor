import fs from 'node:fs';
import './validate-build-readiness.mjs';

const r1 = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json', 'utf8'));

if (!['READY_FOR_TRUSTED_EDGE_SIGNING_BUNDLE_STAGING','READY_FOR_TRUSTED_EDGE_SIGNING'].includes(r1.status)) throw new Error(`R1 must remain pre-signing; got ${r1.status}`);
if (r1.candidate !== '0.2.0-alpha.2+2006' || r1.sourceCommit !== 'e26bab7cd87c5e686898998e867d8fb25c99db27') throw new Error('R1 must bind the +2006 post-merge authority');
if (r1.trustedEdgeSigningPass !== false || r1.physicalReceipt !== null || r1.signedApkSha256 !== null || r1.signedApkBytes !== null) throw new Error('R1 may not inherit an earlier candidate signing PASS into +2006');
if (r2.candidate?.id !== r1.candidate || r2.candidate?.sourceCommit !== r1.sourceCommit || r2.candidate?.canonicalInputApkSha256 !== r1.inputApk?.sha256) throw new Error('R1/R2 +2006 authority chain drifted');
if (r2.status !== 'BLOCKED_BY_R1_SIGNING' || r2.currentState?.r2PhysicalCampaign !== 'BLOCKED_BY_R1') throw new Error('R2 must remain blocked until +2006 R1 trusted-edge signing PASS');
if (r2.r1PhysicalReceipt !== null || r2.candidate?.signedApkSha256 !== null || r2.candidate?.signedApkBytes !== null) throw new Error('R2 cannot bind a signed APK before R1 receipt');
if (r2.subgates?.[0]?.status !== 'BLOCKED_BY_R1_SIGNING') throw new Error('OD0 must remain blocked by R1');
for (const gate of r2.subgates?.slice(1) ?? []) if (gate.status !== 'BLOCKED_BY_PRIOR_GATE') throw new Error(`${gate.id} must remain blocked by prior gate`);
if (r2.currentState?.buildReady !== false || r2.currentState?.releaseReady !== false) throw new Error('R1/R2 staging cannot promote readiness');

console.log('ALPHA2_R2_PREBUILD_CHAIN=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2006_POSTMERGE');
console.log('PREBUILD_DESIGN_AND_BUILD_READINESS=BOUND');
console.log('R1_TRUSTED_EDGE_SIGNING=OPEN');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('NEXT_GATE=R1_TRUSTED_EDGE_SIGNING');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
