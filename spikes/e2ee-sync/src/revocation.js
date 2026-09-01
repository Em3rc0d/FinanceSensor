import {
  createHash,
  createPublicKey,
  sign,
  verify
} from 'node:crypto';
import { isAuthorizedForEpoch, stableJson } from './protocol.js';

// FEASIBILITY SPIKE ONLY.
// A production revocation cutover may use a hash chain, Merkle commitment or
// equivalent reviewed append-only structure. This spike proves the property
// that future-access revocation must commit the exact accepted historical
// origin stream before old key epochs can be treated as immutable history.

const REVOCATION_BARRIER_PROTOCOL = 'FINANCESENSOR_REVOCATION_BARRIER_SPIKE_V1';
const utf8 = value => Buffer.from(String(value), 'utf8');
const b64 = buffer => Buffer.from(buffer).toString('base64url');
const fromB64 = value => Buffer.from(value, 'base64url');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function publicKeyFromDer(value) {
  return createPublicKey({ key: fromB64(value), type: 'spki', format: 'der' });
}

function envelopeSignedBytes(envelope) {
  const nonce = fromB64(envelope.nonce);
  const ciphertext = fromB64(envelope.ciphertext);
  const tag = fromB64(envelope.tag);
  return Buffer.concat([
    utf8(stableJson(envelope.header)),
    Buffer.from([0]),
    nonce,
    Buffer.from([0]),
    ciphertext,
    Buffer.from([0]),
    tag
  ]);
}

export function envelopeDigest(envelope) {
  if (!envelope?.header || !envelope?.signature) throw new Error('invalid-envelope-for-digest');
  return sha256(utf8(stableJson({
    header: envelope.header,
    nonce: envelope.nonce,
    ciphertext: envelope.ciphertext,
    tag: envelope.tag,
    signature: envelope.signature
  })));
}

function verifyHistoricalEnvelope({ envelope, tenantId, revokedDeviceRecord, revokedFromEpoch }) {
  if (!envelope?.header) throw new Error('invalid-historical-envelope');
  if (envelope.header.tenantId !== tenantId) throw new Error('historical-envelope-tenant-mismatch');
  if (envelope.header.originDeviceId !== revokedDeviceRecord.deviceId) {
    throw new Error('historical-envelope-origin-mismatch');
  }
  if (!Number.isInteger(envelope.header.originDeviceSequence) || envelope.header.originDeviceSequence <= 0) {
    throw new Error('invalid-historical-origin-sequence');
  }
  if (!Number.isInteger(envelope.header.keyEpoch) || envelope.header.keyEpoch <= 0) {
    throw new Error('invalid-historical-key-epoch');
  }
  if (envelope.header.keyEpoch >= revokedFromEpoch) {
    throw new Error('historical-envelope-crosses-revocation-epoch');
  }
  if (!isAuthorizedForEpoch(revokedDeviceRecord, envelope.header.keyEpoch, tenantId)) {
    throw new Error('historical-origin-not-authorized-for-epoch');
  }
  if (!envelope.nonce || !envelope.ciphertext || !envelope.tag || !envelope.signature) {
    throw new Error('invalid-historical-envelope-framing');
  }

  const signingKey = publicKeyFromDer(revokedDeviceRecord.signingPublicKey);
  if (!verify(null, envelopeSignedBytes(envelope), signingKey, fromB64(envelope.signature))) {
    throw new Error('invalid-historical-envelope-signature');
  }
}

export function originHistoryCommitment({
  tenantId,
  revokedDeviceRecord,
  revokedFromEpoch,
  historicalEnvelopes
}) {
  if (!tenantId) throw new Error('revocation-tenant-required');
  if (!revokedDeviceRecord || revokedDeviceRecord.tenantId !== tenantId) {
    throw new Error('revoked-device-tenant-mismatch');
  }
  if (!Number.isInteger(revokedFromEpoch) || revokedFromEpoch <= 0) {
    throw new Error('invalid-revocation-epoch');
  }
  if (!Array.isArray(historicalEnvelopes)) throw new Error('historical-envelopes-required');

  const bySequence = new Map();
  for (const envelope of historicalEnvelopes) {
    verifyHistoricalEnvelope({ envelope, tenantId, revokedDeviceRecord, revokedFromEpoch });
    const sequence = envelope.header.originDeviceSequence;
    const digest = envelopeDigest(envelope);
    const existing = bySequence.get(sequence);
    if (existing && existing.digest !== digest) {
      throw new Error(`historical-sequence-fork:${sequence}`);
    }
    if (!existing) bySequence.set(sequence, { digest, envelope });
  }

  const ordered = [...bySequence.entries()].sort(([a], [b]) => a - b);
  for (let index = 0; index < ordered.length; index += 1) {
    const expected = index + 1;
    if (ordered[index][0] !== expected) throw new Error(`historical-sequence-gap:${expected}`);
  }

  const digests = ordered.map(([sequence, item]) => ({ sequence, digest: item.digest }));
  return {
    lastAcceptedSequence: ordered.at(-1)?.[0] ?? 0,
    historyCommitment: sha256(utf8(stableJson({
      tenantId,
      revokedDeviceId: revokedDeviceRecord.deviceId,
      revokedFromEpoch,
      envelopes: digests
    })))
  };
}

