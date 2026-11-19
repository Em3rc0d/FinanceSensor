import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createEncryptedEnvelope,
  generateDeviceIdentity,
  generateTenantRootKey,
  publicDeviceRecord
} from '../src/protocol.js';
import {
  assertPostRecoveryReadyForFutureSync,
  assertRecoveryCoverage,
  generateRecoveryIdentity,
  planPostRecoveryHardening,
  recoveryPublicRecord,
  wrapTenantEpochForRecovery
} from '../src/recovery.js';
import {
  assertRevokedOriginHistory,
  createRevocationBarrier,
  originHistoryCommitment
} from '../src/revocation.js';
import { assertPostRecoverySafeToResume } from '../src/recovery-cutover.js';

function setupStressRig() {
  const tenantId = 'tenant-knee-stress';
  const recoveredThroughEpoch = 7;
  const nextKeyEpoch = 8;

  const recovered = generateDeviceIdentity('device-recovered');
  const lostA = generateDeviceIdentity('device-lost-a');
  const lostB = generateDeviceIdentity('device-lost-b');
  const lurking = generateDeviceIdentity('device-lurking');

  const recoveredRecord = publicDeviceRecord(recovered, {
    tenantId,
    authorizedFromEpoch: nextKeyEpoch
  });
  const lostARecord = publicDeviceRecord(lostA, {
    tenantId,
    authorizedFromEpoch: 1,
    revokedFromEpoch: nextKeyEpoch,
    status: 'REVOKED'
  });
  const lostBRecord = publicDeviceRecord(lostB, {
    tenantId,
    authorizedFromEpoch: 1,
    revokedFromEpoch: nextKeyEpoch,
    status: 'REVOKED'
  });
  const lurkingRecord = publicDeviceRecord(lurking, {
    tenantId,
    authorizedFromEpoch: 1,
    status: 'ACTIVE'
  });

  const recovery = generateRecoveryIdentity('recovery-knee-stress');
  const nextRoot = generateTenantRootKey();
  const recoveryPackage = wrapTenantEpochForRecovery({
    tenantId,
    keyEpoch: nextKeyEpoch,
    tenantRootKey: nextRoot,
    recoveryRecord: recoveryPublicRecord(recovery),
    authorizingDevice: recovered
  });
  const coverage = assertRecoveryCoverage({
    tenantId,
    recoveryKeyId: recovery.recoveryKeyId,
    recoverableEpochs: [nextKeyEpoch],
    packages: [recoveryPackage],
    authorizingDeviceRecords: new Map([[recoveredRecord.deviceId, recoveredRecord]])
  });

  const plan = planPostRecoveryHardening({
    tenantId,
    recoveredThroughEpoch,
    newDeviceId: recovered.deviceId,
    lostDeviceIds: [lostA.deviceId, lostB.deviceId],
    newRecoveryKeyId: recovery.recoveryKeyId
  });

  const records = new Map([
    [recoveredRecord.deviceId, recoveredRecord],
    [lostARecord.deviceId, lostARecord],
    [lostBRecord.deviceId, lostBRecord]
  ]);

  const oldRoot = generateTenantRootKey();
  const historicalEnvelope = (
    device,
    sequence,
    eventId,
    amount,
    keyEpoch = recoveredThroughEpoch
  ) => createEncryptedEnvelope({
    tenantId,
    keyEpoch,
    tenantRootKey: oldRoot,
    originDevice: device,
    originDeviceSequence: sequence,
    eventId,
    createdAt: `2026-08-31T10:${String(sequence % 60).padStart(2, '0')}:00.000Z`,
    action: {
      type: 'CANONICAL_EVENT_CREATED',
      canonicalEventId: `canonical-${eventId}-${sequence}`,
      event: { amount, currency: 'PEN' }
    }
  });

  const historyA = [
    historicalEnvelope(lostA, 1, 'lost-a-1', 10),
    historicalEnvelope(lostA, 2, 'lost-a-2', 20)
  ];
  const historyB = [
    historicalEnvelope(lostB, 1, 'lost-b-1', 30)
  ];

  const barrierFor = (record, history, createdAt) => createRevocationBarrier({
    tenantId,
    revokedDeviceRecord: record,
    historicalEnvelopes: history,
    authorizingDevice: recovered,
    authorizingDeviceRecord: recoveredRecord,
    createdAt
  });

  const barrierA = barrierFor(lostARecord, historyA, '2026-09-01T11:00:00.000Z');
  const barrierB = barrierFor(lostBRecord, historyB, '2026-09-01T11:00:01.000Z');

  return {
    tenantId,
    recoveredThroughEpoch,
    nextKeyEpoch,
    recovered,
    recoveredRecord,
    lostA,
    lostB,
    lostARecord,
    lostBRecord,
    lurking,
    lurkingRecord,
    recovery,
    coverage,
    plan,
    records,
    oldRoot,
    historicalEnvelope,
    historyA,
    historyB,
    barrierA,
    barrierB,
    barrierFor
  };
}

