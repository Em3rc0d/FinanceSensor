import fs from 'node:fs';

const runnerPath = 'spikes/physical-ingress/live/owned-oauth-level-c-v8.mjs';
const launcherPath = 'spikes/physical-ingress/live/RUN-FINANCESENSOR-LEVEL-C.cmd';
const runner = fs.readFileSync(runnerPath, 'utf8');
const launcher = fs.readFileSync(launcherPath, 'utf8');
const failures = [];

function requireText(text, needle, label) {
  if (!text.includes(needle)) failures.push(`${label}: missing ${needle}`);
}
function forbidText(text, needle, label) {
  if (text.includes(needle)) failures.push(`${label}: forbidden ${needle}`);
}

for (const needle of [
  'schemaVersion: 8',
  'MAX_MESSAGES = 5',
  'MAX_FULL_MESSAGES = 1',
  'MAX_PROBE_ATTEMPTS = 2',
  'MAX_ANCHOR_ATTEMPTS = 2',
  'MAX_ANCHOR_WINDOW_MESSAGES = 5',
  "messagesListMode: 'BOUNDED_RECENT_INBOX_WINDOW'",
  'gmailSearchQueryUsed: false',
  "anchorLabelIds: ['INBOX']",
  'profileHistoryUsedAsStartHistoryId: false',
  "syncAnchorSource: 'MESSAGE_HISTORY_ID'",
  "labelIds: ['INBOX']",
  'startHistoryId: baselineHistoryId',
  'successfulRefreshBeforeRevoke',
  'refreshedBearerGmailUse',
  'refreshAndVerifyBeforeRevoke',
  'bestEffortRevokeWithoutPass',
  'HTTP_BODY_BYTES_AND_FULL_RESPONSE_ELAPSED_MS',
  'request body only; excludes URL, headers and TLS framing',
  'payloadContentWrittenToResult: 0',
  'urlQueryValuesWrittenToResult: 0',
  'rawHttpPayloadWrittenToResult: 0',
  'requestUrlQueryWrittenToResult: 0',
  'anchorMarkerWrittenToResult: 0',
  'syntheticMarkerWrittenToResult: 0',
  'authorizedMailboxWrittenToResult: 0',
  'messageIdWrittenToResult: 0',
  'recentUnrelatedSubjectWrittenToResult: 0',
  "evidence.result = evidence.levelCPass === 'PASS' ? 'LEVEL_C_V8_PASS'",
]) requireText(runner, needle, runnerPath);

for (const needle of [
  'baselineHistoryId = profile.historyId',
  'Gmail Search q during anchor path       1',
  'rawHttpPayloadWrittenToResult: 1',
  'requestUrlQueryWrittenToResult: 1',
]) forbidText(runner, needle, runnerPath);

requireText(launcher, 'owned-oauth-level-c-v8.mjs', launcherPath);
requireText(launcher, 'successful real refresh before revoke', launcherPath);
requireText(launcher, 'Any post-authorization failure attempts provider revocation', launcherPath);

const passExpression = /successfulRefreshBeforeRevoke === 'PASS'[\s\S]*refreshedBearerGmailUse === 'PASS'[\s\S]*providerAcceptedRevoke === 'PASS'[\s\S]*refreshAuthorityAfterRevoke === 'DENIED'[\s\S]*network\.complete === 'PASS'/;
if (!passExpression.test(runner)) failures.push(`${runnerPath}: PASS gate does not bind refresh + refreshed bearer + revoke + post-revoke denial + network evidence`);

const refreshBeforeRevokeOrder = runner.indexOf('await refreshAndVerifyBeforeRevoke();');
const revokeOrder = runner.indexOf('await revokeAndVerify();');
if (refreshBeforeRevokeOrder < 0 || revokeOrder < 0 || refreshBeforeRevokeOrder >= revokeOrder) {
  failures.push(`${runnerPath}: refresh proof must execute before revoke verification`);
}

if (failures.length) {
  console.error('FINANCESENSOR_LEVEL_C_V8_STATIC_GUARD=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_LEVEL_C_V8_STATIC_GUARD=PASS');
console.log('BOUNDED_RECENT_INBOX=PASS');
console.log('SUCCESSFUL_REFRESH_REQUIRED=PASS');
console.log('REFRESHED_BEARER_GMAIL_USE_REQUIRED=PASS');
console.log('FAILURE_PATH_BEST_EFFORT_REVOKE=PASS');
console.log('SANITIZED_NETWORK_EVIDENCE_REQUIRED=PASS');
console.log('RAW_HTTP_PAYLOAD_IN_RESULT=0');
console.log('URL_QUERY_VALUES_IN_RESULT=0');
console.log('PHYSICAL_PROVIDER_EXECUTION=NOT_CLAIMED_BY_STATIC_GUARD');
