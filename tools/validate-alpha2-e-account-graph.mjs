import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readText = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`ALPHA2_E_VALIDATION_FAILED:${message}`);
};

const graph = readJson('graph/alpha2-e-account-graph.json');
const alpha2C = readJson('graph/alpha2-c-financial-vault.json');
const design = readJson('graph/alpha2-design-freeze.json');
const model = readText('mk0/05-data-model/STATEMENT-RECONCILIATION-MODEL.md');
const core = readText('mk0/05-data-model/CORE-DATA-MODEL.md');
const adr036 = readText('mk0/11-decisions/ADR-036-ALPHA2-FINANCIAL-MEMORY.md');
const plan = readText('mk0/07-plan/ALPHA2-IMPLEMENTATION-AND-CERTIFICATION.md');
const source = readText('spikes/physical-ingress/src/account-graph.js');
const status = readText('STATUS.md');

assert(graph.slice === 'ALPHA_2_E', 'SLICE_ID');
assert(graph.status === 'STATIC_IMPLEMENTED_CI_PASS', 'STATIC_STATUS');
assert(graph.baseCommit === 'bae4faa6fdae434ece17b85fd38d44b45a4f3ffc', 'BASE_COMMIT');
assert(graph.claims?.staticImplementationPass === true, 'STATIC_PASS_REQUIRED');
assert(graph.claims?.physicalAccountGraphPass === false, 'PHYSICAL_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.alpha2ProductPass === false, 'ALPHA2_PRODUCT_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.buildReady === false, 'BUILD_READY_MUST_REMAIN_FALSE');

const receipt = graph.implementationReceipt;
assert(receipt?.pullRequest === 73, 'RECEIPT_PR');
assert(receipt?.candidateHeadSha === 'e39f3d38889cdc49bae1a24884000e1a01cbb753', 'RECEIPT_HEAD_SHA');
assert(receipt?.mergeCommitSha === 'ece68768a004306e78a1a9f6cc653169418c2479', 'RECEIPT_MERGE_SHA');
const workflows = new Map((receipt?.workflows ?? []).map(run => [run.name, run]));
for (const [name, runId, runNumber] of [
  ['FinanceSensor Statement ETL Contract', 33997998994, 93],
  ['FinanceSensor Gmail Historical', 33997999015, 135]
]) {
  const run = workflows.get(name);
  assert(run?.runId === runId, `RECEIPT_RUN_ID:${name}`);
  assert(run?.runNumber === runNumber, `RECEIPT_RUN_NUMBER:${name}`);
  assert(run?.conclusion === 'success', `RECEIPT_RUN_CONCLUSION:${name}`);
}
assert(workflows.size === 2, 'RECEIPT_WORKFLOW_COUNT');

assert(alpha2C.status === 'STATIC_IMPLEMENTED_CI_PASS', 'ALPHA2_C_DEPENDENCY');
assert(alpha2C.claims?.staticImplementationPass === true, 'ALPHA2_C_STATIC_PASS');
assert(alpha2C.claims?.physicalVaultPass === false, 'ALPHA2_C_PHYSICAL_BOUNDARY');
assert(design.buildReady === false, 'DESIGN_BUILD_READY_DRIFT');

const frozen = design.accountMappingPolicy;
assert(JSON.stringify(frozen?.states) === JSON.stringify([
  'UNMAPPED',
  'PROBABLE',
  'USER_CONFIRMED',
  'SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE'
]), 'DESIGN_MAPPING_STATES');
assert(frozen?.bankPlusCurrencySufficient === false, 'DESIGN_BANK_PLUS_CURRENCY');
assert(frozen?.stableEvidencePeriodsForAutomaticConfirmation === 2, 'DESIGN_TWO_PERIOD_RULE');

