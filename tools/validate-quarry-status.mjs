import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const ledger = JSON.parse(fs.readFileSync(path.join(root, 'graph', 'closure-ledger.json'), 'utf8'));
const failures = [];

for (const node of ledger.nodes ?? []) {
  if (node.kind !== 'quarry') continue;
  const quarryPath = (node.artifacts ?? []).find(p => p.startsWith('mk0/02-quarries/') && p.endsWith('.md'));
  if (!quarryPath) {
    failures.push(`${node.id} has no quarry markdown artifact`);
    continue;
  }

  const fullPath = path.join(root, quarryPath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`${node.id} quarry file missing: ${quarryPath}`);
    continue;
  }

  const text = fs.readFileSync(fullPath, 'utf8');
  const match = text.match(/\*\*Status:\*\*\s*([A-Z_]+)/);
  if (!match) {
    failures.push(`${node.id} has no machine-readable **Status:** line`);
    continue;
  }

  const declared = match[1];
  if (declared !== node.status) {
    failures.push(`${node.id} ledger=${node.status} markdown=${declared}`);
  }
}

if (failures.length) {
  console.error('QUARRY_STATUS_FAIL');
  failures.forEach(issue => console.error(`- ${issue}`));
  process.exit(1);
}

console.log('QUARRY_STATUS_PASS');
console.log(`quarries=${(ledger.nodes ?? []).filter(n => n.kind === 'quarry').length}`);
