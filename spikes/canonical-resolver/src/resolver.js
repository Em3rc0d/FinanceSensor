import crypto from 'node:crypto';

export const EventType = Object.freeze({
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
  INTERNAL_TRANSFER: 'INTERNAL_TRANSFER',
  EXTERNAL_TRANSFER: 'EXTERNAL_TRANSFER',
  CARD_PAYMENT: 'CARD_PAYMENT',
  REFUND: 'REFUND',
  REVERSAL: 'REVERSAL',
  FEE: 'FEE',
  UNKNOWN: 'UNKNOWN'
});

export const EffectState = Object.freeze({
  RESOLVED: 'RESOLVED',
  NEUTRAL: 'NEUTRAL',
  REQUIRES_REVIEW: 'REQUIRES_REVIEW',
  REQUIRES_LINK: 'REQUIRES_LINK',
  OFFSET: 'OFFSET'
});

const normalizeText = (value = '') => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export function normalizeMerchant(raw = '') {
  return normalizeText(raw)
    .replace(/\b(pending|pendiente|visa|mastercard|mc|pos|purchase|compra|pago)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stableEvidenceKey(evidence) {
  const immutableSourceId = evidence.sourceMessageId || evidence.sourceArtifactId;
  if (immutableSourceId) return `${evidence.sourceType}:${immutableSourceId}`;

  const payload = [
    evidence.tenantId,
    evidence.sourceType,
    evidence.sender,
    evidence.subject,
    evidence.amount,
    evidence.currency,
    evidence.occurredAt,
    evidence.rawMerchant
  ].map(v => String(v ?? '')).join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function candidateFingerprint(candidate) {
  const occurred = new Date(candidate.occurredAt);
  const bucket = Number.isNaN(occurred.getTime()) ? 'unknown' : occurred.toISOString().slice(0, 13);
  const payload = [
    candidate.tenantId,
    candidate.accountId || candidate.instrumentId || 'unknown-source',
    Number(candidate.amount).toFixed(2),
    candidate.currency,
    normalizeMerchant(candidate.merchantCanonical || candidate.rawMerchant),
    candidate.semanticType,
    bucket
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function classifyCandidate(evidence) {
  const text = normalizeText(`${evidence.subject ?? ''} ${evidence.bodySnippet ?? ''}`);

  if (/revers|anulad|voided|cancelled authorization/.test(text)) return EventType.REVERSAL;
  if (/refund|reembolso|devolucion/.test(text)) return EventType.REFUND;
  if (/comision|fee charged|cargo por comision/.test(text)) return EventType.FEE;
  if (/pago.*tarjeta|card payment|payment received.*card/.test(text)) return EventType.CARD_PAYMENT;
  if (/transferencia|transfer/.test(text)) {
    return evidence.ownAccountCounterparty === true
      ? EventType.INTERNAL_TRANSFER
      : EventType.EXTERNAL_TRANSFER;
  }
  if (/deposito|abono|salary|sueldo|ingreso recibido|payment received/.test(text) && Number(evidence.amount) > 0) {
    return EventType.INCOME;
  }
  if (/compra|purchase|consumo|charged|cargo realizado/.test(text)) return EventType.EXPENSE;

  return evidence.direction === 'IN' ? EventType.INCOME :
    evidence.direction === 'OUT' ? EventType.EXPENSE : EventType.UNKNOWN;
}

export function evidenceToCandidate(evidence) {
  const semanticType = classifyCandidate(evidence);
  const candidate = {
    tenantId: evidence.tenantId,
    evidenceIds: [stableEvidenceKey(evidence)],
    sourceTypes: [evidence.sourceType],
    accountId: evidence.accountId ?? null,
    instrumentId: evidence.instrumentId ?? null,
    amount: Math.abs(Number(evidence.amount)),
    currency: evidence.currency,
    occurredAt: evidence.occurredAt,
    rawMerchant: evidence.rawMerchant ?? null,
    merchantCanonical: normalizeMerchant(evidence.rawMerchant ?? ''),
    semanticType,
    state: 'CANDIDATE',
    confidence: evidence.confidence ?? 0.8,
    references: evidence.references ?? {}
  };
  candidate.fingerprint = candidateFingerprint(candidate);
  return candidate;
}

function compatibleSemantics(a, b) {
  if (a.semanticType === b.semanticType) return true;
  const compatible = new Set([
    `${EventType.EXPENSE}:${EventType.UNKNOWN}`,
    `${EventType.UNKNOWN}:${EventType.EXPENSE}`,
    `${EventType.REFUND}:${EventType.INCOME}`,
    `${EventType.INCOME}:${EventType.REFUND}`
  ]);
  return compatible.has(`${a.semanticType}:${b.semanticType}`);
}

function minutesApart(a, b) {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Number.POSITIVE_INFINITY;
  return Math.abs(ta - tb) / 60000;
}

const referenceKeys = ['orderId', 'receiptId', 'invoiceId', 'authorizationId', 'providerTransactionId'];

export function sharedStrongReference(a, b) {
  return referenceKeys.some(key => {
    const av = a.references?.[key];
    const bv = b.references?.[key];
    return Boolean(av && bv && av === bv);
  });
}

export function hasIndependentSources(a, b) {
  return new Set([...(a.sourceTypes ?? []), ...(b.sourceTypes ?? [])].filter(Boolean)).size > 1;
}

export function merchantsCompatibleForReview(a, b) {
  const merchantA = normalizeMerchant(a.merchantCanonical || a.rawMerchant || '');
  const merchantB = normalizeMerchant(b.merchantCanonical || b.rawMerchant || '');
  return !merchantA || !merchantB || merchantA === merchantB;
}

export function matchScore(a, b) {
  if (a.tenantId !== b.tenantId) return 0;
  if (a.currency !== b.currency) return 0;
  if (Number(a.amount).toFixed(2) !== Number(b.amount).toFixed(2)) return 0;
  if (!compatibleSemantics(a, b)) return 0;

  let score = 0.45;

  const sameAccount = a.accountId && b.accountId && a.accountId === b.accountId;
  const sameInstrument = a.instrumentId && b.instrumentId && a.instrumentId === b.instrumentId;
  if (sameAccount || sameInstrument) score += 0.15;

  const merchantA = normalizeMerchant(a.merchantCanonical || a.rawMerchant || '');
  const merchantB = normalizeMerchant(b.merchantCanonical || b.rawMerchant || '');
  if (merchantA && merchantA === merchantB) score += 0.2;

  if (sharedStrongReference(a, b)) score += 0.3;

  const delta = minutesApart(a.occurredAt, b.occurredAt);
  if (delta <= 15) score += 0.15;
  else if (delta <= 24 * 60) score += 0.08;
  else if (delta > 72 * 60) score -= 0.2;

  if (hasIndependentSources(a, b)) score += 0.05;

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

export function resolveCandidates(candidates, { autoMergeThreshold = 0.9, reviewThreshold = 0.72 } = {}) {
  const canonical = [];
  const review = [];

  for (const candidate of candidates) {
    const exactEvidenceReplay = canonical.find(item =>
      candidate.evidenceIds.some(id => item.evidenceIds.includes(id))
    );
    if (exactEvidenceReplay) continue;

    let best = null;
    let bestScore = 0;
    for (const item of canonical) {
      const score = matchScore(item, candidate);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    if (best) {
      const strongReference = sharedStrongReference(best, candidate);
      const independentSources = hasIndependentSources(best, candidate);
      const merchantCompatible = merchantsCompatibleForReview(best, candidate);

      if (strongReference && bestScore >= autoMergeThreshold) {
        best.evidenceIds = [...new Set([...best.evidenceIds, ...candidate.evidenceIds])];
        best.sourceTypes = [...new Set([...best.sourceTypes, ...candidate.sourceTypes])];
        best.confidence = Math.max(best.confidence, candidate.confidence, bestScore);
        continue;
      }

      if (independentSources && merchantCompatible && bestScore >= reviewThreshold) {
        review.push({ candidate, possibleCanonicalId: best.id, score: bestScore });
        continue;
      }
    }

    canonical.push({
      ...candidate,
      id: `evt_${crypto.randomUUID()}`,
      state: 'CANONICAL'
    });
  }

  return { canonical, review };
}

function zeroEffect(state) {
  return { income: 0, expense: 0, state };
}

function centsEqual(a, b) {
  return Math.round(Number(a) * 100) === Math.round(Number(b) * 100);
}

export function projectEconomicEffect(event, { linkedContribution = null } = {}) {
  const amount = Math.abs(Number(event.amount));

  switch (event.semanticType) {
    case EventType.EXPENSE:
    case EventType.FEE:
      return { income: 0, expense: amount, state: EffectState.RESOLVED };

    case EventType.INCOME:
      return { income: amount, expense: 0, state: EffectState.RESOLVED };

    case EventType.INTERNAL_TRANSFER:
    case EventType.CARD_PAYMENT:
      return zeroEffect(EffectState.NEUTRAL);

    case EventType.EXTERNAL_TRANSFER:
    case EventType.UNKNOWN:
      return zeroEffect(EffectState.REQUIRES_REVIEW);

    case EventType.REFUND: {
      const originalExpense = Math.abs(Number(linkedContribution?.expense ?? 0));
      if (originalExpense <= 0) return zeroEffect(EffectState.REQUIRES_LINK);
      if (amount - originalExpense > 0.005) return zeroEffect(EffectState.REQUIRES_REVIEW);
      return { income: 0, expense: -amount, state: EffectState.OFFSET };
    }

    case EventType.REVERSAL: {
      if (!linkedContribution) return zeroEffect(EffectState.REQUIRES_LINK);
      const originalIncome = Number(linkedContribution.income ?? 0);
      const originalExpense = Number(linkedContribution.expense ?? 0);
      const originalMagnitude = Math.max(Math.abs(originalIncome), Math.abs(originalExpense));
      if (originalMagnitude <= 0 || !centsEqual(originalMagnitude, amount)) {
        return zeroEffect(EffectState.REQUIRES_REVIEW);
      }
      return {
        income: -originalIncome,
        expense: -originalExpense,
        state: EffectState.OFFSET
      };
    }

    default:
      return zeroEffect(EffectState.REQUIRES_REVIEW);
  }
}

export function economicContribution(event, context = {}) {
  const effect = projectEconomicEffect(event, context);
  return { income: effect.income, expense: effect.expense };
}
