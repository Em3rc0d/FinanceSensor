import fs from 'node:fs';

const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const campaign = readJson('graph/alpha2-r2-owned-device-campaign.json');
const schema = readJson('graph/alpha2-r2-sanitized-receipt-schema.json');
const remainder = readJson('graph/prebuild-remainder-design.json');
const canonical = readJson('graph/alpha2-canonical-candidate.json');
const r1 = readJson('graph/alpha2-r1-signing-handoff.json');
const physical = readJson('graph/physical-closure-campaign.json');
const historicalReceiptPath = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD2-2026-09-09.json';
const historicalReceipt = readJson(historicalReceiptPath);
const failures = [];
const fail = message => failures.push(message);
const expected = {
  candidate: '0.2.0-alpha.2+2007',
  sourceCommit: '8a4aa307b9b3328e67232c919a94994e80446331',
  canonicalInputApkSha256: 'a84f0d047366d08c0d3e4850919c73b3aa79a290e9c878315434cebf81775197',
  canonicalInputApkBytes: 182121475,
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  androidPackage: 'com.financesensor.lab.gmailconnection.r2',
  gmailScope: 'gmail.readonly',
};

if (campaign.schemaVersion !== 'A2_R2_OWNED_DEVICE_CAMPAIGN_V2') fail('unexpected R2 campaign schema');
if (campaign.project !== 'FinanceSensor' || campaign.mk !== 'MK0' || campaign.implements !== 'graph/prebuild-remainder-design.json#R2') fail('R2 campaign identity/binding mismatch');
if (campaign.status !== 'BLOCKED_BY_R1_TRUSTED_EDGE_SIGNING') fail('R2 must be blocked by reopened R1');
const candidate = campaign.candidate ?? {};
for (const [key, value] of [['id',expected.candidate],['sourceCommit',expected.sourceCommit],['canonicalInputApkSha256',expected.canonicalInputApkSha256],['canonicalInputApkBytes',expected.canonicalInputApkBytes],['signerSha1',expected.signerSha1],['androidPackage',expected.androidPackage],['gmailScope',expected.gmailScope]]) if (candidate[key] !== value) fail(`candidate ${key} drifted`);
if (candidate.signedApkSha256 !== null || candidate.signedApkBytes !== null || candidate.stableSignedInstallability !== null) fail('R2 cannot bind stable +2007 bytes before R1');
if (candidate.installabilityObservation !== 'OPEN_FOR_CURRENT_CANDIDATE' || candidate.minSdk !== 31) fail('current +2007 physical installability must be open');
if (campaign.r1PhysicalReceipt !== null || campaign.receipt?.current !== null) fail('current +2007 R2 cannot inherit physical receipts');

if (canonical.candidate !== expected.candidate || canonical.sourceCommit !== expected.sourceCommit || canonical.authority?.apkSha256 !== expected.canonicalInputApkSha256 || canonical.authority?.apkBytes !== expected.canonicalInputApkBytes) fail('canonical +2007 authority drifted');
if (canonical.signing?.trustedEdgeSigningPass !== false || canonical.signing?.signedApkSha256 !== null) fail('canonical public receipt cannot originate R1 PASS');
if (r1.candidate !== expected.candidate || r1.sourceCommit !== expected.sourceCommit || r1.status !== 'READY_FOR_TRUSTED_EDGE_SIGNING' || r1.trustedEdgeSigningPass !== false || r1.physicalReceipt !== null) fail('R1 +2007 must remain open');
if (r1.signedApkSha256 !== null || r1.signedApkBytes !== null) fail('R1 stable +2007 bytes must remain unknown before trusted-edge signing');

const historical = campaign.historicalInvalidatedCampaign ?? {};
if (historical.candidate !== '0.2.0-alpha.2+2006' || historical.signedApkSha256 !== '36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0') fail('historical +2006 campaign identity missing');
if (historical.lastSanitizedReceipt !== historicalReceiptPath || historical.continuationAllowed !== false || historical.evidenceInheritanceAllowed !== false || !/OD3|SOURCE_OR_APK/i.test(historical.reason ?? '')) fail('historical +2006 invalidation boundary drifted');
if (historicalReceipt.candidateId !== '0.2.0-alpha.2+2006') fail('historical OD2 receipt must remain +2006 only');