export function createRevocationBarrier({
  tenantId,
  revokedDeviceRecord,
  historicalEnvelopes,
  authorizingDevice,
  authorizingDeviceRecord,
  createdAt = new Date().toISOString()
}) {
  if (!tenantId) throw new Error('revocation-tenant-required');
  if (!revokedDeviceRecord || revokedDeviceRecord.tenantId !== tenantId) {
    throw new Error('revoked-device-tenant-mismatch');
  }
  if (revokedDeviceRecord.status !== 'REVOKED' || !Number.isInteger(revokedDeviceRecord.revokedFromEpoch)) {
    throw new Error('revoked-device-record-required');
  }
  if (!authorizingDeviceRecord || authorizingDeviceRecord.tenantId !== tenantId) {
    throw new Error('revocation-authorizer-tenant-mismatch');
  }
  if (authorizingDeviceRecord.deviceId !== authorizingDevice?.deviceId) {
    throw new Error('revocation-authorizer-identity-mismatch');
  }
  if (authorizingDevice.deviceId === revokedDeviceRecord.deviceId) {
    throw new Error('revoked-device-cannot-authorize-cutover');
  }
  if (!isAuthorizedForEpoch(authorizingDeviceRecord, revokedDeviceRecord.revokedFromEpoch, tenantId)) {
    throw new Error('revocation-authorizer-not-authorized-for-cutover');
  }

  const commitment = originHistoryCommitment({
    tenantId,
    revokedDeviceRecord,
    revokedFromEpoch: revokedDeviceRecord.revokedFromEpoch,
    historicalEnvelopes
  });

  const header = {
    protocol: REVOCATION_BARRIER_PROTOCOL,
    tenantId,
    revokedDeviceId: revokedDeviceRecord.deviceId,
    revokedFromEpoch: revokedDeviceRecord.revokedFromEpoch,
    lastAcceptedSequence: commitment.lastAcceptedSequence,
    historyCommitment: commitment.historyCommitment,
    authorizingDeviceId: authorizingDevice.deviceId,
    createdAt
  };

  return {
    header,
    signature: b64(sign(null, utf8(stableJson(header)), authorizingDevice.signing.privateKey))
  };
}

export function validateRevocationBarrier({
  barrier,
  revokedDeviceRecord,
  authorizingDeviceRecord
}) {
  const header = barrier?.header;
  if (!header || header.protocol !== REVOCATION_BARRIER_PROTOCOL || !barrier.signature) {
    throw new Error('invalid-revocation-barrier');
  }
  if (!header.tenantId || !header.revokedDeviceId || !header.authorizingDeviceId) {
    throw new Error('invalid-revocation-barrier-context');
  }
  if (!Number.isInteger(header.revokedFromEpoch) || header.revokedFromEpoch <= 0) {
    throw new Error('invalid-revocation-barrier-epoch');
  }
  if (!Number.isInteger(header.lastAcceptedSequence) || header.lastAcceptedSequence < 0 || !header.historyCommitment) {
    throw new Error('invalid-revocation-barrier-history');
  }
  if (!revokedDeviceRecord || revokedDeviceRecord.tenantId !== header.tenantId) {
    throw new Error('revoked-device-tenant-mismatch');
  }
  if (revokedDeviceRecord.deviceId !== header.revokedDeviceId) {
    throw new Error('revocation-barrier-device-mismatch');
  }
  if (revokedDeviceRecord.status !== 'REVOKED' || revokedDeviceRecord.revokedFromEpoch !== header.revokedFromEpoch) {
    throw new Error('revocation-barrier-epoch-mismatch');
  }
  if (!authorizingDeviceRecord || authorizingDeviceRecord.tenantId !== header.tenantId) {
    throw new Error('revocation-authorizer-tenant-mismatch');
  }
  if (authorizingDeviceRecord.deviceId !== header.authorizingDeviceId) {
    throw new Error('revocation-authorizer-identity-mismatch');
  }
  if (authorizingDeviceRecord.deviceId === revokedDeviceRecord.deviceId) {
    throw new Error('revoked-device-cannot-authorize-cutover');
  }
  if (!isAuthorizedForEpoch(authorizingDeviceRecord, header.revokedFromEpoch, header.tenantId)) {
    throw new Error('revocation-authorizer-not-authorized-for-cutover');
  }

  const signingKey = publicKeyFromDer(authorizingDeviceRecord.signingPublicKey);
  if (!verify(null, utf8(stableJson(header)), signingKey, fromB64(barrier.signature))) {
    throw new Error('invalid-revocation-barrier-signature');
  }

  return {
    tenantId: header.tenantId,
    revokedDeviceId: header.revokedDeviceId,
    revokedFromEpoch: header.revokedFromEpoch,
    lastAcceptedSequence: header.lastAcceptedSequence,
    historyCommitment: header.historyCommitment,
    authorizingDeviceId: header.authorizingDeviceId
  };
}

export function assertRevokedOriginHistory({
  barrier,
  historicalEnvelopes,
  revokedDeviceRecord,
  authorizingDeviceRecord
}) {
  const validated = validateRevocationBarrier({
    barrier,
    revokedDeviceRecord,
    authorizingDeviceRecord
  });
  const commitment = originHistoryCommitment({
    tenantId: validated.tenantId,
    revokedDeviceRecord,
    revokedFromEpoch: validated.revokedFromEpoch,
    historicalEnvelopes
  });

  if (commitment.lastAcceptedSequence !== validated.lastAcceptedSequence) {
    throw new Error('revoked-origin-history-sequence-mismatch');
  }
  if (commitment.historyCommitment !== validated.historyCommitment) {
    throw new Error('revoked-origin-history-commitment-mismatch');
  }

  return {
    historicalOriginFrozen: true,
    ...validated
  };
}
