import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWitness,
  evaluateWitnessFreshness,
  generateEd25519Identity,
  signWitnessSubmission,
  submitCheckpointToWitness,
  verifyWitnessReceipt
} from '../src/witness.js';

function makeFixture() {
  const witnesses = [];
  const configs = [];
  for (const suffix of ['A', 'B', 'C']) {
    const submissionIdentity = generateEd25519Identity();
    const witnessIdentity = generateEd25519Identity();
    const witnessLogId = `opaque-log-${suffix}-${'x'.repeat(16)}`;
    const witnessId = `witness-${suffix}`;
    const witness = createWitness({
      witnessId,
      signingIdentity: witnessIdentity,
      bindings: [{ witnessLogId, submissionPublicKey: submissionIdentity.publicKey }]
    });
    witnesses.push({ witness, witnessId, witnessLogId, submissionIdentity, witnessIdentity });
    configs.push({ witnessId, witnessLogId, witnessPublicKey: witnessIdentity.publicKey });
  }
  return { witnesses, configs };
}

function signedSubmission(item, sequence, hash, previousHash, overrides = {}) {
  return signWitnessSubmission({
    witnessLogId: overrides.witnessLogId ?? item.witnessLogId,
    checkpointSequence: sequence,
    checkpointHash: hash,
    previousCheckpointHash: previousHash,
    protocolVersion: 1,
    submissionPrivateKey: overrides.privateKey ?? item.submissionIdentity.privateKey
  });
}

function accept(item, sequence, hash, previousHash, observedAt) {
  const result = submitCheckpointToWitness(
    item.witness,
    signedSubmission(item, sequence, hash, previousHash),
    observedAt ?? `2026-09-01T00:00:${String(sequence).padStart(2, '0')}.000Z`
  );
  assert.equal(result.accepted, true);
  return result.receipt;
}

function advanceToTwo(item) {
  accept(item, 1, 'hash-1', null);
  return accept(item, 2, 'hash-2', 'hash-1');
}

test('WIT-001 first authenticated witness binding produces a verifiable signed receipt', () => {
  const { witnesses } = makeFixture();
  const item = witnesses[0];
  const result = submitCheckpointToWitness(item.witness, signedSubmission(item, 1, 'hash-1', null));
  assert.equal(result.accepted, true);
  assert.equal(result.receipt.witnessLogId, item.witnessLogId);
  assert.equal(verifyWitnessReceipt(result.receipt, item.witnessIdentity.publicKey), true);
});

test('WIT-002 witness accepts a contiguous monotonic checkpoint advance', () => {
  const { witnesses } = makeFixture();
  const item = witnesses[0];
  accept(item, 1, 'hash-1', null);
  const result = submitCheckpointToWitness(item.witness, signedSubmission(item, 2, 'hash-2', 'hash-1'));
  assert.equal(result.accepted, true);
  assert.equal(item.witness.latestByLog.get(item.witnessLogId).checkpointSequence, 2);
});

test('WIT-003 exact duplicate delivery is retry-equivalent and does not create a new semantic head', () => {
  const { witnesses } = makeFixture();
  const item = witnesses[0];
  const first = signedSubmission(item, 1, 'hash-1', null);
  const a = submitCheckpointToWitness(item.witness, first);
  const b = submitCheckpointToWitness(item.witness, first);
  assert.equal(a.accepted, true);
  assert.equal(b.accepted, true);
  assert.deepEqual(item.witness.latestByLog.get(item.witnessLogId), {
    checkpointSequence: 1,
    checkpointHash: 'hash-1',
    previousCheckpointHash: null,
    protocolVersion: 1
  });
});

test('WIT-004 rollback submission is rejected by the witness', () => {
  const { witnesses } = makeFixture();
  const item = witnesses[0];
  advanceToTwo(item);
  const result = submitCheckpointToWitness(item.witness, signedSubmission(item, 1, 'hash-1', null));
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'WITNESS_ROLLBACK_REJECTED');
});

test('WIT-005 same-sequence different-hash fork is rejected by the witness', () => {
  const { witnesses } = makeFixture();
  const item = witnesses[0];
  accept(item, 1, 'hash-1', null);
  const result = submitCheckpointToWitness(item.witness, signedSubmission(item, 1, 'evil-hash-1', null));
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'WITNESS_FORK_REJECTED');
});

test('WIT-006 sequence gap is rejected rather than accepted as a fast-forward', () => {
  const { witnesses } = makeFixture();
  const item = witnesses[0];
  accept(item, 1, 'hash-1', null);
  const result = submitCheckpointToWitness(item.witness, signedSubmission(item, 3, 'hash-3', 'hash-2'));
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'WITNESS_SEQUENCE_GAP');
});

test('WIT-007 wrong previous checkpoint hash is rejected', () => {
  const { witnesses } = makeFixture();
  const item = witnesses[0];
  accept(item, 1, 'hash-1', null);
  const result = submitCheckpointToWitness(item.witness, signedSubmission(item, 2, 'hash-2', 'wrong-parent'));
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'WITNESS_PARENT_MISMATCH');
});

test('WIT-008 invalid submission authority is rejected before state mutation', () => {
  const { witnesses } = makeFixture();
  const item = witnesses[0];
  const attacker = generateEd25519Identity();
  const result = submitCheckpointToWitness(
    item.witness,
    signedSubmission(item, 1, 'hash-1', null, { privateKey: attacker.privateKey })
  );
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'INVALID_SUBMISSION_AUTHORITY');
  assert.equal(item.witness.latestByLog.has(item.witnessLogId), false);
});

