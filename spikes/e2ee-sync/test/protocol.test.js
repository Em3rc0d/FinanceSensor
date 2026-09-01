import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEncryptedEnvelope,
  decryptEnvelope,
  generateDeviceIdentity,
  generateTenantRootKey,
  inspectOriginSequences,
  materializeDecodedEvents,
  publicDeviceRecord,
  stateDigest,
  unwrapTenantRootKey,
  wrapTenantRootKey
} from '../src/protocol.js';

function flipBase64url(value) {
  const first = value[0];
  return `${first === 'A' ? 'B' : 'A'}${value.slice(1)}`;
}

function setup() {
  const tenantId = 'tenant-alpha';
  const deviceA = generateDeviceIdentity('device-a');
  const deviceB = generateDeviceIdentity('device-b');
  const recordA = publicDeviceRecord(deviceA);
  const recordB = publicDeviceRecord(deviceB);
  const authorized = new Map([
    [recordA.deviceId, recordA],
    [recordB.deviceId, recordB]
  ]);
  const rootKey = generateTenantRootKey();
  return { tenantId, deviceA, deviceB, recordA, recordB, authorized, rootKey };
}

test('tenant root key can be independently wrapped to two authorized devices', () => {
  const { tenantId, deviceA, deviceB, recordA, recordB, rootKey } = setup();

  const wrappedA = wrapTenantRootKey({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    recipientDeviceRecord: recordA,
    authorizingDevice: deviceA
  });
  const wrappedB = wrapTenantRootKey({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    recipientDeviceRecord: recordB,
    authorizingDevice: deviceA
  });

  const unwrappedA = unwrapTenantRootKey({ package: wrappedA, recipientDevice: deviceA, authorizingDeviceRecord: recordA });
  const unwrappedB = unwrapTenantRootKey({ package: wrappedB, recipientDevice: deviceB, authorizingDeviceRecord: recordA });

  assert.deepEqual(unwrappedA, rootKey);
  assert.deepEqual(unwrappedB, rootKey);
  assert.notEqual(wrappedA.ciphertext, wrappedB.ciphertext);
});

test('a wrapped tenant key cannot be opened by the wrong device identity', () => {
  const { tenantId, deviceA, deviceB, recordA, recordB, rootKey } = setup();
  const wrappedB = wrapTenantRootKey({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    recipientDeviceRecord: recordB,
    authorizingDevice: deviceA
  });

  assert.throws(
    () => unwrapTenantRootKey({ package: wrappedB, recipientDevice: deviceA, authorizingDeviceRecord: recordA }),
    /wrong-recipient-device/
  );
});

test('tampering with a wrapped tenant key is detected before use', () => {
  const { tenantId, deviceA, deviceB, recordA, recordB, rootKey } = setup();
  const wrapped = wrapTenantRootKey({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    recipientDeviceRecord: recordB,
    authorizingDevice: deviceA
  });
  const tampered = { ...wrapped, ciphertext: flipBase64url(wrapped.ciphertext) };

  assert.throws(
    () => unwrapTenantRootKey({ package: tampered, recipientDevice: deviceB, authorizingDeviceRecord: recordA }),
    /invalid-key-wrap-signature/
  );
});

test('cloud-visible envelope does not expose selected financial plaintext', () => {
  const { tenantId, deviceA, rootKey } = setup();
  const envelope = createEncryptedEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    originDevice: deviceA,
    originDeviceSequence: 1,
    eventId: 'evt-private-1',
    createdAt: '2026-09-01T13:00:00.000Z',
    action: {
      type: 'CANONICAL_EVENT_CREATED',
      canonicalEventId: 'canonical-secret-1',
      event: {
        merchant: 'PRIVATE_MERCHANT_SENTINEL',
        amount: 987654.32,
        currency: 'PEN',
        category: 'PRIVATE_CATEGORY_SENTINEL'
      }
    }
  });

  const cloudBlob = JSON.stringify(envelope);
  assert.equal('action' in envelope, false);
  assert.equal(cloudBlob.includes('PRIVATE_MERCHANT_SENTINEL'), false);
  assert.equal(cloudBlob.includes('PRIVATE_CATEGORY_SENTINEL'), false);
  assert.equal(cloudBlob.includes('987654.32'), false);
});

test('authorized peer verifies and decrypts an encrypted signed envelope', () => {
  const { tenantId, deviceA, authorized, rootKey } = setup();
  const envelope = createEncryptedEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    originDevice: deviceA,
    originDeviceSequence: 1,
    eventId: 'evt-1',
    action: { type: 'CANONICAL_EVENT_CREATED', canonicalEventId: 'c-1', event: { amount: 20, currency: 'PEN' } }
  });

  const decoded = decryptEnvelope({ envelope, tenantRootKey: rootKey, authorizedDeviceRecords: authorized });
  assert.equal(decoded.action.canonicalEventId, 'c-1');
  assert.equal(decoded.action.event.amount, 20);
});

