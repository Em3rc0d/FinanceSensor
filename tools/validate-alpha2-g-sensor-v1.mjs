import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readText = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`ALPHA2_G_VALIDATION_FAILED:${message}`);
};

const graph = readJson('graph/alpha2-g-sensor-v1.json');
const alpha2F = readJson('graph/alpha2-f-monthly-coverage.json');
const design = readJson('graph/alpha2-design-freeze.json');
const product = readText('mk0/03-design/PRODUCT-DESIGN.md');
const alpha2Ux = readText('mk0/03-design/ALPHA2-FINANCIAL-MEMORY-UX.md');
const core = readText('mk0/05-data-model/CORE-DATA-MODEL.md');
const plan = readText('mk0/07-plan/ALPHA2-IMPLEMENTATION-AND-CERTIFICATION.md');
const source = readText('spikes/physical-ingress/src/sensor-v1.js');
const status = readText('STATUS.md');

assert(graph.slice === 'ALPHA_2_G', 'SLICE_ID');
assert(graph.status === 'STATIC_IMPLEMENTED_CI_PENDING', 'STATIC_STATUS_PENDING');
assert(graph.baseCommit === 'f2956b3f8676e2d8728b9f71b1c4480590406bc8', 'BASE_COMMIT');
assert(graph.implementationReceipt === null, 'IMPLEMENTATION_RECEIPT_MUST_BE_NULL_BEFORE_CI');
assert(graph.claims?.staticImplementationPass === false, 'STATIC_PASS_MUST_REMAIN_FALSE_BEFORE_EXACT_SHA_CI');
assert(graph.claims?.physicalSensorPass === false, 'PHYSICAL_SENSOR_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.alpha2ProductPass === false, 'ALPHA2_PRODUCT_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.buildReady === false, 'BUILD_READY_MUST_REMAIN_FALSE');

assert(alpha2F.status === 'STATIC_IMPLEMENTED_CI_PASS', 'ALPHA2_F_DEPENDENCY');
assert(alpha2F.claims?.staticImplementationPass === true, 'ALPHA2_F_STATIC_PASS');
assert(alpha2F.claims?.physicalMonthlyCoveragePass === false, 'ALPHA2_F_PHYSICAL_BOUNDARY');
assert(design.buildReady === false, 'DESIGN_BUILD_READY_DRIFT');

const frozen = design.sensorPolicy;
assert(frozen?.deterministicOnly === true, 'DESIGN_DETERMINISTIC_ONLY');
assert(frozen?.llmEnabled === false, 'DESIGN_LLM_FORBIDDEN');
assert(frozen?.automatedFinancialAdvice === false, 'DESIGN_ADVICE_FORBIDDEN');
assert(frozen?.genericEvidencePercentageAllowed === false, 'DESIGN_GENERIC_PERCENT_FORBIDDEN');
assert(JSON.stringify(frozen?.truthStates) === JSON.stringify(['OBSERVED','POSTED','RECONCILED','PARTIAL','UNKNOWN']), 'DESIGN_TRUTH_STATES');

assert(graph.model?.version === 'A2_SENSOR_V1', 'GRAPH_VERSION');
assert(JSON.stringify(graph.model?.truthStates) === JSON.stringify(frozen.truthStates), 'GRAPH_TRUTH_STATES');
assert(graph.determinismBoundary?.deterministicOnly === true, 'GRAPH_DETERMINISTIC_ONLY');
assert(graph.determinismBoundary?.llmEnabled === false, 'GRAPH_LLM_FORBIDDEN');
assert(graph.determinismBoundary?.automatedFinancialAdvice === false, 'GRAPH_ADVICE_FORBIDDEN');
assert(graph.determinismBoundary?.recommendationsInSensorV1 === false, 'GRAPH_RECOMMENDATIONS_FORBIDDEN');
assert(graph.determinismBoundary?.genericEvidencePercentageAllowed === false, 'GRAPH_PERCENT_FORBIDDEN');
assert(graph.determinismBoundary?.crossCurrencyAggregationAllowed === false, 'GRAPH_CROSS_CURRENCY_FORBIDDEN');
assert(graph.determinismBoundary?.everyOutputRequiresAlgorithmVersion === true, 'GRAPH_OUTPUT_VERSION');
assert(graph.determinismBoundary?.everyOutputRequiresEvidenceInputs === true, 'GRAPH_OUTPUT_EVIDENCE');
assert(graph.determinismBoundary?.everyOutputRequiresTruthState === true, 'GRAPH_OUTPUT_TRUTH');
assert(graph.recurrenceBoundary?.promotionState === 'CANDIDATE_ONLY', 'GRAPH_RECURRENCE_CANDIDATE_ONLY');
assert(graph.recurrenceBoundary?.truthState === 'OBSERVED', 'GRAPH_RECURRENCE_OBSERVED');
assert(graph.recurrenceBoundary?.minimumOccurrencesImplementationPin === 3, 'GRAPH_RECURRENCE_MIN_OCCURRENCES');
assert(graph.cashflowBoundary?.crossCurrencyCombinedTotal === false, 'GRAPH_CASHFLOW_CROSS_CURRENCY');
assert(graph.cashflowBoundary?.reconciledTruthRequiresReconciledMonthlyClose === true, 'GRAPH_CASHFLOW_RECONCILED_AUTHORITY');
assert(graph.persistence?.repositoryTransactional === true, 'GRAPH_TRANSACTION');
assert(graph.persistence?.replayIdempotent === true, 'GRAPH_REPLAY');
assert(graph.persistence?.physicalSchemaMigrationInThisSlice === false, 'GRAPH_SCHEMA_OVERCLAIM');

