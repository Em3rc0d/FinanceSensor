import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readText = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`ALPHA2_F_VALIDATION_FAILED:${message}`);
};
const assertThrows = (fn, pattern, message) => {
  try {
    fn();
  } catch (error) {
    if (pattern.test(String(error?.message ?? error))) return;
    throw new Error(`ALPHA2_F_VALIDATION_FAILED:${message}:WRONG_ERROR:${error?.message ?? error}`);
  }
  throw new Error(`ALPHA2_F_VALIDATION_FAILED:${message}:DID_NOT_THROW`);
};

const graph = readJson('graph/alpha2-f-monthly-coverage.json');
const alpha2D = readJson('graph/alpha2-d-reconciliation.json');
const alpha2E = readJson('graph/alpha2-e-account-graph.json');
const design = readJson('graph/alpha2-design-freeze.json');
const etlGraph = readJson('graph/statement-etl-reconciliation.json');
const model = readText('mk0/05-data-model/STATEMENT-RECONCILIATION-MODEL.md');
const adr035 = readText('mk0/11-decisions/ADR-035-STATEMENT-ETL-MONTHLY-RECONCILIATION.md');
const adr036 = readText('mk0/11-decisions/ADR-036-ALPHA2-FINANCIAL-MEMORY.md');
const ux = readText('mk0/03-design/MONTHLY-CLOSE-EXPERIENCE.md');
const plan = readText('mk0/07-plan/ALPHA2-IMPLEMENTATION-AND-CERTIFICATION.md');
const source = readText('spikes/physical-ingress/src/monthly-coverage.js');
const status = readText('STATUS.md');

assert(graph.slice === 'ALPHA_2_F', 'SLICE_ID');
assert(graph.status === 'STATIC_IMPLEMENTED_CI_PENDING', 'STATIC_STATUS_PENDING');
assert(graph.baseCommit === '9e2a1327a35935d19f073e743d33c82fa4c74df7', 'BASE_COMMIT');
assert(graph.implementationReceipt === null, 'IMPLEMENTATION_RECEIPT_MUST_BE_NULL_BEFORE_CI');
assert(graph.claims?.staticImplementationPass === false, 'STATIC_PASS_MUST_REMAIN_FALSE_BEFORE_EXACT_SHA_CI');
assert(graph.claims?.physicalMonthlyCoveragePass === false, 'PHYSICAL_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.alpha2ProductPass === false, 'ALPHA2_PRODUCT_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.buildReady === false, 'BUILD_READY_MUST_REMAIN_FALSE');

assert(alpha2D.status === 'STATIC_IMPLEMENTED_CI_PASS', 'ALPHA2_D_DEPENDENCY');
assert(alpha2D.claims?.staticImplementationPass === true, 'ALPHA2_D_STATIC_PASS');
assert(alpha2D.claims?.physicalReconciliationPass === false, 'ALPHA2_D_PHYSICAL_BOUNDARY');
assert(alpha2E.status === 'STATIC_IMPLEMENTED_CI_PASS', 'ALPHA2_E_DEPENDENCY');
assert(alpha2E.claims?.staticImplementationPass === true, 'ALPHA2_E_STATIC_PASS');
assert(alpha2E.claims?.physicalAccountGraphPass === false, 'ALPHA2_E_PHYSICAL_BOUNDARY');
assert(design.buildReady === false, 'DESIGN_BUILD_READY_DRIFT');

const frozen = design.monthlyCoveragePolicy;
assert(JSON.stringify(frozen?.states) === JSON.stringify([
  'OPEN_LIVE',
  'WAITING_FOR_STATEMENTS',
  'IMPORTING',
  'RECONCILING',
  'REVIEW_REQUIRED',
  'RECONCILED',
  'REOPENED'
]), 'DESIGN_CLOSE_STATES');
assert(frozen?.reconciledRequiresAllIncludedExpectedSources === true, 'DESIGN_ALL_INCLUDED_REQUIRED');
assert(frozen?.reconciledRequiresZeroBlockingConflicts === true, 'DESIGN_ZERO_CONFLICTS_REQUIRED');
assert(frozen?.excludedSourcesReduceScopeAndRemainVisible === true, 'DESIGN_EXCLUSION_VISIBLE');
assert(frozen?.globalUnqualifiedPercentageAllowed === false, 'DESIGN_GLOBAL_PERCENT_FORBIDDEN');
assert(frozen?.lateEvidenceOrReprocessingCanReopen === true, 'DESIGN_REOPEN');

