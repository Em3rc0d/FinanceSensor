import test from 'node:test';
import assert from 'node:assert/strict';

import { OriginSequenceClock } from '../src/sequence.js';

test('INV-SYNC-001 per-device sequence is monotonic and survives checkpoint restore', () => {
  const clock = new OriginSequenceClock();
  assert.deepEqual([clock.next(), clock.next(), clock.next()], [1, 2, 3]);

  const checkpoint = clock.checkpoint();
  const restored = OriginSequenceClock.restore(checkpoint);
  assert.deepEqual([restored.next(), restored.next()], [4, 5]);
});
