import crypto from 'node:crypto';
import { normalizeMerchant } from '../../canonical-resolver/src/resolver.js';

export const ALPHA2_RECONCILIATION_VERSION = 'A2_RECONCILIATION_V1';
export const ALPHA2_RECONCILIATION_FEATURES_VERSION = 'A2_RECONCILIATION_FEATURES_V1';

export const ReconciliationOutcome = Object.freeze({
  CONFIRMED: 'CONFIRMED',
  PROPOSED: 'PROPOSED',
  REVIEW: 'REVIEW',
  REJECTED: 'REJECTED',
  CONFLICT: 'CONFLICT'
});

export const RECONCILIATION_WEIGHTS = Object.freeze({
  amount: 30,
  timeDistance: 15,
  institution: 10,
  accountOrInstrument: 15,
  merchantOrCounterparty: 10,
  externalReference: 15,
  movementCompatibility: 5
});

export const AUTOMATIC_CONFIRMATION_POLICY = Object.freeze({
  minimumScore: 85,
  minimumMarginOverSecondCandidate: 15,
  requiresUniqueCandidate: true,
  requiresIndependentChannels: true,
  requiresAmountAndCurrency: true,
  amountOnlyAllowed: false
});

const OUTCOME_RELATION = Object.freeze({
  [ReconciliationOutcome.CONFIRMED]: 'SAME_ECONOMIC_EVENT',
  [ReconciliationOutcome.PROPOSED]: 'POSSIBLE_MATCH',
  [ReconciliationOutcome.REVIEW]: 'POSSIBLE_MATCH',
  [ReconciliationOutcome.REJECTED]: 'NO_MATCH',
  [ReconciliationOutcome.CONFLICT]: 'CONFLICT'
});

const KNOWN_SEMANTIC_FAMILIES = Object.freeze({
  EXPENSE: 'EXPENSE',
  PURCHASE: 'EXPENSE',
  FEE: 'EXPENSE',
  CASH_WITHDRAWAL: 'EXPENSE',
  SERVICE_PAYMENT: 'EXPENSE',
  INCOME: 'INCOME',
  DEPOSIT: 'INCOME',
  SALARY: 'INCOME',
  CARD_PAYMENT: 'CARD_PAYMENT',
  INTERNAL_TRANSFER: 'INTERNAL_TRANSFER',
  EXTERNAL_TRANSFER: 'EXTERNAL_TRANSFER',
  P2P_PAYMENT: 'EXTERNAL_TRANSFER',
  REFUND: 'REFUND',
  REVERSAL: 'REVERSAL'
});

