import fs from 'node:fs';

const paths = {
  campaign: 'graph/alpha2-r2-owned-device-campaign.json',
  receiptSchema: 'graph/alpha2-r2-sanitized-receipt-schema.json',
  remainder: 'graph/prebuild-remainder-design.json',
  canonical: 'graph/alpha2-canonical-candidate.json',
  r1: 'graph/alpha2-r1-signing-handoff.json',
  physical: 'graph/physical-closure-campaign.json',
  receipt: 'graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD2-2026-09-09.json',
  od1Evidence: 'mk0/10-evidence/EV-ALPHA2-2006-R2-OD1-OAUTH-2026-09-09.md',
  od2Evidence: 'mk0/10-evidence/EV-ALPHA2-2006-R2-OD2-METADATA-FIRST-2026-09-09.md',
};

const expected = {
  candidate: '0.2.0-alpha.2+2006',
  sourceCommit: 'e26bab7cd87c5e686898998e867d8fb25c99db27',
  canonicalInputApkSha256: '11df4432dd167ab4fa7007283414a88ea3b72c5339946862e833d9aafec1c179',
  canonicalInputApkBytes: 182102047,
  signedApkSha256: '36fa2f4960b9986f14037faf415906d57bac72080bbf28cec60299f85fcba7c0',
  signedApkBytes: 182125094,
  signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0',
  androidPackage: 'com.financesensor.lab.gmailconnection.r2',
  gmailScope: 'gmail.readonly',
  r1Receipt: 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2006-2026-09-08.json',
  currentReceipt: paths.receipt,
};

const failures = [];
const fail = message => failures.push(message);
const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
for (const path of Object.values(paths)) if (!fs.existsSync(path)) fail(`missing ${path}`);

