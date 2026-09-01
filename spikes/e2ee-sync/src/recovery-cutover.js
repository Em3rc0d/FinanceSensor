import { assertPostRecoveryReadyForFutureSync } from './recovery.js';
import { validateRevocationBarrier } from './revocation.js';

// FEASIBILITY SPIKE ONLY.
// This is the load-bearing post-recovery gate. The lower-level recovery.js
// transition check proves epoch/key/device state, while this composite gate
// additionally freezes every lost device's accepted historical origin stream
// before normal future synchronization may resume.

export function assertPostRecoverySafeToResume({
  plan,
  deviceAuthorizationRecords,
  currentTenantKeyEpoch,
  activeRecoveryKeyId,
  recoveryCoverage,
  revocationBarriers
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

  let verifiedBarrierCount = 0;
  for (const expectedRevocation of plan.revokeDevices) {
    const barrier = revocationBarriers.get(expectedRevocation.deviceId);
    if (!barrier) {
      throw new Error(`post-recovery-revocation-barrier-missing:${expectedRevocation.deviceId}`);
    }

    const revokedDeviceRecord = deviceAuthorizationRecords.get(expectedRevocation.deviceId);
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

    verifiedBarrierCount += 1;
  }

  return {
    ...base,
    safeToResumeFutureSync: true,
    verifiedRevocationBarriers: verifiedBarrierCount
  };
}
