import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Alpha2BError,
  fetchAndParseStrongStatement,
  fetchAndParseStrongStatementGroup,
  planStatementUnlockGroups
} from '../src/statement-fetch-parse.js';
import { StatementProviderProfile } from '../src/statement-source-adapters.js';

const pdfBytes = Buffer.from('%PDF-1.7\nSYNTHETIC-ONLY');

function candidate({
  messageId = 'message-1',
  attachmentId = 'attachment-1',
  profileId = 'PE-BCP-SAVINGS-REQUESTED-DISCOVERY-V1',
  decision = 'STRONG',
  downloadEligible = true,
  reasonCodes = ['DOWNLOAD_ELIGIBLE', 'PROFILE_MATCH_UNIQUE'],
  requiresLocalPassword = true
} = {}) {
  return {
    sourceKey: `STATEMENT_DISCOVERY_V1:${encodeURIComponent(messageId)}:${encodeURIComponent(attachmentId)}`,
    messageId,
    attachmentId,
    profileId,
    decision,
    downloadEligible,
    reasonCodes,
    requiresLocalPassword
  };
}

function providerFor(bytes = pdfBytes, { onRequest = null } = {}) {
  const calls = [];
  return {
    calls,
    async _request(path) {
      calls.push(path);
      onRequest?.();
      return { data: Buffer.from(bytes).toString('base64url') };
    }
  };
}

function bcpLayout() {
  const texts = [
    'Estado de Cuenta de Ahorros Cuenta Digital BCP',
    'FECHA PROC.',
    'FECHA VALOR',
    'DESCRIPCION',
    'CARGOS / DEBE',
    'ABONOS / HABER'
  ];
  return {
    pages: [{
      pageNumber: 1,
      items: texts.map((text, index) => ({ text, x: 20 + index * 70, y: 700, width: 60, height: 10 }))
    }]
  };
}

function safeRuntime({ layout = bcpLayout(), onExtract = null, onParse = null } = {}) {
  return {
    async extractLayout() {
      onExtract?.();
      return structuredClone(layout);
    },
    async parseLayout({ providerProfile, tenantId, accountId }) {
      onParse?.({ providerProfile, tenantId, accountId });
      return {
        rows: [{
          tenantId,
          accountId,
          amount: 25,
          currency: 'PEN',
          direction: 'OUT',
          balanceEffect: 'DECREASE',
          cashflowDirection: 'OUTFLOW',
          semanticType: 'UNKNOWN',
          occurredAt: '2026-09-01T12:00:00.000Z',
          rawMerchant: 'Synthetic merchant',
          confidence: 0.92
        }],
        review: []
      };
    }
  };
}

const baseInput = ({ provider, candidateValue = candidate(), runtime = safeRuntime(), signal = null } = {}) => ({
  provider,
  candidate: candidateValue,
  password: 'LOCAL-SYNTHETIC-PASSWORD',
  tenantId: 'tenant-synthetic',
  accountId: 'account-synthetic',
  runtime,
  signal
});

test('non-STRONG candidates never reach the attachment endpoint', async () => {
  const provider = providerFor();
  await assert.rejects(
    fetchAndParseStrongStatement(baseInput({
      provider,
      candidateValue: candidate({ decision: 'PROBABLE', downloadEligible: false })
    })),
    error => error instanceof Alpha2BError && error.code === 'ALPHA2_B_STRONG_GATE_REQUIRED'
  );
  assert.equal(provider.calls.length, 0);
});

test('candidate source identity mismatch fails before attachment fetch', async () => {
  const provider = providerFor();
  const value = candidate();
  value.sourceKey = 'STATEMENT_DISCOVERY_V1:other:identity';
  await assert.rejects(
    fetchAndParseStrongStatement(baseInput({ provider, candidateValue: value })),
    error => error.code === 'ALPHA2_B_SOURCE_IDENTITY_MISMATCH'
  );
  assert.equal(provider.calls.length, 0);
});

test('FORMAT_OBSERVED credit profiles remain quarantined and are not downloaded', async () => {
  for (const profileId of [
    'PE-BCP-CREDIT-MONTHLY-DISCOVERY-V1',
    'PE-RIPLEY-CREDIT-MONTHLY-DISCOVERY-V1'
  ]) {
    const provider = providerFor();
    await assert.rejects(
      fetchAndParseStrongStatement(baseInput({ provider, candidateValue: candidate({ profileId }) })),
      error => error.code === 'ALPHA2_B_PROFILE_QUARANTINED'
    );
    assert.equal(provider.calls.length, 0);
  }
});

test('unknown discovery profile remains quarantined before fetch', async () => {
  const provider = providerFor();
  await assert.rejects(
    fetchAndParseStrongStatement(baseInput({
      provider,
      candidateValue: candidate({ profileId: 'PE-UNKNOWN-DISCOVERY-V1' })
    })),
    error => error.code === 'ALPHA2_B_PROFILE_UNKNOWN'
  );
  assert.equal(provider.calls.length, 0);
});

test('BCP savings STRONG candidate fetches once and returns derived-only evidence', async () => {
  const provider = providerFor();
  let parsedProfile = null;
  const runtime = safeRuntime({
    onParse: ({ providerProfile }) => { parsedProfile = providerProfile; }
  });
  const value = candidate();
  const result = await fetchAndParseStrongStatement(baseInput({ provider, candidateValue: value, runtime }));

  assert.equal(provider.calls.length, 1);
  assert.match(provider.calls[0], /\/messages\/message-1\/attachments\/attachment-1$/);
  assert.equal(parsedProfile, StatementProviderProfile.BCP_SAVINGS_REQUESTED);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.summary.providerProfile, StatementProviderProfile.BCP_SAVINGS_REQUESTED);
  assert.equal(result.summary.profileVersion, '1.0.0-static');
  assert.equal(result.summary.passwordPersisted, false);
  assert.equal(result.summary.rawPdfPersisted, false);
  assert.equal(result.summary.plaintextPersisted, false);
  assert.equal(result.summary.sourceIdentityPersisted, false);
  assert.equal(result.summary.physicalProfilePassClaimed, false);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('LOCAL-SYNTHETIC-PASSWORD'), false);
  assert.equal(serialized.includes('message-1'), false);
  assert.equal(serialized.includes('attachment-1'), false);
});

