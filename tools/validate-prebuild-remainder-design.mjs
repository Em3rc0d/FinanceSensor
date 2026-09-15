import fs from 'node:fs';

const paths = {
  design:'graph/prebuild-remainder-design.json', doc:'mk0/03-design/PREBUILD-REMAINDER-DESIGN.md', plan:'mk0/07-plan/PREBUILD-REMAINDER-EXECUTION.md',
  ledger:'graph/closure-ledger.json', readiness:'graph/build-readiness.json', campaign:'graph/physical-closure-campaign.json',
  canonical:'graph/alpha2-canonical-candidate.json', r1:'graph/alpha2-r1-signing-handoff.json', r2:'graph/alpha2-r2-owned-device-campaign.json', gate:'graph/alpha2-human-intervention-gate.json'
};
const fail = message => { throw new Error(`PREBUILD_REMAINDER_DESIGN_FAILED:${message}`); };
const assert = (cond,message) => { if (!cond) fail(message); };
for (const path of Object.values(paths)) assert(fs.existsSync(path), `missing ${path}`);

const design = JSON.parse(fs.readFileSync(paths.design,'utf8'));
const doc = fs.readFileSync(paths.doc,'utf8');
const plan = fs.readFileSync(paths.plan,'utf8');
const ledger = JSON.parse(fs.readFileSync(paths.ledger,'utf8'));
const readiness = JSON.parse(fs.readFileSync(paths.readiness,'utf8'));
const campaign = JSON.parse(fs.readFileSync(paths.campaign,'utf8'));
const canonical = JSON.parse(fs.readFileSync(paths.canonical,'utf8'));
const r1 = JSON.parse(fs.readFileSync(paths.r1,'utf8'));
const r2 = JSON.parse(fs.readFileSync(paths.r2,'utf8'));
const gate = JSON.parse(fs.readFileSync(paths.gate,'utf8'));

assert(design.schemaVersion === 'MK0_PREBUILD_REMAINDER_DESIGN_V1' && design.project === 'FinanceSensor' && design.mk === 'MK0' && design.designFreeze === 'PASS', 'design snapshot identity drifted');
assert(design.frozenAtBaseCommit === 'ac195baebc2966521b2dcc73dfa3376ae09e6b4d', 'frozen base drifted');
const snapshot = design.canonicalAlpha2 ?? {};
for (const [key,value] of Object.entries({candidate:'0.2.0-alpha.2+2001',sourceCommit:'f658363772b8d3652a81a8a4275a571f2f409ed8',apkSha256:'7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f',apkBytes:182053563,package:'com.financesensor.lab.gmailconnection.r2',scope:'gmail.readonly',stableSignerSha1:'63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'})) assert(snapshot[key] === value, `historical design snapshot ${key} drifted`);
const laws = new Set(design.executionLaws ?? []);
for (const law of ['DESIGN_FREEZE_PASS_DOES_NOT_EQUAL_BUILD_READY','UNMAPPED_PRODUCT_BUILD_IS_FORBIDDEN','STATIC_PASS_DOES_NOT_EQUAL_PHYSICAL_PASS','APK_BUILD_PASS_DOES_NOT_EQUAL_BUILD_READY','RAW_TRUSTED_EDGE_EVIDENCE_DOES_NOT_ENTER_GITHUB','ONLY_SANITIZED_RECEIPTS_MAY_ENTER_GITHUB','SOURCE_OR_APK_IDENTITY_CHANGE_REOPENS_SIGNING_AND_OWNED_DEVICE_CAMPAIGN','BUILD_READY_TRUE_REQUIRES_G_MK0_CLOSED']) assert(laws.has(law), `missing law ${law}`);
const reopen = (design.reopenRules ?? []).find(x => x.signal === 'SOURCE_COMMIT_OR_CANONICAL_APK_SHA_CHANGED');
assert(JSON.stringify(reopen?.reopens) === JSON.stringify(['R1','R2']), 'R1/R2 reopen law drifted');
const nodeIds = (design.nodes ?? []).map(x => x.id);
assert(JSON.stringify(nodeIds) === JSON.stringify(['R0','R1','R2','R3','R4','R5','R6','R7','R8','R9','R10']), 'frozen remainder topology drifted');

