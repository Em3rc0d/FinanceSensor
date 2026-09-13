import fs from 'node:fs';

const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const campaignPath = 'graph/alpha2-r2-owned-device-campaign.json';
const schemaPath = 'graph/alpha2-r2-sanitized-receipt-schema.json';
const remainderPath = 'graph/prebuild-remainder-design.json';
const canonicalPath = 'graph/alpha2-canonical-candidate.json';
const r1Path = 'graph/alpha2-r1-signing-handoff.json';
const physicalPath = 'graph/physical-closure-campaign.json';
const currentR1ReceiptPath = 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2007-2026-09-12.json';
const currentOd1ReceiptPath = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD1-2026-09-13.json';
const currentEvidencePath = 'mk0/10-evidence/EV-ALPHA2-2007-R2-OD1-GMAIL-READONLY-OAUTH-2026-09-13.md';
const historicalReceiptPath = 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD2-2026-09-09.json';
const requiredPaths = [campaignPath, schemaPath, remainderPath, canonicalPath, r1Path, physicalPath, currentR1ReceiptPath, currentOd1ReceiptPath, currentEvidencePath, historicalReceiptPath];
const failures = [];
const fail = message => failures.push(message);
for (const path of requiredPaths) if (!fs.existsSync(path)) fail(`missing ${path}`);

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

