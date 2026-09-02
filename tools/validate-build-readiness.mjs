import fs from 'node:fs';

const manifestPath = 'graph/build-readiness.json';
const ledgerPath = 'graph/closure-ledger.json';
const campaignPath = 'graph/physical-closure-campaign.json';
const releasePath = 'mk0/12-release/RELEASE-GATES.md';

const failures = [];
const fail = message => failures.push(message);

for (const path of [manifestPath, ledgerPath, campaignPath, releasePath]) {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
}

if (!failures.length) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
  const release = fs.readFileSync(releasePath, 'utf8');

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
  for (const id of ['MK0_SCOPE', 'TENANCY_MODEL', 'THREAT_MODEL', 'SIGNATURE_WIREFRAMES', 'NO_SCROLL_CONTRACT', 'IMPLEMENTATION_PLAN']) {
    if (!prePhysical.has(id)) fail(`prePhysicalClosureTargets missing ${id}`);
  }

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
console.log('IMPLEMENTATION_BASELINE=FROZEN');
console.log('Q003_Q004_Q005=ACTIVE');
console.log('G_MK0=CLOSURE_REQUIRED');
console.log('BUILD_READY=false');