assert(graph.model?.version === 'A2_MONTHLY_COVERAGE_V1', 'GRAPH_VERSION');
assert(JSON.stringify(graph.model?.closeStates) === JSON.stringify(frozen.states), 'GRAPH_CLOSE_STATES');
assert(JSON.stringify(graph.model?.inflowCoverageStates) === JSON.stringify(['UNKNOWN','PARTIAL','COVERED']), 'GRAPH_INFLOW_STATES');
assert(JSON.stringify(graph.model?.outflowCoverageStates) === JSON.stringify(['UNKNOWN','OBSERVED','PARTIAL','COVERED']), 'GRAPH_OUTFLOW_STATES');
assert(graph.truthBoundary?.directionalCoverageSeparate === true, 'GRAPH_DIRECTIONAL_SEPARATION');
assert(graph.truthBoundary?.requiredDirectionsExplicit === true, 'GRAPH_REQUIRED_DIRECTIONS');
assert(graph.truthBoundary?.gmailInflowObservationCanBeObserved === false, 'GRAPH_INFLOW_OBSERVED_FORBIDDEN');
assert(graph.truthBoundary?.gmailOutflowObservationCanBeObserved === true, 'GRAPH_OUTFLOW_OBSERVED_ALLOWED');
assert(graph.truthBoundary?.noGmailInflowMeansZeroInflow === false, 'GRAPH_NO_GMAIL_INFLOW_LAW');
assert(graph.truthBoundary?.observedOutflowMeansReconciledOutflow === false, 'GRAPH_OBSERVED_OUTFLOW_LAW');
assert(graph.truthBoundary?.globalUnqualifiedPercentageAllowed === false, 'GRAPH_PERCENT_FORBIDDEN');
assert(graph.closePolicy?.allIncludedExpectedSourcesRequired === true, 'GRAPH_ALL_INCLUDED_REQUIRED');
assert(graph.closePolicy?.zeroBlockingConflictsRequired === true, 'GRAPH_ZERO_CONFLICTS_REQUIRED');
assert(graph.closePolicy?.excludedSourcesRemainVisible === true, 'GRAPH_EXCLUDED_VISIBLE');
assert(graph.closePolicy?.noIncludedSourcesCanReconcile === false, 'GRAPH_NO_INCLUDED_RECONCILE_FORBIDDEN');
assert(graph.persistence?.coverageAndCloseCommitTransactional === true, 'GRAPH_TRANSACTIONAL_COMMIT');
assert(graph.persistence?.replayIdempotent === true, 'GRAPH_REPLAY');
assert(graph.schemaBoundary?.physicalSchemaMigrationInThisSlice === false, 'GRAPH_SCHEMA_OVERCLAIM');

assert(etlGraph.monthlyClose?.singleCompletenessPercentAuthoritative === false, 'ETL_PERCENT_BOUNDARY');
assert(etlGraph.monthlyClose?.reconciledMeansProductionReady === false, 'ETL_PRODUCTION_BOUNDARY');
assert(JSON.stringify(etlGraph.monthlyClose?.states) === JSON.stringify(frozen.states), 'ETL_CLOSE_STATES');

for (const marker of [
  'expected_source_state      EXPECTED | NOT_AVAILABLE | USER_EXCLUDED | UNKNOWN',
  'statement_state            NONE | RECEIVED | PARSED_PARTIAL | PARSED | REVIEW_REQUIRED',
  'inflow_coverage_state      UNKNOWN | PARTIAL | COVERED',
  'outflow_coverage_state     UNKNOWN | OBSERVED | PARTIAL | COVERED',
  'reconciliation_state       NOT_STARTED | PARTIAL | REVIEW_REQUIRED | RECONCILED',
  'MonthlyClose',
  'REOPENED',
  'Physical constraints remain subject to schema freeze'
]) assert(model.includes(marker), `MODEL_MARKER:${marker}`);

