import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  FORBIDDEN_WEB_KEYS,
  summarizeProjection,
  validateProjection
} from '../projection-model.mjs';

const fixture = JSON.parse(
  await readFile(new URL('../projection.sample.json', import.meta.url), 'utf8')
);

test('synthetic dashboard projection validates without global evidence percentage', () => {
  validateProjection(fixture);
  const wire = JSON.stringify(fixture);
  for (const key of FORBIDDEN_WEB_KEYS) assert.equal(wire.includes(`"${key}"`), false, key);
  assert.equal(wire.includes('96%'), false);
});

test('PEN and USD remain separate', () => {
  const summary = summarizeProjection(fixture);
  assert.deepEqual(summary.byCurrency.map(item => item.currency), ['PEN', 'USD']);
  assert.equal(summary.byCurrency.length, 2);
});

test('confidence and raw financial source fields fail closed', () => {
  assert.throws(
    () => validateProjection({
      ...fixture,
      transactions: [{ ...fixture.transactions[0], confidence: 0.96 }]
    }),
    /WEB_PROJECTION_FORBIDDEN_KEY/
  );
  assert.throws(
    () => validateProjection({ ...fixture, rawPdf: 'no' }),
    /WEB_PROJECTION_FORBIDDEN_KEY/
  );
});
