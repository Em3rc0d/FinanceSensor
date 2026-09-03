import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStatementRows } from '../src/statement-row-parser.js';
import { StatementProviderProfile } from '../src/statement-source-adapters.js';

test('savings statement can produce explicit IN and OUT evidence', () => {
  const rows = parseStatementRows({
    tenantId: 'tenant-synthetic',
    accountId: 'account-synthetic',
    classification: { providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED },
    text: [
      '01/09/2026 ABONO TRANSFERENCIA RECIBIDA S/ 1,250.00',
      '02/09/2026 RETIRO CAJERO S/ 100.00'
    ].join('\n')
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].direction, 'IN');
  assert.equal(rows[0].semanticType, 'INCOME');
  assert.equal(rows[0].amount, 1250);
  assert.equal(rows[1].direction, 'OUT');
  assert.equal(rows[1].semanticType, 'UNKNOWN');
  assert.equal(rows[1].amount, 100);
});

test('unknown savings description is not forced into income or expense', () => {
  const [row] = parseStatementRows({
    tenantId: 'tenant-synthetic',
    classification: { providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED },
    text: '03/09/2026 OPERACION ESPECIAL S/ 88.00'
  });
  assert.equal(row.direction, null);
  assert.equal(row.semanticType, 'UNKNOWN');
  assert.equal(row.confidence, 0.65);
});

test('credit-card payment is not classified as personal income by statement row parser', () => {
  const [row] = parseStatementRows({
    tenantId: 'tenant-synthetic',
    instrumentId: 'card-synthetic',
    classification: { providerProfile: StatementProviderProfile.BCP_CREDIT },
    text: '04/09/2026 PAGO DE TARJETA S/ 300.00'
  });
  assert.equal(row.direction, null);
  assert.equal(row.semanticType, 'CARD_PAYMENT');
  assert.equal(row.bodySnippet, 'pago tarjeta');
});

test('credit-card refund is an incoming card-side adjustment, not generic salary evidence', () => {
  const [row] = parseStatementRows({
    tenantId: 'tenant-synthetic',
    instrumentId: 'card-synthetic',
    classification: { providerProfile: StatementProviderProfile.RIPLEY_CREDIT },
    text: '05/09/2026 DEVOLUCION COMERCIO S/ 25.00'
  });
  assert.equal(row.direction, 'IN');
  assert.equal(row.semanticType, 'REFUND');
  assert.equal(row.bodySnippet, 'reembolso');
});

test('savings transfer out stays transfer rather than generic expense', () => {
  const [row] = parseStatementRows({
    tenantId: 'tenant-synthetic',
    classification: { providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED },
    text: '06/09/2026 TRANSFERENCIA ENVIADA S/ 123.45'
  });
  assert.equal(row.direction, 'OUT');
  assert.equal(row.semanticType, 'EXTERNAL_TRANSFER');
});
