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
  cloudRecoveryView,
  generateRecoveryIdentity,
  planPostRecoveryHardening,
  recoveryPublicRecord,
  unwrapTenantEpochFromRecovery,
  wrapTenantEpochForRecovery
} from '../src/recovery.js';

const tenantId = 'tenant-recovery';
const authorizer = generateDeviceIdentity('device-a');
const authorizerRecord = publicDeviceRecord(authorizer);
const authorizerRecords = new Map([[authorizerRecord.deviceId, authorizerRecord]]);

function wrap(epoch, root, recovery, signer = authorizer) {
  return wrapTenantEpochForRecovery({
    tenantId,
    keyEpoch: epoch,
    tenantRootKey: root,
    recoveryRecord: recoveryPublicRecord(recovery),
    authorizingDevice: signer
  });
}

test('REC-001 cloud view contains public recovery material and ciphertext, not private recovery key or tenant root key', () => {
  const recovery = generateRecoveryIdentity('recovery-1');
  const root = generateTenantRootKey();
  const pkg = wrap(1, root, recovery);
  const cloud = cloudRecoveryView([pkg], recoveryPublicRecord(recovery));
  const serialized = JSON.stringify(cloud);
  assert.equal(serialized.includes(root.toString('base64url')), false);
  assert.equal('privateKey' in cloud, false);
  assert.equal(cloud.recoveryKeyId, 'recovery-1');
});

test('REC-002 wrong recovery private key cannot unwrap tenant epoch', () => {
  const recoveryA = generateRecoveryIdentity('recovery-a');
  const recoveryB = generateRecoveryIdentity('recovery-a');
  const pkg = wrap(1, generateTenantRootKey(), recoveryA);
  assert.throws(() => unwrapTenantEpochFromRecovery({
    package: pkg,
    recoveryIdentity: recoveryB,
    authorizingDeviceRecord: authorizerRecord
  }));
});

test('REC-003 one recovery identity can restore every epoch wrapped to its public key', () => {
  const recovery = generateRecoveryIdentity('recovery-history');
  const roots = [generateTenantRootKey(), generateTenantRootKey(), generateTenantRootKey()];
  const packages = roots.map((root, index) => wrap(index + 1, root, recovery));
  const restored = packages.map(pkg => unwrapTenantEpochFromRecovery({
    package: pkg,
    recoveryIdentity: recovery,
    authorizingDeviceRecord: authorizerRecord
  }));
  assert.deepEqual(restored.map(x => x.toString('hex')), roots.map(x => x.toString('hex')));
});

test('REC-004 possessing recovery public material alone cannot decrypt an epoch', () => {
  const recovery = generateRecoveryIdentity('recovery-public-only');
  const pkg = wrap(1, generateTenantRootKey(), recovery);
  const publicOnly = { recoveryKeyId: recovery.recoveryKeyId, encryption: {} };
  assert.throws(() => unwrapTenantEpochFromRecovery({
    package: pkg,
    recoveryIdentity: publicOnly,
    authorizingDeviceRecord: authorizerRecord
  }), /recovery-private-key-required/);
});

test('REC-005 wrap is bound to tenant/epoch/key-id through authenticated context and signature', () => {
  const recovery = generateRecoveryIdentity('recovery-context');
  const pkg = wrap(1, generateTenantRootKey(), recovery);
  const tampered = structuredClone(pkg);
  tampered.header.keyEpoch = 2;
  assert.throws(() => unwrapTenantEpochFromRecovery({
    package: tampered,
    recoveryIdentity: recovery,
    authorizingDeviceRecord: authorizerRecord
  }), /invalid-recovery-wrap-signature/);
});

test('REC-006 ciphertext tampering fails recovery', () => {
  const recovery = generateRecoveryIdentity('recovery-tamper');
  const pkg = wrap(1, generateTenantRootKey(), recovery);
  const tampered = structuredClone(pkg);
  const chars = tampered.ciphertext.split('');
  chars[0] = chars[0] === 'A' ? 'B' : 'A';
  tampered.ciphertext = chars.join('');
  assert.throws(() => unwrapTenantEpochFromRecovery({
    package: tampered,
    recoveryIdentity: recovery,
    authorizingDeviceRecord: authorizerRecord
  }));
});

