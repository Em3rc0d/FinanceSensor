import crypto from 'node:crypto';
import { normalizeMerchant } from '../../canonical-resolver/src/resolver.js';
import { MonthlyCloseStatus } from './monthly-coverage.js';

export const ALPHA2_SENSOR_VERSION = 'A2_SENSOR_V1';
export const ALPHA2_SENSOR_CATEGORY_VERSION = 'A2_BASE_CATEGORY_V1';
export const ALPHA2_SENSOR_RECURRENCE_VERSION = 'A2_RECURRENCE_CANDIDATE_V1';

export const SensorTruthState = Object.freeze({
  OBSERVED: 'OBSERVED',
  POSTED: 'POSTED',
  RECONCILED: 'RECONCILED',
  PARTIAL: 'PARTIAL',
  UNKNOWN: 'UNKNOWN'
});

export const BASE_CATEGORIES = Object.freeze([
  'Comida',
  'Transporte',
  'Hogar',
  'Servicios',
  'Compras',
  'Entretenimiento',
  'Suscripciones',
  'Salud',
  'Estudios',
  'Viajes',
  'Familia',
  'Mascotas',
  'Comisiones',
  'Impuestos',
  'Otros'
]);

export const SENSOR_IMPLEMENTATION_POLICY = Object.freeze({
  recurrenceMinimumOccurrences: 3,
  cadenceWindowsDays: Object.freeze({
    WEEKLY: Object.freeze([5, 9]),
    MONTHLY: Object.freeze([24, 38]),
    QUARTERLY: Object.freeze([75, 105]),
    YEARLY: Object.freeze([330, 400])
  }),
  recurringPromotionState: 'CANDIDATE_ONLY',
  recurringTruthState: SensorTruthState.OBSERVED,
  crossCurrencyAggregation: false,
  genericEvidencePercentage: false,
  llmEnabled: false,
  automatedFinancialAdvice: false
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

function deterministicId(prefix, payload) {
  return `${prefix}_${hash(stableString(payload)).slice(0, 40)}`;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(value => typeof value === 'string' && value))].sort();
}

function requireTenant(tenantId) {
  if (typeof tenantId !== 'string' || !tenantId) throw new Error('SENSOR_TENANT_REQUIRED');
  return tenantId;
}

function normalizedTruthState(value, fallback = SensorTruthState.UNKNOWN) {
  const normalized = String(value ?? '').toUpperCase();
  return Object.values(SensorTruthState).includes(normalized) ? normalized : fallback;
}

function eventId(event) {
  const id = event?.id ?? event?.canonicalEventId ?? null;
  if (typeof id !== 'string' || !id) throw new Error('SENSOR_EVENT_ID_REQUIRED');
  return id;
}

function eventTenant(event) {
  if (typeof event?.tenantId !== 'string' || !event.tenantId) throw new Error('SENSOR_EVENT_TENANT_REQUIRED');
  return event.tenantId;
}

function eventSemantic(event) {
  return String(event.semanticType ?? event.eventType ?? '').toUpperCase();
}

