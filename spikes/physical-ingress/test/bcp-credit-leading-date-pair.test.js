import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBcpCreditLayout } from '../src/statement-sweep-profile-adapters.js';

const item = (text, x, y, sequence, width = 40) => ({ text, x, y, width, height: 10, sequence });

function centeredHeaderFixture() {
  return [{
    pageNumber: 1,
    width: 760,
    height: 900,
    items: [
      item('Estado de Cuenta Tarjeta VISA', 60, 850, 0, 180),
      item('27/07/26', 470, 845, 1, 55),
      item('25/08/26', 535, 845, 2, 55),
      item('Fecha de proceso', 40, 780, 3, 58),
      item('Fecha de consumo', 100, 780, 4, 60),
      // Observed BCP layout centers these labels inside much wider visual columns.
      item('Descripción', 300, 780, 5, 85),
      item('Tipo de Operación', 445, 780, 6, 100),
      item('Soles', 560, 780, 7, 42),
      item('Dólares', 630, 780, 8, 48),

      item('27Jul', 40, 730, 9, 38),
      item('26Jul', 100, 730, 10, 38),
      // The description starts far left of its centered header, so midpoint geometry
      // alone places it in the consumption-date bucket.
      item('PAGO BANCA MOVIL', 160, 730, 11, 170),
      item('PAGO', 470, 730, 12, 42),
      item('344.00-', 565, 730, 13, 55),

      item('03Ago', 40, 700, 14, 38),
      item('01Ago', 100, 700, 15, 38),
      item('COMERCIO DEMO', 160, 700, 16, 150),
      item('CONSUMO', 470, 700, 17, 65),
      item('108.50', 565, 700, 18, 50)
    ]
  }];
}

test('BCP credit recovers strict leading date pair when centered headers distort midpoint buckets', () => {
  const result = parseBcpCreditLayout({ pages: centeredHeaderFixture(), tenantId: 'tenant-synthetic' });

  assert.equal(result.review.length, 0);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows.map(row => [row.semanticType, row.amount, row.currency, row.balanceEffect]), [
    ['CARD_PAYMENT', 344, 'PEN', 'DECREASE'],
    ['PURCHASE', 108.5, 'PEN', 'INCREASE']
  ]);
  assert.match(result.rows[0].rawMerchant, /PAGO BANCA MOVIL/);
  assert.match(result.rows[1].rawMerchant, /COMERCIO DEMO/);
  assert.equal(result.rows[0].auditValueAt.endsWith('T12:00:00.000Z'), true);
});