function safeArgs(rig, overrides = {}) {
  return {
    plan: rig.plan,
    deviceAuthorizationRecords: rig.records,
    currentTenantKeyEpoch: rig.nextKeyEpoch,
    activeRecoveryKeyId: rig.recovery.recoveryKeyId,
    recoveryCoverage: rig.coverage,
    revocationBarriers: new Map([
      [rig.lostARecord.deviceId, rig.barrierA],
      [rig.lostBRecord.deviceId, rig.barrierB]
    ]),
    revokedOriginHistories: new Map([
      [rig.lostARecord.deviceId, rig.historyA],
      [rig.lostBRecord.deviceId, rig.historyB]
    ]),
    ...overrides
  };
}

test('KNEE-001 final recovery gate must reject a validly signed barrier that commits the wrong recovered history', () => {
  const rig = setupStressRig();
  const emptyBarrierA = rig.barrierFor(
    rig.lostARecord,
    [],
    '2026-09-01T11:05:00.000Z'
  );

  const barriers = new Map([
    [rig.lostARecord.deviceId, emptyBarrierA],
    [rig.lostBRecord.deviceId, rig.barrierB]
  ]);

  assert.throws(() => assertPostRecoverySafeToResume(safeArgs(rig, {
    revocationBarriers: barriers
  })), /post-recovery-revoked-origin-history|revoked-origin-history/);
});

test('KNEE-002 all-devices-lost recovery must fail if an unplanned old tenant device is still authorized for the next epoch', () => {
  const rig = setupStressRig();
  const poisonedRecords = new Map(rig.records);
  poisonedRecords.set(rig.lurkingRecord.deviceId, rig.lurkingRecord);

  assert.throws(() => assertPostRecoveryReadyForFutureSync({
    plan: rig.plan,
    deviceAuthorizationRecords: poisonedRecords,
    currentTenantKeyEpoch: rig.nextKeyEpoch,
    activeRecoveryKeyId: rig.recovery.recoveryKeyId,
    recoveryCoverage: rig.coverage
  }), /post-recovery-unexpected-device-still-authorized:device-lurking/);
});

test('KNEE-003 semantically identical re-signed barriers are retry-equivalent rather than ambiguous', () => {
  const rig = setupStressRig();
  const retryBarrierA = rig.barrierFor(
    rig.lostARecord,
    rig.historyA,
    '2026-09-01T11:06:00.000Z'
  );
  const barriers = new Map([
    [rig.lostARecord.deviceId, [rig.barrierA, retryBarrierA, structuredClone(rig.barrierA)]],
    [rig.lostBRecord.deviceId, [rig.barrierB, structuredClone(rig.barrierB)]]
  ]);

  const safe = assertPostRecoverySafeToResume(safeArgs(rig, {
    revocationBarriers: barriers
  }));

  assert.equal(safe.safeToResumeFutureSync, true);
  assert.equal(safe.verifiedRevocationBarriers, 2);
});

