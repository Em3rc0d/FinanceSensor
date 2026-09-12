import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFinancialEvidence } from '../src/ingress.js';

const sanitizedTransfer = {
  id: 'gmail-shape-transfer-001',
  headers: {
    From: 'notifications@bank.example',
    Subject: 'Constancia de transferencia',
    Date: 'Tue, 01 Sep 2026 09:26:13 -0500'
  },
  body: [
    'Constancia de transferencia',
    'Código de operación',
    '12345678',
    'Fecha y hora',
    '01 Sep 2026 09:26 AM',
    'Cuenta a cargo',
    'Cuenta Simple',
    '000 0000000000',
    'Cuenta destino',
    'TEST RECIPIENT',
    '00000000000000000000',
    'Tipo de operación',
    'Transferencia inmediata',
    'Monto y moneda',
    'S/ 2,000.00',
    'Comisión',
    'S/ 0.00',
    'Monto total',
    'S/ 2000.00'
  ].join('\n'),
  attachments: []
};

test('LIVE-SHAPE-001 thousands-formatted PEN amount is parsed without truncation', () => {
  const evidence = extractFinancialEvidence(sanitizedTransfer);
  assert.ok(evidence);
  assert.equal(evidence.amount, 2000);
  assert.equal(evidence.currency, 'PEN');
});

test('LIVE-SHAPE-002 transfer receipt remains EXTERNAL_TRANSFER rather than expense/income', () => {
  const evidence = extractFinancialEvidence(sanitizedTransfer);
  assert.equal(evidence.semanticType, 'EXTERNAL_TRANSFER');
});

test('LIVE-SHAPE-003 debited-account transfer receipt preserves movement direction without inventing economic effect', () => {
  const evidence = extractFinancialEvidence(sanitizedTransfer);
  assert.equal(evidence.direction, 'OUT');
  assert.equal(evidence.semanticType, 'EXTERNAL_TRANSFER');
});

test('LIVE-SHAPE-004 bank notification sender is not fabricated into a merchant', () => {
  const evidence = extractFinancialEvidence(sanitizedTransfer);
  assert.equal(evidence.rawMerchant, null);
});

test('LIVE-SHAPE-005 explicit operation code becomes strong provider provenance', () => {
  const evidence = extractFinancialEvidence(sanitizedTransfer);
  assert.equal(evidence.references.providerTransactionId, '12345678');
});

test('LIVE-SHAPE-006 alternate thousands/decimal separators normalize to the same amount', () => {
  const localized = {
    ...sanitizedTransfer,
    id: 'gmail-shape-transfer-002',
    body: sanitizedTransfer.body.replace('S/ 2,000.00', 'S/ 2.000,00')
  };
  const evidence = extractFinancialEvidence(localized);
  assert.equal(evidence.amount, 2000);
});