test('REC-007 all devices may be gone and the Recovery Kit can still restore an epoch locally', () => {
  const recovery = generateRecoveryIdentity('recovery-disaster');
  const root = generateTenantRootKey();
  const pkg = wrap(7, root, recovery);
  const restored = unwrapTenantEpochFromRecovery({
    package: pkg,
    recoveryIdentity: recovery,
    authorizingDeviceRecord: authorizerRecord
  });
  assert.equal(restored.toString('hex'), root.toString('hex'));
});

test('REC-008 rotating Recovery Key means old key cannot unwrap future epochs', () => {
  const oldRecovery = generateRecoveryIdentity('recovery-old');
  const newRecovery = generateRecoveryIdentity('recovery-new');
  const oldRoot = generateTenantRootKey();
  const newRoot = generateTenantRootKey();
  const oldPkg = wrap(1, oldRoot, oldRecovery);
  const newPkg = wrap(2, newRoot, newRecovery);

  const restoredOld = unwrapTenantEpochFromRecovery({ package: oldPkg, recoveryIdentity: oldRecovery, authorizingDeviceRecord: authorizerRecord });
  assert.equal(restoredOld.toString('hex'), oldRoot.toString('hex'));
  assert.throws(() => unwrapTenantEpochFromRecovery({ package: newPkg, recoveryIdentity: oldRecovery, authorizingDeviceRecord: authorizerRecord }), /wrong-recovery-key-id/);
  const restoredNew = unwrapTenantEpochFromRecovery({ package: newPkg, recoveryIdentity: newRecovery, authorizingDeviceRecord: authorizerRecord });
  assert.equal(restoredNew.toString('hex'), newRoot.toString('hex'));
});

test('REC-009 wrong authorizer record cannot validate a recovery wrap', () => {
  const recovery = generateRecoveryIdentity('recovery-authority');
  const root = generateTenantRootKey();
  const pkg = wrap(1, root, recovery);
  const impostor = generateDeviceIdentity('device-a');
  const impostorRecord = publicDeviceRecord(impostor);
  assert.throws(() => unwrapTenantEpochFromRecovery({
    package: pkg,
    recoveryIdentity: recovery,
    authorizingDeviceRecord: impostorRecord
  }), /invalid-recovery-wrap-signature/);
});

test('REC-010 no private Recovery Kit means no hidden recovery path exists in the model', () => {
  const recovery = generateRecoveryIdentity('recovery-no-kit');
  const pkg = wrap(1, generateTenantRootKey(), recovery);
  const cloud = cloudRecoveryView([pkg], recoveryPublicRecord(recovery));
  assert.ok(cloud.wraps.length === 1);
  assert.throws(() => unwrapTenantEpochFromRecovery({
    package: cloud.wraps[0],
    recoveryIdentity: null,
    authorizingDeviceRecord: authorizerRecord
  }), /recovery-private-key-required/);
});

test('REC-011 declared recoverable epochs require complete authenticated recovery-wrap coverage', () => {
  const recovery = generateRecoveryIdentity('recovery-coverage');
  const packages = [
    wrap(1, generateTenantRootKey(), recovery),
    wrap(2, generateTenantRootKey(), recovery)
  ];

  assert.deepEqual(
    assertRecoveryCoverage({
      tenantId,
      recoveryKeyId: recovery.recoveryKeyId,
      recoverableEpochs: [1, 2],
      packages,
      authorizingDeviceRecords: authorizerRecords
    }).coveredEpochs,
    [1, 2]
  );

  assert.throws(() => assertRecoveryCoverage({
    tenantId,
    recoveryKeyId: recovery.recoveryKeyId,
    recoverableEpochs: [1, 2, 3],
    packages,
    authorizingDeviceRecords: authorizerRecords
  }), /recovery-coverage-missing:3/);
});

