import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEncryptedEnvelope,
  decryptEnvelope,
  generateDeviceIdentity,
  generateTenantRootKey,
  materializeDecodedEvents,
  publicDeviceRecord
} from '../src/protocol.js';

test('INV-SYNC-005 lease failure can duplicate processing work without duplicating canonical truth', () => {
  const tenantId = 'tenant-lease-failure';
  const deviceA = generateDeviceIdentity('device-a');
  const deviceB = generateDeviceIdentity('device-b');
  const rootKey = generateTenantRootKey();
  const authorized = new Map([
    ['device-a', publicDeviceRecord(deviceA, { tenantId })],
    ['device-b', publicDeviceRecord(deviceB, { tenantId })]
  ]);

  // Simulate a ProcessingLease failure: both devices independently process the
  // same source artifact. Upstream canonical resolution yields the same stable
  // canonical economic identity even though each device emits its own sync envelope.
  const canonicalEvent = {
    merchant: 'MERCHANT-X',
    amount: 48.5,
    currency: 'PEN'
  };

  const envelopes = [
    createEncryptedEnvelope({
      tenantId,
      keyEpoch: 1,
      tenantRootKey: rootKey,
      originDevice: deviceA,
      originDeviceSequence: 1,
      eventId: 'lease-fail-envelope-a',
      action: {
        type: 'CANONICAL_EVENT_CREATED',
        canonicalEventId: 'canonical-source-artifact-42',
        event: canonicalEvent
      }
    }),
    createEncryptedEnvelope({
      tenantId,
      keyEpoch: 1,
      tenantRootKey: rootKey,
      originDevice: deviceB,
      originDeviceSequence: 1,
      eventId: 'lease-fail-envelope-b',
      action: {
        type: 'CANONICAL_EVENT_CREATED',
        canonicalEventId: 'canonical-source-artifact-42',
        event: canonicalEvent
      }
    })
  ];

  const decoded = envelopes.map(envelope => decryptEnvelope({
    envelope,
    tenantRootKey: rootKey,
    authorizedDeviceRecords: authorized
  }));
  const state = materializeDecodedEvents(decoded);

  assert.equal(state.appliedEnvelopeCount, 2);
  assert.equal(Object.keys(state.canonicalEvents).length, 1);
  assert.equal(state.integrityConflicts.length, 0);
  assert.deepEqual(state.canonicalEvents['canonical-source-artifact-42'], canonicalEvent);
});
