import crypto from 'node:crypto';
import fs from 'node:fs';

const campaign = JSON.parse(fs.readFileSync('graph/physical-closure-campaign.json', 'utf8'));
const binding = JSON.parse(fs.readFileSync('graph/physical-receipts/P0-2026-09-03.json', 'utf8'));
const receiptPath = 'mk0/10-evidence/EV-PHYSICAL-CAMPAIGN-P0-HARNESS-SANITIZATION-2026-09-03.md';
const receipt = fs.readFileSync(receiptPath, 'utf8');

const failures = [];
const fail = message => failures.push(message);
const asSet = values => new Set(Array.isArray(values) ? values : []);
const sameSet = (a, b) => a.size === b.size && [...a].every(value => b.has(value));

function gitBlobSha(content) {
  const bytes = Buffer.from(content, 'utf8');
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([header, bytes])).digest('hex');
}

function verifyBoundSource(source, expectedRole) {
  if (!source?.path || !source?.blobSha || source.role !== expectedRole) {
    fail(`invalid bound source for role ${expectedRole}`);
    return null;
  }
  if (!fs.existsSync(source.path)) {
    fail(`bound source missing: ${source.path}`);
    return null;
  }
  const text = fs.readFileSync(source.path, 'utf8');
  const actualSha = gitBlobSha(text);
  if (actualSha !== source.blobSha) {
    fail(`immutable blob binding mismatch for ${source.path}: expected ${source.blobSha}, found ${actualSha}`);
  }
  return text;
}

if (binding.schemaVersion !== 1) fail('P0 binding schemaVersion must be 1');
if (binding.phase !== 'P0') fail('P0 binding phase mismatch');
if (binding.status !== 'PASS') fail('P0 binding must declare PASS');
if (binding.observedAtDay !== '2026-09-03') fail('P0 binding observedAtDay mismatch');
if (binding.sourceBaselineCommit !== 'dcc5514aa503a32b6449e24e9ab0080b7692db33') fail('P0 source baseline commit mismatch');
if (binding.evidenceMode !== 'COMPOSITE_PHYSICAL_RECEIPTS_PLUS_ADVERSARIAL_ALLOWLIST') fail('P0 evidence mode mismatch');
if (binding.receipt?.path !== receiptPath) fail('P0 binding receipt path mismatch');
const actualReceiptSha = gitBlobSha(receipt);
if (binding.receipt?.blobSha !== actualReceiptSha) {
  fail(`P0 receipt blob binding mismatch: expected ${binding.receipt?.blobSha}, found ${actualReceiptSha}`);
}

const p0 = (campaign.phases ?? []).find(phase => phase.id === 'P0');
if (!p0) fail('physical campaign missing P0');
else {
  if (p0.status !== 'PASS') fail(`P0 campaign status must be PASS, found ${p0.status}`);
  if (p0.physicalReceiptRequiredForPass !== true) fail('P0 must require physical receipt for PASS');
  if (p0.passReceipt?.path !== receiptPath) fail('P0 passReceipt path mismatch');
  if (p0.passReceipt?.binding !== 'graph/physical-receipts/P0-2026-09-03.json') fail('P0 passReceipt binding mismatch');
  if (p0.passReceipt?.evidenceOrigin !== 'BOUND_EXISTING_PHYSICAL_RECEIPTS') fail('P0 passReceipt evidence origin mismatch');
}

const expectedClaims = asSet(p0?.requiredClaims);
const boundClaims = asSet(binding.requiredClaims);
if (!sameSet(expectedClaims, boundClaims)) fail('P0 binding requiredClaims must exactly equal campaign P0 requiredClaims');
if (boundClaims.size !== 6) fail(`P0 must bind exactly 6 required claims, found ${boundClaims.size}`);

const physicalSources = binding.physicalSources ?? [];
if (physicalSources.length !== 3) fail('P0 must bind exactly three existing owned-device physical receipts');
const physicalTexts = physicalSources.map(source => verifyBoundSource(source, 'REAL_OWNED_DEVICE_SANITIZED_RECEIPT'));

const r1 = physicalTexts.find(text => text?.includes('PHYSICAL_ANDROID / USER-OBSERVED / SANITIZED_PUBLIC_RECEIPT'));
if (!r1) fail('P0 missing R1 physical sanitized receipt evidence');
else {
  for (const marker of [
    'RAW_SCREENSHOTS         NOT COMMITTED',
    'ACCOUNT_IDENTITY        NOT RECORDED',
    'REAL_GMAIL_CONTENT      NOT RECORDED',
    'TOKEN_MATERIAL          NOT RECORDED',
    'EXACT VALUE REDACTED'
  ]) {
    if (!r1.includes(marker)) fail(`R1 P0 evidence missing marker: ${marker}`);
  }
}

const r2Disconnect = physicalTexts.find(text => text?.includes('Android R2 local disconnect PASS'));
if (!r2Disconnect) fail('P0 missing R2 disconnect physical receipt evidence');
else {
  for (const fragment of [
    '## Sanitization boundary',
    'no screenshots, account identity, access token, Gmail message content, history identifier value, provider response body, private signing material or financial plaintext'
  ]) {
    if (!r2Disconnect.includes(fragment)) fail('R2 disconnect P0 evidence missing sanitization fragment');
  }
}

