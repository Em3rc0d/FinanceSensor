import crypto from 'node:crypto';

export const ALPHA2_MONTHLY_COVERAGE_VERSION = 'A2_MONTHLY_COVERAGE_V1';

export const MonthlyCloseStatus = Object.freeze({
  OPEN_LIVE: 'OPEN_LIVE',
  WAITING_FOR_STATEMENTS: 'WAITING_FOR_STATEMENTS',
  IMPORTING: 'IMPORTING',
  RECONCILING: 'RECONCILING',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  RECONCILED: 'RECONCILED',
  REOPENED: 'REOPENED'
});

export const ExpectedSourceState = Object.freeze({
  EXPECTED: 'EXPECTED',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
  USER_EXCLUDED: 'USER_EXCLUDED',
  UNKNOWN: 'UNKNOWN'
});

export const CoverageScopeState = Object.freeze({
  INCLUDED: 'INCLUDED',
  USER_EXCLUDED: 'USER_EXCLUDED',
  NOT_AVAILABLE: 'NOT_AVAILABLE'
});

export const StatementCoverageState = Object.freeze({
  NONE: 'NONE',
  RECEIVED: 'RECEIVED',
  PARSED_PARTIAL: 'PARSED_PARTIAL',
  PARSED: 'PARSED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED'
});

export const DirectionCoverageState = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  OBSERVED: 'OBSERVED',
  PARTIAL: 'PARTIAL',
  COVERED: 'COVERED'
});

export const InflowCoverageState = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  PARTIAL: 'PARTIAL',
  COVERED: 'COVERED'
});

export const OutflowCoverageState = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  OBSERVED: 'OBSERVED',
  PARTIAL: 'PARTIAL',
  COVERED: 'COVERED'
});

export const PeriodCoverageState = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  PARTIAL: 'PARTIAL',
  COVERED: 'COVERED'
});

export const AccountReconciliationState = Object.freeze({
  NOT_STARTED: 'NOT_STARTED',
  PARTIAL: 'PARTIAL',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  RECONCILED: 'RECONCILED'
});

export const CloseActivity = Object.freeze({
  IDLE: 'IDLE',
  IMPORTING: 'IMPORTING',
  RECONCILING: 'RECONCILING'
});

export const ReopenSignal = Object.freeze({
  LATE_EVIDENCE: 'LATE_EVIDENCE',
  PARSER_REPROCESSING: 'PARSER_REPROCESSING',
  ACCOUNT_MAPPING_CORRECTION: 'ACCOUNT_MAPPING_CORRECTION',
  SOURCE_SCOPE_CHANGED: 'SOURCE_SCOPE_CHANGED'
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

function enumValue(value, allowed, code) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!Object.values(allowed).includes(normalized)) throw new Error(code);
  return normalized;
}

function normalizeRequiredDirections(value) {
  if (!Array.isArray(value)) throw new Error('MONTHLY_COVERAGE_REQUIRED_DIRECTIONS_REQUIRED');
  const directions = [...new Set(value.map(item => String(item).trim().toUpperCase()))].sort();
  if (directions.length === 0 || directions.some(item => !['INFLOW', 'OUTFLOW'].includes(item))) {
    throw new Error('MONTHLY_COVERAGE_REQUIRED_DIRECTIONS_INVALID');
  }
  return directions;
}

