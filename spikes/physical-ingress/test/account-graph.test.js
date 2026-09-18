import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPHA2_ACCOUNT_GRAPH_VERSION,
  STABLE_EVIDENCE_PERIODS_REQUIRED,
  AccountGraphRepository,
  AccountMappingState,
  AccountNodeKind,
  accountGraphStaticContract,
  confirmStatementOwnershipByUser,
  createAccountGraphNode,
  resolveStatementOwnership
} from '../src/account-graph.js';

const digest = value => crypto.createHash('sha256').update(String(value)).digest('hex');

function observation(overrides = {}) {
  return {
    tenantId: 'tenant-synthetic',
    statementPeriodId: 'period-2026-08',
    institutionCode: 'BCP',
    currency: 'PEN',
    kind: AccountNodeKind.ACCOUNT,
    productType: 'SAVINGS',
    maskedHint: '****1234',
    ...overrides
  };
}

function accountNode(overrides = {}) {
  return createAccountGraphNode({
    tenantId: 'tenant-synthetic',
    institutionCode: 'BCP',
    currency: 'PEN',
    kind: AccountNodeKind.ACCOUNT,
    productType: 'SAVINGS',
    maskedHint: '****1234',
    nodeId: 'account-node-001',
    ...overrides
  });
}

function instrumentNode(overrides = {}) {
  return createAccountGraphNode({
    tenantId: 'tenant-synthetic',
    institutionCode: 'BCP',
    currency: 'PEN',
    kind: AccountNodeKind.PAYMENT_INSTRUMENT,
    productType: 'CREDIT_CARD',
    maskedHint: '****9876',
    nodeId: 'instrument-node-001',
    ...overrides
  });
}

function clone(value) {
  return structuredClone(value);
}

function createDatabase({ nodes = [], ownership = {}, failAt = null } = {}) {
  let state = {
    nodes: new Map(nodes.map(node => [node.id, clone(node)])),
    ownership: new Map(Object.entries(ownership)),
    mappings: new Map(),
    replays: new Map(),
    merged: new Map()
  };
  const events = [];

  function copyState(value) {
    return {
      nodes: new Map([...value.nodes].map(([k, v]) => [k, clone(v)])),
      ownership: new Map(value.ownership),
      mappings: new Map([...value.mappings].map(([k, v]) => [k, clone(v)])),
      replays: new Map([...value.replays].map(([k, v]) => [k, clone(v)])),
      merged: new Map(value.merged)
    };
  }

  const maybeFail = marker => {
    if (failAt === marker) throw new Error(`SYNTHETIC_FAILURE:${marker}`);
  };

  const database = {
    events,
    get state() { return copyState(state); },
    async transaction(callback) {
      const before = copyState(state);
      events.push('tx:begin');
      const tx = {
        async getAccountGraphReplay(operationId) {
          return state.replays.get(operationId) ?? null;
        },
        async putAccountGraphReplay(operationId, audit) {
          maybeFail('replay');
          events.push(`replay:${operationId}`);
          if (!state.replays.has(operationId)) state.replays.set(operationId, clone(audit));
        },
        async putAccountMapping(mapping) {
          maybeFail('mapping');
          events.push(`mapping:${mapping.mappingId}`);
          state.mappings.set(mapping.mappingId, clone(mapping));
        },
        async getAccountNode(nodeId) {
          return state.nodes.get(nodeId) ?? null;
        },
        async putAccountNode(node) {
          maybeFail('node');
          events.push(`node:${node.id}`);
          if (state.nodes.has(node.id)) throw new Error('SYNTHETIC_NODE_EXISTS');
          state.nodes.set(node.id, clone(node));
        },
        async setStatementPeriodOwnership({ statementPeriodId, nodeId }) {
          maybeFail('ownership');
          events.push(`ownership:${statementPeriodId}:${nodeId}`);
          state.ownership.set(statementPeriodId, nodeId);
        },
        async reassignStatementPeriods({ fromNodeId, toNodeId }) {
          maybeFail('merge-reassign');
          events.push(`merge-reassign:${fromNodeId}:${toNodeId}`);
          for (const [periodId, nodeId] of state.ownership) {
            if (nodeId === fromNodeId) state.ownership.set(periodId, toNodeId);
          }
        },
        async markAccountNodeMerged({ sourceNodeId, targetNodeId }) {
          maybeFail('merge-mark');
          events.push(`merge-mark:${sourceNodeId}:${targetNodeId}`);
          state.merged.set(sourceNodeId, targetNodeId);
          const source = state.nodes.get(sourceNodeId);
          if (source) state.nodes.set(sourceNodeId, { ...source, status: 'MERGED', mergedIntoNodeId: targetNodeId });
        },
        async reassignSelectedStatementPeriods({ fromNodeId, toNodeId, statementPeriodIds }) {
          maybeFail('split-reassign');
          events.push(`split-reassign:${fromNodeId}:${toNodeId}`);
          for (const periodId of statementPeriodIds) {
            if (state.ownership.get(periodId) !== fromNodeId) throw new Error('SYNTHETIC_SPLIT_PERIOD_NOT_OWNED');
            state.ownership.set(periodId, toNodeId);
          }
        }
      };
      try {
        const result = await callback(tx);
        events.push('tx:commit');
        return result;
      } catch (error) {
        state = before;
        events.push('tx:rollback');
        throw error;
      }
    }
  };
  return database;
}

