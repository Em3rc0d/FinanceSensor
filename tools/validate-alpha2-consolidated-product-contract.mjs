import fs from 'node:fs';

const paths = {
  graph: 'graph/alpha2-consolidated-product-contract.json',
  design: 'mk0/03-design/ALPHA2-CONSOLIDATED-MONEY-EXPERIENCE.md',
  architecture: 'mk0/04-architecture/ALPHA2-CONSOLIDATED-PIPELINE.md',
  dataModel: 'mk0/05-data-model/SOURCE-AUTHORITY-AND-CANONICAL-BINDINGS.md',
  wireframe: 'mk0/06-wireframes/WEB-CONSOLIDATED-DASHBOARD.md',
  plan: 'mk0/07-plan/ALPHA2-INTEGRATED-MILESTONE-PLAN.md',
  tests: 'mk0/09-test/ALPHA2-INTEGRATED-GATE-MATRIX.md',
  audit: 'mk0/10-evidence/EV-HUMAN-TEST-CONFIDENCE-AUDIT-2026-09-06.md',
  adr: 'mk0/11-decisions/ADR-037-DUAL-SOURCE-AUTHORITY-AND-WEB-PROJECTION.md',
};

const failures = [];
const assert = (value, message) => { if (!value) failures.push(message); };
for (const path of Object.values(paths)) assert(fs.existsSync(path), `missing ${path}`);
assert(!fs.existsSync('mk0/11-decisions/ADR-021-DUAL-SOURCE-AUTHORITY-AND-WEB-PROJECTION.md'), 'colliding ADR-021 alias must not exist');

