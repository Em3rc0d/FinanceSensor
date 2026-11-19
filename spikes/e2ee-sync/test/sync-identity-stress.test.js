import test from 'node:test';
import assert from 'node:assert/strict';
import { materializeDecodedEvents, stateDigest } from '../src/protocol.js';

function header({ eventId, deviceId = 'device-a', sequence, tenantId = 'tenant-sync-identity-stress' }) {
  return {
    eventId,
    tenantId,
    originDeviceId: deviceId,
    originDeviceSequence: sequence,
    keyEpoch: 1,
    schemaVersion: 1,
    createdAt: `2026-09-01T10:00:${String(sequence).padStart(2, '0')}.000Z`
  };
}

function decoded({ eventId, deviceId = 'device-a', sequence, canonicalEventId, amount, tenantId }) {
  return {
    header: header({ eventId, deviceId, sequence, tenantId }),
    action: {
      type: 'CANONICAL_EVENT_CREATED',
      canonicalEventId,
      event: { amount, currency: 'PEN' }
    }
  };
}

function categoryCorrection({ eventId, deviceId, sequence, categoryId, tenantId }) {
  return {
    header: header({ eventId, deviceId, sequence, tenantId }),
    action: {
      type: 'CATEGORY_CORRECTED',
      targetId: 'canonical-target',
      baseRevision: 0,
      categoryId
    }
  };
}

function categoryResolution({ eventId, deviceId, sequence, selectedCorrectionEventId, tenantId }) {
  return {
    header: header({ eventId, deviceId, sequence, tenantId }),
    action: {
      type: 'CATEGORY_CONFLICT_RESOLVED',
      targetId: 'canonical-target',
      baseRevision: 0,
      selectedCorrectionEventId
    }
  };
}

test('SYNC-ID-001 same event_id with different immutable content fails closed instead of last-write-wins', () => {
  const first = decoded({ eventId: 'evt-reused', sequence: 1, canonicalEventId: 'c-1', amount: 10 });
  const second = decoded({ eventId: 'evt-reused', sequence: 2, canonicalEventId: 'c-2', amount: 999 });

  assert.throws(() => materializeDecodedEvents([first, second]), /sync-event-id-content-conflict:evt-reused/);
  assert.throws(() => materializeDecodedEvents([second, first]), /sync-event-id-content-conflict:evt-reused/);
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
  assert.throws(() => materializeDecodedEvents([first, second]), /sync-event-id-content-conflict:evt-header-fork/);
});

test('SYNC-ID-004 one device sequence cannot be occupied by two different event identities', () => {
  const first = decoded({ eventId: 'evt-seq-a', sequence: 7, canonicalEventId: 'c-a', amount: 10 });
  const second = decoded({ eventId: 'evt-seq-b', sequence: 7, canonicalEventId: 'c-b', amount: 20 });

  assert.throws(() => materializeDecodedEvents([first, second]), /sync-origin-sequence-fork:device-a:7/);
  assert.throws(() => materializeDecodedEvents([second, first]), /sync-origin-sequence-fork:device-a:7/);
});

test('SYNC-ID-005 equal sequence numbers on different origin devices are independent', () => {
  const first = decoded({ eventId: 'evt-a-1', deviceId: 'device-a', sequence: 1, canonicalEventId: 'c-a', amount: 10 });
  const second = decoded({ eventId: 'evt-b-1', deviceId: 'device-b', sequence: 1, canonicalEventId: 'c-b', amount: 20 });
  const state = materializeDecodedEvents([first, second]);
  assert.equal(state.appliedEnvelopeCount, 2);
});

test('SYNC-ID-006 sequence identity remains unique even when two events carry identical economic payload', () => {
  const first = decoded({ eventId: 'evt-same-payload-a', sequence: 9, canonicalEventId: 'c-same', amount: 55 });
  const second = decoded({ eventId: 'evt-same-payload-b', sequence: 9, canonicalEventId: 'c-same', amount: 55 });
  assert.throws(() => materializeDecodedEvents([first, second]), /sync-origin-sequence-fork:device-a:9/);
});