test('KNEE-004 two authentic barriers with different historical commitments for one lost device fail closed as ambiguous', () => {
  const rig = setupStressRig();
  const shorterBarrierA = rig.barrierFor(
    rig.lostARecord,
    [rig.historyA[0]],
    '2026-09-01T11:07:00.000Z'
  );
  const barriers = new Map([
    [rig.lostARecord.deviceId, [rig.barrierA, shorterBarrierA]],
    [rig.lostBRecord.deviceId, rig.barrierB]
  ]);

  assert.throws(() => assertPostRecoverySafeToResume(safeArgs(rig, {
    revocationBarriers: barriers
  })), /post-recovery-revocation-barrier-ambiguous:device-lost-a/);
});

test('KNEE-005 final recovery gate requires recovered origin history evidence for every lost device', () => {
  const rig = setupStressRig();
  const incompleteHistories = new Map([
    [rig.lostARecord.deviceId, rig.historyA]
  ]);

  assert.throws(() => assertPostRecoverySafeToResume(safeArgs(rig, {
    revokedOriginHistories: incompleteHistories
  })), /post-recovery-revoked-origin-history-missing:device-lost-b/);
});

test('KNEE-006 one replay event id cannot identify two different historical envelopes', () => {
  const rig = setupStressRig();
  const reusedEventIdHistory = [
    rig.historicalEnvelope(rig.lostA, 1, 'reused-event-id', 10),
    rig.historicalEnvelope(rig.lostA, 2, 'reused-event-id', 20)
  ];

  assert.throws(() => originHistoryCommitment({
    tenantId: rig.tenantId,
    revokedDeviceRecord: rig.lostARecord,
    revokedFromEpoch: rig.nextKeyEpoch,
    historicalEnvelopes: reusedEventIdHistory
  }), /historical-event-id-reuse:reused-event-id/);
});

test('KNEE-007 a signed fork at every tested origin sequence is rejected rather than averaged or last-write-wins', () => {
  const rig = setupStressRig();
  const history = Array.from({ length: 16 }, (_, index) =>
    rig.historicalEnvelope(rig.lostA, index + 1, `fatigue-${index + 1}`, index + 1)
  );

  for (let sequence = 1; sequence <= history.length; sequence += 1) {
    const fork = rig.historicalEnvelope(
      rig.lostA,
      sequence,
      `fork-${sequence}`,
      10_000 + sequence
    );
    assert.throws(() => originHistoryCommitment({
      tenantId: rig.tenantId,
      revokedDeviceRecord: rig.lostARecord,
      revokedFromEpoch: rig.nextKeyEpoch,
      historicalEnvelopes: [...history, fork]
    }), new RegExp(`historical-sequence-fork:${sequence}`));
  }
});

test('KNEE-008 sixty-four-envelope history survives reverse order and repeated exact relay delivery', () => {
  const rig = setupStressRig();
  const history = Array.from({ length: 64 }, (_, index) =>
    rig.historicalEnvelope(rig.lostA, index + 1, `load-${index + 1}`, index + 1)
  );
  const barrier = rig.barrierFor(
    rig.lostARecord,
    history,
    '2026-09-01T11:08:00.000Z'
  );
  const loaded = [
    ...history.slice().reverse(),
    ...history,
    ...history.slice().reverse()
  ];

  const frozen = assertRevokedOriginHistory({
    barrier,
    historicalEnvelopes: loaded,
    revokedDeviceRecord: rig.lostARecord,
    authorizingDeviceRecord: rig.recoveredRecord
  });

  assert.equal(frozen.historicalOriginFrozen, true);
  assert.equal(frozen.lastAcceptedSequence, 64);
});

