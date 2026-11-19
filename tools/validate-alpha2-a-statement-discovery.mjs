import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const [graphText, source, provider, tests, packageText] = await Promise.all([
  read('graph/alpha2-a-statement-discovery.json'),
  read('spikes/physical-ingress/src/statement-discovery.js'),
  read('spikes/physical-ingress/src/gmail-rest-provider.js'),
  read('spikes/physical-ingress/test/statement-discovery.test.js'),
  read('spikes/physical-ingress/package.json')
]);
const graph = JSON.parse(graphText);
const packageJson = JSON.parse(packageText);

assert.equal(graph.schemaVersion, 1);
assert.equal(graph.slice, 'ALPHA_2_A_STATEMENT_DISCOVERY');
assert.equal(graph.status, 'STATIC_IMPLEMENTED_CI_PASS');
assert.equal(graph.designAuthority, 'graph/alpha2-design-freeze.json');
assert.equal(graph.implementation.productPromotion, false);
assert.equal(graph.implementation.physicalExecution, false);
assert.equal(graph.implementation.gmailScopeChanged, false);
assert.equal(graph.implementation.attachmentBytesFetched, false);
assert.equal(graph.implementation.messageBodyDataRequested, false);
assert.equal(graph.implementation.pdfRuntimeInvoked, false);
assert.equal(graph.implementation.passwordRequested, false);
assert.equal(graph.implementation.vaultMutation, false);
assert.equal(graph.implementation.iosTouched, false);
assert.equal(graph.registry.version, 1);
assert.equal(graph.registry.profiles.length, 3);
assert.equal(graph.registry.genericProfile, false);
assert.equal(graph.queryPlanner.knownSenderRequired, true);
assert.equal(graph.queryPlanner.statementSubjectMarkerRequired, true);
assert.equal(graph.queryPlanner.historyDaysHardMaximum, 730);
assert.equal(graph.queryPlanner.spamTrashIncluded, false);
assert.equal(graph.queryPlanner.metadataHeaderGateBeforeMimeProjection, true);
assert.equal(graph.queryPlanner.mimeProjectionFormat, 'FULL_WITH_PARTIAL_RESPONSE_FIELDS');
assert.equal(graph.queryPlanner.mimeProjectionBodyDataSelected, false);
assert.equal(graph.candidateGate.downloadEligibleState, 'STRONG');
assert.equal(graph.candidateGate.maximumAttachmentBytes, 20_971_520);
assert.equal(graph.candidateGate.invalidAttachmentSizeRejected, true);
assert.equal(graph.candidateGate.profileConflictFailsClosed, true);
assert.equal(graph.candidateGate.inlineAttachmentRejected, true);
assert.equal(graph.candidateGate.multipleStrongAttachmentsFailClosed, true);
assert.equal(graph.candidateGate.rawSenderInProjection, false);
assert.equal(graph.candidateGate.rawSubjectInProjection, false);
assert.equal(graph.candidateGate.rawFilenameInProjection, false);
assert.equal(graph.inventory.sourceMessageDeduplication, true);
assert.equal(graph.inventory.sourceAttachmentDeduplication, true);
assert.equal(graph.inventory.terminalSourceKeyIdempotency, true);
assert.equal(graph.inventory.rawMetadataDurable, false);
assert.equal(graph.tests.syntheticOnly, true);
assert.equal(graph.tests.realGmail, false);
assert.equal(graph.tests.realFinancialData, false);
assert.match(graph.ciEvidence.verifiedHeadSha, /^[0-9a-f]{40}$/);
assert.match(graph.ciEvidence.mergedCommitSha, /^[0-9a-f]{40}$/);
assert.equal(Object.keys(graph.ciEvidence.workflowRuns).length, 4);
assert.equal(graph.ciEvidence.allConclusions, 'SUCCESS');
assert.equal(graph.openGates.includes('CI_EXACT_SHA'), false);
assert.equal(graph.buildReady, false);

for (const marker of [
  'STATEMENT_DISCOVERY_PROFILES_V1',
  'planStatementDiscoveryQueries',
  'classifyStatementCandidate',
  'buildStatementCandidateInventory',
  'discoverStatementCandidates',
  "format: 'METADATA'",
  "format: 'FULL'",
  'descriptorOnly: true',
  "includeSpamTrash: false"
]) assert.ok(source.includes(marker), `statement discovery source missing ${marker}`);

assert.equal(source.includes('fetchGmailStatementAttachment'), false);
assert.equal(source.includes('/attachments/'), false);
assert.ok(provider.includes('GMAIL_DESCRIPTOR_FIELDS'));
assert.ok(provider.includes("attachments: descriptorOnly ? collectAttachmentDescriptors(message.payload) : []"));
assert.ok(packageJson.scripts.test.includes('src/statement-discovery.js'));

for (const marker of [
  'hard 730-day ceiling',
  'produce a strong candidate',
  'unknown sender is rejected',
  'octet-stream descriptor is rejected',
  'empty and oversized attachments fail closed',
  'invalid attachment sizes and invalid configured size limits fail closed',
  'revoked authority rejects',
  'inline PDF descriptor is rejected',
  'produce conflict',
  'multiple strong PDFs in one message fail closed',
  'duplicate attachment descriptors emit one candidate per stable source key',
  'excludes raw sender, subject and filename',
  'gates on METADATA, uses body-free MIME projection, deduplicates overlap and never fetches attachment bytes',
  'message without a known metadata signature never reaches the FULL descriptor projection',
  'previous terminal source key is skipped idempotently',
  'invalid custom registry fails before any provider call'
]) assert.ok(tests.includes(marker), `statement discovery tests missing ${marker}`);

console.log('ALPHA_2_A_STATEMENT_DISCOVERY=STATIC_PASS');
console.log('DISCOVERY_PROFILES=3');
console.log('ATTACHMENT_BYTES_FETCHED=0');
console.log('RAW_METADATA_DURABLE=0');
console.log('PHYSICAL_PASS=NO');
console.log('BUILD_READY=NO');
