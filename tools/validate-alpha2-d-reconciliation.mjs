import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readText = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`ALPHA2_D_VALIDATION_FAILED:${message}`);
};

const graph = readJson('graph/alpha2-d-reconciliation.json');
const alpha2B = readJson('graph/alpha2-b-statement-fetch-parse.json');
const alpha2C = readJson('graph/alpha2-c-financial-vault.json');
const design = readJson('graph/alpha2-design-freeze.json');
const model = readText('mk0/05-data-model/STATEMENT-RECONCILIATION-MODEL.md');
const plan = readText('mk0/07-plan/ALPHA2-IMPLEMENTATION-AND-CERTIFICATION.md');
const source = readText('spikes/physical-ingress/src/statement-reconciliation.js');
const status = readText('STATUS.md');

assert(graph.slice === 'ALPHA_2_D', 'SLICE_ID');
assert(graph.status === 'STATIC_IMPLEMENTED_CI_PENDING', 'STATIC_STATUS_PENDING');
assert(graph.baseCommit === '5ba43ddd44fcf7c77ce39b42f954316d7e7c8f0e', 'BASE_COMMIT');
assert(graph.implementationReceipt === null, 'IMPLEMENTATION_RECEIPT_MUST_BE_NULL_BEFORE_CI');
assert(graph.claims?.staticImplementationPass === false, 'STATIC_PASS_MUST_REMAIN_FALSE_BEFORE_EXACT_SHA_CI');
assert(graph.claims?.physicalReconciliationPass === false, 'PHYSICAL_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.alpha2ProductPass === false, 'ALPHA2_PRODUCT_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.buildReady === false, 'BUILD_READY_MUST_REMAIN_FALSE');

assert(alpha2B.status === 'STATIC_IMPLEMENTED_CI_PASS', 'ALPHA2_B_DEPENDENCY');
assert(alpha2B.claims?.staticImplementationPass === true, 'ALPHA2_B_STATIC_PASS');
assert(alpha2C.status === 'STATIC_IMPLEMENTED_CI_PASS', 'ALPHA2_C_DEPENDENCY');
assert(alpha2C.claims?.staticImplementationPass === true, 'ALPHA2_C_STATIC_PASS');
assert(alpha2C.claims?.physicalVaultPass === false, 'ALPHA2_C_PHYSICAL_BOUNDARY');
assert(design.buildReady === false, 'DESIGN_BUILD_READY_DRIFT');

const frozen = design.reconciliationPolicy;
assert(frozen?.version === 'A2_RECONCILIATION_V1', 'DESIGN_RESOLVER_VERSION');
assert(JSON.stringify(frozen?.outcomes) === JSON.stringify(['CONFIRMED','PROPOSED','REVIEW','REJECTED','CONFLICT']), 'DESIGN_OUTCOMES');
assert(frozen?.features?.amount === 30, 'DESIGN_WEIGHT_AMOUNT');
assert(frozen?.features?.timeDistance === 15, 'DESIGN_WEIGHT_TIME');
assert(frozen?.features?.institution === 10, 'DESIGN_WEIGHT_INSTITUTION');
assert(frozen?.features?.accountOrInstrument === 15, 'DESIGN_WEIGHT_ACCOUNT');
assert(frozen?.features?.merchantOrCounterparty === 10, 'DESIGN_WEIGHT_MERCHANT');
assert(frozen?.features?.externalReference === 15, 'DESIGN_WEIGHT_REFERENCE');
assert(frozen?.features?.movementCompatibility === 5, 'DESIGN_WEIGHT_MOVEMENT');
assert(frozen?.automaticConfirmation?.minimumScore === 85, 'DESIGN_MIN_SCORE');
assert(frozen?.automaticConfirmation?.minimumMarginOverSecondCandidate === 15, 'DESIGN_MIN_MARGIN');
assert(frozen?.automaticConfirmation?.requiresUniqueCandidate === true, 'DESIGN_UNIQUE_REQUIRED');
assert(frozen?.automaticConfirmation?.requiresIndependentChannels === true, 'DESIGN_INDEPENDENT_CHANNELS');
assert(frozen?.automaticConfirmation?.requiresAmountAndCurrency === true, 'DESIGN_AMOUNT_CURRENCY');
assert(frozen?.automaticConfirmation?.amountOnlyAllowed === false, 'DESIGN_AMOUNT_ONLY_FORBIDDEN');
assert(JSON.stringify(frozen?.automaticConfirmation?.requiresStableAnchor) === JSON.stringify([
  'EXACT_EXTERNAL_REFERENCE',
  'CONFIRMED_ACCOUNT_OR_INSTRUMENT_PLUS_STRONG_MERCHANT'
]), 'DESIGN_STABLE_ANCHORS');

