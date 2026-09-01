import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const matrixPath = path.join(process.cwd(), 'mk0', '04-architecture', 'PRIVACY-DATA-MATRIX.json');
const requiredFields = [
  'id', 'name', 'sensitivity', 'purpose', 'source', 'localRetention',
  'localProtection', 'cloudPlaintext', 'e2eeSync', 'rawRetention',
  'deletionTrigger', 'humanAccess', 'logging'
];

const failures = [];
const fail = (message) => failures.push(message);

if (!fs.existsSync(matrixPath)) {
  console.error('PRIVACY_MATRIX_FAIL: matrix missing');
  process.exit(1);
}

const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const classes = Array.isArray(matrix.classes) ? matrix.classes : [];
const byId = new Map();

if (matrix.defaultRule !== 'deny-unclassified-persistence') {
  fail('defaultRule must be deny-unclassified-persistence');
}

for (const item of classes) {
  for (const field of requiredFields) {
    if (item[field] === undefined || item[field] === null || String(item[field]).trim() === '') {
      fail(`${item.id ?? '<unknown>'} missing ${field}`);
    }
  }
  if (byId.has(item.id)) fail(`duplicate data class ${item.id}`);
  byId.set(item.id, item);

  if (['CRITICAL', 'HIGH'].includes(item.sensitivity) && item.logging === 'ALLOW_ALL') {
    fail(`${item.id} cannot allow unrestricted logging`);
  }

  if (item.sensitivity === 'CRITICAL' && item.cloudPlaintext.startsWith('ALLOWED')) {
    fail(`${item.id} CRITICAL data cannot allow normal cloud plaintext`);
  }
}

const requireClass = (id) => {
  const item = byId.get(id);
  if (!item) fail(`required privacy class ${id} missing`);
  return item;
};

const token = requireClass('AUTH-OAUTH-TOKEN');
if (token) {
  if (token.cloudPlaintext !== 'FORBIDDEN') fail('OAuth token cloud plaintext must be FORBIDDEN');
  if (token.logging !== 'FORBIDDEN') fail('OAuth token logging must be FORBIDDEN');
}

for (const id of ['MAIL-BODY', 'MAIL-ATTACHMENT']) {
  const item = requireClass(id);
  if (!item) continue;
  if (!item.localRetention.includes('TRANSIENT')) fail(`${id} must be transient in MK0`);
  if (item.cloudPlaintext !== 'FORBIDDEN') fail(`${id} cloud plaintext must be FORBIDDEN`);
  if (item.e2eeSync !== 'FORBIDDEN_MK0') fail(`${id} raw content must not be synced in MK0`);
  if (item.logging !== 'FORBIDDEN') fail(`${id} logging must be FORBIDDEN`);
}

for (const id of ['FIN-EVIDENCE', 'FIN-CANONICAL-EVENT', 'FIN-INSIGHT']) {
  const item = requireClass(id);
  if (!item) continue;
  if (item.cloudPlaintext !== 'FORBIDDEN') fail(`${id} cloud plaintext must be FORBIDDEN`);
  if (!item.e2eeSync.includes('ENCRYPTED')) fail(`${id} sync must be encrypted-only`);
  if (!item.localProtection.includes('ENCRYPTED')) fail(`${id} must be encrypted locally`);
}

const envelope = requireClass('CLOUD-E2EE-ENVELOPE');
if (envelope && envelope.cloudPlaintext !== 'CIPHERTEXT_AND_MINIMUM_ROUTING_METADATA_ONLY') {
  fail('cloud sync envelope must expose ciphertext + minimum routing metadata only');
}

const diagnostics = requireClass('DIAG-TELEMETRY');
if (diagnostics && diagnostics.logging !== 'ALLOWLIST_ONLY') {
  fail('diagnostic telemetry must use an allowlist-only logging policy');
}

if (failures.length > 0) {
  console.error('PRIVACY_MATRIX_FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('PRIVACY_MATRIX_PASS');
console.log(`classes=${classes.length}`);
console.log(`status=${matrix.status}`);
