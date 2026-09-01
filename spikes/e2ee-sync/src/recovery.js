import {
  createCipheriv,
  createDecipheriv,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign,
  verify
} from 'node:crypto';
import { isAuthorizedForEpoch, stableJson } from './protocol.js';

// FEASIBILITY SPIKE ONLY.
// This proves recovery ownership/revocation properties. Production recovery
// wrapping must use a reviewed HPKE implementation and platform key controls.

const RECOVERY_WRAP_PROTOCOL = 'FINANCESENSOR_RECOVERY_WRAP_SPIKE_V1';
const utf8 = value => Buffer.from(String(value), 'utf8');
const b64 = buffer => Buffer.from(buffer).toString('base64url');
const fromB64 = value => Buffer.from(value, 'base64url');

function publicKeyDer(keyObject) {
  return keyObject.export({ type: 'spki', format: 'der' });
}

function publicKeyFromDer(value) {
  return createPublicKey({ key: fromB64(value), type: 'spki', format: 'der' });
}

function deriveRecoveryWrapKey(sharedSecret, { tenantId, keyEpoch, recoveryKeyId }) {
  return Buffer.from(hkdfSync(
    'sha256',
    sharedSecret,
    utf8(`FinanceSensor/recovery/${tenantId}/epoch/${keyEpoch}`),
    utf8(`FinanceSensor/recovery-wrap/${recoveryKeyId}/v1`),
    32
  ));
}

function encrypt(key, plaintext, aad) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { nonce, ciphertext, tag: cipher.getAuthTag() };
}

