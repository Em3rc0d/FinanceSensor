import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATEMENT_DISCOVERY_PROFILES_V1,
  StatementCandidateState,
  buildStatementCandidateInventory,
  classifyStatementCandidate,
  discoverStatementCandidates,
  planStatementDiscoveryQueries,
  validateDiscoveryProfiles
} from '../src/statement-discovery.js';

const NOW = Date.parse('2026-09-05T12:00:00Z');

const bcpCreditMessage = (overrides = {}) => ({
  id: 'message-bcp-credit',
  headers: {
    From: 'BCP <estado@notificacionesbcp.com.pe>',
    Subject: 'Estado de cuenta de tu tarjeta Visa',
    Date: 'Fri, 04 Sep 2026 12:00:00 +0000'
  },
  ...overrides
});

const pdfAttachment = (overrides = {}) => ({
  attachmentId: 'attachment-bcp-credit',
  filename: 'EECC_VISA.pdf',
  mimeType: 'application/pdf',
  size: 400_000,
  inline: false,
  contentId: null,
  ...overrides
});

test('frozen profile registry is valid and contains only allowlisted supported discovery families', () => {
  assert.equal(validateDiscoveryProfiles(), true);
  assert.deepEqual(
    STATEMENT_DISCOVERY_PROFILES_V1.map(profile => profile.institution),
    ['BCP', 'BCP', 'BANCO_RIPLEY']
  );
  assert.ok(STATEMENT_DISCOVERY_PROFILES_V1.every(profile => profile.senderDomains.length > 0));
});

test('query planner emits targeted PDF queries with a hard 730-day ceiling and excludes spam/trash', () => {
  const plans = planStatementDiscoveryQueries({ now: NOW, historyDays: 50_000 });
  assert.equal(plans.length, 3);
  for (const plan of plans) {
    assert.match(plan.query, /from:/);
    assert.match(plan.query, /subject:/);
    assert.match(plan.query, /has:attachment filename:pdf/);
    assert.match(plan.query, /after:2024\/09\/05 before:2026\/09\/06/);
    assert.equal(plan.includeSpamTrash, false);
    assert.equal(plan.historyDays, 730);
  }
});

test('known sender, statement subject, exact filename and PDF descriptor produce a strong candidate', () => {
  const candidate = classifyStatementCandidate({
    message: bcpCreditMessage(),
    attachment: pdfAttachment(),
    now: NOW
  });
  assert.equal(candidate.decision, StatementCandidateState.STRONG);
  assert.equal(candidate.profileId, 'PE-BCP-CREDIT-MONTHLY-DISCOVERY-V1');
  assert.equal(candidate.score, 100);
  assert.equal(candidate.downloadEligible, true);
  assert.equal(candidate.requiresLocalPassword, true);
  assert.ok(candidate.reasonCodes.includes('PROFILE_MATCH_UNIQUE'));
  assert.ok(candidate.reasonCodes.includes('DOWNLOAD_ELIGIBLE'));
});

test('unknown sender is rejected even when subject, filename and MIME look correct', () => {
  const candidate = classifyStatementCandidate({
    message: bcpCreditMessage({ headers: { ...bcpCreditMessage().headers, From: 'spoof@example.invalid' } }),
    attachment: pdfAttachment(),
    now: NOW
  });
  assert.equal(candidate.decision, StatementCandidateState.REJECTED);
  assert.equal(candidate.downloadEligible, false);
  assert.ok(candidate.reasonCodes.includes('UNKNOWN_SENDER'));
});

test('octet-stream descriptor is rejected before any attachment-byte fetch', () => {
  const candidate = classifyStatementCandidate({
    message: bcpCreditMessage(),
    attachment: pdfAttachment({ mimeType: 'application/octet-stream' }),
    now: NOW
  });
  assert.equal(candidate.decision, StatementCandidateState.REJECTED);
  assert.equal(candidate.downloadEligible, false);
  assert.ok(candidate.reasonCodes.includes('NON_PDF_DESCRIPTOR'));
});

test('empty and oversized attachments fail closed', () => {
  for (const [size, reason] of [[0, 'EMPTY_ATTACHMENT'], [20_971_521, 'ATTACHMENT_TOO_LARGE']]) {
    const candidate = classifyStatementCandidate({
      message: bcpCreditMessage(),
      attachment: pdfAttachment({ size }),
      now: NOW
    });
    assert.equal(candidate.decision, StatementCandidateState.REJECTED);
    assert.equal(candidate.downloadEligible, false);
    assert.ok(candidate.reasonCodes.includes(reason));
  }
});

