import fs from 'node:fs';

const contractPath = 'graph/p1-production-lifecycle.json';
const campaignPath = 'graph/physical-closure-campaign.json';
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
const runnerPath = contract.runner;
const runner = fs.readFileSync(runnerPath, 'utf8');
const failures = [];
const fail = message => failures.push(message);

if (contract.schemaVersion !== 1) fail('schemaVersion must be 1');
if (contract.project !== 'FinanceSensor') fail('project must be FinanceSensor');
if (contract.mk !== 'MK0') fail('mk must be MK0');
if (contract.phase !== 'P1') fail('phase must be P1');
if (contract.status !== 'HARNESS_READY_PHYSICAL_OPEN') fail('P1 contract must remain harness-ready/physical-open');
if (contract.trustBoundary !== 'CONTROLLED_LOCAL_EDGE_ONLY') fail('P1 trust boundary mismatch');
if (contract.resultArtifact?.rawUploadToGitHub !== 'FORBIDDEN') fail('raw P1 result upload must remain forbidden');
if (contract.resultArtifact?.sanitizedReceiptAfterValidation !== 'ALLOWED') fail('sanitized receipt must remain allowed');
if (contract.passPromotion?.currentPhysicalPass !== false) fail('P1 physical PASS must remain false before controlled execution');
if (contract.passPromotion?.requiresControlledEdgeExecution !== true) fail('P1 PASS must require controlled-edge execution');
if (contract.passPromotion?.requiresAllEightClaimsPass !== true) fail('P1 PASS must require all eight claims');
if (contract.passPromotion?.requiresSanitizedReceipt !== true) fail('P1 PASS must require sanitized receipt');
if (contract.passPromotion?.requiresImmutableReceiptBinding !== true) fail('P1 PASS must require immutable receipt binding');

const p1 = campaign.phases?.find(phase => phase.id === 'P1');
if (!p1) fail('campaign P1 missing');
if (p1?.status !== 'PHYSICAL_EVIDENCE_REQUIRED') fail('campaign P1 must remain physically open');
if (JSON.stringify(p1?.dependsOn ?? []) !== JSON.stringify(['P0'])) fail('P1 must depend only on P0');

const expectedClaims = new Set(p1?.requiredClaims ?? []);
const contractClaims = new Set(contract.requiredClaims ?? []);
if (expectedClaims.size !== 8) fail(`campaign P1 must expose exactly 8 claims, got ${expectedClaims.size}`);
if (contractClaims.size !== expectedClaims.size) fail('P1 contract claim count drift');
for (const claim of expectedClaims) if (!contractClaims.has(claim)) fail(`P1 contract missing claim ${claim}`);
for (const claim of contractClaims) if (!expectedClaims.has(claim)) fail(`P1 contract has unexpected claim ${claim}`);

if (contract.oauthContract?.requestedScope !== 'https://www.googleapis.com/auth/gmail.readonly') fail('P1 scope must be exact gmail.readonly');
if (contract.oauthContract?.grantedScopeMustBeExact !== true) fail('granted scope must be checked exactly');
if (contract.oauthContract?.refreshScopeMustBeExact !== true) fail('refresh scope must be checked exactly');
if (contract.oauthContract?.tokenType !== 'Bearer') fail('P1 token type must be Bearer');
if (contract.oauthContract?.pkce !== 'S256') fail('P1 PKCE must be S256');
if (contract.oauthContract?.offlineAccess !== true) fail('P1 controlled lifecycle requires offline refresh authority');

if (contract.revocationContract?.providerRevokeRequiredHttpStatus !== 200) fail('provider revoke PASS must require HTTP 200');
if (contract.revocationContract?.postRevokeAcceptedDenial?.httpStatus !== 400) fail('post-revoke denial must require HTTP 400');
if (contract.revocationContract?.postRevokeAcceptedDenial?.oauthError !== 'invalid_grant') fail('post-revoke denial must require invalid_grant');
if (JSON.stringify(contract.revocationContract?.boundedDelayScheduleMs) !== JSON.stringify([0, 1000, 3000, 7000])) fail('post-revoke delay schedule drift');

for (const ambiguous of ['NETWORK_ERROR', 'TIMEOUT', 'HTTP_5XX', 'NON_INVALID_GRANT_4XX', 'REFRESH_STILL_SUCCEEDS_WITHIN_BOUND']) {
  if (!(contract.revocationContract?.ambiguousOutcomesThatMustNotPass ?? []).includes(ambiguous)) fail(`missing fail-closed ambiguous outcome ${ambiguous}`);
}

for (const endpoint of ['profile', 'list', 'metadata', 'full', 'history']) {
  if (!(contract.gmailEndpointClassesRequired ?? []).includes(endpoint)) fail(`missing Gmail endpoint class ${endpoint}`);
}
for (const endpoint of ['tokenExchange', 'tokenRefresh', 'revoke']) {
  if (!(contract.oauthEndpointClassesRequired ?? []).includes(endpoint)) fail(`missing OAuth endpoint class ${endpoint}`);
}

