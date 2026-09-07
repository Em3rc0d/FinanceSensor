import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHECKPOINT_STATUS,
  createSignedCheckpoint,
  evaluateCheckpointView,
  trustedAnchorFromCheckpoint,
  verifySignedCheckpoint
} from '../src/checkpoint.js';
import {
  generateDeviceIdentity,
  publicDeviceRecord
} from '../src/protocol.js';

function rig() {
  const tenantId = 'tenant-checkpoint';
  const deviceA = generateDeviceIdentity('checkpoint-device-a');
  const deviceB = generateDeviceIdentity('checkpoint-device-b');
  const recordA = publicDeviceRecord(deviceA, { tenantId, authorizedFromEpoch: 1 });
  const recordB = publicDeviceRecord(deviceB, { tenantId, authorizedFromEpoch: 1 });
  const records = new Map([
    [recordA.deviceId, recordA],
    [recordB.deviceId, recordB]
  ]);

  const make = ({
    sequence,
    previousCheckpointHash = null,
    stateCommitment = `state-${sequence}`,
    authorizingDevice = deviceA,
    authorizingDeviceRecord = recordA,
    checkpointTenantId = tenantId,
    keyEpoch = 1,
    createdAt = `2026-09-01T18:${String(sequence).padStart(2, '0')}:00.000Z`
  }) => createSignedCheckpoint({
    tenantId: checkpointTenantId,
    checkpointSequence: sequence,
    keyEpoch,
    previousCheckpointHash,
    stateCommitment,
    originHeads: [
      { originDeviceId: deviceA.deviceId, highestSequence: sequence * 2 },
      { originDeviceId: deviceB.deviceId, highestSequence: sequence }
    ],
    authorizingDevice,
    authorizingDeviceRecord,
    createdAt
  });

  const c1 = make({ sequence: 1 });
  const c2 = make({ sequence: 2, previousCheckpointHash: c1.checkpointHash });
  const c3 = make({ sequence: 3, previousCheckpointHash: c2.checkpointHash });

  return { tenantId, deviceA, deviceB, recordA, recordB, records, make, c1, c2, c3 };
}

test('ARB-001 a valid signed chain may advance from an independently trusted anchor', () => {
  const r = rig();
  const anchor = trustedAnchorFromCheckpoint(r.c1);
  const result = evaluateCheckpointView({
    anchor,
    checkpoints: [r.c2, r.c3],
    authorizingDeviceRecords: r.records
  });

  assert.equal(result.status, CHECKPOINT_STATUS.CONSISTENT_FROM_ANCHOR);
  assert.equal(result.latestSeenSequence, 3);
  assert.equal(result.latestGlobalFreshness, 'UNPROVEN');
});

test('ARB-002 exact duplicate checkpoint delivery is retry-equivalent', () => {
  const r = rig();
  const anchor = trustedAnchorFromCheckpoint(r.c1);
  const result = evaluateCheckpointView({
    anchor,
    checkpoints: [r.c2, structuredClone(r.c2), r.c3, structuredClone(r.c3)],
    authorizingDeviceRecords: r.records
  });

  assert.equal(result.status, CHECKPOINT_STATUS.CONSISTENT_FROM_ANCHOR);
  assert.equal(result.latestSeenSequence, 3);
});

test('ARB-003 a relay view entirely behind the independent anchor is rejected as rollback', () => {
  const r = rig();
  const anchor = trustedAnchorFromCheckpoint(r.c3);

  assert.throws(() => evaluateCheckpointView({
    anchor,
    checkpoints: [r.c1, r.c2],
    authorizingDeviceRecords: r.records
  }), /checkpoint-rollback-detected/);
});

test('ARB-004 two authentic checkpoint hashes for the same tenant sequence fail closed as a fork', () => {
  const r = rig();
  const fork2 = r.make({
    sequence: 2,
    previousCheckpointHash: r.c1.checkpointHash,
    stateCommitment: 'forked-state-2',
    createdAt: '2026-09-01T18:22:00.000Z'
  });

  assert.throws(() => evaluateCheckpointView({
    anchor: trustedAnchorFromCheckpoint(r.c1),
    checkpoints: [r.c2, fork2],
    authorizingDeviceRecords: r.records
  }), /checkpoint-sequence-fork:2/);
});

test('ARB-005 a validly signed checkpoint with the wrong previous hash does not extend the anchor chain', () => {
  const r = rig();
  const wrongParent = r.make({
    sequence: 2,
    previousCheckpointHash: '0'.repeat(64),
    stateCommitment: 'wrong-parent'
  });

  assert.throws(() => evaluateCheckpointView({
    anchor: trustedAnchorFromCheckpoint(r.c1),
    checkpoints: [wrongParent],
    authorizingDeviceRecords: r.records
  }), /checkpoint-previous-hash-mismatch/);
});

test('ARB-006 a missing intermediate checkpoint is a gap, not a successful fast advance', () => {
  const r = rig();

  assert.throws(() => evaluateCheckpointView({
    anchor: trustedAnchorFromCheckpoint(r.c1),
    checkpoints: [r.c3],
    authorizingDeviceRecords: r.records
  }), /checkpoint-sequence-gap:expected=2:actual=3/);
});

