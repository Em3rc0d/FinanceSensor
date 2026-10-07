import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readText = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = relative => JSON.parse(readText(relative));
const assert = (condition, message) => { if (!condition) throw new Error(`ALPHA2_OD3_REMEDIATION_FAILED:${message}`); };

const scanner = readText('spikes/mobile-shell/native/android/Alpha2StatementDiscoveryScanner.kt');
const pipeline = readText('spikes/mobile-shell/lib/alpha2/alpha2_pipeline.dart');
const projection = readText('spikes/mobile-shell/lib/alpha2/alpha2_projection.dart');
const dashboard = readText('spikes/mobile-shell/lib/alpha2/alpha2_dashboard_sections.dart');
const test = readText('spikes/mobile-shell/test/alpha2_statement_single_pass_diagnostics_test.dart');
const campaign = readJson('graph/alpha2-r2-owned-device-campaign.json');

for (const marker of [
  'ATTACHMENT_READ_TIMEOUT_MS = 30_000','ATTACHMENT_MAX_ATTEMPTS = 3','setOf(408, 429, 500, 502, 503, 504)','ATTACHMENT_RETRY_DELAYS_MS = longArrayOf(250L, 750L)','?fields=data,size','Base64.URL_SAFE or Base64.NO_WRAP','ALPHA2_STATEMENT_ATTACHMENT_TIMEOUT','ALPHA2_STATEMENT_ATTACHMENT_IO_RETRY_EXHAUSTED','ALPHA2_STATEMENT_ATTACHMENT_RESPONSE_INVALID','ALPHA2_STATEMENT_ATTACHMENT_SIZE_MISMATCH','PDF_HEADER_SCAN_BYTES = 1_024','bytes.fill(0)'
]) assert(scanner.includes(marker), `SCANNER_MARKER:${marker}`);
assert(!scanner.includes('Base64.NO_PADDING'), 'ANDROID_DECODER_MUST_ACCEPT_PADDED_OR_UNPADDED_BASE64URL');
assert(!scanner.includes('messageId" to'), 'RAW_MESSAGE_ID_MUST_NOT_CROSS_DART_BOUNDARY');
assert(!scanner.includes('attachmentId" to'), 'RAW_ATTACHMENT_ID_MUST_NOT_CROSS_DART_BOUNDARY');
for (const marker of ["alpha2FetchDiagnosticCountPrefix = 'FETCH_DIAGNOSTIC:'","status == 'FETCH_REJECTED'",'_safeStatementFetchCode(outcome.reviewCodes.first)']) assert(pipeline.includes(marker), `PIPELINE_MARKER:${marker}`);
for (const marker of ['STATEMENT_FETCH_NETWORK_RETRY_EXHAUSTED','STATEMENT_FETCH_RATE_LIMITED','STATEMENT_FETCH_SERVICE_TEMPORARY','STATEMENT_FETCH_ACCESS_REJECTED','STATEMENT_ATTACHMENT_NOT_FOUND','STATEMENT_ATTACHMENT_INVALID','STATEMENT_PDF_SIGNATURE_INVALID']) {
  assert(projection.includes(marker), `PROJECTION_MARKER:${marker}`);
  assert(dashboard.includes(marker), `DASHBOARD_MARKER:${marker}`);
}
assert(test.includes('ALPHA2_STATEMENT_GMAIL_HTTP_429'), 'RATE_LIMIT_TEST_REQUIRED');
assert(test.includes('ALPHA2_STATEMENT_ATTACHMENT_TIMEOUT'), 'TIMEOUT_TEST_REQUIRED');
assert(test.includes('findsNothing'), 'GENERIC_FETCH_LABEL_SUPPRESSION_TEST_REQUIRED');

const currentCandidate = campaign.candidate?.id;
const od0 = campaign.subgates?.find(gate => gate.id === 'OD0');
const od1 = campaign.subgates?.find(gate => gate.id === 'OD1');
const od2 = campaign.subgates?.find(gate => gate.id === 'OD2');
const od3 = campaign.subgates?.find(gate => gate.id === 'OD3');

// This validator owns the attachment-fetch remediation invariants, not the
// authority to pin a superseded physical candidate. +2008 is retained as
// historical evidence only; +2009 is the current signed campaign authority.
assert(currentCandidate === '0.2.0-alpha.2+2009', 'CURRENT_CANDIDATE_MUST_BE_2009');
assert(campaign.status === 'READY_FOR_CONSOLIDATED_OWNED_DEVICE_UAT', '2009_CAMPAIGN_MUST_BE_READY_FOR_CONSOLIDATED_UAT');
assert(campaign.currentState?.r1TrustedEdgeSigning === 'PASS', '2009_R1_MUST_BE_PASS');
assert(campaign.currentState?.r2PhysicalCampaign === 'READY_FOR_CONSOLIDATED_UAT', '2009_R2_MUST_BE_READY_FOR_CONSOLIDATED_UAT');
assert(campaign.currentState?.nextGate === 'CONSOLIDATED_OWNED_DEVICE_UAT', '2009_NEXT_GATE_MUST_BE_CONSOLIDATED_UAT');
assert(od0?.status === 'READY_IN_CONSOLIDATED_UAT', '2009_OD0_MUST_BE_READY_IN_CONSOLIDATED_UAT');
assert(od1?.status === 'READY_IN_CONSOLIDATED_UAT' && od2?.status === 'READY_IN_CONSOLIDATED_UAT' && od3?.status === 'READY_IN_CONSOLIDATED_UAT', '2009_OD1_OD2_OD3_MUST_BE_ROUTED_TO_CONSOLIDATED_UAT');
assert(od3?.status !== 'PASS', 'OD3_PHYSICAL_PASS_MUST_NOT_BE_SYNTHESIZED');
assert(campaign.historicalInvalidatedCampaign?.candidate === '0.2.0-alpha.2+2008', '2008_HISTORY_MUST_BE_RETAINED');
assert(campaign.historicalInvalidatedCampaign?.evidenceInheritanceAllowed === false, '2008_EVIDENCE_MUST_NOT_BE_INHERITED');
const historical2007 = campaign.olderHistoricalCampaigns?.find(item => item.candidate === '0.2.0-alpha.2+2007');
assert(historical2007?.evidenceInheritanceAllowed === false, '2007_EVIDENCE_MUST_NOT_BE_INHERITED');
assert(campaign.currentState?.buildReady === false, 'BUILD_READY_MUST_REMAIN_FALSE');
assert(campaign.currentState?.releaseReady === false, 'RELEASE_READY_MUST_REMAIN_FALSE');

console.log('ALPHA2_OD3_MOBILE_FETCH_REMEDIATION=PASS');
console.log('ATTACHMENT_FETCH_MAX_ATTEMPTS=3');
console.log('ATTACHMENT_READ_TIMEOUT_MS=30000');
console.log('SAFE_FETCH_DIAGNOSTICS=CLASSIFIED');
console.log('RAW_GMAIL_IDENTITY_PUBLIC_CROSSING=0');
console.log(`CURRENT_CANDIDATE=${currentCandidate}`);
console.log(`R1_STATE=${campaign.currentState?.r1TrustedEdgeSigning}`);
console.log(`R2_NEXT_GATE=${campaign.currentState?.nextGate}`);
console.log('OD3_PHYSICAL_PASS=0');
console.log('BUILD_READY=NO');
