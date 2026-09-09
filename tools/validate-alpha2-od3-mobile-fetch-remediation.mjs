import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readText = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = relative => JSON.parse(readText(relative));
const assert = (condition, message) => {
  if (!condition) throw new Error(`ALPHA2_OD3_REMEDIATION_FAILED:${message}`);
};

const scanner = readText('spikes/mobile-shell/native/android/Alpha2StatementDiscoveryScanner.kt');
const pipeline = readText('spikes/mobile-shell/lib/alpha2/alpha2_pipeline.dart');
const projection = readText('spikes/mobile-shell/lib/alpha2/alpha2_projection.dart');
const dashboard = readText('spikes/mobile-shell/lib/alpha2/alpha2_dashboard_sections.dart');
const test = readText('spikes/mobile-shell/test/alpha2_statement_single_pass_diagnostics_test.dart');
const campaign = readJson('graph/alpha2-r2-owned-device-campaign.json');

for (const marker of [
  'ATTACHMENT_READ_TIMEOUT_MS = 30_000',
  'ATTACHMENT_MAX_ATTEMPTS = 3',
  'setOf(408, 429, 500, 502, 503, 504)',
  'ATTACHMENT_RETRY_DELAYS_MS = longArrayOf(250L, 750L)',
  '?fields=data,size',
  'Base64.URL_SAFE or Base64.NO_WRAP',
  'ALPHA2_STATEMENT_ATTACHMENT_TIMEOUT',
  'ALPHA2_STATEMENT_ATTACHMENT_IO_RETRY_EXHAUSTED',
  'ALPHA2_STATEMENT_ATTACHMENT_RESPONSE_INVALID',
  'ALPHA2_STATEMENT_ATTACHMENT_SIZE_MISMATCH',
  'PDF_HEADER_SCAN_BYTES = 1_024',
  'bytes.fill(0)'
]) {
  assert(scanner.includes(marker), `SCANNER_MARKER:${marker}`);
}
assert(!scanner.includes('Base64.NO_PADDING'), 'ANDROID_DECODER_MUST_ACCEPT_PADDED_OR_UNPADDED_BASE64URL');
assert(!scanner.includes('messageId" to'), 'RAW_MESSAGE_ID_MUST_NOT_CROSS_DART_BOUNDARY');
assert(!scanner.includes('attachmentId" to'), 'RAW_ATTACHMENT_ID_MUST_NOT_CROSS_DART_BOUNDARY');

for (const marker of [
  "alpha2FetchDiagnosticCountPrefix = 'FETCH_DIAGNOSTIC:'",
  "status == 'FETCH_REJECTED'",
  '_safeStatementFetchCode(outcome.reviewCodes.first)'
]) {
  assert(pipeline.includes(marker), `PIPELINE_MARKER:${marker}`);
}

for (const marker of [
  'STATEMENT_FETCH_NETWORK_RETRY_EXHAUSTED',
  'STATEMENT_FETCH_RATE_LIMITED',
  'STATEMENT_FETCH_SERVICE_TEMPORARY',
  'STATEMENT_FETCH_ACCESS_REJECTED',
  'STATEMENT_ATTACHMENT_NOT_FOUND',
  'STATEMENT_ATTACHMENT_INVALID',
  'STATEMENT_PDF_SIGNATURE_INVALID'
]) {
  assert(projection.includes(marker), `PROJECTION_MARKER:${marker}`);
  assert(dashboard.includes(marker), `DASHBOARD_MARKER:${marker}`);
}
assert(test.includes('ALPHA2_STATEMENT_GMAIL_HTTP_429'), 'RATE_LIMIT_TEST_REQUIRED');
assert(test.includes('ALPHA2_STATEMENT_ATTACHMENT_TIMEOUT'), 'TIMEOUT_TEST_REQUIRED');
assert(test.includes('findsNothing'), 'GENERIC_FETCH_LABEL_SUPPRESSION_TEST_REQUIRED');

assert(campaign.status === 'PHYSICAL_CAMPAIGN_IN_PROGRESS', 'PHYSICAL_CAMPAIGN_MUST_REMAIN_OPEN');
const od3 = campaign.subgates?.find(gate => gate.id === 'OD3');
assert(od3?.status === 'READY_FOR_PHYSICAL', 'OD3_MUST_NOT_BE_FALSELY_PROMOTED');
assert(campaign.currentState?.nextGate === 'OD3_BOUNDED_FETCH_ONLY_FOR_ALLOWED_PROFILE', 'NEXT_GATE_DRIFT');
assert(campaign.currentState?.buildReady === false, 'BUILD_READY_MUST_REMAIN_FALSE');
assert(campaign.currentState?.releaseReady === false, 'RELEASE_READY_MUST_REMAIN_FALSE');

console.log('ALPHA2_OD3_MOBILE_FETCH_REMEDIATION=PASS');
console.log('ATTACHMENT_FETCH_MAX_ATTEMPTS=3');
console.log('ATTACHMENT_READ_TIMEOUT_MS=30000');
console.log('SAFE_FETCH_DIAGNOSTICS=CLASSIFIED');
console.log('RAW_GMAIL_IDENTITY_PUBLIC_CROSSING=0');
console.log('OD3_PHYSICAL_PASS=0');
console.log('BUILD_READY=NO');
