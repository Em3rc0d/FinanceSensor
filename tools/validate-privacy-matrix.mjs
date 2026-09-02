import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const basePath = path.join(root, 'mk0', '04-architecture', 'PRIVACY-DATA-MATRIX.json');
const recoveryPath = path.join(root, 'mk0', '04-architecture', 'PRIVACY-RECOVERY-MATRIX.json');
const deletionPath = path.join(root, 'mk0', '04-architecture', 'PRIVACY-DELETION-MATRIX.json');
const requiredFields = [
  'id', 'name', 'sensitivity', 'purpose', 'source', 'localRetention',
  'localProtection', 'cloudPlaintext', 'e2eeSync', 'rawRetention',
  'deletionTrigger', 'humanAccess', 'logging'
];

const failures = [];
const fail = message => failures.push(message);

for (const requiredPath of [basePath, recoveryPath, deletionPath]) {
  if (!fs.existsSync(requiredPath)) {
    console.error(`PRIVACY_MATRIX_FAIL: missing ${path.relative(root, requiredPath)}`);
    process.exit(1);
  }
}

const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
const recovery = JSON.parse(fs.readFileSync(recoveryPath, 'utf8'));
const deletion = JSON.parse(fs.readFileSync(deletionPath, 'utf8'));

if (base.defaultRule !== 'deny-unclassified-persistence') {
  fail('defaultRule must be deny-unclassified-persistence');
}
for (const [name, extension] of [['recovery', recovery], ['deletion', deletion]]) {
  if (extension.extends !== 'PRIVACY-DATA-MATRIX.json') {
    fail(`${name} matrix must explicitly extend PRIVACY-DATA-MATRIX.json`);
  }
  if (extension.schemaVersion !== base.schemaVersion) {
    fail(`${name} matrix schemaVersion must match base matrix`);
  }
}

const classes = [
  ...(Array.isArray(base.classes) ? base.classes : []),
  ...(Array.isArray(recovery.classes) ? recovery.classes : []),
  ...(Array.isArray(deletion.classes) ? deletion.classes : [])
];
const byId = new Map();

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

const requireClass = id => {
  const item = byId.get(id);
  if (!item) fail(`required privacy class ${id} missing`);
  return item;
};

const token = requireClass('AUTH-OAUTH-TOKEN');
if (token) {
  if (token.cloudPlaintext !== 'FORBIDDEN') fail('OAuth token cloud plaintext must be FORBIDDEN');
  if (token.logging !== 'FORBIDDEN') fail('OAuth token logging must be FORBIDDEN');
}

for (const id of ['DEVICE-PRIVATE-KEY', 'TENANT-ROOT-KEY']) {
  const item = requireClass(id);
  if (!item) continue;
  if (item.cloudPlaintext !== 'FORBIDDEN') fail(`${id} cloud plaintext must be FORBIDDEN`);
  if (item.logging !== 'FORBIDDEN') fail(`${id} logging must be FORBIDDEN`);
  if (!item.localProtection.includes('PROTECTED') && !item.localProtection.includes('ENCRYPTED')) {
    fail(`${id} must require protected/encrypted local key storage`);
  }
}

const publicKey = requireClass('DEVICE-PUBLIC-KEY');
if (publicKey && publicKey.cloudPlaintext !== 'ALLOWED_MINIMIZED') {
  fail('device public-key metadata may be cloud-visible only in minimized form');
}