test('PDF filename/MIME trust cannot bypass byte signature validation', async () => {
  const provider = providerFor(Buffer.from('NOT-A-PDF-SYNTHETIC'));
  let extracted = false;
  await assert.rejects(
    fetchAndParseStrongStatement(baseInput({
      provider,
      runtime: safeRuntime({ onExtract: () => { extracted = true; } })
    })),
    error => error.code === 'ALPHA2_B_PDF_SIGNATURE_INVALID'
  );
  assert.equal(provider.calls.length, 1);
  assert.equal(extracted, false);
});

test('profile marker drift is quarantined before row parsing', async () => {
  const provider = providerFor();
  let parsed = false;
  await assert.rejects(
    fetchAndParseStrongStatement(baseInput({
      provider,
      runtime: safeRuntime({
        layout: { pages: [{ pageNumber: 1, items: [{ text: 'UNKNOWN SYNTHETIC DOCUMENT' }] }] },
        onParse: () => { parsed = true; }
      })
    })),
    error => error.code === 'ALPHA2_B_PROFILE_DRIFT_QUARANTINED'
  );
  assert.equal(parsed, false);
});

test('password failure is sanitized and never echoes password material', async () => {
  const provider = providerFor();
  const secret = 'NEVER-ECHO-THIS-SYNTHETIC-PASSWORD';
  const input = baseInput({
    provider,
    runtime: {
      async extractLayout() {
        const error = new Error(`provider detail ${secret}`);
        error.code = 'PDF_PASSWORD_REJECTED';
        throw error;
      },
      async parseLayout() { return { rows: [], review: [] }; }
    }
  });
  input.password = secret;
  await assert.rejects(
    fetchAndParseStrongStatement(input),
    error => error.code === 'ALPHA2_B_PASSWORD_REJECTED' && !String(error.message).includes(secret)
  );
});

test('abort after attachment response stops before parse', async () => {
  const controller = new AbortController();
  const provider = providerFor(pdfBytes, { onRequest: () => controller.abort() });
  let extracted = false;
  await assert.rejects(
    fetchAndParseStrongStatement(baseInput({
      provider,
      signal: controller.signal,
      runtime: safeRuntime({ onExtract: () => { extracted = true; } })
    })),
    error => error.code === 'ALPHA2_B_SESSION_ABORTED'
  );
  assert.equal(provider.calls.length, 1);
  assert.equal(extracted, false);
});

test('unlock grouping exposes only aggregate scope and skips quarantined profiles', () => {
  const groups = planStatementUnlockGroups([
    candidate({ messageId: 'm1', attachmentId: 'a1' }),
    candidate({ messageId: 'm2', attachmentId: 'a2' }),
    candidate({ messageId: 'm3', attachmentId: 'a3', profileId: 'PE-BCP-CREDIT-MONTHLY-DISCOVERY-V1' })
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0], {
    groupId: 'BCP:BCP_SAVINGS_REQUESTED:1.0.0-static',
    institution: 'BCP',
    providerProfile: 'BCP_SAVINGS_REQUESTED',
    profileVersion: '1.0.0-static',
    candidateCount: 2,
    requiresExplicitReuseConsent: true,
    crossInstitutionReuse: false,
    durablePasswordStorage: false
  });
  const serialized = JSON.stringify(groups);
  assert.equal(serialized.includes('m1'), false);
  assert.equal(serialized.includes('a1'), false);
});

test('multi-document password reuse is blocked unless explicitly consented', async () => {
  const provider = providerFor();
  const candidates = [
    candidate({ messageId: 'm1', attachmentId: 'a1' }),
    candidate({ messageId: 'm2', attachmentId: 'a2' })
  ];
  await assert.rejects(
    fetchAndParseStrongStatementGroup({
      provider,
      candidates,
      password: 'LOCAL-SYNTHETIC-PASSWORD',
      tenantId: 'tenant-synthetic',
      runtime: safeRuntime()
    }),
    error => error.code === 'ALPHA2_B_PASSWORD_REUSE_CONSENT_REQUIRED'
  );
  assert.equal(provider.calls.length, 0);
});

test('explicit same-scope reuse parses sequentially without persisting password', async () => {
  const provider = providerFor();
  const result = await fetchAndParseStrongStatementGroup({
    provider,
    candidates: [
      candidate({ messageId: 'm1', attachmentId: 'a1' }),
      candidate({ messageId: 'm2', attachmentId: 'a2' })
    ],
    password: 'LOCAL-SYNTHETIC-PASSWORD',
    tenantId: 'tenant-synthetic',
    explicitReuseConsent: true,
    runtime: safeRuntime()
  });
  assert.equal(provider.calls.length, 2);
  assert.equal(result.parsedCount, 2);
  assert.equal(result.evidenceCount, 2);
  assert.equal(result.passwordPersisted, false);
  assert.equal(result.passwordReuseWasExplicit, true);
  assert.equal(result.crossInstitutionReuse, false);
  assert.equal(JSON.stringify(result).includes('LOCAL-SYNTHETIC-PASSWORD'), false);
});