test('ciphertext/signature tampering is rejected', () => {
  const { tenantId, deviceA, authorized, rootKey } = setup();
  const envelope = createEncryptedEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    originDevice: deviceA,
    originDeviceSequence: 1,
    eventId: 'evt-tamper',
    action: { type: 'CANONICAL_EVENT_CREATED', canonicalEventId: 'c-t', event: { amount: 1 } }
  });

  assert.throws(
    () => decryptEnvelope({
      envelope: { ...envelope, ciphertext: flipBase64url(envelope.ciphertext) },
      tenantRootKey: rootKey,
      authorizedDeviceRecords: authorized
    }),
    /invalid-envelope-signature/
  );

  assert.throws(
    () => decryptEnvelope({
      envelope: { ...envelope, signature: flipBase64url(envelope.signature) },
      tenantRootKey: rootKey,
      authorizedDeviceRecords: authorized
    }),
    /invalid-envelope-signature/
  );
});

test('duplicate relay delivery is idempotent at materialization', () => {
  const { tenantId, deviceA, authorized, rootKey } = setup();
  const envelope = createEncryptedEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    originDevice: deviceA,
    originDeviceSequence: 1,
    eventId: 'evt-replay-1',
    action: { type: 'CANONICAL_EVENT_CREATED', canonicalEventId: 'c-replay', event: { amount: 50 } }
  });
  const decoded = decryptEnvelope({ envelope, tenantRootKey: rootKey, authorizedDeviceRecords: authorized });

  const once = materializeDecodedEvents([decoded]);
  const repeated = materializeDecodedEvents([decoded, decoded, decoded]);
  assert.equal(stateDigest(once), stateDigest(repeated));
  assert.equal(repeated.appliedEnvelopeCount, 1);
});

test('two devices converge when the same complete event set arrives in reverse order', () => {
  const { tenantId, deviceA, deviceB, authorized, rootKey } = setup();
  const envelopes = [
    createEncryptedEnvelope({
      tenantId,
      keyEpoch: 1,
      tenantRootKey: rootKey,
      originDevice: deviceA,
      originDeviceSequence: 1,
      eventId: 'evt-a-1',
      action: { type: 'CANONICAL_EVENT_CREATED', canonicalEventId: 'c-a', event: { amount: 12, currency: 'PEN' } }
    }),
    createEncryptedEnvelope({
      tenantId,
      keyEpoch: 1,
      tenantRootKey: rootKey,
      originDevice: deviceB,
      originDeviceSequence: 1,
      eventId: 'evt-b-1',
      action: { type: 'CANONICAL_EVENT_CREATED', canonicalEventId: 'c-b', event: { amount: 33, currency: 'PEN' } }
    }),
    createEncryptedEnvelope({
      tenantId,
      keyEpoch: 1,
      tenantRootKey: rootKey,
      originDevice: deviceA,
      originDeviceSequence: 2,
      eventId: 'evt-a-2',
      action: { type: 'CATEGORY_CORRECTED', targetId: 'c-a', baseRevision: 0, categoryId: 'FOOD' }
    })
  ];

  const decodedA = envelopes.map(envelope => decryptEnvelope({ envelope, tenantRootKey: rootKey, authorizedDeviceRecords: authorized }));
  const decodedB = [...envelopes].reverse().map(envelope => decryptEnvelope({ envelope, tenantRootKey: rootKey, authorizedDeviceRecords: authorized }));

  assert.equal(stateDigest(materializeDecodedEvents(decodedA)), stateDigest(materializeDecodedEvents(decodedB)));
});

test('sequence inspection detects a missing origin-device range without decrypting payload', () => {
  const { tenantId, deviceA, rootKey } = setup();
  const envelopes = [1, 3].map(sequence => createEncryptedEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    originDevice: deviceA,
    originDeviceSequence: sequence,
    eventId: `evt-gap-${sequence}`,
    action: { type: 'NOOP', sequence }
  }));

  assert.deepEqual(inspectOriginSequences(envelopes)['device-a'], { highestSeen: 3, gaps: [2] });
});