if (!failures.length) {
  const graph = JSON.parse(fs.readFileSync(paths.graph, 'utf8'));
  const docs = Object.fromEntries(Object.entries(paths).filter(([key]) => key !== 'graph').map(([key, path]) => [key, fs.readFileSync(path, 'utf8')]));

  assert(graph.contract === 'ALPHA2_CONSOLIDATED_MONEY_V1', 'contract id');
  assert(graph.status === 'DESIGN_FROZEN_IMPLEMENTATION_OPEN', 'contract status');

  assert(graph.sources?.gmail?.primaryRole === 'LOW_LATENCY_TRANSACTION_EVENT_OBSERVATION', 'Gmail role');
  assert(graph.sources?.gmail?.defaultTruthState === 'OBSERVED', 'Gmail truth');
  assert(graph.sources?.gmail?.exclusiveExpenseSemantics === false, 'Gmail semantics must not be expense-only');
  assert(graph.sources?.gmail?.mayCompleteMonthAlone === false, 'Gmail cannot complete month alone');
  assert(graph.sources?.gmail?.rawServerStorageAllowed === false, 'raw Gmail server storage forbidden');
  assert(graph.sources?.gmail?.rawWebProjectionAllowed === false, 'raw Gmail web projection forbidden');

  assert(graph.sources?.statement?.primaryRole === 'PERIODIC_POSTED_ACCOUNT_TRUTH', 'statement role');
  assert(graph.sources?.statement?.incomeAuthority === true, 'statement income authority');
  assert(graph.sources?.statement?.expenseReconciliationAuthority === true, 'statement reconciliation authority');
  assert(graph.sources?.statement?.defaultTruthState === 'POSTED', 'statement truth');
  assert(graph.sources?.statement?.exclusiveIncomeSemantics === false, 'statement semantics must not be income-only');
  assert(graph.sources?.statement?.genericParserFallbackAllowed === false, 'generic statement parser fallback forbidden');

  assert(graph.canonicalLedger?.sourceObservationIsCanonicalTransaction === false, 'observation/canonical boundary');
  assert(graph.canonicalLedger?.multiSourceBindingsRequired === true, 'multi-source bindings');
  assert(JSON.stringify(graph.canonicalLedger?.truthStates) === JSON.stringify(['UNKNOWN','PARTIAL','OBSERVED','POSTED','RECONCILED']), 'truth ladder');
  assert(graph.canonicalLedger?.directionEqualsEconomicMeaning === false, 'direction is not economic meaning');
  assert(graph.canonicalLedger?.duplicateSourceObservationsMayCreateDuplicateCanonicalMovements === false, 'duplicate canonical movements forbidden');
  assert(graph.canonicalLedger?.replayDeterministicRequired === true, 'deterministic replay required');

  assert(graph.evidenceUx?.publicNumericConfidenceAllowed === false, 'public numeric confidence forbidden');
  assert(graph.evidenceUx?.fixedEvidencePercentAllowed === false, 'fixed evidence percent forbidden');
  assert(graph.evidenceUx?.forbiddenCopy?.includes('96% evidencia'), '96% copy must be forbidden');
  assert(graph.evidenceUx?.internalMatchScoreIsProbability === false, 'match score cannot be probability');
  assert(graph.evidenceUx?.globalCoveragePercentAllowedWithoutExplicitDenominator === false, 'unqualified coverage percent forbidden');

  assert(graph.web?.gmailDirectAccessAllowed === false, 'web Gmail direct access forbidden');
  assert(graph.web?.gmailRefreshAuthorityAllowed === false, 'web Gmail refresh authority forbidden');
  assert(graph.web?.rawGmailBodyAllowed === false, 'web raw Gmail forbidden');
  assert(graph.web?.rawMimeAllowed === false, 'web raw MIME forbidden');
  assert(graph.web?.rawStatementPdfAllowed === false, 'web raw PDF forbidden');
  assert(graph.web?.pdfPasswordAllowed === false, 'web PDF password forbidden');
  assert(graph.web?.canonicalMinimizedProjectionRequired === true, 'canonical minimized projection required');

  assert(graph.mobile?.role === 'TRUSTED_ACQUISITION_EDGE', 'mobile role');
  for (const key of ['gmailOauthAuthorityLocal','statementDiscoveryLocal','statementParsingLocal','encryptedVaultLocal','reconciliationLocal','accountGraphLocal','coverageLocal','sensorLocal']) {
    assert(graph.mobile?.[key] === true, `mobile local authority ${key}`);
  }

  assert(graph.physicalTestCadence?.mode === 'MILESTONE_ONLY', 'physical cadence');
  assert(graph.physicalTestCadence?.perSliceApkRequestsAllowed === false, 'per-slice APK requests forbidden');
  assert(graph.physicalTestCadence?.nextPhysicalCandidateRequiresIntegratedExactShaGate === true, 'exact-SHA milestone gate');

  assert(graph.productionPolicy?.gmailRestrictedScopeProductionVerificationClosed === false, 'Google production verification must remain open');
  assert(graph.productionPolicy?.googleSecurityAssessmentExemptionClaimed === false, 'security-assessment exemption overclaim forbidden');
  assert(graph.productionPolicy?.q003MustRemainOpenUntilProviderProductionClosure === true, 'Q-003 provider gate');

  assert(graph.claims?.designFrozen === true, 'design frozen claim');
  assert(graph.claims?.alpha2MobileIntegrated === false, 'mobile integrated overclaim forbidden');
  assert(graph.claims?.buildReady === false, 'build ready must remain false');
  assert(graph.claims?.releaseReady === false, 'release ready must remain false');

  for (const marker of ['PRIMARY ACQUISITION ROLE != EXCLUSIVE ECONOMIC SEMANTICS', 'MATCH_SCORE != PROBABILITY', '96% evidencia']) {
    assert(docs.design.includes(marker), `design marker ${marker}`);
  }
  for (const marker of ['RAW_GMAIL_SERVER_STORAGE=FORBIDDEN', 'MONEY_LEFT_ACCOUNT != EXPENSE', 'WEB_DOWN != LEDGER_LOST']) {
    assert(docs.architecture.includes(marker), `architecture marker ${marker}`);
  }
  assert(docs.dataModel.includes('SOURCE_OBSERVATION != CANONICAL_TRANSACTION'), 'data-model observation boundary');
  assert(docs.wireframe.includes('Do not show `96% evidencia`.'), 'wireframe confidence ban');
  assert(docs.plan.includes('No new physical APK is requested for intermediate slices.'), 'plan no-churn rule');
  assert(docs.tests.includes('ANY_INTERNAL_GATE_FAILS'), 'test pre-physical gate');
  assert(docs.audit.includes('confidence = 0.96'), 'confidence audit root cause');
  assert(docs.adr.startsWith('# ADR-037 — Dual-source authority and web projection'), 'ADR numbering');
  assert(docs.adr.includes('PRIMARY_SOURCE_ROLE != EXCLUSIVE_SEMANTICS'), 'ADR source-role law');
}

if (failures.length) {
  console.error('ALPHA2_CONSOLIDATED_PRODUCT_CONTRACT=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ALPHA2_CONSOLIDATED_PRODUCT_CONTRACT=PASS');
console.log('ADR_DUAL_SOURCE=037');
console.log('DESIGN_FROZEN=YES');
console.log('PUBLIC_FIXED_EVIDENCE_PERCENT=FORBIDDEN');
console.log('GMAIL_DEFAULT_TRUTH=OBSERVED');
console.log('STATEMENT_DEFAULT_TRUTH=POSTED');
console.log('WEB_RAW_GMAIL_PDF=FORBIDDEN');
console.log('PHYSICAL_TEST_CADENCE=MILESTONE_ONLY');
console.log('ALPHA2_MOBILE_INTEGRATION=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
