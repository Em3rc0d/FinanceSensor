import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPHA2_MONTHLY_COVERAGE_VERSION,
  AccountReconciliationState,
  CloseActivity,
  CoverageScopeState,
  DirectionCoverageState,
  ExpectedSourceState,
  MonthlyCloseStatus,
  MonthlyCoverageRepository,
  PeriodCoverageState,
  ReopenSignal,
  StatementCoverageState,
  evaluateMonthlyClose,
  monthlyCoverageStaticContract,
  monthlyCoverageSummary
} from '../src/monthly-coverage.js';

function coverage(overrides = {}) {
  return {
    id: 'coverage-account-001-2026-09',
    tenantId: 'tenant-synthetic',
    ownerNodeId: 'account-node-001',
    periodStart: '2026-09-01T00:00:00.000Z',
    periodEnd: '2026-09-30T23:59:59.999Z',
    expectedSourceState: ExpectedSourceState.EXPECTED,
    scopeState: CoverageScopeState.INCLUDED,
    statementState: StatementCoverageState.PARSED,
    inflowCoverageState: DirectionCoverageState.COVERED,
    outflowCoverageState: DirectionCoverageState.COVERED,
    periodCoverageState: PeriodCoverageState.COVERED,
    reconciliationState: AccountReconciliationState.RECONCILED,
    requiredDirections: ['INFLOW', 'OUTFLOW'],
    unresolvedCount: 0,
    blockingConflictCount: 0,
    statementPeriodId: 'statement-period-001',
    ...overrides
  };
}

function evaluate(overrides = {}) {
  return evaluateMonthlyClose({
    tenantId: 'tenant-synthetic',
    calendarYear: 2026,
    calendarMonth: 9,
    closeScopeVersion: 'A2_CLOSE_SCOPE_V1',
    coverages: [coverage()],
    previousStatus: MonthlyCloseStatus.OPEN_LIVE,
    closeRequested: true,
    activity: CloseActivity.IDLE,
    ...overrides
  });
}

function clone(value) {
  return structuredClone(value);
}