test('static contract freezes mapping lifecycle and two-period rule without physical promotion', () => {
  const contract = accountGraphStaticContract();
  assert.equal(contract.version, ALPHA2_ACCOUNT_GRAPH_VERSION);
  assert.deepEqual(contract.mappingStates, [
    'UNMAPPED',
    'PROBABLE',
    'USER_CONFIRMED',
    'SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE'
  ]);
  assert.equal(contract.stableEvidencePeriodsRequired, 2);
  assert.equal(contract.bankPlusCurrencySufficient, false);
  assert.equal(contract.maskedHintSinglePeriodCanAutoConfirm, false);
  assert.equal(contract.unmaskedIdentifierDurable, false);
  assert.equal(contract.physicalSchemaMigrationClaimed, false);
  assert.equal(contract.physicalAccountGraphPassClaimed, false);
  assert.equal(contract.buildReady, false);
});

test('unmasked account identifiers are refused at the durable graph boundary', () => {
  assert.throws(
    () => createAccountGraphNode({
      tenantId: 'tenant-synthetic',
      institutionCode: 'BCP',
      currency: 'PEN',
      kind: AccountNodeKind.ACCOUNT,
      maskedHint: '1234567890'
    }),
    /ACCOUNT_GRAPH_UNMASKED_IDENTIFIER_FORBIDDEN/
  );
});

test('exact profile-stable identifier digest can system-confirm in one period', () => {
  const stable = digest('synthetic-stable-account-id');
  const node = accountNode({
    maskedHint: null,
    profileStableIdentifierDigest: stable,
    profileDeclaresStableIdentifier: true
  });
  const decision = resolveStatementOwnership({
    observation: observation({
      maskedHint: null,
      profileStableIdentifierDigest: stable,
      profileDeclaresStableIdentifier: true
    }),
    candidateNodes: [node]
  });
  assert.equal(decision.state, AccountMappingState.SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE);
  assert.equal(decision.ownedNodeId, node.id);
  assert.equal(decision.reason, 'EXACT_PROFILE_STABLE_IDENTIFIER');
  assert.equal(decision.automaticOwnership, true);
});

test('stable identifier digest is rejected without profile-contract authority', () => {
  assert.throws(
    () => createAccountGraphNode({
      tenantId: 'tenant-synthetic',
      institutionCode: 'BCP',
      currency: 'PEN',
      kind: AccountNodeKind.ACCOUNT,
      profileStableIdentifierDigest: digest('synthetic-stable-account-id'),
      profileDeclaresStableIdentifier: false
    }),
    /ACCOUNT_GRAPH_PROFILE_STABLE_IDENTIFIER_AUTHORITY_REQUIRED/
  );
});

test('one masked-hint period is only PROBABLE', () => {
  const node = accountNode();
  const decision = resolveStatementOwnership({ observation: observation(), candidateNodes: [node] });
  assert.equal(decision.state, AccountMappingState.PROBABLE);
  assert.equal(decision.proposedNodeId, node.id);
  assert.equal(decision.ownedNodeId, null);
  assert.equal(decision.stableEvidencePeriodCount, 1);
  assert.equal(decision.automaticOwnership, false);
});

test('same masked hint across two independent statement periods can system-confirm', () => {
  const node = accountNode();
  const first = resolveStatementOwnership({ observation: observation({ statementPeriodId: 'period-2026-07' }), candidateNodes: [node] });
  const second = resolveStatementOwnership({
    observation: observation({ statementPeriodId: 'period-2026-08' }),
    candidateNodes: [node],
    priorEvidence: [{
      nodeId: node.id,
      tenantId: 'tenant-synthetic',
      statementPeriodId: 'period-2026-07',
      institutionCode: 'BCP',
      currency: 'PEN',
      kind: AccountNodeKind.ACCOUNT,
      maskedHintDigest: first.observation.maskedHintDigest
    }]
  });
  assert.equal(STABLE_EVIDENCE_PERIODS_REQUIRED, 2);
  assert.equal(second.stableEvidencePeriodCount, 2);
  assert.equal(second.state, AccountMappingState.SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE);
  assert.equal(second.ownedNodeId, node.id);
  assert.equal(second.reason, 'MASKED_HINT_STABLE_ACROSS_TWO_PERIODS');
});

