import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/q004-evidence.json', 'utf8'));
const ledger = JSON.parse(fs.readFileSync('graph/closure-ledger.json', 'utf8'));
const campaign = JSON.parse(fs.readFileSync('graph/physical-closure-campaign.json', 'utf8'));
const metadata = JSON.parse(fs.readFileSync('mk0/04-architecture/PRIVACY-METADATA-BUDGET.json', 'utf8'));
const measurement = JSON.parse(fs.readFileSync('mk0/04-architecture/PRIVACY-MEASUREMENT-CONTRACT.json', 'utf8'));

const failures = [];
const fail = message => failures.push(message);
const asSet = values => new Set(Array.isArray(values) ? values : []);
const sameSet = (a, b) => a.size === b.size && [...a].every(value => b.has(value));

if (graph.schemaVersion !== 1) fail('Q-004 evidence graph schemaVersion must be 1');
if (graph.nodeId !== 'Q-004') fail('Q-004 evidence graph nodeId mismatch');
if (graph.nodeStateRequired !== 'ACTIVE') fail('Q-004 evidence graph must require ACTIVE');
if (graph.buildReadyRequired !== false) fail('Q-004 evidence graph cannot require buildReady=true');
if (graph.asOf !== '2026-09-03') fail('Q-004 evidence graph asOf mismatch');

const q004 = (ledger.nodes ?? []).find(node => node.id === 'Q-004');
if (!q004) fail('closure ledger is missing Q-004');
else if (q004.status !== 'ACTIVE') fail(`closure ledger Q-004 must remain ACTIVE, found ${q004.status}`);
if (ledger.buildReady !== false) fail('closure ledger buildReady must remain false');

const proof = graph.proofBoundary ?? {};
const expectedProof = {
  privacyInventory: '25_CLASSES_MACHINE_VALIDATED',
  metadataLeakageBudget: 'STATIC_CI_PASS_PHYSICAL_P3_OPEN',
  privacyInspectorMeasurement: 'STATIC_CI_PASS_PHYSICAL_P3_P4_OPEN',
  physicalHarnessIntegrity: 'PHYSICAL_P0_PASS_BOUND_RECEIPT',
  mobileCredentialCustody: 'PHYSICAL_P2_OPEN',
  transportStorageDeletionBackup: 'PHYSICAL_P3_OPEN'
};
for (const [key, value] of Object.entries(expectedProof)) {
  if (proof[key] !== value) fail(`proofBoundary.${key} must be ${value}`);
}

if (metadata.status !== 'ACCEPTED_FOR_PHYSICAL_VALIDATION') fail('metadata budget is not accepted for physical validation');
if (measurement.status !== 'ACCEPTED_FOR_PHYSICAL_VALIDATION') fail('measurement contract is not accepted for physical validation');
if ((metadata.cloudVisibleClassIds ?? []).length !== 12) fail('metadata budget visible class count must remain 12');
if ((metadata.cloudForbiddenClassIds ?? []).length !== 13) fail('metadata budget forbidden class count must remain 13');

const phaseById = new Map((campaign.phases ?? []).map(phase => [phase.id, phase]));
for (const id of ['P0', 'P2', 'P3', 'P4']) if (!phaseById.has(id)) fail(`physical campaign missing ${id}`);
if (phaseById.get('P0')?.status !== 'PASS') fail('Q-004 may consume P0 only when campaign P0 is PASS');

const expectedOpenPhaseIds = ['P0', 'P2', 'P3'].filter(id => phaseById.get(id)?.status !== 'PASS');
if (!sameSet(new Set(expectedOpenPhaseIds), new Set(['P2', 'P3']))) {
  fail(`Q-004 open physical phase partition changed; expected current P2+P3, found ${expectedOpenPhaseIds.join('+')}`);
}
const expectedOpen = new Set();
for (const id of expectedOpenPhaseIds) {
  for (const claim of phaseById.get(id)?.requiredClaims ?? []) expectedOpen.add(claim);
}
const actualOpen = asSet(graph.openPhysicalGates);
if (!sameSet(actualOpen, expectedOpen)) {
  fail(`openPhysicalGates must exactly equal remaining non-PASS P0/P2/P3 claims; expected ${[...expectedOpen].sort().join(',')}`);
}
if (actualOpen.size !== 14) fail(`Q-004 must have 14 physical claims remaining after P0 PASS, found ${actualOpen.size}`);