function createDatabase({ failAt = null } = {}) {
  let state = {
    closes: new Map(),
    coverages: new Map(),
    replays: new Map()
  };
  const events = [];

  function copyState(value) {
    return {
      closes: new Map([...value.closes].map(([k, v]) => [k, clone(v)])),
      coverages: new Map([...value.coverages].map(([k, v]) => [k, clone(v)])),
      replays: new Map([...value.replays].map(([k, v]) => [k, clone(v)]))
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
        async getMonthlyCloseReplay(evaluationId) {
          return state.replays.get(evaluationId) ?? null;
        },
        async putMonthlyCloseReplay(evaluationId, audit) {
          maybeFail('replay');
          events.push(`replay:${evaluationId}`);
          if (!state.replays.has(evaluationId)) state.replays.set(evaluationId, clone(audit));
        },
        async putMonthlyClose(close) {
          maybeFail('close');
          events.push(`close:${close.closeId}:${close.status}`);
          state.closes.set(close.closeId, clone(close));
        },
        async putAccountPeriodCoverage({ closeId, source }) {
          maybeFail('coverage');
          events.push(`coverage:${closeId}:${source.id}`);
          state.coverages.set(`${closeId}:${source.id}`, clone(source));
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

test('static contract freezes separate coverage dimensions and no fake percentage', () => {
  const contract = monthlyCoverageStaticContract();
  assert.equal(contract.version, ALPHA2_MONTHLY_COVERAGE_VERSION);
  assert.deepEqual(contract.closeStates, [
    'OPEN_LIVE',
    'WAITING_FOR_STATEMENTS',
    'IMPORTING',
    'RECONCILING',
    'REVIEW_REQUIRED',
    'RECONCILED',
    'REOPENED'
  ]);
  assert.equal(contract.directionalCoverageSeparate, true);
  assert.equal(contract.requiredDirectionsExplicit, true);
  assert.equal(contract.globalUnqualifiedPercentageAllowed, false);
  assert.equal(contract.reconciledRequiresAllIncludedExpectedSources, true);
  assert.equal(contract.reconciledRequiresZeroBlockingConflicts, true);
  assert.equal(contract.userExcludedSourcesRemainVisible, true);
  assert.equal(contract.physicalSchemaMigrationClaimed, false);
  assert.equal(contract.physicalMonthlyCoveragePassClaimed, false);
  assert.equal(contract.buildReady, false);
});

test('month remains OPEN_LIVE before the close ritual is requested', () => {
  const result = evaluate({ closeRequested: false });
  assert.equal(result.status, MonthlyCloseStatus.OPEN_LIVE);
  assert.equal(result.reason, 'CLOSE_NOT_REQUESTED');
});

test('missing included expected statement yields WAITING_FOR_STATEMENTS', () => {
  const result = evaluate({
    coverages: [coverage({
      statementState: StatementCoverageState.NONE,
      inflowCoverageState: DirectionCoverageState.UNKNOWN,
      outflowCoverageState: DirectionCoverageState.OBSERVED,
      periodCoverageState: PeriodCoverageState.UNKNOWN,
      reconciliationState: AccountReconciliationState.NOT_STARTED,
      statementPeriodId: null
    })]
  });
  assert.equal(result.status, MonthlyCloseStatus.WAITING_FOR_STATEMENTS);
  assert.equal(result.reason, 'MISSING_EXPECTED_STATEMENT');
  assert.equal(result.coverage.missingStatementCount, 1);
});

test('explicit import activity yields IMPORTING before close evaluation', () => {
  const result = evaluate({
    activity: CloseActivity.IMPORTING,
    coverages: [coverage({ statementState: StatementCoverageState.RECEIVED, reconciliationState: AccountReconciliationState.NOT_STARTED })]
  });
  assert.equal(result.status, MonthlyCloseStatus.IMPORTING);
  assert.equal(result.reason, 'IMPORT_IN_PROGRESS');
});

test('explicit reconciliation activity yields RECONCILING', () => {
  const result = evaluate({ activity: CloseActivity.RECONCILING });
  assert.equal(result.status, MonthlyCloseStatus.RECONCILING);
  assert.equal(result.reason, 'RECONCILIATION_IN_PROGRESS');
});

test('blocking conflict prevents RECONCILED and requires review', () => {
  const result = evaluate({ coverages: [coverage({ blockingConflictCount: 1 })] });
  assert.equal(result.status, MonthlyCloseStatus.REVIEW_REQUIRED);
  assert.equal(result.reason, 'BLOCKING_CONFLICT');
  assert.equal(result.coverage.zeroBlockingConflicts, false);
});

test('unresolved review item prevents RECONCILED', () => {
  const result = evaluate({ coverages: [coverage({ unresolvedCount: 2 })] });
  assert.equal(result.status, MonthlyCloseStatus.REVIEW_REQUIRED);
  assert.equal(result.reason, 'UNRESOLVED_ITEMS');
});

test('all included expected sources covered and conflict-free yields RECONCILED', () => {
  const result = evaluate();
  assert.equal(result.status, MonthlyCloseStatus.RECONCILED);
  assert.equal(result.reason, 'ALL_INCLUDED_SOURCES_RECONCILED');
  assert.equal(result.coverage.includedCount, 1);
  assert.equal(result.coverage.reconciledIncludedCount, 1);
  assert.equal(result.coverage.allIncludedExpectedSourcesCovered, true);
  assert.equal(result.coverage.globalUnqualifiedPercentage, null);
});

test('user exclusion visibly reduces scope and does not silently count as reconciled evidence', () => {
  const included = coverage({ id: 'coverage-included', ownerNodeId: 'account-included' });
  const excluded = coverage({
    id: 'coverage-excluded',
    ownerNodeId: 'account-excluded',
    expectedSourceState: ExpectedSourceState.USER_EXCLUDED,
    scopeState: CoverageScopeState.USER_EXCLUDED,
    statementState: StatementCoverageState.NONE,
    inflowCoverageState: DirectionCoverageState.UNKNOWN,
    outflowCoverageState: DirectionCoverageState.UNKNOWN,
    periodCoverageState: PeriodCoverageState.UNKNOWN,
    reconciliationState: AccountReconciliationState.NOT_STARTED,
    statementPeriodId: null
  });
  const result = evaluate({ coverages: [included, excluded] });
  assert.equal(result.status, MonthlyCloseStatus.RECONCILED);
  assert.equal(result.coverage.includedCount, 1);
  assert.equal(result.coverage.userExcludedCount, 1);
  assert.equal(result.coverage.sources.length, 2);
  const excludedProjection = result.coverage.sources.find(item => item.id === 'coverage-excluded');
  assert.equal(excludedProjection.scopeState, CoverageScopeState.USER_EXCLUDED);
  assert.equal(excludedProjection.readyForClose, false);
});

test('excluding every source cannot produce a reconciled month', () => {
  const result = evaluate({
    coverages: [coverage({
      expectedSourceState: ExpectedSourceState.USER_EXCLUDED,
      scopeState: CoverageScopeState.USER_EXCLUDED
    })]
  });
  assert.equal(result.status, MonthlyCloseStatus.REVIEW_REQUIRED);
  assert.equal(result.reason, 'NO_INCLUDED_SOURCES');
});

test('inflow and outflow coverage are independent', () => {
  const result = evaluate({
    coverages: [coverage({
      inflowCoverageState: DirectionCoverageState.PARTIAL,
      outflowCoverageState: DirectionCoverageState.COVERED,
      requiredDirections: ['INFLOW', 'OUTFLOW']
    })]
  });
  assert.equal(result.status, MonthlyCloseStatus.RECONCILING);
  const source = result.coverage.sources[0];
  assert.ok(source.blockingReasons.includes('INFLOW_NOT_COVERED'));
  assert.equal(source.blockingReasons.includes('OUTFLOW_NOT_COVERED'), false);
});

test('an explicitly outflow-only scope may reconcile without inventing inflow coverage', () => {
  const result = evaluate({
    coverages: [coverage({
      inflowCoverageState: DirectionCoverageState.UNKNOWN,
      outflowCoverageState: DirectionCoverageState.COVERED,
      requiredDirections: ['OUTFLOW']
    })]
  });
  assert.equal(result.status, MonthlyCloseStatus.RECONCILED);
  assert.equal(result.coverage.sources[0].inflowCoverageState, DirectionCoverageState.UNKNOWN);
});

test('unknown included source disposition fails into REVIEW_REQUIRED', () => {
  const result = evaluate({
    coverages: [coverage({ expectedSourceState: ExpectedSourceState.UNKNOWN })]
  });
  assert.equal(result.status, MonthlyCloseStatus.REVIEW_REQUIRED);
  assert.ok(result.coverage.sources[0].blockingReasons.includes('EXPECTED_SOURCE_DISPOSITION_UNKNOWN'));
});

test('late evidence deterministically reopens a reconciled month', () => {
  const result = evaluate({
    previousStatus: MonthlyCloseStatus.RECONCILED,
    reopenSignal: ReopenSignal.LATE_EVIDENCE
  });
  assert.equal(result.status, MonthlyCloseStatus.REOPENED);
  assert.equal(result.reason, ReopenSignal.LATE_EVIDENCE);
});

test('parser reprocessing deterministically reopens a reconciled month', () => {
  const result = evaluate({
    previousStatus: MonthlyCloseStatus.RECONCILED,
    reopenSignal: ReopenSignal.PARSER_REPROCESSING
  });
  assert.equal(result.status, MonthlyCloseStatus.REOPENED);
});

test('account mapping correction deterministically reopens a reconciled month', () => {
  const result = evaluate({
    previousStatus: MonthlyCloseStatus.RECONCILED,
    reopenSignal: ReopenSignal.ACCOUNT_MAPPING_CORRECTION
  });
  assert.equal(result.status, MonthlyCloseStatus.REOPENED);
});

test('scope change deterministically reopens a reconciled month', () => {
  const result = evaluate({
    previousStatus: MonthlyCloseStatus.RECONCILED,
    reopenSignal: ReopenSignal.SOURCE_SCOPE_CHANGED
  });
  assert.equal(result.status, MonthlyCloseStatus.REOPENED);
});

test('same close inputs produce deterministic close and evaluation identities', () => {
  const a = evaluate();
  const b = evaluate({ coverages: [coverage()] });
  assert.equal(a.closeId, b.closeId);
  assert.equal(a.evaluationId, b.evaluationId);
});

test('coverage source order cannot change evaluation identity', () => {
  const a = coverage({ id: 'coverage-A', ownerNodeId: 'account-A' });
  const b = coverage({ id: 'coverage-B', ownerNodeId: 'account-B', requiredDirections: ['OUTFLOW'], inflowCoverageState: DirectionCoverageState.UNKNOWN });
  const forward = evaluate({ coverages: [a, b] });
  const reverse = evaluate({ coverages: [b, a] });
  assert.equal(forward.evaluationId, reverse.evaluationId);
  assert.equal(forward.status, reverse.status);
});

test('monthly summary exposes explicit counts and never an authoritative percentage', () => {
  const summary = monthlyCoverageSummary(evaluate());
  assert.equal(summary.includedSources, 1);
  assert.equal(summary.reconciledIncludedSources, 1);
  assert.equal(summary.coverageLabel, '1 de 1 fuentes incluidas conciliadas');
  assert.equal(summary.excludedSourcesRemainVisible, true);
  assert.equal(summary.authoritativeCompletenessPercent, null);
  assert.equal(Object.hasOwn(summary, 'completenessPercent'), false);
});

test('repository commits coverage and close state atomically', async () => {
  const evaluation = evaluate();
  const database = createDatabase();
  const repository = new MonthlyCoverageRepository({ database, now: () => '2026-09-05T23:45:00.000Z' });
  const result = await repository.commitEvaluation({ evaluation });
  assert.equal(result.status, MonthlyCloseStatus.RECONCILED);
  assert.equal(result.replayed, false);
  assert.equal(database.state.closes.size, 1);
  assert.equal(database.state.coverages.size, 1);
  assert.equal(database.state.replays.size, 1);
  assert.equal(database.state.closes.get(evaluation.closeId).reconciledAt, '2026-09-05T23:45:00.000Z');
  assert.ok(database.events.includes('tx:commit'));
});

test('repository replay creates zero duplicate close or coverage records', async () => {
  const evaluation = evaluate();
  const database = createDatabase();
  const repository = new MonthlyCoverageRepository({ database, now: () => '2026-09-05T23:45:00.000Z' });
  const first = await repository.commitEvaluation({ evaluation });
  const second = await repository.commitEvaluation({ evaluation });
  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(database.state.closes.size, 1);
  assert.equal(database.state.coverages.size, 1);
  assert.equal(database.state.replays.size, 1);
});

test('failure during close write rolls coverage and replay back together', async () => {
  const evaluation = evaluate();
  const database = createDatabase({ failAt: 'close' });
  const repository = new MonthlyCoverageRepository({ database });
  await assert.rejects(repository.commitEvaluation({ evaluation }), /SYNTHETIC_FAILURE:close/);
  assert.equal(database.state.closes.size, 0);
  assert.equal(database.state.coverages.size, 0);
  assert.equal(database.state.replays.size, 0);
  assert.ok(database.events.includes('tx:rollback'));
});