const r2Stable = physicalTexts.find(text => text?.includes('Android R2 stable local lifecycle PASS'));
if (!r2Stable) fail('P0 missing R2 stable lifecycle physical receipt evidence');
else {
  for (const fragment of [
    '## Sanitization boundary',
    'no screenshots, account identity, access token, Gmail content, provider response body, history identifier value, signing private key, keystore password or financial plaintext'
  ]) {
    if (!r2Stable.includes(fragment)) fail('R2 stable P0 evidence missing sanitization fragment');
  }
}

const staticSources = binding.staticGuardSources ?? [];
if (staticSources.length !== 2) fail('P0 must bind sanitizer implementation + adversarial guard');
const sanitizerSource = staticSources.find(source => source.role === 'ALLOWLIST_SANITIZER_IMPLEMENTATION');
const adversarialSource = staticSources.find(source => source.role === 'ADVERSARIAL_ALLOWLIST_GUARD');
const sanitizer = sanitizerSource ? verifyBoundSource(sanitizerSource, 'ALLOWLIST_SANITIZER_IMPLEMENTATION') : null;
const adversarial = adversarialSource ? verifyBoundSource(adversarialSource, 'ADVERSARIAL_ALLOWLIST_GUARD') : null;

if (sanitizer) {
  for (const marker of [
    'sanitizePhysicalEvidence',
    'assertSanitizedPhysicalEvidence',
    'endpointMetrics',
    'passFacts',
    'residualRiskCodes',
    'sanitized evidence contains a forbidden secret/content pattern'
  ]) {
    if (!sanitizer.includes(marker)) fail(`sanitizer source missing required marker ${marker}`);
  }
}
if (adversarial) {
  for (const marker of [
    'RAW_UNKNOWN_FIELDS_COPIED=0',
    'SECRET_LITERAL_LEAKS_IN_SYNTHETIC_ATTACK=0',
    'ENDPOINT_URLS_IN_OUTPUT=0',
    'REAL_PHYSICAL_EVIDENCE=NOT_CLAIMED_BY_SYNTHETIC_TEST'
  ]) {
    if (!adversarial.includes(marker)) fail(`adversarial sanitizer guard missing marker ${marker}`);
  }
}

for (const claim of expectedClaims) {
  const evidenceRoles = binding.claimEvidence?.[claim];
  if (!Array.isArray(evidenceRoles) || evidenceRoles.length === 0) fail(`P0 claim ${claim} has no bound evidence role`);
}

const assertions = binding.assertions ?? {};
for (const key of [
  'rawEvidenceRemainsLocal',
  'realAccountIdentityNotRecorded',
  'realGmailContentNotRecorded',
  'tokenMaterialNotRecorded',
  'privateSigningMaterialNotRecorded',
  'providerResponseBodiesNotCommitted',
  'unnecessaryExactHistoryAndCountValuesRedactedOrNotRecorded'
]) {
  if (assertions[key] !== true) fail(`P0 assertion ${key} must be true`);
}

const residual = asSet(binding.residualRiskCodes);
for (const risk of [
  'P0_VALIDATES_PUBLICATION_BOUNDARY_NOT_RAW_LOCAL_CAPTURE_ABSENCE',
  'P0_DOES_NOT_PROVE_P1_P7_PRODUCT_PROPERTIES'
]) {
  if (!residual.has(risk)) fail(`P0 residual risk missing: ${risk}`);
}

for (const marker of [
  '**Status:** PASS',
  '**Evidence class:** COMPOSITE PHYSICAL RECEIPTS + ADVERSARIAL ALLOWLIST',
  'P0_VALIDATES_PUBLICATION_BOUNDARY_NOT_RAW_LOCAL_CAPTURE_ABSENCE',
  'P0 PASS != Q-003 CLOSED',
  'P0 PASS != Q-004 CLOSED',
  'P0 PASS != Q-005 CLOSED',
  'BUILD_READY                              NO'
]) {
  if (!receipt.includes(marker)) fail(`P0 Markdown receipt missing governing marker: ${marker}`);
}

if (failures.length) {
  console.error('FINANCESENSOR_P0_PHYSICAL_RECEIPT=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_P0_PHYSICAL_RECEIPT=PASS');
console.log('P0_REQUIRED_CLAIMS=6');
console.log('PHYSICAL_SOURCE_RECEIPTS=3');
console.log('STATIC_GUARD_SOURCES=2');
console.log('SOURCE_BLOB_BINDINGS=PASS');
console.log('RECEIPT_BLOB_BINDING=PASS');
console.log('P0_EVIDENCE_ORIGIN=BOUND_EXISTING_PHYSICAL_RECEIPTS');
console.log('RAW_PHYSICAL_EVIDENCE_IN_GITHUB=0');
console.log('P0_DOES_NOT_CLOSE_Q003_Q004_Q005=PASS');
