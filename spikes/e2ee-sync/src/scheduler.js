export const RuntimeState = Object.freeze({
  RESTING: 'RESTING',
  WAKING: 'WAKING',
  SYNCING_LIGHT: 'SYNCING_LIGHT',
  PROCESSING_HEAVY: 'PROCESSING_HEAVY',
  COOLING_DOWN: 'COOLING_DOWN',
  WAITING_FOR_OS: 'WAITING_FOR_OS',
  WAITING_FOR_CONNECTIVITY: 'WAITING_FOR_CONNECTIVITY',
  BACKOFF: 'BACKOFF',
  LOW_RESOURCE: 'LOW_RESOURCE',
  PAUSED: 'PAUSED',
  UPGRADE_REQUIRED: 'UPGRADE_REQUIRED'
});

export const WorkClass = Object.freeze({
  LIGHT_SYNC: 'LIGHT_SYNC',
  SOURCE_INGEST: 'SOURCE_INGEST',
  HEAVY_LOCAL: 'HEAVY_LOCAL',
  MAINTENANCE: 'MAINTENANCE'
});

export function fullJitterBackoff({
  attempt,
  baseMs = 15_000,
  capMs = 3_600_000,
  random = Math.random
}) {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const ceiling = Math.min(capMs, baseMs * (2 ** safeAttempt));
  return {
    ceilingMs: ceiling,
    delayMs: Math.floor(Math.max(0, Math.min(0.999999999, random())) * ceiling)
  };
}

export function decideAutonomicWork({
  workClass = WorkClass.LIGHT_SYNC,
  pendingUnits = 0,
  networkAvailable = true,
  batteryLow = false,
  charging = false,
  storageLow = false,
  userInitiated = false,
  securityCritical = false,
  osBackgroundGranted = true,
  paused = false,
  schemaTooNew = false,
  consecutiveFailures = 0,
  random = Math.random
} = {}) {
  if (paused) {
    return { state: RuntimeState.PAUSED, run: false, scheduleTimer: false, reason: 'paused' };
  }

  if (schemaTooNew) {
    return { state: RuntimeState.UPGRADE_REQUIRED, run: false, scheduleTimer: false, reason: 'schema-too-new' };
  }

  if (pendingUnits <= 0) {
    return { state: RuntimeState.RESTING, run: false, scheduleTimer: false, reason: 'nothing-pending' };
  }

  if (!networkAvailable && workClass !== WorkClass.HEAVY_LOCAL) {
    return {
      state: RuntimeState.WAITING_FOR_CONNECTIVITY,
      run: false,
      scheduleTimer: false,
      reason: 'offline-wait-for-connectivity-event'
    };
  }

  const heavy = [WorkClass.SOURCE_INGEST, WorkClass.HEAVY_LOCAL, WorkClass.MAINTENANCE].includes(workClass);
  const minimumSecurityPath = securityCritical && workClass === WorkClass.LIGHT_SYNC;
  const explicitUserPath = userInitiated;

  if (storageLow && heavy && !minimumSecurityPath) {
    return { state: RuntimeState.LOW_RESOURCE, run: false, scheduleTimer: false, reason: 'storage-low' };
  }

  if (batteryLow && heavy && !charging && !explicitUserPath && !minimumSecurityPath) {
    return { state: RuntimeState.LOW_RESOURCE, run: false, scheduleTimer: false, reason: 'battery-low-defer-heavy' };
  }

  if (workClass === WorkClass.MAINTENANCE && !charging && !explicitUserPath) {
    return { state: RuntimeState.LOW_RESOURCE, run: false, scheduleTimer: false, reason: 'maintenance-prefers-charging' };
  }

  if (!osBackgroundGranted && !explicitUserPath) {
    return { state: RuntimeState.WAITING_FOR_OS, run: false, scheduleTimer: false, reason: 'background-window-not-granted' };
  }

  // Security-critical lightweight actions should not be delayed by ordinary network backoff.
  // OS/network availability still governs whether code can actually execute.
  if (minimumSecurityPath) {
    return { state: RuntimeState.SYNCING_LIGHT, run: true, scheduleTimer: false, reason: 'security-critical-light-sync' };
  }

  if (consecutiveFailures > 0 && !explicitUserPath) {
    const backoff = fullJitterBackoff({ attempt: consecutiveFailures - 1, random });
    return {
      state: RuntimeState.BACKOFF,
      run: false,
      scheduleTimer: true,
      reason: 'transient-failure-backoff',
      ...backoff
    };
  }

  if (workClass === WorkClass.LIGHT_SYNC) {
    return { state: RuntimeState.SYNCING_LIGHT, run: true, scheduleTimer: false, reason: explicitUserPath ? 'user-light-sync' : 'pending-light-sync' };
  }

  return { state: RuntimeState.PROCESSING_HEAVY, run: true, scheduleTimer: false, reason: explicitUserPath ? 'user-heavy-work' : 'conditions-allow-heavy-work' };
}

export function nextFailureCount({ current = 0, outcome }) {
  if (outcome === 'SUCCESS') return 0;
  if (outcome === 'TRANSIENT_FAILURE') return current + 1;
  return current;
}

export function expirationPlan({ lastDurableCheckpoint, inFlightUnitId = null }) {
  return {
    state: RuntimeState.COOLING_DOWN,
    stopAcceptingNewWork: true,
    resumeFromCheckpoint: lastDurableCheckpoint,
    inFlightUnitMayReplay: inFlightUnitId != null,
    rule: 'finish-only-if-safe-otherwise-replay-idempotently'
  };
}
