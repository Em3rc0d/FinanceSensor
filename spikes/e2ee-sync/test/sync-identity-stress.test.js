import test from 'node:test';
import assert from 'node:assert/strict';
import { materializeDecodedEvents, stateDigest } from '../src/protocol.js';

function decoded({ eventId, sequence, canonicalEventId, amount }) {
  return {
    header: {
      eventId,
      tenantId: 'tenant-sync-identity-stress',
      originDeviceId: 'device-a',
      originDeviceSequence: sequence,
      keyEpoch: 1,
      schemaVersion: 1,
      createdAt: `2026-09-01T10:00:${String(sequence).padStart(2, '0')}.000Z`
    },
    action: {
      type: 'CANONICAL_EVENT_CREATED',
      canonicalEventId,
      event: { amount, currency: 'PEN' }
    }
  };
}

test('SYNC-ID-001 same event_id with different immutable content fails closed instead of last-write-wins', () => {
  const first = decoded({ eventId: 'evt-reused', sequence: 1, canonicalEventId: 'c-1', amount: 10 });
  const second = decoded({ eventId: 'evt-reused', sequence: 2, canonicalEventId: 'c-2', amount: 999 });

  assert.throws(
    () => materializeDecodedEvents([first, second]),
    /sync-event-id-content-conflict:evt-reused/
  );
  assert.throws(
    () => materializeDecodedEvents([second, first]),
    /sync-event-id-content-conflict:evt-reused/
  );
});

test('SYNC-ID-002 exact duplicate decoded delivery remains idempotent', () => {
  const event = decoded({ eventId: 'evt-exact', sequence: 1, canonicalEventId: 'c-exact', amount: 42 });
  const once = materializeDecodedEvents([event]);
  const repeated = materializeDecodedEvents([event, structuredClone(event), structuredClone(event)]);

  assert.equal(stateDigest(once), stateDigest(repeated));
});

test('SYNC-ID-003 event_id conflict is detected even when economic payload looks identical but immutable origin sequence changes', () => {
  const first = decoded({ eventId: 'evt-header-fork', sequence: 1, canonicalEventId: 'c-same', amount: 5 });
  const second = decoded({ eventId: 'evt-header-fork', sequence: 2, canonicalEventId: 'c-same', amount: 5 });

  assert.throws(
    () => materializeDecodedEvents([first, second]),
    /sync-event-id-content-conflict:evt-header-fork/
  );
});
