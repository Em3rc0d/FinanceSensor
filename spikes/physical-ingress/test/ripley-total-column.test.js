import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRipleyCreditLayout } from '../src/statement-sweep-profile-adapters.js';

const item = (text, x, y, sequence, width = 40) => ({ text, x, y, width, height: 10, sequence });

function physicalShapeFixture() {
  return [{
    pageNumber: 1,
    width: 760,
    height: 900,
    items: [
      item('EECC Tarjeta de Crédito Ripley', 500, 860, 0, 180),
      item('Tus movimientos del mes', 40, 820, 1, 160),
      item('Fecha de operación', 40, 780, 2, 70),
      item('Fecha de proceso', 120, 780, 3, 70),
      item('Nº Ticket', 220, 780, 4, 55),
      // Description is centered in the visual column while row text starts much farther left.
      item('Descripción', 340, 780, 5, 85),
      item('T/A', 430, 780, 6, 30),
      item('Monto', 500, 780, 7, 45),
      item('TEA / TNA', 560, 780, 8, 65),
      item('Total', 690, 780, 9, 45),

      item('03/AGO/2026', 40, 730, 10, 72),
      item('03/AGO/2026', 120, 730, 11, 72),
      item('288299', 220, 730, 12, 45),
      item('PAGO DIGITAL OTRO BANCO', 285, 730, 13, 130),
      // Payment is represented only in the statement Total column.
      item('-243.46', 690, 730, 14, 50),

      item('15/AGO/2026', 40, 700, 15, 72),
      item('16/AGO/2026', 120, 700, 16, 72),
      item('008665', 220, 700, 17, 45),
      item('COMERCIO DEMO', 285, 700, 18, 110),
      item('T', 430, 700, 19, 10),
      item('20.90', 500, 700, 20, 38),
      item('109.83%', 560, 700, 21, 45),
      item('20.90', 690, 700, 22, 38),

      item('22/AGO/2026', 40, 670, 23, 72),
      item('22/AGO/2026', 120, 670, 24, 72),
      item('SEGURO DE DESGRAVAMEN', 285, 670, 25, 130),
      // Fee is also represented only in the statement Total column.
      item('2.94', 690, 670, 26, 32)
    ]
  }];
}

test('Ripley uses the rightmost statement Total and recovers descriptions from the ledger row', () => {
  const result = parseRipleyCreditLayout({ pages: physicalShapeFixture(), tenantId: 'tenant-synthetic' });

  assert.equal(result.review.length, 0);
  assert.equal(result.rows.length, 3);
  assert.deepEqual(result.rows.map(row => [row.semanticType, row.amount, row.balanceEffect]), [
    ['CARD_PAYMENT', 243.46, 'DECREASE'],
    ['PURCHASE', 20.9, 'INCREASE'],
    ['FEE', 2.94, 'INCREASE']
  ]);
  assert.match(result.rows[0].rawMerchant, /PAGO DIGITAL/);
  assert.match(result.rows[2].rawMerchant, /SEGURO/);
});
