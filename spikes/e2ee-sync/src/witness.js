import crypto from 'node:crypto';

function canonicalSubmissionBody(input) {
  return JSON.stringify({
    witnessLogId: input.witnessLogId,
    checkpointSequence: input.checkpointSequence,
    checkpointHash: input.checkpointHash,
    previousCheckpointHash: input.previousCheckpointHash,
    protocolVersion: input.protocolVersion
  });
}

function canonicalReceiptBody(input) {
  return JSON.stringify({
    witnessId: input.witnessId,
    witnessLogId: input.witnessLogId,
    checkpointSequence: input.checkpointSequence,
    checkpointHash: input.checkpointHash,
    previousCheckpointHash: input.previousCheckpointHash,
    observedAt: input.observedAt,
    protocolVersion: input.protocolVersion
  });
}

export function generateEd25519Identity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return { publicKey, privateKey };
}

export function createWitness({ witnessId, signingIdentity, bindings }) {
  return {
    witnessId,
    publicKey: signingIdentity.publicKey,
    privateKey: signingIdentity.privateKey,
    bindings: new Map(bindings.map(binding => [binding.witnessLogId, binding.submissionPublicKey])),
    latestByLog: new Map()
  };
}

export function signWitnessSubmission({
  witnessLogId,
  checkpointSequence,
  checkpointHash,
  previousCheckpointHash,
  protocolVersion = 1,
  submissionPrivateKey
}) {
  const body = {
    witnessLogId,
    checkpointSequence,
    checkpointHash,
    previousCheckpointHash,
    protocolVersion
  };
  return {
    ...body,
    submissionSignature: crypto.sign(null, Buffer.from(canonicalSubmissionBody(body)), submissionPrivateKey).toString('base64')
  };
}

export function verifyWitnessSubmission(submission, submissionPublicKey) {
  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalSubmissionBody(submission)),
      submissionPublicKey,
      Buffer.from(submission.submissionSignature, 'base64')
    );
  } catch {
    return false;
  }
}

export function verifyWitnessReceipt(receipt, witnessPublicKey) {
  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalReceiptBody(receipt)),
      witnessPublicKey,
      Buffer.from(receipt.signature, 'base64')
    );
  } catch {
    return false;
  }
}

export function submitCheckpointToWitness(witness, submission, observedAt = '2026-09-01T00:00:00.000Z') {
  const submissionPublicKey = witness.bindings.get(submission.witnessLogId);
  if (!submissionPublicKey) {
    return { accepted: false, code: 'UNKNOWN_WITNESS_BINDING' };
  }
  if (!verifyWitnessSubmission(submission, submissionPublicKey)) {
    return { accepted: false, code: 'INVALID_SUBMISSION_AUTHORITY' };
  }

  // INTENTIONALLY WEAK BASELINE:
  // authenticity is checked, but monotonicity / parent continuity / rollback / fork
  // semantics are not yet enforced. The adversarial suite must make this go red.
  const head = {
    checkpointSequence: submission.checkpointSequence,
    checkpointHash: submission.checkpointHash,
    previousCheckpointHash: submission.previousCheckpointHash,
    protocolVersion: submission.protocolVersion
  };
  witness.latestByLog.set(submission.witnessLogId, head);

  const receiptBody = {
    witnessId: witness.witnessId,
    witnessLogId: submission.witnessLogId,
    checkpointSequence: submission.checkpointSequence,
    checkpointHash: submission.checkpointHash,
    previousCheckpointHash: submission.previousCheckpointHash,
    observedAt,
    protocolVersion: submission.protocolVersion
  };
  return {
    accepted: true,
    code: 'ACCEPTED',
    receipt: {
      ...receiptBody,
      signature: crypto.sign(null, Buffer.from(canonicalReceiptBody(receiptBody)), witness.privateKey).toString('base64')
    }
  };
}

export function evaluateWitnessFreshness({ relayCheckpoint, witnessViews, configuredWitnesses, threshold }) {
  const valid = [];
  for (const view of witnessViews) {
    const config = configuredWitnesses.find(item => item.witnessId === view.receipt?.witnessId);
    if (!config) continue;
    if (config.witnessLogId !== view.receipt.witnessLogId) continue;
    if (!verifyWitnessReceipt(view.receipt, config.witnessPublicKey)) continue;
    valid.push(view.receipt);
  }

  const agreeing = valid.filter(receipt =>
    receipt.checkpointSequence === relayCheckpoint.checkpointSequence &&
    receipt.checkpointHash === relayCheckpoint.checkpointHash
  );

  if (agreeing.length >= threshold) {
    return {
      status: 'WITNESS_CONFIRMED_THROUGH_N',
      confirmedThrough: relayCheckpoint.checkpointSequence,
      confirmingWitnesses: agreeing.map(receipt => receipt.witnessId)
    };
  }

  return {
    status: valid.length === 0 ? 'WITNESS_QUORUM_UNAVAILABLE' : 'FRESHNESS_UNCONFIRMED',
    confirmedThrough: null,
    confirmingWitnesses: agreeing.map(receipt => receipt.witnessId)
  };
}