function decrypt(key, { nonce, ciphertext, tag }, aad) {
  const decipher = createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function signedBytes(header, encrypted) {
  return Buffer.concat([
    utf8(stableJson(header)), Buffer.from([0]),
    encrypted.nonce, Buffer.from([0]),
    encrypted.ciphertext, Buffer.from([0]),
    encrypted.tag
  ]);
}

function decodeRecoveryPackage(wrapped) {
  const header = wrapped?.header;
  if (!header || typeof header !== 'object') throw new Error('invalid-recovery-package');
  if (header.protocol !== RECOVERY_WRAP_PROTOCOL) throw new Error('unsupported-recovery-protocol');
  if (!header.tenantId || !Number.isInteger(header.keyEpoch) || header.keyEpoch <= 0) {
    throw new Error('invalid-recovery-package-context');
  }
  if (!header.recoveryKeyId || !header.authorizingDeviceId || !header.ephemeralPublicKey) {
    throw new Error('invalid-recovery-package-context');
  }
  if (!wrapped.nonce || !wrapped.ciphertext || !wrapped.tag || !wrapped.signature) {
    throw new Error('invalid-recovery-package-framing');
  }

  const encrypted = {
    nonce: fromB64(wrapped.nonce),
    ciphertext: fromB64(wrapped.ciphertext),
    tag: fromB64(wrapped.tag)
  };

  if (encrypted.nonce.length !== 12 || encrypted.tag.length !== 16 || encrypted.ciphertext.length !== 32) {
    throw new Error('invalid-recovery-package-framing');
  }

  return encrypted;
}

export function validateRecoveryWrap({ package: wrapped, authorizingDeviceRecord }) {
  const encrypted = decodeRecoveryPackage(wrapped);
  if (!authorizingDeviceRecord) throw new Error('recovery-authorizer-record-required');
  if (wrapped.header.authorizingDeviceId !== authorizingDeviceRecord.deviceId) {
    throw new Error('recovery-authorizer-identity-mismatch');
  }
  if (!isAuthorizedForEpoch(authorizingDeviceRecord, wrapped.header.keyEpoch)) {
    throw new Error('recovery-authorizer-not-authorized-for-epoch');
  }

  const authorizerPublicKey = publicKeyFromDer(authorizingDeviceRecord.signingPublicKey);
  if (!verify(null, signedBytes(wrapped.header, encrypted), authorizerPublicKey, fromB64(wrapped.signature))) {
    throw new Error('invalid-recovery-wrap-signature');
  }

  return {
    tenantId: wrapped.header.tenantId,
    keyEpoch: wrapped.header.keyEpoch,
    recoveryKeyId: wrapped.header.recoveryKeyId,
    authorizingDeviceId: wrapped.header.authorizingDeviceId
  };
}

export function generateRecoveryIdentity(recoveryKeyId) {
  if (!recoveryKeyId) throw new Error('recovery-key-id-required');
  return {
    recoveryKeyId,
    encryption: generateKeyPairSync('x25519')
  };
}

export function recoveryPublicRecord(recoveryIdentity) {
  if (!recoveryIdentity?.recoveryKeyId || !recoveryIdentity?.encryption?.publicKey) {
    throw new Error('invalid-recovery-identity');
  }
  return {
    recoveryKeyId: recoveryIdentity.recoveryKeyId,
    encryptionPublicKey: b64(publicKeyDer(recoveryIdentity.encryption.publicKey))
  };
}

export function wrapTenantEpochForRecovery({
  tenantId,
  keyEpoch,
  tenantRootKey,
  recoveryRecord,
  authorizingDevice
}) {
  if (!tenantId || !Number.isInteger(keyEpoch) || keyEpoch <= 0) throw new Error('invalid-recovery-context');
  if (!Buffer.isBuffer(tenantRootKey) || tenantRootKey.length !== 32) throw new Error('invalid-tenant-root-key');
  if (!recoveryRecord?.recoveryKeyId || !recoveryRecord?.encryptionPublicKey) {
    throw new Error('invalid-recovery-record');
  }
  if (!authorizingDevice?.deviceId || !authorizingDevice?.signing?.privateKey) {
    throw new Error('invalid-recovery-authorizer');
  }

  const ephemeral = generateKeyPairSync('x25519');
  const recoveryPublicKey = publicKeyFromDer(recoveryRecord.encryptionPublicKey);
  const sharedSecret = diffieHellman({ privateKey: ephemeral.privateKey, publicKey: recoveryPublicKey });
  const wrappingKey = deriveRecoveryWrapKey(sharedSecret, {
    tenantId,
    keyEpoch,
    recoveryKeyId: recoveryRecord.recoveryKeyId
  });

  const header = {
    protocol: RECOVERY_WRAP_PROTOCOL,
    tenantId,
    keyEpoch,
    recoveryKeyId: recoveryRecord.recoveryKeyId,
    authorizingDeviceId: authorizingDevice.deviceId,
    ephemeralPublicKey: b64(publicKeyDer(ephemeral.publicKey))
  };
  const encrypted = encrypt(wrappingKey, tenantRootKey, utf8(stableJson(header)));
  const signature = sign(null, signedBytes(header, encrypted), authorizingDevice.signing.privateKey);

  return {
    header,
    nonce: b64(encrypted.nonce),
    ciphertext: b64(encrypted.ciphertext),
    tag: b64(encrypted.tag),
    signature: b64(signature)
  };
}

export function unwrapTenantEpochFromRecovery({
  package: wrapped,
  recoveryIdentity,
  authorizingDeviceRecord
}) {
  if (!recoveryIdentity?.encryption?.privateKey) throw new Error('recovery-private-key-required');
  if (wrapped?.header?.recoveryKeyId !== recoveryIdentity.recoveryKeyId) throw new Error('wrong-recovery-key-id');

  validateRecoveryWrap({ package: wrapped, authorizingDeviceRecord });
  const encrypted = decodeRecoveryPackage(wrapped);

  const ephemeralPublicKey = publicKeyFromDer(wrapped.header.ephemeralPublicKey);
  const sharedSecret = diffieHellman({
    privateKey: recoveryIdentity.encryption.privateKey,
    publicKey: ephemeralPublicKey
  });
  const wrappingKey = deriveRecoveryWrapKey(sharedSecret, {
    tenantId: wrapped.header.tenantId,
    keyEpoch: wrapped.header.keyEpoch,
    recoveryKeyId: wrapped.header.recoveryKeyId
  });

  return decrypt(wrappingKey, encrypted, utf8(stableJson(wrapped.header)));
}

export function assertRecoveryCoverage({
  tenantId,
  recoveryKeyId,
  recoverableEpochs,
  packages,
  authorizingDeviceRecords
}) {
  if (!tenantId || !recoveryKeyId) throw new Error('recovery-coverage-context-required');
  if (!Array.isArray(recoverableEpochs) || recoverableEpochs.length === 0) {
    throw new Error('recoverable-epochs-required');
  }
  if (!Array.isArray(packages)) throw new Error('recovery-packages-required');
  if (!(authorizingDeviceRecords instanceof Map)) throw new Error('recovery-authorizer-records-required');

  const expectedEpochs = [...new Set(recoverableEpochs)].sort((a, b) => a - b);
  for (const epoch of expectedEpochs) {
    if (!Number.isInteger(epoch) || epoch <= 0) throw new Error('invalid-recoverable-epoch');
  }

  const packagesByEpoch = new Map(expectedEpochs.map(epoch => [epoch, new Set()]));
  for (const wrapped of packages) {
    const header = wrapped?.header ?? {};
    if (header.tenantId !== tenantId) continue;
    if (header.recoveryKeyId !== recoveryKeyId) continue;
    if (!packagesByEpoch.has(header.keyEpoch)) continue;

    const authorizingDeviceRecord = authorizingDeviceRecords.get(header.authorizingDeviceId);
    validateRecoveryWrap({ package: wrapped, authorizingDeviceRecord });
    packagesByEpoch.get(header.keyEpoch).add(stableJson(wrapped));
  }

  const missing = expectedEpochs.filter(epoch => packagesByEpoch.get(epoch).size === 0);
  if (missing.length > 0) {
    throw new Error(`recovery-coverage-missing:${missing.join(',')}`);
  }

  const ambiguous = expectedEpochs.filter(epoch => packagesByEpoch.get(epoch).size > 1);
  if (ambiguous.length > 0) {
    throw new Error(`recovery-coverage-ambiguous:${ambiguous.join(',')}`);
  }

  return {
    tenantId,
    recoveryKeyId,
    coveredEpochs: expectedEpochs,
    validatedDistinctPackages: expectedEpochs.length
  };
}

export function planPostRecoveryHardening({
  tenantId,
  recoveredThroughEpoch,
  newDeviceId,
  lostDeviceIds,
  newRecoveryKeyId
}) {
  if (!tenantId || !newDeviceId || !newRecoveryKeyId) throw new Error('post-recovery-context-required');
  if (!Number.isInteger(recoveredThroughEpoch) || recoveredThroughEpoch <= 0) {
    throw new Error('invalid-recovered-through-epoch');
  }
  if (!Array.isArray(lostDeviceIds) || lostDeviceIds.length === 0) {
    throw new Error('lost-device-set-required');
  }

  const revokedDeviceIds = [...new Set(lostDeviceIds)].sort();
  if (revokedDeviceIds.includes(newDeviceId)) throw new Error('new-device-cannot-be-revoked');

  const nextKeyEpoch = recoveredThroughEpoch + 1;
  return {
    tenantId,
    recoveredThroughEpoch,
    revokeDevices: revokedDeviceIds.map(deviceId => ({
      deviceId,
      status: 'REVOKED',
      revokedFromEpoch: nextKeyEpoch,
      reason: 'ALL_DEVICES_LOST_RECOVERY'
    })),
    activateDevice: {
      deviceId: newDeviceId,
      status: 'ACTIVE',
      authorizedFromEpoch: nextKeyEpoch,
      reason: 'ALL_DEVICES_LOST_RECOVERY'
    },
    rotateTenantKey: {
      required: true,
      nextKeyEpoch,
      reason: 'ALL_DEVICES_LOST_RECOVERY'
    },
    rotateRecoveryKey: {
      required: true,
      newRecoveryKeyId
    }
  };
}

export function cloudRecoveryView(packageList, recoveryRecord) {
  return {
    recoveryKeyId: recoveryRecord.recoveryKeyId,
    recoveryPublicKey: recoveryRecord.encryptionPublicKey,
    wraps: packageList.map(item => structuredClone(item))
  };
}
