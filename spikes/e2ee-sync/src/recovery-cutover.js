import { assertPostRecoveryReadyForFutureSync } from './recovery.js';
import { stableJson } from './protocol.js';
import {
  assertRevokedOriginHistory,
  validateRevocationBarrier
} from './revocation.js';

// FEASIBILITY SPIKE ONLY.
// This is the load-bearing post-recovery gate. The lower-level recovery.js
// transition check proves epoch/key/device state, while this composite gate
// additionally freezes every lost device's exact recovered historical origin
// stream before normal future synchronization may resume.
//
// Important: a valid signature is not enough. A barrier must match the history
// actually recovered for that device. Multiple observed packages that express
// the same semantic cutover are retry-equivalent; multiple distinct authentic
// semantic cutovers fail closed.

function normalizeBarrierCandidates(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function barrierSemanticKey(validated) {
  return stableJson({
    tenantId: validated.tenantId,
    revokedDeviceId: validated.revokedDeviceId,
    revokedFromEpoch: validated.revokedFromEpoch,
    lastAcceptedSequence: validated.lastAcceptedSequence,
    historyCommitment: validated.historyCommitment,
    authorizingDeviceId: validated.authorizingDeviceId
  });
}

export function assertPostRecoverySafeToResume({
  plan,
  deviceAuthorizationRecords,
  currentTenantKeyEpoch,
  activeRecoveryKeyId,
  recoveryCoverage,
  revocationBarriers,
  revokedOriginHistories
}) {
  const base = assertPostRecoveryReadyForFutureSync({
    plan,
    deviceAuthorizationRecords,
    currentTenantKeyEpoch,
    activeRecoveryKeyId,
    recoveryCoverage
  });

  if (!(revocationBarriers instanceof Map)) {
    throw new Error('post-recovery-revocation-barriers-required');
  }
  if (!(revokedOriginHistories instanceof Map)) {
    throw new Error('post-recovery-revoked-origin-histories-required');
  }

  let verifiedBarrierCount = 0;
  let observedBarrierPackages = 0;

  for (const expectedRevocation of plan.revokeDevices) {
    const candidates = normalizeBarrierCandidates(
      revocationBarriers.get(expectedRevocation.deviceId)
    );
    if (candidates.length === 0) {
      throw new Error(`post-recovery-revocation-barrier-missing:${expectedRevocation.deviceId}`);
    }

    const historicalEnvelopes = revokedOriginHistories.get(expectedRevocation.deviceId);
    if (!Array.isArray(historicalEnvelopes)) {
      throw new Error(`post-recovery-revoked-origin-history-missing:${expectedRevocation.deviceId}`);
    }

    const revokedDeviceRecord = deviceAuthorizationRecords.get(expectedRevocation.deviceId);
    const semanticAuthorities = new Map();

    for (const barrier of candidates) {
      observedBarrierPackages += 1;
      const authorizerId = barrier?.header?.authorizingDeviceId;
      const authorizingDeviceRecord = deviceAuthorizationRecords.get(authorizerId);
      const validated = validateRevocationBarrier({
        barrier,
        revokedDeviceRecord,
        authorizingDeviceRecord
      });

      if (validated.tenantId !== plan.tenantId) {
        throw new Error('post-recovery-revocation-barrier-tenant-mismatch');
      }
      if (validated.revokedDeviceId !== expectedRevocation.deviceId) {
        throw new Error(`post-recovery-revocation-barrier-device-mismatch:${expectedRevocation.deviceId}`);
      }
      if (validated.revokedFromEpoch !== base.nextKeyEpoch) {
        throw new Error(`post-recovery-revocation-barrier-epoch-mismatch:${expectedRevocation.deviceId}`);
      }
      if (validated.authorizingDeviceId !== plan.activateDevice.deviceId) {
        throw new Error(`post-recovery-revocation-barrier-authorizer-mismatch:${expectedRevocation.deviceId}`);
      }

      const semanticKey = barrierSemanticKey(validated);
      if (!semanticAuthorities.has(semanticKey)) {
        semanticAuthorities.set(semanticKey, { barrier, authorizingDeviceRecord });
      }
    }

    if (semanticAuthorities.size !== 1) {
      throw new Error(`post-recovery-revocation-barrier-ambiguous:${expectedRevocation.deviceId}`);
    }

    const [{ barrier, authorizingDeviceRecord }] = semanticAuthorities.values();
    assertRevokedOriginHistory({
      barrier,
      historicalEnvelopes,
      revokedDeviceRecord,
      authorizingDeviceRecord
    });

    verifiedBarrierCount += 1;
  }

  return {
    ...base,
    safeToResumeFutureSync: true,
    verifiedRevocationBarriers: verifiedBarrierCount,
    observedRevocationBarrierPackages: observedBarrierPackages
  };
}