function eventCurrency(event) {
  const currency = String(event.currency ?? '').toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function eventAmount(event) {
  const amount = Number(event.amount);
  return Number.isFinite(amount) ? Math.abs(amount) : null;
}

function eventDate(event) {
  const value = event.occurredAt ?? event.postedAt ?? null;
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function eventTruth(event) {
  const explicit = normalizedTruthState(event.truthState ?? event.evidenceTruthState, null);
  if (explicit) return explicit;
  const reconciliation = String(event.reconciliationState ?? '').toUpperCase();
  if (reconciliation === 'RECONCILED') return SensorTruthState.RECONCILED;
  const posting = String(event.ledgerPostingState ?? '').toUpperCase();
  if (posting === 'STATEMENT_POSTED') return SensorTruthState.POSTED;
  return SensorTruthState.OBSERVED;
}

function normalizeCategoryName(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const match = BASE_CATEGORIES.find(category => category.localeCompare(raw, 'es', { sensitivity: 'base' }) === 0);
  return match ?? null;
}

export function baseCategoryObservation(event) {
  const id = eventId(event);
  const semantic = eventSemantic(event);
  const explicit = normalizeCategoryName(event.categoryName ?? event.categoryLabel ?? event.category);
  const category = explicit ?? (semantic === 'FEE' ? 'Comisiones' : null);
  if (!category) {
    return deepFreeze({
      id: deterministicId('catgap', { version: ALPHA2_SENSOR_CATEGORY_VERSION, eventId: id }),
      eventId: id,
      category: null,
      truthState: SensorTruthState.UNKNOWN,
      algorithmVersion: ALPHA2_SENSOR_CATEGORY_VERSION,
      evidenceInputs: [id],
      reason: 'CATEGORY_SIGNAL_INSUFFICIENT'
    });
  }
  return deepFreeze({
    id: deterministicId('catobs', { version: ALPHA2_SENSOR_CATEGORY_VERSION, eventId: id, category }),
    eventId: id,
    category,
    truthState: eventTruth(event),
    algorithmVersion: ALPHA2_SENSOR_CATEGORY_VERSION,
    evidenceInputs: [id],
    reason: explicit ? 'EXPLICIT_BASE_CATEGORY' : 'SEMANTIC_FEE_CATEGORY'
  });
}

function recurrenceKey(event) {
  const merchant = normalizeMerchant(event.merchantCanonical ?? event.rawMerchant ?? event.merchantName ?? '');
  const currency = eventCurrency(event);
  const semantic = eventSemantic(event);
  const scope = event.accountId ?? event.instrumentId ?? 'UNSCOPED';
  if (!merchant || !currency) return null;
  if (!['EXPENSE', 'FEE'].includes(semantic)) return null;
  if (String(event.canonicalStatus ?? 'ACTIVE').toUpperCase() !== 'ACTIVE') return null;
  return `${eventTenant(event)}|${scope}|${currency}|${semantic}|${merchant}`;
}

function cadenceForIntervals(intervals) {
  if (intervals.length < 2) return null;
  for (const [cadence, [min, max]] of Object.entries(SENSOR_IMPLEMENTATION_POLICY.cadenceWindowsDays)) {
    if (intervals.every(days => days >= min && days <= max)) return cadence;
  }
  return null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function deriveRecurringCandidates(events = []) {
  if (!Array.isArray(events)) throw new Error('SENSOR_EVENTS_ARRAY_REQUIRED');
  const groups = new Map();
  for (const event of events) {
    const id = eventId(event);
    eventTenant(event);
    const date = eventDate(event);
    const amount = eventAmount(event);
    const key = recurrenceKey(event);
    if (!key || !date || amount === null) continue;
    const row = {
      eventId: id,
      date,
      amount,
      merchantCanonical: normalizeMerchant(event.merchantCanonical ?? event.rawMerchant ?? event.merchantName ?? ''),
      currency: eventCurrency(event),
      semanticType: eventSemantic(event),
      scopeId: event.accountId ?? event.instrumentId ?? null
    };
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const candidates = [];
  for (const rows of groups.values()) {
    rows.sort((a, b) => a.date - b.date || a.eventId.localeCompare(b.eventId));
    if (rows.length < SENSOR_IMPLEMENTATION_POLICY.recurrenceMinimumOccurrences) continue;
    const uniqueDays = new Set(rows.map(row => row.date.toISOString().slice(0, 10)));
    if (uniqueDays.size < SENSOR_IMPLEMENTATION_POLICY.recurrenceMinimumOccurrences) continue;
    const intervals = [];
    for (let i = 1; i < rows.length; i += 1) {
      intervals.push((rows[i].date - rows[i - 1].date) / 86400000);
    }
    const cadence = cadenceForIntervals(intervals);
    if (!cadence) continue;
    const evidenceInputs = uniqueSorted(rows.map(row => row.eventId));
    const payload = {
      algorithmVersion: ALPHA2_SENSOR_RECURRENCE_VERSION,
      merchantCanonical: rows[0].merchantCanonical,
      currency: rows[0].currency,
      semanticType: rows[0].semanticType,
      scopeId: rows[0].scopeId,
      cadence,
      evidenceInputs
    };
    candidates.push(deepFreeze({
      id: deterministicId('rec', payload),
      state: 'CANDIDATE',
      cadence,
      merchantCanonical: rows[0].merchantCanonical,
      currency: rows[0].currency,
      semanticType: rows[0].semanticType,
      scopeId: rows[0].scopeId,
      occurrenceCount: rows.length,
      amountModel: {
        minimum: Math.min(...rows.map(row => row.amount)),
        median: median(rows.map(row => row.amount)),
        maximum: Math.max(...rows.map(row => row.amount))
      },
      truthState: SENSOR_IMPLEMENTATION_POLICY.recurringTruthState,
      algorithmVersion: ALPHA2_SENSOR_RECURRENCE_VERSION,
      evidenceInputs
    }));
  }
  return deepFreeze(candidates.sort((a, b) => a.id.localeCompare(b.id)));
}

function cashflowEffect(event) {
  const semantic = eventSemantic(event);
  const amount = eventAmount(event);
  if (amount === null) return null;
  if (semantic === 'INCOME') return { income: amount, expense: 0 };
  if (semantic === 'EXPENSE' || semantic === 'FEE') return { income: 0, expense: amount };
  return null;
}

function closeKeyFromDate(date) {
  if (!date) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function closeStatusMap(monthlyCloseEvaluations) {
  const map = new Map();
  for (const close of monthlyCloseEvaluations) {
    if (!plainObject(close)) continue;
    const year = Number(close.calendarYear);
    const month = Number(close.calendarMonth);
    if (!Number.isInteger(year) || !Number.isInteger(month)) continue;
    map.set(`${year}-${String(month).padStart(2, '0')}`, String(close.status ?? '').toUpperCase());
  }
  return map;
}

export function deriveCashflowObservations(events = [], monthlyCloseEvaluations = []) {
  if (!Array.isArray(events) || !Array.isArray(monthlyCloseEvaluations)) throw new Error('SENSOR_CASHFLOW_INPUT_ARRAY_REQUIRED');
  const closeMap = closeStatusMap(monthlyCloseEvaluations);
  const buckets = new Map();
  for (const event of events) {
    const id = eventId(event);
    const currency = eventCurrency(event);
    const date = eventDate(event);
    const effect = cashflowEffect(event);
    if (!currency || !date || !effect) continue;
    const period = closeKeyFromDate(date);
    const key = `${period}|${currency}`;
    if (!buckets.has(key)) buckets.set(key, { period, currency, income: 0, expense: 0, ids: [] });
    const bucket = buckets.get(key);
    bucket.income += effect.income;
    bucket.expense += effect.expense;
    bucket.ids.push(id);
  }

  const observations = [];
  for (const bucket of buckets.values()) {
    const closeStatus = closeMap.get(bucket.period) ?? null;
    const truthState = closeStatus === MonthlyCloseStatus.RECONCILED
      ? SensorTruthState.RECONCILED
      : SensorTruthState.PARTIAL;
    const evidenceInputs = uniqueSorted(bucket.ids);
    const payload = {
      version: ALPHA2_SENSOR_VERSION,
      period: bucket.period,
      currency: bucket.currency,
      evidenceInputs
    };
    observations.push(deepFreeze({
      id: deterministicId('cash', payload),
      period: bucket.period,
      currency: bucket.currency,
      income: Number(bucket.income.toFixed(2)),
      expense: Number(bucket.expense.toFixed(2)),
      netCashflow: Number((bucket.income - bucket.expense).toFixed(2)),
      truthState,
      algorithmVersion: ALPHA2_SENSOR_VERSION,
      evidenceInputs,
      closeStatus: closeStatus ?? 'UNKNOWN'
    }));
  }
  return deepFreeze(observations.sort((a, b) => a.period.localeCompare(b.period) || a.currency.localeCompare(b.currency)));
}

function gapFromSource(close, source) {
  const reasons = uniqueSorted(source.blockingReasons ?? []);
  if (!reasons.length) return null;
  const evidenceInputs = uniqueSorted([close.closeId, source.id, source.ownerNodeId]);
  return deepFreeze({
    id: deterministicId('gap', { version: ALPHA2_SENSOR_VERSION, closeId: close.closeId, sourceId: source.id, reasons }),
    kind: 'MONTHLY_SOURCE_GAP',
    period: `${close.calendarYear}-${String(close.calendarMonth).padStart(2, '0')}`,
    ownerNodeId: source.ownerNodeId ?? null,
    reasonCodes: reasons,
    truthState: SensorTruthState.UNKNOWN,
    algorithmVersion: ALPHA2_SENSOR_VERSION,
    evidenceInputs
  });
}

export function deriveKnowledgeGaps({ monthlyCloseEvaluations = [], categoryObservations = [] } = {}) {
  if (!Array.isArray(monthlyCloseEvaluations) || !Array.isArray(categoryObservations)) throw new Error('SENSOR_GAP_INPUT_ARRAY_REQUIRED');
  const gaps = [];
  for (const close of monthlyCloseEvaluations) {
    if (!plainObject(close)) continue;
    for (const source of close.coverage?.sources ?? []) {
      const gap = gapFromSource(close, source);
      if (gap) gaps.push(gap);
    }
  }
  for (const observation of categoryObservations) {
    if (observation.category !== null) continue;
    gaps.push(deepFreeze({
      id: deterministicId('gap', { version: ALPHA2_SENSOR_VERSION, categoryGap: observation.id }),
      kind: 'CATEGORY_UNKNOWN',
      period: null,
      ownerNodeId: null,
      reasonCodes: ['CATEGORY_SIGNAL_INSUFFICIENT'],
      truthState: SensorTruthState.UNKNOWN,
      algorithmVersion: ALPHA2_SENSOR_VERSION,
      evidenceInputs: uniqueSorted(observation.evidenceInputs ?? [])
    }));
  }
  const byId = new Map(gaps.map(gap => [gap.id, gap]));
  return deepFreeze([...byId.values()].sort((a, b) => a.id.localeCompare(b.id)));
}

function sourceClaim(tenantId, sourceInventory) {
  const sourceIds = uniqueSorted(sourceInventory.map(source => source?.sourceId ?? source?.id ?? '').filter(Boolean));
  return deepFreeze({
    id: deterministicId('claim', { version: ALPHA2_SENSOR_VERSION, tenantId, kind: 'SOURCES_DETECTED', sourceIds }),
    kind: 'SOURCES_DETECTED',
    value: sourceIds.length,
    truthState: sourceIds.length ? SensorTruthState.OBSERVED : SensorTruthState.UNKNOWN,
    algorithmVersion: ALPHA2_SENSOR_VERSION,
    evidenceInputs: sourceIds
  });
}

function reconciledMonthsClaim(tenantId, monthlyCloseEvaluations) {
  const reconciled = monthlyCloseEvaluations
    .filter(close => String(close?.status ?? '').toUpperCase() === MonthlyCloseStatus.RECONCILED)
    .map(close => close.closeId)
    .filter(Boolean);
  const evidenceInputs = uniqueSorted(reconciled);
  return deepFreeze({
    id: deterministicId('claim', { version: ALPHA2_SENSOR_VERSION, tenantId, kind: 'MONTHS_RECONCILED', evidenceInputs }),
    kind: 'MONTHS_RECONCILED',
    value: evidenceInputs.length,
    truthState: evidenceInputs.length ? SensorTruthState.RECONCILED : SensorTruthState.UNKNOWN,
    algorithmVersion: ALPHA2_SENSOR_VERSION,
    evidenceInputs
  });
}

function recurringClaim(tenantId, recurringCandidates) {
  const evidenceInputs = uniqueSorted(recurringCandidates.flatMap(candidate => candidate.evidenceInputs));
  return deepFreeze({
    id: deterministicId('claim', { version: ALPHA2_SENSOR_VERSION, tenantId, kind: 'RECURRING_OBSERVED', candidateIds: recurringCandidates.map(candidate => candidate.id) }),
    kind: 'RECURRING_OBSERVED',
    value: recurringCandidates.length,
    truthState: recurringCandidates.length ? SensorTruthState.OBSERVED : SensorTruthState.UNKNOWN,
    algorithmVersion: ALPHA2_SENSOR_VERSION,
    evidenceInputs
  });
}

export function buildSensorV1Snapshot({ tenantId, sourceInventory = [], monthlyCloseEvaluations = [], canonicalEvents = [] } = {}) {
  requireTenant(tenantId);
  if (!Array.isArray(sourceInventory) || !Array.isArray(monthlyCloseEvaluations) || !Array.isArray(canonicalEvents)) {
    throw new Error('SENSOR_INPUT_ARRAY_REQUIRED');
  }
  for (const event of canonicalEvents) {
    if (eventTenant(event) !== tenantId) throw new Error('SENSOR_EVENT_TENANT_MISMATCH');
  }

  const categoryObservations = canonicalEvents.map(baseCategoryObservation).sort((a, b) => a.id.localeCompare(b.id));
  const recurringCandidates = deriveRecurringCandidates(canonicalEvents);
  const cashflowObservations = deriveCashflowObservations(canonicalEvents, monthlyCloseEvaluations);
  const knowledgeGaps = deriveKnowledgeGaps({ monthlyCloseEvaluations, categoryObservations });
  const claims = [
    sourceClaim(tenantId, sourceInventory),
    reconciledMonthsClaim(tenantId, monthlyCloseEvaluations),
    recurringClaim(tenantId, recurringCandidates)
  ];
  const payload = {
    algorithmVersion: ALPHA2_SENSOR_VERSION,
    tenantId,
    claimIds: claims.map(claim => claim.id),
    recurringIds: recurringCandidates.map(candidate => candidate.id),
    cashflowIds: cashflowObservations.map(observation => observation.id),
    categoryIds: categoryObservations.map(observation => observation.id),
    gapIds: knowledgeGaps.map(gap => gap.id)
  };
  return deepFreeze({
    id: deterministicId('sensor', payload),
    tenantId,
    algorithmVersion: ALPHA2_SENSOR_VERSION,
    truthStates: Object.values(SensorTruthState),
    claims,
    recurringCandidates,
    cashflowObservations,
    categoryObservations,
    knowledgeGaps,
    genericEvidencePercentage: null,
    recommendations: [],
    automatedFinancialAdvice: false,
    llmUsed: false
  });
}

function requiredTx(tx, name) {
  if (typeof tx?.[name] !== 'function') throw new Error(`SENSOR_TX_SURFACE_MISSING:${name}`);
  return tx[name].bind(tx);
}

export class SensorV1Repository {
  constructor({ database, now = () => new Date().toISOString() } = {}) {
    if (!database || typeof database.transaction !== 'function') throw new Error('SENSOR_TRANSACTIONAL_DATABASE_REQUIRED');
    this.database = database;
    this.now = now;
  }

  async commitSnapshot(snapshot) {
    if (!plainObject(snapshot) || snapshot.algorithmVersion !== ALPHA2_SENSOR_VERSION) throw new Error('SENSOR_SNAPSHOT_REQUIRED');
    if (snapshot.recommendations?.length) throw new Error('SENSOR_RECOMMENDATION_FORBIDDEN');
    if (snapshot.llmUsed !== false || snapshot.automatedFinancialAdvice !== false) throw new Error('SENSOR_NON_DETERMINISTIC_OUTPUT_FORBIDDEN');
    return this.database.transaction(async tx => {
      const getReplay = requiredTx(tx, 'getSensorReplay');
      const putOutput = requiredTx(tx, 'putSensorOutput');
      const putReplay = requiredTx(tx, 'putSensorReplay');
      const replay = await getReplay(snapshot.id);
      if (replay) return deepFreeze({ snapshotId: snapshot.id, replayed: true, outputCount: replay.outputCount, committedAt: replay.committedAt });
      const outputs = [
        ...snapshot.claims,
        ...snapshot.recurringCandidates,
        ...snapshot.cashflowObservations,
        ...snapshot.categoryObservations,
        ...snapshot.knowledgeGaps
      ];
      for (const output of outputs) {
        if (!output.algorithmVersion || !Array.isArray(output.evidenceInputs) || !output.truthState) {
          throw new Error('SENSOR_OUTPUT_PROVENANCE_REQUIRED');
        }
        await putOutput(output);
      }
      const audit = deepFreeze({ snapshotId: snapshot.id, outputCount: outputs.length, committedAt: this.now() });
      await putReplay(audit);
      return deepFreeze({ snapshotId: snapshot.id, replayed: false, outputCount: outputs.length, committedAt: audit.committedAt });
    });
  }
}

export function sensorV1StaticContract() {
  return deepFreeze({
    version: ALPHA2_SENSOR_VERSION,
    categoryVersion: ALPHA2_SENSOR_CATEGORY_VERSION,
    recurrenceVersion: ALPHA2_SENSOR_RECURRENCE_VERSION,
    truthStates: Object.values(SensorTruthState),
    baseCategories: [...BASE_CATEGORIES],
    deterministicOnly: true,
    llmEnabled: false,
    automatedFinancialAdvice: false,
    genericEvidencePercentageAllowed: false,
    crossCurrencyAggregationAllowed: false,
    recurrenceCandidateOnly: true,
    recurrenceMinimumOccurrences: SENSOR_IMPLEMENTATION_POLICY.recurrenceMinimumOccurrences,
    everyOutputRequiresAlgorithmVersion: true,
    everyOutputRequiresEvidenceInputs: true,
    everyOutputRequiresTruthState: true,
    repositoryTransactional: true,
    replayIdempotent: true,
    physicalSchemaMigrationClaimed: false,
    physicalSensorPassClaimed: false,
    alpha2ProductPassClaimed: false,
    buildReady: false
  });
}