const expected = {candidate:'0.2.0-alpha.2+2009',productSource:'9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f',source:'e19bcccee13e326bbc08012533ddaeba026c633a',apk:'1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717',bytes:182514883,signed:'7da560b9382dce0e7ee9100e923a68dc54209934c02554cf70b4c07985f0458a',signedBytes:182538790};
assert(canonical.candidate === expected.candidate && canonical.productSourceCommit === expected.productSource && canonical.sourceCommit === expected.source, 'current canonical source drifted');
assert(canonical.authority?.apkSha256 === expected.apk && canonical.authority?.apkBytes === expected.bytes, 'current canonical APK drifted');
assert(canonical.signing?.androidOauthPackage === 'com.financesensor.lab.gmailconnection.r2' && canonical.signing?.exactScope === 'gmail.readonly', 'package/scope drifted');
assert(canonical.signing?.trustedEdgeSigningPass === true && canonical.signing?.status === 'TRUSTED_EDGE_SIGNING_PASS' && canonical.signing?.signedApkSha256 === expected.signed && canonical.signing?.signedApkBytes === expected.signedBytes, 'current canonical stable signing drifted');
assert(canonical.physicalInstallabilityObservation?.status === 'SIGNED_NOT_YET_PHYSICALLY_OBSERVED' && canonical.physicalInstallabilityObservation?.inheritanceFromPriorCandidateAllowed === false, 'physical frontier drifted');
for (const key of ['physicalAlpha2Pass','buildReady','releaseReady']) assert(canonical.boundaries?.[key] === false, `${key} must remain false`);

assert(r1.candidate === expected.candidate && r1.sourceCommit === expected.source && r1.inputApk?.sha256 === expected.apk, 'R1 current authority drifted');
assert(r1.status === 'TRUSTED_EDGE_SIGNING_PASS' && r1.trustedEdgeSigningPass === true && r1.signedApkSha256 === expected.signed, 'R1 signing PASS drifted');
assert(r2.candidate?.id === expected.candidate && r2.candidate?.canonicalInputApkSha256 === expected.apk && r2.candidate?.signedApkSha256 === expected.signed, 'R2 current authority drifted');
assert(r2.status === 'READY_FOR_CONSOLIDATED_OWNED_DEVICE_UAT' && r2.currentState?.r2PhysicalCampaign === 'READY_FOR_CONSOLIDATED_UAT', 'R2 must be ready for consolidated UAT');
assert(r2.currentState?.nextGate === 'CONSOLIDATED_OWNED_DEVICE_UAT', 'current execution frontier must be consolidated UAT');
assert(gate.ownedDeviceUat?.requestAllowed === true && gate.ownedDeviceUat?.humanUatEligible === true, 'human intervention frontier drifted');

for (const id of ['Q-003','Q-004','Q-005']) assert(ledger.nodes?.find(n => n.id === id)?.status === 'ACTIVE', `${id} must remain ACTIVE`);
for (const id of ['A-001','SEC-001','DM-001']) assert(ledger.nodes?.find(n => n.id === id)?.status === 'DRAFTED', `${id} must remain DRAFTED`);
const gmk0 = ledger.nodes?.find(n => n.id === 'G-MK0');
assert(gmk0 && gmk0.status !== 'CLOSED', 'G-MK0 must remain open');
assert(ledger.buildReady === false && readiness.buildReady === false, 'BUILD_READY cannot become true');
assert(readiness.law === 'BUILD_READY_TRUE_REQUIRES_G_MK0_CLOSED', 'build readiness law drifted');
assert(campaign.status === 'ACTIVE', 'broad physical campaign must remain active');

for (const marker of ['DESIGN_FREEZE = PASS','R1 — Trusted-edge signing','R2 — Single owned-device Alpha.2 campaign','R9 — G-MK0','R10 — BUILD_READY','BUILD_READY                       NO','RELEASE_READY                     NO']) assert(doc.includes(marker), `design doc marker missing: ${marker}`);
for (const marker of ['UNMAPPED_PRODUCT_BUILD = FORBIDDEN','ONE_CANONICAL_CANDIDATE_PER_PHYSICAL_CAMPAIGN = REQUIRED','Phase 1 — R1 trusted-edge signing','Phase 2 — R2 owned-device Alpha.2 campaign','PR CI PASS is not inherited by the merge SHA.']) assert(plan.includes(marker), `plan marker missing: ${marker}`);

console.log('PREBUILD_REMAINDER_DESIGN=PASS');
console.log('DESIGN_FREEZE_SNAPSHOT=IMMUTABLE');
console.log('CURRENT_CANONICAL_REFREEZE=0.2.0-alpha.2+2009');
console.log('CURRENT_EXECUTION_FRONTIER=CONSOLIDATED_OWNED_DEVICE_UAT');
console.log('R1_TRUSTED_EDGE_SIGNING=PASS');
console.log('R2_PHYSICAL_CAMPAIGN=READY_FOR_CONSOLIDATED_UAT');
console.log('OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