for (const marker of [
  'NO_GMAIL_INFLOW != ZERO_INFLOW',
  'MONTH_RECONCILED != PRODUCTION_READY',
  'Do not expose one ambiguous `completenessPercent`.',
  'inflow and outflow coverage are measured independently'
]) assert(adr035.includes(marker), `ADR035_MARKER:${marker}`);

for (const marker of [
  'Coverage is multi-dimensional and per account/instrument-period',
  '`RECONCILED` requires every included expected source to be covered and no blocking ambiguity or conflict.',
  'User-excluded sources remain visibly excluded and reduce scope.'
]) assert(adr036.includes(marker), `ADR036_MARKER:${marker}`);

for (const marker of [
  'Avoid one fake completeness percentage.',
  '2 de 3 cuentas conciliadas',
  'A closed month can reopen without implying data corruption.'
]) assert(ux.includes(marker), `UX_MARKER:${marker}`);

for (const marker of [
  'Slice F — Monthly coverage',
  '`RECONCILED` requires all included expected sources at sufficient coverage with zero blocking conflicts.',
  'Late evidence and parser reprocessing reopen deterministically.'
]) assert(plan.includes(marker), `PLAN_MARKER:${marker}`);

const moduleUrl = pathToFileURL(path.join(root, 'spikes/physical-ingress/src/monthly-coverage.js')).href;
const {
  ALPHA2_MONTHLY_COVERAGE_VERSION,
  MonthlyCloseStatus,
  ExpectedSourceState,
  CoverageScopeState,
  StatementCoverageState,
  InflowCoverageState,
  OutflowCoverageState,
  PeriodCoverageState,
  AccountReconciliationState,
  CloseActivity,
  evaluateMonthlyClose,
  monthlyCoverageStaticContract
} = await import(moduleUrl);

assert(ALPHA2_MONTHLY_COVERAGE_VERSION === 'A2_MONTHLY_COVERAGE_V1', 'SOURCE_VERSION');
assert(JSON.stringify(Object.values(MonthlyCloseStatus)) === JSON.stringify(frozen.states), 'SOURCE_CLOSE_STATES');
assert(JSON.stringify(Object.values(InflowCoverageState)) === JSON.stringify(['UNKNOWN','PARTIAL','COVERED']), 'SOURCE_INFLOW_STATES');
assert(JSON.stringify(Object.values(OutflowCoverageState)) === JSON.stringify(['UNKNOWN','OBSERVED','PARTIAL','COVERED']), 'SOURCE_OUTFLOW_STATES');
const contract = monthlyCoverageStaticContract();
assert(contract.directionalCoverageSeparate === true, 'SOURCE_DIRECTIONAL_SEPARATION');
assert(contract.inflowObservedAllowed === false, 'SOURCE_INFLOW_OBSERVED_FORBIDDEN');
assert(contract.outflowObservedAllowed === true, 'SOURCE_OUTFLOW_OBSERVED_ALLOWED');
assert(contract.globalUnqualifiedPercentageAllowed === false, 'SOURCE_PERCENT_FORBIDDEN');
assert(contract.reconciledRequiresAllIncludedExpectedSources === true, 'SOURCE_ALL_INCLUDED_REQUIRED');
assert(contract.reconciledRequiresZeroBlockingConflicts === true, 'SOURCE_ZERO_CONFLICTS_REQUIRED');
assert(contract.userExcludedSourcesRemainVisible === true, 'SOURCE_EXCLUSION_VISIBLE');
assert(contract.commitTransactional === true, 'SOURCE_TRANSACTION');
assert(contract.replayIdempotent === true, 'SOURCE_REPLAY');
assert(contract.physicalSchemaMigrationClaimed === false, 'SOURCE_SCHEMA_OVERCLAIM');
assert(contract.physicalMonthlyCoveragePassClaimed === false, 'SOURCE_PHYSICAL_OVERCLAIM');
assert(contract.buildReady === false, 'SOURCE_BUILD_READY_OVERCLAIM');

