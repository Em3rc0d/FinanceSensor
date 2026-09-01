import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const matrixPath = path.join(root, 'graph', 'traceability-matrix.json');
const recoveryMatrixPath = path.join(root, 'graph', 'traceability-recovery.json');
const ledgerPath = path.join(root, 'graph', 'closure-ledger.json');
const productPath = path.join(root, 'product', 'PRODUCT-INVARIANTS.md');
const dmPath = path.join(root, 'mk0', '05-data-model', 'INVARIANTS.md');
const contradictionsPath = path.join(root, 'graph', 'CONTRADICTIONS.md');

const failures = [];
const fail = message => failures.push(message);
const exists = relativePath => fs.existsSync(path.join(root, relativePath));

for (const required of [matrixPath, recoveryMatrixPath, ledgerPath, productPath, dmPath, contradictionsPath]) {
  if (!fs.existsSync(required)) {
    console.error(`TRACEABILITY_FAIL: missing ${path.relative(root, required)}`);
    process.exit(1);
  }
}

const baseMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const recoveryMatrix = JSON.parse(fs.readFileSync(recoveryMatrixPath, 'utf8'));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const productText = fs.readFileSync(productPath, 'utf8');
const dmText = fs.readFileSync(dmPath, 'utf8');
const contradictionsText = fs.readFileSync(contradictionsPath, 'utf8');

if (recoveryMatrix.extends !== 'traceability-matrix.json') {
  fail('recovery traceability matrix must extend traceability-matrix.json');
}
if (recoveryMatrix.schemaVersion !== baseMatrix.schemaVersion) {
  fail('recovery traceability schemaVersion must match base matrix');
}

const matrix = {
  ...baseMatrix,
  groups: [
    ...(baseMatrix.groups ?? []),
    ...(recoveryMatrix.groups ?? [])
  ],
  interrupts: [
    ...(baseMatrix.interrupts ?? []),
    ...(recoveryMatrix.interrupts ?? [])
  ]
};

