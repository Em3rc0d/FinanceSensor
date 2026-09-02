import fs from 'node:fs';

const manifestPath = 'graph/build-readiness.json';
const ledgerPath = 'graph/closure-ledger.json';
const campaignPath = 'graph/physical-closure-campaign.json';
const releasePath = 'mk0/12-release/RELEASE-GATES.md';
const tenancyAdrPath = 'mk0/11-decisions/ADR-001-TENANT-FINANCIAL-OWNERSHIP-BOUNDARY.md';
const scopePath = 'product/MK0-SCOPE-FREEZE.md';
const implementationPlanPath = 'mk0/07-plan/IMPLEMENTATION-SLICES.md';

const failures = [];
const fail = message => failures.push(message);

for (const path of [manifestPath, ledgerPath, campaignPath, releasePath, tenancyAdrPath, scopePath, implementationPlanPath]) {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
}

if (!failures.length) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
  const release = fs.readFileSync(releasePath, 'utf8');
  const tenancyAdr = fs.readFileSync(tenancyAdrPath, 'utf8');
  const scope = fs.readFileSync(scopePath, 'utf8');
  const implementationPlan = fs.readFileSync(implementationPlanPath, 'utf8');

  if (manifest.schemaVersion !== 1) fail('build readiness schemaVersion must be 1');
  if (manifest.project !== 'FinanceSensor' || manifest.mk !== 'MK0') fail('build readiness identity mismatch');
  if (manifest.authority !== 'graph/closure-ledger.json') fail('closure ledger must remain authority');
  if (manifest.implementationBaseline !== 'FROZEN') fail('implementation baseline must be FROZEN');
  if (manifest.law !== 'BUILD_READY_TRUE_REQUIRES_G_MK0_CLOSED') fail('build readiness law missing');

  const expectedGateIds = [
    'PRODUCT_DEFINITION',
    'MK0_SCOPE',
    'P0_QUARRIES',
    'TENANCY_MODEL',
    'FINANCIAL_MODEL',
    'EVENT_INVARIANTS',
    'EDGE_CLOUD_BOUNDARY',
    'PRIVACY_MODEL',
    'THREAT_MODEL',
    'GMAIL_FEASIBILITY',
    'ANDROID_FEASIBILITY',
    'MULTI_DEVICE_DESIGN',
    'SIGNATURE_WIREFRAMES',
    'NO_SCROLL_CONTRACT',
    'IMPLEMENTATION_PLAN'
  ];

  const gates = Array.isArray(manifest.gates) ? manifest.gates : [];
  const byId = new Map(gates.map(gate => [gate.id, gate]));
  if (byId.size !== gates.length) fail('duplicate build readiness gate id');
  for (const id of expectedGateIds) if (!byId.has(id)) fail(`missing build readiness gate ${id}`);

  const allowedStates = new Set(manifest.states ?? []);
  for (const gate of gates) {
    if (!allowedStates.has(gate.state)) fail(`${gate.id} has unsupported state ${gate.state}`);
    for (const evidence of gate.evidence ?? []) if (!fs.existsSync(evidence)) fail(`${gate.id} evidence missing: ${evidence}`);
    for (const nodeId of gate.blockingNodes ?? []) {
      const node = ledger.nodes?.find(node => node.id === nodeId);
      if (!node) fail(`${gate.id} references unknown closure node ${nodeId}`);
    }
  }

  for (const id of ['Q-001', 'Q-002']) {
    const node = ledger.nodes.find(node => node.id === id);
    if (node?.status !== 'CLOSED') fail(`${id} must remain CLOSED for financial model PASS`);
  }

  if (byId.get('TENANCY_MODEL')?.state !== 'PASS') fail('TENANCY_MODEL must be PASS after ADR-001 freeze');
  for (const marker of [
    'TENANT = FINANCIAL OWNERSHIP + ISOLATION BOUNDARY',
    'USER != TENANT',
    'DEVICE != TENANT',
    'CONNECTION != TENANT',
    'TENANCY_MODEL_FROZEN != RLS_PHYSICALLY_PROVEN'
  ]) {
    if (!tenancyAdr.includes(marker)) fail(`ADR-001 missing tenancy marker: ${marker}`);
  }

  if (byId.get('MK0_SCOPE')?.state !== 'PASS') fail('MK0_SCOPE must be PASS after scope freeze');
  for (const marker of [
    'MK0_SCOPE = FROZEN',
    'PRIMARY PRODUCT                  MOBILE APPLICATION',
    'FIRST PHYSICAL TARGET           ANDROID',
    'NEW_UNJUSTIFIED_PRODUCT_SURFACE = FORBIDDEN',
    'SCOPE_FROZEN != BUILD_READY'
  ]) {
    if (!scope.includes(marker)) fail(`MK0 scope freeze missing marker: ${marker}`);
  }

  if (byId.get('IMPLEMENTATION_PLAN')?.state !== 'PASS') fail('IMPLEMENTATION_PLAN must be PASS after slice freeze');
  for (const marker of [
    'IMPLEMENTATION_PLAN = PASS',
    'BUILD_SEQUENCE       = B0 → B11',
    'B3 — Gmail mobile OAuth custody',
    'B7 — Control plane and tenant RLS',
    'B11 — Physical closure and gate reconciliation'
  ]) {
    if (!implementationPlan.includes(marker)) fail(`implementation plan missing marker: ${marker}`);
  }

  if (byId.get('FINANCIAL_MODEL')?.state !== 'PASS') fail('FINANCIAL_MODEL must be PASS');
  if (byId.get('EVENT_INVARIANTS')?.state !== 'PASS') fail('EVENT_INVARIANTS must be PASS');

  for (const id of ['Q-003', 'Q-004', 'Q-005']) {
    const node = ledger.nodes.find(node => node.id === id);
    if (node?.status !== 'ACTIVE') fail(`${id} must remain ACTIVE until physical closure; got ${node?.status}`);
  }

  if (ledger.buildReady !== false) fail('closure ledger buildReady must remain false before G-MK0 closure');
  if (manifest.buildReady !== false) fail('build readiness manifest must remain false before G-MK0 closure');
  const gmk0 = ledger.nodes.find(node => node.id === 'G-MK0');
  if (!gmk0) fail('closure ledger missing G-MK0');
  else if (gmk0.status === 'CLOSED') fail('G-MK0 unexpectedly CLOSED while buildReady=false');

  if (campaign.status !== 'ACTIVE') fail('physical closure campaign must remain ACTIVE');
  if (!campaign.phases?.some(phase => phase.status === 'PHYSICAL_EVIDENCE_REQUIRED')) fail('physical campaign must retain physical blockers');

  const prePhysical = new Set(manifest.prePhysicalClosureTargets ?? []);
  for (const id of ['THREAT_MODEL', 'SIGNATURE_WIREFRAMES', 'NO_SCROLL_CONTRACT']) {
    if (!prePhysical.has(id)) fail(`prePhysicalClosureTargets missing ${id}`);
  }
  for (const id of ['TENANCY_MODEL', 'MK0_SCOPE', 'IMPLEMENTATION_PLAN']) {
    if (prePhysical.has(id)) fail(`${id} cannot remain a pre-physical blocker after freeze`);
  }
  if (prePhysical.size !== 3) fail(`expected exactly 3 pre-physical blockers, got ${prePhysical.size}`);

  const physical = new Set(manifest.physicalClosureTargets ?? []);
  for (const id of ['P0_QUARRIES', 'EDGE_CLOUD_BOUNDARY', 'PRIVACY_MODEL', 'GMAIL_FEASIBILITY', 'ANDROID_FEASIBILITY', 'MULTI_DEVICE_DESIGN']) {
    if (!physical.has(id)) fail(`physicalClosureTargets missing ${id}`);
  }

  if (!release.includes('BUILD_READY              YES')) fail('release gate contract lost BUILD_READY YES target');
  if (!release.includes('No full MK0 build starts until')) fail('release gate build-entry law missing');
}

if (failures.length) {
  console.error('FINANCESENSOR_BUILD_READINESS=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const counts = manifest.gates.reduce((acc, gate) => {
  acc[gate.state] = (acc[gate.state] ?? 0) + 1;
  return acc;
}, {});
console.log('FINANCESENSOR_BUILD_READINESS=PASS');
console.log(`GATES=${manifest.gates.length}`);
console.log(`STATE_COUNTS=${JSON.stringify(counts)}`);
console.log(`PRE_PHYSICAL_TARGETS=${manifest.prePhysicalClosureTargets.length}`);
console.log(`PHYSICAL_TARGETS=${manifest.physicalClosureTargets.length}`);
console.log('TENANCY_MODEL=PASS');
console.log('MK0_SCOPE=PASS');
console.log('IMPLEMENTATION_PLAN=PASS');
console.log('IMPLEMENTATION_BASELINE=FROZEN');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=CLOSURE_REQUIRED');
console.log('BUILD_READY=false');
