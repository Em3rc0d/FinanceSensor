import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStatementRows } from '../src/statement-row-parser.js';
import { StatementProviderProfile } from '../src/statement-source-adapters.js';

test('credit statement purchase becomes outgoing purchase evidence', () => {
  const [row] = parseStatementRows({
    tenantId: 'tenant-synthetic',
    instrumentId: 'card-synthetic',
    classification: { providerProfile: StatementProviderProfile.BCP_CREDIT },
    text: '03/09/2026 COMPRA COMERCIO S/ 55.90'
  });
  assert.equal(row.direction, 'OUT');
  assert.equal(row.balanceEffect, 'INCREASE');
  assert.equal(row.cashflowDirection, 'OUTFLOW');
  assert.equal(row.semanticType, 'PURCHASE');
});

test('credit card payment reduces debt but remains personal outflow', () => {
  const [row] = parseStatementRows({
    tenantId: 'tenant-synthetic',
    instrumentId: 'card-synthetic',
    classification: { providerProfile: StatementProviderProfile.BCP_CREDIT },
    text: '04/09/2026 PAGO TARJETA S/ 100.00'
  });
  assert.equal(row.direction, 'OUT');
  assert.equal(row.balanceEffect, 'DECREASE');
  assert.equal(row.cashflowDirection, 'OUTFLOW');
  assert.equal(row.semanticType, 'CARD_PAYMENT');
});

test('credit refund reduces debt and is cashflow inflow evidence', () => {
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

test('multi-page parser ignores summary and educational-reference pages before row parsing', () => {
  const text = [
    'Estado de Cuenta Tarjeta VISA Fecha de proceso Fecha de consumo Descripción Tipo de Operación Soles Dólares 04Sep 04Sep\n04/09/2026 CONSUMO COMERCIO S/ 10.00',
    'Estado de Cuenta Tarjeta VISA Fecha de proceso Fecha de consumo Descripción Tipo de Operación Soles Dólares MONTO TOTAL FACTURADO ¿COMO ESTA COMPUESTA SU DEUDA?\n05/09/2026 CONSUMO FALSO S/ 20.00',
    'Conoce el estado de cuenta de tu Tarjeta de Crédito (Montos referenciales)\n06/09/2026 CONSUMO EJEMPLO S/ 30.00'
  ].join('\f');
  const rows = parseStatementRows({
    tenantId: 'tenant-synthetic',
    classification: { providerProfile: StatementProviderProfile.BCP_CREDIT },
    text
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount, 10);
});