test('invalid attachment sizes and invalid configured size limits fail closed', () => {
  for (const size of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5, 'not-a-number']) {
    const candidate = classifyStatementCandidate({
      message: bcpCreditMessage(),
      attachment: pdfAttachment({ size }),
      now: NOW
    });
    assert.equal(candidate.decision, StatementCandidateState.REJECTED);
    assert.equal(candidate.downloadEligible, false);
    assert.ok(candidate.reasonCodes.includes('ATTACHMENT_SIZE_INVALID'));
  }
  assert.throws(
    () => classifyStatementCandidate({
      message: bcpCreditMessage(),
      attachment: pdfAttachment(),
      maximumAttachmentBytes: Number.NaN,
      now: NOW
    }),
    /STATEMENT_CANDIDATE_SIZE_LIMIT_INVALID/
  );
});

test('revoked authority rejects an otherwise strong candidate', () => {
  const candidate = classifyStatementCandidate({
    message: bcpCreditMessage(),
    attachment: pdfAttachment(),
    authorityActive: false,
    now: NOW
  });
  assert.equal(candidate.decision, StatementCandidateState.REJECTED);
  assert.ok(candidate.reasonCodes.includes('AUTHORITY_REVOKED'));
});

test('inline PDF descriptor is rejected even when all textual markers match', () => {
  const candidate = classifyStatementCandidate({
    message: bcpCreditMessage(),
    attachment: pdfAttachment({ inline: true, contentId: 'statement-inline' }),
    now: NOW
  });
  assert.equal(candidate.decision, StatementCandidateState.REJECTED);
  assert.equal(candidate.downloadEligible, false);
  assert.ok(candidate.reasonCodes.includes('INLINE_ATTACHMENT'));
});

test('overlapping profile identities produce conflict instead of arbitrary parser selection', () => {
  const duplicateProfiles = [
    STATEMENT_DISCOVERY_PROFILES_V1[0],
    { ...STATEMENT_DISCOVERY_PROFILES_V1[0], id: 'SYNTHETIC-CONFLICT-PROFILE' }
  ];
  const candidate = classifyStatementCandidate({
    message: bcpCreditMessage(),
    attachment: pdfAttachment(),
    profiles: duplicateProfiles,
    now: NOW
  });
  assert.equal(candidate.decision, StatementCandidateState.CONFLICT);
  assert.equal(candidate.downloadEligible, false);
  assert.ok(candidate.reasonCodes.includes('PROFILE_MATCH_CONFLICT'));
});

test('candidate projection excludes raw sender, subject and filename values', () => {
  const candidate = classifyStatementCandidate({ message: bcpCreditMessage(), attachment: pdfAttachment(), now: NOW });
  assert.equal('from' in candidate, false);
  assert.equal('subject' in candidate, false);
  assert.equal('filename' in candidate, false);
  assert.equal(JSON.stringify(candidate).includes('estado@notificacionesbcp.com.pe'), false);
  assert.equal(JSON.stringify(candidate).includes('Estado de cuenta de tu tarjeta Visa'), false);
  assert.equal(JSON.stringify(candidate).includes('EECC_VISA.pdf'), false);
});

test('inventory exposes only aggregate states and profile counts', () => {
  const strong = classifyStatementCandidate({ message: bcpCreditMessage(), attachment: pdfAttachment(), now: NOW });
  const rejected = classifyStatementCandidate({
    message: bcpCreditMessage({ headers: { ...bcpCreditMessage().headers, From: 'x@example.invalid' } }),
    attachment: pdfAttachment({ attachmentId: 'rejected' }),
    now: NOW
  });
  const inventory = buildStatementCandidateInventory([strong, rejected]);
  assert.equal(inventory.candidates, 2);
  assert.equal(inventory.downloadEligible, 1);
  assert.equal(inventory.stateCounts.STRONG, 1);
  assert.equal(inventory.stateCounts.REJECTED, 1);
});

test('discovery gates on METADATA, uses body-free MIME projection, deduplicates overlap and never fetches attachment bytes', async () => {
  const calls = [];
  const provider = {
    async listMessagePage(args) {
      calls.push({ method: 'listMessagePage', ...args });
      return { messages: [{ id: 'message-bcp-credit' }], nextPageToken: null };
    },
    async getMessage(args) {
      calls.push({ method: 'getMessage', ...args });
      return args.format === 'METADATA'
        ? { ...bcpCreditMessage(), attachments: [] }
        : { ...bcpCreditMessage(), attachments: [pdfAttachment()] };
    },
    async fetchAttachment() {
      throw new Error('ATTACHMENT_FETCH_MUST_NOT_RUN_IN_ALPHA2_A');
    }
  };

  const result = await discoverStatementCandidates({ provider, now: NOW });
  assert.equal(result.plans.length, 3);
  assert.equal(result.queryReceipts.length, 3);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.inventory.downloadEligible, 1);
  assert.equal(calls.filter(call => call.method === 'getMessage').length, 2);
  assert.equal(calls.findIndex(call => call.method === 'getMessage' && call.format === 'METADATA') < calls.findIndex(call => call.method === 'getMessage' && call.descriptorOnly), true);
  assert.equal(calls.filter(call => call.method === 'getMessage' && call.descriptorOnly === true).length, 1);
  assert.ok(calls.filter(call => call.method === 'listMessagePage').every(call => call.includeSpamTrash === false));
  assert.equal(calls.some(call => String(call.path ?? '').includes('/attachments/')), false);
});