test('REC-012 post-recovery hardening revokes lost devices and rotates tenant + recovery epochs before future sync', () => {
  const plan = planPostRecoveryHardening({
    tenantId,
    recoveredThroughEpoch: 7,
    newDeviceId: 'device-recovered',
    lostDeviceIds: ['device-a', 'device-b', 'device-a'],
    newRecoveryKeyId: 'recovery-after-disaster'
  });

  assert.equal(plan.rotateTenantKey.required, true);
  assert.equal(plan.rotateTenantKey.nextKeyEpoch, 8);
  assert.equal(plan.activateDevice.deviceId, 'device-recovered');
  assert.equal(plan.activateDevice.authorizedFromEpoch, 8);
  assert.deepEqual(plan.revokeDevices.map(x => x.deviceId), ['device-a', 'device-b']);
  assert.ok(plan.revokeDevices.every(x => x.revokedFromEpoch === 8));
  assert.equal(plan.rotateRecoveryKey.required, true);
  assert.equal(plan.rotateRecoveryKey.newRecoveryKeyId, 'recovery-after-disaster');
  assert.equal(plan.revokeDevices.some(x => x.deviceId === 'device-recovered'), false);
});

test('REC-013 authorizer identity in the signed header must match the supplied authorization record', () => {
  const recovery = generateRecoveryIdentity('recovery-authorizer-binding');
  const pkg = wrap(1, generateTenantRootKey(), recovery);
  const aliasRecord = { ...authorizerRecord, deviceId: 'device-shadow' };

  assert.throws(() => unwrapTenantEpochFromRecovery({
    package: pkg,
    recoveryIdentity: recovery,
    authorizingDeviceRecord: aliasRecord
  }), /recovery-authorizer-identity-mismatch/);
});

test('REC-014 a device revoked for the target epoch cannot authorize a recovery wrap', () => {
  const recovery = generateRecoveryIdentity('recovery-revoked-authorizer');
  const pkg = wrap(2, generateTenantRootKey(), recovery);
  const revokedRecord = publicDeviceRecord(authorizer, {
    authorizedFromEpoch: 1,
    revokedFromEpoch: 2,
    status: 'REVOKED'
  });

  assert.throws(() => unwrapTenantEpochFromRecovery({
    package: pkg,
    recoveryIdentity: recovery,
    authorizingDeviceRecord: revokedRecord
  }), /recovery-authorizer-not-authorized-for-epoch/);
});

test('REC-015 a tampered wrap cannot satisfy recovery coverage merely by existing', () => {
  const recovery = generateRecoveryIdentity('recovery-authenticated-coverage');
  const valid = wrap(1, generateTenantRootKey(), recovery);
  const tampered = wrap(2, generateTenantRootKey(), recovery);
  const chars = tampered.ciphertext.split('');
  chars[0] = chars[0] === 'A' ? 'B' : 'A';
  tampered.ciphertext = chars.join('');

  assert.throws(() => assertRecoveryCoverage({
    tenantId,
    recoveryKeyId: recovery.recoveryKeyId,
    recoverableEpochs: [1, 2],
    packages: [valid, tampered],
    authorizingDeviceRecords: authorizerRecords
  }), /invalid-recovery-wrap-signature/);
});

test('REC-016 distinct authentic wraps for one epoch are ambiguous and fail closed', () => {
  const recovery = generateRecoveryIdentity('recovery-ambiguous');
  const packageA = wrap(3, generateTenantRootKey(), recovery);
  const packageB = wrap(3, generateTenantRootKey(), recovery);

  assert.throws(() => assertRecoveryCoverage({
    tenantId,
    recoveryKeyId: recovery.recoveryKeyId,
    recoverableEpochs: [3],
    packages: [packageA, packageB],
    authorizingDeviceRecords: authorizerRecords
  }), /recovery-coverage-ambiguous:3/);
});

test('REC-017 exact duplicate delivery of one authenticated wrap remains idempotent', () => {
  const recovery = generateRecoveryIdentity('recovery-duplicate-delivery');
  const pkg = wrap(4, generateTenantRootKey(), recovery);
  const coverage = assertRecoveryCoverage({
    tenantId,
    recoveryKeyId: recovery.recoveryKeyId,
    recoverableEpochs: [4],
    packages: [pkg, structuredClone(pkg), structuredClone(pkg)],
    authorizingDeviceRecords: authorizerRecords
  });

  assert.deepEqual(coverage.coveredEpochs, [4]);
  assert.equal(coverage.validatedDistinctPackages, 1);
});