const coverage = overrides => ({
  id: 'coverage-validator',
  tenantId: 'tenant-validator',
  ownerNodeId: 'account-validator',
  periodStart: '2026-09-01T00:00:00.000Z',
  periodEnd: '2026-09-30T23:59:59.999Z',
  expectedSourceState: ExpectedSourceState.EXPECTED,
  scopeState: CoverageScopeState.INCLUDED,
  statementState: StatementCoverageState.PARSED,
  inflowCoverageState: InflowCoverageState.COVERED,
  outflowCoverageState: OutflowCoverageState.COVERED,
  periodCoverageState: PeriodCoverageState.COVERED,
  reconciliationState: AccountReconciliationState.RECONCILED,
  requiredDirections: ['INFLOW','OUTFLOW'],
  unresolvedCount: 0,
  blockingConflictCount: 0,
  statementPeriodId: 'period-validator',
  ...overrides
});
const evaluate = coverages => evaluateMonthlyClose({
  tenantId: 'tenant-validator',
  calendarYear: 2026,
  calendarMonth: 9,
  closeRequested: true,
  activity: CloseActivity.IDLE,
  coverages
});

assertThrows(
  () => evaluate([coverage({ inflowCoverageState: 'OBSERVED' })]),
  /MONTHLY_COVERAGE_INFLOW_STATE_INVALID/,
  'INFLOW_OBSERVED_MUST_FAIL_CLOSED'
);
const observedOutflow = evaluate([coverage({
  inflowCoverageState: InflowCoverageState.UNKNOWN,
  outflowCoverageState: OutflowCoverageState.OBSERVED,
  requiredDirections: ['OUTFLOW'],
  reconciliationState: AccountReconciliationState.PARTIAL
})]);
assert(observedOutflow.status !== MonthlyCloseStatus.RECONCILED, 'OUTFLOW_OBSERVED_MUST_NOT_RECONCILE');
assert(observedOutflow.coverage.sources[0].outflowCoverageState === 'OBSERVED', 'OUTFLOW_OBSERVED_MUST_REMAIN_EXPLICIT');
const clean = evaluate([coverage()]);
assert(clean.status === MonthlyCloseStatus.RECONCILED, 'CLEAN_RECONCILIATION');
assert(clean.coverage.globalUnqualifiedPercentage === null, 'CLEAN_NO_GLOBAL_PERCENT');
const conflict = evaluate([coverage({ blockingConflictCount: 1 })]);
assert(conflict.status === MonthlyCloseStatus.REVIEW_REQUIRED, 'CONFLICT_BLOCKS_CLOSE');

for (const marker of [
  'getMonthlyCloseReplay',
  'putAccountPeriodCoverage',
  'putMonthlyClose',
  'putMonthlyCloseReplay',
  'LATE_EVIDENCE',
  'PARSER_REPROCESSING',
  'ACCOUNT_MAPPING_CORRECTION',
  'SOURCE_SCOPE_CHANGED',
  'globalUnqualifiedPercentage: null',
  'authoritativeCompletenessPercent: null'
]) assert(source.includes(marker), `SOURCE_MARKER:${marker}`);

for (const forbidden of [
  'console.log(',
  'writeFileSync(',
  'localStorage',
  'sessionStorage',
  'gmail.googleapis.com',
  'oauth2.googleapis.com',
  'accounts.google.com'
]) assert(!source.includes(forbidden), `FORBIDDEN_SOURCE:${forbidden}`);

assert(/BUILD_READY\s+NO/.test(status), 'GLOBAL_BUILD_READY_STATUS');

console.log('ALPHA2_F_STATIC_IMPLEMENTATION=CANDIDATE');
console.log('ALPHA2_F_EXACT_SHA_RECEIPT=PENDING');
console.log('MONTHLY_COVERAGE_VERSION=A2_MONTHLY_COVERAGE_V1');
console.log('INFLOW_OBSERVED_ALLOWED=0');
console.log('OUTFLOW_OBSERVED_ALLOWED=1');
console.log('GLOBAL_COMPLETENESS_PERCENT=0');
console.log('RECONCILED_REQUIRES_ALL_INCLUDED=1');
console.log('RECONCILED_REQUIRES_ZERO_BLOCKING_CONFLICTS=1');
console.log('REAL_FINANCIAL_PLAINTEXT_IN_CI=0');
console.log('PHYSICAL_SCHEMA_MIGRATION_PASS=0');
console.log('PHYSICAL_MONTHLY_COVERAGE_PASS=0');
console.log('BUILD_READY=NO');
