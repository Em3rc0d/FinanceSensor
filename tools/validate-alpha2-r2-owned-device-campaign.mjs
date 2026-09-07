import fs from 'node:fs';

const campaignPath = 'graph/alpha2-r2-owned-device-campaign.json';
const receiptSchemaPath = 'graph/alpha2-r2-sanitized-receipt-schema.json';
const remainderPath = 'graph/prebuild-remainder-design.json';
const r1Path = 'graph/alpha2-r1-signing-handoff.json';
const physicalPath = 'graph/physical-closure-campaign.json';

const failures = [];
const fail = message => failures.push(message);
const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));

for (const path of [campaignPath, receiptSchemaPath, remainderPath, r1Path, physicalPath]) {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
}

if (!failures.length) {
  const campaign = readJson(campaignPath);
  const schema = readJson(receiptSchemaPath);
  const remainder = readJson(remainderPath);
  const r1 = readJson(r1Path);
  const physical = readJson(physicalPath);

  if (campaign.schemaVersion !== 'A2_R2_OWNED_DEVICE_CAMPAIGN_V1') fail('unexpected R2 campaign schema');
  if (campaign.project !== 'FinanceSensor' || campaign.mk !== 'MK0') fail('R2 campaign identity mismatch');
  if (campaign.implements !== 'graph/prebuild-remainder-design.json#R2') fail('R2 implementation binding missing');

  const frozen = remainder.canonicalAlpha2 ?? {};
  const candidate = campaign.candidate ?? {};
  const exactBindings = [
    ['id', frozen.candidate],
    ['sourceCommit', frozen.sourceCommit],
    ['canonicalInputApkSha256', frozen.apkSha256],
    ['canonicalInputApkBytes', frozen.apkBytes],
    ['androidPackage', frozen.package],
    ['gmailScope', frozen.scope],
    ['signerSha1', frozen.stableSignerSha1],
  ];
  for (const [key, expected] of exactBindings) {
    if (candidate[key] !== expected) fail(`candidate ${key} drifted: ${candidate[key]} != ${expected}`);
  }

  if (r1.candidate !== candidate.id) fail('R1/R2 candidate id mismatch');
  if (r1.sourceCommit !== candidate.sourceCommit) fail('R1/R2 source commit mismatch');
  if (r1.inputApk?.sha256 !== candidate.canonicalInputApkSha256) fail('R1/R2 canonical APK hash mismatch');
  if (r1.inputApk?.bytes !== candidate.canonicalInputApkBytes) fail('R1/R2 canonical APK bytes mismatch');
  if (r1.signer?.expectedSignerSha1 !== candidate.signerSha1) fail('R1/R2 signer mismatch');
  if (r1.signer?.androidOauthPackage !== candidate.androidPackage) fail('R1/R2 package mismatch');
  if (r1.signer?.exactScope !== candidate.gmailScope) fail('R1/R2 Gmail scope mismatch');

  if (r1.status !== 'HANDOFF_READY_PHYSICAL_OPEN') fail(`R1 must remain HANDOFF_READY_PHYSICAL_OPEN before receipt; got ${r1.status}`);
  if (r1.trustedEdgeSigningPass !== false || r1.signedApkSha256 !== null) fail('R1 may not claim physical signing before trusted-edge receipt');
  if (campaign.status !== 'BLOCKED_ON_R1_SIGNING') fail(`R2 must be blocked on R1; got ${campaign.status}`);
  if (candidate.signedApkSha256 !== null || candidate.signedApkBytes !== null) fail('R2 signed APK identity must remain null before R1 receipt');

  const laws = campaign.laws ?? {};
  for (const key of [
    'sameSignedCandidateRequired',
    'allSubgatesMustPassForR2',
    'anyCandidateIdentityChangeInvalidatesCampaign',
    'physicalPassCannotBeDerivedFromPublicCi',
    'r2DoesNotCloseQ003Q004Q005'
  ]) {
    if (laws[key] !== true) fail(`R2 law ${key} must be true`);
  }
  for (const key of ['perSliceApkPromotionAllowed', 'buildReadyPromotionAllowed', 'releaseReadyPromotionAllowed']) {
    if (laws[key] !== false) fail(`R2 law ${key} must be false`);
  }

  const r2Frozen = remainder.nodes?.find(node => node.id === 'R2');
  if (!r2Frozen) fail('prebuild remainder design missing R2');
  const requiredContracts = new Set(r2Frozen?.subgates ?? []);
  const subgates = Array.isArray(campaign.subgates) ? campaign.subgates : [];
  const contractSet = new Set(subgates.map(gate => gate.contract));
  for (const contract of requiredContracts) {
    if (!contractSet.has(contract)) fail(`R2 campaign missing frozen subgate ${contract}`);
  }
  if (contractSet.size !== subgates.length) fail('duplicate R2 subgate contract');
  if (subgates.length !== 12) fail(`R2 campaign must contain 12 gates including replay; got ${subgates.length}`);

  const ids = subgates.map(gate => gate.id);
  const expectedIds = Array.from({length: 12}, (_, i) => `OD${i}`);
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) fail(`R2 gate ordering drifted: ${ids.join(',')}`);
  for (const gate of subgates) {
    if (gate.status !== 'BLOCKED_BY_R1') fail(`${gate.id} may not be PASS/OPEN before R1; got ${gate.status}`);
    if (!Array.isArray(gate.physicalClaims) || gate.physicalClaims.length === 0) fail(`${gate.id} missing physical claims`);
  }

  const evidence = campaign.evidencePolicy ?? {};
  if (evidence.githubReceiptClass !== 'SANITIZED_SUMMARY_ONLY') fail('R2 GitHub receipt class must be SANITIZED_SUMMARY_ONLY');
  if (evidence.rawTrustedEdgeEvidenceInGitHub !== false) fail('raw trusted-edge evidence must remain forbidden in GitHub');
  for (const forbidden of ['PRIVATE_KEY', 'KEYSTORE_PASSWORD', 'OAUTH_ACCESS_TOKEN', 'OAUTH_REFRESH_TOKEN', 'RAW_GMAIL_BODY', 'RAW_STATEMENT_PDF', 'PDF_PASSWORD', 'RAW_FINANCIAL_PLAINTEXT']) {
    if (!(evidence.forbiddenInGitHub ?? []).includes(forbidden)) fail(`R2 evidence policy missing forbidden class ${forbidden}`);
  }

  if (schema.schemaVersion !== 'A2_R2_SANITIZED_RECEIPT_SCHEMA_V1') fail('unexpected R2 receipt schema');
  if (schema.receiptClass !== 'SANITIZED_SUMMARY_ONLY') fail('receipt schema class mismatch');
  const requiredGateIds = new Set(schema.requiredGateIds ?? []);
  for (const id of expectedIds) if (!requiredGateIds.has(id)) fail(`receipt schema missing ${id}`);
  if (requiredGateIds.size !== 12) fail('receipt schema must require exactly OD0..OD11');
  if (schema.receiptPassLaw !== 'ALL_REQUIRED_GATES_PASS_ON_ONE_SIGNED_APK_HASH_AND_SANITIZATION_PASS_TRUE') fail('receipt one-hash pass law missing');

  if (physical.status !== 'ACTIVE') fail('broad physical campaign must remain ACTIVE');
  for (const phaseId of ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']) {
    const phase = physical.phases?.find(p => p.id === phaseId);
    if (!phase || phase.status === 'PASS') fail(`${phaseId} must remain physically open after R2 contract freeze`);
  }

  const feeders = campaign.feeders ?? {};
  for (const key of ['R3_Q003', 'R4_Q004', 'R5_Q005']) {
    if (!Array.isArray(feeders[key]) || feeders[key].length === 0) fail(`missing R2 feeder mapping ${key}`);
  }

  const state = campaign.currentState ?? {};
  if (state.r1TrustedEdgeSigning !== 'OPEN') fail('R1 physical state must remain OPEN');
  if (state.r2PhysicalCampaign !== 'BLOCKED_ON_R1') fail('R2 physical state must remain BLOCKED_ON_R1');
  for (const q of ['q003', 'q004', 'q005']) if (state[q] !== 'ACTIVE') fail(`${q} must remain ACTIVE`);
  if (state.gMk0 !== 'OPEN') fail('G-MK0 must remain OPEN');
  if (state.buildReady !== false || state.releaseReady !== false) fail('R2 contract may not promote build/release readiness');
}

if (failures.length) {
  console.error('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=PASS');
console.log('R1_PHYSICAL_SIGNING=OPEN');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_ON_R1');
console.log('SAME_SIGNED_CANDIDATE_REQUIRED=YES');
console.log('R2_REQUIRED_GATES=12');
console.log('PUBLIC_CI_PHYSICAL_PASS=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
