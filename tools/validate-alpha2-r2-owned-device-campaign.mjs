import fs from 'node:fs';

const paths = {
  campaign: 'graph/alpha2-r2-owned-device-campaign.json',
  receiptSchema: 'graph/alpha2-r2-sanitized-receipt-schema.json',
  remainder: 'graph/prebuild-remainder-design.json',
  canonical: 'graph/alpha2-canonical-candidate.json',
  r1: 'graph/alpha2-r1-signing-handoff.json',
  r1Receipt: 'graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2005-2026-09-08.json',
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
  const r1Receipt = readJson(paths.r1Receipt);
  const physical = readJson(paths.physical);

  if (campaign.schemaVersion !== 'A2_R2_OWNED_DEVICE_CAMPAIGN_V1') fail('unexpected R2 campaign schema');
  if (campaign.project !== 'FinanceSensor' || campaign.mk !== 'MK0') fail('R2 campaign identity mismatch');
  if (campaign.implements !== 'graph/prebuild-remainder-design.json#R2') fail('R2 implementation binding missing');

  const reopenLaws = new Set(remainder.executionLaws ?? []);
  if (!reopenLaws.has('SOURCE_OR_APK_IDENTITY_CHANGE_REOPENS_SIGNING_AND_OWNED_DEVICE_CAMPAIGN')) fail('prebuild design missing source/APK reopen law');
  const reopenRule = (remainder.reopenRules ?? []).find(x => x.signal === 'SOURCE_COMMIT_OR_CANONICAL_APK_SHA_CHANGED');
  if (JSON.stringify(reopenRule?.reopens) !== JSON.stringify(['R1', 'R2'])) fail('prebuild R1/R2 reopen rule drifted');

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
  for (const [key, expected] of currentBindings) if (candidate[key] !== expected) fail(`candidate ${key} drifted from canonical receipt`);
  if (candidate.id !== '0.2.0-alpha.2+2005' || candidate.sourceCommit !== 'd99e7e4765adfc96bed9d914b2b6f296f9712242') fail('current R2 identity must be +2005 post-merge authority');
  if (candidate.canonicalInputApkSha256 !== 'dacc7d7281842989904adfc1d3e7b17242b39b20674eb8e7c33e1e339428a44c' || candidate.canonicalInputApkBytes !== 182092699) fail('current R2 canonical APK identity drifted');
  if (candidate.signedApkSha256 !== '530ef3fa17c22f94ef0a94aaf625df2ef33022c84d16fad2604a3e0dfc5e0b85' || candidate.signedApkBytes !== 182116902) fail('current stable-signed APK identity drifted');
  if (candidate.minSdk !== 31) fail('R2 current candidate must retain minSdk 31');
  if (candidate.installabilityObservation !== 'OPEN_FOR_CURRENT_CANDIDATE') fail('current candidate physical installability must remain open until OD0');
  if (candidate.stableSignedInstallability !== 'READY_FOR_PHYSICAL') fail('stable signed installability must be ready after R1 PASS');

  if (canonical.signing?.trustedEdgeSigningPass !== false || canonical.signing?.signedApkSha256 !== null) fail('canonical CI receipt may not itself pre-certify trusted-edge signing');
  if (r1.candidate !== candidate.id || r1.sourceCommit !== candidate.sourceCommit) fail('R1/R2 candidate identity mismatch');
  if (r1.inputApk?.sha256 !== candidate.canonicalInputApkSha256 || r1.inputApk?.bytes !== candidate.canonicalInputApkBytes) fail('R1/R2 canonical APK mismatch');
  if (r1.signer?.expectedSignerSha1 !== candidate.signerSha1 || r1.signer?.androidOauthPackage !== candidate.androidPackage || r1.signer?.exactScope !== candidate.gmailScope) fail('R1/R2 signer/package/scope mismatch');
  if (r1.status !== 'TRUSTED_EDGE_SIGNING_PASS' || r1.trustedEdgeSigningPass !== true) fail('R1 must be PASS before R2 is ready');
  if (r1.signedApkSha256 !== candidate.signedApkSha256 || r1.signedApkBytes !== candidate.signedApkBytes) fail('R1/R2 stable-signed APK mismatch');
  if (r1.physicalReceipt?.path !== paths.r1Receipt) fail('R1 must bind the current +2005 receipt');

  if (r1Receipt.candidate !== candidate.id || r1Receipt.sourceCommit !== candidate.sourceCommit) fail('R1 receipt identity mismatch');
  if (r1Receipt.inputApkSha256 !== candidate.canonicalInputApkSha256 || r1Receipt.inputApkBytes !== candidate.canonicalInputApkBytes) fail('R1 receipt canonical APK mismatch');
  if (r1Receipt.signedApkSha256 !== candidate.signedApkSha256 || r1Receipt.signedApkBytes !== candidate.signedApkBytes) fail('R1 receipt stable APK mismatch');
  if (r1Receipt.signerSha1 !== candidate.signerSha1 || r1Receipt.androidPackage !== candidate.androidPackage || r1Receipt.gmailScope !== candidate.gmailScope) fail('R1 receipt signer/package/scope mismatch');
  if (r1Receipt.trustedEdgeSigningPass !== true || r1Receipt.sanitizationPass !== true || r1Receipt.rawPrivateMaterialCommitted !== false) fail('R1 receipt trust/sanitization boundary drifted');

  if (campaign.r1PhysicalReceipt !== paths.r1Receipt) fail('R2 must bind exact current +2005 R1 receipt');
  if (campaign.status !== 'READY_FOR_PHYSICAL_CAMPAIGN') fail(`R2 must be READY_FOR_PHYSICAL_CAMPAIGN; got ${campaign.status}`);
  const invalidated = campaign.historicalInvalidatedCampaign ?? {};
  if (invalidated.candidate !== '0.2.0-alpha.2+2004' || invalidated.continuationAllowed !== false || invalidated.evidenceInheritanceAllowed !== false) fail('+2004 campaign invalidation boundary missing');

  const laws = campaign.laws ?? {};
  for (const key of ['sameSignedCandidateRequired','allSubgatesMustPassForR2','anyCandidateIdentityChangeInvalidatesCampaign','physicalPassCannotBeDerivedFromPublicCi','r2DoesNotCloseQ003Q004Q005']) if (laws[key] !== true) fail(`R2 law ${key} must be true`);
  for (const key of ['perSliceApkPromotionAllowed','buildReadyPromotionAllowed','releaseReadyPromotionAllowed']) if (laws[key] !== false) fail(`R2 law ${key} must be false`);

  const frozenR2 = remainder.nodes?.find(node => node.id === 'R2');
  if (!frozenR2) fail('prebuild remainder design missing R2');
  const subgates = Array.isArray(campaign.subgates) ? campaign.subgates : [];
  const expectedIds = Array.from({length: 12}, (_, i) => `OD${i}`);
  if (JSON.stringify(subgates.map(x => x.id)) !== JSON.stringify(expectedIds)) fail('R2 gate ordering must be OD0..OD11');
  if (subgates[0]?.status !== 'READY_FOR_PHYSICAL') fail('OD0 must be the only ready physical gate after R1 PASS');
  for (const gate of subgates.slice(1)) if (gate.status !== 'BLOCKED_BY_PRIOR_GATE') fail(`${gate.id} must remain blocked by prior gate`);
  for (const gate of subgates) if (!Array.isArray(gate.physicalClaims) || gate.physicalClaims.length === 0) fail(`${gate.id} missing physical claims`);
  for (const required of frozenR2?.subgates ?? []) if (!subgates.some(x => x.contract === required)) fail(`R2 campaign missing frozen subgate ${required}`);

  const evidence = campaign.evidencePolicy ?? {};
  if (evidence.githubReceiptClass !== 'SANITIZED_SUMMARY_ONLY' || evidence.rawTrustedEdgeEvidenceInGitHub !== false) fail('R2 evidence boundary drifted');
  for (const forbidden of ['PRIVATE_KEY','KEYSTORE_PASSWORD','OAUTH_ACCESS_TOKEN','OAUTH_REFRESH_TOKEN','RAW_GMAIL_BODY','RAW_STATEMENT_PDF','PDF_PASSWORD','RAW_FINANCIAL_PLAINTEXT']) if (!(evidence.forbiddenInGitHub ?? []).includes(forbidden)) fail(`R2 evidence policy missing forbidden class ${forbidden}`);

  if (schema.schemaVersion !== 'A2_R2_SANITIZED_RECEIPT_SCHEMA_V1' || schema.receiptClass !== 'SANITIZED_SUMMARY_ONLY') fail('unexpected R2 receipt schema');
  const requiredGateIds = new Set(schema.requiredGateIds ?? []);
  for (const id of expectedIds) if (!requiredGateIds.has(id)) fail(`receipt schema missing ${id}`);
  if (requiredGateIds.size !== 12) fail('receipt schema must require exactly OD0..OD11');

  if (physical.status !== 'ACTIVE') fail('broad physical campaign must remain ACTIVE');
  for (const phaseId of ['P1','P2','P3','P4','P5','P6','P7']) {
    const phase = physical.phases?.find(p => p.id === phaseId);
    if (!phase || phase.status === 'PASS') fail(`${phaseId} must remain physically open`);
  }

  const state = campaign.currentState ?? {};
  if (state.r1TrustedEdgeSigning !== 'PASS') fail('R1 current state must be PASS');
  if (state.r2PhysicalCampaign !== 'READY') fail('R2 physical state must be READY');
  for (const q of ['q003','q004','q005']) if (state[q] !== 'ACTIVE') fail(`${q} must remain ACTIVE`);
  if (state.gMk0 !== 'OPEN') fail('G-MK0 must remain OPEN');
  if (state.buildReady !== false || state.releaseReady !== false) fail('R1/R2 transition cannot promote readiness');
}

if (failures.length) {
  console.error('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ALPHA2_R2_OWNED_DEVICE_CAMPAIGN_CONTRACT=PASS');
console.log('CANONICAL_IDENTITY=ALPHA2_2005_POSTMERGE');
console.log('R1_PHYSICAL_SIGNING=PASS');
console.log('R2_PHYSICAL_CAMPAIGN=READY');
console.log('R2_NEXT_GATE=OD0_SIGNED_APK_INSTALL_AND_LAUNCH');
console.log('SAME_SIGNED_CANDIDATE_REQUIRED=YES');
console.log('R2_REQUIRED_GATES=12');
console.log('PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=NO');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
