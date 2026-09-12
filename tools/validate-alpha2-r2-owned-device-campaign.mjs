import fs from 'node:fs';

const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const campaign = readJson('graph/alpha2-r2-owned-device-campaign.json');
const schema = readJson('graph/alpha2-r2-sanitized-receipt-schema.json');
const remainder = readJson('graph/prebuild-remainder-design.json');
const canonical = readJson('graph/alpha2-canonical-candidate.json');
const r1 = readJson('graph/alpha2-r1-signing-handoff.json');
const physical = readJson('graph/physical-closure-campaign.json');
const currentR1ReceiptPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.json';
const currentR1Receipt = readJson(currentR1ReceiptPath);
const historicalReceiptPath = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD2-2026-09-09.json';
const historicalReceipt = readJson(historicalReceiptPath);
const failures = [];
const fail = message => failures.push(message);
const expected = {
  candidate: '0.2.0-alpha.2+2007',
  sourceCommit: '8a4aa307b9b3328e67232c919a94994e80446331',
  canonicalInputApkSha256: 'a84f0d047366d08c0d3e4850919c73b3aa79a290e9c878315434cebf81775197',
  canonicalInputApkBytes: 182121475,
  signedApkSha256: '40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab',
  signedApkBytes: 182145574,
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  androidPackage: 'com.financesensor.lab.gmailconnection.r2',
  gmailScope: 'gmail.readonly',
};

if (campaign.schemaVersion !== 'A2_R2_OWNED_DEVICE_CAMPAIGN_V2') fail('unexpected R2 campaign schema');
if (campaign.project !== 'FinanceSensor' || campaign.mk !== 'MK0' || campaign.implements !== 'graph/prebuild-remainder-design.json#R2') fail('R2 campaign identity/binding mismatch');
if (campaign.status !== 'READY_FOR_PHYSICAL') fail('R2 must be ready for OD0 after R1 PASS');
const candidate = campaign.candidate ?? {};
for (const [key, value] of [['id',expected.candidate],['sourceCommit',expected.sourceCommit],['canonicalInputApkSha256',expected.canonicalInputApkSha256],['canonicalInputApkBytes',expected.canonicalInputApkBytes],['signedApkSha256',expected.signedApkSha256],['signedApkBytes',expected.signedApkBytes],['signerSha1',expected.signerSha1],['androidPackage',expected.androidPackage],['gmailScope',expected.gmailScope]]) if (candidate[key] !== value) fail(`candidate ${key} drifted`);
if (candidate.installabilityObservation !== 'READY_FOR_OD0' || candidate.stableSignedInstallability !== 'OPEN' || candidate.minSdk !== 31) fail('stable +2007 candidate must be ready for OD0 with physical installability still open');
if (campaign.r1PhysicalReceipt !== currentR1ReceiptPath || campaign.receipt?.current !== null) fail('R2 must bind R1 receipt and have no OD receipt before OD0');

if (currentR1Receipt.candidate !== expected.candidate || currentR1Receipt.sourceCommit !== expected.sourceCommit || currentR1Receipt.signedApkSha256 !== expected.signedApkSha256 || currentR1Receipt.signedApkBytes !== expected.signedApkBytes) fail('current +2007 R1 receipt identity drifted');
if (currentR1Receipt.signerSha1 !== expected.signerSha1 || currentR1Receipt.androidPackage !== expected.androidPackage || currentR1Receipt.gmailScope !== expected.gmailScope || currentR1Receipt.trustedEdgeSigningPass !== true || currentR1Receipt.sanitizationPass !== true || currentR1Receipt.rawPrivateMaterialCommitted !== false) fail('current +2007 R1 receipt trust/sanitization boundary drifted');

if (canonical.candidate !== expected.candidate || canonical.sourceCommit !== expected.sourceCommit || canonical.authority?.apkSha256 !== expected.canonicalInputApkSha256 || canonical.authority?.apkBytes !== expected.canonicalInputApkBytes) fail('canonical +2007 authority drifted');
if (canonical.signing?.trustedEdgeSigningPass !== true || canonical.signing?.signedApkSha256 !== expected.signedApkSha256 || canonical.signing?.signedApkBytes !== expected.signedApkBytes) fail('canonical stable signing binding drifted');
if (canonical.boundaries?.ownedDeviceInstallPass !== false || canonical.boundaries?.ownedDeviceLaunchPass !== false || canonical.boundaries?.physicalAlpha2Pass !== false) fail('R1 cannot derive OD0 or full physical PASS');
if (r1.candidate !== expected.candidate || r1.sourceCommit !== expected.sourceCommit || r1.status !== 'TRUSTED_EDGE_SIGNING_PASS' || r1.trustedEdgeSigningPass !== true) fail('R1 +2007 must be PASS');
if (r1.signedApkSha256 !== expected.signedApkSha256 || r1.signedApkBytes !== expected.signedApkBytes || r1.physicalReceipt?.path !== currentR1ReceiptPath) fail('R1 signed APK/receipt binding drifted');

