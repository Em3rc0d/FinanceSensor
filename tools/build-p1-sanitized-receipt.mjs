import fs from 'node:fs';
import { sanitizePhysicalEvidence } from './physical-evidence-sanitizer.mjs';

const inputPath = process.argv[2] ?? 'financesensor-level-c-result.json';
const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

if (raw?.schemaVersion !== 8) throw new Error('P1_ADAPTER_REQUIRES_LEVEL_C_V8_RESULT');
if (raw?.executionComplete !== true) throw new Error('P1_ADAPTER_REQUIRES_COMPLETE_EXECUTION');
if (raw?.levelCPass !== 'PASS' || raw?.result !== 'LEVEL_C_V8_PASS') {
  throw new Error('P1_ADAPTER_REFUSES_NON_PASS_LEVEL_C_V8_RESULT');
}

const endpointMap = [
  ['tokenExchange', 'OAUTH_TOKEN'],
  ['tokenRefresh', 'OAUTH_TOKEN'],
  ['revoke', 'OAUTH_REVOKE'],
  ['profile', 'GMAIL_PROFILE'],
  ['list', 'GMAIL_MESSAGE_METADATA'],
  ['metadata', 'GMAIL_MESSAGE_METADATA'],
  ['full', 'GMAIL_MESSAGE_FULL'],
  ['history', 'GMAIL_HISTORY']
];

const endpointMetrics = [];
const counters = {};
for (const [sourceKey, endpointClass] of endpointMap) {
  const item = raw?.network?.endpoints?.[sourceKey];
  if (!item || !Number.isFinite(item.count) || item.count <= 0) continue;
  const countKey = `ENDPOINT_${sourceKey.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}_COUNT`;
  counters[countKey] = item.count;
  endpointMetrics.push({
    endpointClass,
    requestBodyBytes: Number(item.requestBodyBytes ?? 0),
    responseBytes: Number(item.responseBodyBytes ?? 0),
    elapsedMs: Number(item.totalLatencyMs ?? 0) / item.count
  });
}

Object.assign(counters, {
  REQUESTS_TOTAL: Number(raw?.network?.totalObservedRequests ?? 0),
  REQUEST_BODY_BYTES_TOTAL: Number(raw?.network?.totalRequestBodyBytes ?? 0),
  RESPONSE_BODY_BYTES_TOTAL: Number(raw?.network?.totalResponseBodyBytes ?? 0),
  FULL_MESSAGES_FETCHED: Number(raw?.requests?.full ?? 0),
  HISTORY_REQUESTS: Number(raw?.requests?.history ?? 0),
  TOKEN_REFRESH_REQUESTS: Number(raw?.requests?.tokenRefresh ?? 0),
  REVOKE_REQUESTS: Number(raw?.requests?.revoke ?? 0)
});

const facts = [];
const addFact = (condition, fact) => { if (condition) facts.push(fact); };
addFact(raw?.oauth?.successfulRefreshBeforeRevoke === 'PASS', 'SUCCESSFUL_REFRESH_BEFORE_REVOKE');
addFact(raw?.oauth?.refreshedBearerGmailUse === 'PASS', 'REFRESHED_BEARER_GMAIL_USE');
addFact(raw?.scopeRequested === 'https://www.googleapis.com/auth/gmail.readonly', 'MINIMUM_SCOPE_REFRESH');
addFact(raw?.network?.complete === 'PASS', 'REQUEST_RESPONSE_BYTES_ACCOUNTED');
addFact(endpointMetrics.length > 0 && endpointMetrics.every(x => Number.isFinite(x.elapsedMs)), 'PER_ENDPOINT_LATENCY_RECORDED');
addFact(raw?.revocation?.providerAcceptedRevoke === 'PASS', 'PROVIDER_REVOKE_ACCEPTED');
addFact(raw?.revocation?.refreshAuthorityAfterRevoke === 'DENIED', 'OLD_REFRESH_AUTHORITY_DENIED');
addFact(raw?.privacy?.rawGmailContentWrittenToResult === 0, 'NO_REAL_GMAIL_CONTENT_IN_RESULT');
addFact(raw?.privacy?.authSecretWrittenToResult === 0, 'NO_AUTH_SECRET_IN_RESULT');
addFact(raw?.privacy?.messageIdWrittenToResult === 0, 'NO_MESSAGE_ID_IN_RESULT');
addFact(raw?.privacy?.requestUrlQueryWrittenToResult === 0, 'NO_REQUEST_QUERY_VALUE_IN_RESULT');

const requiredFacts = [
  'SUCCESSFUL_REFRESH_BEFORE_REVOKE',
  'REFRESHED_BEARER_GMAIL_USE',
  'MINIMUM_SCOPE_REFRESH',
  'REQUEST_RESPONSE_BYTES_ACCOUNTED',
  'PER_ENDPOINT_LATENCY_RECORDED',
  'PROVIDER_REVOKE_ACCEPTED',
  'OLD_REFRESH_AUTHORITY_DENIED',
  'NO_REAL_GMAIL_CONTENT_IN_RESULT',
  'NO_AUTH_SECRET_IN_RESULT',
  'NO_MESSAGE_ID_IN_RESULT',
  'NO_REQUEST_QUERY_VALUE_IN_RESULT'
];
for (const fact of requiredFacts) {
  if (!facts.includes(fact)) throw new Error(`P1_REQUIRED_FACT_MISSING_${fact}`);
}

const observedAtDay = String(raw.executionFinishedAt ?? raw.executionStartedAt ?? '').slice(0, 10);
const sanitized = sanitizePhysicalEvidence({
  campaignPhase: 'P1',
  receiptType: 'Q003_PRODUCTION_LIFECYCLE',
  observedAtDay,
  platformClass: 'LOCAL_EDGE',
  appBuild: process.env.FINANCESENSOR_APP_BUILD ?? 'mk0-local-edge',
  harnessVersion: 'level-c-v8',
  result: 'PASS',
  counters,
  endpointMetrics,
  passFacts: facts,
  residualRiskCodes: ['ANDROID_IOS_CREDENTIAL_CUSTODY_OPEN', 'GOOGLE_PRODUCTION_VERIFICATION_OPEN']
});

process.stdout.write(`${JSON.stringify(sanitized, null, 2)}\n`);