test('WIT-009 witness receipt signature tampering is detected', () => {
  const { witnesses } = makeFixture();
  const item = witnesses[0];
  const receipt = accept(item, 1, 'hash-1', null);
  const tampered = { ...receipt, checkpointHash: 'tampered' };
  assert.equal(verifyWitnessReceipt(tampered, item.witnessIdentity.publicKey), false);
});

test('WIT-010 per-witness opaque log identifiers are distinct', () => {
  const { witnesses } = makeFixture();
  assert.equal(new Set(witnesses.map(item => item.witnessLogId)).size, 3);
});

test('WIT-011 two of three witnesses confirming the same relay head confirm freshness through N', () => {
  const { witnesses, configs } = makeFixture();
  const receipts = [advanceToTwo(witnesses[0]), advanceToTwo(witnesses[1])];
  const result = evaluateWitnessFreshness({
    relayCheckpoint: { checkpointSequence: 2, checkpointHash: 'hash-2' },
    witnessViews: receipts.map(receipt => ({ receipt })),
    configuredWitnesses: configs,
    threshold: 2
  });
  assert.equal(result.status, 'WITNESS_CONFIRMED_THROUGH_N');
  assert.equal(result.confirmedThrough, 2);
});

test('WIT-012 one unavailable witness still allows two-of-three confirmation', () => {
  const { witnesses, configs } = makeFixture();
  const receipts = [advanceToTwo(witnesses[0]), advanceToTwo(witnesses[2])];
  const result = evaluateWitnessFreshness({
    relayCheckpoint: { checkpointSequence: 2, checkpointHash: 'hash-2' },
    witnessViews: receipts.map(receipt => ({ receipt })),
    configuredWitnesses: configs,
    threshold: 2
  });
  assert.equal(result.status, 'WITNESS_CONFIRMED_THROUGH_N');
});

test('WIT-013 only one confirming witness does not satisfy quorum', () => {
  const { witnesses, configs } = makeFixture();
  const current = advanceToTwo(witnesses[0]);
  const stale = accept(witnesses[1], 1, 'hash-1', null);
  const result = evaluateWitnessFreshness({
    relayCheckpoint: { checkpointSequence: 2, checkpointHash: 'hash-2' },
    witnessViews: [{ receipt: current }, { receipt: stale }],
    configuredWitnesses: configs,
    threshold: 2
  });
  assert.equal(result.status, 'FRESHNESS_UNCONFIRMED');
});

test('WIT-014 one valid witness ahead of relay prevents freshness confirmation', () => {
  const { witnesses, configs } = makeFixture();
  const rA = advanceToTwo(witnesses[0]);
  const rB = advanceToTwo(witnesses[1]);
  advanceToTwo(witnesses[2]);
  const rC = accept(witnesses[2], 3, 'hash-3', 'hash-2');
  const result = evaluateWitnessFreshness({
    relayCheckpoint: { checkpointSequence: 2, checkpointHash: 'hash-2' },
    witnessViews: [rA, rB, rC].map(receipt => ({ receipt })),
    configuredWitnesses: configs,
    threshold: 2
  });
  assert.equal(result.status, 'RELAY_BEHIND_WITNESS');
});

test('WIT-015 same-sequence valid witness divergence prevents quorum from hiding equivocation', () => {
  const { witnesses, configs } = makeFixture();
  const rA = advanceToTwo(witnesses[0]);
  const rB = advanceToTwo(witnesses[1]);
  accept(witnesses[2], 1, 'hash-1', null);
  const rC = accept(witnesses[2], 2, 'fork-hash-2', 'hash-1');
  const result = evaluateWitnessFreshness({
    relayCheckpoint: { checkpointSequence: 2, checkpointHash: 'hash-2' },
    witnessViews: [rA, rB, rC].map(receipt => ({ receipt })),
    configuredWitnesses: configs,
    threshold: 2
  });
  assert.equal(result.status, 'WITNESS_DIVERGENCE');
});

test('WIT-016 stale witness behind current head does not override two agreeing current witnesses', () => {
  const { witnesses, configs } = makeFixture();
  const rA = advanceToTwo(witnesses[0]);
  const rB = advanceToTwo(witnesses[1]);
  const rC = accept(witnesses[2], 1, 'hash-1', null);
  const result = evaluateWitnessFreshness({
    relayCheckpoint: { checkpointSequence: 2, checkpointHash: 'hash-2' },
    witnessViews: [rA, rB, rC].map(receipt => ({ receipt })),
    configuredWitnesses: configs,
    threshold: 2
  });
  assert.equal(result.status, 'WITNESS_CONFIRMED_THROUGH_N');
});

test('WIT-017 cross-binding witness/log confusion is reported as invalid witness evidence', () => {
  const { witnesses, configs } = makeFixture();
  const receipt = accept(witnesses[0], 1, 'hash-1', null);
  const confusedConfigs = configs.map(config =>
    config.witnessId === witnesses[0].witnessId
      ? { ...config, witnessLogId: witnesses[1].witnessLogId }
      : config
  );
  const result = evaluateWitnessFreshness({
    relayCheckpoint: { checkpointSequence: 1, checkpointHash: 'hash-1' },
    witnessViews: [{ receipt }],
    configuredWitnesses: confusedConfigs,
    threshold: 1
  });
  assert.equal(result.status, 'INVALID_WITNESS_RECEIPT');
});

test('WIT-018 zero reachable witnesses never falls back to trusting relay freshness', () => {
  const { configs } = makeFixture();
  const result = evaluateWitnessFreshness({
    relayCheckpoint: { checkpointSequence: 9, checkpointHash: 'relay-only-hash' },
    witnessViews: [],
    configuredWitnesses: configs,
    threshold: 2
  });
  assert.equal(result.status, 'WITNESS_QUORUM_UNAVAILABLE');
  assert.notEqual(result.status, 'WITNESS_CONFIRMED_THROUGH_N');
});
