import test from 'node:test';
import assert from 'node:assert/strict';
import { findHeaderAnchors } from '../src/statement-layout-geometry.js';

const item = (text, x, y, sequence) => ({ text, x, y, width: 20, height: 10, sequence });

const BCP_HEADERS = [
  { id: 'processDate', header: 'FECHA PROC.' },
  { id: 'valueDate', header: 'FECHA VALOR' },
  { id: 'description', header: 'DESCRIPCION' },
  { id: 'debit', header: 'CARGOS / DEBE' },
  { id: 'credit', header: 'ABONOS / HABER' }
];

test('resolves BCP header anchors when pdf.js fragments labels across adjacent items', () => {
  const page = {
    items: [
      item('FECHA', 40, 700, 0),
      item('PROC.', 72, 700, 1),
      item('FECHA', 115, 700, 2),
      item('VALOR', 148, 700, 3),
      item('DESCRIPCION', 205, 700, 4),
      item('CARGOS', 380, 700, 5),
      item('/', 426, 700, 6),
      item('DEBE', 439, 700, 7),
      item('ABONOS', 490, 700, 8),
      item('/', 540, 700, 9),
      item('HABER', 553, 700, 10)
    ]
  };

  const anchors = findHeaderAnchors(page, BCP_HEADERS);
  assert.ok(anchors);
  assert.equal(anchors.processDate.x, 40);
  assert.equal(anchors.valueDate.x, 115);
  assert.equal(anchors.description.x, 205);
  assert.equal(anchors.debit.x, 380);
  assert.equal(anchors.credit.x, 490);
});

test('still fails closed when a required header is genuinely missing', () => {
  const page = {
    items: [
      item('FECHA PROC.', 40, 700, 0),
      item('FECHA VALOR', 115, 700, 1),
      item('DESCRIPCION', 205, 700, 2),
      item('CARGOS / DEBE', 380, 700, 3)
    ]
  };

  assert.equal(findHeaderAnchors(page, BCP_HEADERS), null);
});