const plainObject = value => value && typeof value === 'object' && !Array.isArray(value);
function stableString(value) {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value);
    return encoded === undefined ? 'null' : encoded;
  }
  if (Array.isArray(value)) return `[${value.map(stableString).join(',')}]`;
  const entries = Object.keys(value)
    .filter(key => value[key] !== undefined)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableString(value[key])}`);
  return `{${entries.join(',')}}`;
}
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const cents = value => Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) : null;

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function requireEvidence(evidence, label) {
  if (!plainObject(evidence)) throw new Error(`RECONCILIATION_${label}_EVIDENCE_REQUIRED`);
  if (typeof evidence.evidenceId !== 'string' || evidence.evidenceId.length < 1) {
    throw new Error(`RECONCILIATION_${label}_EVIDENCE_ID_REQUIRED`);
  }
  if (typeof evidence.tenantId !== 'string' || evidence.tenantId.length < 1) {
    throw new Error(`RECONCILIATION_${label}_TENANT_REQUIRED`);
  }
  return evidence;
}

function evidenceChannel(evidence) {
  if (typeof evidence.evidenceChannel === 'string' && evidence.evidenceChannel) return evidence.evidenceChannel;
  const evidenceClass = String(evidence.evidenceClass ?? '').toUpperCase();
  const sourceType = String(evidence.sourceType ?? '').toUpperCase();
  if (evidenceClass === 'BANK_STATEMENT' || sourceType.includes('STATEMENT')) return 'STATEMENT_LEDGER';
  if (['BANK_NOTIFICATION', 'PAYMENT_NOTIFICATION'].includes(evidenceClass) || sourceType.includes('GMAIL')) {
    return 'GMAIL_TRANSACTION';
  }
  if (evidenceClass === 'MERCHANT_RECEIPT') return 'MERCHANT_RECEIPT';
  if (evidenceClass === 'USER_CONFIRMATION') return 'USER_CONFIRMATION';
  return 'OTHER';
}

function semanticFamily(evidence) {
  const semantic = String(evidence.semanticType ?? evidence.movementKind ?? '').toUpperCase();
  return KNOWN_SEMANTIC_FAMILIES[semantic] ?? null;
}

function directionCompatible(left, right) {
  const a = left.direction ?? left.flowDirection ?? null;
  const b = right.direction ?? right.flowDirection ?? null;
  return !a || !b || a === b;
}

function movementCompatible(left, right) {
  const a = semanticFamily(left);
  const b = semanticFamily(right);
  return Boolean(a && b && a === b && directionCompatible(left, right));
}

function externalReference(evidence) {
  const references = evidence.references ?? {};
  return references.externalReference
    ?? references.transactionReference
    ?? references.providerTransactionId
    ?? evidence.externalReference
    ?? null;
}

function institution(evidence) {
  return evidence.institutionId ?? evidence.institutionCode ?? evidence.bankCode ?? null;
}

function strongMerchantMatch(left, right) {
  const a = normalizeMerchant(left.merchantCanonical ?? left.rawMerchant ?? left.counterpartyCanonical ?? left.counterpartyRaw ?? '');
  const b = normalizeMerchant(right.merchantCanonical ?? right.rawMerchant ?? right.counterpartyCanonical ?? right.counterpartyRaw ?? '');
  return Boolean(a && b && a === b);
}

function sameAccountOrInstrument(left, right) {
  const accountMatch = Boolean(left.accountId && right.accountId && left.accountId === right.accountId);
  const instrumentMatch = Boolean(left.instrumentId && right.instrumentId && left.instrumentId === right.instrumentId);
  return { accountMatch, instrumentMatch, match: accountMatch || instrumentMatch };
}

function knownAccountOrInstrumentConflict(left, right) {
  const accountConflict = Boolean(left.accountId && right.accountId && left.accountId !== right.accountId);
  const instrumentConflict = Boolean(left.instrumentId && right.instrumentId && left.instrumentId !== right.instrumentId);
  return accountConflict || instrumentConflict;
}

function explicitPeriodConflict(left, right) {
  const a = left.references?.statementPeriodId ?? left.statementPeriodId ?? null;
  const b = right.references?.statementPeriodId ?? right.statementPeriodId ?? null;
  return Boolean(a && b && a !== b);
}

function timeDistanceMinutes(left, right) {
  const a = Date.parse(String(left.occurredAt ?? ''));
  const b = Date.parse(String(right.occurredAt ?? ''));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.abs(a - b) / 60000;
}

function existingCanonicalId(map, evidenceId) {
  if (map instanceof Map) return map.get(evidenceId) ?? null;
  return plainObject(map) ? map[evidenceId] ?? null : null;
}

function vetoesForPair(left, right, existingCanonicalByEvidence) {
  const vetoes = [];
  if (left.evidenceId === right.evidenceId) vetoes.push('SELF_MATCH_FORBIDDEN');
  if (left.tenantId !== right.tenantId) vetoes.push('TENANT_MISMATCH');

  const leftCurrency = String(left.currency ?? '').toUpperCase();
  const rightCurrency = String(right.currency ?? '').toUpperCase();
  if (!leftCurrency || !rightCurrency || leftCurrency !== rightCurrency) vetoes.push('CURRENCY_MISMATCH');

  if (!movementCompatible(left, right)) vetoes.push('ECONOMIC_SEMANTICS_INCOMPATIBLE');
  if (evidenceChannel(left) === evidenceChannel(right)) vetoes.push('SOURCE_CHANNEL_NOT_INDEPENDENT');
  if (knownAccountOrInstrumentConflict(left, right)) vetoes.push('SCOPE_ACCOUNT_OR_INSTRUMENT_MISMATCH');
  if (explicitPeriodConflict(left, right)) vetoes.push('SCOPE_STATEMENT_PERIOD_MISMATCH');

  const leftCanonical = existingCanonicalId(existingCanonicalByEvidence, left.evidenceId);
  const rightCanonical = existingCanonicalId(existingCanonicalByEvidence, right.evidenceId);
  if (leftCanonical && rightCanonical && leftCanonical !== rightCanonical) vetoes.push('ALREADY_LINKED_CONFLICT');
  return vetoes;
}

function pairSnapshot(left, right, existingCanonicalByEvidence = {}) {
  requireEvidence(left, 'LEFT');
  requireEvidence(right, 'RIGHT');

  const leftAmount = cents(left.amount);
  const rightAmount = cents(right.amount);
  const amountMatch = leftAmount !== null && rightAmount !== null && leftAmount === rightAmount;
  const leftCurrency = String(left.currency ?? '').toUpperCase();
  const rightCurrency = String(right.currency ?? '').toUpperCase();
  const currencyMatch = Boolean(leftCurrency && rightCurrency && leftCurrency === rightCurrency);
  const distanceMinutes = timeDistanceMinutes(left, right);
  const timeExact = distanceMinutes === 0;
  const leftInstitution = institution(left);
  const rightInstitution = institution(right);
  const institutionMatch = Boolean(leftInstitution && rightInstitution && leftInstitution === rightInstitution);
  const account = sameAccountOrInstrument(left, right);
  const merchantMatch = strongMerchantMatch(left, right);
  const leftReference = externalReference(left);
  const rightReference = externalReference(right);
  const referenceMatch = Boolean(leftReference && rightReference && leftReference === rightReference);
  const semanticCompatibility = movementCompatible(left, right);
  const sourceIndependence = evidenceChannel(left) !== evidenceChannel(right);
  const vetoes = vetoesForPair(left, right, existingCanonicalByEvidence);

  const featureScores = {
    amount: amountMatch ? RECONCILIATION_WEIGHTS.amount : 0,
    timeDistance: timeExact ? RECONCILIATION_WEIGHTS.timeDistance : 0,
    institution: institutionMatch ? RECONCILIATION_WEIGHTS.institution : 0,
    accountOrInstrument: account.match ? RECONCILIATION_WEIGHTS.accountOrInstrument : 0,
    merchantOrCounterparty: merchantMatch ? RECONCILIATION_WEIGHTS.merchantOrCounterparty : 0,
    externalReference: referenceMatch ? RECONCILIATION_WEIGHTS.externalReference : 0,
    movementCompatibility: semanticCompatibility ? RECONCILIATION_WEIGHTS.movementCompatibility : 0
  };
  const score = Object.values(featureScores).reduce((sum, value) => sum + value, 0);
  const snapshotPayload = {
    resolverVersion: ALPHA2_RECONCILIATION_VERSION,
    featuresVersion: ALPHA2_RECONCILIATION_FEATURES_VERSION,
    leftEvidenceId: left.evidenceId,
    rightEvidenceId: right.evidenceId,
    amountMatch,
    currencyMatch,
    timeDistanceMinutes: distanceMinutes,
    exactTimestampMatch: timeExact,
    institutionMatch,
    accountMatch: account.accountMatch,
    instrumentMatch: account.instrumentMatch,
    merchantSimilarity: merchantMatch ? 1 : 0,
    referenceMatch,
    movementCompatibility: semanticCompatibility,
    sourceIndependence,
    featureScores,
    score,
    vetoes: [...vetoes].sort()
  };
  const snapshotId = `snap_${hash(stableString(snapshotPayload)).slice(0, 40)}`;
  return deepFreeze({ snapshotId, ...snapshotPayload });
}

function stableAnchor(snapshot) {
  return snapshot.referenceMatch === true
    || ((snapshot.accountMatch === true || snapshot.instrumentMatch === true) && snapshot.merchantSimilarity === 1);
}

function candidateEvaluation(left, right, existingCanonicalByEvidence) {
  const snapshot = pairSnapshot(left, right, existingCanonicalByEvidence);
  return deepFreeze({
    evidenceId: right.evidenceId,
    eligible: snapshot.vetoes.length === 0,
    conflict: snapshot.vetoes.includes('ALREADY_LINKED_CONFLICT'),
    score: snapshot.score,
    stableAnchor: stableAnchor(snapshot),
    snapshot
  });
}

function decisionIdFor({ leftEvidenceId, outcome, evaluations }) {
  const canonical = evaluations
    .map(item => ({
      evidenceId: item.evidenceId,
      score: item.score,
      vetoes: item.snapshot.vetoes,
      snapshotId: item.snapshot.snapshotId
    }))
    .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
  return `rec_${hash(stableString({
    version: ALPHA2_RECONCILIATION_VERSION,
    leftEvidenceId,
    outcome,
    evaluations: canonical
  })).slice(0, 40)}`;
}

export function reconcileEvidenceCandidates({ leftEvidence, candidates = [], existingCanonicalByEvidence = {} } = {}) {
  const left = requireEvidence(leftEvidence, 'LEFT');
  if (!Array.isArray(candidates)) throw new Error('RECONCILIATION_CANDIDATE_ARRAY_REQUIRED');
  const seen = new Set();
  const evaluations = candidates.map(candidate => {
    requireEvidence(candidate, 'RIGHT');
    if (seen.has(candidate.evidenceId)) throw new Error('RECONCILIATION_DUPLICATE_CANDIDATE_ID');
    seen.add(candidate.evidenceId);
    return candidateEvaluation(left, candidate, existingCanonicalByEvidence);
  }).sort((a, b) => b.score - a.score || a.evidenceId.localeCompare(b.evidenceId));

  const conflicts = evaluations.filter(item => item.conflict);
  const eligible = evaluations.filter(item => item.eligible);
  let outcome = ReconciliationOutcome.REJECTED;
  let selectedEvidenceId = null;
  let topScore = 0;
  let secondScore = 0;
  let margin = 0;
  let ambiguityCount = 0;
  let reasons = [];

  if (conflicts.length > 0) {
    outcome = ReconciliationOutcome.CONFLICT;
    reasons = ['ALREADY_LINKED_CONFLICT'];
  } else if (eligible.length === 0) {
    outcome = ReconciliationOutcome.REJECTED;
    reasons = [...new Set(evaluations.flatMap(item => item.snapshot.vetoes))].sort();
  } else {
    const top = eligible[0];
    const second = eligible[1] ?? null;
    topScore = top.score;
    secondScore = second?.score ?? 0;
    margin = second ? topScore - secondScore : 100;
    ambiguityCount = eligible.filter(item => topScore - item.score < AUTOMATIC_CONFIRMATION_POLICY.minimumMarginOverSecondCandidate).length - 1;

    const uniqueEnough = !second || margin >= AUTOMATIC_CONFIRMATION_POLICY.minimumMarginOverSecondCandidate;
    const autoConfirm = topScore >= AUTOMATIC_CONFIRMATION_POLICY.minimumScore
      && uniqueEnough
      && top.snapshot.sourceIndependence
      && top.snapshot.amountMatch
      && top.snapshot.currencyMatch
      && top.stableAnchor;

    if (autoConfirm) {
      outcome = ReconciliationOutcome.CONFIRMED;
      selectedEvidenceId = top.evidenceId;
      reasons = ['UNIQUE_STRONG_MATCH'];
    } else if (!uniqueEnough) {
      outcome = ReconciliationOutcome.REVIEW;
      reasons = ['AMBIGUOUS_SCORE_MARGIN'];
    } else if (topScore > 0) {
      outcome = ReconciliationOutcome.PROPOSED;
      selectedEvidenceId = top.evidenceId;
      reasons = [top.stableAnchor ? 'BELOW_AUTOMATIC_SCORE' : 'STABLE_ANCHOR_REQUIRED'];
    } else {
      outcome = ReconciliationOutcome.REJECTED;
      reasons = ['NO_POSITIVE_MATCH_FEATURES'];
    }
  }

  const decision = {
    resolverVersion: ALPHA2_RECONCILIATION_VERSION,
    featuresVersion: ALPHA2_RECONCILIATION_FEATURES_VERSION,
    leftEvidenceId: left.evidenceId,
    outcome,
    selectedEvidenceId,
    topScore,
    secondScore,
    margin,
    ambiguityCount: Math.max(0, ambiguityCount),
    reasons,
    evaluations
  };
  decision.decisionId = decisionIdFor(decision);
  return deepFreeze(decision);
}

function linksForDecision(decision) {
  const topScore = decision.topScore;
  let included = [];
  if (decision.outcome === ReconciliationOutcome.CONFIRMED || decision.outcome === ReconciliationOutcome.PROPOSED) {
    included = decision.evaluations.filter(item => item.evidenceId === decision.selectedEvidenceId);
  } else if (decision.outcome === ReconciliationOutcome.REVIEW) {
    included = decision.evaluations.filter(item => item.eligible && topScore - item.score < AUTOMATIC_CONFIRMATION_POLICY.minimumMarginOverSecondCandidate);
  } else if (decision.outcome === ReconciliationOutcome.CONFLICT) {
    included = decision.evaluations.filter(item => item.conflict);
  } else {
    included = decision.evaluations;
  }

  return included.map(item => deepFreeze({
    id: `link_${hash(`${ALPHA2_RECONCILIATION_VERSION}|${decision.leftEvidenceId}|${item.evidenceId}`).slice(0, 40)}`,
    leftEvidenceId: decision.leftEvidenceId,
    rightEvidenceId: item.evidenceId,
    relationType: OUTCOME_RELATION[decision.outcome],
    matchState: decision.outcome,
    matchScore: item.score,
    resolverVersion: ALPHA2_RECONCILIATION_VERSION,
    matchFeaturesVersion: ALPHA2_RECONCILIATION_FEATURES_VERSION,
    snapshotId: item.snapshot.snapshotId
  }));
}

function canonicalEventId(tenantId, evidenceIds) {
  return `evt_${hash(`${tenantId}|${[...evidenceIds].sort().join('|')}`).slice(0, 40)}`;
}

function canonicalProjection({ canonicalId, left, right }) {
  const channels = new Set([evidenceChannel(left), evidenceChannel(right)]);
  return deepFreeze({
    id: canonicalId,
    tenantId: left.tenantId,
    evidenceIds: [left.evidenceId, right.evidenceId].sort(),
    amount: Math.abs(Number(left.amount)),
    currency: String(left.currency).toUpperCase(),
    semanticType: semanticFamily(left),
    flowDirection: left.direction ?? left.flowDirection ?? right.direction ?? right.flowDirection ?? null,
    reconciliationState: 'RECONCILED',
    ledgerPostingState: channels.has('STATEMENT_LEDGER') ? 'STATEMENT_POSTED' : 'UNKNOWN',
    resolverVersion: ALPHA2_RECONCILIATION_VERSION
  });
}

function requiredTx(tx, name) {
  if (typeof tx?.[name] !== 'function') throw new Error(`RECONCILIATION_TX_SURFACE_MISSING:${name}`);
  return tx[name].bind(tx);
}

export class StatementReconciliationRepository {
  constructor({ database, now = () => new Date().toISOString() } = {}) {
    if (!database || typeof database.transaction !== 'function') throw new Error('RECONCILIATION_TRANSACTIONAL_DATABASE_REQUIRED');
    this.database = database;
    this.now = now;
  }

  async commitDecision({ decision, evidenceById } = {}) {
    if (!plainObject(decision) || decision.resolverVersion !== ALPHA2_RECONCILIATION_VERSION) {
      throw new Error('RECONCILIATION_DECISION_REQUIRED');
    }
    if (!(evidenceById instanceof Map) && !plainObject(evidenceById)) throw new Error('RECONCILIATION_EVIDENCE_LOOKUP_REQUIRED');
    const getEvidence = id => evidenceById instanceof Map ? evidenceById.get(id) : evidenceById[id];
    const left = requireEvidence(getEvidence(decision.leftEvidenceId), 'LEFT');
    const selected = decision.selectedEvidenceId ? requireEvidence(getEvidence(decision.selectedEvidenceId), 'RIGHT') : null;
    const links = linksForDecision(decision);
    const snapshots = decision.evaluations
      .filter(item => links.some(link => link.snapshotId === item.snapshot.snapshotId))
      .map(item => item.snapshot);

    return this.database.transaction(async tx => {
      const getReplay = requiredTx(tx, 'getReconciliationReplay');
      const putSnapshot = requiredTx(tx, 'putFeatureSnapshot');
      const putLink = requiredTx(tx, 'putReconciliationLink');
      const putReplay = requiredTx(tx, 'putReconciliationReplay');
      const replay = await getReplay(decision.decisionId);
      if (replay) {
        return deepFreeze({
          decisionId: decision.decisionId,
          outcome: replay.outcome,
          canonicalEventId: replay.canonicalEventId ?? null,
          replayed: true,
          duplicateCanonicalCount: 0,
          immutableAudit: true
        });
      }

      let committedCanonicalEventId = null;
      if (decision.outcome === ReconciliationOutcome.CONFIRMED) {
        if (!selected) throw new Error('RECONCILIATION_CONFIRMED_SELECTION_REQUIRED');
        const getCanonical = requiredTx(tx, 'getCanonicalEventIdByEvidence');
        const upsertCanonical = requiredTx(tx, 'upsertCanonicalEvent');
        const putCanonicalLink = requiredTx(tx, 'putEvidenceCanonicalLink');
        const leftCanonical = await getCanonical(left.evidenceId);
        const rightCanonical = await getCanonical(selected.evidenceId);
        if (leftCanonical && rightCanonical && leftCanonical !== rightCanonical) {
          throw new Error('RECONCILIATION_CANONICAL_CONFLICT');
        }
        committedCanonicalEventId = leftCanonical || rightCanonical || canonicalEventId(left.tenantId, [left.evidenceId, selected.evidenceId]);
        await upsertCanonical(canonicalProjection({ canonicalId: committedCanonicalEventId, left, right: selected }));
        await putCanonicalLink({ evidenceId: left.evidenceId, canonicalEventId: committedCanonicalEventId });
        await putCanonicalLink({ evidenceId: selected.evidenceId, canonicalEventId: committedCanonicalEventId });
      }

      for (const snapshot of snapshots) await putSnapshot(snapshot);
      for (const link of links) await putLink(link);
      const audit = deepFreeze({
        decisionId: decision.decisionId,
        resolverVersion: ALPHA2_RECONCILIATION_VERSION,
        outcome: decision.outcome,
        canonicalEventId: committedCanonicalEventId,
        candidateCount: decision.evaluations.length,
        committedAt: this.now()
      });
      await putReplay(audit);

      return deepFreeze({
        decisionId: decision.decisionId,
        outcome: decision.outcome,
        canonicalEventId: committedCanonicalEventId,
        replayed: false,
        duplicateCanonicalCount: 0,
        immutableAudit: true
      });
    });
  }
}

export function statementReconciliationStaticContract() {
  return deepFreeze({
    resolverVersion: ALPHA2_RECONCILIATION_VERSION,
    featuresVersion: ALPHA2_RECONCILIATION_FEATURES_VERSION,
    weights: { ...RECONCILIATION_WEIGHTS },
    automaticConfirmation: { ...AUTOMATIC_CONFIRMATION_POLICY },
    timeDistanceImplementation: 'EXACT_TIMESTAMP_ONLY_NO_UNFROZEN_WINDOW_ASSUMPTION',
    stableAnchors: ['EXACT_EXTERNAL_REFERENCE', 'CONFIRMED_ACCOUNT_OR_INSTRUMENT_PLUS_STRONG_MERCHANT'],
    independentChannelsRequired: true,
    amountOnlyAutoConfirmation: false,
    canonicalMergeTransactional: true,
    replayIdempotent: true,
    durableRawSourceText: false,
    physicalSchemaMigrationClaimed: false,
    physicalReconciliationPassClaimed: false,
    buildReady: false
  });
}
