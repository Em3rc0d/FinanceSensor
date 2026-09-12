import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'financesensor-p1-'));
const input = path.join(tmp, 'level-c-v8.json');

const metric = (count, req, res, total) => ({
  count,
  requestBodyBytes: req,
  responseBodyBytes: res,
  totalLatencyMs: total,
  minLatencyMs: count ? total / count : null,
  maxLatencyMs: count ? total / count : 0,
  statuses: { '200': count }
});

const fixture = {
  schemaVersion: 8,
  executionStartedAt: '2026-09-02T10:00:00.000Z',
  executionFinishedAt: '2026-09-02T10:01:00.000Z',
  scopeRequested: 'https://www.googleapis.com/auth/gmail.readonly',
  executionComplete: true,
  levelCPass: 'PASS',
  result: 'LEVEL_C_V8_PASS',
  oauth: {
    successfulRefreshBeforeRevoke: 'PASS',
    refreshedBearerGmailUse: 'PASS'
  },
  revocation: {
    providerAcceptedRevoke: 'PASS',
    refreshAuthorityAfterRevoke: 'DENIED'
  },
  network: {
    complete: 'PASS',
    totalRequestBodyBytes: 600,
    totalResponseBodyBytes: 3600,
    totalObservedRequests: 12,
    endpoints: {
      tokenExchange: metric(1, 200, 500, 100),
      tokenRefresh: metric(2, 300, 700, 220),
      revoke: metric(1, 100, 20, 90),
      profile: metric(2, 0, 400, 140),
      list: metric(1, 0, 350, 80),
      metadata: metric(2, 0, 700, 180),
      full: metric(1, 0, 600, 120),
      history: metric(2, 0, 330, 200),
      other: metric(0, 0, 0, 0)
    }
  },
  requests: {
    full: 1,
    history: 2,
    tokenRefresh: 2,
    revoke: 1
  },
  privacy: {
    rawGmailContentWrittenToResult: 0,
    authSecretWrittenToResult: 0,
    messageIdWrittenToResult: 0,
    requestUrlQueryWrittenToResult: 0
  }
};

fs.writeFileSync(input, JSON.stringify(fixture));
const adapter = spawnSync(process.execPath, ['tools/build-p1-sanitized-receipt.mjs', input], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: { ...process.env, FINANCESENSOR_APP_BUILD: 'mk0-test' }
});
assert.equal(adapter.status, 0, adapter.stderr);
const receipt = JSON.parse(adapter.stdout);

assert.equal(receipt.campaignPhase, 'P1');
assert.equal(receipt.receiptType, 'Q003_PRODUCTION_LIFECYCLE');
assert.equal(receipt.platformClass, 'LOCAL_EDGE');
assert.equal(receipt.result, 'PASS');
assert.equal(receipt.observedAtDay, '2026-09-02');
assert.equal(receipt.counters.TOKEN_REFRESH_REQUESTS, 2);
assert.equal(receipt.counters.REVOKE_REQUESTS, 1);
assert.ok(receipt.endpointMetrics.length >= 7);
for (const fact of [
  'SUCCESSFUL_REFRESH_BEFORE_REVOKE',
  'REFRESHED_BEARER_GMAIL_USE',
  'MINIMUM_SCOPE_REFRESH',
  'REQUEST_RESPONSE_BYTES_ACCOUNTED',
  'PER_ENDPOINT_LATENCY_RECORDED',
  'PROVIDER_REVOKE_ACCEPTED',
  'OLD_REFRESH_AUTHORITY_DENIED',
  'NO_REAL_GMAIL_CONTENT_IN_RESULT'
]) assert.ok(receipt.passFacts.includes(fact), `missing ${fact}`);

fixture.levelCPass = 'FAIL';
fixture.result = 'LEVEL_C_V8_EXECUTION_COMPLETE_WITH_GAPS';
fs.writeFileSync(input, JSON.stringify(fixture));
const refused = spawnSync(process.execPath, ['tools/build-p1-sanitized-receipt.mjs', input], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.notEqual(refused.status, 0);
assert.match(refused.stderr, /REFUSES_NON_PASS_LEVEL_C_V8_RESULT/);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('FINANCESENSOR_P1_SANITIZED_RECEIPT_ADAPTER=PASS');
console.log('NON_PASS_V8_RECEIPT_EMISSION=DENIED');
console.log('REAL_GMAIL_EXECUTION=NOT_PERFORMED_BY_CI');
