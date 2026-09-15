import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATES,
  createSyntheticTenant,
  snapshotPrimary,
  beginDelete,
  markDeletedInIndependentRegistry,
  completePrimaryDeletion,
  restorePrimary,
  evaluateRestoredAuthority,
  simulatePreDeleteRestore
} from '../src/deletion-resurrection.js';

test('pre-delete primary restore cannot resurrect deleted tenant authority', () => {
  const result = simulatePreDeleteRestore();
  assert.equal(result.deleted.tenantDecryptionAuthority, false);
  assert.equal(result.deleted.deviceAuthority, false);
  assert.equal(result.deleted.recoveryAuthority, false);
  assert.equal(result.decision.authorize, false);
  assert.equal(result.decision.state, STATES.DELETED);
  assert.equal(result.decision.action, 'DENY_AND_REDELETE_OR_QUARANTINE');
});

test('registry outage fails closed instead of assuming not deleted', () => {
  const restored = restorePrimary(snapshotPrimary(createSyntheticTenant()));
  const decision = evaluateRestoredAuthority(restored, { reachable: false });
  assert.equal(decision.authorize, false);
  assert.equal(decision.state, STATES.RESTORE_INDETERMINATE);
  assert.equal(decision.action, 'DENY_AND_QUARANTINE');
});

test('unknown registry record fails closed', () => {
  const restored = restorePrimary(snapshotPrimary(createSyntheticTenant()));
  const decision = evaluateRestoredAuthority(restored, {
    reachable: true,
    record: { state: 'UNKNOWN' }
  });
  assert.equal(decision.authorize, false);
  assert.equal(decision.state, STATES.RESTORE_INDETERMINATE);
});

test('successful registry absence only permits normal authorization checks', () => {
  const restored = restorePrimary(snapshotPrimary(createSyntheticTenant()));
  const decision = evaluateRestoredAuthority(restored, {
    reachable: true,
    record: null
  });
  assert.equal(decision.authorize, true);
  assert.equal(decision.action, 'CONTINUE_NORMAL_AUTHORIZATION_CHECKS');
});

test('deletion invalidates all local authority before primary rows disappear', () => {
  const initial = createSyntheticTenant();
  const deleting = beginDelete(initial);
  assert.equal(deleting.state, STATES.DELETING);
  assert.equal(deleting.deviceAuthority, false);
  assert.equal(deleting.recoveryAuthority, false);
  assert.equal(deleting.tenantDecryptionAuthority, false);

  const registry = markDeletedInIndependentRegistry(new Map(), deleting, 3);
  assert.equal(registry.get(initial.barrierId).state, STATES.DELETED);

  const deleted = completePrimaryDeletion(deleting);
  assert.equal(deleted.cloudEnvelopeCount, 0);
  assert.equal(deleted.controlMetadataCount, 0);
  assert.equal(deleted.witnessNamespaceActive, false);
});