function requireCoverage(value) {
  if (!plainObject(value)) throw new Error('MONTHLY_COVERAGE_ACCOUNT_PERIOD_REQUIRED');
  for (const field of ['id', 'tenantId', 'ownerNodeId', 'periodStart', 'periodEnd']) {
    if (typeof value[field] !== 'string' || !value[field]) throw new Error(`MONTHLY_COVERAGE_${field.toUpperCase()}_REQUIRED`);
  }
  const periodStart = Date.parse(value.periodStart);
  const periodEnd = Date.parse(value.periodEnd);
  if (!Number.isFinite(periodStart) || !Number.isFinite(periodEnd) || periodEnd < periodStart) {
    throw new Error('MONTHLY_COVERAGE_PERIOD_INVALID');
  }
  const unresolvedCount = Number(value.unresolvedCount ?? 0);
  const blockingConflictCount = Number(value.blockingConflictCount ?? 0);
  if (!Number.isInteger(unresolvedCount) || unresolvedCount < 0) throw new Error('MONTHLY_COVERAGE_UNRESOLVED_COUNT_INVALID');
  if (!Number.isInteger(blockingConflictCount) || blockingConflictCount < 0) throw new Error('MONTHLY_COVERAGE_BLOCKING_CONFLICT_COUNT_INVALID');
  return {
    id: value.id,
    tenantId: value.tenantId,
    ownerNodeId: value.ownerNodeId,
    periodStart: new Date(periodStart).toISOString(),
    periodEnd: new Date(periodEnd).toISOString(),
    expectedSourceState: enumValue(value.expectedSourceState, ExpectedSourceState, 'MONTHLY_COVERAGE_EXPECTED_SOURCE_STATE_INVALID'),
    scopeState: enumValue(value.scopeState, CoverageScopeState, 'MONTHLY_COVERAGE_SCOPE_STATE_INVALID'),
    statementState: enumValue(value.statementState, StatementCoverageState, 'MONTHLY_COVERAGE_STATEMENT_STATE_INVALID'),
    inflowCoverageState: enumValue(value.inflowCoverageState, InflowCoverageState, 'MONTHLY_COVERAGE_INFLOW_STATE_INVALID'),
    outflowCoverageState: enumValue(value.outflowCoverageState, OutflowCoverageState, 'MONTHLY_COVERAGE_OUTFLOW_STATE_INVALID'),
    periodCoverageState: enumValue(value.periodCoverageState, PeriodCoverageState, 'MONTHLY_COVERAGE_PERIOD_STATE_INVALID'),
    reconciliationState: enumValue(value.reconciliationState, AccountReconciliationState, 'MONTHLY_COVERAGE_RECONCILIATION_STATE_INVALID'),
    requiredDirections: normalizeRequiredDirections(value.requiredDirections),
    unresolvedCount,
    blockingConflictCount,
    statementPeriodId: typeof value.statementPeriodId === 'string' && value.statementPeriodId ? value.statementPeriodId : null
  };
}

function scopeCoherent(coverage) {
  if (coverage.scopeState === CoverageScopeState.USER_EXCLUDED) {
    return coverage.expectedSourceState === ExpectedSourceState.USER_EXCLUDED;
  }
  if (coverage.scopeState === CoverageScopeState.NOT_AVAILABLE) {
    return coverage.expectedSourceState === ExpectedSourceState.NOT_AVAILABLE;
  }
  return coverage.scopeState === CoverageScopeState.INCLUDED;
}

function directionCovered(coverage, direction) {
  if (direction === 'INFLOW') return coverage.inflowCoverageState === InflowCoverageState.COVERED;
  if (direction === 'OUTFLOW') return coverage.outflowCoverageState === OutflowCoverageState.COVERED;
  return false;
}

function includedBlockingReasons(coverage) {
  const reasons = [];
  if (!scopeCoherent(coverage)) reasons.push('SCOPE_DISPOSITION_CONFLICT');
  if (coverage.scopeState !== CoverageScopeState.INCLUDED) return reasons;
  if (coverage.expectedSourceState === ExpectedSourceState.UNKNOWN) reasons.push('EXPECTED_SOURCE_DISPOSITION_UNKNOWN');
  if (coverage.expectedSourceState !== ExpectedSourceState.EXPECTED) reasons.push('INCLUDED_SOURCE_NOT_EXPECTED');
  if (coverage.statementState === StatementCoverageState.NONE) reasons.push('MISSING_EXPECTED_STATEMENT');
  if (coverage.statementState === StatementCoverageState.REVIEW_REQUIRED) reasons.push('STATEMENT_REVIEW_REQUIRED');
  if ([StatementCoverageState.RECEIVED, StatementCoverageState.PARSED_PARTIAL].includes(coverage.statementState)) reasons.push('STATEMENT_NOT_FULLY_PARSED');
  if (coverage.periodCoverageState !== PeriodCoverageState.COVERED) reasons.push('STATEMENT_PERIOD_NOT_COVERED');
  for (const direction of coverage.requiredDirections) {
    if (!directionCovered(coverage, direction)) reasons.push(`${direction}_NOT_COVERED`);
  }
  if (coverage.reconciliationState === AccountReconciliationState.REVIEW_REQUIRED) reasons.push('RECONCILIATION_REVIEW_REQUIRED');
  if (coverage.reconciliationState !== AccountReconciliationState.RECONCILED) reasons.push('RECONCILIATION_NOT_COMPLETE');
  if (coverage.unresolvedCount > 0) reasons.push('UNRESOLVED_ITEMS');
  if (coverage.blockingConflictCount > 0) reasons.push('BLOCKING_CONFLICT');
  return [...new Set(reasons)].sort();
}

