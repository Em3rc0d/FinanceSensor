import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RuntimeState,
  WorkClass,
  decideAutonomicWork,
  expirationPlan,
  fullJitterBackoff,
  nextFailureCount
} from '../src/scheduler.js';

test('PNS-REST-001 no pending work returns to RESTING without a timer', () => {
  const decision = decideAutonomicWork({ pendingUnits: 0 });
  assert.deepEqual(decision, {
    state: RuntimeState.RESTING,
    run: false,
    scheduleTimer: false,
    reason: 'nothing-pending'
  });
});

test('PNS-REST-002 offline waits for connectivity and does not busy-poll', () => {
  const decision = decideAutonomicWork({
    workClass: WorkClass.LIGHT_SYNC,
    pendingUnits: 4,
    networkAvailable: false,
    consecutiveFailures: 9
  });

  assert.equal(decision.state, RuntimeState.WAITING_FOR_CONNECTIVITY);
  assert.equal(decision.run, false);
  assert.equal(decision.scheduleTimer, false);
});

test('PNS-REST-003 low battery defers heavy background work', () => {
  for (const workClass of [WorkClass.SOURCE_INGEST, WorkClass.HEAVY_LOCAL, WorkClass.MAINTENANCE]) {
    const decision = decideAutonomicWork({
      workClass,
      pendingUnits: 1,
      batteryLow: true,
      charging: false,
      osBackgroundGranted: true
    });
    assert.equal(decision.state, RuntimeState.LOW_RESOURCE);
    assert.equal(decision.run, false);
  }
});

test('PNS-REST-004 user-initiated light sync can proceed immediately when online', () => {
  const decision = decideAutonomicWork({
    workClass: WorkClass.LIGHT_SYNC,
    pendingUnits: 2,
    networkAvailable: true,
    batteryLow: true,
    userInitiated: true,
    osBackgroundGranted: false,
    consecutiveFailures: 5
  });

  assert.equal(decision.state, RuntimeState.SYNCING_LIGHT);
  assert.equal(decision.run, true);
  assert.equal(decision.reason, 'user-light-sync');
});

test('PNS-REST-005 security-critical light sync outranks ordinary cooldown', () => {
  const decision = decideAutonomicWork({
    workClass: WorkClass.LIGHT_SYNC,
    pendingUnits: 1,
    networkAvailable: true,
    batteryLow: true,
    securityCritical: true,
    osBackgroundGranted: true,
    consecutiveFailures: 8
  });

  assert.equal(decision.state, RuntimeState.SYNCING_LIGHT);
  assert.equal(decision.run, true);
  assert.equal(decision.reason, 'security-critical-light-sync');
});

test('security-critical path still respects lack of network', () => {
  const decision = decideAutonomicWork({
    workClass: WorkClass.LIGHT_SYNC,
    pendingUnits: 1,
    networkAvailable: false,
    securityCritical: true,
    osBackgroundGranted: true
  });

  assert.equal(decision.state, RuntimeState.WAITING_FOR_CONNECTIVITY);
  assert.equal(decision.run, false);
});

test('PNS-REST-006 exponential full-jitter backoff stays within configured cap', () => {
  const early = fullJitterBackoff({ attempt: 2, baseMs: 1000, capMs: 10_000, random: () => 0.5 });
  assert.deepEqual(early, { ceilingMs: 4000, delayMs: 2000 });

  const capped = fullJitterBackoff({ attempt: 30, baseMs: 1000, capMs: 10_000, random: () => 0.999 });
  assert.equal(capped.ceilingMs, 10_000);
  assert.ok(capped.delayMs >= 0 && capped.delayMs < 10_000);
});

test('transient failure enters BACKOFF instead of immediate retry', () => {
  const decision = decideAutonomicWork({
    workClass: WorkClass.LIGHT_SYNC,
    pendingUnits: 5,
    networkAvailable: true,
    consecutiveFailures: 3,
    random: () => 0.25
  });

  assert.equal(decision.state, RuntimeState.BACKOFF);
  assert.equal(decision.run, false);
  assert.equal(decision.scheduleTimer, true);
  assert.ok(decision.delayMs < decision.ceilingMs);
});

test('PNS-REST-007 successful work resets transient failure pressure', () => {
  assert.equal(nextFailureCount({ current: 7, outcome: 'SUCCESS' }), 0);
  assert.equal(nextFailureCount({ current: 2, outcome: 'TRANSIENT_FAILURE' }), 3);
});

test('background work waits for the OS window instead of inventing its own loop', () => {
  const decision = decideAutonomicWork({
    workClass: WorkClass.LIGHT_SYNC,
    pendingUnits: 1,
    networkAvailable: true,
    osBackgroundGranted: false,
    userInitiated: false
  });

  assert.equal(decision.state, RuntimeState.WAITING_FOR_OS);
  assert.equal(decision.run, false);
  assert.equal(decision.scheduleTimer, false);
});

test('maintenance prefers charging when not explicitly user initiated', () => {
  const decision = decideAutonomicWork({
    workClass: WorkClass.MAINTENANCE,
    pendingUnits: 1,
    networkAvailable: true,
    batteryLow: false,
    charging: false,
    osBackgroundGranted: true
  });

  assert.equal(decision.state, RuntimeState.LOW_RESOURCE);
  assert.equal(decision.reason, 'maintenance-prefers-charging');
});

test('schema too new becomes UPGRADE_REQUIRED rather than destructive best-effort processing', () => {
  const decision = decideAutonomicWork({
    pendingUnits: 1,
    schemaTooNew: true
  });

  assert.equal(decision.state, RuntimeState.UPGRADE_REQUIRED);
  assert.equal(decision.run, false);
});

test('PNS-REST-008 OS expiration returns a crash-safe cool-down plan', () => {
  const plan = expirationPlan({
    lastDurableCheckpoint: { serverSequence: 41 },
    inFlightUnitId: 'unit-42'
  });

  assert.equal(plan.state, RuntimeState.COOLING_DOWN);
  assert.equal(plan.stopAcceptingNewWork, true);
  assert.deepEqual(plan.resumeFromCheckpoint, { serverSequence: 41 });
  assert.equal(plan.inFlightUnitMayReplay, true);
});
