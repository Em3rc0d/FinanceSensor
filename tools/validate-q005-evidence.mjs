import fs from 'node:fs';
import path from 'node:path';

const graph = JSON.parse(fs.readFileSync('graph/q005-evidence.json', 'utf8'));
const ledger = JSON.parse(fs.readFileSync('graph/closure-ledger.json', 'utf8'));
const campaign = JSON.parse(fs.readFileSync('graph/physical-closure-campaign.json', 'utf8'));
const quarry = fs.readFileSync('mk0/02-quarries/Q-005-LOCAL-FIRST-SYNC.md', 'utf8');
const invariants = fs.readFileSync('mk0/05-data-model/INVARIANTS.md', 'utf8');

const failures = [];
const fail = message => failures.push(message);
const asSet = values => new Set(Array.isArray(values) ? values : []);
const sameSet = (a, b) => a.size === b.size && [...a].every(value => b.has(value));
const exists = relativePath => fs.existsSync(path.resolve(relativePath));

if (graph.schemaVersion !== 1) fail('Q-005 evidence graph schemaVersion must be 1');
if (graph.nodeId !== 'Q-005') fail('Q-005 evidence graph nodeId mismatch');
if (graph.nodeStateRequired !== 'ACTIVE') fail('Q-005 evidence graph must require ACTIVE');
if (graph.buildReadyRequired !== false) fail('Q-005 evidence graph cannot require buildReady=true');
if (graph.asOf !== '2026-09-03') fail('Q-005 evidence graph asOf mismatch');

const q005 = (ledger.nodes ?? []).find(node => node.id === 'Q-005');
if (!q005) fail('closure ledger missing Q-005');
else if (q005.status !== 'ACTIVE') fail(`closure ledger Q-005 must remain ACTIVE, found ${q005.status}`);
if (ledger.buildReady !== false) fail('closure ledger buildReady must remain false');

const expectedProof = {
  boundedDistributedSuite: '116_OF_116_PROVEN_AT_SPIKE',
  productionCryptoProfile: 'FROZEN_PHYSICAL_P4_OPEN',
  witnessTopology: 'FROZEN_PHYSICAL_P5_OPEN',
  allDevicesLostRecovery: 'SPIKE_ACCEPTED_PHYSICAL_P6_OPEN',
  transportStorageDeletionBackup: 'PHYSICAL_P3_OPEN',
  physicalHarnessIntegrity: 'PHYSICAL_P0_PASS_BOUND_RECEIPT',
  closureReceipt: 'P8_BLOCKED_BY_PRIOR_PHASES'
};
for (const [key, expected] of Object.entries(expectedProof)) {
  if (graph.proofBoundary?.[key] !== expected) fail(`proofBoundary.${key} must be ${expected}`);
}

if (!quarry.includes('full distributed suite 116 / 116 PASS')) fail('Q-005 quarry must retain 116 / 116 bounded distributed-suite evidence');
if (!quarry.includes('PROVEN_AT_SPIKE != PROVEN')) fail('Q-005 quarry must retain PROVEN_AT_SPIKE != PROVEN boundary');
if (!quarry.includes('GLOBAL-LATEST FRESHNESS            NOT CLAIMED')) fail('Q-005 quarry must retain no-global-latest claim');

const bounded = graph.boundedInvariantRange ?? {};
if (bounded.state !== 'PROVEN_AT_SPIKE') fail('bounded invariant range must remain PROVEN_AT_SPIKE');
if (bounded.productionPromotion !== 'FORBIDDEN_WITHOUT_PHYSICAL_CLOSURE') fail('bounded invariant production promotion must fail closed');
const expectedInvariantIds = new Set(Array.from({ length: 12 }, (_, i) => `INV-SYNC-${String(i + 8).padStart(3, '0')}`));
const actualInvariantIds = asSet(bounded.ids);
if (!sameSet(actualInvariantIds, expectedInvariantIds)) fail('bounded invariant range must be exactly INV-SYNC-008..019');
for (const id of expectedInvariantIds) {
  if (!invariants.includes(id)) fail(`${id} missing from data-model invariants`);
  if (!quarry.includes(id)) fail(`${id} missing from Q-005 quarry bounded evidence`);
}

for (const artifact of graph.artifacts ?? []) {
  if (!artifact?.path || !artifact?.role) fail('Q-005 artifact entries require path and role');
  else if (!exists(artifact.path)) fail(`Q-005 artifact missing: ${artifact.path}`);
}
for (const evidence of graph.evidence ?? []) {
  if (!evidence?.path || !evidence?.proof) fail('Q-005 evidence entries require path and proof');
  else if (!exists(evidence.path)) fail(`Q-005 evidence missing: ${evidence.path}`);
  if (evidence?.closesQ005 !== false) fail(`${evidence?.path ?? '<unknown>'} must not close Q-005`);
}
const evidencePaths = new Set((graph.evidence ?? []).map(item => item.path));
if (!evidencePaths.has('mk0/10-evidence/EV-PHYSICAL-CAMPAIGN-P0-HARNESS-SANITIZATION-2026-09-03.md')) {
  fail('Q-005 graph must bind P0 physical PASS receipt');
}