test('revocation moves future sync to a new key epoch unavailable to the revoked device', () => {
  const { tenantId, deviceA, deviceB, recordA, rootKey: epoch1 } = setup();
  const recordBRevoked = publicDeviceRecord(deviceB, { authorizedFromEpoch: 1, revokedFromEpoch: 2, status: 'REVOKED' });
  const epoch2 = generateTenantRootKey();

  assert.throws(
    () => wrapTenantRootKey({
      tenantId,
      keyEpoch: 2,
      tenantRootKey: epoch2,
      recipientDeviceRecord: recordBRevoked,
      authorizingDevice: deviceA
    }),
    /recipient-not-authorized-for-epoch/
  );

  const epoch2EnvelopeFromRevokedB = createEncryptedEnvelope({
    tenantId,
    keyEpoch: 2,
    tenantRootKey: epoch2,
    originDevice: deviceB,
    originDeviceSequence: 1,
    eventId: 'evt-revoked-b',
    action: { type: 'CANONICAL_EVENT_CREATED', canonicalEventId: 'forbidden', event: { amount: 999 } }
  });

  const registry = new Map([
    [recordA.deviceId, recordA],
    [recordBRevoked.deviceId, recordBRevoked]
  ]);
  assert.throws(
    () => decryptEnvelope({ envelope: epoch2EnvelopeFromRevokedB, tenantRootKey: epoch2, authorizedDeviceRecords: registry }),
    /origin-device-not-authorized-for-epoch/
  );

  // Explicit non-claim: epoch-1 material already possessed by B is not magically erased.
  const oldWrap = wrapTenantRootKey({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: epoch1,
    recipientDeviceRecord: publicDeviceRecord(deviceB),
    authorizingDevice: deviceA
  });
  assert.deepEqual(
    unwrapTenantRootKey({ package: oldWrap, recipientDevice: deviceB, authorizingDeviceRecord: recordA }),
    epoch1
  );
});

test('a key from another tenant cannot decrypt the envelope', () => {
  const { tenantId, deviceA, authorized, rootKey } = setup();
  const envelope = createEncryptedEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    originDevice: deviceA,
    originDeviceSequence: 1,
    eventId: 'evt-cross-tenant',
    action: { type: 'CANONICAL_EVENT_CREATED', canonicalEventId: 'c-x', event: { amount: 5 } }
  });

  assert.throws(
    () => decryptEnvelope({ envelope, tenantRootKey: generateTenantRootKey(), authorizedDeviceRecords: authorized })
  );
});

test('concurrent incompatible corrections become a deterministic conflict, not a hidden winner', () => {
  const { tenantId, deviceA, deviceB, authorized, rootKey } = setup();
  const correctionA = createEncryptedEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    originDevice: deviceA,
    originDeviceSequence: 1,
    eventId: 'corr-a',
    action: { type: 'CATEGORY_CORRECTED', targetId: 'c-target', baseRevision: 0, categoryId: 'FOOD' }
  });
  const correctionB = createEncryptedEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    originDevice: deviceB,
    originDeviceSequence: 1,
    eventId: 'corr-b',
    action: { type: 'CATEGORY_CORRECTED', targetId: 'c-target', baseRevision: 0, categoryId: 'TRANSPORT' }
  });

  const forward = [correctionA, correctionB].map(envelope => decryptEnvelope({ envelope, tenantRootKey: rootKey, authorizedDeviceRecords: authorized }));
  const reverse = [correctionB, correctionA].map(envelope => decryptEnvelope({ envelope, tenantRootKey: rootKey, authorizedDeviceRecords: authorized }));
  const stateForward = materializeDecodedEvents(forward);
  const stateReverse = materializeDecodedEvents(reverse);

  assert.equal(Object.keys(stateForward.conflicts).length, 1);
  assert.equal(stateForward.categoryState['c-target'], undefined);
  assert.equal(stateDigest(stateForward), stateDigest(stateReverse));
});

test('an explicit conflict-resolution action converges to the selected user correction', () => {
  const { tenantId, deviceA, deviceB, authorized, rootKey } = setup();
  const correctionA = createEncryptedEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    originDevice: deviceA,
    originDeviceSequence: 1,
    eventId: 'corr-resolve-a',
    action: { type: 'CATEGORY_CORRECTED', targetId: 'c-target', baseRevision: 0, categoryId: 'FOOD' }
  });
  const correctionB = createEncryptedEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    originDevice: deviceB,
    originDeviceSequence: 1,
    eventId: 'corr-resolve-b',
    action: { type: 'CATEGORY_CORRECTED', targetId: 'c-target', baseRevision: 0, categoryId: 'TRANSPORT' }
  });
  const resolution = createEncryptedEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    originDevice: deviceA,
    originDeviceSequence: 2,
    eventId: 'resolution-1',
    action: {
      type: 'CATEGORY_CONFLICT_RESOLVED',
      targetId: 'c-target',
      baseRevision: 0,
      selectedCorrectionEventId: 'corr-resolve-a'
    }
  });

  const deliveryA = [correctionA, correctionB, resolution];
  const deliveryB = [resolution, correctionB, correctionA];
  const decode = envelope => decryptEnvelope({ envelope, tenantRootKey: rootKey, authorizedDeviceRecords: authorized });
  const stateA = materializeDecodedEvents(deliveryA.map(decode));
  const stateB = materializeDecodedEvents(deliveryB.map(decode));

  assert.equal(Object.keys(stateA.conflicts).length, 0);
  assert.deepEqual(stateA.categoryState['c-target'], { categoryId: 'FOOD', revision: 1 });
  assert.equal(stateDigest(stateA), stateDigest(stateB));
});