function coverageProjection(coverage) {
  const reasons = includedBlockingReasons(coverage);
  return deepFreeze({
    id: coverage.id,
    ownerNodeId: coverage.ownerNodeId,
    scopeState: coverage.scopeState,
    expectedSourceState: coverage.expectedSourceState,
    statementState: coverage.statementState,
    inflowCoverageState: coverage.inflowCoverageState,
    outflowCoverageState: coverage.outflowCoverageState,
    periodCoverageState: coverage.periodCoverageState,
    reconciliationState: coverage.reconciliationState,
    requiredDirections: coverage.requiredDirections,
    unresolvedCount: coverage.unresolvedCount,
    blockingConflictCount: coverage.blockingConflictCount,
    readyForClose: coverage.scopeState === CoverageScopeState.INCLUDED && reasons.length === 0,
    blockingReasons: reasons
  });
}

function closeIdentity({ tenantId, calendarYear, calendarMonth, closeScopeVersion }) {
  return `close_${hash(`${tenantId}|${calendarYear}|${calendarMonth}|${closeScopeVersion}`).slice(0, 40)}`;
}

function evaluationIdentity(payload) {
  return `close_eval_${hash(stableString(payload)).slice(0, 40)}`;
}

export function evaluateMonthlyClose({
  tenantId,
  calendarYear,
  calendarMonth,
  closeScopeVersion = 'A2_CLOSE_SCOPE_V1',
  coverages = [],
  previousStatus = MonthlyCloseStatus.OPEN_LIVE,
  closeRequested = false,
  activity = CloseActivity.IDLE,
  reopenSignal = null
} = {}) {
  if (typeof tenantId !== 'string' || !tenantId) throw new Error('MONTHLY_CLOSE_TENANT_REQUIRED');
  if (!Number.isInteger(calendarYear) || calendarYear < 2000 || calendarYear > 2200) throw new Error('MONTHLY_CLOSE_YEAR_INVALID');
  if (!Number.isInteger(calendarMonth) || calendarMonth < 1 || calendarMonth > 12) throw new Error('MONTHLY_CLOSE_MONTH_INVALID');
  if (typeof closeScopeVersion !== 'string' || !closeScopeVersion) throw new Error('MONTHLY_CLOSE_SCOPE_VERSION_REQUIRED');
  if (!Array.isArray(coverages)) throw new Error('MONTHLY_CLOSE_COVERAGE_ARRAY_REQUIRED');
  const normalizedPrevious = enumValue(previousStatus, MonthlyCloseStatus, 'MONTHLY_CLOSE_PREVIOUS_STATUS_INVALID');
  const normalizedActivity = enumValue(activity, CloseActivity, 'MONTHLY_CLOSE_ACTIVITY_INVALID');
  const normalizedReopen = reopenSignal === null ? null : enumValue(reopenSignal, ReopenSignal, 'MONTHLY_CLOSE_REOPEN_SIGNAL_INVALID');
  const normalized = coverages.map(requireCoverage);
  if (normalized.some(item => item.tenantId !== tenantId)) throw new Error('MONTHLY_CLOSE_COVERAGE_TENANT_MISMATCH');
  const duplicateIds = normalized.map(item => item.id).filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicateIds.length > 0) throw new Error('MONTHLY_CLOSE_DUPLICATE_COVERAGE_ID');

  const projections = normalized.map(coverageProjection).sort((a, b) => a.id.localeCompare(b.id));
  const included = projections.filter(item => item.scopeState === CoverageScopeState.INCLUDED);
  const excluded = projections.filter(item => item.scopeState === CoverageScopeState.USER_EXCLUDED);
  const unavailable = projections.filter(item => item.scopeState === CoverageScopeState.NOT_AVAILABLE);
  const allBlockingReasons = included.flatMap(item => item.blockingReasons);
  const blockingReasons = [...new Set(allBlockingReasons)].sort();
  const missingStatements = included.filter(item => item.blockingReasons.includes('MISSING_EXPECTED_STATEMENT')).length;
  const blockingConflictCount = included.reduce((sum, item) => sum + item.blockingConflictCount, 0);
  const unresolvedCount = included.reduce((sum, item) => sum + item.unresolvedCount, 0);
  const allIncludedReady = included.length > 0 && included.every(item => item.readyForClose);

  let status = MonthlyCloseStatus.OPEN_LIVE;
  let reason = 'MONTH_LIVE';
  if (normalizedPrevious === MonthlyCloseStatus.RECONCILED && normalizedReopen) {
    status = MonthlyCloseStatus.REOPENED;
    reason = normalizedReopen;
  } else if (!closeRequested && normalizedPrevious === MonthlyCloseStatus.OPEN_LIVE) {
    status = MonthlyCloseStatus.OPEN_LIVE;
    reason = 'CLOSE_NOT_REQUESTED';
  } else if (normalizedActivity === CloseActivity.IMPORTING) {
    status = MonthlyCloseStatus.IMPORTING;
    reason = 'IMPORT_IN_PROGRESS';
  } else if (normalizedActivity === CloseActivity.RECONCILING) {
    status = MonthlyCloseStatus.RECONCILING;
    reason = 'RECONCILIATION_IN_PROGRESS';
  } else if (included.length === 0) {
    status = MonthlyCloseStatus.REVIEW_REQUIRED;
    reason = 'NO_INCLUDED_SOURCES';
  } else if (blockingConflictCount > 0 || unresolvedCount > 0 || blockingReasons.some(item => item.includes('REVIEW_REQUIRED') || item === 'SCOPE_DISPOSITION_CONFLICT' || item === 'EXPECTED_SOURCE_DISPOSITION_UNKNOWN')) {
    status = MonthlyCloseStatus.REVIEW_REQUIRED;
    reason = blockingConflictCount > 0 ? 'BLOCKING_CONFLICT' : unresolvedCount > 0 ? 'UNRESOLVED_ITEMS' : 'SCOPE_OR_REVIEW_REQUIRED';
  } else if (missingStatements > 0) {
    status = MonthlyCloseStatus.WAITING_FOR_STATEMENTS;
    reason = 'MISSING_EXPECTED_STATEMENT';
  } else if (allIncludedReady) {
    status = MonthlyCloseStatus.RECONCILED;
    reason = 'ALL_INCLUDED_SOURCES_RECONCILED';
  } else {
    status = MonthlyCloseStatus.RECONCILING;
    reason = 'COVERAGE_INCOMPLETE';
  }

  const closeId = closeIdentity({ tenantId, calendarYear, calendarMonth, closeScopeVersion });
  const result = {
    version: ALPHA2_MONTHLY_COVERAGE_VERSION,
    closeId,
    tenantId,
    calendarYear,
    calendarMonth,
    closeScopeVersion,
    previousStatus: normalizedPrevious,
    status,
    reason,
    closeRequested: Boolean(closeRequested),
    activity: normalizedActivity,
    reopenSignal: normalizedReopen,
    coverage: {
      includedCount: included.length,
      reconciledIncludedCount: included.filter(item => item.readyForClose).length,
      userExcludedCount: excluded.length,
      notAvailableCount: unavailable.length,
      missingStatementCount: missingStatements,
      unresolvedCount,
      blockingConflictCount,
      globalUnqualifiedPercentage: null,
      allIncludedExpectedSourcesCovered: allIncludedReady,
      zeroBlockingConflicts: blockingConflictCount === 0,
      sources: projections
    }
  };
  result.evaluationId = evaluationIdentity({
    version: result.version,
    closeId: result.closeId,
    previousStatus: result.previousStatus,
    status: result.status,
    reason: result.reason,
    closeRequested: result.closeRequested,
    activity: result.activity,
    reopenSignal: result.reopenSignal,
    sources: projections
  });
  return deepFreeze(result);
}