assert(graph.resolver?.version === frozen.version, 'GRAPH_RESOLVER_VERSION');
assert(JSON.stringify(graph.resolver?.weights) === JSON.stringify(frozen.features), 'GRAPH_WEIGHTS');
assert(graph.resolver?.automaticConfirmation?.minimumScore === 85, 'GRAPH_MIN_SCORE');
assert(graph.resolver?.automaticConfirmation?.minimumMarginOverSecondCandidate === 15, 'GRAPH_MIN_MARGIN');
assert(graph.resolver?.automaticConfirmation?.amountOnlyAllowed === false, 'GRAPH_AMOUNT_ONLY');
assert(graph.resolver?.timeDistanceImplementation === 'EXACT_TIMESTAMP_ONLY_NO_UNFROZEN_WINDOW_ASSUMPTION', 'GRAPH_TIME_POLICY');
assert(graph.featureSnapshot?.immutable === true, 'GRAPH_IMMUTABLE_SNAPSHOT');
assert(graph.featureSnapshot?.rawSourceText === false, 'GRAPH_RAW_TEXT');
assert(graph.canonicalMerge?.sameTransaction === true, 'GRAPH_ATOMIC_CANONICAL_MERGE');
assert(graph.canonicalMerge?.transactionRechecksExistingCanonicalLinks === true, 'GRAPH_TOCTOU_RECHECK');
assert(graph.replay?.sameDecisionCreatesDuplicateCanonical === false, 'GRAPH_REPLAY_DUPLICATE');
assert(graph.schemaBoundary?.physicalSchemaMigrationInThisSlice === false, 'GRAPH_SCHEMA_OVERCLAIM');

for (const marker of [
  'ReconciliationLink',
  'MatchFeatureSnapshot',
  'Amount equality alone is insufficient',
  'ReconciliationLink(left_evidence_id, right_evidence_id, resolver_version)',
  'Physical constraints remain subject to schema freeze'
]) {
  assert(model.includes(marker), `MODEL_MARKER:${marker}`);
}
for (const marker of [
  'immutable feature snapshot v1',
  'canonical merge transaction',
  'amount-only automatic confirmation',
  'ambiguous equal-score automatic confirmation',
  'replay duplicate count'
]) {
  assert(plan.toLowerCase().includes(marker.toLowerCase()), `PLAN_MARKER:${marker}`);
}

