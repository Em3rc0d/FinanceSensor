import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFlexibleMoney } from '../src/statement-layout-geometry.js';

test('absolute money parser accepts trailing-minus credit-card representation', () => {
  assert.equal(parseFlexibleMoney('344.00-'), 344);
  assert.equal(parseFlexibleMoney('-243.46'), 243.46);
  assert.equal(parseFlexibleMoney('S/ 1,234.56-'), 1234.56);
});
