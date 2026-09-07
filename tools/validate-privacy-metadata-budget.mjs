import fs from 'node:fs';

const paths = [
  'mk0/04-architecture/PRIVACY-DATA-MATRIX.json',
  'mk0/04-architecture/PRIVACY-RECOVERY-MATRIX.json',
  'mk0/04-architecture/PRIVACY-DELETION-MATRIX.json'
];
const matrices = paths.map(path => JSON.parse(fs.readFileSync(path, 'utf8')));
const budget = JSON.parse(fs.readFileSync('mk0/04-architecture/PRIVACY-METADATA-BUDGET.json', 'utf8'));
const campaign = JSON.parse(fs.readFileSync('graph/physical-closure-campaign.json', 'utf8'));

const failures = [];
const fail = message => failures.push(message);
const eqSet = (a, b) => a.size === b.size && [...a].every(value => b.has(value));

if (budget.schemaVersion !== 1) fail('metadata budget schemaVersion must be 1');
if (budget.status !== 'ACCEPTED_FOR_PHYSICAL_VALIDATION') fail('metadata budget status mismatch');
if (budget.defaultRule !== 'DENY_UNLISTED_CLOUD_VISIBLE_DATA_CLASS') fail('metadata budget must deny unlisted visible classes');

const all = new Map();
for (const matrix of matrices) {
  for (const item of matrix.classes ?? []) {
    if (!item?.id || all.has(item.id)) fail(`duplicate or invalid privacy class ${item?.id}`);
    all.set(item.id, item);
  }
}

if (all.size !== 25) fail(`privacy inventory expected 25 classes, found ${all.size}`);

const expectedVisible = new Set();
const expectedForbidden = new Set();
for (const item of all.values()) {
  const rule = String(item.cloudPlaintext ?? '');
  if (rule.startsWith('FORBIDDEN')) expectedForbidden.add(item.id);
  else expectedVisible.add(item.id);
}

const budgetVisible = new Set(budget.cloudVisibleClassIds ?? []);
const budgetForbidden = new Set(budget.cloudForbiddenClassIds ?? []);
if (!eqSet(expectedVisible, budgetVisible)) {
  fail(`cloudVisibleClassIds must exactly match privacy matrices; expected ${[...expectedVisible].sort().join(',')}`);
}
if (!eqSet(expectedForbidden, budgetForbidden)) {
  fail(`cloudForbiddenClassIds must exactly match privacy matrices; expected ${[...expectedForbidden].sort().join(',')}`);
}
if (budgetVisible.size + budgetForbidden.size !== all.size) fail('visible + forbidden classes must exhaust privacy inventory');
for (const id of budgetVisible) if (budgetForbidden.has(id)) fail(`${id} cannot be both visible and forbidden`);

const surfaces = Array.isArray(budget.surfaces) ? budget.surfaces : [];
const surfaceById = new Map();
const surfaceUnion = new Set();
for (const surface of surfaces) {
  if (!surface?.id || surfaceById.has(surface.id)) fail(`duplicate or invalid surface ${surface?.id}`);
  surfaceById.set(surface.id, surface);
  if (!Array.isArray(surface.allowedClassIds) || surface.allowedClassIds.length === 0) fail(`${surface.id} must allow at least one class`);
  if (!Array.isArray(surface.forbiddenSemantics) || surface.forbiddenSemantics.length === 0) fail(`${surface.id} must define forbiddenSemantics`);
  for (const id of surface.allowedClassIds ?? []) {
    surfaceUnion.add(id);
    if (!all.has(id)) fail(`${surface.id} references unknown class ${id}`);
    if (!budgetVisible.has(id)) fail(`${surface.id} exposes cloud-forbidden class ${id}`);
  }
}

for (const required of ['CONTROL_PLANE', 'E2EE_RELAY', 'INDEPENDENT_WITNESS', 'TELEMETRY']) {
  if (!surfaceById.has(required)) fail(`missing metadata surface ${required}`);
}
if (!eqSet(surfaceUnion, budgetVisible)) fail('every cloud-visible class must be assigned to at least one explicit surface');