const display = new Map((graph.dependentDisplayGates ?? []).map(item => [item.claim, item]));
const rawZero = display.get('RAW_EMAILS_RETAINED_ZERO');
if (!rawZero) fail('missing RAW_EMAILS_RETAINED_ZERO display gate');
else if (!sameSet(asSet(rawZero.requires), new Set(['P3', 'RAW_GMAIL_CONTENT_NOT_DURABLE']))) {
  fail('RAW_EMAILS_RETAINED_ZERO must require P3 + RAW_GMAIL_CONTENT_NOT_DURABLE');
}

const cloudZero = display.get('PLAINTEXT_FINANCIAL_CLOUD_BYTES_ZERO');
if (!cloudZero) fail('missing PLAINTEXT_FINANCIAL_CLOUD_BYTES_ZERO display gate');
else if (!sameSet(asSet(cloudZero.requires), new Set(['P3', 'FORBIDDEN_PLAINTEXT_ABSENT_FROM_NORMAL_CLOUD_PATH']))) {
  fail('PLAINTEXT_FINANCIAL_CLOUD_BYTES_ZERO must require P3 + forbidden-plaintext physical evidence');
}

const e2ee = display.get('E2EE_SYNC_VERIFIED_CHECKMARK');
if (!e2ee) fail('missing E2EE_SYNC_VERIFIED_CHECKMARK display gate');
else {
  const expected = new Set(['P4', ...(phaseById.get('P4')?.requiredClaims ?? [])]);
  if (!sameSet(asSet(e2ee.requires), expected)) fail('E2EE checkmark must require P4 plus every P4 physical crypto claim');
}

const evidencePaths = new Set((graph.evidence ?? []).map(item => item.path));
for (const required of [
  'mk0/10-evidence/EV-Q004-PRIVACY-MEASUREMENT-METADATA-BUDGET-2026-09-03.md',
  'mk0/10-evidence/EV-PHYSICAL-CAMPAIGN-P0-HARNESS-SANITIZATION-2026-09-03.md'
]) {
  if (!evidencePaths.has(required)) fail(`Q-004 graph missing evidence receipt ${required}`);
}
for (const item of graph.evidence ?? []) {
  if (item.closesQ004 !== false) fail(`${item.path} must not close Q-004`);
}

const forbidden = asSet(graph.forbiddenPromotions);
for (const rule of [
  'STATIC_PRIVACY_MATRIX_PASS=>Q004_CLOSED',
  'METADATA_BUDGET_CI_PASS=>PHYSICAL_NETWORK_PRIVACY_PASS',
  'PRIVACY_INSPECTOR_CONTRACT_CI_PASS=>PHYSICAL_STORAGE_PRIVACY_PASS',
  'ARCHITECTURE_FORBIDS_PLAINTEXT=>MEASURED_ZERO_PLAINTEXT_BYTES',
  'RAW_CONTENT_DISPOSAL_DESIGN=>MEASURED_ZERO_RAW_EMAILS_RETAINED',
  'E2EE_DESIGN=>E2EE_VERIFIED_CHECKMARK',
  'SYNTHETIC_HARNESS_PASS=>P0_PHYSICAL_PASS',
  'P0_PASS=>Q004_CLOSED',
  'CI_PASS=>Q004_CLOSED'
]) {
  if (!forbidden.has(rule)) fail(`missing Q-004 forbidden promotion ${rule}`);
}

if (failures.length) {
  console.error('FINANCESENSOR_Q004_EVIDENCE_GRAPH=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_Q004_EVIDENCE_GRAPH=PASS');
console.log('P0=PHYSICAL_PASS_BOUND_RECEIPT');
console.log(`OPEN_PHYSICAL_GATES=${actualOpen.size}`);
console.log('OPEN_PHYSICAL_PHASES=P2,P3');
console.log('PRIVACY_CLASSES=25');
console.log('CLOUD_VISIBLE_CLASSES=12');
console.log('CLOUD_FORBIDDEN_CLASSES=13');
console.log('Q004=ACTIVE');
console.log('BUILD_READY=false');
console.log('CI_ROLE=REVALIDATES_P0_RECEIPT_AND_STATIC_PRIVACY_CONTRACTS');