const reopenLaws = new Set(remainder.executionLaws ?? []);
if (!reopenLaws.has('SOURCE_OR_APK_IDENTITY_CHANGE_REOPENS_SIGNING_AND_OWNED_DEVICE_CAMPAIGN')) fail('source/APK identity reopen law missing');
const reopenRule = (remainder.reopenRules ?? []).find(x => x.signal === 'SOURCE_COMMIT_OR_CANONICAL_APK_SHA_CHANGED');
if (JSON.stringify(reopenRule?.reopens) !== JSON.stringify(['R1','R2'])) fail('R1/R2 reopen rule drifted');

const subgates = Array.isArray(campaign.subgates) ? campaign.subgates : [];
const expectedIds = Array.from({length:12}, (_,i) => `OD${i}`);
if (JSON.stringify(subgates.map(x => x.id)) !== JSON.stringify(expectedIds)) fail('R2 gate ordering must be OD0..OD11');
subgates.forEach((gate, i) => {
  const expectedStatus = i === 0 ? 'BLOCKED_BY_R1' : 'BLOCKED_BY_PRIOR_GATE';
  if (gate.status !== expectedStatus) fail(`${gate.id} expected ${expectedStatus}, got ${gate.status}`);
  if (!Array.isArray(gate.physicalClaims) || gate.physicalClaims.length === 0) fail(`${gate.id} physical claims missing`);
});
const frozenR2 = remainder.nodes?.find(node => node.id === 'R2');
if (!frozenR2) fail('prebuild remainder design missing R2');
for (const required of frozenR2?.subgates ?? []) if (!subgates.some(x => x.contract === required)) fail(`R2 missing frozen subgate ${required}`);

if (schema.schemaVersion !== 'A2_R2_SANITIZED_RECEIPT_SCHEMA_V1' || schema.receiptClass !== 'SANITIZED_SUMMARY_ONLY') fail('receipt schema authority drifted');
const requiredGateIds = new Set(schema.requiredGateIds ?? []);
for (const id of expectedIds) if (!requiredGateIds.has(id)) fail(`receipt schema missing ${id}`);
const laws = campaign.laws ?? {};
for (const key of ['sameSignedCandidateRequired','allSubgatesMustPassForR2','anyCandidateIdentityChangeInvalidatesCampaign','physicalPassCannotBeDerivedFromPublicCi','r2DoesNotCloseQ003Q004Q005']) if (laws[key] !== true) fail(`R2 law ${key} must remain true`);
for (const key of ['perSliceApkPromotionAllowed','buildReadyPromotionAllowed','releaseReadyPromotionAllowed']) if (laws[key] !== false) fail(`R2 law ${key} must remain false`);

const state = campaign.currentState ?? {};
if (state.r1TrustedEdgeSigning !== 'OPEN' || state.r2PhysicalCampaign !== 'BLOCKED_BY_R1') fail('current R1/R2 state drifted');
if (state.nextGate !== 'R1_TRUSTED_EDGE_SIGNING' || state.currentBlocker !== 'CURRENT_2007_STABLE_SIGNED_APK_NOT_YET_CERTIFIED') fail('next gate/blocker drifted');
for (const q of ['q003','q004','q005']) if (state[q] !== 'ACTIVE') fail(`${q} must remain ACTIVE`);
if (state.gMk0 !== 'OPEN' || state.buildReady !== false || state.releaseReady !== false) fail('R2 reset cannot promote readiness');
if (physical.status !== 'ACTIVE') fail('broad physical campaign must remain ACTIVE');

if (failures.length) {
  console.error('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2007_POSTMERGE');
console.log('R1_PHYSICAL_SIGNING=OPEN');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_BY_R1');
console.log('OD0_OD11_CURRENT_PHYSICAL_PASS=NONE');
console.log('ALPHA2_2006_PHYSICAL_EVIDENCE=HISTORICAL_NON_INHERITABLE');
console.log('SAME_SIGNED_CANDIDATE_REQUIRED=YES');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