const witness = new Set(surfaceById.get('INDEPENDENT_WITNESS')?.allowedClassIds ?? []);
if (!eqSet(witness, new Set(['WITNESS-CHECKPOINT-METADATA']))) fail('witness surface must expose only opaque witness checkpoint metadata');
for (const semantic of ['REAL_TENANT_ID', 'CROSS_WITNESS_IDENTIFIER', 'FINANCIAL_PLAINTEXT', 'FINANCIAL_CIPHERTEXT', 'GMAIL_CONTENT']) {
  if (!(surfaceById.get('INDEPENDENT_WITNESS')?.forbiddenSemantics ?? []).includes(semantic)) fail(`witness missing forbidden semantic ${semantic}`);
}

const telemetry = new Set(surfaceById.get('TELEMETRY')?.allowedClassIds ?? []);
if (!eqSet(telemetry, new Set(['DIAG-TELEMETRY']))) fail('telemetry surface must expose only DIAG-TELEMETRY');

const relay = new Set(surfaceById.get('E2EE_RELAY')?.allowedClassIds ?? []);
if (!eqSet(relay, new Set(['TENANT-KEY-WRAP', 'CLOUD-E2EE-ENVELOPE', 'RECOVERY-EPOCH-WRAP']))) {
  fail('E2EE relay visible-class budget changed without explicit review');
}

for (const id of [
  'AUTH-OAUTH-TOKEN',
  'MAIL-MESSAGE-ID',
  'MAIL-HISTORY-CURSOR',
  'MAIL-SUBJECT',
  'MAIL-BODY',
  'MAIL-ATTACHMENT',
  'FIN-EVIDENCE',
  'FIN-CANONICAL-EVENT',
  'FIN-INSIGHT',
  'TENANT-ROOT-KEY',
  'RECOVERY-PRIVATE-KEY',
  'DEVICE-PRIVATE-KEY'
]) {
  if (!budgetForbidden.has(id)) fail(`${id} must remain cloud-forbidden`);
}

const measurement = budget.physicalMeasurement ?? {};
if (measurement.phase !== 'P3') fail('metadata leakage measurement must bind P3');
if (measurement.requiredClaim !== 'FORBIDDEN_PLAINTEXT_ABSENT_FROM_NORMAL_CLOUD_PATH') fail('metadata leakage physical claim mismatch');
if (measurement.unclassifiedObservedField !== 'FAIL') fail('unclassified observed fields must fail closed');
const p3 = (campaign.phases ?? []).find(phase => phase.id === 'P3');
if (!p3) fail('physical campaign missing P3');
else if (!(p3.requiredClaims ?? []).includes(measurement.requiredClaim)) fail('metadata budget physical claim absent from P3 requiredClaims');

for (const observation of [
  'CLASSIFY_EACH_OBSERVED_CLOUD_PAYLOAD',
  'ACCOUNT_REQUEST_BYTES_BY_SURFACE',
  'ACCOUNT_RESPONSE_BYTES_BY_SURFACE',
  'REJECT_UNCLASSIFIED_VISIBLE_FIELD',
  'VERIFY_WITNESS_PSEUDONYMIZATION',
  'VERIFY_TELEMETRY_ALLOWLIST'
]) {
  if (!(measurement.requiredObservations ?? []).includes(observation)) fail(`missing metadata physical observation ${observation}`);
}

if (failures.length) {
  console.error('FINANCESENSOR_PRIVACY_METADATA_BUDGET=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_PRIVACY_METADATA_BUDGET=PASS');
console.log(`PRIVACY_CLASSES=${all.size}`);
console.log(`CLOUD_VISIBLE_CLASSES=${budgetVisible.size}`);
console.log(`CLOUD_FORBIDDEN_CLASSES=${budgetForbidden.size}`);
console.log(`METADATA_SURFACES=${surfaces.length}`);
console.log('UNCLASSIFIED_OBSERVED_FIELD=FAIL');
console.log('PHYSICAL_NETWORK_PRIVACY_PASS_CLAIMED_BY_CI=0');