test('message without a known metadata signature never reaches the FULL descriptor projection', async () => {
  const calls = [];
  const provider = {
    async listMessagePage() {
      return { messages: [{ id: 'noise-message' }], nextPageToken: null };
    },
    async getMessage(args) {
      calls.push(args);
      if (args.format !== 'METADATA') throw new Error('FULL_DESCRIPTOR_PROJECTION_MUST_NOT_RUN');
      return {
        id: 'noise-message',
        headers: { From: 'noise@example.invalid', Subject: 'Unrelated', Date: 'Fri, 04 Sep 2026 12:00:00 +0000' },
        attachments: []
      };
    }
  };
  const result = await discoverStatementCandidates({ provider, now: NOW });
  assert.equal(result.candidates.length, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].format, 'METADATA');
});

test('multiple strong PDFs in one message fail closed as attachment conflict', async () => {
  const provider = {
    async listMessagePage() {
      return { messages: [{ id: 'ripley-message' }], nextPageToken: null };
    },
    async getMessage(args) {
      if (args.format === 'METADATA') return {
        id: 'ripley-message',
        headers: {
          From: 'Banco Ripley <eecc@bancoripley.com.pe>',
          Subject: 'Estado de cuenta Banco Ripley',
          Date: 'Fri, 04 Sep 2026 12:00:00 +0000'
        },
        attachments: []
      };
      return {
        id: 'ripley-message',
        headers: {
          From: 'Banco Ripley <eecc@bancoripley.com.pe>',
          Subject: 'Estado de cuenta Banco Ripley',
          Date: 'Fri, 04 Sep 2026 12:00:00 +0000'
        },
        attachments: [
          pdfAttachment({ attachmentId: 'ripley-a', filename: 'estado-a.pdf' }),
          pdfAttachment({ attachmentId: 'ripley-b', filename: 'estado-b.pdf' })
        ]
      };
    }
  };
  const result = await discoverStatementCandidates({ provider, now: NOW });
  assert.equal(result.candidates.length, 2);
  assert.ok(result.candidates.every(candidate => candidate.decision === StatementCandidateState.CONFLICT));
  assert.ok(result.candidates.every(candidate => candidate.reasonCodes.includes('MULTIPLE_STRONG_ATTACHMENTS')));
  assert.equal(result.inventory.downloadEligible, 0);
});

test('duplicate attachment descriptors emit one candidate per stable source key', async () => {
  const provider = {
    async listMessagePage() {
      return { messages: [{ id: 'message-bcp-credit' }], nextPageToken: null };
    },
    async getMessage(args) {
      return args.format === 'METADATA'
        ? { ...bcpCreditMessage(), attachments: [] }
        : { ...bcpCreditMessage(), attachments: [pdfAttachment(), { ...pdfAttachment() }] };
    }
  };
  const result = await discoverStatementCandidates({ provider, now: NOW });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.inventory.downloadEligible, 1);
});

test('previous terminal source key is skipped idempotently without attachment fetch', async () => {
  let metadataCalls = 0;
  const provider = {
    async listMessagePage() {
      return { messages: [{ id: 'message-bcp-credit' }], nextPageToken: null };
    },
    async getMessage(args) {
      metadataCalls += 1;
      return args.format === 'METADATA'
        ? { ...bcpCreditMessage(), attachments: [] }
        : { ...bcpCreditMessage(), attachments: [pdfAttachment()] };
    }
  };
  const terminalSourceKeys = ['STATEMENT_DISCOVERY_V1:message-bcp-credit:attachment-bcp-credit'];
  const result = await discoverStatementCandidates({ provider, now: NOW, terminalSourceKeys });
  assert.equal(metadataCalls, 2);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.skippedTerminal, 1);
  assert.equal(result.inventory.downloadEligible, 0);
});

test('invalid custom registry fails before any provider call', async () => {
  const invalidProfiles = [{
    id: 'INVALID',
    institution: 'BCP',
    productType: 'SAVINGS',
    statementFamily: 'X',
    senderDomains: [],
    subjectMarkers: ['statement'],
    filenamePatterns: [/\.pdf$/]
  }];
  await assert.rejects(
    discoverStatementCandidates({
      provider: { listMessagePage() { throw new Error('MUST_NOT_RUN'); }, getMessage() {} },
      profiles: invalidProfiles,
      now: NOW
    }),
    /STATEMENT_DISCOVERY_PROFILE_SENDERS_EMPTY/
  );
});