for (const field of [
  'rawGmailContentWrittenToResult',
  'financialPlaintextWrittenToResult',
  'gmailAddressWrittenToResult',
  'messageIdWrittenToResult',
  'historyIdWrittenToResult',
  'oauthSecretWrittenToResult',
  'rawHttpPayloadWrittenToResult',
  'requestUrlWrittenToResult',
  'syntheticMarkerWrittenToResult'
]) {
  if (!(contract.privacyZeroFields ?? []).includes(field)) fail(`missing privacy zero field ${field}`);
}

function requireText(needle, label = needle) {
  if (!runner.includes(needle)) fail(`${runnerPath}: missing ${label}`);
}
function forbidText(needle, label = needle) {
  if (runner.includes(needle)) fail(`${runnerPath}: forbidden ${label}`);
}

for (const needle of [
  "const POST_REVOKE_DELAYS_MS = [0, 1000, 3000, 7000]",
  "scopeRequested: GMAIL_READONLY_SCOPE",
  "scopeGranted: 'PENDING'",
  "scopeAfterRefresh: 'PENDING'",
  "exactGmailReadonlyScope(payload.scope)",
  "payload.token_type !== 'Bearer'",
  "providerAcceptedRevoke = revoke.status === 200 ? 'PASS'",
  "response.status === 400 && payload.error === 'invalid_grant'",
  "denialSemantic = 'HTTP_400_INVALID_GRANT'",
  "throw new Error('POST_REVOKE_INVALID_GRANT_NOT_OBSERVED_WITHIN_BOUND')",
  "maxFullMessages: MAX_FULL_MESSAGES",
  "gmailSearchQueryUsed: false",
  "historicalMailboxSweep: false",
  "endpointClasses: {",
  "tokenExchange: metric()",
  "tokenRefresh: metric()",
  "revoke: metric()",
  "profile: metric()",
  "list: metric()",
  "metadata: metric()",
  "full: metric()",
  "history: metric()",
  "rawGmailContentWrittenToResult: 0",
  "oauthSecretWrittenToResult: 0",
  "rawHttpPayloadWrittenToResult: 0",
  "requestUrlWrittenToResult: 0",
  "P1_PRODUCTION_LIFECYCLE_PASS",
  "A separate receipt validator must still bind the controlled-edge result before P1 can be promoted"
]) requireText(needle);

for (const forbidden of [
  "refreshAttempt.ok ? 'UNEXPECTEDLY_USABLE_OR_PROVIDER_GRACE' : 'DENIED'",
  "refreshAuthorityAfterRevoke = refreshAttempt.ok ?",
  "revoke.ok ? 'PASS'",
  "ANY_NON_2XX_REFRESH=>OLD_REFRESH_AUTHORITY_DENIED"
]) forbidText(forbidden);

const exactScopeChecks = (runner.match(/exactGmailReadonlyScope\(payload\.scope\)/g) ?? []).length;
if (exactScopeChecks < 2) fail('runner must verify exact granted scope at token exchange and refresh');

const revoke200Index = runner.indexOf("revoke.status === 200 ? 'PASS'");
const semanticDenialIndex = runner.indexOf("response.status === 400 && payload.error === 'invalid_grant'");
if (revoke200Index < 0 || semanticDenialIndex < 0 || revoke200Index >= semanticDenialIndex) {
  fail('provider HTTP 200 acceptance must precede semantic post-revoke denial proof');
}

const passGate = /SUCCESSFUL_REFRESH_BEFORE_REVOKE[\s\S]*MINIMUM_SCOPE_REFRESH[\s\S]*REQUEST_BYTES_ACCOUNTED[\s\S]*RESPONSE_BYTES_ACCOUNTED[\s\S]*PER_ENDPOINT_LATENCY_RECORDED[\s\S]*PROVIDER_REVOKE_ACCEPTED[\s\S]*OLD_REFRESH_AUTHORITY_DENIED[\s\S]*NO_REAL_GMAIL_CONTENT_IN_RESULT/;
if (!passGate.test(runner)) fail('runner does not expose the complete ordered P1 claim set');

if (failures.length) {
  console.error('FINANCESENSOR_P1_PRODUCTION_LIFECYCLE_HARNESS=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_P1_PRODUCTION_LIFECYCLE_HARNESS=PASS');
console.log('P1_REQUIRED_CLAIMS=8');
console.log('EXACT_GMAIL_READONLY_SCOPE=REQUIRED_AT_EXCHANGE_AND_REFRESH');
console.log('PROVIDER_REVOKE_HTTP_200=REQUIRED');
console.log('POST_REVOKE_DENIAL=HTTP_400_INVALID_GRANT_ONLY');
console.log('POST_REVOKE_AMBIGUOUS_OUTCOMES=FAIL_CLOSED');
console.log('NETWORK_EVIDENCE=REQUEST_BYTES_RESPONSE_BYTES_LATENCY_BY_ENDPOINT_CLASS');
console.log('RAW_P1_RESULT_IN_GITHUB=FORBIDDEN');
console.log('P1_PHYSICAL_EXECUTION=OPEN');
console.log('STATIC_PASS_DOES_NOT_PROMOTE_P1=PASS');
