import fs from 'node:fs';
import { sanitizePhysicalEvidence } from './physical-evidence-sanitizer.mjs';

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const REQUIRED_CLAIMS = [
  'SUCCESSFUL_REFRESH_BEFORE_REVOKE',
  'MINIMUM_SCOPE_REFRESH',
  'REQUEST_BYTES_ACCOUNTED',
  'RESPONSE_BYTES_ACCOUNTED',
  'PER_ENDPOINT_LATENCY_RECORDED',
  'PROVIDER_REVOKE_ACCEPTED',
  'OLD_REFRESH_AUTHORITY_DENIED',
  'NO_REAL_GMAIL_CONTENT_IN_RESULT'
];
const REQUIRED_ENDPOINTS = [
  'tokenExchange',
  'tokenRefresh',
  'revoke',
  'profile',
  'list',
  'metadata',
  'full',
  'history'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function finiteNonNegative(value, label) {
  assert(Number.isFinite(value) && value >= 0, `${label} must be finite and non-negative`);
  return value;
}

function endpoint(raw, name) {
  const value = raw.network?.endpointClasses?.[name];
  assert(value && typeof value === 'object' && !Array.isArray(value), `missing endpoint metrics: ${name}`);
  assert(Number.isInteger(value.count) && value.count >= 1, `${name}.count must be >= 1`);
  finiteNonNegative(value.requestBodyBytes, `${name}.requestBodyBytes`);
  finiteNonNegative(value.responseBodyBytes, `${name}.responseBodyBytes`);
  finiteNonNegative(value.totalLatencyMs, `${name}.totalLatencyMs`);
  finiteNonNegative(value.minLatencyMs, `${name}.minLatencyMs`);
  finiteNonNegative(value.maxLatencyMs, `${name}.maxLatencyMs`);
  assert(Number.isInteger(value.networkErrors) && value.networkErrors >= 0, `${name}.networkErrors must be non-negative integer`);
  return value;
}

function aggregateEndpoint(...items) {
  return {
    requestBodyBytes: items.reduce((sum, item) => sum + item.requestBodyBytes, 0),
    responseBytes: items.reduce((sum, item) => sum + item.responseBodyBytes, 0),
    elapsedMs: items.reduce((sum, item) => sum + item.totalLatencyMs, 0)
  };
}

function assertNoSensitiveResultLeak(raw) {
  const text = JSON.stringify(raw);
  const forbidden = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\bBearer\s+[A-Za-z0-9._~+\/-]+/i,
    /\b1\/\/[0-9A-Za-z._-]{20,}/,
    /"(?:access_token|refresh_token|client_secret|authorization_code|code_verifier|message_id|history_id|subject|body|snippet|email)"\s*:/i
  ];
  for (const pattern of forbidden) {
    assert(!pattern.test(text), 'raw P1 result contains a forbidden secret/content pattern');
  }
}

