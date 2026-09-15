import fs from 'node:fs';
import './validate-build-readiness.mjs';

const r1 = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json','utf8'));
const r2 = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json','utf8'));
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json','utf8'));
const gate = JSON.parse(fs.readFileSync('graph/alpha2-human-intervention-gate.json','utf8'));
const receipt = JSON.parse(fs.readFileSync('graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2009-2026-09-15.json','utf8'));
const assert = (cond,message) => { if (!cond) throw new Error(`ALPHA2_R2_CHAIN_FAILED:${message}`); };
const candidate = '0.2.0-alpha.2+2009';
const source = 'e19bcccee13e326bbc08012533ddaeba026c633a';
const apk = '1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717';
const signed = '7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a';

assert(canonical.candidate === candidate && canonical.sourceCommit === source && canonical.authority?.apkSha256 === apk, 'canonical +2009 authority drifted');
assert(canonical.signing?.trustedEdgeSigningPass === true && canonical.signing?.signedApkSha256 === signed, 'canonical signed identity drifted');
assert(r1.candidate === candidate && r1.sourceCommit === source && r1.inputApk?.sha256 === apk, 'canonical/R1 chain drifted');
assert(r1.status === 'TRUSTED_EDGE_SIGNING_PASS' && r1.trustedEdgeSigningPass === true && r1.signedApkSha256 === signed, 'R1 PASS state drifted');
assert(receipt.trustedEdgeSigningPass === true && receipt.signedApkSha256 === signed, 'R1 sanitized receipt drifted');
assert(r2.candidate?.id === candidate && r2.candidate?.sourceCommit === source && r2.candidate?.canonicalInputApkSha256 === apk && r2.candidate?.signedApkSha256 === signed, 'R1/R2 identity chain drifted');
assert(r2.status === 'READY_FOR_CONSOLIDATED_OWNED_DEVICE_UAT' && r2.currentState?.r2PhysicalCampaign === 'READY_FOR_CONSOLIDATED_UAT', 'R2 UAT readiness drifted');
assert(r2.currentState?.r1TrustedEdgeSigning === 'PASS' && r2.currentState?.nextGate === 'CONSOLIDATED_OWNED_DEVICE_UAT' && r2.currentState?.currentBlocker === null, 'R1/R2 frontier drifted');
for (let i=0;i<=11;i+=1) assert(r2.subgates?.[i]?.id === `OD${i}` && r2.subgates?.[i]?.status === 'READY_IN_CONSOLIDATED_UAT', `OD${i} readiness drifted`);
assert(gate.ownedDeviceUat?.requestAllowed === true && gate.ownedDeviceUat?.humanUatEligible === true && gate.ownedDeviceUat?.trustedEdgeSigningPass === true, 'human intervention chain drifted');
const old = r2.historicalInvalidatedCampaign ?? {};
assert(old.candidate === '0.2.0-alpha.2+2008' && old.evidenceInheritanceAllowed === false && old.continuationAllowed === false, '+2008 must remain historical');
assert(r2.currentState?.buildReady === false && r2.currentState?.releaseReady === false, 'readiness premature');
for (const q of ['q003','q004','q005']) assert(r2.currentState?.[q] === 'ACTIVE', `${q} must remain ACTIVE`);
assert(r2.currentState?.gMk0 === 'OPEN', 'G-MK0 must remain open');

console.log('ALPHA2_R2_PREBUILD_CHAIN=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2009_STABLE_SIGNED_FROZEN');
console.log('PREBUILD_DESIGN_AND_BUILD_READINESS=BOUND');
console.log('R1_TRUSTED_EDGE_SIGNING=PASS');
console.log('R2_PHYSICAL_CAMPAIGN=READY_FOR_CONSOLIDATED_UAT');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES');
console.log('NEXT_EXECUTION_NODE=CONSOLIDATED_OWNED_DEVICE_UAT');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