for (const marker of [
  '## Category foundation',
  '- Comida',
  '- Transporte',
  '- Suscripciones',
  '- Comisiones',
  '- Impuestos',
  'Categories are product-language groupings, not a formal accounting chart.'
]) assert(product.includes(marker), `PRODUCT_MARKER:${marker}`);

for (const marker of [
  '## Sensor V1',
  'LO QUE SABEMOS',
  'LO QUE TODAVÍA NO SABEMOS',
  'Deterministic recurring/category results are described as observations until their evidence threshold is met.'
]) assert(alpha2Ux.includes(marker), `UX_MARKER:${marker}`);

for (const marker of [
  '### RecurringPattern',
  'state        CANDIDATE | ACTIVE | DISMISSED | ENDED',
  'RECURRING_PATTERN_CONFIRMED'
]) assert(core.includes(marker), `CORE_MARKER:${marker}`);

for (const marker of [
  '## Slice G — Sensor V1',
  'deterministic merchant normalization, recurrence candidates, base categories, cashflow observations and explicit knowledge gaps',
  'No LLM, recommendation or automated financial advice enters this slice.'
]) assert(plan.includes(marker), `PLAN_MARKER:${marker}`);

const moduleUrl = pathToFileURL(path.join(root, 'spikes/physical-ingress/src/sensor-v1.js')).href;
const {
  ALPHA2_SENSOR_VERSION,
  ALPHA2_SENSOR_CATEGORY_VERSION,
  ALPHA2_SENSOR_RECURRENCE_VERSION,
  BASE_CATEGORIES,
  SensorTruthState,
  SENSOR_IMPLEMENTATION_POLICY,
  baseCategoryObservation,
  deriveRecurringCandidates,
  deriveCashflowObservations,
  buildSensorV1Snapshot,
  sensorV1StaticContract
} = await import(moduleUrl);

assert(ALPHA2_SENSOR_VERSION === 'A2_SENSOR_V1', 'SOURCE_VERSION');
assert(ALPHA2_SENSOR_CATEGORY_VERSION === 'A2_BASE_CATEGORY_V1', 'SOURCE_CATEGORY_VERSION');
assert(ALPHA2_SENSOR_RECURRENCE_VERSION === 'A2_RECURRENCE_CANDIDATE_V1', 'SOURCE_RECURRENCE_VERSION');
assert(JSON.stringify(Object.values(SensorTruthState)) === JSON.stringify(frozen.truthStates), 'SOURCE_TRUTH_STATES');
assert(JSON.stringify(BASE_CATEGORIES) === JSON.stringify(graph.model.baseCategories), 'SOURCE_BASE_CATEGORIES');
assert(SENSOR_IMPLEMENTATION_POLICY.recurrenceMinimumOccurrences === 3, 'SOURCE_RECURRENCE_MIN');
assert(SENSOR_IMPLEMENTATION_POLICY.recurringPromotionState === 'CANDIDATE_ONLY', 'SOURCE_RECURRENCE_CANDIDATE_ONLY');
assert(SENSOR_IMPLEMENTATION_POLICY.llmEnabled === false, 'SOURCE_LLM_FORBIDDEN');
assert(SENSOR_IMPLEMENTATION_POLICY.automatedFinancialAdvice === false, 'SOURCE_ADVICE_FORBIDDEN');
assert(SENSOR_IMPLEMENTATION_POLICY.crossCurrencyAggregation === false, 'SOURCE_CROSS_CURRENCY_FORBIDDEN');

const contract = sensorV1StaticContract();
assert(contract.deterministicOnly === true, 'SOURCE_DETERMINISTIC_ONLY');
assert(contract.llmEnabled === false, 'SOURCE_LLM_CONTRACT');
assert(contract.automatedFinancialAdvice === false, 'SOURCE_ADVICE_CONTRACT');
assert(contract.genericEvidencePercentageAllowed === false, 'SOURCE_PERCENT_CONTRACT');
assert(contract.crossCurrencyAggregationAllowed === false, 'SOURCE_CROSS_CURRENCY_CONTRACT');
assert(contract.recurrenceCandidateOnly === true, 'SOURCE_RECURRENCE_CONTRACT');
assert(contract.everyOutputRequiresAlgorithmVersion === true, 'SOURCE_OUTPUT_VERSION');
assert(contract.everyOutputRequiresEvidenceInputs === true, 'SOURCE_OUTPUT_EVIDENCE');
assert(contract.everyOutputRequiresTruthState === true, 'SOURCE_OUTPUT_TRUTH');
assert(contract.repositoryTransactional === true, 'SOURCE_TRANSACTION');
assert(contract.replayIdempotent === true, 'SOURCE_REPLAY');
assert(contract.physicalSchemaMigrationClaimed === false, 'SOURCE_SCHEMA_OVERCLAIM');
assert(contract.physicalSensorPassClaimed === false, 'SOURCE_PHYSICAL_OVERCLAIM');
assert(contract.alpha2ProductPassClaimed === false, 'SOURCE_ALPHA2_OVERCLAIM');
assert(contract.buildReady === false, 'SOURCE_BUILD_READY_OVERCLAIM');