const keyWrap = requireClass('TENANT-KEY-WRAP');
if (keyWrap) {
  if (keyWrap.cloudPlaintext !== 'WRAPPED_KEY_CIPHERTEXT_AND_MINIMUM_CONTEXT_ONLY') {
    fail('tenant key wrap may expose wrapped ciphertext + minimum context only');
  }
  if (!keyWrap.localProtection.includes('CIPHERTEXT')) fail('tenant key wrap must remain ciphertext');
  if (keyWrap.logging !== 'NO_KEY_MATERIAL') fail('tenant key wrap logging must exclude key material');
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

const checkpoint = requireClass('SYNC-CHECKPOINT');
if (checkpoint) {
  if (!checkpoint.localProtection.includes('ENCRYPTED')) fail('sync checkpoint must be encrypted locally');
  if (checkpoint.cloudPlaintext !== 'FORBIDDEN_MK0_DEVICE_CHECKPOINT') {
    fail('device sync checkpoint cloud plaintext must remain forbidden in MK0');
  }
}

const keyEpoch = requireClass('KEY-EPOCH-METADATA');
if (keyEpoch && keyEpoch.cloudPlaintext !== 'ALLOWED_MINIMIZED') {
  fail('key epoch metadata must remain minimized');
}

const witness = requireClass('WITNESS-CHECKPOINT-METADATA');
if (witness) {
  if (!witness.cloudPlaintext.includes('OPAQUE_PSEUDONYMOUS_CHECKPOINT_METADATA_ONLY')) {
    fail('witness checkpoint visibility must be limited to opaque pseudonymous checkpoint metadata');
  }
  if (!witness.cloudPlaintext.includes('NO_REAL_TENANT_ID')) {
    fail('witness checkpoint metadata must not expose the real tenant id');
  }
  if (!witness.cloudPlaintext.includes('NO_FINANCIAL_CONTENT')) {
    fail('witness checkpoint metadata must not expose financial content');
  }
  if (!witness.logging.includes('NO_CROSS_WITNESS_IDENTIFIER')) {
    fail('witness logging must not create a stable cross-witness identifier');
  }
  if (!witness.logging.includes('NO_FINANCIAL_CONTENT')) {
    fail('witness logging must exclude financial content');
  }
}

const diagnostics = requireClass('DIAG-TELEMETRY');
if (diagnostics && diagnostics.logging !== 'ALLOWLIST_ONLY') {
  fail('diagnostic telemetry must use an allowlist-only logging policy');
}

const deletionTombstone = requireClass('DELETION-TOMBSTONE');
if (deletionTombstone) {
  if (deletionTombstone.cloudPlaintext !== 'ALLOWED_MINIMIZED') {
    fail('deletion tombstone cloud visibility must be ALLOWED_MINIMIZED');
  }
  if (deletionTombstone.e2eeSync !== 'NOT_REQUIRED') {
    fail('deletion tombstone must not depend on E2EE sync');
  }
  if (!deletionTombstone.purpose.toUpperCase().includes('RESURRECT')) {
    fail('deletion tombstone purpose must explicitly bind the resurrection barrier');
  }
  if (!deletionTombstone.localRetention.includes('BOUNDED')) {
    fail('deletion tombstone retention must be bounded');
  }
  if (!deletionTombstone.deletionTrigger.includes('BACKUP_RETENTION')) {
    fail('deletion tombstone deletion trigger must bind backup retention');
  }
  if (deletionTombstone.logging !== 'MINIMIZED') {
    fail('deletion tombstone logging must be MINIMIZED');
  }
}

const recoveryPrivate = requireClass('RECOVERY-PRIVATE-KEY');
if (recoveryPrivate) {
  if (recoveryPrivate.cloudPlaintext !== 'FORBIDDEN') fail('Recovery Private Key cloud plaintext must be FORBIDDEN');
  if (recoveryPrivate.e2eeSync !== 'FORBIDDEN') fail('Recovery Private Key must never be synchronized');
  if (recoveryPrivate.logging !== 'FORBIDDEN') fail('Recovery Private Key logging must be FORBIDDEN');
  if (!recoveryPrivate.localRetention.includes('USER_HELD_OFFLINE')) {
    fail('Recovery Private Key must be user-held offline after export');
  }
}

const recoveryPublic = requireClass('RECOVERY-PUBLIC-KEY');
if (recoveryPublic) {
  if (recoveryPublic.cloudPlaintext !== 'ALLOWED_MINIMIZED') {
    fail('Recovery Public Key may be cloud-visible only in minimized form');
  }
}

const recoveryWrap = requireClass('RECOVERY-EPOCH-WRAP');
if (recoveryWrap) {
  if (recoveryWrap.cloudPlaintext !== 'WRAPPED_KEY_CIPHERTEXT_AND_MINIMUM_CONTEXT_ONLY') {
    fail('Recovery epoch wrap may expose ciphertext + minimum context only');
  }
  if (!recoveryWrap.localProtection.includes('CIPHERTEXT')) fail('Recovery epoch wrap must remain ciphertext');
  if (recoveryWrap.logging !== 'NO_KEY_MATERIAL') fail('Recovery epoch wrap logging must exclude key material');
}

const trustedCheckpoint = requireClass('TRUSTED-CHECKPOINT-METADATA');
if (trustedCheckpoint) {
  if (!trustedCheckpoint.localProtection.includes('OUTSIDE_RELAY_ONLY_TRUST_DOMAIN')) {
    fail('trusted checkpoint authoritative anchor must exist outside the relay-only trust domain');
  }
  if (!trustedCheckpoint.cloudPlaintext.includes('SIGNED_SECURITY_METADATA_ONLY')) {
    fail('trusted checkpoint cloud plaintext must be minimized signed security metadata only');
  }
  if (!trustedCheckpoint.cloudPlaintext.includes('NOT_SOLE_TRUSTED_ANCHOR')) {
    fail('cloud checkpoint copy must not be the sole trusted anchor');
  }
  if (!trustedCheckpoint.logging.includes('NO_FINANCIAL_CONTENT')) {
    fail('trusted checkpoint logging must exclude financial content');
  }
  if (!trustedCheckpoint.logging.includes('NO_FULL_ORIGIN_HEAD_DUMP')) {
    fail('trusted checkpoint logging must exclude full origin-head dumps');
  }
}

if (failures.length > 0) {
  console.error('PRIVACY_MATRIX_FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('PRIVACY_MATRIX_PASS');
console.log(`classes=${classes.length}`);
console.log(`baseClasses=${base.classes.length}`);
console.log(`recoveryClasses=${recovery.classes.length}`);
console.log(`deletionClasses=${deletion.classes.length}`);
console.log(`baseStatus=${base.status}`);
console.log(`recoveryStatus=${recovery.status}`);
console.log(`deletionStatus=${deletion.status}`);
