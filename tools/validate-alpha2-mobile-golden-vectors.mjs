import fs from 'node:fs';
import {
  reconcileEvidenceCandidates,
} from '../spikes/physical-ingress/src/statement-reconciliation.js';
import {
  AccountNodeKind,
  createAccountGraphNode,
  resolveStatementOwnership,
} from '../spikes/physical-ingress/src/account-graph.js';
import {
  evaluateMonthlyClose,
} from '../spikes/physical-ingress/src/monthly-coverage.js';
import {
  baseCategoryObservation,
  deriveRecurringCandidates,
  deriveCashflowObservations,
} from '../spikes/physical-ingress/src/sensor-v1.js';

const vectorPath = 'graph/alpha2-mobile-golden-vectors-v1.json';
const vectors = JSON.parse(fs.readFileSync(vectorPath, 'utf8'));
const failures = [];
const fail = message => failures.push(message);

if (vectors.contract !== 'ALPHA2_MOBILE_GOLDEN_VECTORS_V1') fail('vector contract id drifted');
if (vectors.referenceRuntime !== 'NODE_STATIC_CERTIFIED') fail('reference runtime drifted');
if (vectors.productRuntime !== 'DART') fail('product runtime drifted');
if (vectors.semanticParityRequired !== true) fail('semantic parity must be required');
if (vectors.identityParityRequired !== false) fail('language object identity parity must remain false');

for (const test of vectors.reconciliation ?? []) {
  const result = reconcileEvidenceCandidates({
    leftEvidence: test.left,
    candidates: test.candidates,
  });
  if (result.outcome !== test.expected.outcome) fail(`${test.id}: outcome ${result.outcome}`);
  if (test.expected.topScore !== undefined && result.topScore !== test.expected.topScore) {
    fail(`${test.id}: topScore ${result.topScore}`);
  }
  if (test.expected.margin !== undefined && result.margin !== test.expected.margin) {
    fail(`${test.id}: margin ${result.margin}`);
  }
  if (test.expected.selectedEvidenceId !== undefined && result.selectedEvidenceId !== test.expected.selectedEvidenceId) {
    fail(`${test.id}: selected ${result.selectedEvidenceId}`);
  }
  if (test.expected.veto) {
    const vetoes = result.evaluations.flatMap(item => item.snapshot.vetoes);
    if (!vetoes.includes(test.expected.veto)) fail(`${test.id}: missing veto ${test.expected.veto}`);
  }
}

function accountCase(mode) {
  const common = {
    tenantId: 't1',
    institutionCode: 'BCP',
    currency: 'PEN',
    kind: AccountNodeKind.ACCOUNT,
  };
  if (mode === 'BANK_CURRENCY_ONLY') {
    const node = createAccountGraphNode({ ...common, nodeId: 'acct-demo' });
    return resolveStatementOwnership({
      observation: { ...common, statementPeriodId: '2026-08' },
      candidateNodes: [node],
    });
  }
  if (mode === 'MASKED_ONE_PERIOD' || mode === 'MASKED_TWO_PERIODS') {
    const node = createAccountGraphNode({ ...common, maskedHint: '****1234' });
    const priorEvidence = mode === 'MASKED_TWO_PERIODS'
      ? [{
          nodeId: node.id,
          tenantId: 't1',
          statementPeriodId: '2026-07',
          institutionCode: 'BCP',
          currency: 'PEN',
          kind: 'ACCOUNT',
          maskedHintDigest: node.maskedHintDigest,
        }]
      : [];
    return resolveStatementOwnership({
      observation: { ...common, statementPeriodId: '2026-08', maskedHint: '****1234' },
      candidateNodes: [node],
      priorEvidence,
    });
  }
  if (mode === 'EXACT_STABLE_IDENTIFIER') {
    const digest = 'a'.repeat(64);
    const node = createAccountGraphNode({
      ...common,
      profileStableIdentifierDigest: digest,
      profileDeclaresStableIdentifier: true,
    });
    return resolveStatementOwnership({
      observation: {
        ...common,
        statementPeriodId: '2026-08',
        profileStableIdentifierDigest: digest,
        profileDeclaresStableIdentifier: true,
      },
      candidateNodes: [node],
    });
  }
  throw new Error(`unknown account vector mode ${mode}`);
}

for (const test of vectors.accountGraph ?? []) {
  const result = accountCase(test.mode);
  if (result.state !== test.expectedState) fail(`${test.id}: state ${result.state}`);
  if (test.expectedPeriods !== undefined && result.stableEvidencePeriodCount !== test.expectedPeriods) {
    fail(`${test.id}: periods ${result.stableEvidencePeriodCount}`);
  }
}

const baseCoverage = overrides => ({
  id: overrides.id ?? 'cov-1',
  tenantId: 't1',
  ownerNodeId: overrides.ownerNodeId ?? 'acct-1',
  periodStart: '2026-08-01T00:00:00Z',
  periodEnd: '2026-08-31T23:59:59Z',
  expectedSourceState: 'EXPECTED',
  scopeState: 'INCLUDED',
  statementState: 'PARSED',
  inflowCoverageState: 'COVERED',
  outflowCoverageState: 'COVERED',
  periodCoverageState: 'COVERED',
  reconciliationState: 'RECONCILED',
  requiredDirections: ['INFLOW', 'OUTFLOW'],
  unresolvedCount: 0,
  blockingConflictCount: 0,
  statementPeriodId: 'period-2026-08',
  ...overrides,
});