const phaseById = new Map((campaign.phases ?? []).map(phase => [phase.id, phase]));
if (phaseById.get('P0')?.status !== 'PASS') fail('Q-005 may consume P0 only when campaign P0 is PASS');
const expectedPhysicalPhases = new Set(
  (campaign.phases ?? [])
    .filter(phase => (phase.binds ?? []).includes('Q-005') && phase.id !== 'P8' && phase.status !== 'PASS')
    .map(phase => phase.id)
);
const actualPhysicalPhases = asSet(graph.openPhysicalPhases);
if (!sameSet(actualPhysicalPhases, expectedPhysicalPhases)) {
  fail(`openPhysicalPhases must exactly match non-PASS campaign phases binding Q-005 before P8: ${[...expectedPhysicalPhases].sort().join(',')}`);
}
if (!sameSet(expectedPhysicalPhases, new Set(['P3', 'P4', 'P5', 'P6']))) {
  fail('physical campaign Q-005 open phase partition changed; explicit review required');
}

const expectedPhysicalGates = new Set();
for (const phaseId of expectedPhysicalPhases) {
  const phase = phaseById.get(phaseId);
  if (!phase) {
    fail(`missing Q-005 physical phase ${phaseId}`);
    continue;
  }
  if (phase.physicalReceiptRequiredForPass !== true) fail(`${phaseId} must require physical receipt for PASS`);
  for (const claim of phase.requiredClaims ?? []) expectedPhysicalGates.add(claim);
}
const actualPhysicalGates = asSet(graph.openPhysicalGates);
if (!sameSet(actualPhysicalGates, expectedPhysicalGates)) {
  fail(`openPhysicalGates must equal remaining P3+P4+P5+P6 claims; expected ${[...expectedPhysicalGates].sort().join(',')}`);
}
if (actualPhysicalGates.size !== 29) fail(`Q-005 expected 29 open physical claims after P0 PASS, found ${actualPhysicalGates.size}`);

const p8 = phaseById.get('P8');
if (!p8) fail('physical campaign missing P8 closure receipts');
else {
  if (!(p8.binds ?? []).includes('Q-005')) fail('P8 must bind Q-005');
  if (p8.status !== 'BLOCKED_BY_PRIOR_PHASES') fail(`P8 must remain BLOCKED_BY_PRIOR_PHASES, found ${p8.status}`);
  if (!(p8.requiredClaims ?? []).includes('Q005_RECEIPT_BINDS_CRYPTO_WITNESS_RECOVERY_EVIDENCE')) {
    fail('P8 missing Q005_RECEIPT_BINDS_CRYPTO_WITNESS_RECOVERY_EVIDENCE');
  }
}
const closure = graph.closureGate ?? {};
if (closure.phase !== 'P8') fail('Q-005 closure gate must be P8');
if (closure.stateRequiredBeforeQ005Closure !== 'PASS') fail('Q-005 closure requires P8 PASS');
if (closure.requiredQ005Claim !== 'Q005_RECEIPT_BINDS_CRYPTO_WITNESS_RECOVERY_EVIDENCE') fail('Q-005 closure receipt claim mismatch');
if (closure.currentState !== 'BLOCKED_BY_PRIOR_PHASES') fail('Q-005 closure gate current state must remain blocked');

const forbidden = asSet(graph.forbiddenPromotions);
for (const rule of [
  '116_OF_116_PASS=>Q005_CLOSED',
  'PROVEN_AT_SPIKE=>PROVEN',
  'ADR021_PROFILE_FROZEN=>MOBILE_CRYPTO_PHYSICAL_PASS',
  'ADR022_TOPOLOGY_FROZEN=>WITNESS_PHYSICAL_PASS',
  'ADR014_RECOVERY_SPIKE_PASS=>ALL_DEVICES_LOST_PHYSICAL_PASS',
  'ADR024_SAFE_TO_RESUME_DESIGN=>RECOVERY_CUTOVER_PHYSICAL_PASS',
  'SIGNED_CHECKPOINT=>GLOBAL_LATEST_FRESHNESS',
  'TWO_OF_THREE_WITNESSES=>GLOBAL_CONSENSUS',
  'CI_PASS=>PHYSICAL_KEY_PROTECTION_PASS',
  'P0_PASS=>Q005_CLOSED',
  'CI_PASS=>Q005_CLOSED'
]) {
  if (!forbidden.has(rule)) fail(`missing Q-005 forbidden promotion ${rule}`);
}

if (failures.length) {
  console.error('FINANCESENSOR_Q005_EVIDENCE_GRAPH=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_Q005_EVIDENCE_GRAPH=PASS');
console.log('BOUNDED_DISTRIBUTED_SUITE=116/116_PROVEN_AT_SPIKE');
console.log(`BOUNDED_INVARIANTS=${actualInvariantIds.size}`);
console.log('P0=PHYSICAL_PASS_BOUND_RECEIPT');
console.log(`OPEN_PHYSICAL_PHASES=${actualPhysicalPhases.size}`);
console.log(`OPEN_PHYSICAL_GATES=${actualPhysicalGates.size}`);
console.log('P8=BLOCKED_BY_PRIOR_PHASES');
console.log('GLOBAL_LATEST_FRESHNESS=NOT_CLAIMED');
console.log('Q005=ACTIVE');
console.log('BUILD_READY=false');
console.log('CI_ROLE=REVALIDATES_BOUND_P0_RECEIPT_AND_BOUNDED_Q005_EVIDENCE');
