import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDeviceIdentity,
  generateTenantRootKey,
  publicDeviceRecord
} from '../src/protocol.js';
import {
  cloudRecoveryView,
  generateRecoveryIdentity,
  recoveryPublicRecord,
  unwrapTenantEpochFromRecovery,
  wrapTenantEpochForRecovery
} from '../src/recovery.js';

const tenantId = 'tenant-recovery';
const authorizer = generateDeviceIdentity('device-a');
const authorizerRecord = publicDeviceRecord(authorizer);

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
  // No device private key is used by the recovery operation; only the historical
  // authorizer public record is required to verify that the wrap was legitimate.
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