function monthlyCase(mode) {
  let coverages;
  if (mode === 'MISSING_STATEMENT') {
    coverages = [baseCoverage({ statementState: 'NONE', inflowCoverageState: 'PARTIAL', outflowCoverageState: 'OBSERVED', periodCoverageState: 'PARTIAL', reconciliationState: 'PARTIAL' })];
  } else if (mode === 'ALL_COVERED') {
    coverages = [baseCoverage({})];
  } else if (mode === 'BLOCKING_CONFLICT') {
    coverages = [baseCoverage({ blockingConflictCount: 1 })];
  } else if (mode === 'ONE_INCLUDED_ONE_EXCLUDED') {
    coverages = [
      baseCoverage({ id: 'cov-included' }),
      baseCoverage({
        id: 'cov-excluded',
        ownerNodeId: 'acct-2',
        expectedSourceState: 'USER_EXCLUDED',
        scopeState: 'USER_EXCLUDED',
        statementState: 'NONE',
        inflowCoverageState: 'UNKNOWN',
        outflowCoverageState: 'UNKNOWN',
        periodCoverageState: 'UNKNOWN',
        reconciliationState: 'NOT_STARTED',
      }),
    ];
  } else {
    throw new Error(`unknown monthly vector mode ${mode}`);
  }
  return evaluateMonthlyClose({
    tenantId: 't1',
    calendarYear: 2026,
    calendarMonth: 8,
    closeRequested: true,
    coverages,
  });
}

for (const test of vectors.monthlyCoverage ?? []) {
  const result = monthlyCase(test.mode);
  if (result.status !== test.expectedStatus) fail(`${test.id}: status ${result.status}`);
  if (result.coverage?.globalUnqualifiedPercentage !== null) fail(`${test.id}: global percentage must be null`);
  if (test.expectedExcluded !== undefined && result.coverage.userExcludedCount !== test.expectedExcluded) {
    fail(`${test.id}: excluded ${result.coverage.userExcludedCount}`);
  }
}

const event = ({ id, date, semanticType = 'EXPENSE', currency = 'PEN', amount = 10, merchant = 'DEMO SHOP', category = null }) => ({
  id,
  tenantId: 't1',
  occurredAt: date,
  semanticType,
  currency,
  amount,
  merchantCanonical: merchant,
  categoryName: category,
  accountId: 'acct-1',
  canonicalStatus: 'ACTIVE',
});

for (const test of vectors.sensor ?? []) {
  if (test.mode === 'FEE_CATEGORY') {
    const result = baseCategoryObservation(event({ id: 'fee-1', date: '2026-08-01T00:00:00Z', semanticType: 'FEE' }));
    if (result.category !== test.expectedCategory) fail(`${test.id}: category ${result.category}`);
    continue;
  }
  if (test.mode === 'TWO_MONTHLY' || test.mode === 'THREE_MONTHLY') {
    const events = [
      event({ id: 'r1', date: '2026-06-01T00:00:00Z' }),
      event({ id: 'r2', date: '2026-07-01T00:00:00Z' }),
    ];
    if (test.mode === 'THREE_MONTHLY') events.push(event({ id: 'r3', date: '2026-08-01T00:00:00Z' }));
    const result = deriveRecurringCandidates(events);
    if (result.length !== test.expectedRecurring) fail(`${test.id}: recurring ${result.length}`);
    if (result[0] && test.expectedCadence && result[0].cadence !== test.expectedCadence) fail(`${test.id}: cadence ${result[0].cadence}`);
    if (result[0] && test.expectedState && result[0].state !== test.expectedState) fail(`${test.id}: state ${result[0].state}`);
    continue;
  }
  if (test.mode === 'CARD_PAYMENT') {
    const result = deriveCashflowObservations([
      event({ id: 'cp1', date: '2026-08-01T00:00:00Z', semanticType: 'CARD_PAYMENT' }),
    ], []);
    if (result.length !== test.expectedCashflowBuckets) fail(`${test.id}: buckets ${result.length}`);
    continue;
  }
  if (test.mode === 'CROSS_CURRENCY') {
    const result = deriveCashflowObservations([
      event({ id: 'p1', date: '2026-08-01T00:00:00Z', currency: 'PEN' }),
      event({ id: 'u1', date: '2026-08-02T00:00:00Z', currency: 'USD' }),
    ], []);
    if (result.length !== test.expectedCashflowBuckets) fail(`${test.id}: buckets ${result.length}`);
  }
}

if (failures.length) {
  console.error('ALPHA2_MOBILE_GOLDEN_VECTORS=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ALPHA2_MOBILE_GOLDEN_VECTORS=PASS');
console.log(`D_VECTORS=${vectors.reconciliation.length}`);
console.log(`E_VECTORS=${vectors.accountGraph.length}`);
console.log(`F_VECTORS=${vectors.monthlyCoverage.length}`);
console.log(`G_VECTORS=${vectors.sensor.length}`);
console.log('REFERENCE_RUNTIME=NODE_STATIC_CERTIFIED');
console.log('PRODUCT_RUNTIME=DART');
console.log('SEMANTIC_PARITY_REQUIRED=1');
console.log('LANGUAGE_OBJECT_IDENTITY_PARITY_REQUIRED=0');
