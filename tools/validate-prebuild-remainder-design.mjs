import fs from 'node:fs';

const paths = {
  design: 'graph/prebuild-remainder-design.json',
  doc: 'mk0/03-design/PREBUILD-REMAINDER-DESIGN.md',
  plan: 'mk0/07-plan/PREBUILD-REMAINDER-EXECUTION.md',
  ledger: 'graph/closure-ledger.json',
  readiness: 'graph/build-readiness.json',
  campaign: 'graph/physical-closure-campaign.json',
  canonical: 'graph/alpha2-canonical-candidate.json'
};
const failures = [];
const fail = message => failures.push(message);
for (const path of Object.values(paths)) if (!fs.existsSync(path)) fail(`missing ${path}`);

if (!failures.length) {
  const design = JSON.parse(fs.readFileSync(paths.design, 'utf8'));
  const doc = fs.readFileSync(paths.doc, 'utf8');
  const plan = fs.readFileSync(paths.plan, 'utf8');
  const ledger = JSON.parse(fs.readFileSync(paths.ledger, 'utf8'));
  const readiness = JSON.parse(fs.readFileSync(paths.readiness, 'utf8'));
  const campaign = JSON.parse(fs.readFileSync(paths.campaign, 'utf8'));
  const canonical = JSON.parse(fs.readFileSync(paths.canonical, 'utf8'));

  const frozen = {
    schemaVersion: 'MK0_PREBUILD_REMAINDER_DESIGN_V1',
    base: 'ac195baebc2966521b2dcc73dfa3376ae09e6b4d',
    candidate: '0.2.0-alpha.2+2001',
    sourceCommit: 'f658363772b8d3652a81a8a4275a571f2f409ed8',
    apkSha256: '7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f',
    apkBytes: 182053563,
    package: 'com.financesensor.lab.gmailconnection.r2',
    scope: 'gmail.readonly',
    signerSha1: '63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0'
  };
  const current = {
    schemaVersion: 'A2_CANONICAL_CANDIDATE_RECEIPT_V4',
    candidate: '0.2.0-alpha.2+2007',
    sourceCommit: '8a4aa307b9b3328e67232c919a94994e80446331',
    apkSha256: 'a84f0d047366d08c0d3e4850919c73b3aa79a290e9c878315434cebf81775197',
    apkBytes: 182121475,
    signedApkSha256: '40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab',
    signedApkBytes: 182145574,
  };

  if (design.schemaVersion !== frozen.schemaVersion) fail('prebuild design schema mismatch');
  if (design.project !== 'FinanceSensor' || design.mk !== 'MK0' || design.designFreeze !== 'PASS') fail('prebuild design identity/freeze mismatch');
  if (design.frozenAtBaseCommit !== frozen.base) fail('design base commit drifted');
  if (design.authority?.closureLedger !== paths.ledger || design.authority?.buildReadiness !== paths.readiness || design.authority?.physicalCampaign !== paths.campaign || design.authority?.canonicalCandidate !== paths.canonical) fail('prebuild authority mapping drifted');

  const snapshot = design.canonicalAlpha2 ?? {};
  for (const [key, value] of Object.entries({candidate:frozen.candidate,sourceCommit:frozen.sourceCommit,apkSha256:frozen.apkSha256,apkBytes:frozen.apkBytes,package:frozen.package,scope:frozen.scope,stableSignerSha1:frozen.signerSha1})) {
    if (snapshot[key] !== value) fail(`historical canonical Alpha.2 snapshot ${key} drifted`);
  }

  const laws = new Set(design.executionLaws ?? []);
  for (const law of [
    'DESIGN_FREEZE_PASS_DOES_NOT_EQUAL_BUILD_READY','UNMAPPED_PRODUCT_BUILD_IS_FORBIDDEN','STATIC_PASS_DOES_NOT_EQUAL_PHYSICAL_PASS',
    'APK_BUILD_PASS_DOES_NOT_EQUAL_BUILD_READY','RAW_TRUSTED_EDGE_EVIDENCE_DOES_NOT_ENTER_GITHUB','ONLY_SANITIZED_RECEIPTS_MAY_ENTER_GITHUB',
    'SOURCE_OR_APK_IDENTITY_CHANGE_REOPENS_SIGNING_AND_OWNED_DEVICE_CAMPAIGN','BUILD_READY_TRUE_REQUIRES_G_MK0_CLOSED'
  ]) if (!laws.has(law)) fail(`missing execution law ${law}`);
  const reopen = (design.reopenRules ?? []).find(rule => rule.signal === 'SOURCE_COMMIT_OR_CANONICAL_APK_SHA_CHANGED');
  if (JSON.stringify(reopen?.reopens) !== JSON.stringify(['R1','R2'])) fail('source/APK reopen mapping drifted');

  if (canonical.schemaVersion !== current.schemaVersion) fail('current canonical receipt schema mismatch');
  if (canonical.candidate !== current.candidate || canonical.sourceCommit !== current.sourceCommit) fail('current canonical receipt identity mismatch');
  if (canonical.authority?.apkSha256 !== current.apkSha256 || canonical.authority?.apkBytes !== current.apkBytes) fail('current canonical receipt APK identity mismatch');
  if (canonical.authority?.minSdk !== 31 || canonical.authority?.targetSdk !== 36 || canonical.authority?.compileSdk !== 37 || canonical.authority?.signatureVerify !== 'PASS' || canonical.authority?.aapt2Parse !== 'PASS') fail('current API31 +2007 canonical verification incomplete');
  if (canonical.signing?.androidOauthPackage !== frozen.package || canonical.signing?.exactScope !== frozen.scope || canonical.signing?.expectedSignerSha1 !== frozen.signerSha1) fail('package/scope/stable signer drifted across candidate reopen');
  if (canonical.signing?.trustedEdgeSigningPass !== true || canonical.signing?.signedApkSha256 !== current.signedApkSha256 || canonical.signing?.signedApkBytes !== current.signedApkBytes) fail('current +2007 stable signing receipt is not bound');
  if (canonical.boundaries?.physicalAlpha2Pass !== false || canonical.boundaries?.buildReady !== false || canonical.boundaries?.releaseReady !== false) fail('R1 signing cannot promote physical/build/release readiness');
  if (canonical.boundaries?.ownedDeviceInstallPass !== false || canonical.boundaries?.ownedDeviceLaunchPass !== false || canonical.boundaries?.ownedDeviceStableSignerOauthPass !== false) fail('current +2007 OD0/OD1 claims must remain open after signing');
  if (canonical.physicalInstallabilityObservation?.inheritanceFromPriorCandidateAllowed !== false) fail('prior-candidate physical inheritance must remain forbidden');
  for (const id of ['0.2.0-alpha.2+2001','0.2.0-alpha.2+2002','0.2.0-alpha.2+2003','0.2.0-alpha.2+2004','0.2.0-alpha.2+2005','0.2.0-alpha.2+2006']) {
    if (!(canonical.nonAuthoritativeCandidates ?? []).some(x => x.candidate === id)) fail(`current canonical receipt must record ${id} supersession`);
  }

  const nodes = Array.isArray(design.nodes) ? design.nodes : [];
  const byId = new Map(nodes.map(node => [node.id, node]));
  if (byId.size !== nodes.length) fail('duplicate remainder node id');
  for (const id of ['R0','R1','R2','R3','R4','R5','R6','R7','R8','R9','R10']) if (!byId.has(id)) fail(`missing remainder node ${id}`);
  const allowedStates = new Set(design.allowedNodeStates ?? []);
  for (const node of nodes) {
    if (!allowedStates.has(node.status)) fail(`${node.id} has unsupported status ${node.status}`);
    for (const dep of node.dependsOn ?? []) if (!byId.has(dep)) fail(`${node.id} depends on unknown ${dep}`);
  }
  if (byId.get('R0')?.status !== 'CLOSED') fail('R0 must remain CLOSED');
  if (byId.get('R1')?.status !== 'CLOSED') fail('R1 must close after certified +2007 trusted-edge signing');
  if (byId.get('R2')?.status !== 'DESIGN_FROZEN_EXECUTION_OPEN') fail('R2 must open after R1 PASS');
  for (const id of ['R3','R4','R5']) if (byId.get(id)?.status !== 'PHYSICAL_OR_PROVIDER_OPEN') fail(`${id} must remain physical/provider open`);
  for (const id of ['R6','R9','R10']) if (byId.get(id)?.status !== 'BLOCKED_BY_PRIOR_NODE') fail(`${id} must remain blocked`);
  for (const id of ['R7','R8']) if (byId.get(id)?.status !== 'AUDIT_OPEN') fail(`${id} must remain audit-open`);

  const state = design.currentState ?? {};
  if (state.R0 !== 'CLOSED' || state.R1 !== 'CLOSED' || state.R2 !== 'DESIGN_FROZEN_EXECUTION_OPEN') fail('current R0/R1/R2 execution state drifted');
  if (state.buildReady !== false || state.releaseReady !== false) fail('current remainder state cannot promote readiness');

  const expectedDeps = new Map([
    ['R1',['R0']],['R2',['R1']],['R3',['R2']],['R4',['R2']],['R5',['R2']],['R6',['R3','R4','R5']],['R7',['R6']],['R8',['R7']],['R9',['R8']],['R10',['R9']]
  ]);
  for (const [id,deps] of expectedDeps) if (JSON.stringify(byId.get(id)?.dependsOn) !== JSON.stringify(deps)) fail(`${id} dependency order drifted`);

  const r2Subgates = new Set(byId.get('R2')?.subgates ?? []);
  for (const gate of ['SIGNED_APK_INSTALL_AND_LAUNCH','EXACT_GMAIL_READONLY_OAUTH','METADATA_FIRST_STATEMENT_DISCOVERY','BOUNDED_FETCH_ONLY_FOR_ALLOWED_PROFILE','BCP_SAVINGS_STRICT_PARSE_OR_FAIL_CLOSED','SQLCIPHER_PERSISTENCE_AND_REOPEN','RECONCILIATION_NO_FALSE_AUTO_CONFIRM','ACCOUNT_GRAPH_NO_BANK_CURRENCY_ONLY_CONFIRM','MONTHLY_COVERAGE_NO_FALSE_COMPLETE','SENSOR_PROJECTION_NO_NUMERIC_CONFIDENCE_OR_ADVICE','DISCONNECT_AND_LOCAL_SECRET_CUSTODY_CHECK']) {
    if (!r2Subgates.has(gate)) fail(`R2 missing frozen subgate ${gate}`);
  }

  const phaseMap = new Map((campaign.phases ?? []).map(phase => [phase.id, phase]));
  if (phaseMap.get('P0')?.status !== 'PASS') fail('physical campaign P0 must remain PASS');
  for (const id of ['P1','P2','P3','P4','P5','P6','P7']) if (phaseMap.get(id)?.status !== 'PHYSICAL_EVIDENCE_REQUIRED') fail(`${id} must remain PHYSICAL_EVIDENCE_REQUIRED`);
  if (phaseMap.get('P8')?.status !== 'BLOCKED_BY_PRIOR_PHASES') fail('P8 must remain blocked');

  for (const id of ['Q-003','Q-004','Q-005']) if (ledger.nodes?.find(n => n.id === id)?.status !== 'ACTIVE') fail(`${id} must remain ACTIVE`);
  for (const id of ['A-001','SEC-001','DM-001']) if (ledger.nodes?.find(n => n.id === id)?.status !== 'DRAFTED') fail(`${id} must remain DRAFTED`);
  const gmk0 = ledger.nodes?.find(n => n.id === 'G-MK0');
  if (!gmk0 || gmk0.status === 'CLOSED') fail('G-MK0 must remain open');
  if (ledger.buildReady !== false || readiness.buildReady !== false) fail('BUILD_READY cannot become true from R1 signing');
  if (readiness.law !== 'BUILD_READY_TRUE_REQUIRES_G_MK0_CLOSED') fail('build readiness law drifted');

  for (const marker of ['DESIGN_FREEZE = PASS','R1 — Trusted-edge signing','R2 — Single owned-device Alpha.2 campaign','R3 — Q-003 Gmail production / provider closure','R4 — Q-004 privacy / deletion / backup closure','R5 — Q-005 multi-device / recovery closure','R9 — G-MK0','R10 — BUILD_READY','UNMAPPED_PRODUCT_BUILD            FORBIDDEN','BUILD_READY                       NO','RELEASE_READY                     NO']) if (!doc.includes(marker)) fail(`design document missing marker: ${marker}`);
  for (const marker of ['UNMAPPED_PRODUCT_BUILD = FORBIDDEN','ONE_CANONICAL_CANDIDATE_PER_PHYSICAL_CAMPAIGN = REQUIRED','Phase 1 — R1 trusted-edge signing','Phase 2 — R2 owned-device Alpha.2 campaign','Phase 3 — P0 quarry evidence','Phase 7 — R9 G-MK0 consensus','Phase 8 — R10 BUILD_READY transition','PR CI PASS is not inherited by the merge SHA.']) if (!plan.includes(marker)) fail(`execution plan missing marker: ${marker}`);
}

if (failures.length) {
  console.error('PREBUILD_REMAINDER_DESIGN=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PREBUILD_REMAINDER_DESIGN=PASS');
console.log('REMAINDER_NODES=11');
console.log('DESIGN_FREEZE_SNAPSHOT=IMMUTABLE');
console.log('CURRENT_CANONICAL_REFREEZE=0.2.0-alpha.2+2007');
console.log('R1_TRUSTED_EDGE_SIGNING=PASS');
console.log('R2_PHYSICAL_CAMPAIGN=READY');
console.log('NEXT_EXECUTION_NODE=R2_OD0_SIGNED_APK_INSTALL_AND_LAUNCH');
console.log('UNMAPPED_PRODUCT_BUILD=FORBIDDEN');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