test('repeating the same statement period does not satisfy the two-period rule', () => {
  const node = accountNode();
  const current = resolveStatementOwnership({ observation: observation(), candidateNodes: [node] });
  const replay = resolveStatementOwnership({
    observation: observation(),
    candidateNodes: [node],
    priorEvidence: [{
      nodeId: node.id,
      tenantId: 'tenant-synthetic',
      statementPeriodId: 'period-2026-08',
      institutionCode: 'BCP',
      currency: 'PEN',
      kind: AccountNodeKind.ACCOUNT,
      maskedHintDigest: current.observation.maskedHintDigest
    }]
  });
  assert.equal(replay.stableEvidencePeriodCount, 1);
  assert.equal(replay.state, AccountMappingState.PROBABLE);
});

test('bank plus currency plus kind alone never creates automatic ownership', () => {
  const node = accountNode({ maskedHint: null });
  const decision = resolveStatementOwnership({
    observation: observation({ maskedHint: null }),
    candidateNodes: [node]
  });
  assert.equal(decision.state, AccountMappingState.PROBABLE);
  assert.equal(decision.reason, 'INSTITUTION_CURRENCY_KIND_ONLY');
  assert.equal(decision.ownedNodeId, null);
  assert.equal(decision.automaticOwnership, false);
  assert.equal(decision.bankPlusCurrencySufficient, false);
});

test('ambiguous masked-hint matches remain UNMAPPED', () => {
  const a = accountNode({ nodeId: 'account-A' });
  const b = accountNode({ nodeId: 'account-B' });
  const decision = resolveStatementOwnership({ observation: observation(), candidateNodes: [a, b] });
  assert.equal(decision.state, AccountMappingState.UNMAPPED);
  assert.equal(decision.ownedNodeId, null);
  assert.equal(decision.proposedNodeId, null);
  assert.equal(decision.reason, 'MASKED_HINT_AMBIGUOUS');
});

test('account observations cannot map to payment-instrument nodes', () => {
  const decision = resolveStatementOwnership({ observation: observation(), candidateNodes: [instrumentNode()] });
  assert.equal(decision.state, AccountMappingState.UNMAPPED);
  assert.equal(decision.ownedNodeId, null);
});

test('user confirmation is explicit and commits statement-period ownership', async () => {
  const node = accountNode({ maskedHint: null });
  const probable = resolveStatementOwnership({ observation: observation({ maskedHint: null }), candidateNodes: [node] });
  const confirmed = confirmStatementOwnershipByUser({ decision: probable, nodeId: node.id });
  assert.equal(confirmed.state, AccountMappingState.USER_CONFIRMED);
  assert.equal(confirmed.automaticOwnership, false);

  const database = createDatabase({ nodes: [node] });
  const repository = new AccountGraphRepository({ database, now: () => '2026-09-05T23:30:00.000Z' });
  const result = await repository.commitMapping({ decision: confirmed });
  assert.equal(result.state, AccountMappingState.USER_CONFIRMED);
  assert.equal(database.state.ownership.get('period-2026-08'), node.id);
  assert.equal(database.state.mappings.size, 1);
  assert.equal(database.state.replays.size, 1);
});

test('PROBABLE mapping persists audit but never assigns ownership', async () => {
  const node = accountNode();
  const decision = resolveStatementOwnership({ observation: observation(), candidateNodes: [node] });
  const database = createDatabase({ nodes: [node] });
  const repository = new AccountGraphRepository({ database });
  await repository.commitMapping({ decision });
  assert.equal(database.state.ownership.size, 0);
  assert.equal(database.state.mappings.size, 1);
  assert.equal(database.state.replays.size, 1);
});