if (!failures.length) {
  const campaign = readJson(campaignPath);
  const schema = readJson(schemaPath);
  const remainder = readJson(remainderPath);
  const canonical = readJson(canonicalPath);
  const r1 = readJson(r1Path);
  const physical = readJson(physicalPath);
  const r1Receipt = readJson(currentR1ReceiptPath);
  const receipt = readJson(currentOd1ReceiptPath);
  const historicalReceipt = readJson(historicalReceiptPath);

  if (campaign.schemaVersion !== 'A2_R2_OWNED_DEVICE_CAMPAIGN_V2') fail('unexpected R2 campaign schema');
  if (campaign.project !== 'FinanceSensor' || campaign.mk !== 'MK0' || campaign.implements !== 'graph/prebuild-remainder-design.json#R2') fail('R2 campaign identity/binding mismatch');
  if (campaign.status !== 'PHYSICAL_CAMPAIGN_IN_PROGRESS') fail('R2 must remain in progress after OD1 PASS');

  const candidate = campaign.candidate ?? {};
  for (const [key, value] of [
    ['id', expected.candidate], ['sourceCommit', expected.sourceCommit],
    ['canonicalInputApkSha256', expected.canonicalInputApkSha256], ['canonicalInputApkBytes', expected.canonicalInputApkBytes],
    ['signedApkSha256', expected.signedApkSha256], ['signedApkBytes', expected.signedApkBytes],
    ['signerSha1', expected.signerSha1], ['androidPackage', expected.androidPackage], ['gmailScope', expected.gmailScope]
  ]) if (candidate[key] !== value) fail(`candidate ${key} drifted`);
  if (candidate.minSdk !== 31 || candidate.installabilityObservation !== 'PASS_ON_CURRENT_CANDIDATE' || candidate.stableSignedInstallability !== 'OD0_PASS') fail('stable +2007 candidate installability state drifted');
  if (campaign.r1PhysicalReceipt !== currentR1ReceiptPath || campaign.receipt?.current !== currentOd1ReceiptPath) fail('R1/OD1 receipt binding drifted');

  if (r1Receipt.candidate !== expected.candidate || r1Receipt.sourceCommit !== expected.sourceCommit || r1Receipt.signedApkSha256 !== expected.signedApkSha256 || r1Receipt.signedApkBytes !== expected.signedApkBytes) fail('R1 receipt identity drifted');
  if (r1Receipt.signerSha1 !== expected.signerSha1 || r1Receipt.androidPackage !== expected.androidPackage || r1Receipt.gmailScope !== expected.gmailScope || r1Receipt.trustedEdgeSigningPass !== true || r1Receipt.sanitizationPass !== true || r1Receipt.rawPrivateMaterialCommitted !== false) fail('R1 trust/sanitization boundary drifted');

  if (canonical.candidate !== expected.candidate || canonical.sourceCommit !== expected.sourceCommit || canonical.authority?.apkSha256 !== expected.canonicalInputApkSha256 || canonical.authority?.apkBytes !== expected.canonicalInputApkBytes) fail('canonical +2007 authority drifted');
  if (canonical.signing?.trustedEdgeSigningPass !== true || canonical.signing?.signedApkSha256 !== expected.signedApkSha256 || canonical.signing?.signedApkBytes !== expected.signedApkBytes) fail('canonical stable signing identity drifted');
  if (canonical.boundaries?.physicalAlpha2Pass !== false || canonical.boundaries?.buildReady !== false || canonical.boundaries?.releaseReady !== false) fail('OD1 cannot promote canonical physical/build/release boundary');
  if (r1.candidate !== expected.candidate || r1.sourceCommit !== expected.sourceCommit || r1.status !== 'TRUSTED_EDGE_SIGNING_PASS' || r1.trustedEdgeSigningPass !== true) fail('R1 +2007 must remain PASS');
  if (r1.signedApkSha256 !== expected.signedApkSha256 || r1.signedApkBytes !== expected.signedApkBytes || r1.physicalReceipt?.path !== currentR1ReceiptPath) fail('R1 stable APK/receipt binding drifted');

  const historical = campaign.historicalInvalidatedCampaign ?? {};
  if (historical.candidate !== '0.2.0-alpha.2+2006' || historical.signedApkSha256 !== '36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0') fail('historical +2006 campaign identity missing');
  if (historical.lastSanitizedReceipt !== historicalReceiptPath || historical.continuationAllowed !== false || historical.evidenceInheritanceAllowed !== false) fail('historical +2006 non-inheritance boundary drifted');
  if (historicalReceipt.candidateId !== '0.2.0-alpha.2+2006') fail('historical OD2 receipt must remain +2006 only');

  const reopenLaws = new Set(remainder.executionLaws ?? []);
  if (!reopenLaws.has('SOURCE_OR_APK_IDENTITY_CHANGE_REOPENS_SIGNING_AND_OWNED_DEVICE_CAMPAIGN')) fail('source/APK identity reopen law missing');
  const remainderR1 = remainder.nodes?.find(node => node.id === 'R1');
  const remainderR2 = remainder.nodes?.find(node => node.id === 'R2');
  if (remainderR1?.status !== 'CLOSED' || remainderR2?.status !== 'DESIGN_FROZEN_EXECUTION_OPEN') fail('prebuild remainder R1/R2 state drifted');

  const subgates = Array.isArray(campaign.subgates) ? campaign.subgates : [];
  const expectedIds = Array.from({length: 12}, (_, i) => `OD${i}`);
  if (JSON.stringify(subgates.map(x => x.id)) !== JSON.stringify(expectedIds)) fail('R2 gate ordering must be OD0..OD11');
  const expectedStatuses = ['PASS', 'PASS', 'READY_FOR_PHYSICAL', ...Array(9).fill('BLOCKED_BY_PRIOR_GATE')];
  for (let i = 0; i < expectedStatuses.length; i += 1) {
    if (subgates[i]?.status !== expectedStatuses[i]) fail(`OD${i} expected ${expectedStatuses[i]}, got ${subgates[i]?.status}`);
    if (!Array.isArray(subgates[i]?.physicalClaims) || subgates[i].physicalClaims.length === 0) fail(`OD${i} physical claims missing`);
  }
  for (const required of remainderR2?.subgates ?? []) if (!subgates.some(x => x.contract === required)) fail(`R2 missing frozen subgate ${required}`);

  if (schema.schemaVersion !== 'A2_R2_SANITIZED_RECEIPT_SCHEMA_V1' || schema.receiptClass !== 'SANITIZED_SUMMARY_ONLY') fail('receipt schema authority drifted');
  const requiredGateIds = new Set(schema.requiredGateIds ?? []);
  for (const id of expectedIds) if (!requiredGateIds.has(id)) fail(`receipt schema missing ${id}`);

  if (receipt.schemaVersion !== 'A2_R2_SANITIZED_RECEIPT_V1') fail('unexpected OD1 receipt schema');
  for (const [key, value] of [
    ['candidateId', expected.candidate], ['sourceCommit', expected.sourceCommit],
    ['signedApkSha256', expected.signedApkSha256], ['signedApkBytes', expected.signedApkBytes],
    ['signerSha1', expected.signerSha1], ['androidPackage', expected.androidPackage], ['gmailScope', expected.gmailScope]
  ]) if (receipt[key] !== value) fail(`OD1 receipt ${key} drifted`);
  if (receipt.deviceClass !== 'OWNED_ANDROID_PHONE' || !Number.isInteger(receipt.androidApiLevel) || receipt.androidApiLevel < candidate.minSdk) fail('OD1 receipt device/API binding invalid');
  if (receipt.sanitizationPass !== true) fail('OD1 receipt sanitization must PASS');
  const gateResults = Array.isArray(receipt.gateResults) ? receipt.gateResults : [];
  if (JSON.stringify(gateResults.map(x => x.gateId)) !== JSON.stringify(expectedIds)) fail('OD1 receipt must enumerate OD0..OD11 exactly once in order');
  if (gateResults[0]?.gateStatus !== 'PASS' || gateResults[0]?.stableResultCode !== 'R1_BOUND_SIGNED_APK_INSTALL_AND_LAUNCH_PASS') fail('OD0 cumulative PASS drifted');
  if (gateResults[1]?.gateStatus !== 'PASS' || gateResults[1]?.stableResultCode !== 'FRESH_GOOGLE_OAUTH_RETURNED_CONNECTED_EXACT_READONLY_CONTRACT') fail('OD1 PASS code drifted');
  if (gateResults[1]?.coarseCounters?.disconnectedStateObservations !== 1 || gateResults[1]?.coarseCounters?.freshOauthReturnObservations !== 1 || gateResults[1]?.coarseCounters?.connectedStateObservations !== 1 || gateResults[1]?.coarseCounters?.downstreamLocalHandoffObservations !== 1) fail('OD1 coarse observation counters drifted');
  if (gateResults[2]?.gateStatus !== 'INCONCLUSIVE' || gateResults[2]?.stableResultCode !== 'NOT_EXECUTED_METADATA_FIRST_PROOF_REQUIRED') fail('OD2 must remain inconclusive until metadata-first proof');
  for (const gate of gateResults.slice(3)) if (gate.gateStatus !== 'INCONCLUSIVE') fail(`${gate.gateId} must remain INCONCLUSIVE in incremental OD1 receipt`);

  const forbiddenKeys = new Set((schema.forbiddenKeysCaseInsensitive ?? []).map(x => x.toLowerCase()));
  const walk = value => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKeys.has(key.toLowerCase())) fail(`OD1 receipt contains forbidden key ${key}`);
      walk(child);
    }
  };
  walk(receipt);

  const laws = campaign.laws ?? {};
  for (const key of ['sameSignedCandidateRequired','allSubgatesMustPassForR2','anyCandidateIdentityChangeInvalidatesCampaign','physicalPassCannotBeDerivedFromPublicCi','r2DoesNotCloseQ003Q004Q005']) if (laws[key] !== true) fail(`R2 law ${key} must remain true`);
  for (const key of ['perSliceApkPromotionAllowed','buildReadyPromotionAllowed','releaseReadyPromotionAllowed']) if (laws[key] !== false) fail(`R2 law ${key} must remain false`);

  const state = campaign.currentState ?? {};
  if (state.r1TrustedEdgeSigning !== 'PASS' || state.r2PhysicalCampaign !== 'IN_PROGRESS') fail('current R1/R2 state drifted');
  if (state.nextGate !== 'OD2_METADATA_FIRST_STATEMENT_DISCOVERY' || state.currentBlocker !== 'OD2_METADATA_FIRST_ORDERING_NOT_YET_PROVEN') fail('next gate/blocker drifted');
  for (const q of ['q003','q004','q005']) if (state[q] !== 'ACTIVE') fail(`${q} must remain ACTIVE`);
  if (state.gMk0 !== 'OPEN' || state.buildReady !== false || state.releaseReady !== false) fail('OD1 cannot promote G-MK0/build/release');
  if (physical.status !== 'ACTIVE') fail('broad physical campaign must remain ACTIVE');
}

if (failures.length) {
  console.error('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2007_STABLE_SIGNED');
console.log('R1_PHYSICAL_SIGNING=PASS_FROM_SANITIZED_RECEIPT');
console.log('R2_PHYSICAL_CAMPAIGN=IN_PROGRESS');
console.log('OD0_INSTALL_AND_LAUNCH=PASS_FROM_SANITIZED_PHYSICAL_RECEIPT');
console.log('OD1_EXACT_GMAIL_READONLY_OAUTH=PASS_FROM_SANITIZED_PHYSICAL_RECEIPT');
console.log('OD2_METADATA_FIRST_STATEMENT_DISCOVERY=READY_FOR_PHYSICAL');
console.log('CURRENT_OD0_OD11_PASS=OD0_OD1');
console.log('ALPHA2_2006_PHYSICAL_EVIDENCE=HISTORICAL_NON_INHERITABLE');
console.log('SAME_SIGNED_CANDIDATE_REQUIRED=YES');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=NO');
console.log('R2_NEXT_GATE=OD2_METADATA_FIRST_STATEMENT_DISCOVERY');
console.log('R2_CURRENT_BLOCKER=OD2_METADATA_FIRST_ORDERING_NOT_YET_PROVEN');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
