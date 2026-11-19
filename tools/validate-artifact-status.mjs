import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ledgerPath = path.join(root, 'graph', 'closure-ledger.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const failures = [];
const aliases = new Map([['DRAFT', 'DRAFTED']]);

const normalize = (value) => aliases.get(value) ?? value;

function statusFromText(text) {
  const match = text.match(/\*\*Status:\*\*\s*([A-Z_]+)/);
  return match ? normalize(match[1]) : null;
}

function contradictionSection(text, id) {
  const marker = `## ${id}`;
  const start = text.indexOf(marker);
  if (start < 0) return null;
  const rest = text.slice(start + marker.length);
  const next = rest.search(/\n##\s+/);
  return next >= 0 ? rest.slice(0, next) : rest;
}

let declarations = 0;

for (const node of ledger.nodes ?? []) {
  for (const artifact of node.artifacts ?? []) {
    if (!artifact.endsWith('.md')) continue;
    const fullPath = path.join(root, artifact);
    if (!fs.existsSync(fullPath)) continue;

    const text = fs.readFileSync(fullPath, 'utf8');
    let declared = null;

    if (node.kind === 'contradiction') {
      const section = contradictionSection(text, node.id);
      if (section !== null) declared = statusFromText(section);
    } else {
      declared = statusFromText(text);
    }

    if (!declared) continue;
    declarations += 1;

    if (declared !== node.status) {
      failures.push(`${node.id} ledger=${node.status} artifact=${artifact} declares=${declared}`);
    }
  }
}

if (failures.length > 0) {
  console.error('ARTIFACT_STATUS_FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('ARTIFACT_STATUS_PASS');
console.log(`statusDeclarationsChecked=${declarations}`);
console.log('authority=graph/closure-ledger.json');