assert(graph.model?.version === 'A2_ACCOUNT_GRAPH_V1', 'GRAPH_VERSION');
assert(JSON.stringify(graph.model?.mappingStates) === JSON.stringify(frozen.states), 'GRAPH_MAPPING_STATES');
assert(graph.model?.bankPlusCurrencySufficient === false, 'GRAPH_BANK_PLUS_CURRENCY');
assert(graph.model?.stableEvidencePeriodsForAutomaticConfirmation === 2, 'GRAPH_TWO_PERIOD_RULE');
assert(graph.identityBoundary?.maskedHintPersistedAsDigest === true, 'GRAPH_MASKED_HINT_DIGEST');
assert(graph.identityBoundary?.unmaskedIdentifierDurable === false, 'GRAPH_UNMASKED_IDENTIFIER');
assert(graph.identityBoundary?.profileContractAuthorityRequiredForExactStableIdentifier === true, 'GRAPH_PROFILE_AUTHORITY');
assert(graph.automaticMapping?.maskedHintOneIndependentPeriod === 'PROBABLE', 'GRAPH_ONE_PERIOD');
assert(graph.automaticMapping?.maskedHintTwoIndependentPeriods === 'SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE', 'GRAPH_TWO_PERIODS');
assert(graph.automaticMapping?.institutionCurrencyKindOnly === 'PROBABLE_AT_MOST', 'GRAPH_BANK_CURRENCY_BOUNDARY');
assert(graph.statementPeriodOwnership?.probableOwnsPeriod === false, 'GRAPH_PROBABLE_OWNERSHIP');
assert(graph.statementPeriodOwnership?.userConfirmedOwnsPeriod === true, 'GRAPH_USER_CONFIRMED_OWNERSHIP');
assert(graph.statementPeriodOwnership?.systemConfirmedOwnsPeriod === true, 'GRAPH_SYSTEM_CONFIRMED_OWNERSHIP');
assert(graph.correctionAudit?.mergeTransactional === true, 'GRAPH_MERGE_TRANSACTION');
assert(graph.correctionAudit?.splitTransactional === true, 'GRAPH_SPLIT_TRANSACTION');
assert(graph.correctionAudit?.replayIdempotent === true, 'GRAPH_REPLAY');
assert(graph.schemaBoundary?.physicalSchemaMigrationInThisSlice === false, 'GRAPH_SCHEMA_OVERCLAIM');

for (const marker of [
  'Institution',
  'FinancialAccount',
  'PaymentInstrument',
  'masked_identifier?'
]) {
  assert(core.includes(marker), `CORE_MARKER:${marker}`);
}
for (const marker of [
  'UNMAPPED',
  'PROBABLE',
  'USER_CONFIRMED',
  'SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE',
  'A statement cannot update the wrong account merely because institution + currency match.',
  'Physical constraints remain subject to schema freeze'
]) {
  assert(model.includes(marker), `MODEL_MARKER:${marker}`);
}
for (const marker of [
  'Bank plus currency is insufficient for automatic confirmation.',
  'Coverage is multi-dimensional and per account/instrument-period'
]) {
  assert(adr036.includes(marker), `ADR036_MARKER:${marker}`);
}
for (const marker of [
  'Slice E — Account graph',
  'merge/split correction audit',
  'stable evidence across at least two independent statement periods',
  'Bank plus currency is never sufficient.'
]) {
  assert(plan.includes(marker), `PLAN_MARKER:${marker}`);
}

