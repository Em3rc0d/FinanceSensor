import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBcpCreditLayout,
  parseRipleyCreditLayout
} from '../src/statement-sweep-profile-adapters.js';

const item = (text, x, y, sequence, width = 40) => ({ text, x, y, width, height: 10, sequence });

function bcpCreditFixture() {
  return [{
    pageNumber: 1,
    width: 600,
    height: 800,
    items: [
      item('Estado de Cuenta Tarjeta VISA', 300, 760, 0, 170),
      item('27/07/26', 300, 735, 1, 55),
      item('25/08/26', 365, 735, 2, 55),
      item('Fecha de proceso', 40, 700, 3, 70),
      item('Fecha de consumo', 115, 700, 4, 75),
      item('Descripción', 200, 700, 5, 80),
      item('Tipo de Operación', 330, 700, 6, 85),
      item('Soles', 445, 700, 7, 40),
      item('Dólares', 520, 700, 8, 45),
      item('27Jul', 40, 650, 9),
      item('26Jul', 115, 650, 10),
      item('PAGO BANCA MOVIL', 200, 650, 11, 110),
      item('PAGO', 335, 650, 12),
      item('344.00-', 445, 650, 13),
      item('03Ago', 40, 625, 14),
      item('01Ago', 115, 625, 15),
      item('COMERCIO DEMO', 200, 625, 16, 95),
      item('CONSUMO', 335, 625, 17),
      item('108.50', 445, 625, 18),
      item('Monto Total Facturado', 200, 550, 19, 130),
      item('108.50', 445, 550, 20)
    ]
  }];
}

function ripleyFixture() {
  return [{
    pageNumber: 1,
    width: 700,
    height: 800,
    items: [
      item('EECC Tarjeta de Crédito Ripley', 350, 760, 0, 190),
      item('Tus movimientos del mes', 40, 730, 1, 150),
      item('Fecha de operación', 40, 700, 2, 70),
      item('Fecha de proceso', 125, 700, 3, 70),
      item('Nº Ticket', 205, 700, 4, 50),
      item('Descripción', 270, 700, 5, 80),
      item('T/A', 390, 700, 6, 25),
      item('Monto', 430, 700, 7, 45),
      item('TEA / TNA', 510, 700, 8, 55),
      item('03/AGO/2026', 40, 650, 9, 70),
      item('03/AGO/2026', 125, 650, 10, 70),
      item('288299', 205, 650, 11, 45),
      item('PAGO DIGITAL OTRO BANCO', 270, 650, 12, 110),
      item('-243.46', 430, 650, 13, 45),
      item('15/AGO/2026', 40, 625, 14, 70),
      item('16/AGO/2026', 125, 625, 15, 70),
      item('008665', 205, 625, 16, 45),
      item('COMERCIO DEMO', 270, 625, 17, 90),
      item('T', 390, 625, 18, 10),
      item('20.90', 430, 625, 19, 40),
      item('109.83%', 510, 625, 20, 45),
      item('22/AGO/2026', 40, 600, 21, 70),
      item('22/AGO/2026', 125, 600, 22, 70),
      item('SEGURO DE DESGRAVAMEN', 270, 600, 23, 110),
      item('2.94', 430, 600, 24, 35),
      item('SALDO INICIAL', 270, 575, 25, 80),
      item('243.45', 430, 575, 26, 40)
    ]
  }];
}

test('BCP credit sweep adapter preserves payment sign semantics without emitting negative amounts', () => {
  const result = parseBcpCreditLayout({ pages: bcpCreditFixture(), tenantId: 'tenant-synthetic' });
  assert.equal(result.review.length, 0);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows.map(row => [row.semanticType, row.amount, row.currency, row.balanceEffect]), [
    ['CARD_PAYMENT', 344, 'PEN', 'DECREASE'],
    ['PURCHASE', 108.5, 'PEN', 'INCREASE']
  ]);
  assert.equal(result.rows[0].direction, 'OUT');
  assert.equal(result.rows[0].cashflowDirection, 'OUTFLOW');
  assert.equal(result.rows[0].auditDebtDelta, -344);
  assert.equal(Object.keys(result.rows[0]).includes('auditDebtDelta'), false);
  assert.equal(JSON.stringify(result.rows[0]).includes('auditDebtDelta'), false);
});

test('Ripley credit sweep adapter excludes opening balance and classifies payment, purchase and fee', () => {
  const result = parseRipleyCreditLayout({ pages: ripleyFixture(), tenantId: 'tenant-synthetic' });
  assert.equal(result.review.length, 0);
  assert.equal(result.rows.length, 3);
  assert.deepEqual(result.rows.map(row => [row.semanticType, row.amount]), [
    ['CARD_PAYMENT', 243.46],
    ['PURCHASE', 20.9],
    ['FEE', 2.94]
  ]);
  assert.equal(result.rows.some(row => row.amount === 243.45), false, 'opening balance must not become movement');
  assert.equal(result.rows[0].auditDebtDelta, -243.46);
  assert.equal(result.rows[1].auditDebtDelta, 20.9);
});
