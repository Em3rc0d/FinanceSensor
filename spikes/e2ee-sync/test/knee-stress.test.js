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
import { createRevocationBarrier } from '../src/revocation.js';
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
  const historicalEnvelope = (device, sequence, eventId, amount) => createEncryptedEnvelope({
    tenantId,
    keyEpoch: recoveredThroughEpoch,
    tenantRootKey: oldRoot,
    originDevice: device,
    originDeviceSequence: sequence,
    eventId,
    createdAt: `2026-08-31T10:${String(sequence).padStart(2, '0')}:00.000Z`,
    action: {
      type: 'CANONICAL_EVENT_CREATED',
      canonicalEventId: `canonical-${eventId}`,
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
    nextKeyEpoch,
    recovered,
    recoveredRecord,
    lostARecord,
    lostBRecord,
    lurkingRecord,
    recovery,
    coverage,
    plan,
    records,
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
