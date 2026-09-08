import fs from 'node:fs';
import './validate-build-readiness.mjs';

const receiptPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2005-2026-09-08.json';
const r1 = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json', 'utf8'));
const r2 = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json', 'utf8'));
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));

if (r1.status !== 'TRUSTED_EDGE_SIGNING_PASS') throw new Error(`R1 must be PASS; got ${r1.status}`);
if (r1.candidate !== '0.2.0-alpha.2+2005' || r1.sourceCommit !== 'd99e7e4765adfc96bed9d914b2b6f296f9712242') throw new Error('R1 must bind the +2005 post-merge authority');
if (r1.trustedEdgeSigningPass !== true || r1.physicalReceipt?.path !== receiptPath) throw new Error('R1 must bind current sanitized +2005 signing PASS');
if (r1.signedApkSha256 !== '530ef3fa17c22f94ef0a94aaf625df2ef33022c84d16fad2604a3e0dfc5e0b85' || r1.signedApkBytes !== 182116902) throw new Error('R1 stable signed APK identity drifted');
if (receipt.signedApkSha256 !== r1.signedApkSha256 || receipt.signedApkBytes !== r1.signedApkBytes || receipt.sanitizationPass !== true || receipt.rawPrivateMaterialCommitted !== false) throw new Error('R1 sanitized receipt chain drifted');
if (r2.candidate?.id !== r1.candidate || r2.candidate?.sourceCommit !== r1.sourceCommit || r2.candidate?.canonicalInputApkSha256 !== r1.inputApk?.sha256) throw new Error('R1/R2 +2005 authority chain drifted');
if (r2.candidate?.signedApkSha256 !== r1.signedApkSha256 || r2.candidate?.signedApkBytes !== r1.signedApkBytes) throw new Error('R1/R2 stable APK chain drifted');
if (r2.status !== 'READY_FOR_PHYSICAL_CAMPAIGN' || r2.currentState?.r2PhysicalCampaign !== 'READY') throw new Error('R2 must be ready after +2005 R1 trusted-edge signing PASS');
if (r2.r1PhysicalReceipt !== receiptPath) throw new Error('R2 must bind exact +2005 R1 receipt');
if (r2.subgates?.[0]?.status !== 'READY_FOR_PHYSICAL') throw new Error('OD0 must be ready for physical install/launch');
for (const gate of r2.subgates?.slice(1) ?? []) if (gate.status !== 'BLOCKED_BY_PRIOR_GATE') throw new Error(`${gate.id} must remain blocked by prior gate`);
if (r1.physicalAlpha2Pass !== false || r1.buildReady !== false || r1.releaseReady !== false) throw new Error('R1 signing cannot promote downstream readiness');
if (r2.currentState?.buildReady !== false || r2.currentState?.releaseReady !== false) throw new Error('R1/R2 transition cannot promote readiness');
for (const q of ['q003','q004','q005']) if (r2.currentState?.[q] !== 'ACTIVE') throw new Error(`${q} must remain ACTIVE`);

console.log('ALPHA2_R2_PREBUILD_CHAIN=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2005_POSTMERGE');
console.log('PREBUILD_DESIGN_AND_BUILD_READINESS=BOUND');
console.log('R1_TRUSTED_EDGE_SIGNING=PASS');
console.log('R2_PHYSICAL_CAMPAIGN=READY');
console.log('NEXT_GATE=OD0_SIGNED_APK_INSTALL_AND_LAUNCH');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=NO');
console.log('PHYSICAL_ALPHA2_PASS=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
