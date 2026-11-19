import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ledgerPath = path.join(root, 'graph', 'closure-ledger.json');
const allowedStatuses = new Set(['OPEN', 'ACTIVE', 'DRAFTED', 'PASS', 'CLOSED', 'BLOCKED', 'REOPENED']);
const terminalSatisfied = new Set(['CLOSED', 'PASS']);

function fail(message) {
  console.error(`GRAPH_FAIL: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(ledgerPath)) {
  fail('graph/closure-ledger.json is missing');
  process.exit();
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const nodes = Array.isArray(ledger.nodes) ? ledger.nodes : [];
const byId = new Map();

for (const node of nodes) {
  if (!node.id) {
    fail('node without id');
    continue;
  }
  if (byId.has(node.id)) fail(`duplicate node id ${node.id}`);
  byId.set(node.id, node);
  if (!allowedStatuses.has(node.status)) fail(`${node.id} has invalid status ${node.status}`);
  if (!Array.isArray(node.dependsOn)) fail(`${node.id}.dependsOn must be an array`);
  if (!Array.isArray(node.validates)) fail(`${node.id}.validates must be an array`);
  if (node.revalidates !== undefined && !Array.isArray(node.revalidates)) fail(`${node.id}.revalidates must be an array`);
  if (!Array.isArray(node.artifacts) || node.artifacts.length === 0) fail(`${node.id} must name at least one artifact`);
  if (!Array.isArray(node.evidence)) fail(`${node.id}.evidence must be an array`);
}

for (const node of nodes) {
  for (const ref of [...(node.dependsOn ?? []), ...(node.validates ?? []), ...(node.revalidates ?? [])]) {
    if (!byId.has(ref)) fail(`${node.id} references missing node ${ref}`);
    if (ref === node.id) fail(`${node.id} cannot reference itself`);
  }

  for (const artifact of node.artifacts ?? []) {
    const artifactPath = path.join(root, artifact);
    if (!fs.existsSync(artifactPath)) fail(`${node.id} artifact missing: ${artifact}`);
  }

  for (const evidence of node.evidence ?? []) {
    const evidencePath = path.join(root, evidence);
    if (!fs.existsSync(evidencePath)) fail(`${node.id} evidence missing: ${evidence}`);
  }

  if (node.status === 'CLOSED') {
    if ((node.evidence ?? []).length === 0) fail(`${node.id} is CLOSED without evidence`);
    if (!node.closureReceipt) fail(`${node.id} is CLOSED without closureReceipt`);
    if (node.closureReceipt && !fs.existsSync(path.join(root, node.closureReceipt))) {
      fail(`${node.id} closure receipt missing: ${node.closureReceipt}`);
    }
    for (const dependencyId of node.dependsOn ?? []) {
      const dependency = byId.get(dependencyId);
      if (dependency && !terminalSatisfied.has(dependency.status)) {
        fail(`${node.id} is CLOSED while dependency ${dependencyId} is ${dependency.status}`);
      }
    }
  }
}

// Every dependency must be explicitly acknowledged by the upstream node.
for (const node of nodes) {
  for (const dependencyId of node.dependsOn ?? []) {
    const dependency = byId.get(dependencyId);
    if (!dependency) continue;
    if (!(dependency.validates ?? []).includes(node.id)) {
      fail(`missing backlink: ${node.id} dependsOn ${dependencyId}, but ${dependencyId} does not validate ${node.id}`);
    }
  }
}

const buildGate = byId.get('G-MK0');
if (!buildGate) {
  fail('G-MK0 gate is missing');
} else {
  const blockers = (buildGate.dependsOn ?? [])
    .map(id => byId.get(id))
    .filter(Boolean)
    .filter(node => node.status !== 'CLOSED');

  if (ledger.buildReady === true) {
    if (buildGate.status !== 'CLOSED') fail('buildReady=true while G-MK0 is not CLOSED');
    if (blockers.length > 0) {
      fail(`buildReady=true with open blockers: ${blockers.map(n => `${n.id}:${n.status}`).join(', ')}`);
    }
  }

  if (ledger.buildReady === false && buildGate.status === 'CLOSED') {
    fail('G-MK0 is CLOSED but buildReady=false');
  }
}

// A reopened node must block every directly dependent CLOSED gate/node.
for (const node of nodes.filter(n => n.status === 'REOPENED')) {
  for (const dependentId of node.validates ?? []) {
    const dependent = byId.get(dependentId);
    if (dependent?.status === 'CLOSED') {
      fail(`${node.id} is REOPENED while dependent ${dependentId} remains CLOSED`);
    }
  }
}

if (process.exitCode) process.exit(process.exitCode);

const statusCounts = nodes.reduce((acc, node) => {
  acc[node.status] = (acc[node.status] ?? 0) + 1;
  return acc;
}, {});

console.log('GRAPH_PASS');
console.log(`nodes=${nodes.length}`);
console.log(`buildReady=${ledger.buildReady}`);
console.log(`states=${JSON.stringify(statusCounts)}`);