test('confirmed mapping refuses cross-tenant owner at commit time', async () => {
  const otherTenantNode = accountNode({ tenantId: 'tenant-other', nodeId: 'account-other' });
  const probable = resolveStatementOwnership({ observation: observation({ maskedHint: null }), candidateNodes: [] });
  const confirmed = confirmStatementOwnershipByUser({ decision: probable, nodeId: otherTenantNode.id });
  const database = createDatabase({ nodes: [otherTenantNode] });
  const repository = new AccountGraphRepository({ database });
  await assert.rejects(repository.commitMapping({ decision: confirmed }), /ACCOUNT_GRAPH_OWNER_TENANT_MISMATCH/);
  assert.equal(database.state.ownership.size, 0);
  assert.equal(database.state.mappings.size, 0);
  assert.equal(database.state.replays.size, 0);
  assert.ok(database.events.includes('tx:rollback'));
});

test('mapping replay creates no second ownership or audit record', async () => {
  const stable = digest('stable-replay-id');
  const node = accountNode({ maskedHint: null, profileStableIdentifierDigest: stable, profileDeclaresStableIdentifier: true });
  const decision = resolveStatementOwnership({
    observation: observation({ maskedHint: null, profileStableIdentifierDigest: stable, profileDeclaresStableIdentifier: true }),
    candidateNodes: [node]
  });
  const database = createDatabase({ nodes: [node] });
  const repository = new AccountGraphRepository({ database, now: () => '2026-09-05T23:30:00.000Z' });
  const first = await repository.commitMapping({ decision });
  const second = await repository.commitMapping({ decision });
  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(database.state.ownership.size, 1);
  assert.equal(database.state.mappings.size, 1);
  assert.equal(database.state.replays.size, 1);
});

test('merge correction reassigns ownership and leaves an auditable merged node', async () => {
  const source = accountNode({ nodeId: 'account-source', maskedHint: '****1111' });
  const target = accountNode({ nodeId: 'account-target', maskedHint: '****2222' });
  const database = createDatabase({
    nodes: [source, target],
    ownership: { 'period-2026-06': source.id, 'period-2026-07': source.id, 'period-2026-08': target.id }
  });
  const repository = new AccountGraphRepository({ database, now: () => '2026-09-05T23:30:00.000Z' });
  const result = await repository.mergeNodes({ tenantId: 'tenant-synthetic', sourceNodeId: source.id, targetNodeId: target.id, reason: 'USER_CORRECTION' });
  assert.equal(result.operationType, 'MERGE');
  assert.equal(database.state.ownership.get('period-2026-06'), target.id);
  assert.equal(database.state.ownership.get('period-2026-07'), target.id);
  assert.equal(database.state.merged.get(source.id), target.id);
  assert.equal(database.state.nodes.get(source.id).status, 'MERGED');
  assert.equal(database.state.replays.size, 1);
});

test('split correction creates a new node and moves only selected statement periods', async () => {
  const source = accountNode({ nodeId: 'account-source' });
  const separated = accountNode({ nodeId: 'account-split', maskedHint: '****5678' });
  const database = createDatabase({
    nodes: [source],
    ownership: { 'period-2026-06': source.id, 'period-2026-07': source.id, 'period-2026-08': source.id }
  });
  const repository = new AccountGraphRepository({ database, now: () => '2026-09-05T23:30:00.000Z' });
  const result = await repository.splitOwnership({
    tenantId: 'tenant-synthetic',
    sourceNodeId: source.id,
    newNode: separated,
    statementPeriodIds: ['period-2026-07'],
    reason: 'USER_CORRECTION'
  });
  assert.equal(result.operationType, 'SPLIT');
  assert.equal(database.state.nodes.has(separated.id), true);
  assert.equal(database.state.ownership.get('period-2026-06'), source.id);
  assert.equal(database.state.ownership.get('period-2026-07'), separated.id);
  assert.equal(database.state.ownership.get('period-2026-08'), source.id);
  assert.equal(database.state.replays.size, 1);
});

test('merge failure rolls ownership, node status and audit back atomically', async () => {
  const source = accountNode({ nodeId: 'account-source', maskedHint: '****1111' });
  const target = accountNode({ nodeId: 'account-target', maskedHint: '****2222' });
  const database = createDatabase({ nodes: [source, target], ownership: { 'period-2026-07': source.id }, failAt: 'merge-mark' });
  const repository = new AccountGraphRepository({ database });
  await assert.rejects(
    repository.mergeNodes({ tenantId: 'tenant-synthetic', sourceNodeId: source.id, targetNodeId: target.id }),
    /SYNTHETIC_FAILURE:merge-mark/
  );
  assert.equal(database.state.ownership.get('period-2026-07'), source.id);
  assert.equal(database.state.nodes.get(source.id).status, 'ACTIVE');
  assert.equal(database.state.replays.size, 0);
  assert.ok(database.events.includes('tx:rollback'));
});
