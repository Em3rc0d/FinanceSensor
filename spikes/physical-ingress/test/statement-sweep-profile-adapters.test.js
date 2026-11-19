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
      // Deliberately fragment stacked headers and combine both currency headers in one pdf.js item.
      item('Fecha de', 40, 700, 3, 38),
      item('proceso', 80, 700, 4, 42),
      item('Fecha de', 130, 700, 5, 38),
      item('consumo', 170, 700, 6, 44),
      item('Descripción', 225, 700, 7, 80),
      item('Tipo de', 330, 700, 8, 45),
      item('Operación', 377, 700, 9, 58),
      item('Soles Dólares', 445, 700, 10, 110),
      item('27Jul', 40, 650, 11),
      item('26Jul', 130, 650, 12),
      item('PAGO BANCA MOVIL', 225, 650, 13, 95),
      item('PAGO', 350, 650, 14),
      // Detached numeric reference is intentionally inside the PEN bucket.
      item('99999', 410, 650, 15, 25),
      item('344.00-', 450, 650, 16),
      item('03Ago', 40, 625, 17),
      item('01Ago', 130, 625, 18),
      item('COMERCIO DEMO', 225, 625, 19, 95),
      item('CONSUMO', 350, 625, 20),
      item('108.50', 450, 625, 21),
      item('Monto Total Facturado', 225, 550, 22, 130),
      item('108.50', 450, 550, 23)
    ]
  }];
}

function ripleyFixture() {
  return [{
    pageNumber: 1,
    width: 760,
    height: 800,
    items: [
      item('EECC Tarjeta de Crédito Ripley', 350, 760, 0, 190),
      item('Tus movimientos del mes', 40, 730, 1, 150),
      item('Fecha de', 40, 700, 2, 38),
      item('operación', 80, 700, 3, 50),
      item('Fecha de', 135, 700, 4, 38),
      item('proceso', 175, 700, 5, 44),
      item('Nº', 225, 700, 6, 18),
      item('Ticket', 245, 700, 7, 38),
      item('Descripción', 300, 700, 8, 80),
      item('T/A', 405, 700, 9, 25),
      item('Monto', 445, 700, 10, 45),
      item('TEA /', 520, 700, 11, 35),
      item('TNA', 558, 700, 12, 25),
      item('Total', 650, 700, 13, 40),
      item('03/AGO/2026', 40, 650, 14, 70),
      item('03/AGO/2026', 135, 650, 15, 70),
      item('288299', 225, 650, 16, 45),
      item('PAGO DIGITAL OTRO BANCO', 300, 650, 17, 110),
      item('-243.46', 650, 650, 18, 45),
      item('15/AGO/2026', 40, 625, 19, 70),
      item('16/AGO/2026', 135, 625, 20, 70),
      item('008665', 225, 625, 21, 45),
      item('COMERCIO DEMO', 300, 625, 22, 90),
      item('T', 405, 625, 23, 10),
      item('20.90', 445, 625, 24, 40),
      item('109.83%', 520, 625, 25, 45),
      item('20.90', 650, 625, 26, 40),
      item('22/AGO/2026', 40, 600, 27, 70),
      item('22/AGO/2026', 135, 600, 28, 70),
      item('SEGURO DE DESGRAVAMEN', 300, 600, 29, 110),
      item('2.94', 650, 600, 30, 35),
      item('SALDO INICIAL', 300, 575, 31, 80),
      item('243.45', 650, 575, 32, 40)
    ]
  }];
}

test('BCP credit sweep adapter tolerates fragmented headers, combined currency header and numeric spill', () => {
  const result = parseBcpCreditLayout({ pages: bcpCreditFixture(), tenantId: 'tenant-synthetic' });
  assert.equal(result.review.length, 0);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows.map(row => [row.semanticType, row.amount, row.currency, row.balanceEffect]), [
    ['CARD_PAYMENT', 344, 'PEN', 'DECREASE'],
    ['PURCHASE', 108.5, 'PEN', 'INCREASE']
  ]);
  assert.equal(result.rows.some(row => row.amount === 99999), false);
  assert.equal(result.rows[0].direction, 'OUT');
  assert.equal(result.rows[0].cashflowDirection, 'OUTFLOW');
  assert.equal(result.rows[0].auditDebtDelta, -344);
  assert.equal(Object.keys(result.rows[0]).includes('auditDebtDelta'), false);
  assert.equal(JSON.stringify(result.rows[0]).includes('auditDebtDelta'), false);
});

test('Ripley credit sweep adapter tolerates fragmented headers and excludes opening balance', () => {
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
