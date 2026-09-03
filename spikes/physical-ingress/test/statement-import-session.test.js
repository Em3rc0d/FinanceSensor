import test from 'node:test';
import assert from 'node:assert/strict';
import { importStatementSession, statementSessionPublicSummary } from '../src/statement-import-session.js';
import { StatementSourceClass, StatementProviderProfile } from '../src/statement-source-adapters.js';

const classification = {
  sourceClass: StatementSourceClass.DEBIT_STATEMENT_MANUAL_REQUEST,
  providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED
};

test('statement password and plaintext never enter returned derived evidence', async () => {
  const password = 'LOCAL-ONLY-SYNTHETIC-PASSWORD';
  const raw = Buffer.from('encrypted synthetic bytes');
  const evidence = await importStatementSession({
    encryptedPdfBytes: raw,
    password,
    sourceMessageId: 'synthetic-message-1',
    attachmentIdentity: 'synthetic-attachment-1',
    statementClassification: classification,
    decryptAndExtractText: async ({ password: received }) => {
      assert.equal(received, password);
      return '01/09/2026 ABONO S/ 250.00';
    },
    parseStatementText: async () => [{
      tenantId: 'tenant-synthetic',
      amount: 250,
      currency: 'PEN',
      direction: 'IN',
      occurredAt: '2026-09-01T12:00:00Z',
      rawMerchant: 'Abono de prueba',
      confidence: 0.95,
      bodySnippet: 'abono'
    }]
  });

  const serialized = JSON.stringify(evidence);
  assert.equal(serialized.includes(password), false);
  assert.equal(serialized.includes('01/09/2026 ABONO S/ 250.00'), false);
  assert.equal(evidence[0].direction, 'IN');
  assert.equal(evidence[0].sourceType, 'BANK_STATEMENT');
  assert.match(evidence[0].sourceArtifactId, /^stmt_[a-f0-9]{64}:0$/);
  assert.equal(raw.every(byte => byte === 0), true);
});

test('public statement summary cannot carry password, raw pdf or plaintext', () => {
  const summary = statementSessionPublicSummary({ classification, evidence: [{ amount: 1 }] });
  assert.deepEqual(summary, {
    sourceClass: StatementSourceClass.DEBIT_STATEMENT_MANUAL_REQUEST,
    providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED,
    evidenceCount: 1,
    passwordPersisted: false,
    rawPdfPersisted: false,
    plaintextPersisted: false
  });
});

test('failed decrypt still zeroes owned encrypted buffer and returns no password detail', async () => {
  const raw = Buffer.from('synthetic encrypted bytes');
  await assert.rejects(
    importStatementSession({
      encryptedPdfBytes: raw,
      password: 'wrong-synthetic-password',
      sourceMessageId: 'message',
      attachmentIdentity: 'attachment',
      statementClassification: classification,
      decryptAndExtractText: async () => { throw new Error('PDF_PASSWORD_REJECTED'); },
      parseStatementText: async () => []
    }),
    /PDF_PASSWORD_REJECTED/
  );
  assert.equal(raw.every(byte => byte === 0), true);
});
