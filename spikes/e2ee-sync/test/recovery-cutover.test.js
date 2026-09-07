import test from 'node:test';
import assert from 'node:assert/strict';

import {
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

function setup() {
  const tenantId = 'tenant-recovery-cutover';
  const recoveredThroughEpoch = 7;
  const nextKeyEpoch = 8;
  const newDevice = generateDeviceIdentity('device-recovered');
  const lostA = generateDeviceIdentity('device-lost-a');
  const lostB = generateDeviceIdentity('device-lost-b');

  const newDeviceRecord = publicDeviceRecord(newDevice, {
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

  const recovery = generateRecoveryIdentity('recovery-cutover-new');
  const nextRoot = generateTenantRootKey();
  const recoveryPackage = wrapTenantEpochForRecovery({
    tenantId,
    keyEpoch: nextKeyEpoch,
    tenantRootKey: nextRoot,
    recoveryRecord: recoveryPublicRecord(recovery),
    authorizingDevice: newDevice
  });
  const coverage = assertRecoveryCoverage({
    tenantId,
    recoveryKeyId: recovery.recoveryKeyId,
    recoverableEpochs: [nextKeyEpoch],
    packages: [recoveryPackage],
    authorizingDeviceRecords: new Map([[newDeviceRecord.deviceId, newDeviceRecord]])
  });

  const plan = planPostRecoveryHardening({
    tenantId,
    recoveredThroughEpoch,
    newDeviceId: newDevice.deviceId,
    lostDeviceIds: [lostA.deviceId, lostB.deviceId],
    newRecoveryKeyId: recovery.recoveryKeyId
  });
  const records = new Map([
    [newDeviceRecord.deviceId, newDeviceRecord],
    [lostARecord.deviceId, lostARecord],
    [lostBRecord.deviceId, lostBRecord]
  ]);

  // The historical evidence is explicit even when it is empty. An absent
  // history is not equivalent to a proven-empty history.
  const histories = new Map([
    [lostA.deviceId, []],
    [lostB.deviceId, []]
  ]);

  const barrierA = createRevocationBarrier({
    tenantId,
    revokedDeviceRecord: lostARecord,
    historicalEnvelopes: histories.get(lostA.deviceId),
    authorizingDevice: newDevice,
    authorizingDeviceRecord: newDeviceRecord,
    createdAt: '2026-09-01T11:30:00.000Z'
  });
  const barrierB = createRevocationBarrier({
    tenantId,
    revokedDeviceRecord: lostBRecord,
    historicalEnvelopes: histories.get(lostB.deviceId),
    authorizingDevice: newDevice,
    authorizingDeviceRecord: newDeviceRecord,
    createdAt: '2026-09-01T11:30:01.000Z'
  });
  const barriers = new Map([
    [lostA.deviceId, barrierA],
    [lostB.deviceId, barrierB]
  ]);

  return {
    tenantId,
    recoveredThroughEpoch,
    nextKeyEpoch,
    newDevice,
    recovery,
    coverage,
    plan,
    records,
    histories,
    barriers,
    barrierA,
    barrierB
  };
}

function safeArgs(fixture, overrides = {}) {
  return {
    plan: fixture.plan,
    deviceAuthorizationRecords: fixture.records,
    currentTenantKeyEpoch: fixture.nextKeyEpoch,
    activeRecoveryKeyId: fixture.recovery.recoveryKeyId,
    recoveryCoverage: fixture.coverage,
    revocationBarriers: fixture.barriers,
    revokedOriginHistories: fixture.histories,
    ...overrides
  };
}

test('REC-019 lower-level hardening alone is not the final resume authority', () => {
  const fixture = setup();
  const base = assertPostRecoveryReadyForFutureSync({
    plan: fixture.plan,
    deviceAuthorizationRecords: fixture.records,
    currentTenantKeyEpoch: fixture.nextKeyEpoch,
    activeRecoveryKeyId: fixture.recovery.recoveryKeyId,
    recoveryCoverage: fixture.coverage
  });
  assert.equal(base.readyForFutureSync, true);

  assert.throws(() => assertPostRecoverySafeToResume(safeArgs(fixture, {
    revocationBarriers: null
  })), /post-recovery-revocation-barriers-required/);
});

test('REC-020 future sync becomes safe only after every lost device has an authenticated cutover barrier bound to recovered history', () => {
  const fixture = setup();
  const safe = assertPostRecoverySafeToResume(safeArgs(fixture));

  assert.equal(safe.safeToResumeFutureSync, true);
  assert.equal(safe.verifiedRevocationBarriers, 2);
  assert.equal(safe.activeDeviceId, fixture.newDevice.deviceId);
});

test('REC-021 one missing lost-device cutover barrier keeps future sync blocked', () => {
  const fixture = setup();
  const incomplete = new Map(fixture.barriers);
  incomplete.delete('device-lost-b');

  assert.throws(() => assertPostRecoverySafeToResume(safeArgs(fixture, {
    revocationBarriers: incomplete
  })), /post-recovery-revocation-barrier-missing:device-lost-b/);
});

test('REC-022 tampering with a post-recovery cutover barrier keeps future sync blocked', () => {
  const fixture = setup();
  const tampered = structuredClone(fixture.barrierA);
  tampered.header.lastAcceptedSequence = 44;
  const poisoned = new Map(fixture.barriers);
  poisoned.set('device-lost-a', tampered);

  assert.throws(() => assertPostRecoverySafeToResume(safeArgs(fixture, {
    revocationBarriers: poisoned
  })), /invalid-revocation-barrier-signature/);
});