test('REC-018 future sync remains blocked until new epoch, new Recovery Key, new-device authorization and lost-device revocation are all applied', () => {
  const recoveredThroughEpoch = 7;
  const nextKeyEpoch = 8;
  const newDevice = generateDeviceIdentity('device-recovered');
  const lostDeviceB = generateDeviceIdentity('device-b');
  const newDeviceRecord = publicDeviceRecord(newDevice, { authorizedFromEpoch: nextKeyEpoch });
  const lostRecordA = publicDeviceRecord(authorizer, {
    authorizedFromEpoch: 1,
    revokedFromEpoch: nextKeyEpoch,
    status: 'REVOKED'
  });
  const lostRecordB = publicDeviceRecord(lostDeviceB, {
    authorizedFromEpoch: 1,
    revokedFromEpoch: nextKeyEpoch,
    status: 'REVOKED'
  });
  const nextRecovery = generateRecoveryIdentity('recovery-after-disaster');
  const nextRoot = generateTenantRootKey();
  const nextPackage = wrap(nextKeyEpoch, nextRoot, nextRecovery, newDevice);
  const coverage = assertRecoveryCoverage({
    tenantId,
    recoveryKeyId: nextRecovery.recoveryKeyId,
    recoverableEpochs: [nextKeyEpoch],
    packages: [nextPackage],
    authorizingDeviceRecords: new Map([[newDeviceRecord.deviceId, newDeviceRecord]])
  });
  const plan = planPostRecoveryHardening({
    tenantId,
    recoveredThroughEpoch,
    newDeviceId: newDevice.deviceId,
    lostDeviceIds: [authorizer.deviceId, lostDeviceB.deviceId],
    newRecoveryKeyId: nextRecovery.recoveryKeyId
  });
  const completeRecords = new Map([
    [newDeviceRecord.deviceId, newDeviceRecord],
    [lostRecordA.deviceId, lostRecordA],
    [lostRecordB.deviceId, lostRecordB]
  ]);

  assert.throws(() => assertPostRecoveryReadyForFutureSync({
    plan,
    deviceAuthorizationRecords: completeRecords,
    currentTenantKeyEpoch: recoveredThroughEpoch,
    activeRecoveryKeyId: nextRecovery.recoveryKeyId,
    recoveryCoverage: coverage
  }), /post-recovery-tenant-epoch-not-rotated/);

  assert.throws(() => assertPostRecoveryReadyForFutureSync({
    plan,
    deviceAuthorizationRecords: completeRecords,
    currentTenantKeyEpoch: nextKeyEpoch,
    activeRecoveryKeyId: 'recovery-stale',
    recoveryCoverage: coverage
  }), /post-recovery-recovery-key-not-rotated/);

  const missingRevocation = new Map(completeRecords);
  missingRevocation.set(lostRecordB.deviceId, publicDeviceRecord(lostDeviceB));
  assert.throws(() => assertPostRecoveryReadyForFutureSync({
    plan,
    deviceAuthorizationRecords: missingRevocation,
    currentTenantKeyEpoch: nextKeyEpoch,
    activeRecoveryKeyId: nextRecovery.recoveryKeyId,
    recoveryCoverage: coverage
  }), /post-recovery-lost-device-not-revoked:device-b/);

  const ready = assertPostRecoveryReadyForFutureSync({
    plan,
    deviceAuthorizationRecords: completeRecords,
    currentTenantKeyEpoch: nextKeyEpoch,
    activeRecoveryKeyId: nextRecovery.recoveryKeyId,
    recoveryCoverage: coverage
  });

  assert.equal(ready.readyForFutureSync, true);
  assert.equal(ready.nextKeyEpoch, nextKeyEpoch);
  assert.equal(ready.activeDeviceId, newDevice.deviceId);
});
