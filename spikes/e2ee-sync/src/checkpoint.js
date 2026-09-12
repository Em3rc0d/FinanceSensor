import {
  createHash,
  createPublicKey,
  sign,
  verify
} from 'node:crypto';
import { isAuthorizedForEpoch, stableJson } from './protocol.js';

// FEASIBILITY SPIKE ONLY.
// This module proves bounded trusted-checkpoint semantics. It does not prove
// that a relay-provided head is globally latest and it is not production
// transparency/append-only infrastructure.

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
  const seen = new Set();
  return originHeads
    .map(item => {
      if (!item?.originDeviceId || !Number.isInteger(item.highestSequence) || item.highestSequence < 0) {
        throw new Error('invalid-checkpoint-origin-head');
      }
      if (seen.has(item.originDeviceId)) throw new Error(`duplicate-checkpoint-origin-head:${item.originDeviceId}`);
      seen.add(item.originDeviceId);
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
  if (previousCheckpointHash != null && !/^[a-f0-9]{64}$/u.test(previousCheckpointHash)) {
    throw new Error('invalid-previous-checkpoint-hash');
  }
  if (!authorizingDevice?.deviceId || !authorizingDevice?.signing?.privateKey) throw new Error('invalid-checkpoint-authorizer');
  if (!authorizingDeviceRecord || authorizingDeviceRecord.deviceId !== authorizingDevice.deviceId) {
    throw new Error('checkpoint-authorizer-identity-mismatch');
  }
  if (authorizingDeviceRecord.tenantId !== tenantId) throw new Error('checkpoint-authorizer-tenant-mismatch');
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
  if (!checkpoint.body.stateCommitment) throw new Error('checkpoint-state-commitment-required');
  if (checkpoint.body.previousCheckpointHash != null && !/^[a-f0-9]{64}$/u.test(checkpoint.body.previousCheckpointHash)) {
    throw new Error('invalid-previous-checkpoint-hash');
  }
  normalizeOriginHeads(checkpoint.body.originHeads);

  if (!authorizingDeviceRecord || authorizingDeviceRecord.deviceId !== checkpoint.body.authorizingDeviceId) {
    throw new Error('checkpoint-authorizer-identity-mismatch');
  }
  if (authorizingDeviceRecord.tenantId !== checkpoint.body.tenantId) {
    throw new Error('checkpoint-authorizer-tenant-mismatch');
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
    checkpointHash: checkpoint.checkpointHash,
    previousCheckpointHash: checkpoint.body.previousCheckpointHash
  };
}

export function trustedAnchorFromCheckpoint(checkpoint) {
  if (!checkpoint?.body?.tenantId || !checkpoint?.checkpointHash) throw new Error('invalid-checkpoint-anchor-source');
  if (!Number.isInteger(checkpoint.body.checkpointSequence) || checkpoint.body.checkpointSequence <= 0) {
    throw new Error('invalid-checkpoint-anchor-sequence');
  }
  if (!/^[a-f0-9]{64}$/u.test(checkpoint.checkpointHash)) throw new Error('invalid-checkpoint-anchor-hash');
  return {
    tenantId: checkpoint.body.tenantId,
    checkpointSequence: checkpoint.body.checkpointSequence,
    checkpointHash: checkpoint.checkpointHash
  };
}

function validateAnchor(anchor) {
  if (!anchor?.tenantId) throw new Error('checkpoint-anchor-tenant-required');
  if (!Number.isInteger(anchor.checkpointSequence) || anchor.checkpointSequence <= 0) {
    throw new Error('invalid-checkpoint-anchor-sequence');
  }
  if (!/^[a-f0-9]{64}$/u.test(anchor.checkpointHash ?? '')) throw new Error('invalid-checkpoint-anchor-hash');
}

function verifyAndDedupe({ checkpoints, authorizingDeviceRecords, expectedTenantId = null }) {
  const bySequence = new Map();

  for (const checkpoint of checkpoints) {
    const record = authorizingDeviceRecords.get(checkpoint?.body?.authorizingDeviceId);
    const verification = verifySignedCheckpoint({ checkpoint, authorizingDeviceRecord: record });

    if (expectedTenantId != null && verification.tenantId !== expectedTenantId) {
      throw new Error('checkpoint-tenant-mismatch');
    }

    const existing = bySequence.get(verification.checkpointSequence);
    if (existing != null) {
      if (existing.verification.checkpointHash !== verification.checkpointHash) {
        throw new Error(`checkpoint-sequence-fork:${verification.checkpointSequence}`);
      }
      continue;
    }

    bySequence.set(verification.checkpointSequence, { checkpoint, verification });
  }

  return [...bySequence.values()].sort(
    (a, b) => a.verification.checkpointSequence - b.verification.checkpointSequence
  );
}

function assertInternalContinuity(verified) {
  for (let index = 1; index < verified.length; index += 1) {
    const previous = verified[index - 1].verification;
    const current = verified[index].verification;
    const expectedSequence = previous.checkpointSequence + 1;
    if (current.checkpointSequence !== expectedSequence) {
      throw new Error(`checkpoint-sequence-gap:expected=${expectedSequence}:actual=${current.checkpointSequence}`);
    }
    if (current.previousCheckpointHash !== previous.checkpointHash) {
      throw new Error('checkpoint-previous-hash-mismatch');
    }
  }
}

export function evaluateCheckpointView({
  anchor = null,
  checkpoints,
  authorizingDeviceRecords
}) {
  if (!Array.isArray(checkpoints)) throw new Error('checkpoints-required');
  if (!(authorizingDeviceRecords instanceof Map)) throw new Error('checkpoint-authorizer-records-required');

  if (anchor == null) {
    const verified = verifyAndDedupe({ checkpoints, authorizingDeviceRecords });
    if (verified.length > 1) assertInternalContinuity(verified);
    const highest = verified.at(-1)?.verification ?? null;
    return {
      status: CHECKPOINT_STATUS.INDETERMINATE_FRESHNESS,
      anchorSequence: null,
      latestSeenSequence: highest?.checkpointSequence ?? 0,
      latestSeenHash: highest?.checkpointHash ?? null,
      latestKnownConsistent: verified.length > 0,
      latestGlobalFreshness: 'UNPROVEN'
    };
  }

  validateAnchor(anchor);
  const verified = verifyAndDedupe({
    checkpoints,
    authorizingDeviceRecords,
    expectedTenantId: anchor.tenantId
  });

  const highestPresentedSequence = verified.at(-1)?.verification.checkpointSequence ?? anchor.checkpointSequence;
  if (verified.length > 0 && highestPresentedSequence < anchor.checkpointSequence) {
    throw new Error('checkpoint-rollback-detected');
  }

  const atAnchor = verified.find(item => item.verification.checkpointSequence === anchor.checkpointSequence);
  if (atAnchor != null && atAnchor.verification.checkpointHash !== anchor.checkpointHash) {
    throw new Error('checkpoint-anchor-fork');
  }

  const afterAnchor = verified.filter(
    item => item.verification.checkpointSequence > anchor.checkpointSequence
  );

  let previousSequence = anchor.checkpointSequence;
  let previousHash = anchor.checkpointHash;

  for (const item of afterAnchor) {
    const current = item.verification;
    const expectedSequence = previousSequence + 1;
    if (current.checkpointSequence !== expectedSequence) {
      throw new Error(`checkpoint-sequence-gap:expected=${expectedSequence}:actual=${current.checkpointSequence}`);
    }
    if (current.previousCheckpointHash !== previousHash) {
      throw new Error('checkpoint-previous-hash-mismatch');
    }
    previousSequence = current.checkpointSequence;
    previousHash = current.checkpointHash;
  }

  return {
    status: CHECKPOINT_STATUS.CONSISTENT_FROM_ANCHOR,
    anchorSequence: anchor.checkpointSequence,
    latestSeenSequence: previousSequence,
    latestSeenHash: previousHash,
    latestKnownConsistent: true,
    latestGlobalFreshness: 'UNPROVEN'
  };
}
