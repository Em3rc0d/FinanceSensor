import { reduceP1Result } from './reduce-p1-production-lifecycle-result.mjs';

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

function metric(count = 1, requestBodyBytes = 0, responseBodyBytes = 10, totalLatencyMs = 5, statuses = { '200': count }) {
  return {
    count,
    requestBodyBytes,
    responseBodyBytes,
    totalLatencyMs,
    minLatencyMs: totalLatencyMs / Math.max(count, 1),
    maxLatencyMs: totalLatencyMs,
    statuses,
    networkErrors: 0
  };
}

function passFixture() {
  return {
    schemaVersion: 1,
    phase: 'P1',
    project: 'FinanceSensor',
    executionDay: '2026-09-03',
    scopeRequested: GMAIL_READONLY_SCOPE,
    scopeGranted: GMAIL_READONLY_SCOPE,
    scopeAfterRefresh: GMAIL_READONLY_SCOPE,
    oauth: {
      successfulRefreshBeforeRevoke: 'PASS',
      refreshedBearerGmailUse: 'PASS'
    },
    revocation: {
      revokeHttpStatus: 200,
      providerAcceptedRevoke: 'PASS',
      postRevokeAttemptsUsed: 2,
      refreshAuthorityAfterRevoke: 'DENIED',
      denialSemantic: 'HTTP_400_INVALID_GRANT'
    },
    network: {
      totalObservedRequests: 13,
      endpointClasses: {
        tokenExchange: metric(1, 120, 200, 30, { '200': 1 }),
        tokenRefresh: metric(3, 300, 240, 50, { '200': 1, '400': 2 }),
        revoke: metric(1, 80, 0, 15, { '200': 1 }),
        profile: metric(2, 0, 120, 25, { '200': 2 }),
        list: metric(1, 0, 160, 20, { '200': 1 }),
        metadata: metric(2, 0, 220, 30, { '200': 2 }),
        full: metric(1, 0, 300, 25, { '200': 1 }),
        history: metric(2, 0, 240, 35, { '200': 2 }),
        other: {
          count: 0,
          requestBodyBytes: 0,
          responseBodyBytes: 0,
          totalLatencyMs: 0,
          minLatencyMs: null,
          maxLatencyMs: 0,
          statuses: {},
          networkErrors: 0
        }
      }
    },
    privacy: {
      rawGmailContentWrittenToResult: 0,
      financialPlaintextWrittenToResult: 0,
      gmailAddressWrittenToResult: 0,
      messageIdWrittenToResult: 0,
      historyIdWrittenToResult: 0,
      oauthSecretWrittenToResult: 0,
      rawHttpPayloadWrittenToResult: 0,
      requestUrlWrittenToResult: 0,
      syntheticMarkerWrittenToResult: 0
    },
    claims: {
      SUCCESSFUL_REFRESH_BEFORE_REVOKE: 'PASS',
      MINIMUM_SCOPE_REFRESH: 'PASS',
      REQUEST_BYTES_ACCOUNTED: 'PASS',
      RESPONSE_BYTES_ACCOUNTED: 'PASS',
      PER_ENDPOINT_LATENCY_RECORDED: 'PASS',
      PROVIDER_REVOKE_ACCEPTED: 'PASS',
      OLD_REFRESH_AUTHORITY_DENIED: 'PASS',
      NO_REAL_GMAIL_CONTENT_IN_RESULT: 'PASS'
    },
    p1Pass: 'PASS',
    result: 'P1_PRODUCTION_LIFECYCLE_PASS'
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectReject(mutator, label) {
  const sample = clone(passFixture());
  mutator(sample);
  let rejected = false;
  try {
    reduceP1Result(sample);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error(`negative case accepted: ${label}`);
}

const reduced = reduceP1Result(passFixture());
if (reduced.campaignPhase !== 'P1') throw new Error('sanitized phase mismatch');
if (reduced.receiptType !== 'Q003_PRODUCTION_LIFECYCLE') throw new Error('sanitized receipt type mismatch');
if (reduced.result !== 'PASS') throw new Error('sanitized result mismatch');
if (reduced.counters?.P1_REQUIRED_CLAIMS !== 8 || reduced.counters?.P1_PASSED_CLAIMS !== 8) throw new Error('sanitized claim counters mismatch');
if (!Array.isArray(reduced.endpointMetrics) || reduced.endpointMetrics.length !== 6) throw new Error('sanitized endpoint metric count mismatch');
if (!(reduced.passFacts ?? []).includes('POST_REVOKE_INVALID_GRANT')) throw new Error('sanitized semantic denial fact missing');
if (!(reduced.residualRiskCodes ?? []).includes('RAW_RESULT_REMAINS_LOCAL')) throw new Error('sanitized raw-result locality risk missing');

expectReject(sample => { sample.scopeAfterRefresh = `${GMAIL_READONLY_SCOPE} https://www.googleapis.com/auth/drive.readonly`; }, 'broader refresh scope');
expectReject(sample => { sample.revocation.revokeHttpStatus = 500; }, 'revoke HTTP 500');
expectReject(sample => { sample.revocation.denialSemantic = 'NON_ACCEPTED_ERROR_server_error'; }, 'non-invalid_grant denial');
expectReject(sample => { sample.revocation.refreshAuthorityAfterRevoke = 'PROVIDER_GRACE_STILL_USABLE'; }, 'provider grace still usable');
expectReject(sample => { sample.claims.OLD_REFRESH_AUTHORITY_DENIED = 'FAIL'; }, 'claim failure');
expectReject(sample => { sample.privacy.rawGmailContentWrittenToResult = 1; }, 'privacy counter nonzero');
expectReject(sample => { sample.mailbox = 'person@example.com'; }, 'raw Gmail identity leak');
expectReject(sample => { sample.network.endpointClasses.other.count = 1; }, 'unexpected endpoint class');
expectReject(sample => { sample.revocation.postRevokeAttemptsUsed = 5; }, 'unbounded post-revoke attempts');
expectReject(sample => { sample.network.endpointClasses.tokenRefresh.statuses = { '200': 3 }; }, 'missing observed HTTP 400 invalid_grant status');

console.log('FINANCESENSOR_P1_RESULT_REDUCER_TEST=PASS');
console.log('SYNTHETIC_PASS_FIXTURE=PASS');
console.log('NEGATIVE_CASES=10');
console.log('BROADER_SCOPE=REJECTED');
console.log('REVOKE_5XX=REJECTED');
console.log('NON_INVALID_GRANT=REJECTED');
console.log('PROVIDER_GRACE=REJECTED');
console.log('PRIVACY_LEAK=REJECTED');
console.log('RAW_GMAIL_IDENTITY=REJECTED');
console.log('MISSING_HTTP_400_EVIDENCE=REJECTED');
console.log('RAW_RESULT_PUBLICATION=NOT_REQUIRED');