const historical = campaign.historicalInvalidatedCampaign ?? {};
if (historical.candidate !== '0.2.0-alpha.2+2006' || historical.signedApkSha256 !== '36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0') fail('historical +2006 campaign identity missing');
if (historical.lastSanitizedReceipt !== historicalReceiptPath || historical.continuationAllowed !== false || historical.evidenceInheritanceAllowed !== false || !/OD3|SOURCE_OR_APK/i.test(historical.reason ?? '')) fail('historical +2006 invalidation boundary drifted');
if (historicalReceipt.candidateId !== '0.2.0-alpha.2+2006') fail('historical OD2 receipt must remain +2006 only');

const reopenLaws = new Set(remainder.executionLaws ?? []);
if (!reopenLaws.has('SOURCE_OR_APK_IDENTITY_CHANGE_REOPENS_SIGNING_AND_OWNED_DEVICE_CAMPAIGN')) fail('source/APK identity reopen law missing');
const reopenRule = (remainder.reopenRules ?? []).find(x => x.signal === 'SOURCE_COMMIT_OR_CANONICAL_APK_SHA_CHANGED');
if (JSON.stringify(reopenRule?.reopens) !== JSON.stringify(['R1','R2'])) fail('R1/R2 reopen rule drifted');
const remainderR1 = remainder.nodes?.find(node => node.id === 'R1');
const remainderR2 = remainder.nodes?.find(node => node.id === 'R2');
if (remainderR1?.status !== 'CLOSED' || remainderR2?.status !== 'DESIGN_FROZEN_EXECUTION_OPEN') fail('prebuild remainder graph did not advance R1 -> R2');

const subgates = Array.isArray(campaign.subgates) ? campaign.subgates : [];
const expectedIds = Array.from({length:12}, (_,i) => `OD${i}`);
if (JSON.stringify(subgates.map(x => x.id)) !== JSON.stringify(expectedIds)) fail('R2 gate ordering must be OD0..OD11');
subgates.forEach((gate, i) => {
  const expectedStatus = i === 0 ? 'READY_FOR_PHYSICAL' : 'BLOCKED_BY_PRIOR_GATE';
  if (gate.status !== expectedStatus) fail(`${gate.id} expected ${expectedStatus}, got ${gate.status}`);
  if (!Array.isArray(gate.physicalClaims) || gate.physicalClaims.length === 0) fail(`${gate.id} physical claims missing`);
});
for (const required of remainderR2?.subgates ?? []) if (!subgates.some(x => x.contract === required)) fail(`R2 missing frozen subgate ${required}`);

if (schema.schemaVersion !== 'A2_R2_SANITIZED_RECEIPT_SCHEMA_V1' || schema.receiptClass !== 'SANITIZED_SUMMARY_ONLY') fail('receipt schema authority drifted');
const requiredGateIds = new Set(schema.requiredGateIds ?? []);
for (const id of expectedIds) if (!requiredGateIds.has(id)) fail(`receipt schema missing ${id}`);
const laws = campaign.laws ?? {};
for (const key of ['sameSignedCandidateRequired','allSubgatesMustPassForR2','anyCandidateIdentityChangeInvalidatesCampaign','physicalPassCannotBeDerivedFromPublicCi','r2DoesNotCloseQ003Q004Q005']) if (laws[key] !== true) fail(`R2 law ${key} must remain true`);
for (const key of ['perSliceApkPromotionAllowed','buildReadyPromotionAllowed','releaseReadyPromotionAllowed']) if (laws[key] !== false) fail(`R2 law ${key} must remain false`);

const state = campaign.currentState ?? {};
if (state.r1TrustedEdgeSigning !== 'PASS' || state.r2PhysicalCampaign !== 'READY') fail('current R1/R2 state drifted');
if (state.nextGate !== 'OD0_SIGNED_APK_INSTALL_AND_LAUNCH' || state.currentBlocker !== 'OD0_INSTALL_AND_LAUNCH_NOT_YET_OBSERVED') fail('next gate/blocker drifted');
for (const q of ['q003','q004','q005']) if (state[q] !== 'ACTIVE') fail(`${q} must remain ACTIVE`);
if (state.gMk0 !== 'OPEN' || state.buildReady !== false || state.releaseReady !== false) fail('R1 PASS/R2 readiness cannot promote G-MK0/build/release');
if (physical.status !== 'ACTIVE') fail('broad physical campaign must remain ACTIVE');

if (failures.length) {
  console.error('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2007_STABLE_SIGNED');
console.log('R1_PHYSICAL_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('R2_PHYSICAL_CAMPAIGN=READY');
console.log('OD0_INSTALL_AND_LAUNCH=READY_FOR_PHYSICAL');
console.log('OD1_OD11_CURRENT_PHYSICAL_PASS=NONE');
console.log('ALPHA2_2006_PHYSICAL_EVIDENCE=HISTORICAL_NON_INHERITABLE');
console.log('SAME_SIGNED_CANDIDATE_REQUIRED=YES');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
