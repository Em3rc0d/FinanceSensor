const ACTIVE = 'ACTIVE';
const DELETED = 'DELETED';
const DELETING = 'DELETING';
const RESTORE_QUARANTINE = 'RESTORE_QUARANTINE';
const RESTORE_INDETERMINATE = 'RESTORE_INDETERMINATE';

export function createSyntheticTenant(id = 'tenant-synthetic-001') {
  return {
    tenantId: id,
    barrierId: `barrier-${id}`,
    state: ACTIVE,
    deviceAuthority: true,
    recoveryAuthority: true,
    tenantDecryptionAuthority: true,
    cloudEnvelopeCount: 2,
    controlMetadataCount: 3,
    witnessNamespaceActive: true
  };
}

export function snapshotPrimary(tenant) {
  return structuredClone(tenant);
}

export function beginDelete(tenant) {
  return {
    ...structuredClone(tenant),
    state: DELETING,
    deviceAuthority: false,
    recoveryAuthority: false,
    tenantDecryptionAuthority: false
  };
}

export function markDeletedInIndependentRegistry(registry, tenant, deletionEpoch = 1) {
  const next = new Map(registry);
  next.set(tenant.barrierId, {
    state: DELETED,
    deletionEpoch,
    protocolVersion: 1
  });
  return next;
}

export function completePrimaryDeletion(tenant) {
  return {
    ...structuredClone(tenant),
    state: DELETED,
    cloudEnvelopeCount: 0,
    controlMetadataCount: 0,
    witnessNamespaceActive: false
  };
}

export function restorePrimary(snapshot) {
  return {
    ...structuredClone(snapshot),
    state: RESTORE_QUARANTINE
  };
}

export function evaluateRestoredAuthority(restoredTenant, registryResult) {
  if (registryResult?.reachable !== true) {
    return {
      state: RESTORE_INDETERMINATE,
      authorize: false,
      action: 'DENY_AND_QUARANTINE'
    };
  }

  if (registryResult.record?.state === DELETED) {
    return {
      state: DELETED,
      authorize: false,
      action: 'DENY_AND_REDELETE_OR_QUARANTINE'
    };
  }

  if (registryResult.record == null) {
    return {
      state: restoredTenant.state,
      authorize: restoredTenant.deviceAuthority === true && restoredTenant.recoveryAuthority === true,
      action: 'CONTINUE_NORMAL_AUTHORIZATION_CHECKS'
    };
  }

  return {
    state: RESTORE_INDETERMINATE,
    authorize: false,
    action: 'DENY_AND_QUARANTINE'
  };
}

export function simulatePreDeleteRestore() {
  const initial = createSyntheticTenant();
  const backup = snapshotPrimary(initial);
  const deleting = beginDelete(initial);
  const registry = markDeletedInIndependentRegistry(new Map(), deleting, 7);
  const deleted = completePrimaryDeletion(deleting);
  const restored = restorePrimary(backup);
  const decision = evaluateRestoredAuthority(restored, {
    reachable: true,
    record: registry.get(restored.barrierId)
  });
  return { initial, backup, deleting, registry, deleted, restored, decision };
}

export const STATES = Object.freeze({
  ACTIVE,
  DELETED,
  DELETING,
  RESTORE_QUARANTINE,
  RESTORE_INDETERMINATE
});