export function monthlyCoverageSummary(evaluation) {
  if (!plainObject(evaluation) || evaluation.version !== ALPHA2_MONTHLY_COVERAGE_VERSION) throw new Error('MONTHLY_CLOSE_EVALUATION_REQUIRED');
  const coverage = evaluation.coverage ?? {};
  return deepFreeze({
    closeId: evaluation.closeId,
    status: evaluation.status,
    includedSources: coverage.includedCount,
    reconciledIncludedSources: coverage.reconciledIncludedCount,
    userExcludedSources: coverage.userExcludedCount,
    notAvailableSources: coverage.notAvailableCount,
    pendingStatements: coverage.missingStatementCount,
    unresolvedItems: coverage.unresolvedCount,
    blockingConflicts: coverage.blockingConflictCount,
    coverageLabel: `${coverage.reconciledIncludedCount} de ${coverage.includedCount} fuentes incluidas conciliadas`,
    excludedSourcesRemainVisible: true,
    authoritativeCompletenessPercent: null
  });
}

function requiredTx(tx, name) {
  if (typeof tx?.[name] !== 'function') throw new Error(`MONTHLY_CLOSE_TX_SURFACE_MISSING:${name}`);
  return tx[name].bind(tx);
}

export class MonthlyCoverageRepository {
  constructor({ database, now = () => new Date().toISOString() } = {}) {
    if (!database || typeof database.transaction !== 'function') throw new Error('MONTHLY_CLOSE_TRANSACTIONAL_DATABASE_REQUIRED');
    this.database = database;
    this.now = now;
  }

