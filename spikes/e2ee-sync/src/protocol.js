import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  randomUUID,
  sign,
  verify
} from 'node:crypto';

// FEASIBILITY SPIKE ONLY.
// This file composes Node primitives to prove FinanceSensor protocol properties.
// Production key wrapping must use an audited/reviewed construction/library
// (candidate: HPKE) rather than treating this spike as production cryptography.

const KEY_WRAP_PROTOCOL = 'FINANCESENSOR_KEY_WRAP_SPIKE_V1';
const SYNC_PROTOCOL = 'FINANCESENSOR_SYNC_SPIKE_V1';
const utf8 = value => Buffer.from(String(value), 'utf8');
const b64 = buffer => Buffer.from(buffer).toString('base64url');
const fromB64 = value => Buffer.from(value, 'base64url');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function deriveKey(rootKey, { tenantId, keyEpoch, domain }) {
  const salt = utf8(`FinanceSensor/${tenantId}/epoch/${keyEpoch}`);
  const info = utf8(`FinanceSensor/${domain}/v1`);
  return Buffer.from(hkdfSync('sha256', rootKey, salt, info, 32));
}

function aeadEncrypt(key, plaintext, aad) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { nonce, ciphertext, tag };
}

function aeadDecrypt(key, { nonce, ciphertext, tag }, aad) {
  const decipher = createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function publicKeyDer(keyObject) {
  return keyObject.export({ type: 'spki', format: 'der' });
}

function publicKeyFromDer(value) {
  return createPublicKey({ key: fromB64(value), type: 'spki', format: 'der' });
}

function signedBytes(header, nonce, ciphertext, tag) {
  return Buffer.concat([
    utf8(stableJson(header)),
    Buffer.from([0]),
    nonce,
    Buffer.from([0]),
    ciphertext,
    Buffer.from([0]),
    tag
  ]);
}

function assertKeyEpoch(keyEpoch) {
  if (!Number.isInteger(keyEpoch) || keyEpoch <= 0) throw new Error('invalid-key-epoch');
}

function decodeKeyWrapPackage(wrapped) {
  const header = wrapped?.header;
  if (!header || typeof header !== 'object') throw new Error('invalid-key-wrap-package');
  if (header.protocol !== KEY_WRAP_PROTOCOL) throw new Error('unsupported-key-wrap-protocol');
  if (!header.tenantId || !header.recipientDeviceId || !header.authorizingDeviceId || !header.ephemeralPublicKey) {
    throw new Error('invalid-key-wrap-context');
  }
  assertKeyEpoch(header.keyEpoch);
  if (!wrapped.nonce || !wrapped.ciphertext || !wrapped.tag || !wrapped.signature) {
    throw new Error('invalid-key-wrap-framing');
  }

  const decoded = {
    nonce: fromB64(wrapped.nonce),
    ciphertext: fromB64(wrapped.ciphertext),
    tag: fromB64(wrapped.tag)
  };
  if (decoded.nonce.length !== 12 || decoded.tag.length !== 16 || decoded.ciphertext.length !== 32) {
    throw new Error('invalid-key-wrap-framing');
  }
  return decoded;
}

export function generateDeviceIdentity(deviceId) {
  if (!deviceId) throw new Error('device-id-required');
  const encryption = generateKeyPairSync('x25519');
  const signing = generateKeyPairSync('ed25519');
  return { deviceId, encryption, signing };
}

export function publicDeviceRecord(device, {
  tenantId,
  authorizedFromEpoch = 1,
  revokedFromEpoch = null,
  status = 'ACTIVE'
} = {}) {
  if (!tenantId) throw new Error('tenant-id-required-for-device-authorization');
  assertKeyEpoch(authorizedFromEpoch);
  if (revokedFromEpoch != null) assertKeyEpoch(revokedFromEpoch);
  if (revokedFromEpoch != null && revokedFromEpoch < authorizedFromEpoch) {
    throw new Error('invalid-device-authorization-window');
  }
  return {
    tenantId,
    deviceId: device.deviceId,
    encryptionPublicKey: b64(publicKeyDer(device.encryption.publicKey)),
    signingPublicKey: b64(publicKeyDer(device.signing.publicKey)),
    authorizedFromEpoch,
    revokedFromEpoch,
    status
  };
}

export function generateTenantRootKey() {
  return randomBytes(32);
}

export function isAuthorizedForEpoch(record, keyEpoch, tenantId = null) {
  if (!record) return false;
  if (!Number.isInteger(keyEpoch) || keyEpoch <= 0) return false;
  if (tenantId != null && record.tenantId !== tenantId) return false;
  if (record.status === 'REVOKED' && record.revokedFromEpoch == null) return false;
  if (record.status !== 'ACTIVE' && record.status !== 'REVOKED') return false;
  if (keyEpoch < record.authorizedFromEpoch) return false;
  if (record.revokedFromEpoch != null && keyEpoch >= record.revokedFromEpoch) return false;
  return true;
}

export function wrapTenantRootKey({
  tenantId,
  keyEpoch,
  tenantRootKey,
  recipientDeviceRecord,
  authorizingDevice,
  authorizingDeviceRecord
}) {
  if (!tenantId) throw new Error('tenant-id-required');
  assertKeyEpoch(keyEpoch);
  if (!Buffer.isBuffer(tenantRootKey) || tenantRootKey.length !== 32) throw new Error('invalid-tenant-root-key');
  if (!recipientDeviceRecord || recipientDeviceRecord.tenantId !== tenantId) throw new Error('recipient-tenant-mismatch');
  if (!isAuthorizedForEpoch(recipientDeviceRecord, keyEpoch, tenantId)) throw new Error('recipient-not-authorized-for-epoch');
  if (!authorizingDeviceRecord || authorizingDeviceRecord.tenantId !== tenantId) throw new Error('authorizer-tenant-mismatch');
  if (authorizingDeviceRecord.deviceId !== authorizingDevice?.deviceId) throw new Error('authorizer-identity-mismatch');
  if (!isAuthorizedForEpoch(authorizingDeviceRecord, keyEpoch, tenantId)) throw new Error('authorizer-not-authorized-for-epoch');

  const ephemeral = generateKeyPairSync('x25519');
  const recipientPublicKey = publicKeyFromDer(recipientDeviceRecord.encryptionPublicKey);
  const sharedSecret = diffieHellman({ privateKey: ephemeral.privateKey, publicKey: recipientPublicKey });
  const wrappingKey = deriveKey(sharedSecret, {
    tenantId,
    keyEpoch,
    domain: `device-wrap/${recipientDeviceRecord.deviceId}`
  });

  const header = {
    protocol: KEY_WRAP_PROTOCOL,
    tenantId,
    keyEpoch,
    recipientDeviceId: recipientDeviceRecord.deviceId,
    authorizingDeviceId: authorizingDevice.deviceId,
    ephemeralPublicKey: b64(publicKeyDer(ephemeral.publicKey))
  };
  const aad = utf8(stableJson(header));
  const encrypted = aeadEncrypt(wrappingKey, tenantRootKey, aad);
  const signature = sign(
    null,
    signedBytes(header, encrypted.nonce, encrypted.ciphertext, encrypted.tag),
    authorizingDevice.signing.privateKey
  );

  return {
    header,
    nonce: b64(encrypted.nonce),
    ciphertext: b64(encrypted.ciphertext),
    tag: b64(encrypted.tag),
    signature: b64(signature)
  };
}

export function unwrapTenantRootKey({
  package: wrapped,
  recipientDevice,
  recipientDeviceRecord,
  authorizingDeviceRecord
}) {
  const { nonce, ciphertext, tag } = decodeKeyWrapPackage(wrapped);
  const { tenantId, keyEpoch } = wrapped.header;

  if (wrapped.header.recipientDeviceId !== recipientDevice?.deviceId) throw new Error('wrong-recipient-device');
  if (!recipientDeviceRecord || recipientDeviceRecord.deviceId !== recipientDevice.deviceId) throw new Error('recipient-authorization-identity-mismatch');
  if (recipientDeviceRecord.tenantId !== tenantId) throw new Error('recipient-tenant-mismatch');
  if (!isAuthorizedForEpoch(recipientDeviceRecord, keyEpoch, tenantId)) throw new Error('recipient-not-authorized-for-epoch');
  if (!authorizingDeviceRecord || authorizingDeviceRecord.tenantId !== tenantId) throw new Error('authorizer-tenant-mismatch');
  if (wrapped.header.authorizingDeviceId !== authorizingDeviceRecord.deviceId) throw new Error('authorizer-identity-mismatch');
  if (!isAuthorizedForEpoch(authorizingDeviceRecord, keyEpoch, tenantId)) throw new Error('authorizer-not-authorized-for-epoch');

  const authorizerSigningKey = publicKeyFromDer(authorizingDeviceRecord.signingPublicKey);
  const validSignature = verify(
    null,
    signedBytes(wrapped.header, nonce, ciphertext, tag),
    authorizerSigningKey,
    fromB64(wrapped.signature)
  );
  if (!validSignature) throw new Error('invalid-key-wrap-signature');

  const ephemeralPublicKey = publicKeyFromDer(wrapped.header.ephemeralPublicKey);
  const sharedSecret = diffieHellman({ privateKey: recipientDevice.encryption.privateKey, publicKey: ephemeralPublicKey });
  const wrappingKey = deriveKey(sharedSecret, {
    tenantId,
    keyEpoch,
    domain: `device-wrap/${recipientDevice.deviceId}`
  });

  return aeadDecrypt(wrappingKey, { nonce, ciphertext, tag }, utf8(stableJson(wrapped.header)));
}

export function createEncryptedEnvelope({
  tenantId,
  keyEpoch,
  tenantRootKey,
  originDevice,
  originDeviceSequence,
  action,
  schemaVersion = 1,
  eventId = randomUUID(),
  createdAt = new Date().toISOString()
}) {
  if (!tenantId) throw new Error('tenant-id-required');
  assertKeyEpoch(keyEpoch);
  if (!Buffer.isBuffer(tenantRootKey) || tenantRootKey.length !== 32) throw new Error('invalid-tenant-root-key');
  if (!Number.isInteger(originDeviceSequence) || originDeviceSequence <= 0) throw new Error('invalid-origin-device-sequence');

  const header = {
    protocol: SYNC_PROTOCOL,
    eventId,
    tenantId,
    originDeviceId: originDevice.deviceId,
    originDeviceSequence,
    keyEpoch,
    schemaVersion,
    createdAt
  };
  const aad = utf8(stableJson(header));
  const syncKey = deriveKey(tenantRootKey, { tenantId, keyEpoch, domain: 'sync-payload' });
  const encrypted = aeadEncrypt(syncKey, utf8(stableJson(action)), aad);
  const signature = sign(
    null,
    signedBytes(header, encrypted.nonce, encrypted.ciphertext, encrypted.tag),
    originDevice.signing.privateKey
  );

  return {
    header,
    nonce: b64(encrypted.nonce),
    ciphertext: b64(encrypted.ciphertext),
    tag: b64(encrypted.tag),
    signature: b64(signature)
  };
}

export function decryptEnvelope({ envelope, tenantRootKey, authorizedDeviceRecords }) {
  if (envelope?.header?.protocol !== SYNC_PROTOCOL) throw new Error('unsupported-sync-protocol');
  if (!envelope?.header?.tenantId) throw new Error('invalid-sync-context');
  assertKeyEpoch(envelope.header.keyEpoch);
  if (!Buffer.isBuffer(tenantRootKey) || tenantRootKey.length !== 32) throw new Error('invalid-tenant-root-key');

  const origin = authorizedDeviceRecords.get(envelope.header.originDeviceId);
  if (!isAuthorizedForEpoch(origin, envelope.header.keyEpoch, envelope.header.tenantId)) {
    throw new Error('origin-device-not-authorized-for-epoch');
  }

  const nonce = fromB64(envelope.nonce);
  const ciphertext = fromB64(envelope.ciphertext);
  const tag = fromB64(envelope.tag);
  const originSigningKey = publicKeyFromDer(origin.signingPublicKey);
  const signatureValid = verify(
    null,
    signedBytes(envelope.header, nonce, ciphertext, tag),
    originSigningKey,
    fromB64(envelope.signature)
  );
  if (!signatureValid) throw new Error('invalid-envelope-signature');

  const syncKey = deriveKey(tenantRootKey, {
    tenantId: envelope.header.tenantId,
    keyEpoch: envelope.header.keyEpoch,
    domain: 'sync-payload'
  });
  const plaintext = aeadDecrypt(
    syncKey,
    { nonce, ciphertext, tag },
    utf8(stableJson(envelope.header))
  );

  return { header: envelope.header, action: JSON.parse(plaintext.toString('utf8')) };
}

export function inspectOriginSequences(envelopes) {
  const byOrigin = new Map();
  for (const envelope of envelopes) {
    const origin = envelope.header.originDeviceId;
    if (!byOrigin.has(origin)) byOrigin.set(origin, new Set());
    byOrigin.get(origin).add(envelope.header.originDeviceSequence);
  }

  const report = {};
  for (const [origin, sequenceSet] of byOrigin.entries()) {
    const sequences = [...sequenceSet].sort((a, b) => a - b);
    const gaps = [];
    if (sequences.length > 0) {
      for (let expected = 1; expected < sequences.at(-1); expected += 1) {
        if (!sequenceSet.has(expected)) gaps.push(expected);
      }
    }
    report[origin] = { highestSeen: sequences.at(-1) ?? 0, gaps };
  }
  return report;
}

function correctionConflictKey(targetId, baseRevision, corrections) {
  const ids = corrections.map(item => item.header.eventId).sort();
  return sha256(utf8(stableJson({ targetId, baseRevision, ids })));
}

function resolutionConflictKey(targetId, baseRevision, resolutions) {
  return sha256(utf8(stableJson({
    targetId,
    baseRevision,
    resolutions: resolutions
      .map(event => ({
        eventId: event.header.eventId,
        selectedCorrectionEventId: event.action.selectedCorrectionEventId
      }))
      .sort((a, b) => a.eventId.localeCompare(b.eventId))
  })));
}

function decodedIdentityDigest(decoded) {
  return sha256(utf8(stableJson({ header: decoded.header, action: decoded.action })));
}

export function materializeDecodedEvents(decodedEvents) {
  const unique = new Map();
  const identityDigests = new Map();
  const sequenceOwners = new Map();
  let materializationTenantId = null;

  for (const decoded of decodedEvents) {
    const eventId = decoded?.header?.eventId;
    if (!eventId) throw new Error('sync-event-id-required');

    const tenantId = decoded?.header?.tenantId;
    const originDeviceId = decoded?.header?.originDeviceId;
    const originDeviceSequence = decoded?.header?.originDeviceSequence;
    if (!tenantId || !originDeviceId || !Number.isInteger(originDeviceSequence) || originDeviceSequence <= 0) {
      throw new Error('invalid-decoded-sync-origin');
    }

    if (materializationTenantId == null) materializationTenantId = tenantId;
    else if (tenantId !== materializationTenantId) throw new Error('mixed-tenant-materialization');

    const digest = decodedIdentityDigest(decoded);
    const existingDigest = identityDigests.get(eventId);
    if (existingDigest != null && existingDigest !== digest) {
      throw new Error(`sync-event-id-content-conflict:${eventId}`);
    }

    const sequenceKey = `${tenantId}::${originDeviceId}::${originDeviceSequence}`;
    const sequenceOwner = sequenceOwners.get(sequenceKey);
    if (sequenceOwner != null && sequenceOwner !== eventId) {
      throw new Error(`sync-origin-sequence-fork:${originDeviceId}:${originDeviceSequence}`);
    }

    if (existingDigest == null) {
      identityDigests.set(eventId, digest);
      sequenceOwners.set(sequenceKey, eventId);
      unique.set(eventId, decoded);
    }
  }

  const events = [...unique.values()].sort((a, b) => {
    const deviceCompare = a.header.originDeviceId.localeCompare(b.header.originDeviceId);
    if (deviceCompare !== 0) return deviceCompare;
    if (a.header.originDeviceSequence !== b.header.originDeviceSequence) {
      return a.header.originDeviceSequence - b.header.originDeviceSequence;
    }
    return a.header.eventId.localeCompare(b.header.eventId);
  });

  const canonicalEvents = new Map();
  const correctionGroups = new Map();
  const resolutions = [];
  const integrityConflicts = [];

  for (const event of events) {
    const action = event.action;
    if (action.type === 'CANONICAL_EVENT_CREATED') {
      const existing = canonicalEvents.get(action.canonicalEventId);
      if (!existing) {
        canonicalEvents.set(action.canonicalEventId, canonicalize(action.event));
      } else if (stableJson(existing) !== stableJson(canonicalize(action.event))) {
        integrityConflicts.push({
          type: 'CANONICAL_ID_COLLISION',
          canonicalEventId: action.canonicalEventId,
          eventId: event.header.eventId
        });
      }
    }

    if (action.type === 'CATEGORY_CORRECTED') {
      const key = `${action.targetId}::${action.baseRevision}`;
      if (!correctionGroups.has(key)) correctionGroups.set(key, []);
      correctionGroups.get(key).push(event);
    }

    if (action.type === 'CATEGORY_CONFLICT_RESOLVED') resolutions.push(event);
  }

  const categoryState = {};
  const conflicts = {};
  const staleCorrections = [];
  const groupsByTarget = new Map();

  for (const [key, group] of correctionGroups.entries()) {
    const [targetId, baseRevisionRaw] = key.split('::');
    const baseRevision = Number(baseRevisionRaw);
    if (!groupsByTarget.has(targetId)) groupsByTarget.set(targetId, []);
    groupsByTarget.get(targetId).push({ baseRevision, group });
  }

  for (const [targetId, groups] of groupsByTarget.entries()) {
    let currentRevision = 0;
    let currentCategory = null;
    const orderedGroups = groups.sort((a, b) => a.baseRevision - b.baseRevision);

    for (const { baseRevision, group } of orderedGroups) {
      if (baseRevision !== currentRevision) {
        staleCorrections.push(...group.map(event => event.header.eventId));
        continue;
      }

      const values = new Set(group.map(event => event.action.categoryId));
      if (values.size === 1) {
        currentCategory = group[0].action.categoryId;
        currentRevision += 1;
        continue;
      }

      const conflictKey = correctionConflictKey(targetId, baseRevision, group);
      const applicableResolutions = resolutions
        .filter(event => event.action.targetId === targetId && event.action.baseRevision === baseRevision)
        .sort((a, b) => a.header.eventId.localeCompare(b.header.eventId));

      if (applicableResolutions.length > 0) {
        const validCorrectionIds = new Set(group.map(event => event.header.eventId));
        const invalidResolutions = applicableResolutions.filter(
          event => !validCorrectionIds.has(event.action.selectedCorrectionEventId)
        );
        if (invalidResolutions.length > 0) {
          const invalidKey = resolutionConflictKey(targetId, baseRevision, applicableResolutions);
          conflicts[invalidKey] = {
            type: 'CATEGORY_RESOLUTION_INVALID',
            targetId,
            baseRevision,
            resolutions: applicableResolutions.map(event => ({
              eventId: event.header.eventId,
              deviceId: event.header.originDeviceId,
              selectedCorrectionEventId: event.action.selectedCorrectionEventId
            }))
          };
          break;
        }

        const selectedCorrectionIds = new Set(
          applicableResolutions.map(event => event.action.selectedCorrectionEventId)
        );
        if (selectedCorrectionIds.size > 1) {
          const metaConflictKey = resolutionConflictKey(targetId, baseRevision, applicableResolutions);
          conflicts[metaConflictKey] = {
            type: 'CATEGORY_RESOLUTION_CONFLICT',
            targetId,
            baseRevision,
            resolutions: applicableResolutions.map(event => ({
              eventId: event.header.eventId,
              deviceId: event.header.originDeviceId,
              selectedCorrectionEventId: event.action.selectedCorrectionEventId
            }))
          };
          break;
        }

        const selectedId = applicableResolutions[0].action.selectedCorrectionEventId;
        const selected = group.find(event => event.header.eventId === selectedId);
        currentCategory = selected.action.categoryId;
        currentRevision += 1;
        continue;
      }

      conflicts[conflictKey] = {
        type: 'CATEGORY_CORRECTION_CONFLICT',
        targetId,
        baseRevision,
        candidates: group
          .map(event => ({
            eventId: event.header.eventId,
            deviceId: event.header.originDeviceId,
            categoryId: event.action.categoryId
          }))
          .sort((a, b) => a.eventId.localeCompare(b.eventId))
      };
      break;
    }

    if (currentCategory != null) {
      categoryState[targetId] = { categoryId: currentCategory, revision: currentRevision };
    }
  }

  return canonicalize({
    canonicalEvents: Object.fromEntries([...canonicalEvents.entries()].sort(([a], [b]) => a.localeCompare(b))),
    categoryState,
    conflicts,
    integrityConflicts,
    staleCorrections: staleCorrections.sort(),
    appliedEnvelopeCount: unique.size
  });
}

export function stateDigest(state) {
  return sha256(utf8(stableJson(state)));
}
