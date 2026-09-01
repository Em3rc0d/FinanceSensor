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

  const barrierA = createRevocationBarrier({
    tenantId,
    revokedDeviceRecord: lostARecord,
    historicalEnvelopes: [],
    authorizingDevice: newDevice,
    authorizingDeviceRecord: newDeviceRecord,
    createdAt: '2026-09-01T11:30:00.000Z'
  });
  const barrierB = createRevocationBarrier({
    tenantId,
    revokedDeviceRecord: lostBRecord,
    historicalEnvelopes: [],
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
    barriers,
    barrierA,
    barrierB
  };
}

test('REC-019 lower-level hardening alone is not the final resume authority', () => {
  const { nextKeyEpoch, recovery, coverage, plan, records } = setup();
  const base = assertPostRecoveryReadyForFutureSync({
    plan,
    deviceAuthorizationRecords: records,
    currentTenantKeyEpoch: nextKeyEpoch,
    activeRecoveryKeyId: recovery.recoveryKeyId,
    recoveryCoverage: coverage
  });
  assert.equal(base.readyForFutureSync, true);

  assert.throws(() => assertPostRecoverySafeToResume({
    plan,
    deviceAuthorizationRecords: records,
    currentTenantKeyEpoch: nextKeyEpoch,
    activeRecoveryKeyId: recovery.recoveryKeyId,
    recoveryCoverage: coverage,
    revocationBarriers: null
  }), /post-recovery-revocation-barriers-required/);
});

test('REC-020 future sync becomes safe only after every lost device has an authenticated cutover barrier', () => {
  const { nextKeyEpoch, newDevice, recovery, coverage, plan, records, barriers } = setup();
  const safe = assertPostRecoverySafeToResume({
    plan,
    deviceAuthorizationRecords: records,
    currentTenantKeyEpoch: nextKeyEpoch,
    activeRecoveryKeyId: recovery.recoveryKeyId,
    recoveryCoverage: coverage,
    revocationBarriers: barriers
  });

  assert.equal(safe.safeToResumeFutureSync, true);
  assert.equal(safe.verifiedRevocationBarriers, 2);
  assert.equal(safe.activeDeviceId, newDevice.deviceId);
});

test('REC-021 one missing lost-device cutover barrier keeps future sync blocked', () => {
  const { nextKeyEpoch, recovery, coverage, plan, records, barriers } = setup();
  const incomplete = new Map(barriers);
  incomplete.delete('device-lost-b');

  assert.throws(() => assertPostRecoverySafeToResume({
    plan,
    deviceAuthorizationRecords: records,
    currentTenantKeyEpoch: nextKeyEpoch,
    activeRecoveryKeyId: recovery.recoveryKeyId,
    recoveryCoverage: coverage,
    revocationBarriers: incomplete
  }), /post-recovery-revocation-barrier-missing:device-lost-b/);
});

test('REC-022 tampering with a post-recovery cutover barrier keeps future sync blocked', () => {
  const { nextKeyEpoch, recovery, coverage, plan, records, barriers, barrierA } = setup();
  const tampered = structuredClone(barrierA);
  tampered.header.lastAcceptedSequence = 44;
  const poisoned = new Map(barriers);
  poisoned.set('device-lost-a', tampered);

  assert.throws(() => assertPostRecoverySafeToResume({
    plan,
    deviceAuthorizationRecords: records,
    currentTenantKeyEpoch: nextKeyEpoch,
    activeRecoveryKeyId: recovery.recoveryKeyId,
    recoveryCoverage: coverage,
    revocationBarriers: poisoned
  }), /invalid-revocation-barrier-signature/);
});