const productIds = [...productText.matchAll(/^###\s+((?:FIN|PRIV|TEN|HUM|UX|DEV)-\d{3})\b/gm)].map(m => m[1]);
const dmIds = [...dmText.matchAll(/^###\s+(INV-[A-Z]+-\d{3})\b/gm)].map(m => m[1]);
const contradictionIds = [...contradictionsText.matchAll(/^##\s+(C-\d{3})\b/gm)].map(m => m[1]);
const allInvariantIds = new Set([...productIds, ...dmIds]);
const ledgerNodes = new Map((ledger.nodes ?? []).map(node => [node.id, node]));
const allowedStates = new Set(['SPECIFIED', 'PARTIAL', 'PROVEN_AT_SPIKE', 'PROVEN']);

const seenGroups = new Set();
const seen = new Map();
for (const group of matrix.groups ?? []) {
  if (!group.id) fail('traceability group without id');
  if (seenGroups.has(group.id)) fail(`duplicate traceability group ${group.id}`);
  seenGroups.add(group.id);

  if (!allowedStates.has(group.status)) fail(`${group.id} invalid status ${group.status}`);
  if (!['product', 'data-model'].includes(group.source)) fail(`${group.id} invalid source ${group.source}`);
  if (!Array.isArray(group.invariants) || group.invariants.length === 0) fail(`${group.id} has no invariants`);
  if (!Array.isArray(group.ownerNodes) || group.ownerNodes.length === 0) fail(`${group.id} has no ownerNodes`);
  if (!Array.isArray(group.tests)) fail(`${group.id}.tests must be an array`);
  if (!Array.isArray(group.evidence)) fail(`${group.id}.evidence must be an array`);
  if (!Array.isArray(group.mapsTo)) fail(`${group.id}.mapsTo must be an array`);

  const expectedSet = group.source === 'product' ? new Set(productIds) : new Set(dmIds);

  for (const invariant of group.invariants ?? []) {
    if (!expectedSet.has(invariant)) fail(`${group.id} references unknown ${group.source} invariant ${invariant}`);
    seen.set(invariant, (seen.get(invariant) ?? 0) + 1);
  }

  for (const nodeId of group.ownerNodes ?? []) {
    if (!ledgerNodes.has(nodeId)) fail(`${group.id} references missing owner node ${nodeId}`);
  }

  for (const testPath of group.tests ?? []) {
    if (!exists(testPath)) fail(`${group.id} test missing: ${testPath}`);
  }

  for (const evidencePath of group.evidence ?? []) {
    if (!exists(evidencePath)) fail(`${group.id} evidence missing: ${evidencePath}`);
  }

  for (const mapped of group.mapsTo ?? []) {
    if (!dmIds.includes(mapped)) fail(`${group.id} mapsTo unknown data-model invariant ${mapped}`);
  }

  if (['PROVEN_AT_SPIKE', 'PROVEN'].includes(group.status)) {
    if ((group.tests ?? []).length === 0) fail(`${group.id} ${group.status} requires executable tests`);
    if ((group.evidence ?? []).length === 0) fail(`${group.id} ${group.status} requires physical evidence`);
  }

  if (group.status === 'PROVEN') {
    const evidenceUnderEvidenceDir = (group.evidence ?? []).some(p => p.startsWith('mk0/10-evidence/'));
    if (!evidenceUnderEvidenceDir) fail(`${group.id} PROVEN requires mk0/10-evidence artifact`);

    const closedOwner = (group.ownerNodes ?? [])
      .map(id => ledgerNodes.get(id))
      .filter(Boolean)
      .some(node => node.status === 'CLOSED');
    if (!closedOwner) fail(`${group.id} PROVEN requires at least one CLOSED owning node`);
  }
}

for (const invariant of allInvariantIds) {
  const count = seen.get(invariant) ?? 0;
  if (count === 0) fail(`unwired invariant ${invariant}`);
  if (count > 1) fail(`invariant ${invariant} appears in ${count} traceability groups`);
}

for (const invariant of seen.keys()) {
  if (!allInvariantIds.has(invariant)) fail(`matrix contains invariant absent from source Markdown: ${invariant}`);
}

const ledgerContradictions = [...ledgerNodes.values()]
  .filter(node => node.kind === 'contradiction')
  .map(node => node.id)
  .sort();
const sourceContradictions = [...new Set(contradictionIds)].sort();

if (JSON.stringify(ledgerContradictions) !== JSON.stringify(sourceContradictions)) {
  fail(`contradiction registry mismatch source=${sourceContradictions.join(',')} ledger=${ledgerContradictions.join(',')}`);
}

const interruptCounts = new Map();
for (const interrupt of matrix.interrupts ?? []) {
  const node = ledgerNodes.get(interrupt.contradiction);
  if (!node || node.kind !== 'contradiction') {
    fail(`interrupt references missing contradiction ${interrupt.contradiction}`);
    continue;
  }
  interruptCounts.set(interrupt.contradiction, (interruptCounts.get(interrupt.contradiction) ?? 0) + 1);
  if (!Array.isArray(interrupt.invariants) || interrupt.invariants.length === 0) {
    fail(`${interrupt.contradiction} interrupt has no affected invariants`);
  }
  for (const invariant of interrupt.invariants ?? []) {
    if (!allInvariantIds.has(invariant)) fail(`${interrupt.contradiction} interrupts unknown invariant ${invariant}`);
  }
}

for (const contradiction of ledgerContradictions) {
  const count = interruptCounts.get(contradiction) ?? 0;
  if (count !== 1) fail(`${contradiction} must appear exactly once in traceability interrupts, found ${count}`);
}

for (const group of matrix.groups ?? []) {
  if (group.status !== 'PROVEN') continue;
  const invariants = new Set(group.invariants ?? []);
  for (const interrupt of matrix.interrupts ?? []) {
    if (!(interrupt.invariants ?? []).some(id => invariants.has(id))) continue;
    const contradiction = ledgerNodes.get(interrupt.contradiction);
    if (contradiction?.status !== 'CLOSED') {
      fail(`${group.id} is PROVEN while ${interrupt.contradiction} is ${contradiction?.status}`);
    }
  }
}

const releaseGate = ledgerNodes.get(matrix.releaseGate);
if (!releaseGate) {
  fail(`releaseGate ${matrix.releaseGate} does not exist in closure ledger`);
} else {
  const releaseEvaluatingGreen = releaseGate.status === 'CLOSED' || ledger.buildReady === true;
  if (releaseEvaluatingGreen) {
    const notProven = (matrix.groups ?? []).filter(group => group.status !== 'PROVEN');
    if (notProven.length > 0) {
      fail(`release gate cannot close with non-PROVEN traceability groups: ${notProven.map(g => `${g.id}:${g.status}`).join(', ')}`);
    }

    const openContradictions = ledgerContradictions
      .map(id => ledgerNodes.get(id))
      .filter(node => node?.status !== 'CLOSED');
    if (openContradictions.length > 0) {
      fail(`release gate cannot close with unresolved contradictions: ${openContradictions.map(n => `${n.id}:${n.status}`).join(', ')}`);
    }
  }
}

if (failures.length > 0) {
  console.error('TRACEABILITY_FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

const counts = (matrix.groups ?? []).reduce((acc, group) => {
  acc[group.status] = (acc[group.status] ?? 0) + group.invariants.length;
  return acc;
}, {});

console.log('TRACEABILITY_PASS');
console.log(`productInvariants=${productIds.length}`);
console.log(`dataModelInvariants=${dmIds.length}`);
console.log(`wiredInvariants=${seen.size}`);
console.log(`baseGroups=${baseMatrix.groups?.length ?? 0}`);
console.log(`recoveryGroups=${recoveryMatrix.groups?.length ?? 0}`);
console.log(`contradictions=${ledgerContradictions.length}`);
console.log(`releaseGate=${releaseGate?.status ?? 'MISSING'}`);
console.log(`buildReady=${ledger.buildReady}`);
console.log(`states=${JSON.stringify(counts)}`);
