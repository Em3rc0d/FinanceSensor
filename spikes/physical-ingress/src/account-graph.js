import crypto from 'node:crypto';

export const ALPHA2_ACCOUNT_GRAPH_VERSION = 'A2_ACCOUNT_GRAPH_V1';
export const STABLE_EVIDENCE_PERIODS_REQUIRED = 2;

export const AccountMappingState = Object.freeze({
  UNMAPPED: 'UNMAPPED',
  PROBABLE: 'PROBABLE',
  USER_CONFIRMED: 'USER_CONFIRMED',
  SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE: 'SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE'
});

export const AccountNodeKind = Object.freeze({
  ACCOUNT: 'ACCOUNT',
  PAYMENT_INSTRUMENT: 'PAYMENT_INSTRUMENT'
});

const plainObject = value => value && typeof value === 'object' && !Array.isArray(value);
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');

function stableString(value) {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value);
    return encoded === undefined ? 'null' : encoded;
  }
  if (Array.isArray(value)) return `[${value.map(stableString).join(',')}]`;
  return `{${Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${stableString(value[key])}`).join(',')}}`;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function normalizeInstitution(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized) throw new Error('ACCOUNT_GRAPH_INSTITUTION_REQUIRED');
  return normalized;
}

function normalizeCurrency(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) throw new Error('ACCOUNT_GRAPH_CURRENCY_REQUIRED');
  return normalized;
}

function normalizeKind(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!Object.values(AccountNodeKind).includes(normalized)) throw new Error('ACCOUNT_GRAPH_NODE_KIND_REQUIRED');
  return normalized;
}

function normalizeMaskedHint(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).trim().replace(/\s+/g, '').toUpperCase();
  if (!normalized) return null;
  if (!/[X*•]/.test(normalized)) throw new Error('ACCOUNT_GRAPH_UNMASKED_IDENTIFIER_FORBIDDEN');
  const visible = normalized.replace(/[X*•]/g, '');
  if (!visible || visible.length > 8) throw new Error('ACCOUNT_GRAPH_MASKED_HINT_INVALID');
  return normalized.replace(/[•]/g, '*').replace(/X/g, '*');
}

function maskedHintDigest(value) {
  const normalized = normalizeMaskedHint(value);
  return normalized ? hash(`masked-hint-v1|${normalized}`) : null;
}

function validateStableDigest(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error('ACCOUNT_GRAPH_STABLE_IDENTIFIER_DIGEST_REQUIRED');
  return normalized;
}

function requireObservation(value) {
  if (!plainObject(value)) throw new Error('ACCOUNT_GRAPH_STATEMENT_OBSERVATION_REQUIRED');
  if (typeof value.tenantId !== 'string' || !value.tenantId) throw new Error('ACCOUNT_GRAPH_TENANT_REQUIRED');
  if (typeof value.statementPeriodId !== 'string' || !value.statementPeriodId) throw new Error('ACCOUNT_GRAPH_STATEMENT_PERIOD_REQUIRED');
  return {
    tenantId: value.tenantId,
    statementPeriodId: value.statementPeriodId,
    institutionCode: normalizeInstitution(value.institutionCode),
    currency: normalizeCurrency(value.currency),
    kind: normalizeKind(value.kind),
    maskedHintDigest: maskedHintDigest(value.maskedHint),
    profileStableIdentifierDigest: validateStableDigest(value.profileStableIdentifierDigest),
    profileDeclaresStableIdentifier: value.profileDeclaresStableIdentifier === true,
    productType: value.productType ? String(value.productType).trim().toUpperCase() : null
  };
}

function requireNode(value) {
  if (!plainObject(value)) throw new Error('ACCOUNT_GRAPH_NODE_REQUIRED');
  if (typeof value.id !== 'string' || !value.id) throw new Error('ACCOUNT_GRAPH_NODE_ID_REQUIRED');
  if (typeof value.tenantId !== 'string' || !value.tenantId) throw new Error('ACCOUNT_GRAPH_NODE_TENANT_REQUIRED');
  return {
    ...value,
    institutionCode: normalizeInstitution(value.institutionCode),
    currency: normalizeCurrency(value.currency),
    kind: normalizeKind(value.kind),
    maskedHintDigest: value.maskedHintDigest ? validateStableDigest(value.maskedHintDigest) : null,
    profileStableIdentifierDigest: value.profileStableIdentifierDigest ? validateStableDigest(value.profileStableIdentifierDigest) : null,
    status: value.status ?? 'ACTIVE'
  };
}

function compatibleNode(observation, node) {
  return node.status === 'ACTIVE'
    && observation.tenantId === node.tenantId
    && observation.institutionCode === node.institutionCode
    && observation.currency === node.currency
    && observation.kind === node.kind;
}

function priorPeriodCount({ observation, node, priorEvidence }) {
  const periods = new Set([observation.statementPeriodId]);
  for (const item of priorEvidence ?? []) {
    if (!plainObject(item)) continue;
    if (item.nodeId !== node.id) continue;
    if (item.tenantId !== observation.tenantId) continue;
    if (String(item.institutionCode ?? '').toUpperCase() !== observation.institutionCode) continue;
    if (String(item.currency ?? '').toUpperCase() !== observation.currency) continue;
    if (String(item.kind ?? '').toUpperCase() !== observation.kind) continue;
    if (!observation.maskedHintDigest || item.maskedHintDigest !== observation.maskedHintDigest) continue;
    if (typeof item.statementPeriodId === 'string' && item.statementPeriodId) periods.add(item.statementPeriodId);
  }
  return periods.size;
}

function mappingId(payload) {
  return `map_${hash(stableString(payload)).slice(0, 40)}`;
}

export function createAccountGraphNode({
  tenantId,
  institutionCode,
  currency,
  kind,
  productType = null,
  maskedHint = null,
  profileStableIdentifierDigest = null,
  profileDeclaresStableIdentifier = false,
  nodeId = null
} = {}) {
  if (typeof tenantId !== 'string' || !tenantId) throw new Error('ACCOUNT_GRAPH_TENANT_REQUIRED');
  const institution = normalizeInstitution(institutionCode);
  const normalizedCurrency = normalizeCurrency(currency);
  const normalizedKind = normalizeKind(kind);
  const hintDigest = maskedHintDigest(maskedHint);
  const stableDigest = validateStableDigest(profileStableIdentifierDigest);
  if (stableDigest && profileDeclaresStableIdentifier !== true) {
    throw new Error('ACCOUNT_GRAPH_PROFILE_STABLE_IDENTIFIER_AUTHORITY_REQUIRED');
  }
  const identityMaterial = stableDigest ?? hintDigest ?? hash(`unanchored|${tenantId}|${institution}|${normalizedCurrency}|${normalizedKind}|${nodeId ?? 'manual'}`);
  const id = nodeId ?? `${normalizedKind === AccountNodeKind.ACCOUNT ? 'acct' : 'pi'}_${hash(`${tenantId}|${institution}|${normalizedKind}|${identityMaterial}`).slice(0, 40)}`;
  return deepFreeze({
    id,
    tenantId,
    institutionCode: institution,
    currency: normalizedCurrency,
    kind: normalizedKind,
    productType: productType ? String(productType).trim().toUpperCase() : null,
    maskedHintDigest: hintDigest,
    profileStableIdentifierDigest: stableDigest,
    profileDeclaresStableIdentifier: profileDeclaresStableIdentifier === true,
    status: 'ACTIVE'
  });
}

export function resolveStatementOwnership({ observation, candidateNodes = [], priorEvidence = [] } = {}) {
  const current = requireObservation(observation);
  if (!Array.isArray(candidateNodes)) throw new Error('ACCOUNT_GRAPH_CANDIDATE_ARRAY_REQUIRED');
  const nodes = candidateNodes.map(requireNode);
  const compatible = nodes.filter(node => compatibleNode(current, node));

  const stableMatches = current.profileDeclaresStableIdentifier && current.profileStableIdentifierDigest
    ? compatible.filter(node => node.profileStableIdentifierDigest === current.profileStableIdentifierDigest)
    : [];

  let state = AccountMappingState.UNMAPPED;
  let ownedNodeId = null;
  let proposedNodeId = null;
  let reason = 'NO_COMPATIBLE_NODE';
  let stableEvidencePeriodCount = 0;

  if (stableMatches.length > 1) {
    reason = 'STABLE_IDENTIFIER_CONFLICT';
  } else if (stableMatches.length === 1) {
    state = AccountMappingState.SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE;
    ownedNodeId = stableMatches[0].id;
    proposedNodeId = stableMatches[0].id;
    reason = 'EXACT_PROFILE_STABLE_IDENTIFIER';
    stableEvidencePeriodCount = 1;
  } else if (current.maskedHintDigest) {
    const hintMatches = compatible.filter(node => node.maskedHintDigest === current.maskedHintDigest);
    if (hintMatches.length > 1) {
      reason = 'MASKED_HINT_AMBIGUOUS';
    } else if (hintMatches.length === 1) {
      const candidate = hintMatches[0];
      stableEvidencePeriodCount = priorPeriodCount({ observation: current, node: candidate, priorEvidence });
      proposedNodeId = candidate.id;
      if (stableEvidencePeriodCount >= STABLE_EVIDENCE_PERIODS_REQUIRED) {
        state = AccountMappingState.SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE;
        ownedNodeId = candidate.id;
        reason = 'MASKED_HINT_STABLE_ACROSS_TWO_PERIODS';
      } else {
        state = AccountMappingState.PROBABLE;
        reason = 'MASKED_HINT_SINGLE_PERIOD';
      }
    } else if (compatible.length === 1) {
      state = AccountMappingState.PROBABLE;
      proposedNodeId = compatible[0].id;
      reason = 'INSTITUTION_CURRENCY_KIND_ONLY';
    } else if (compatible.length > 1) {
      reason = 'NO_UNIQUE_HINT_MATCH';
    }
  } else if (compatible.length === 1) {
    state = AccountMappingState.PROBABLE;
    proposedNodeId = compatible[0].id;
    reason = 'INSTITUTION_CURRENCY_KIND_ONLY';
  } else if (compatible.length > 1) {
    reason = 'INSTITUTION_CURRENCY_KIND_AMBIGUOUS';
  }

  const decision = {
    version: ALPHA2_ACCOUNT_GRAPH_VERSION,
    tenantId: current.tenantId,
    statementPeriodId: current.statementPeriodId,
    state,
    ownedNodeId,
    proposedNodeId,
    reason,
    stableEvidencePeriodCount,
    automaticOwnership: state === AccountMappingState.SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE,
    bankPlusCurrencySufficient: false,
    observation: {
      institutionCode: current.institutionCode,
      currency: current.currency,
      kind: current.kind,
      productType: current.productType,
      maskedHintDigest: current.maskedHintDigest,
      hasProfileStableIdentifierDigest: Boolean(current.profileStableIdentifierDigest),
      profileDeclaresStableIdentifier: current.profileDeclaresStableIdentifier
    }
  };
  decision.mappingId = mappingId(decision);
  return deepFreeze(decision);
}

export function confirmStatementOwnershipByUser({ decision, nodeId } = {}) {
  if (!plainObject(decision) || decision.version !== ALPHA2_ACCOUNT_GRAPH_VERSION) throw new Error('ACCOUNT_GRAPH_DECISION_REQUIRED');
  if (typeof nodeId !== 'string' || !nodeId) throw new Error('ACCOUNT_GRAPH_USER_NODE_REQUIRED');
  const confirmed = {
    ...decision,
    state: AccountMappingState.USER_CONFIRMED,
    ownedNodeId: nodeId,
    proposedNodeId: nodeId,
    reason: 'USER_CONFIRMED',
    automaticOwnership: false,
    userConfirmed: true
  };
  confirmed.mappingId = mappingId({
    version: confirmed.version,
    tenantId: confirmed.tenantId,
    statementPeriodId: confirmed.statementPeriodId,
    state: confirmed.state,
    ownedNodeId: confirmed.ownedNodeId,
    reason: confirmed.reason
  });
  return deepFreeze(confirmed);
}

function operationId(kind, payload) {
  return `agop_${hash(stableString({ version: ALPHA2_ACCOUNT_GRAPH_VERSION, kind, ...payload })).slice(0, 40)}`;
}

function requiredTx(tx, name) {
  if (typeof tx?.[name] !== 'function') throw new Error(`ACCOUNT_GRAPH_TX_SURFACE_MISSING:${name}`);
  return tx[name].bind(tx);
}

export class AccountGraphRepository {
  constructor({ database, now = () => new Date().toISOString() } = {}) {
    if (!database || typeof database.transaction !== 'function') throw new Error('ACCOUNT_GRAPH_TRANSACTIONAL_DATABASE_REQUIRED');
    this.database = database;
    this.now = now;
  }

  async commitMapping({ decision } = {}) {
    if (!plainObject(decision) || decision.version !== ALPHA2_ACCOUNT_GRAPH_VERSION) throw new Error('ACCOUNT_GRAPH_DECISION_REQUIRED');
    return this.database.transaction(async tx => {
      const getReplay = requiredTx(tx, 'getAccountGraphReplay');
      const putMapping = requiredTx(tx, 'putAccountMapping');
      const putReplay = requiredTx(tx, 'putAccountGraphReplay');
      const setOwnership = requiredTx(tx, 'setStatementPeriodOwnership');
      const replay = await getReplay(decision.mappingId);
      if (replay) return deepFreeze({ ...replay, replayed: true });

      if ([AccountMappingState.USER_CONFIRMED, AccountMappingState.SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE].includes(decision.state)) {
        if (!decision.ownedNodeId) throw new Error('ACCOUNT_GRAPH_CONFIRMED_OWNER_REQUIRED');
        const node = await requiredTx(tx, 'getAccountNode')(decision.ownedNodeId);
        if (!node || node.tenantId !== decision.tenantId) throw new Error('ACCOUNT_GRAPH_OWNER_TENANT_MISMATCH');
        await setOwnership({
          tenantId: decision.tenantId,
          statementPeriodId: decision.statementPeriodId,
          nodeId: decision.ownedNodeId,
          mappingState: decision.state
        });
      }

      await putMapping(decision);
      const audit = deepFreeze({
        operationId: decision.mappingId,
        operationType: 'MAPPING_COMMIT',
        tenantId: decision.tenantId,
        statementPeriodId: decision.statementPeriodId,
        nodeId: decision.ownedNodeId ?? decision.proposedNodeId ?? null,
        state: decision.state,
        version: ALPHA2_ACCOUNT_GRAPH_VERSION,
        committedAt: this.now()
      });
      await putReplay(decision.mappingId, audit);
      return deepFreeze({ ...audit, replayed: false });
    });
  }

  async mergeNodes({ tenantId, sourceNodeId, targetNodeId, reason = 'CORRECTION' } = {}) {
    if (!tenantId || !sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) throw new Error('ACCOUNT_GRAPH_MERGE_INPUT_INVALID');
    const opId = operationId('MERGE', { tenantId, sourceNodeId, targetNodeId, reason });
    return this.database.transaction(async tx => {
      const getReplay = requiredTx(tx, 'getAccountGraphReplay');
      const putReplay = requiredTx(tx, 'putAccountGraphReplay');
      const getNode = requiredTx(tx, 'getAccountNode');
      const reassign = requiredTx(tx, 'reassignStatementPeriods');
      const markMerged = requiredTx(tx, 'markAccountNodeMerged');
      const replay = await getReplay(opId);
      if (replay) return deepFreeze({ ...replay, replayed: true });
      const source = await getNode(sourceNodeId);
      const target = await getNode(targetNodeId);
      if (!source || !target || source.tenantId !== tenantId || target.tenantId !== tenantId) throw new Error('ACCOUNT_GRAPH_MERGE_TENANT_MISMATCH');
      if (source.kind !== target.kind) throw new Error('ACCOUNT_GRAPH_MERGE_KIND_MISMATCH');
      await reassign({ tenantId, fromNodeId: sourceNodeId, toNodeId: targetNodeId });
      await markMerged({ tenantId, sourceNodeId, targetNodeId });
      const audit = deepFreeze({ operationId: opId, operationType: 'MERGE', tenantId, sourceNodeId, targetNodeId, reason, version: ALPHA2_ACCOUNT_GRAPH_VERSION, committedAt: this.now() });
      await putReplay(opId, audit);
      return deepFreeze({ ...audit, replayed: false });
    });
  }

  async splitOwnership({ tenantId, sourceNodeId, newNode, statementPeriodIds = [], reason = 'CORRECTION' } = {}) {
    if (!tenantId || !sourceNodeId || !Array.isArray(statementPeriodIds) || statementPeriodIds.length === 0) throw new Error('ACCOUNT_GRAPH_SPLIT_INPUT_INVALID');
    const normalizedNode = requireNode(newNode);
    if (normalizedNode.tenantId !== tenantId) throw new Error('ACCOUNT_GRAPH_SPLIT_TENANT_MISMATCH');
    const periodIds = [...new Set(statementPeriodIds)].sort();
    const opId = operationId('SPLIT', { tenantId, sourceNodeId, newNodeId: normalizedNode.id, statementPeriodIds: periodIds, reason });
    return this.database.transaction(async tx => {
      const getReplay = requiredTx(tx, 'getAccountGraphReplay');
      const putReplay = requiredTx(tx, 'putAccountGraphReplay');
      const getNode = requiredTx(tx, 'getAccountNode');
      const putNode = requiredTx(tx, 'putAccountNode');
      const reassignSelected = requiredTx(tx, 'reassignSelectedStatementPeriods');
      const replay = await getReplay(opId);
      if (replay) return deepFreeze({ ...replay, replayed: true });
      const source = await getNode(sourceNodeId);
      if (!source || source.tenantId !== tenantId) throw new Error('ACCOUNT_GRAPH_SPLIT_SOURCE_TENANT_MISMATCH');
      if (source.kind !== normalizedNode.kind) throw new Error('ACCOUNT_GRAPH_SPLIT_KIND_MISMATCH');
      await putNode(normalizedNode);
      await reassignSelected({ tenantId, fromNodeId: sourceNodeId, toNodeId: normalizedNode.id, statementPeriodIds: periodIds });
      const audit = deepFreeze({ operationId: opId, operationType: 'SPLIT', tenantId, sourceNodeId, newNodeId: normalizedNode.id, statementPeriodIds: periodIds, reason, version: ALPHA2_ACCOUNT_GRAPH_VERSION, committedAt: this.now() });
      await putReplay(opId, audit);
      return deepFreeze({ ...audit, replayed: false });
    });
  }
}

export function accountGraphStaticContract() {
  return deepFreeze({
    version: ALPHA2_ACCOUNT_GRAPH_VERSION,
    mappingStates: Object.values(AccountMappingState),
    nodeKinds: Object.values(AccountNodeKind),
    bankPlusCurrencySufficient: false,
    stableEvidencePeriodsRequired: STABLE_EVIDENCE_PERIODS_REQUIRED,
    exactProfileStableIdentifierCanAutoConfirm: true,
    maskedHintSinglePeriodCanAutoConfirm: false,
    maskedHintPersistsAsDigest: true,
    unmaskedIdentifierDurable: false,
    statementOwnershipRequiresConfirmedMapping: true,
    mergeSplitCorrectionAudit: true,
    mergeSplitTransactional: true,
    replayIdempotent: true,
    physicalSchemaMigrationClaimed: false,
    physicalAccountGraphPassClaimed: false,
    buildReady: false
  });
}
