import assert from 'node:assert/strict';
import { sanitizePhysicalEvidence, assertSanitizedPhysicalEvidence } from './physical-evidence-sanitizer.mjs';

const syntheticRefreshToken = ['1', '//', 'abcdefghijklmnopqrstuvwxyz1234567890'].join('');
const syntheticPrivateKey = ['-----BEGIN ', 'PRIVATE KEY-----\nsecret\n-----END ', 'PRIVATE KEY-----'].join('');

const raw = {
  campaignPhase: 'P1',
  receiptType: 'Q003_PRODUCTION_LIFECYCLE',
  observedAtDay: '2026-09-02',
  platformClass: 'LOCAL_EDGE',
  appBuild: 'mk0-dev.1',
  harnessVersion: 'level-c-v8',
  result: 'PASS',
  counters: {
    REQUESTS_TOTAL: 7,
    FULL_MESSAGES_FETCHED: 1
  },
  endpointMetrics: [
    { endpointClass: 'OAUTH_TOKEN', requestBodyBytes: 212, responseBytes: 481, elapsedMs: 142.5 },
    { endpointClass: 'GMAIL_PROFILE', requestBodyBytes: 0, responseBytes: 128, elapsedMs: 83.1 }
  ],
  passFacts: [
    'SUCCESSFUL_REFRESH_BEFORE_REVOKE',
    'PROVIDER_REVOKE_ACCEPTED',
    'OLD_REFRESH_AUTHORITY_DENIED'
  ],
  residualRiskCodes: ['PROVIDER_POLICY_REVIEW_OPEN'],

  // Deliberately toxic raw-only fields. They must never cross the allowlist.
  email: 'real.person@example.com',
  subject: 'real financial subject',
  body: 'real financial body',
  message_id: 'real-message-id',
  access_token: 'Bearer secret-access-token-value',
  refresh_token: syntheticRefreshToken,
  client_secret: 'desktop-client-secret-value',
  authorization_code: 'authorization-code-value',
  code_verifier: 'pkce-verifier-value',
  privateKey: syntheticPrivateKey
};

const sanitized = sanitizePhysicalEvidence(raw);
const text = JSON.stringify(sanitized);

for (const forbiddenLiteral of [
  raw.email,
  raw.subject,
  raw.body,
  raw.message_id,
  raw.access_token,
  raw.refresh_token,
  raw.client_secret,
  raw.authorization_code,
  raw.code_verifier,
  raw.privateKey
]) {
  assert.equal(text.includes(forbiddenLiteral), false, 'raw sensitive literal crossed the allowlist');
}

assert.deepEqual(Object.keys(sanitized).sort(), [
  'appBuild',
  'campaignPhase',
  'counters',
  'endpointMetrics',
  'harnessVersion',
  'observedAtDay',
  'passFacts',
  'platformClass',
  'receiptType',
  'residualRiskCodes',
  'result',
  'schemaVersion'
].sort());

assert.equal(sanitized.endpointMetrics[0].endpointClass, 'OAUTH_TOKEN');
assert.equal(sanitized.endpointMetrics[0].requestBodyBytes, 212);
assert.equal(sanitized.endpointMetrics[1].endpointClass, 'GMAIL_PROFILE');
assert.equal(sanitized.counters.REQUESTS_TOTAL, 7);

assert.throws(() => sanitizePhysicalEvidence({
  ...raw,
  passFacts: ['EMAIL_real.person@example.com']
}), /enum-style token/);

assert.throws(() => sanitizePhysicalEvidence({
  ...raw,
  endpointMetrics: [{
    endpointClass: 'https://gmail.googleapis.com/gmail/v1/users/me/profile?token=secret',
    requestBodyBytes: 0,
    responseBytes: 1,
    elapsedMs: 1
  }]
}), /allowed value/);

assert.throws(() => sanitizePhysicalEvidence({
  ...raw,
  appBuild: 'build with spaces and raw subject'
}), /unsupported characters/);

assert.throws(() => assertSanitizedPhysicalEvidence({
  schemaVersion: 1,
  note: 'real.person@example.com'
}), /forbidden secret\/content pattern/);

console.log('FINANCESENSOR_PHYSICAL_EVIDENCE_SANITIZER=PASS');
console.log('RAW_UNKNOWN_FIELDS_COPIED=0');
console.log('SECRET_LITERAL_LEAKS_IN_SYNTHETIC_ATTACK=0');
console.log('ENDPOINT_URLS_IN_OUTPUT=0');
console.log('REAL_PHYSICAL_EVIDENCE=NOT_CLAIMED_BY_SYNTHETIC_TEST');