test('KNEE-009 old epochs remain historical only below the revocation epoch; the cutover epoch itself is forbidden', () => {
  const rig = setupStressRig();
  const historicalAcrossEpochs = Array.from({ length: 7 }, (_, index) =>
    rig.historicalEnvelope(
      rig.lostA,
      index + 1,
      `epoch-${index + 1}`,
      index + 1,
      index + 1
    )
  );

  const commitment = originHistoryCommitment({
    tenantId: rig.tenantId,
    revokedDeviceRecord: rig.lostARecord,
    revokedFromEpoch: rig.nextKeyEpoch,
    historicalEnvelopes: historicalAcrossEpochs
  });
  assert.equal(commitment.lastAcceptedSequence, 7);

  const crossesCutover = rig.historicalEnvelope(
    rig.lostA,
    8,
    'epoch-8-forbidden',
    8,
    rig.nextKeyEpoch
  );
  assert.throws(() => originHistoryCommitment({
    tenantId: rig.tenantId,
    revokedDeviceRecord: rig.lostARecord,
    revokedFromEpoch: rig.nextKeyEpoch,
    historicalEnvelopes: [...historicalAcrossEpochs, crossesCutover]
  }), /historical-envelope-crosses-revocation-epoch/);
});

test('KNEE-010 thirty-two equivalent barrier retries remain one semantic cutover authority', () => {
  const rig = setupStressRig();
  const retryBarriers = Array.from({ length: 32 }, (_, index) =>
    rig.barrierFor(
      rig.lostARecord,
      rig.historyA,
      `2026-09-01T12:${String(index).padStart(2, '0')}:00.000Z`
    )
  );

  const barriers = new Map([
    [rig.lostARecord.deviceId, retryBarriers],
    [rig.lostBRecord.deviceId, rig.barrierB]
  ]);
  const safe = assertPostRecoverySafeToResume(safeArgs(rig, {
    revocationBarriers: barriers
  }));

  assert.equal(safe.safeToResumeFutureSync, true);
  assert.equal(safe.verifiedRevocationBarriers, 2);
  assert.equal(safe.observedRevocationBarrierPackages, 33);
});

test('KNEE-011 a device active at the last recovered epoch cannot disappear from the lost-device plan merely because it is already marked revoked at N+1', () => {
  const rig = setupStressRig();
  const omitted = generateDeviceIdentity('device-omitted-lost');
  const omittedRecord = publicDeviceRecord(omitted, {
    tenantId: rig.tenantId,
    authorizedFromEpoch: 1,
    revokedFromEpoch: rig.nextKeyEpoch,
    status: 'REVOKED'
  });
  const poisonedRecords = new Map(rig.records);
  poisonedRecords.set(omittedRecord.deviceId, omittedRecord);

  assert.throws(() => assertPostRecoveryReadyForFutureSync({
    plan: rig.plan,
    deviceAuthorizationRecords: poisonedRecords,
    currentTenantKeyEpoch: rig.nextKeyEpoch,
    activeRecoveryKeyId: rig.recovery.recoveryKeyId,
    recoveryCoverage: rig.coverage
  }), /post-recovery-active-at-recovery-epoch-not-declared-lost:device-omitted-lost/);
});

test('KNEE-012 unrelated authorization records from another tenant do not contaminate the recovery gate', () => {
  const rig = setupStressRig();
  const otherTenantDevice = generateDeviceIdentity('device-other-tenant');
  const otherTenantRecord = publicDeviceRecord(otherTenantDevice, {
    tenantId: 'tenant-other',
    authorizedFromEpoch: 1,
    status: 'ACTIVE'
  });
  const records = new Map(rig.records);
  records.set(otherTenantRecord.deviceId, otherTenantRecord);

  const ready = assertPostRecoveryReadyForFutureSync({
    plan: rig.plan,
    deviceAuthorizationRecords: records,
    currentTenantKeyEpoch: rig.nextKeyEpoch,
    activeRecoveryKeyId: rig.recovery.recoveryKeyId,
    recoveryCoverage: rig.coverage
  });
  assert.equal(ready.readyForFutureSync, true);
});
