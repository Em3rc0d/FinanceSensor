import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const graph = JSON.parse(await readFile(new URL('graph/alpha2-design-freeze.json', root), 'utf8'));

assert.equal(graph.schemaVersion, 1);
assert.equal(graph.milestone, 'ALPHA_2_FINANCIAL_MEMORY');
assert.equal(graph.status, 'DESIGN_FROZEN');
assert.equal(graph.buildReady, false);
assert.equal(graph.implementationStarted, false);
assert.equal(graph.primaryStatementPath, 'TARGETED_GMAIL_DISCOVERY');
assert.equal(graph.gmailScope, 'https://www.googleapis.com/auth/gmail.readonly');

assert.equal(graph.nodes.length, 13);
assert.equal(new Set(graph.nodes.map((node) => node.id)).size, 13);
assert.ok(graph.nodes.every((node) => node.status === 'CLOSED_DESIGN'));

for (const path of [...new Set([...graph.nodes.map((node) => node.authority), ...graph.authorities])]) {
  await access(new URL(path, root));
}

const candidate = graph.discoveryCandidatePolicy;
assert.equal(candidate.downloadState, 'STRONG');
assert.ok(candidate.strongMinimumScore > candidate.probableMinimumScore);
assert.equal(candidate.durableRawMetadata, false);
assert.ok(candidate.hardStops.includes('PROFILE_MATCH_CONFLICT'));
assert.ok(candidate.hardStops.includes('ATTACHMENT_TOO_LARGE'));

assert.equal(graph.passwordPolicy.persistence, false);
assert.equal(graph.passwordPolicy.logging, false);
assert.equal(graph.passwordPolicy.analytics, false);
assert.equal(graph.passwordPolicy.cloud, false);
assert.equal(graph.passwordPolicy.crossInstitutionReuse, false);
assert.equal(graph.passwordPolicy.deterministicDartZeroizationClaimed, false);

assert.ok(Object.values(graph.rawBoundary).every((value) => value === false));
assert.equal(graph.vaultPolicy.databaseFamily, 'SQLCIPHER_4_X');
assert.equal(graph.vaultPolicy.dekBits, 256);
assert.equal(graph.vaultPolicy.plaintextFallback, false);
assert.equal(graph.vaultPolicy.platformWrappedDek, true);
assert.ok(graph.vaultPolicy.physicalInspectionTargets.includes('WAL'));
assert.ok(graph.vaultPolicy.physicalInspectionTargets.includes('CRASH_OUTPUT'));

const reconciliation = graph.reconciliationPolicy;
const weightTotal = Object.values(reconciliation.features).reduce((sum, weight) => sum + weight, 0);
assert.equal(weightTotal, 100);
assert.equal(reconciliation.automaticConfirmation.amountOnlyAllowed, false);
assert.equal(reconciliation.automaticConfirmation.requiresUniqueCandidate, true);
assert.equal(reconciliation.automaticConfirmation.requiresIndependentChannels, true);
assert.ok(reconciliation.automaticConfirmation.minimumMarginOverSecondCandidate > 0);
assert.ok(reconciliation.hardVetoes.includes('CURRENCY_MISMATCH'));
assert.ok(reconciliation.hardVetoes.includes('ECONOMIC_SEMANTICS_INCOMPATIBLE'));

assert.equal(graph.accountMappingPolicy.bankPlusCurrencySufficient, false);
assert.ok(graph.accountMappingPolicy.stableEvidencePeriodsForAutomaticConfirmation >= 2);
assert.equal(graph.monthlyCoveragePolicy.globalUnqualifiedPercentageAllowed, false);
assert.equal(graph.monthlyCoveragePolicy.reconciledRequiresAllIncludedExpectedSources, true);
assert.equal(graph.monthlyCoveragePolicy.reconciledRequiresZeroBlockingConflicts, true);
assert.equal(graph.sensorPolicy.deterministicOnly, true);
assert.equal(graph.sensorPolicy.llmEnabled, false);
assert.equal(graph.sensorPolicy.automatedFinancialAdvice, false);
assert.equal(graph.sensorPolicy.genericEvidencePercentageAllowed, false);

assert.deepEqual(graph.slices.map((slice) => slice.id), [
  'ALPHA_2_A',
  'ALPHA_2_B',
  'ALPHA_2_C',
  'ALPHA_2_D',
  'ALPHA_2_E',
  'ALPHA_2_F',
  'ALPHA_2_G'
]);
assert.equal(graph.physicalTruth.alpha2ProductPass, false);
assert.ok(graph.physicalTruth.openKnownEdges.length > 0);
assert.ok(graph.forbidden.includes('GENERIC_STATEMENT_PARSER'));
assert.ok(graph.forbidden.includes('BACKGROUND_GMAIL_DAEMON'));

console.log('ALPHA_2_DESIGN_FREEZE=PASS');
console.log(`DESIGN_NODES=${graph.nodes.length}/13`);
console.log('ALPHA_2_A=READY_TO_IMPLEMENT');
console.log('ALPHA_2_PRODUCT_PASS=NO');
console.log('BUILD_READY=NO');
