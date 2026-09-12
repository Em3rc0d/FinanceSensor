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

function makeReceipt(witness, submission, observedAt) {
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
    ...receiptBody,
    signature: crypto.sign(null, Buffer.from(canonicalReceiptBody(receiptBody)), witness.privateKey).toString('base64')
  };
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

  const latest = witness.latestByLog.get(submission.witnessLogId);

  if (!latest) {
    if (submission.checkpointSequence !== 1 || submission.previousCheckpointHash !== null) {
      return { accepted: false, code: 'WITNESS_BOOTSTRAP_INVALID' };
    }
  } else {
    if (submission.checkpointSequence < latest.checkpointSequence) {
      return { accepted: false, code: 'WITNESS_ROLLBACK_REJECTED' };
    }

    if (submission.checkpointSequence === latest.checkpointSequence) {
      const retryEquivalent =
        submission.checkpointHash === latest.checkpointHash &&
        submission.previousCheckpointHash === latest.previousCheckpointHash &&
        submission.protocolVersion === latest.protocolVersion;

      if (!retryEquivalent) {
        return { accepted: false, code: 'WITNESS_FORK_REJECTED' };
      }

      return {
        accepted: true,
        code: 'RETRY_EQUIVALENT',
        receipt: makeReceipt(witness, submission, observedAt)
      };
    }

    if (submission.checkpointSequence > latest.checkpointSequence + 1) {
      return { accepted: false, code: 'WITNESS_SEQUENCE_GAP' };
    }

    if (submission.previousCheckpointHash !== latest.checkpointHash) {
      return { accepted: false, code: 'WITNESS_PARENT_MISMATCH' };
    }
  }

  const head = {
    checkpointSequence: submission.checkpointSequence,
    checkpointHash: submission.checkpointHash,
    previousCheckpointHash: submission.previousCheckpointHash,
    protocolVersion: submission.protocolVersion
  };
  witness.latestByLog.set(submission.witnessLogId, head);

  return {
    accepted: true,
    code: 'ACCEPTED',
    receipt: makeReceipt(witness, submission, observedAt)
  };
}

export function evaluateWitnessFreshness({ relayCheckpoint, witnessViews, configuredWitnesses, threshold }) {
  const valid = [];
  let configuredInvalidEvidence = false;

  for (const view of witnessViews) {
    const receipt = view.receipt;
    const config = configuredWitnesses.find(item => item.witnessId === receipt?.witnessId);
    if (!config) continue;

    if (config.witnessLogId !== receipt.witnessLogId) {
      configuredInvalidEvidence = true;
      continue;
    }

    if (!verifyWitnessReceipt(receipt, config.witnessPublicKey)) {
      configuredInvalidEvidence = true;
      continue;
    }

    valid.push(receipt);
  }

  if (configuredInvalidEvidence) {
    return {
      status: 'INVALID_WITNESS_RECEIPT',
      confirmedThrough: null,
      confirmingWitnesses: []
    };
  }

  const ahead = valid.filter(receipt => receipt.checkpointSequence > relayCheckpoint.checkpointSequence);
  if (ahead.length > 0) {
    return {
      status: 'RELAY_BEHIND_WITNESS',
      confirmedThrough: null,
      confirmingWitnesses: []
    };
  }

  const sameSequenceDivergence = valid.filter(receipt =>
    receipt.checkpointSequence === relayCheckpoint.checkpointSequence &&
    receipt.checkpointHash !== relayCheckpoint.checkpointHash
  );
  if (sameSequenceDivergence.length > 0) {
    return {
      status: 'WITNESS_DIVERGENCE',
      confirmedThrough: null,
      confirmingWitnesses: []
    };
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
