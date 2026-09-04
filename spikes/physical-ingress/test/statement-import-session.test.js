import test from 'node:test';
import assert from 'node:assert/strict';
import {
  importStatementLayoutSession,
  importStatementSession,
  statementSessionPublicSummary
} from '../src/statement-import-session.js';
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

test('layout session returns only derived evidence and aggregate page count', async () => {
  const password = 'LOCAL-ONLY-SYNTHETIC-PASSWORD';
  const raw = Buffer.from('encrypted synthetic layout');
  const result = await importStatementLayoutSession({
    encryptedPdfBytes: raw,
    password,
    sourceMessageId: 'synthetic-layout-message',
    attachmentIdentity: 'synthetic-layout-attachment',
    statementClassification: classification,
    decryptAndExtractLayout: async ({ password: received }) => {
      assert.equal(received, password);
      return {
        pages: [{
          pageNumber: 1,
          items: [{ text: 'PRIVATE TRANSIENT SYNTHETIC TEXT', x: 10, y: 20, width: 30, height: 10 }]
        }]
      };
    },
    parseStatementLayout: async ({ pages }) => {
      assert.equal(pages.length, 1);
      return {
        rows: [{
          tenantId: 'tenant-synthetic',
          amount: 75,
          currency: 'PEN',
          direction: 'IN',
          occurredAt: '2026-09-02T12:00:00Z',
          rawMerchant: 'Synthetic income',
          confidence: 0.92
        }],
        review: []
      };
    }
  });

  assert.equal(result.evidence.length, 1);
  assert.equal(result.pageCount, 1);
  assert.equal(result.reviewCount, 0);
  assert.equal(result.reconciliation, null);
  assert.equal(JSON.stringify(result).includes(password), false);
  assert.equal(JSON.stringify(result).includes('PRIVATE TRANSIENT SYNTHETIC TEXT'), false);
  assert.equal(raw.every(byte => byte === 0), true);
});

test('layout session can run a transient safe reconciliation before dropping private layout scope', async () => {
  const password = 'LOCAL-ONLY-SYNTHETIC-PASSWORD';
  const raw = Buffer.from('encrypted synthetic audit layout');
  const privateMarker = 'PRIVATE BALANCE MARKER';
  const result = await importStatementLayoutSession({
    encryptedPdfBytes: raw,
    password,
    sourceMessageId: 'synthetic-audit-message',
    attachmentIdentity: 'synthetic-audit-attachment',
    statementClassification: classification,
    decryptAndExtractLayout: async () => ({
      pages: [{ pageNumber: 1, items: [{ text: privateMarker, x: 10, y: 20, width: 20, height: 10 }] }]
    }),
    parseStatementLayout: async () => ({
      rows: [{
        tenantId: 'tenant-synthetic',
        amount: 10,
        currency: 'PEN',
        direction: 'OUT',
        balanceEffect: 'DECREASE',
        cashflowDirection: 'OUTFLOW',
        occurredAt: '2026-09-02T12:00:00Z',
        rawMerchant: 'Synthetic expense'
      }],
      review: []
    }),
    reconcileStatementLayout: async ({ pages, rows, classification: receivedClassification }) => {
      assert.equal(pages[0].items[0].text, privateMarker);
      assert.equal(rows.length, 1);
      assert.equal(receivedClassification.providerProfile, StatementProviderProfile.BCP_SAVINGS_REQUESTED);
      return {
        status: 'PASS',
        code: 'STMT_AUDIT_PASS',
        movementRows: 1,
        checks: { balanceEquationExact: true }
      };
    }
  });

  assert.deepEqual(result.reconciliation, {
    status: 'PASS',
    code: 'STMT_AUDIT_PASS',
    movementRows: 1,
    checks: { balanceEquationExact: true }
  });
  assert.equal(JSON.stringify(result).includes(privateMarker), false);
  assert.equal(JSON.stringify(result).includes(password), false);
  assert.equal(raw.every(byte => byte === 0), true);
});

test('layout review fails closed and exposes only a compact structural diagnostic', async () => {
  const raw = Buffer.from('encrypted synthetic layout');
  await assert.rejects(
    importStatementLayoutSession({
      encryptedPdfBytes: raw,
      password: 'synthetic-password',
      sourceMessageId: 'message',
      attachmentIdentity: 'attachment',
      statementClassification: classification,
      decryptAndExtractLayout: async () => ({ pages: [{ pageNumber: 1, items: [] }] }),
      parseStatementLayout: async () => ({
        rows: [{ tenantId: 'tenant', amount: 10, currency: 'PEN', direction: 'OUT', occurredAt: '2026-09-01T12:00:00Z' }],
        review: [{ code: 'STATEMENT_ROW_BOTH_DEBIT_CREDIT' }]
      })
    }),
    error => error.code === 'STMT_ROW_BOTH_SIDES' && error.message === 'STATEMENT_LAYOUT_REVIEW_REQUIRED'
  );
  assert.equal(raw.every(byte => byte === 0), true);
});

test('layout with no movement rows fails closed with a compact local diagnostic', async () => {
  await assert.rejects(
    importStatementLayoutSession({
      encryptedPdfBytes: Buffer.from('encrypted synthetic layout'),
      password: 'synthetic-password',
      sourceMessageId: 'message',
      attachmentIdentity: 'attachment',
      statementClassification: classification,
      decryptAndExtractLayout: async () => ({ pages: [{ pageNumber: 1, items: [{ text: 'header only' }] }] }),
      parseStatementLayout: async () => ({ rows: [], review: [] })
    }),
    error => error.code === 'STMT_NO_MOVEMENTS' && error.message === 'STATEMENT_LAYOUT_NO_MOVEMENTS'
  );
});

test('public statement summary cannot carry password, raw pdf or plaintext', () => {
  const summary = statementSessionPublicSummary({ classification, evidence: [{ amount: 1 }], pageCount: 2 });
  assert.deepEqual(summary, {
    sourceClass: StatementSourceClass.DEBIT_STATEMENT_MANUAL_REQUEST,
    providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED,
    evidenceCount: 1,
    pageCount: 2,
    passwordPersisted: false,
    rawPdfPersisted: false,
    plaintextPersisted: false,
    layoutPlaintextPersisted: false
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