if (!failures.length) {
  const campaign = readJson(paths.campaign);
  const schema = readJson(paths.receiptSchema);
  const remainder = readJson(paths.remainder);
  const canonical = readJson(paths.canonical);
  const r1 = readJson(paths.r1);
  const physical = readJson(paths.physical);
  const receipt = readJson(paths.receipt);

  if (campaign.schemaVersion !== 'A2_R2_OWNED_DEVICE_CAMPAIGN_V1') fail('unexpected R2 campaign schema');
  if (campaign.project !== 'FinanceSensor' || campaign.mk !== 'MK0') fail('R2 campaign identity mismatch');
  if (campaign.implements !== 'graph/prebuild-remainder-design.json#R2') fail('R2 implementation binding missing');
  if (campaign.status !== 'PHYSICAL_CAMPAIGN_IN_PROGRESS') fail('R2 must remain PHYSICAL_CAMPAIGN_IN_PROGRESS');

  const candidate = campaign.candidate ?? {};
  const identity = [
    ['id', expected.candidate],
    ['sourceCommit', expected.sourceCommit],
    ['canonicalInputApkSha256', expected.canonicalInputApkSha256],
    ['canonicalInputApkBytes', expected.canonicalInputApkBytes],
    ['signedApkSha256', expected.signedApkSha256],
    ['signedApkBytes', expected.signedApkBytes],
    ['signerSha1', expected.signerSha1],
    ['androidPackage', expected.androidPackage],
    ['gmailScope', expected.gmailScope],
  ];
  for (const [key, value] of identity) if (candidate[key] !== value) fail(`candidate ${key} drifted`);
  if (candidate.minSdk !== 31) fail('R2 candidate minSdk drifted');
  if (candidate.installabilityObservation !== 'PASS_ON_CURRENT_CANDIDATE' || candidate.stableSignedInstallability !== 'OD0_PASS') fail('OD0 installability authority drifted');

  if (canonical.candidate !== expected.candidate || canonical.sourceCommit !== expected.sourceCommit) fail('canonical candidate identity drifted');
  if (canonical.authority?.apkSha256 !== expected.canonicalInputApkSha256 || canonical.authority?.apkBytes !== expected.canonicalInputApkBytes) fail('canonical input APK identity drifted');
  if (canonical.signing?.androidOauthPackage !== expected.androidPackage || canonical.signing?.exactScope !== expected.gmailScope || canonical.signing?.expectedSignerSha1 !== expected.signerSha1) fail('canonical Android OAuth identity drifted');
  if (canonical.signing?.trustedEdgeSigningPass !== false || canonical.signing?.signedApkSha256 !== null) fail('public canonical receipt may not originate trusted-edge signing PASS');

  if (r1.status !== 'TRUSTED_EDGE_SIGNING_PASS' || r1.trustedEdgeSigningPass !== true) fail('R1 must remain trusted-edge signing PASS');
  if (r1.physicalReceipt?.path !== expected.r1Receipt || campaign.r1PhysicalReceipt !== expected.r1Receipt) fail('R1/R2 signing receipt binding drifted');
  if (r1.signedApkSha256 !== expected.signedApkSha256 || r1.signedApkBytes !== expected.signedApkBytes) fail('R1 signed APK authority drifted');

  const reopenLaws = new Set(remainder.executionLaws ?? []);
  if (!reopenLaws.has('SOURCE_OR_APK_IDENTITY_CHANGE_REOPENS_SIGNING_AND_OWNED_DEVICE_CAMPAIGN')) fail('source/APK identity reopen law missing');
  const reopenRule = (remainder.reopenRules ?? []).find(x => x.signal === 'SOURCE_COMMIT_OR_CANONICAL_APK_SHA_CHANGED');
  if (JSON.stringify(reopenRule?.reopens) !== JSON.stringify(['R1','R2'])) fail('R1/R2 reopen rule drifted');

  const subgates = Array.isArray(campaign.subgates) ? campaign.subgates : [];
  const expectedIds = Array.from({length: 12}, (_, i) => `OD${i}`);
  if (JSON.stringify(subgates.map(x => x.id)) !== JSON.stringify(expectedIds)) fail('R2 gate ordering must be OD0..OD11');
  const expectedStatuses = ['PASS','PASS','PASS','READY_FOR_PHYSICAL',...Array(8).fill('BLOCKED_BY_PRIOR_GATE')];
  subgates.forEach((gate, i) => {
    if (gate.status !== expectedStatuses[i]) fail(`${gate.id} expected ${expectedStatuses[i]}, got ${gate.status}`);
    if (!Array.isArray(gate.physicalClaims) || gate.physicalClaims.length === 0) fail(`${gate.id} physical claims missing`);
  });
  const frozenR2 = remainder.nodes?.find(node => node.id === 'R2');
  if (!frozenR2) fail('prebuild remainder design missing R2');
  for (const required of frozenR2?.subgates ?? []) if (!subgates.some(x => x.contract === required)) fail(`R2 missing frozen subgate ${required}`);

  if (campaign.receipt?.current !== expected.currentReceipt) fail('current cumulative R2 receipt drifted');
  if (receipt.schemaVersion !== 'A2_R2_SANITIZED_RECEIPT_V1') fail('unexpected cumulative R2 receipt schema');
  for (const [key, value] of [
    ['candidateId', expected.candidate],
    ['sourceCommit', expected.sourceCommit],
    ['signedApkSha256', expected.signedApkSha256],
    ['signedApkBytes', expected.signedApkBytes],
    ['signerSha1', expected.signerSha1],
    ['androidPackage', expected.androidPackage],
    ['gmailScope', expected.gmailScope],
  ]) if (receipt[key] !== value) fail(`cumulative R2 receipt ${key} drifted`);
  if (receipt.deviceClass !== 'OWNED_ANDROID_PHONE') fail('receipt device class drifted');
  if (!Number.isInteger(receipt.androidApiLevel) || receipt.androidApiLevel < 31) fail('receipt Android API level invalid');
  if (receipt.sanitizationPass !== true) fail('receipt sanitization must PASS');

  const results = Array.isArray(receipt.gateResults) ? receipt.gateResults : [];
  if (JSON.stringify(results.map(x => x.gateId)) !== JSON.stringify(expectedIds)) fail('receipt must enumerate OD0..OD11 exactly once in order');
  const [od0, od1, od2, od3, ...later] = results;
  if (od0?.gateStatus !== 'PASS' || od0?.stableResultCode !== 'R1_BOUND_SIGNED_APK_INSTALL_AND_LAUNCH_PASS' || od0?.coarseCounters?.physicalLaunchObservations !== 1) fail('OD0 cumulative receipt drifted');
  if (od1?.gateStatus !== 'PASS' || od1?.stableResultCode !== 'FRESH_REAL_GMAIL_READONLY_OAUTH_PASS' || od1?.coarseCounters?.freshOauthObservations !== 1) fail('OD1 fresh OAuth receipt drifted');
  if (od2?.gateStatus !== 'PASS' || od2?.stableResultCode !== 'METADATA_FIRST_DISCOVERY_PASS_NATIVE_HANDLE_BOUNDARY') fail('OD2 metadata-first receipt drifted');
  if (od2?.coarseCounters?.gmailObservedCount !== 6 || od2?.coarseCounters?.statementReviewCount !== 8 || od2?.coarseCounters?.quarantinedProfileCount !== 3) fail('OD2 sanitized counters drifted');
  if (od3?.gateStatus !== 'INCONCLUSIVE' || od3?.stableResultCode !== 'ALLOWED_PROFILE_ATTACHMENT_FETCH_REJECTED') fail('OD3 blocker receipt drifted');
  if (od3?.coarseCounters?.statementFetchRejectedCount !== 8 || od3?.coarseCounters?.statementImportedCount !== 0) fail('OD3 sanitized blocker counters drifted');
  for (const gate of later) if (gate.gateStatus !== 'INCONCLUSIVE' || gate.stableResultCode !== 'NOT_EXECUTED_PRIOR_GATE_OPEN') fail(`${gate.gateId} must remain inconclusive behind OD3`);

  if (schema.schemaVersion !== 'A2_R2_SANITIZED_RECEIPT_SCHEMA_V1' || schema.receiptClass !== 'SANITIZED_SUMMARY_ONLY') fail('receipt schema authority drifted');
  const requiredGateIds = new Set(schema.requiredGateIds ?? []);
  for (const id of expectedIds) if (!requiredGateIds.has(id)) fail(`receipt schema missing ${id}`);
  if (requiredGateIds.size !== 12) fail('receipt schema must require exactly OD0..OD11');
  const forbiddenKeys = new Set((schema.forbiddenKeysCaseInsensitive ?? []).map(x => x.toLowerCase()));
  const walk = value => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKeys.has(key.toLowerCase())) fail(`receipt contains forbidden key ${key}`);
      walk(child);
    }
  };
  walk(receipt);

  const laws = campaign.laws ?? {};
  for (const key of ['sameSignedCandidateRequired','allSubgatesMustPassForR2','anyCandidateIdentityChangeInvalidatesCampaign','physicalPassCannotBeDerivedFromPublicCi','r2DoesNotCloseQ003Q004Q005']) if (laws[key] !== true) fail(`R2 law ${key} must remain true`);
  for (const key of ['perSliceApkPromotionAllowed','buildReadyPromotionAllowed','releaseReadyPromotionAllowed']) if (laws[key] !== false) fail(`R2 law ${key} must remain false`);

  const state = campaign.currentState ?? {};
  if (state.r1TrustedEdgeSigning !== 'PASS' || state.r2PhysicalCampaign !== 'IN_PROGRESS') fail('current R1/R2 campaign state drifted');
  if (state.nextGate !== 'OD3_BOUNDED_FETCH_ONLY_FOR_ALLOWED_PROFILE') fail('OD3 must be the next physical gate');
  if (state.currentBlocker !== 'OD3_ALLOWED_PROFILE_ATTACHMENT_FETCH_REJECTED') fail('OD3 current blocker drifted');
  for (const q of ['q003','q004','q005']) if (state[q] !== 'ACTIVE') fail(`${q} must remain ACTIVE`);
  if (state.gMk0 !== 'OPEN' || state.buildReady !== false || state.releaseReady !== false) fail('incremental R2 evidence cannot promote G-MK0/build/release');

  if (physical.status !== 'ACTIVE') fail('broad physical campaign must remain ACTIVE');
  for (const phaseId of ['P1','P2','P3','P4','P5','P6','P7']) {
    const phase = physical.phases?.find(p => p.id === phaseId);
    if (!phase || phase.status === 'PASS') fail(`${phaseId} must remain physically open`);
  }
}

if (failures.length) {
  console.error('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2006_POSTMERGE');
console.log('R1_PHYSICAL_SIGNING=PASS');
console.log('R2_PHYSICAL_CAMPAIGN=IN_PROGRESS');
console.log('OD0_INSTALL_AND_LAUNCH=PASS');
console.log('OD1_EXACT_GMAIL_READONLY_OAUTH=PASS');
console.log('OD2_METADATA_FIRST_STATEMENT_DISCOVERY=PASS');
console.log('OD3_BOUNDED_FETCH_ONLY_FOR_ALLOWED_PROFILE=READY');
console.log('OD3_CURRENT_BLOCKER=ALLOWED_PROFILE_ATTACHMENT_FETCH_REJECTED');
console.log('SAME_SIGNED_CANDIDATE_REQUIRED=YES');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