const baseEvent = {
  id: 'validator-event-1',
  tenantId: 'validator-tenant',
  semanticType: 'FEE',
  amount: 10,
  currency: 'PEN',
  occurredAt: '2026-07-05T00:00:00.000Z',
  merchantCanonical: 'Synthetic Bank',
  accountId: 'validator-account',
  reconciliationState: 'RECONCILED'
};
const category = baseCategoryObservation(baseEvent);
assert(category.category === 'Comisiones', 'RUNTIME_FEE_CATEGORY');
const unknownCategory = baseCategoryObservation({ ...baseEvent, id: 'validator-event-2', semanticType: 'EXPENSE' });
assert(unknownCategory.category === null && unknownCategory.truthState === 'UNKNOWN', 'RUNTIME_UNKNOWN_CATEGORY');
const recurring = deriveRecurringCandidates([
  { ...baseEvent, id: 'rec-1', semanticType: 'EXPENSE', merchantCanonical: 'Synthetic Stream', occurredAt: '2026-06-05T00:00:00Z' },
  { ...baseEvent, id: 'rec-2', semanticType: 'EXPENSE', merchantCanonical: 'Synthetic Stream', occurredAt: '2026-07-05T00:00:00Z' },
  { ...baseEvent, id: 'rec-3', semanticType: 'EXPENSE', merchantCanonical: 'Synthetic Stream', occurredAt: '2026-08-05T00:00:00Z' }
]);
assert(recurring.length === 1 && recurring[0].state === 'CANDIDATE' && recurring[0].truthState === 'OBSERVED', 'RUNTIME_RECURRENCE');
const cashflow = deriveCashflowObservations([
  { ...baseEvent, id: 'pen', semanticType: 'EXPENSE', currency: 'PEN' },
  { ...baseEvent, id: 'usd', semanticType: 'EXPENSE', currency: 'USD' }
], []);
assert(cashflow.length === 2, 'RUNTIME_CROSS_CURRENCY_SPLIT');
const snapshot = buildSensorV1Snapshot({ tenantId: 'validator-tenant', canonicalEvents: [baseEvent] });
assert(snapshot.llmUsed === false, 'RUNTIME_LLM_0');
assert(snapshot.automatedFinancialAdvice === false, 'RUNTIME_ADVICE_0');
assert(snapshot.recommendations.length === 0, 'RUNTIME_RECOMMENDATIONS_0');
assert(snapshot.genericEvidencePercentage === null, 'RUNTIME_GENERIC_PERCENT_0');

for (const marker of [
  'normalizeMerchant',
  'CANDIDATE_ONLY',
  'CATEGORY_SIGNAL_INSUFFICIENT',
  'getSensorReplay',
  'putSensorOutput',
  'putSensorReplay',
  'SENSOR_RECOMMENDATION_FORBIDDEN',
  'SENSOR_NON_DETERMINISTIC_OUTPUT_FORBIDDEN'
]) assert(source.includes(marker), `SOURCE_MARKER:${marker}`);

for (const forbidden of [
  'OpenAI',
  'anthropic',
  'gemini',
  'recommendSpend',
  'financialAdvice(',
  'gmail.googleapis.com',
  'oauth2.googleapis.com',
  'writeFileSync('
]) assert(!source.includes(forbidden), `FORBIDDEN_SOURCE:${forbidden}`);

assert(/BUILD_READY\s+NO/.test(status), 'GLOBAL_BUILD_READY_STATUS');

console.log('ALPHA2_G_STATIC_IMPLEMENTATION=CANDIDATE');
console.log('ALPHA2_G_EXACT_SHA_RECEIPT=PENDING');
console.log('SENSOR_VERSION=A2_SENSOR_V1');
console.log('SENSOR_DETERMINISTIC_ONLY=1');
console.log('SENSOR_LLM_ENABLED=0');
console.log('SENSOR_AUTOMATED_FINANCIAL_ADVICE=0');
console.log('SENSOR_RECOMMENDATIONS=0');
console.log('SENSOR_GENERIC_EVIDENCE_PERCENTAGE=0');
console.log('SENSOR_CROSS_CURRENCY_AGGREGATION=0');
console.log('SENSOR_RECURRING_PROMOTION_ACTIVE=0');
console.log('PHYSICAL_SENSOR_PASS=0');
console.log('BUILD_READY=NO');