  async commitEvaluation({ evaluation } = {}) {
    if (!plainObject(evaluation) || evaluation.version !== ALPHA2_MONTHLY_COVERAGE_VERSION) throw new Error('MONTHLY_CLOSE_EVALUATION_REQUIRED');
    return this.database.transaction(async tx => {
      const getReplay = requiredTx(tx, 'getMonthlyCloseReplay');
      const putReplay = requiredTx(tx, 'putMonthlyCloseReplay');
      const putClose = requiredTx(tx, 'putMonthlyClose');
      const putCoverage = requiredTx(tx, 'putAccountPeriodCoverage');
      const replay = await getReplay(evaluation.evaluationId);
      if (replay) return deepFreeze({ ...replay, replayed: true });

      for (const source of evaluation.coverage.sources) {
        await putCoverage({
          closeId: evaluation.closeId,
          tenantId: evaluation.tenantId,
          source
        });
      }
      await putClose({
        closeId: evaluation.closeId,
        tenantId: evaluation.tenantId,
        calendarYear: evaluation.calendarYear,
        calendarMonth: evaluation.calendarMonth,
        closeScopeVersion: evaluation.closeScopeVersion,
        status: evaluation.status,
        reason: evaluation.reason,
        evaluationId: evaluation.evaluationId,
        reconciledAt: evaluation.status === MonthlyCloseStatus.RECONCILED ? this.now() : null,
        reopenedAt: evaluation.status === MonthlyCloseStatus.REOPENED ? this.now() : null
      });
      const audit = deepFreeze({
        evaluationId: evaluation.evaluationId,
        closeId: evaluation.closeId,
        tenantId: evaluation.tenantId,
        status: evaluation.status,
        reason: evaluation.reason,
        version: ALPHA2_MONTHLY_COVERAGE_VERSION,
        committedAt: this.now()
      });
      await putReplay(evaluation.evaluationId, audit);
      return deepFreeze({ ...audit, replayed: false });
    });
  }
}

export function monthlyCoverageStaticContract() {
  return deepFreeze({
    version: ALPHA2_MONTHLY_COVERAGE_VERSION,
    closeStates: Object.values(MonthlyCloseStatus),
    expectedSourceStates: Object.values(ExpectedSourceState),
    scopeStates: Object.values(CoverageScopeState),
    inflowCoverageStates: Object.values(InflowCoverageState),
    outflowCoverageStates: Object.values(OutflowCoverageState),
    inflowObservedAllowed: false,
    outflowObservedAllowed: true,
    directionalCoverageSeparate: true,
    requiredDirectionsExplicit: true,
    globalUnqualifiedPercentageAllowed: false,
    reconciledRequiresAllIncludedExpectedSources: true,
    reconciledRequiresZeroBlockingConflicts: true,
    userExcludedSourcesRemainVisible: true,
    lateEvidenceReopens: true,
    parserReprocessingReopens: true,
    ownershipCorrectionReopens: true,
    sourceScopeChangeReopens: true,
    commitTransactional: true,
    replayIdempotent: true,
    physicalSchemaMigrationClaimed: false,
    physicalMonthlyCoveragePassClaimed: false,
    buildReady: false
  });
}
