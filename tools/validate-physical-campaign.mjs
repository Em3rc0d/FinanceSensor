import fs from 'node:fs';

const campaign = JSON.parse(fs.readFileSync('graph/physical-closure-campaign.json', 'utf8'));
const failures = [];
const fail = message => failures.push(message);

if (campaign.schemaVersion !== 1) fail('schemaVersion must be 1');
if (campaign.project !== 'FinanceSensor') fail('project must be FinanceSensor');
if (campaign.mk !== 'MK0') fail('mk must be MK0');
if (campaign.status !== 'ACTIVE') fail('campaign must remain ACTIVE until closure');
if (campaign.trustBoundary !== 'CONTROLLED_LOCAL_EDGE_AND_OWNED_PHYSICAL_DEVICES') fail('physical trust boundary mismatch');
if (campaign.rawEvidenceInGitHub !== 'FORBIDDEN') fail('raw physical evidence must be forbidden in GitHub');
if (campaign.sanitizedReceiptsInGitHub !== 'ALLOWED') fail('sanitized receipts must be allowed');

for (const node of ['Q-003', 'Q-004', 'Q-005']) {
  if (campaign.boundNodes?.[node] !== 'ACTIVE') fail(`${node} must remain ACTIVE before physical closure receipts`);
}

const allowedStates = new Set(campaign.allowedPhaseStates ?? []);
const phases = Array.isArray(campaign.phases) ? campaign.phases : [];
const byId = new Map(phases.map(phase => [phase.id, phase]));

for (const expected of ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']) {
  if (!byId.has(expected)) fail(`missing phase ${expected}`);
}
if (byId.size !== phases.length) fail('duplicate physical campaign phase id');

for (const phase of phases) {
  if (!allowedStates.has(phase.status)) fail(`${phase.id} has invalid status ${phase.status}`);
  if (!Array.isArray(phase.dependsOn)) fail(`${phase.id} dependsOn must be an array`);
  if (!Array.isArray(phase.binds) || phase.binds.length === 0) fail(`${phase.id} must bind at least one closure node`);
  if (!Array.isArray(phase.requiredClaims) || phase.requiredClaims.length === 0) fail(`${phase.id} must define requiredClaims`);
  if (phase.physicalReceiptRequiredForPass !== true) fail(`${phase.id} must require a physical receipt for PASS`);
  if (typeof phase.receiptPattern !== 'string' || !phase.receiptPattern.includes('.md')) fail(`${phase.id} receiptPattern must identify a markdown receipt`);

  for (const dependency of phase.dependsOn) {
    if (!byId.has(dependency)) fail(`${phase.id} depends on unknown phase ${dependency}`);
  }
  for (const node of phase.binds) {
    if (!['Q-003', 'Q-004', 'Q-005'].includes(node)) fail(`${phase.id} binds unknown node ${node}`);
  }

  if (phase.status === 'PASS') {
    if (!phase.passReceipt?.path || !phase.passReceipt?.binding || !phase.passReceipt?.evidenceOrigin) {
      fail(`${phase.id} PASS requires path + binding + evidenceOrigin`);
    } else {
      if (!fs.existsSync(phase.passReceipt.path)) fail(`${phase.id} PASS receipt missing: ${phase.passReceipt.path}`);
      if (!fs.existsSync(phase.passReceipt.binding)) fail(`${phase.id} PASS binding missing: ${phase.passReceipt.binding}`);
    }
    if (phase.id !== 'P0') fail(`${phase.id} PASS has no phase-specific immutable receipt validator yet`);
  }
}

if (byId.get('P0')?.status !== 'PASS') fail('P0 must be PASS only through its immutable composite physical receipt');
for (const id of ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']) {
  if (byId.get(id)?.status !== 'PHYSICAL_EVIDENCE_REQUIRED') fail(`${id} must remain PHYSICAL_EVIDENCE_REQUIRED`);
}
if (byId.get('P8')?.status !== 'BLOCKED_BY_PRIOR_PHASES') fail('P8 must remain blocked by prior physical phases');

const p8Deps = new Set(byId.get('P8')?.dependsOn ?? []);
for (const required of ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']) {
  if (!p8Deps.has(required)) fail(`P8 missing dependency ${required}`);
}

if (failures.length) {
  console.error('FINANCESENSOR_PHYSICAL_CAMPAIGN_CONTRACT=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

await import('./validate-p0-receipt.mjs');
await import('./validate-p1-production-lifecycle.mjs');
await import('./validate-p1-result-reducer.mjs');
await import('./validate-p1-one-click-run.mjs');
await import('./validate-p2-state.mjs');
await import('./validate-deferred-physical-debt.mjs');

console.log('FINANCESENSOR_PHYSICAL_CAMPAIGN_CONTRACT=PASS');
console.log(`PHASES=${phases.length}`);
console.log('P0_PHYSICAL_PASS=PASS');
console.log('P0_PASS_ORIGIN=BOUND_EXISTING_PHYSICAL_RECEIPTS');
console.log('P1_HARNESS=READY_FAIL_CLOSED');
console.log('P1_RESULT_REDUCER=SYNTHETIC_NEGATIVE_MATRIX_PASS');
console.log('P1_ONE_CLICK_CONTROLLED_RUN=STATIC_READY');
console.log('P1_PHYSICAL_EXECUTION=OPEN');
console.log('P2_ANDROID_CUSTODY=PHYSICAL_PASS');
console.log('P2_RESTORE_BEHAVIOR=CONTRACT_PASS');
console.log('P2_OVERALL=PHYSICAL_EVIDENCE_REQUIRED');
console.log('IOS_PHYSICAL_DEBT=RECORDED_FAIL_CLOSED');
console.log('NEXT_PHYSICAL_FRONTIER=P1');
console.log('P1_P7_PHYSICAL_EVIDENCE_REQUIRED=PASS');
console.log('P8_BLOCKED_BY_PRIOR_PHASES=PASS');
console.log('Q003_Q004_Q005_ACTIVE=PASS');
console.log('CI_ROLE=REVALIDATES_BOUND_PHYSICAL_RECEIPTS_STATIC_OPEN_BOUNDARIES_DEBT_LEDGER_AND_P1_HARNESS');