export function reduceP1Result(raw) {
  assert(raw && typeof raw === 'object' && !Array.isArray(raw), 'P1 raw result must be an object');
  assert(raw.schemaVersion === 1, 'P1 raw result schemaVersion must be 1');
  assert(raw.project === 'FinanceSensor', 'P1 raw result project mismatch');
  assert(raw.phase === 'P1', 'P1 raw result phase mismatch');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(raw.executionDay ?? ''), 'P1 executionDay must be YYYY-MM-DD');
  assert(raw.p1Pass === 'PASS', 'P1 raw result must explicitly report PASS');
  assert(raw.result === 'P1_PRODUCTION_LIFECYCLE_PASS', 'P1 raw result terminal state mismatch');

  const claimKeys = Object.keys(raw.claims ?? {}).sort();
  const requiredSorted = [...REQUIRED_CLAIMS].sort();
  assert(JSON.stringify(claimKeys) === JSON.stringify(requiredSorted), 'P1 raw result claim set drift');
  for (const claim of REQUIRED_CLAIMS) assert(raw.claims?.[claim] === 'PASS', `P1 claim not PASS: ${claim}`);

  assert(raw.scopeRequested === GMAIL_READONLY_SCOPE, 'requested scope is not exact gmail.readonly');
  assert(raw.scopeGranted === GMAIL_READONLY_SCOPE, 'granted scope is not exact gmail.readonly');
  assert(raw.scopeAfterRefresh === GMAIL_READONLY_SCOPE, 'refresh scope is not exact gmail.readonly');

  assert(raw.oauth?.successfulRefreshBeforeRevoke === 'PASS', 'pre-revoke refresh not proven');
  assert(raw.oauth?.refreshedBearerGmailUse === 'PASS', 'refreshed bearer Gmail use not proven');
  assert(raw.revocation?.revokeHttpStatus === 200, 'provider revoke must be HTTP 200');
  assert(raw.revocation?.providerAcceptedRevoke === 'PASS', 'provider revoke acceptance not proven');
  assert(raw.revocation?.refreshAuthorityAfterRevoke === 'DENIED', 'old refresh authority not denied');
  assert(raw.revocation?.denialSemantic === 'HTTP_400_INVALID_GRANT', 'post-revoke denial must be HTTP 400 invalid_grant');
  assert(Number.isInteger(raw.revocation?.postRevokeAttemptsUsed) && raw.revocation.postRevokeAttemptsUsed >= 1 && raw.revocation.postRevokeAttemptsUsed <= 4, 'post-revoke attempts outside bounded schedule');

  for (const value of Object.values(raw.privacy ?? {})) assert(value === 0, 'P1 privacy zero field is non-zero');
  assertNoSensitiveResultLeak(raw);

  const metrics = Object.fromEntries(REQUIRED_ENDPOINTS.map(name => [name, endpoint(raw, name)]));
  assert(metrics.tokenExchange.count === 1, 'tokenExchange count must be exactly 1');
  assert(metrics.tokenRefresh.count >= 2, 'tokenRefresh count must include pre- and post-revoke attempts');
  assert(metrics.revoke.count === 1, 'revoke count must be exactly 1 on successful path');
  assert(metrics.full.count === 1, 'FULL retrieval count must be exactly 1');
  assert(metrics.profile.count >= 2, 'profile count must prove bearer before/after refresh');

  const other = raw.network?.endpointClasses?.other;
  assert(other && other.count === 0 && other.networkErrors === 0, 'unexpected endpoint class observed');

  const oauthToken = aggregateEndpoint(metrics.tokenExchange, metrics.tokenRefresh);
  const revoke = aggregateEndpoint(metrics.revoke);
  const profile = aggregateEndpoint(metrics.profile);
  const history = aggregateEndpoint(metrics.history);
  const metadata = aggregateEndpoint(metrics.metadata);
  const full = aggregateEndpoint(metrics.full);

  return sanitizePhysicalEvidence({
    campaignPhase: 'P1',
    receiptType: 'Q003_PRODUCTION_LIFECYCLE',
    observedAtDay: raw.executionDay,
    platformClass: 'LOCAL_EDGE',
    appBuild: 'P1-LOCAL-EDGE',
    harnessVersion: 'P1-LIFECYCLE-V1',
    result: 'PASS',
    counters: {
      P1_REQUIRED_CLAIMS: REQUIRED_CLAIMS.length,
      P1_PASSED_CLAIMS: REQUIRED_CLAIMS.length,
      POST_REVOKE_ATTEMPTS: raw.revocation.postRevokeAttemptsUsed,
      TOTAL_OBSERVED_REQUESTS: finiteNonNegative(raw.network?.totalObservedRequests, 'totalObservedRequests'),
      GMAIL_LIST_REQUESTS: metrics.list.count,
      GMAIL_LIST_REQUEST_BODY_BYTES: metrics.list.requestBodyBytes,
      GMAIL_LIST_RESPONSE_BYTES: metrics.list.responseBodyBytes,
      GMAIL_LIST_TOTAL_LATENCY_MS: metrics.list.totalLatencyMs
    },
    endpointMetrics: [
      { endpointClass: 'OAUTH_TOKEN', ...oauthToken },
      { endpointClass: 'OAUTH_REVOKE', ...revoke },
      { endpointClass: 'GMAIL_PROFILE', ...profile },
      { endpointClass: 'GMAIL_HISTORY', ...history },
      { endpointClass: 'GMAIL_MESSAGE_METADATA', ...metadata },
      { endpointClass: 'GMAIL_MESSAGE_FULL', ...full }
    ],
    passFacts: [
      'EXACT_GMAIL_READONLY_SCOPE',
      'PRE_REVOKE_REFRESH_PASS',
      'REFRESHED_BEARER_GMAIL_PASS',
      'REVOKE_HTTP_200',
      'POST_REVOKE_INVALID_GRANT',
      'NETWORK_METRICS_COMPLETE',
      'RAW_RESULT_PRIVACY_ZERO',
      'BOUNDED_SYNTHETIC_GMAIL_PATH'
    ],
    residualRiskCodes: [
      'PROVIDER_PROPAGATION_BOUND_OBSERVED',
      'RAW_RESULT_REMAINS_LOCAL',
      'P1_PASS_DOES_NOT_CLOSE_Q003'
    ]
  });
}

function main(argv) {
  const inputPath = argv[2];
  if (!inputPath) throw new Error('P1 raw result path is required');
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const reduced = reduceP1Result(raw);
  process.stdout.write(`${JSON.stringify(reduced, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main(process.argv);
  } catch (error) {
    console.error(`FINANCESENSOR_P1_RESULT_REDUCER=FAIL: ${error.message}`);
    process.exit(1);
  }
}
