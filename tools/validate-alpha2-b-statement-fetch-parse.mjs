import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readText = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`ALPHA2_B_VALIDATION_FAILED:${message}`);
};

const graph = readJson('graph/alpha2-b-statement-fetch-parse.json');
const upstream = readJson('graph/alpha2-a-statement-discovery.json');
const design = readJson('graph/alpha2-design-freeze.json');
const registry = readJson('graph/statement-format-registry.json');
const source = readText('spikes/physical-ingress/src/statement-fetch-parse.js');
const status = readText('STATUS.md');

assert(graph.slice === 'ALPHA_2_B', 'SLICE_ID');
assert(graph.status === 'STATIC_IMPLEMENTATION_CANDIDATE_CI_PENDING', 'CANDIDATE_STATUS');
assert(graph.baseCommit === '1d553e623b91c7ba07391891c505e0f02f362a5c', 'BASE_COMMIT');
assert(graph.claims?.staticImplementationPass === false, 'STATIC_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.physicalProductPass === false, 'PHYSICAL_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.buildReady === false, 'BUILD_READY_MUST_REMAIN_FALSE');

assert(upstream.status === 'STATIC_IMPLEMENTED_CI_PASS', 'ALPHA2_A_NOT_CERTIFIED');
assert(upstream.candidateGate?.downloadEligibleState === 'STRONG', 'UPSTREAM_STRONG_GATE');
assert(upstream.candidateGate?.maximumAttachmentBytes === 20_971_520, 'UPSTREAM_SIZE_LIMIT');
assert(upstream.registry?.interbankSavingsAutomaticProfile === 'OPEN_NO_ALLOWLISTED_GMAIL_IDENTITY', 'INTERBANK_IDENTITY_MUST_REMAIN_OPEN');
assert(upstream.buildReady === false, 'UPSTREAM_BUILD_READY_DRIFT');

assert(design.buildReady === false, 'DESIGN_BUILD_READY_DRIFT');
assert(design.passwordPolicy?.persistence === false, 'PASSWORD_PERSISTENCE_FORBIDDEN');
assert(design.passwordPolicy?.logging === false, 'PASSWORD_LOGGING_FORBIDDEN');
assert(design.passwordPolicy?.crossInstitutionReuse === false, 'CROSS_INSTITUTION_PASSWORD_REUSE_FORBIDDEN');
assert(design.rawBoundary?.durablePdfBytes === false, 'DURABLE_PDF_FORBIDDEN');
assert(design.rawBoundary?.durableDecryptedText === false, 'DURABLE_TEXT_FORBIDDEN');
assert(design.rawBoundary?.durableLayoutGeometry === false, 'DURABLE_LAYOUT_FORBIDDEN');
assert(design.rawBoundary?.genericParserFallback === false, 'GENERIC_PARSER_FORBIDDEN');
assert(design.rawBoundary?.activePdfExecution === false, 'ACTIVE_PDF_EXECUTION_FORBIDDEN');

const profileById = new Map((registry.profiles ?? []).map(profile => [profile.profileId, profile]));
assert(profileById.get('PE-BCP-SAVINGS-REQUESTED')?.adapterStatus === 'STATIC_READY', 'BCP_SAVINGS_LIFECYCLE');
assert(profileById.get('PE-BCP-CREDIT-MONTHLY')?.adapterStatus === 'FORMAT_OBSERVED', 'BCP_CREDIT_LIFECYCLE');
assert(profileById.get('PE-RIPLEY-CREDIT-MONTHLY')?.adapterStatus === 'FORMAT_OBSERVED', 'RIPLEY_CREDIT_LIFECYCLE');
assert(profileById.get('PE-INTERBANK-SAVINGS-REQUESTED')?.adapterStatus === 'STATIC_READY', 'INTERBANK_SAVINGS_LIFECYCLE');
assert(profileById.get('PE-INTERBANK-SAVINGS-REQUESTED')?.realParse === 'OPEN', 'INTERBANK_REAL_PARSE_MUST_REMAIN_OPEN');

const moduleUrl = pathToFileURL(path.join(root, 'spikes/physical-ingress/src/statement-fetch-parse.js')).href;
const { ALPHA2_B_PROFILE_BINDINGS_V1 } = await import(moduleUrl);
const bcpSavings = ALPHA2_B_PROFILE_BINDINGS_V1['PE-BCP-SAVINGS-REQUESTED-DISCOVERY-V1'];
const bcpCredit = ALPHA2_B_PROFILE_BINDINGS_V1['PE-BCP-CREDIT-MONTHLY-DISCOVERY-V1'];
const ripleyCredit = ALPHA2_B_PROFILE_BINDINGS_V1['PE-RIPLEY-CREDIT-MONTHLY-DISCOVERY-V1'];
assert(bcpSavings?.parseEnabled === true && bcpSavings.adapterLifecycle === 'STATIC_READY', 'BCP_SAVINGS_BINDING');
assert(bcpCredit?.parseEnabled === false && bcpCredit.adapterLifecycle === 'FORMAT_OBSERVED', 'BCP_CREDIT_MUST_QUARANTINE');
assert(ripleyCredit?.parseEnabled === false && ripleyCredit.adapterLifecycle === 'FORMAT_OBSERVED', 'RIPLEY_CREDIT_MUST_QUARANTINE');
assert(!Object.keys(ALPHA2_B_PROFILE_BINDINGS_V1).some(id => id.includes('INTERBANK')), 'INTERBANK_GMAIL_BINDING_PREMATURE');

for (const marker of [
  'StatementCandidateState.STRONG',
  'downloadEligible !== true',
  'PROFILE_MATCH_UNIQUE',
  'DOWNLOAD_ELIGIBLE',
  'fetchGmailStatementAttachment',
  'PDF_HEADER',
  'ALPHA2_B_PROFILE_DRIFT_QUARANTINED',
  'explicitReuseConsent',
  'crossInstitutionReuse: false',
  'attachmentBytes.fill(0)'
]) {
  assert(source.includes(marker), `SOURCE_MARKER:${marker}`);
}

for (const forbidden of [
  'console.log(',
  'writeFile(',
  'writeFileSync(',
  'localStorage',
  'sessionStorage',
  'genericStatementParser',
  'ocr(',
  'body.data ='
]) {
  assert(!source.includes(forbidden), `FORBIDDEN_SOURCE:${forbidden}`);
}

assert(/BUILD_READY\s+NO/.test(status), 'GLOBAL_BUILD_READY_STATUS');

console.log('ALPHA2_B_STATIC_CANDIDATE=PASS');
console.log('UPSTREAM_ALPHA2_A=STATIC_IMPLEMENTED_CI_PASS');
console.log('NON_STRONG_ATTACHMENT_FETCH=0');
console.log('UNKNOWN_OR_QUARANTINED_PROFILE_FETCH=0');
console.log('PASSWORD_DURABLE_STORAGE=0');
console.log('RAW_PDF_DURABLE_WRITES=0');
console.log('PLAINTEXT_DURABLE_WRITES=0');
console.log('INTERBANK_GMAIL_IDENTITY=PENDING');
console.log('PHYSICAL_PROFILE_PASS=0');
console.log('BUILD_READY=NO');
