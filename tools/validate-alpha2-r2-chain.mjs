import fs from 'node:fs';
import './validate-build-readiness.mjs';

const r1 = JSON.parse(fs.readFileSync('graph/alpha2-r1-signing-handoff.json','utf8'));
const r2 = JSON.parse(fs.readFileSync('graph/alpha2-r2-owned-device-campaign.json','utf8'));
const canonical = JSON.parse(fs.readFileSync('graph/alpha2-canonical-candidate.json','utf8'));
const gate = JSON.parse(fs.readFileSync('graph/alpha2-human-intervention-gate.json','utf8'));
const assert = (cond,message) => { if (!cond) throw new Error(`ALPHA2_R2_CHAIN_FAILED:${message}`); };
const candidate = '0.2.0-alpha.2+2009';
const source = 'e19bcccee13e326bbc08012533ddaeba026c633a';
const apk = '1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717';

assert(canonical.candidate === candidate && canonical.sourceCommit === source && canonical.authority?.apkSha256 === apk, 'canonical +2009 authority drifted');
assert(canonical.signing?.trustedEdgeSigningPass === false && canonical.signing?.signedApkSha256 === null, 'canonical must remain unsigned');
assert(r1.candidate === candidate && r1.sourceCommit === source && r1.inputApk?.sha256 === apk, 'canonical/R1 chain drifted');
assert(r1.status === 'TRUSTED_EDGE_SIGNING_REQUIRED' && r1.trustedEdgeSigningPass === false && r1.physicalReceipt === null, 'R1 pending state drifted');
assert(r2.candidate?.id === candidate && r2.candidate?.sourceCommit === source && r2.candidate?.canonicalInputApkSha256 === apk, 'R1/R2 identity chain drifted');
assert(r2.candidate?.signedApkSha256 === null && r2.r1PhysicalReceipt === null, 'R2 must not have signed identity or receipt');
assert(r2.status === 'BLOCKED_BY_R1_SIGNING' && r2.currentState?.r2PhysicalCampaign === 'BLOCKED_BY_R1_SIGNING', 'R2 must be blocked by R1');
assert(r2.currentState?.r1TrustedEdgeSigning === 'PENDING' && r2.currentState?.nextGate === 'R1_TRUSTED_EDGE_SIGNING', 'R1/R2 frontier drifted');
assert(r2.currentState?.currentBlocker === 'TRUSTED_EDGE_SIGNING_2009_REQUIRED', 'current blocker drifted');
assert(r2.subgates?.[0]?.id === 'OD0' && r2.subgates?.[0]?.status === 'BLOCKED_BY_R1_SIGNING', 'OD0 must wait for R1');
for (let i=1;i<=11;i+=1) assert(r2.subgates?.[i]?.id === `OD${i}` && r2.subgates?.[i]?.status === 'BLOCKED_BY_PRIOR_GATE', `OD${i} drifted`);
assert(gate.preSigning?.requestAllowed === true && gate.ownedDeviceUat?.requestAllowed === false, 'human intervention chain drifted');
const old = r2.historicalInvalidatedCampaign ?? {};
assert(old.candidate === '0.2.0-alpha.2+2008' && old.evidenceInheritanceAllowed === false && old.continuationAllowed === false, '+2008 must remain historical');
assert(r2.currentState?.buildReady === false && r2.currentState?.releaseReady === false, 'readiness premature');
for (const q of ['q003','q004','q005']) assert(r2.currentState?.[q] === 'ACTIVE', `${q} must remain ACTIVE`);
assert(r2.currentState?.gMk0 === 'OPEN', 'G-MK0 must remain open');

console.log('ALPHA2_R2_PREBUILD_CHAIN=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2009_UNSIGNED_FROZEN');
console.log('PREBUILD_DESIGN_AND_BUILD_READINESS=BOUND');
console.log('SIGNING_REQUEST_ALLOWED=YES');
console.log('R1_TRUSTED_EDGE_SIGNING=PENDING');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1_SIGNING');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