test('SYNC-TENANT-001 one materialization cannot mix decoded events from different tenants', () => {
  const tenantA = decoded({
    eventId: 'tenant-a-event',
    tenantId: 'tenant-a',
    deviceId: 'device-shared-name',
    sequence: 1,
    canonicalEventId: 'canonical-same-id',
    amount: 10
  });
  const tenantB = decoded({
    eventId: 'tenant-b-event',
    tenantId: 'tenant-b',
    deviceId: 'device-shared-name',
    sequence: 1,
    canonicalEventId: 'canonical-same-id',
    amount: 999
  });

  assert.throws(() => materializeDecodedEvents([tenantA, tenantB]), /mixed-tenant-materialization/);
  assert.throws(() => materializeDecodedEvents([tenantB, tenantA]), /mixed-tenant-materialization/);
});

test('SYNC-CONFLICT-001 concurrent incompatible conflict resolutions create a meta-conflict instead of a hidden winner', () => {
  const correctionA = categoryCorrection({ eventId: 'corr-food', deviceId: 'device-a', sequence: 1, categoryId: 'FOOD' });
  const correctionB = categoryCorrection({ eventId: 'corr-transport', deviceId: 'device-b', sequence: 1, categoryId: 'TRANSPORT' });
  const resolutionA = categoryResolution({ eventId: 'resolve-food', deviceId: 'device-a', sequence: 2, selectedCorrectionEventId: 'corr-food' });
  const resolutionB = categoryResolution({ eventId: 'resolve-transport', deviceId: 'device-b', sequence: 2, selectedCorrectionEventId: 'corr-transport' });

  const forward = materializeDecodedEvents([correctionA, correctionB, resolutionA, resolutionB]);
  const reverse = materializeDecodedEvents([resolutionB, resolutionA, correctionB, correctionA]);
  const conflict = Object.values(forward.conflicts).find(item => item.type === 'CATEGORY_RESOLUTION_CONFLICT');

  assert.ok(conflict);
  assert.equal(forward.categoryState['canonical-target'], undefined);
  assert.equal(stateDigest(forward), stateDigest(reverse));
});

test('SYNC-CONFLICT-002 resolution pointing outside the candidate set fails closed as explicit invalid resolution', () => {
  const correctionA = categoryCorrection({ eventId: 'corr-invalid-food', deviceId: 'device-a', sequence: 1, categoryId: 'FOOD' });
  const correctionB = categoryCorrection({ eventId: 'corr-invalid-transport', deviceId: 'device-b', sequence: 1, categoryId: 'TRANSPORT' });
  const invalidResolution = categoryResolution({
    eventId: 'resolve-missing',
    deviceId: 'device-a',
    sequence: 2,
    selectedCorrectionEventId: 'correction-does-not-exist'
  });

  const state = materializeDecodedEvents([correctionA, correctionB, invalidResolution]);
  const conflict = Object.values(state.conflicts).find(item => item.type === 'CATEGORY_RESOLUTION_INVALID');
  assert.ok(conflict);
  assert.equal(state.categoryState['canonical-target'], undefined);
});

test('SYNC-CONFLICT-003 concurrent same-choice resolutions are retry-equivalent and converge', () => {
  const correctionA = categoryCorrection({ eventId: 'corr-agree-food', deviceId: 'device-a', sequence: 1, categoryId: 'FOOD' });
  const correctionB = categoryCorrection({ eventId: 'corr-agree-transport', deviceId: 'device-b', sequence: 1, categoryId: 'TRANSPORT' });
  const resolutionA = categoryResolution({ eventId: 'resolve-agree-a', deviceId: 'device-a', sequence: 2, selectedCorrectionEventId: 'corr-agree-food' });
  const resolutionB = categoryResolution({ eventId: 'resolve-agree-b', deviceId: 'device-b', sequence: 2, selectedCorrectionEventId: 'corr-agree-food' });

  const forward = materializeDecodedEvents([correctionA, correctionB, resolutionA, resolutionB]);
  const reverse = materializeDecodedEvents([resolutionB, correctionB, resolutionA, correctionA]);

  assert.deepEqual(forward.categoryState['canonical-target'], { categoryId: 'FOOD', revision: 1 });
  assert.equal(Object.keys(forward.conflicts).length, 0);
  assert.equal(stateDigest(forward), stateDigest(reverse));
});
