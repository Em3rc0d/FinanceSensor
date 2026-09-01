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

const utf8 = (value) => Buffer.from(String(value), 'utf8');
const b64 = (buffer) => Buffer.from(buffer).toString('base64url');
const fromB64 = (value) => Buffer.from(value, 'base64url');

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

export function generateDeviceIdentity(deviceId) {
  const encryption = generateKeyPairSync('x25519');
  const signing = generateKeyPairSync('ed25519');
  return {
    deviceId,
    encryption,
    signing
  };
}

export function publicDeviceRecord(device, {
  authorizedFromEpoch = 1,
  revokedFromEpoch = null,
  status = 'ACTIVE'
} = {}) {
  return {
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

export function isAuthorizedForEpoch(record, keyEpoch) {
  if (!record) return false;
  if (record.status === 'REVOKED' && record.revokedFromEpoch == null) return false;
  if (keyEpoch < record.authorizedFromEpoch) return false;
  if (record.revokedFromEpoch != null && keyEpoch >= record.revokedFromEpoch) return false;
  return true;
}

export function wrapTenantRootKey({
  tenantId,
  keyEpoch,
  tenantRootKey,
  recipientDeviceRecord,
  authorizingDevice
}) {
  if (!isAuthorizedForEpoch(recipientDeviceRecord, keyEpoch)) {
    throw new Error('recipient-not-authorized-for-epoch');
  }

  const ephemeral = generateKeyPairSync('x25519');
  const recipientPublicKey = publicKeyFromDer(recipientDeviceRecord.encryptionPublicKey);
  const sharedSecret = diffieHellman({
    privateKey: ephemeral.privateKey,
    publicKey: recipientPublicKey
  });

  const wrappingKey = deriveKey(sharedSecret, {
    tenantId,
    keyEpoch,
    domain: `device-wrap/${recipientDeviceRecord.deviceId}`
  });

  const header = {
    protocol: 'FINANCESENSOR_KEY_WRAP_SPIKE_V1',
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
  authorizingDeviceRecord
}) {
  if (wrapped.header.recipientDeviceId !== recipientDevice.deviceId) {
    throw new Error('wrong-recipient-device');
  }
  if (!isAuthorizedForEpoch(authorizingDeviceRecord, wrapped.header.keyEpoch)) {
    throw new Error('authorizer-not-authorized-for-epoch');
  }

  const nonce = fromB64(wrapped.nonce);
  const ciphertext = fromB64(wrapped.ciphertext);
  const tag = fromB64(wrapped.tag);
  const authorizerSigningKey = publicKeyFromDer(authorizingDeviceRecord.signingPublicKey);
  const validSignature = verify(
    null,
    signedBytes(wrapped.header, nonce, ciphertext, tag),
    authorizerSigningKey,
    fromB64(wrapped.signature)
  );
  if (!validSignature) throw new Error('invalid-key-wrap-signature');

  const ephemeralPublicKey = publicKeyFromDer(wrapped.header.ephemeralPublicKey);
  const sharedSecret = diffieHellman({
    privateKey: recipientDevice.encryption.privateKey,
    publicKey: ephemeralPublicKey
  });
  const wrappingKey = deriveKey(sharedSecret, {
    tenantId: wrapped.header.tenantId,
    keyEpoch: wrapped.header.keyEpoch,
    domain: `device-wrap/${recipientDevice.deviceId}`
  });

  return aeadDecrypt(
    wrappingKey,
    { nonce, ciphertext, tag },
    utf8(stableJson(wrapped.header))
  );
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
  if (!Number.isInteger(originDeviceSequence) || originDeviceSequence <= 0) {
    throw new Error('invalid-origin-device-sequence');
  }

  const header = {
    protocol: 'FINANCESENSOR_SYNC_SPIKE_V1',
    eventId,
    tenantId,
    originDeviceId: originDevice.deviceId,
    originDeviceSequence,
    keyEpoch,
    schemaVersion,
    createdAt
  };
  const aad = utf8(stableJson(header));
  const syncKey = deriveKey(tenantRootKey, {
    tenantId,
    keyEpoch,
    domain: 'sync-payload'
  });
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
  const origin = authorizedDeviceRecords.get(envelope.header.originDeviceId);
  if (!isAuthorizedForEpoch(origin, envelope.header.keyEpoch)) {
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

  return {
    header: envelope.header,
    action: JSON.parse(plaintext.toString('utf8'))
  };
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
    report[origin] = {
      highestSeen: sequences.at(-1) ?? 0,
      gaps
    };
  }
  return report;
}

function correctionConflictKey(targetId, baseRevision, corrections) {
  const ids = corrections.map(item => item.header.eventId).sort();
  return sha256(utf8(stableJson({ targetId, baseRevision, ids })));
}

export function materializeDecodedEvents(decodedEvents) {
  const unique = new Map();
  for (const decoded of decodedEvents) unique.set(decoded.header.eventId, decoded);

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

    if (action.type === 'CATEGORY_CONFLICT_RESOLVED') {
      resolutions.push(event);
    }
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
      const resolution = resolutions
        .filter(event => event.action.targetId === targetId && event.action.baseRevision === baseRevision)
        .sort((a, b) => a.header.eventId.localeCompare(b.header.eventId))
        .at(-1);

      const selected = resolution
        ? group.find(event => event.header.eventId === resolution.action.selectedCorrectionEventId)
        : null;

      if (selected) {
        currentCategory = selected.action.categoryId;
        currentRevision += 1;
      } else {
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
    }

    if (currentCategory != null) {
      categoryState[targetId] = {
        categoryId: currentCategory,
        revision: currentRevision
      };
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
