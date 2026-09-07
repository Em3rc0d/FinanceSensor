import fs from 'node:fs';

const contract = JSON.parse(fs.readFileSync('mk0/04-architecture/PRIVACY-MEASUREMENT-CONTRACT.json', 'utf8'));
const campaign = JSON.parse(fs.readFileSync('graph/physical-closure-campaign.json', 'utf8'));
const wireframes = fs.readFileSync('mk0/06-wireframes/SIGNATURE-WIREFRAMES.md', 'utf8');
const normalizeText = value => String(value ?? '')
  .replace(/[│┌┐└┘├┤┬┴┼─]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const normalizedWireframes = normalizeText(wireframes);

const failures = [];
const fail = message => failures.push(message);
const asSet = values => new Set(Array.isArray(values) ? values : []);

if (contract.schemaVersion !== 1) fail('measurement contract schemaVersion must be 1');
if (contract.status !== 'ACCEPTED_FOR_PHYSICAL_VALIDATION') fail('measurement contract status mismatch');
if (contract.surface !== 'S-10_PRIVACY_INSPECTOR') fail('measurement contract must bind S-10 Privacy Inspector');
if (contract.defaultRule !== 'DO_NOT_DISPLAY_UNMEASURED_PRIVACY_CLAIMS') fail('privacy claims must fail closed when unmeasured');
if (contract.zeroClaimRule !== 'ZERO_REQUIRES_SCOPE_MATCHED_RUNTIME_OR_PHYSICAL_EVIDENCE') fail('zero claim rule mismatch');
if (contract.verificationClaimRule !== 'VERIFIED_REQUIRES_MATCHING_PHYSICAL_PASS_RECEIPT') fail('verification claim rule mismatch');

const claims = Array.isArray(contract.claims) ? contract.claims : [];
const byId = new Map();
for (const claim of claims) {
  if (!claim || typeof claim !== 'object') {
    fail('claim must be an object');
    continue;
  }
  if (typeof claim.id !== 'string' || byId.has(claim.id)) fail(`invalid or duplicate claim id ${claim.id}`);
  byId.set(claim.id, claim);
  const normalizedLabel = normalizeText(claim.uiLabel);
  if (!normalizedLabel || !normalizedWireframes.includes(normalizedLabel)) fail(`${claim.id} UI label is not bound to the S-10 wireframe text`);
  if (!['NON_NEGATIVE_INTEGER', 'VERIFICATION_STATE'].includes(claim.valueType)) fail(`${claim.id} has unsupported valueType`);
  if (typeof claim.measurementSource !== 'string' || claim.measurementSource.length === 0) fail(`${claim.id} missing measurementSource`);
  if (typeof claim.unmeasuredBehavior !== 'string') fail(`${claim.id} missing unmeasuredBehavior`);
}

const requiredMainClaims = new Set([
  'EMAILS_CHECKED',
  'FINANCIAL_EVIDENCE_CREATED',
  'CANONICAL_MOVEMENTS_RESOLVED',
  'RAW_EMAILS_RETAINED',
  'E2EE_SYNC_VERIFIED'
]);
if (byId.size !== requiredMainClaims.size) fail('Privacy Inspector main claim count changed without contract review');
for (const id of requiredMainClaims) if (!byId.has(id)) fail(`missing Privacy Inspector claim ${id}`);

for (const id of ['EMAILS_CHECKED', 'FINANCIAL_EVIDENCE_CREATED', 'CANONICAL_MOVEMENTS_RESOLVED']) {
  const claim = byId.get(id);
  if (!claim) continue;
  if (claim.physicalEvidenceRequired !== false) fail(`${id} should be runtime-measured rather than gated on physical inspection`);
  if (claim.zeroEvidence !== 'RUNTIME_COUNTER') fail(`${id} zero must come from a runtime counter`);
  if (claim.unmeasuredBehavior !== 'SHOW_UNKNOWN_NOT_ZERO') fail(`${id} must not turn missing measurement into zero`);
}

const phaseById = new Map((campaign.phases ?? []).map(phase => [phase.id, phase]));
for (const claim of claims.filter(item => item.physicalEvidenceRequired === true)) {
  const phase = phaseById.get(claim.requiredPhysicalPhase);
  if (!phase) {
    fail(`${claim.id} binds unknown physical phase ${claim.requiredPhysicalPhase}`);
    continue;
  }
  const phaseClaims = asSet(phase.requiredClaims);
  if (!Array.isArray(claim.requiredPhysicalClaims) || claim.requiredPhysicalClaims.length === 0) {
    fail(`${claim.id} must bind one or more physical claims`);
    continue;
  }
  for (const required of claim.requiredPhysicalClaims) {
    if (!phaseClaims.has(required)) fail(`${claim.id} requires ${required}, absent from ${claim.requiredPhysicalPhase}`);
  }
}

const retained = byId.get('RAW_EMAILS_RETAINED');
if (retained) {
  if (retained.requiredPhysicalPhase !== 'P3') fail('RAW_EMAILS_RETAINED must bind P3 physical storage inspection');
  if (!asSet(retained.requiredPhysicalClaims).has('RAW_GMAIL_CONTENT_NOT_DURABLE')) fail('RAW_EMAILS_RETAINED missing raw Gmail durability gate');
  if (retained.unmeasuredBehavior !== 'DO_NOT_DISPLAY_ZERO') fail('Correos guardados=0 must remain hidden until physical evidence exists');
}

const e2ee = byId.get('E2EE_SYNC_VERIFIED');
if (e2ee) {
  if (e2ee.requiredPhysicalPhase !== 'P4') fail('E2EE verified badge must bind P4 mobile crypto interop');
  if (e2ee.verifiedDisplay !== 'CHECKMARK') fail('E2EE verified display contract mismatch');
  if (e2ee.unmeasuredBehavior !== 'DO_NOT_DISPLAY_VERIFIED') fail('E2EE must not show verified before physical pass');
}

const details = new Map((contract.detailClaims ?? []).map(item => [item.id, item]));
for (const id of [
  'FULL_MESSAGES_FETCHED',
  'RAW_BODIES_RETAINED',
  'RAW_ATTACHMENTS_RETAINED',
  'PLAINTEXT_FINANCIAL_CLOUD_BYTES',
  'REQUESTS_TOTAL',
  'DELETION_PHASE_STATUS'
]) {
  if (!details.has(id)) fail(`missing Privacy Inspector detail claim ${id}`);
}

for (const id of ['RAW_BODIES_RETAINED', 'RAW_ATTACHMENTS_RETAINED', 'PLAINTEXT_FINANCIAL_CLOUD_BYTES']) {
  const claim = details.get(id);
  if (claim?.zeroRequiresPhase !== 'P3') fail(`${id} zero claim must bind P3`);
  const phaseClaims = asSet(phaseById.get('P3')?.requiredClaims);
  if (claim?.zeroRequires && !phaseClaims.has(claim.zeroRequires)) fail(`${id} zeroRequires is absent from P3 requiredClaims`);
}

const forbidden = asSet(contract.forbiddenDerivations);
for (const rule of [
  'ARCHITECTURE_ASSERTION_AS_ZERO_EVIDENCE',
  'CI_PASS_AS_PHYSICAL_ZERO_EVIDENCE',
  'SYNTHETIC_FIXTURE_AS_REAL_PRIVACY_MEASUREMENT',
  'MAILBOX_SIZE_AS_EMAILS_CHECKED',
  'ENCRYPTION_DESIGN_AS_E2EE_VERIFIED',
  'MISSING_COUNTER_AS_ZERO',
  'MISSING_STORAGE_SAMPLE_AS_ZERO',
  'MISSING_NETWORK_SAMPLE_AS_ZERO'
]) {
  if (!forbidden.has(rule)) fail(`missing forbidden privacy derivation ${rule}`);
}

if (!normalizedWireframes.includes(normalizeText('Every number on this screen must be technically measurable. No privacy theater.'))) {
  fail('S-10 no-privacy-theater invariant missing from signature wireframes');
}

if (failures.length) {
  console.error('FINANCESENSOR_PRIVACY_MEASUREMENT_CONTRACT=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_PRIVACY_MEASUREMENT_CONTRACT=PASS');
console.log(`MAIN_CLAIMS=${claims.length}`);
console.log(`DETAIL_CLAIMS=${details.size}`);
console.log('WIREFRAME_LAYOUT_GLYPHS_NORMALIZED=PASS');
console.log('UNMEASURED_ZERO_PROMOTION=FORBIDDEN');
console.log('UNMEASURED_E2EE_VERIFIED_PROMOTION=FORBIDDEN');
console.log('PHYSICAL_PRIVACY_PASS_CLAIMED_BY_CI=0');