const moduleUrl = pathToFileURL(path.join(root, 'spikes/physical-ingress/src/account-graph.js')).href;
const {
  ALPHA2_ACCOUNT_GRAPH_VERSION,
  STABLE_EVIDENCE_PERIODS_REQUIRED,
  AccountMappingState,
  accountGraphStaticContract
} = await import(moduleUrl);
assert(ALPHA2_ACCOUNT_GRAPH_VERSION === 'A2_ACCOUNT_GRAPH_V1', 'SOURCE_VERSION');
assert(STABLE_EVIDENCE_PERIODS_REQUIRED === 2, 'SOURCE_TWO_PERIOD_RULE');
assert(JSON.stringify(Object.values(AccountMappingState)) === JSON.stringify(frozen.states), 'SOURCE_MAPPING_STATES');
const contract = accountGraphStaticContract();
assert(contract.bankPlusCurrencySufficient === false, 'SOURCE_BANK_PLUS_CURRENCY');
assert(contract.stableEvidencePeriodsRequired === 2, 'SOURCE_TWO_PERIOD_CONTRACT');
assert(contract.exactProfileStableIdentifierCanAutoConfirm === true, 'SOURCE_STABLE_ID');
assert(contract.maskedHintSinglePeriodCanAutoConfirm === false, 'SOURCE_ONE_PERIOD');
assert(contract.maskedHintPersistsAsDigest === true, 'SOURCE_HINT_DIGEST');
assert(contract.unmaskedIdentifierDurable === false, 'SOURCE_UNMASKED_IDENTIFIER');
assert(contract.statementOwnershipRequiresConfirmedMapping === true, 'SOURCE_OWNERSHIP_BOUNDARY');
assert(contract.mergeSplitCorrectionAudit === true, 'SOURCE_CORRECTION_AUDIT');
assert(contract.mergeSplitTransactional === true, 'SOURCE_CORRECTION_TRANSACTION');
assert(contract.replayIdempotent === true, 'SOURCE_REPLAY');
assert(contract.physicalSchemaMigrationClaimed === false, 'SOURCE_SCHEMA_OVERCLAIM');
assert(contract.physicalAccountGraphPassClaimed === false, 'SOURCE_PHYSICAL_OVERCLAIM');
assert(contract.buildReady === false, 'SOURCE_BUILD_READY_OVERCLAIM');

for (const marker of [
  'ACCOUNT_GRAPH_UNMASKED_IDENTIFIER_FORBIDDEN',
  'ACCOUNT_GRAPH_PROFILE_STABLE_IDENTIFIER_AUTHORITY_REQUIRED',
  'EXACT_PROFILE_STABLE_IDENTIFIER',
  'MASKED_HINT_SINGLE_PERIOD',
  'MASKED_HINT_STABLE_ACROSS_TWO_PERIODS',
  'INSTITUTION_CURRENCY_KIND_ONLY',
  'MASKED_HINT_AMBIGUOUS',
  'getAccountGraphReplay',
  'setStatementPeriodOwnership',
  'reassignStatementPeriods',
  'markAccountNodeMerged',
  'reassignSelectedStatementPeriods',
  'ACCOUNT_GRAPH_OWNER_TENANT_MISMATCH'
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

console.log('ALPHA2_E_STATIC_IMPLEMENTATION=PASS');
console.log('ALPHA2_E_EXACT_SHA_RECEIPT=PASS');
console.log(`ALPHA2_E_IMPLEMENTATION_HEAD=${receipt.candidateHeadSha}`);
console.log(`ALPHA2_E_MERGE_COMMIT=${receipt.mergeCommitSha}`);
console.log('ACCOUNT_GRAPH_VERSION=A2_ACCOUNT_GRAPH_V1');
console.log('MAPPING_STATES=4');
console.log('STABLE_EVIDENCE_PERIODS_REQUIRED=2');
console.log('BANK_PLUS_CURRENCY_AUTO_CONFIRM=0');
console.log('MASKED_HINT_ONE_PERIOD_AUTO_CONFIRM=0');
console.log('UNMASKED_IDENTIFIER_DURABLE=0');
console.log('MERGE_SPLIT_TRANSACTIONAL=1');
console.log('REAL_FINANCIAL_PLAINTEXT_IN_CI=0');
console.log('PHYSICAL_SCHEMA_MIGRATION_PASS=0');
console.log('PHYSICAL_ACCOUNT_GRAPH_PASS=0');
console.log('BUILD_READY=NO');
