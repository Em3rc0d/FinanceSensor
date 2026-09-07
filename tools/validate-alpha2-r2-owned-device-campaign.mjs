import fs from 'node:fs';

const paths = {
  campaign: 'graph/alpha2-r2-owned-device-campaign.json',
  receiptSchema: 'graph/alpha2-r2-sanitized-receipt-schema.json',
  remainder: 'graph/prebuild-remainder-design.json',
  canonical: 'graph/alpha2-canonical-candidate.json',
  r1: 'graph/alpha2-r1-signing-handoff.json',
  physical: 'graph/physical-closure-campaign.json',
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

  if (campaign.schemaVersion !== 'A2_R2_OWNED_DEVICE_CAMPAIGN_V1') fail('unexpected R2 campaign schema');
  if (campaign.project !== 'FinanceSensor' || campaign.mk !== 'MK0') fail('R2 campaign identity mismatch');
  if (campaign.implements !== 'graph/prebuild-remainder-design.json#R2') fail('R2 implementation binding missing');

  const reopenLaws = new Set(remainder.executionLaws ?? []);
  if (!reopenLaws.has('SOURCE_OR_APK_IDENTITY_CHANGE_REOPENS_SIGNING_AND_OWNED_DEVICE_CAMPAIGN')) fail('prebuild design missing source/APK reopen law');
  const reopenRule = (remainder.reopenRules ?? []).find(x => x.signal === 'SOURCE_COMMIT_OR_CANONICAL_APK_SHA_CHANGED');
  if (JSON.stringify(reopenRule?.reopens) !== JSON.stringify(['R1', 'R2'])) fail('prebuild R1/R2 reopen rule drifted');
  if (remainder.canonicalAlpha2?.candidate !== '0.2.0-alpha.2+2001') fail('historical prebuild snapshot unexpectedly mutated');

  const candidate = campaign.candidate ?? {};
  const currentBindings = [
    ['id', canonical.candidate],
    ['sourceCommit', canonical.sourceCommit],
    ['canonicalInputApkSha256', canonical.authority?.apkSha256],
    ['canonicalInputApkBytes', canonical.authority?.apkBytes],
    ['androidPackage', canonical.signing?.androidOauthPackage],
    ['gmailScope', canonical.signing?.exactScope],
    ['signerSha1', canonical.signing?.expectedSignerSha1],
  ];
  for (const [key, expected] of currentBindings) {
    if (candidate[key] !== expected) fail(`candidate ${key} drifted from current canonical receipt`);
  }
  if (candidate.minSdk !== 31) fail('R2 current candidate must retain minSdk 31');
  if (candidate.installabilityObservation !== 'PASS_INSTALL_AND_LAUNCH_ONLY') fail('R2 installability observation missing');
  if (canonical.authority?.minSdk !== 31) fail('current canonical minSdk must remain 31');
  if (canonical.authority?.signatureVerify !== 'PASS' || canonical.authority?.aapt2Parse !== 'PASS') fail('current canonical APK parser/signature gates must PASS');
  if (canonical.signing?.trustedEdgeSigningPass !== false || canonical.signing?.signedApkSha256 !== null) fail('canonical receipt may not pre-certify trusted-edge signing');

  if (r1.candidate !== candidate.id) fail('R1/R2 candidate id mismatch');
  if (r1.sourceCommit !== candidate.sourceCommit) fail('R1/R2 source commit mismatch');
  if (r1.inputApk?.sha256 !== candidate.canonicalInputApkSha256) fail('R1/R2 canonical APK hash mismatch');
  if (r1.inputApk?.bytes !== candidate.canonicalInputApkBytes) fail('R1/R2 canonical APK bytes mismatch');
  if (r1.signer?.expectedSignerSha1 !== candidate.signerSha1) fail('R1/R2 signer mismatch');
  if (r1.signer?.androidOauthPackage !== candidate.androidPackage) fail('R1/R2 package mismatch');
  if (r1.signer?.exactScope !== candidate.gmailScope) fail('R1/R2 Gmail scope mismatch');
  const r1Staging = r1.status === 'BUNDLE_GENERATION_OPEN_PHYSICAL_OPEN' && r1.handoffBundle?.status === 'GENERATION_PENDING';
  const r1Ready = r1.status === 'HANDOFF_READY_PHYSICAL_OPEN' && r1.handoffBundle?.status === 'READY';
  if (!r1Staging && !r1Ready) fail(`R1 must be staging or handoff-ready before physical receipt; got ${r1.status}/${r1.handoffBundle?.status}`);
  if (r1.trustedEdgeSigningPass !== false || r1.signedApkSha256 !== null) fail('R1 may not claim physical signing before trusted-edge receipt');

  if (campaign.status !== 'BLOCKED_ON_R1_SIGNING') fail(`R2 must remain blocked on R1; got ${campaign.status}`);
  if (candidate.signedApkSha256 !== null || candidate.signedApkBytes !== null) fail('R2 signed APK identity must remain null before R1 receipt');

  const laws = campaign.laws ?? {};
  for (const key of ['sameSignedCandidateRequired','allSubgatesMustPassForR2','anyCandidateIdentityChangeInvalidatesCampaign','physicalPassCannotBeDerivedFromPublicCi','r2DoesNotCloseQ003Q004Q005']) {
    if (laws[key] !== true) fail(`R2 law ${key} must be true`);
  }
  for (const key of ['perSliceApkPromotionAllowed','buildReadyPromotionAllowed','releaseReadyPromotionAllowed']) {
    if (laws[key] !== false) fail(`R2 law ${key} must be false`);
  }

  const frozenR2 = remainder.nodes?.find(node => node.id === 'R2');
  if (!frozenR2) fail('prebuild remainder design missing R2');
  const subgates = Array.isArray(campaign.subgates) ? campaign.subgates : [];
  const expectedIds = Array.from({length: 12}, (_, i) => `OD${i}`);
  if (JSON.stringify(subgates.map(x => x.id)) !== JSON.stringify(expectedIds)) fail('R2 gate ordering must be OD0..OD11');
  if (new Set(subgates.map(x => x.contract)).size !== subgates.length) fail('duplicate R2 subgate contract');
  for (const required of frozenR2?.subgates ?? []) if (!subgates.some(x => x.contract === required)) fail(`R2 campaign missing frozen subgate ${required}`);
  if (!subgates.some(x => x.id === 'OD11' && x.contract === 'SAME_CANDIDATE_REPLAY_AND_IDEMPOTENCY')) fail('R2 replay/idempotency gate missing');
  for (const gate of subgates) {
    if (gate.status !== 'BLOCKED_BY_R1') fail(`${gate.id} may not be PASS/OPEN before R1`);
    if (!Array.isArray(gate.physicalClaims) || gate.physicalClaims.length === 0) fail(`${gate.id} missing physical claims`);
  }

  const evidence = campaign.evidencePolicy ?? {};
  if (evidence.githubReceiptClass !== 'SANITIZED_SUMMARY_ONLY' || evidence.rawTrustedEdgeEvidenceInGitHub !== false) fail('R2 evidence boundary drifted');
  for (const forbidden of ['PRIVATE_KEY','KEYSTORE_PASSWORD','OAUTH_ACCESS_TOKEN','OAUTH_REFRESH_TOKEN','RAW_GMAIL_BODY','RAW_STATEMENT_PDF','PDF_PASSWORD','RAW_FINANCIAL_PLAINTEXT']) {
    if (!(evidence.forbiddenInGitHub ?? []).includes(forbidden)) fail(`R2 evidence policy missing forbidden class ${forbidden}`);
  }

  if (schema.schemaVersion !== 'A2_R2_SANITIZED_RECEIPT_SCHEMA_V1') fail('unexpected R2 receipt schema');
  if (schema.receiptClass !== 'SANITIZED_SUMMARY_ONLY') fail('receipt schema class mismatch');
  const requiredGateIds = new Set(schema.requiredGateIds ?? []);
  for (const id of expectedIds) if (!requiredGateIds.has(id)) fail(`receipt schema missing ${id}`);
  if (requiredGateIds.size !== 12) fail('receipt schema must require exactly OD0..OD11');
  if (schema.receiptPassLaw !== 'ALL_REQUIRED_GATES_PASS_ON_ONE_SIGNED_APK_HASH_AND_SANITIZATION_PASS_TRUE') fail('receipt one-hash pass law missing');

  if (physical.status !== 'ACTIVE') fail('broad physical campaign must remain ACTIVE');
  for (const phaseId of ['P1','P2','P3','P4','P5','P6','P7']) {
    const phase = physical.phases?.find(p => p.id === phaseId);
    if (!phase || phase.status === 'PASS') fail(`${phaseId} must remain physically open after R2 contract freeze`);
  }

  const state = campaign.currentState ?? {};
  if (state.r1TrustedEdgeSigning !== 'OPEN') fail('R1 physical state must remain OPEN');
  if (state.r2PhysicalCampaign !== 'BLOCKED_ON_R1') fail('R2 physical state must remain BLOCKED_ON_R1');
  for (const q of ['q003','q004','q005']) if (state[q] !== 'ACTIVE') fail(`${q} must remain ACTIVE`);
  if (state.gMk0 !== 'OPEN') fail('G-MK0 must remain OPEN');
  if (state.buildReady !== false || state.releaseReady !== false) fail('R2 contract may not promote build/release readiness');
}

if (failures.length) {
  console.error('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=PASS');
console.log('CANONICAL_IDENTITY_SOURCE=CURRENT_CANONICAL_RECEIPT_AFTER_REOPEN');
console.log('HISTORICAL_PREBUILD_SNAPSHOT=MUTATION_FORBIDDEN');
console.log('R1_PHYSICAL_SIGNING=OPEN');
console.log('R2_PHYSICAL_CAMPAIGN=BLOCKED_ON_R1');
console.log('SAME_SIGNED_CANDIDATE_REQUIRED=YES');
console.log('R2_REQUIRED_GATES=12');
console.log('PUBLIC_CI_PHYSICAL_PASS=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
