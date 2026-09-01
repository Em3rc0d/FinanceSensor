import {
  createHash,
  createPublicKey,
  sign,
  verify
} from 'node:crypto';
import { isAuthorizedForEpoch, stableJson } from './protocol.js';

// FEASIBILITY SPIKE ONLY.
// Initial baseline intentionally proves checkpoint authenticity only.
// Adversarial tests must demonstrate why authenticity != anti-rollback freshness.

export const CHECKPOINT_PROTOCOL = 'FINANCESENSOR_CHECKPOINT_SPIKE_V1';
export const CHECKPOINT_STATUS = Object.freeze({
  CONSISTENT_FROM_ANCHOR: 'CONSISTENT_FROM_ANCHOR',
  INDETERMINATE_FRESHNESS: 'INDETERMINATE_FRESHNESS'
});

const utf8 = value => Buffer.from(String(value), 'utf8');
const fromB64 = value => Buffer.from(value, 'base64url');
const b64 = value => Buffer.from(value).toString('base64url');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function publicKeyFromRecord(record) {
  return createPublicKey({
    key: fromB64(record.signingPublicKey),
    type: 'spki',
    format: 'der'
  });
}

export function checkpointHash(body) {
  return sha256(utf8(stableJson(body)));
}

function normalizeOriginHeads(originHeads) {
  if (!Array.isArray(originHeads)) throw new Error('checkpoint-origin-heads-required');
  return originHeads
    .map(item => {
      if (!item?.originDeviceId || !Number.isInteger(item.highestSequence) || item.highestSequence < 0) {
        throw new Error('invalid-checkpoint-origin-head');
      }
      return {
        originDeviceId: item.originDeviceId,
        highestSequence: item.highestSequence
      };
    })
    .sort((a, b) => a.originDeviceId.localeCompare(b.originDeviceId));
}

export function createSignedCheckpoint({
  tenantId,
  checkpointSequence,
  keyEpoch,
  previousCheckpointHash = null,
  stateCommitment,
  originHeads,
  authorizingDevice,
  authorizingDeviceRecord,
  createdAt = new Date().toISOString()
}) {
  if (!tenantId) throw new Error('checkpoint-tenant-required');
  if (!Number.isInteger(checkpointSequence) || checkpointSequence <= 0) throw new Error('invalid-checkpoint-sequence');
  if (!Number.isInteger(keyEpoch) || keyEpoch <= 0) throw new Error('invalid-checkpoint-key-epoch');
  if (!stateCommitment) throw new Error('checkpoint-state-commitment-required');
  if (!authorizingDevice?.deviceId || !authorizingDevice?.signing?.privateKey) throw new Error('invalid-checkpoint-authorizer');
  if (!authorizingDeviceRecord || authorizingDeviceRecord.deviceId !== authorizingDevice.deviceId) {
    throw new Error('checkpoint-authorizer-identity-mismatch');
  }
  if (!isAuthorizedForEpoch(authorizingDeviceRecord, keyEpoch, tenantId)) {
    throw new Error('checkpoint-authorizer-not-authorized');
  }

  const body = {
    protocol: CHECKPOINT_PROTOCOL,
    tenantId,
    checkpointSequence,
    keyEpoch,
    previousCheckpointHash,
    stateCommitment,
    originHeads: normalizeOriginHeads(originHeads),
    authorizingDeviceId: authorizingDevice.deviceId,
    createdAt
  };
  const hash = checkpointHash(body);
  const signature = sign(null, utf8(stableJson(body)), authorizingDevice.signing.privateKey);

  return {
    body,
    checkpointHash: hash,
    signature: b64(signature)
  };
}

export function verifySignedCheckpoint({ checkpoint, authorizingDeviceRecord }) {
  if (checkpoint?.body?.protocol !== CHECKPOINT_PROTOCOL) throw new Error('unsupported-checkpoint-protocol');
  if (!checkpoint.body.tenantId) throw new Error('invalid-checkpoint-tenant');
  if (!Number.isInteger(checkpoint.body.checkpointSequence) || checkpoint.body.checkpointSequence <= 0) {
    throw new Error('invalid-checkpoint-sequence');
  }
  if (!Number.isInteger(checkpoint.body.keyEpoch) || checkpoint.body.keyEpoch <= 0) {
    throw new Error('invalid-checkpoint-key-epoch');
  }
  if (!authorizingDeviceRecord || authorizingDeviceRecord.deviceId !== checkpoint.body.authorizingDeviceId) {
    throw new Error('checkpoint-authorizer-identity-mismatch');
  }
  if (!isAuthorizedForEpoch(authorizingDeviceRecord, checkpoint.body.keyEpoch, checkpoint.body.tenantId)) {
    throw new Error('checkpoint-authorizer-not-authorized');
  }

  const expectedHash = checkpointHash(checkpoint.body);
  if (expectedHash !== checkpoint.checkpointHash) throw new Error('checkpoint-hash-mismatch');

  const signatureValid = verify(
    null,
    utf8(stableJson(checkpoint.body)),
    publicKeyFromRecord(authorizingDeviceRecord),
    fromB64(checkpoint.signature)
  );
  if (!signatureValid) throw new Error('invalid-checkpoint-signature');

  return {
    tenantId: checkpoint.body.tenantId,
    checkpointSequence: checkpoint.body.checkpointSequence,
    keyEpoch: checkpoint.body.keyEpoch,
    checkpointHash: checkpoint.checkpointHash
  };
}

export function trustedAnchorFromCheckpoint(checkpoint) {
  if (!checkpoint?.body?.tenantId || !checkpoint?.checkpointHash) throw new Error('invalid-checkpoint-anchor-source');
  return {
    tenantId: checkpoint.body.tenantId,
    checkpointSequence: checkpoint.body.checkpointSequence,
    checkpointHash: checkpoint.checkpointHash
  };
}

export function evaluateCheckpointView({
  anchor = null,
  checkpoints,
  authorizingDeviceRecords
}) {
  if (!Array.isArray(checkpoints)) throw new Error('checkpoints-required');
  if (!(authorizingDeviceRecords instanceof Map)) throw new Error('checkpoint-authorizer-records-required');

  const verified = checkpoints.map(checkpoint => {
    const record = authorizingDeviceRecords.get(checkpoint?.body?.authorizingDeviceId);
    return {
      checkpoint,
      verification: verifySignedCheckpoint({ checkpoint, authorizingDeviceRecord: record })
    };
  });

  // Deliberately weak first baseline: authenticity is checked, but chain/rollback/fork
  // semantics are not yet enforced. Red adversarial tests should break this assumption.
  const highest = verified
    .slice()
    .sort((a, b) => a.verification.checkpointSequence - b.verification.checkpointSequence)
    .at(-1)?.verification ?? null;

  return {
    status: CHECKPOINT_STATUS.CONSISTENT_FROM_ANCHOR,
    anchorSequence: anchor?.checkpointSequence ?? null,
    latestSeenSequence: highest?.checkpointSequence ?? anchor?.checkpointSequence ?? 0,
    latestSeenHash: highest?.checkpointHash ?? anchor?.checkpointHash ?? null,
    latestGlobalFreshness: 'UNPROVEN'
  };
}