const moduleUrl = pathToFileURL(path.join(root, 'spikes/physical-ingress/src/statement-reconciliation.js')).href;
const {
  ALPHA2_RECONCILIATION_VERSION,
  RECONCILIATION_WEIGHTS,
  AUTOMATIC_CONFIRMATION_POLICY,
  statementReconciliationStaticContract
} = await import(moduleUrl);
assert(ALPHA2_RECONCILIATION_VERSION === 'A2_RECONCILIATION_V1', 'SOURCE_VERSION');
assert(JSON.stringify(RECONCILIATION_WEIGHTS) === JSON.stringify(frozen.features), 'SOURCE_WEIGHTS');
assert(AUTOMATIC_CONFIRMATION_POLICY.minimumScore === 85, 'SOURCE_MIN_SCORE');
assert(AUTOMATIC_CONFIRMATION_POLICY.minimumMarginOverSecondCandidate === 15, 'SOURCE_MIN_MARGIN');
assert(AUTOMATIC_CONFIRMATION_POLICY.requiresIndependentChannels === true, 'SOURCE_INDEPENDENT_CHANNELS');
assert(AUTOMATIC_CONFIRMATION_POLICY.amountOnlyAllowed === false, 'SOURCE_AMOUNT_ONLY');
const contract = statementReconciliationStaticContract();
assert(contract.timeDistanceImplementation === 'EXACT_TIMESTAMP_ONLY_NO_UNFROZEN_WINDOW_ASSUMPTION', 'SOURCE_TIME_POLICY');
assert(contract.canonicalMergeTransactional === true, 'SOURCE_CANONICAL_TRANSACTION');
assert(contract.replayIdempotent === true, 'SOURCE_REPLAY');
assert(contract.amountOnlyAutoConfirmation === false, 'SOURCE_AMOUNT_ONLY_CONTRACT');
assert(contract.physicalSchemaMigrationClaimed === false, 'SOURCE_SCHEMA_OVERCLAIM');
assert(contract.physicalReconciliationPassClaimed === false, 'SOURCE_PHYSICAL_OVERCLAIM');
assert(contract.buildReady === false, 'SOURCE_BUILD_READY_OVERCLAIM');

for (const marker of [
  'TENANT_MISMATCH',
  'CURRENCY_MISMATCH',
  'ECONOMIC_SEMANTICS_INCOMPATIBLE',
  'SOURCE_CHANNEL_NOT_INDEPENDENT',
  'ALREADY_LINKED_CONFLICT',
  'SCOPE_ACCOUNT_OR_INSTRUMENT_MISMATCH',
  'SCOPE_STATEMENT_PERIOD_MISMATCH',
  'AMBIGUOUS_SCORE_MARGIN',
  'UNIQUE_STRONG_MATCH',
  'getReconciliationReplay',
  'getCanonicalEventIdByEvidence',
  'upsertCanonicalEvent',
  'putEvidenceCanonicalLink',
  'putFeatureSnapshot',
  'putReconciliationLink',
  'putReconciliationReplay',
  'RECONCILIATION_CANONICAL_CONFLICT'
]) {
  assert(source.includes(marker), `SOURCE_MARKER:${marker}`);
}

for (const forbidden of [
  'console.log(',
  'writeFileSync(',
  'localStorage',
  'sessionStorage',
  'gmail.googleapis.com',
  'oauth2.googleapis.com',
  'accounts.google.com'
]) {
  assert(!source.includes(forbidden), `FORBIDDEN_SOURCE:${forbidden}`);
}

assert(/BUILD_READY\s+NO/.test(status), 'GLOBAL_BUILD_READY_STATUS');

console.log('ALPHA2_D_STATIC_IMPLEMENTATION=CANDIDATE');
console.log('ALPHA2_D_EXACT_SHA_RECEIPT=PENDING');
console.log('RECONCILIATION_VERSION=A2_RECONCILIATION_V1');
console.log('AUTO_CONFIRM_MIN_SCORE=85');
console.log('AUTO_CONFIRM_MIN_MARGIN=15');
console.log('AMOUNT_ONLY_AUTO_CONFIRM=0');
console.log('AMBIGUOUS_EQUAL_SCORE_AUTO_CONFIRM=0');
console.log('CROSS_CURRENCY_AUTO_MATCH=0');
console.log('CANONICAL_MERGE_TRANSACTIONAL=1');
console.log('REPLAY_DUPLICATE_CANONICAL=0');
console.log('REAL_FINANCIAL_PLAINTEXT_IN_CI=0');
console.log('PHYSICAL_SCHEMA_MIGRATION_PASS=0');
console.log('PHYSICAL_RECONCILIATION_PASS=0');
console.log('BUILD_READY=NO');
