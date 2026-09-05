import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBcpCreditLayout } from '../src/statement-sweep-profile-adapters.js';

const item = (text, x, y, sequence, width = 40) => ({ text, x, y, width, height: 10, sequence });

function observedHeaderBandFixture() {
  return [{
    pageNumber: 1,
    width: 760,
    height: 900,
    items: [
      item('Estado de Cuenta Tarjeta VISA', 60, 860, 0, 180),
      item('27/07/26', 470, 850, 1, 55),
      item('25/08/26', 535, 850, 2, 55),

      // Unrelated currency labels appear above the transaction table in the real BCP page.
      item('En soles', 520, 830, 3, 55),
      item('En dólares', 650, 830, 4, 65),

      item('Fecha de proceso', 40, 780, 5, 58),
      item('Fecha de consumo', 100, 780, 6, 60),
      item('Descripción', 300, 780, 7, 85),
      item('Tipo de Operación', 445, 780, 8, 100),
      item('Soles', 560, 780, 9, 42),
      item('Dólares', 630, 780, 10, 48),

      item('27Jul', 40, 730, 11, 38),
      item('26Jul', 100, 730, 12, 38),
      item('PAGO BANCA MOVIL', 160, 730, 13, 170),
      item('PAGO', 470, 730, 14, 42),
      item('344.00-', 565, 730, 15, 55),

      item('03Ago', 40, 700, 16, 38),
      item('01Ago', 100, 700, 17, 38),
      item('COMERCIO DEMO', 160, 700, 18, 150),
      item('CONSUMO', 470, 700, 19, 65),
      item('108.50', 565, 700, 20, 50),

      // And unrelated labels can also appear below the table.
      item('En soles', 100, 620, 21, 55),
      item('En dólares', 100, 600, 22, 65)
    ]
  }];
}

test('BCP credit binds Soles/Dólares to the transaction header band, not unrelated page labels', () => {
  const result = parseBcpCreditLayout({ pages: observedHeaderBandFixture(), tenantId: 'tenant-synthetic' });

  assert.equal(result.review.length, 0);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows.map(row => [row.semanticType, row.amount, row.currency]), [
    ['CARD_PAYMENT', 344, 'PEN'],
    ['PURCHASE', 108.5, 'PEN']
  ]);
});
