import fs from 'node:fs';

const debt = JSON.parse(fs.readFileSync('graph/deferred-physical-debt.json', 'utf8'));
const campaign = JSON.parse(fs.readFileSync('graph/physical-closure-campaign.json', 'utf8'));
const failures = [];
const fail = message => failures.push(message);

if (debt.schemaVersion !== 1) fail('schemaVersion must be 1');
if (debt.project !== 'FinanceSensor') fail('project must be FinanceSensor');
if (debt.mk !== 'MK0') fail('mk must be MK0');
if (debt.status !== 'ACTIVE') fail('deferred physical debt ledger must remain ACTIVE while items are open');

for (const key of [
  'deferredIsNotWaived',
  'deferredIsNotPassed',
  'deferredDoesNotChangeClosureGraph',
  'physicalClaimsRequireOwnedDeviceEvidence'
]) {
  if (debt.policy?.[key] !== true) fail(`policy.${key} must be true`);
}
if (debt.policy?.buildReadyWhileDebtBlocksClosure !== false) fail('BUILD_READY must remain false while deferred debt blocks closure');

const items = Array.isArray(debt.items) ? debt.items : [];
const ids = new Set(items.map(item => item.id));
for (const id of ['TD-IOS-P2-001', 'TD-IOS-P4-001', 'TD-IOS-COMPILE-001']) {
  if (!ids.has(id)) fail(`missing debt item ${id}`);
}
if (ids.size !== items.length) fail('duplicate deferred physical debt id');

const p2 = campaign.phases?.find(phase => phase.id === 'P2');
const p4 = campaign.phases?.find(phase => phase.id === 'P4');
if (p2?.status !== 'PHYSICAL_EVIDENCE_REQUIRED') fail('P2 must remain physically open while iOS debt is deferred');
if (p4?.status !== 'PHYSICAL_EVIDENCE_REQUIRED') fail('P4 must remain physically open while iOS debt is deferred');

const p2Debt = items.find(item => item.id === 'TD-IOS-P2-001');
const expectedP2Claims = new Set([
  'IOS_PROTECTED_OAUTH_CUSTODY',
  'NO_TOKEN_PLAINTEXT_IN_ORDINARY_STORAGE',
  'NO_TOKEN_GMAIL_FINANCIAL_PLAINTEXT_IN_LOGS',
  'DISCONNECT_REMOVES_PROTECTED_CREDENTIAL'
]);
const actualP2Claims = new Set(p2Debt?.openClaims ?? []);
for (const claim of expectedP2Claims) if (!actualP2Claims.has(claim)) fail(`TD-IOS-P2-001 missing ${claim}`);
for (const claim of actualP2Claims) if (!expectedP2Claims.has(claim)) fail(`TD-IOS-P2-001 has unexpected claim ${claim}`);
for (const claim of expectedP2Claims) {
  if (!(p2?.openClaims ?? []).includes(claim)) fail(`campaign P2 must keep deferred claim open: ${claim}`);
}

const p4Debt = items.find(item => item.id === 'TD-IOS-P4-001');
const expectedP4Claims = new Set(p4?.requiredClaims ?? []);
const actualP4Claims = new Set(p4Debt?.openClaims ?? []);
for (const claim of expectedP4Claims) if (!actualP4Claims.has(claim)) fail(`TD-IOS-P4-001 missing ${claim}`);
for (const claim of actualP4Claims) if (!expectedP4Claims.has(claim)) fail(`TD-IOS-P4-001 has unexpected claim ${claim}`);

const compileDebt = items.find(item => item.id === 'TD-IOS-COMPILE-001');
if (compileDebt?.kind !== 'STATIC_PREREQUISITE') fail('TD-IOS-COMPILE-001 must remain a static prerequisite, not physical proof');
if (compileDebt?.status !== 'ACTIVE_NOW') fail('TD-IOS-COMPILE-001 must remain ACTIVE_NOW until hosted compile passes');
if (compileDebt?.closureCondition !== 'HOSTED_MACOS_IOS_GMAIL_CUSTODY_COMPILE_PASS') fail('unexpected iOS compile closure condition');

if (debt.returnSweep?.id !== 'IOS-PHYSICAL-SWEEP-01') fail('return sweep id mismatch');
if (debt.returnSweep?.trigger !== 'OWNED_IPHONE_AVAILABLE_AND_STATIC_PREREQUISITES_GREEN') fail('return sweep trigger mismatch');
if (debt.nextExecutionFrontier?.phase !== 'P1') fail('P1 must be the next physical execution frontier while iPhone is deferred');

for (const forbidden of ['P2_PASS', 'P4_PASS', 'Q003_CLOSED', 'Q004_CLOSED', 'Q005_CLOSED', 'BUILD_READY']) {
  if (!(debt.returnSweep?.mustNotClaimBeforeSweep ?? []).includes(forbidden)) fail(`return sweep missing forbidden promotion ${forbidden}`);
}

if (failures.length) {
  console.error('FINANCESENSOR_DEFERRED_PHYSICAL_DEBT=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_DEFERRED_PHYSICAL_DEBT=PASS');
console.log('DEFERRED_DEVICE=IOS');
console.log('DEFERRED_PHYSICAL_ITEMS=2');
console.log('ACTIVE_STATIC_PREREQUISITES=1');
console.log('P2_REMAINS_PHYSICAL_OPEN=PASS');
console.log('P4_REMAINS_PHYSICAL_OPEN=PASS');
console.log('NEXT_PHYSICAL_FRONTIER=P1');
console.log('RETURN_SWEEP=IOS-PHYSICAL-SWEEP-01');
console.log('BUILD_READY=false');