test('ARB-007 checkpoint body tampering is rejected before anti-rollback evaluation', () => {
  const r = rig();
  const tampered = structuredClone(r.c2);
  tampered.body.stateCommitment = 'tampered-state';

  assert.throws(() => verifySignedCheckpoint({
    checkpoint: tampered,
    authorizingDeviceRecord: r.recordA
  }), /checkpoint-hash-mismatch|invalid-checkpoint-signature/);
});

test('ARB-008 a cryptographically valid signer that is revoked for the checkpoint epoch is not authority', () => {
  const r = rig();
  const revokedRecord = {
    ...r.recordA,
    status: 'REVOKED',
    revokedFromEpoch: 1
  };
  const poisoned = new Map(r.records);
  poisoned.set(revokedRecord.deviceId, revokedRecord);

  assert.throws(() => evaluateCheckpointView({
    anchor: trustedAnchorFromCheckpoint(r.c1),
    checkpoints: [r.c2],
    authorizingDeviceRecords: poisoned
  }), /checkpoint-authorizer-not-authorized/);
});

test('ARB-009 checkpoint material from another tenant cannot advance this tenant anchor', () => {
  const r = rig();
  const other = generateDeviceIdentity('checkpoint-other-tenant-device');
  const otherRecord = publicDeviceRecord(other, { tenantId: 'tenant-other', authorizedFromEpoch: 1 });
  const otherCheckpoint = r.make({
    sequence: 2,
    checkpointTenantId: 'tenant-other',
    previousCheckpointHash: r.c1.checkpointHash,
    authorizingDevice: other,
    authorizingDeviceRecord: otherRecord
  });
  const records = new Map(r.records);
  records.set(otherRecord.deviceId, otherRecord);

  assert.throws(() => evaluateCheckpointView({
    anchor: trustedAnchorFromCheckpoint(r.c1),
    checkpoints: [otherCheckpoint],
    authorizingDeviceRecords: records
  }), /checkpoint-tenant-mismatch/);
});

test('ARB-010 a signed fast-forward sequence cannot skip directly over unknown checkpoints', () => {
  const r = rig();
  const fastForward = r.make({
    sequence: 100,
    previousCheckpointHash: r.c1.checkpointHash,
    stateCommitment: 'fast-forward'
  });

  assert.throws(() => evaluateCheckpointView({
    anchor: trustedAnchorFromCheckpoint(r.c1),
    checkpoints: [fastForward],
    authorizingDeviceRecords: r.records
  }), /checkpoint-sequence-gap:expected=2:actual=100/);
});

test('ARB-011 no independent anchor means authenticity cannot be promoted to freshness', () => {
  const r = rig();
  const result = evaluateCheckpointView({
    anchor: null,
    checkpoints: [r.c1, r.c2, r.c3],
    authorizingDeviceRecords: r.records
  });

  assert.equal(result.status, CHECKPOINT_STATUS.INDETERMINATE_FRESHNESS);
  assert.equal(result.latestGlobalFreshness, 'UNPROVEN');
});

test('ARB-012 a relay frozen exactly at the trusted anchor is consistent but still not proven globally latest', () => {
  const r = rig();
  const anchor = trustedAnchorFromCheckpoint(r.c2);
  const result = evaluateCheckpointView({
    anchor,
    checkpoints: [structuredClone(r.c2)],
    authorizingDeviceRecords: r.records
  });

  assert.equal(result.status, CHECKPOINT_STATUS.CONSISTENT_FROM_ANCHOR);
  assert.equal(result.latestSeenSequence, 2);
  assert.equal(result.latestGlobalFreshness, 'UNPROVEN');
});

test('ARB-013 same anchor sequence with a different authentic hash is explicit equivocation', () => {
  const r = rig();
  const alternateAnchorSequence = r.make({
    sequence: 2,
    previousCheckpointHash: r.c1.checkpointHash,
    stateCommitment: 'alternate-sequence-two',
    createdAt: '2026-09-01T18:52:00.000Z'
  });

  assert.throws(() => evaluateCheckpointView({
    anchor: trustedAnchorFromCheckpoint(r.c2),
    checkpoints: [alternateAnchorSequence],
    authorizingDeviceRecords: r.records
  }), /checkpoint-anchor-fork/);
});

test('ARB-014 a valid anchored chain cannot prove that the relay did not withhold an unseen later tail', () => {
  const r = rig();
  const anchor = trustedAnchorFromCheckpoint(r.c1);
  const result = evaluateCheckpointView({
    anchor,
    checkpoints: [r.c2],
    authorizingDeviceRecords: r.records
  });

  // c3 exists in the test rig but is intentionally withheld from the evaluator.
  // A truthful API must not call c2 globally latest.
  assert.equal(result.status, CHECKPOINT_STATUS.CONSISTENT_FROM_ANCHOR);
  assert.equal(result.latestSeenSequence, 2);
  assert.equal(result.latestGlobalFreshness, 'UNPROVEN');
});
