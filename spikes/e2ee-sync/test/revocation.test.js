import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEncryptedEnvelope,
  generateDeviceIdentity,
  generateTenantRootKey,
  publicDeviceRecord
} from '../src/protocol.js';
import {
  assertRevokedOriginHistory,
  createRevocationBarrier,
  originHistoryCommitment,
  validateRevocationBarrier
} from '../src/revocation.js';

function setup() {
  const tenantId = 'tenant-revocation';
  const survivor = generateDeviceIdentity('device-survivor');
  const lost = generateDeviceIdentity('device-lost');
  const rootKey = generateTenantRootKey();
  const survivorRecord = publicDeviceRecord(survivor, { tenantId });
  const lostRecord = publicDeviceRecord(lost, {
    tenantId,
    authorizedFromEpoch: 1,
    revokedFromEpoch: 2,
    status: 'REVOKED'
  });

  const envelope = (sequence, eventId, amount) => createEncryptedEnvelope({
    tenantId,
    keyEpoch: 1,
    tenantRootKey: rootKey,
    originDevice: lost,
    originDeviceSequence: sequence,
    eventId,
    createdAt: `2026-09-01T10:0${sequence}:00.000Z`,
    action: {
      type: 'CANONICAL_EVENT_CREATED',
      canonicalEventId: `canonical-${eventId}`,
      event: { amount, currency: 'PEN' }
    }
  });

  const history = [
    envelope(1, 'lost-1', 10),
    envelope(2, 'lost-2', 20)
  ];
  const barrier = createRevocationBarrier({
    tenantId,
    revokedDeviceRecord: lostRecord,
    historicalEnvelopes: history,
    authorizingDevice: survivor,
    authorizingDeviceRecord: survivorRecord,
    createdAt: '2026-09-01T11:00:00.000Z'
  });

  return {
    tenantId,
    survivor,
    lost,
    rootKey,
    survivorRecord,
    lostRecord,
    envelope,
    history,
    barrier
  };
}

test('REV-001 authenticated cutover freezes exact historical origin state while tolerating reorder and exact duplicates', () => {
  const { barrier, history, lostRecord, survivorRecord } = setup();
  const frozen = assertRevokedOriginHistory({
    barrier,
    historicalEnvelopes: [history[1], history[0], structuredClone(history[1])],
    revokedDeviceRecord: lostRecord,
    authorizingDeviceRecord: survivorRecord
  });

  assert.equal(frozen.historicalOriginFrozen, true);
  assert.equal(frozen.lastAcceptedSequence, 2);
});

test('REV-002 revoked device cannot append a newly fabricated old-epoch envelope after cutover', () => {
  const { barrier, history, envelope, lostRecord, survivorRecord } = setup();
  const lateOldEpochEnvelope = envelope(3, 'fabricated-after-revocation', 999);

  assert.throws(() => assertRevokedOriginHistory({
    barrier,
    historicalEnvelopes: [...history, lateOldEpochEnvelope],
    revokedDeviceRecord: lostRecord,
    authorizingDeviceRecord: survivorRecord
  }), /revoked-origin-history-sequence-mismatch/);
});

test('REV-003 replacing an already committed historical sequence changes the commitment and fails closed', () => {
  const { barrier, history, envelope, lostRecord, survivorRecord } = setup();
  const forgedSequenceTwo = envelope(2, 'replacement-sequence-2', 777);

  assert.throws(() => assertRevokedOriginHistory({
    barrier,
    historicalEnvelopes: [history[0], forgedSequenceTwo],
    revokedDeviceRecord: lostRecord,
    authorizingDeviceRecord: survivorRecord
  }), /revoked-origin-history-commitment-mismatch/);
});

test('REV-004 relay cannot raise the cutoff or alter the committed history without invalidating the barrier signature', () => {
  const { barrier, lostRecord, survivorRecord } = setup();
  const tampered = structuredClone(barrier);
  tampered.header.lastAcceptedSequence = 999;

  assert.throws(() => validateRevocationBarrier({
    barrier: tampered,
    revokedDeviceRecord: lostRecord,
    authorizingDeviceRecord: survivorRecord
  }), /invalid-revocation-barrier-signature/);
});

test('REV-005 revoked device cannot sign its own cutover authority', () => {
  const { tenantId, lost, lostRecord, history } = setup();

  assert.throws(() => createRevocationBarrier({
    tenantId,
    revokedDeviceRecord: lostRecord,
    historicalEnvelopes: history,
    authorizingDevice: lost,
    authorizingDeviceRecord: lostRecord
  }), /revoked-device-cannot-authorize-cutover/);
});

test('REV-006 cross-tenant authorization cannot validate a revocation barrier', () => {
  const { barrier, survivor, lostRecord } = setup();
  const wrongTenantAuthorizer = publicDeviceRecord(survivor, { tenantId: 'tenant-other' });

  assert.throws(() => validateRevocationBarrier({
    barrier,
    revokedDeviceRecord: lostRecord,
    authorizingDeviceRecord: wrongTenantAuthorizer
  }), /revocation-authorizer-tenant-mismatch/);
});

test('REV-007 revocation cutover cannot claim a complete historical commitment across an unresolved origin gap', () => {
  const { tenantId, lostRecord, envelope } = setup();
  const gappedHistory = [
    envelope(1, 'gap-1', 10),
    envelope(3, 'gap-3', 30)
  ];

  assert.throws(() => originHistoryCommitment({
    tenantId,
    revokedDeviceRecord: lostRecord,
    revokedFromEpoch: 2,
    historicalEnvelopes: gappedHistory
  }), /historical-sequence-gap:2/);
});
