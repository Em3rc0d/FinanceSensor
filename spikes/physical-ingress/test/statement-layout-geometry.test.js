import test from 'node:test';
import assert from 'node:assert/strict';
import {
  columnBoundaries,
  findHeaderAnchors,
  lineToColumns,
  parseFlexibleMoney
} from '../src/statement-layout-geometry.js';

const item = (text, x, y, sequence, width = 20) => ({ text, x, y, width, height: 10, sequence });

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

test('money columns ignore a detached numeric description fragment to the left of the real amount', () => {
  const anchors = {
    processDate: { x: 40 },
    valueDate: { x: 105 },
    description: { x: 180 },
    debit: { x: 380 },
    credit: { x: 485 }
  };
  const boundaries = columnBoundaries(BCP_HEADERS, anchors);
  const line = {
    items: [
      item('01JUL', 40, 650, 0, 35),
      item('01JUL', 105, 650, 1, 35),
      item('PAGO DEMO', 180, 650, 2, 80),
      item('011396', 300, 650, 3, 42),
      item('70.00', 395, 650, 4, 35)
    ]
  };

  const columns = lineToColumns(line, boundaries);
  assert.equal(parseFlexibleMoney(columns.debit), 70);
});

test('money columns preserve touching pdf.js fragments that form one amount', () => {
  const anchors = {
    processDate: { x: 40 },
    valueDate: { x: 105 },
    description: { x: 180 },
    debit: { x: 380 },
    credit: { x: 485 }
  };
  const boundaries = columnBoundaries(BCP_HEADERS, anchors);
  const line = {
    items: [
      item('01JUL', 40, 650, 0, 35),
      item('01JUL', 105, 650, 1, 35),
      item('COMPRA DEMO', 180, 650, 2, 90),
      item('1', 395, 650, 3, 5),
      item('0.00', 402, 650, 4, 28)
    ]
  };

  const columns = lineToColumns(line, boundaries);
  assert.equal(parseFlexibleMoney(columns.debit), 10);
});
