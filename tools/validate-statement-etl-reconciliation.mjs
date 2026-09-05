import fs from 'node:fs';

const files = {
  graph: 'graph/statement-etl-reconciliation.json',
  registry: 'graph/statement-format-registry.json',
  specs: 'graph/statement-profile-specs-v1.json',
  discovery: 'mk0/01-mining-site/STATEMENT-REAL-FORMAT-DISCOVERY-2026-09-03.md',
  adr: 'mk0/11-decisions/ADR-035-STATEMENT-ETL-MONTHLY-RECONCILIATION.md',
  adrIndex: 'mk0/11-decisions/ADR-INDEX.md',
  architecture: 'mk0/04-architecture/STATEMENT-ETL-RECONCILIATION.md',
  geometryArchitecture: 'mk0/04-architecture/STATEMENT-GEOMETRIC-LAYOUT-CONTRACT.md',
  model: 'mk0/05-data-model/STATEMENT-RECONCILIATION-MODEL.md',
  coreModel: 'mk0/05-data-model/CORE-DATA-MODEL.md',
  design: 'mk0/03-design/MONTHLY-CLOSE-EXPERIENCE.md',
  productDesign: 'mk0/03-design/PRODUCT-DESIGN.md',
  tests: 'mk0/09-test/STATEMENT-ETL-TEST-MATRIX.md',
  plan: 'mk0/07-plan/STATEMENT-ADAPTER-ROLLOUT.md',
  pageClassifier: 'spikes/physical-ingress/src/statement-page-classifier.js',
  geometry: 'spikes/physical-ingress/src/statement-layout-geometry.js',
  profileAdapters: 'spikes/physical-ingress/src/statement-profile-row-adapters.js',
  importSession: 'spikes/physical-ingress/src/statement-import-session.js',
  pdfParser: 'spikes/physical-ingress/src/pdfjs-statement-parser.js',
  viewer: 'spikes/physical-ingress/live/owned-oauth-bank-statements-viewer.mjs',
  runner: 'spikes/physical-ingress/live/RUN-FINANCESENSOR-BANK-STATEMENTS.cmd',
  bcpFixture: 'spikes/physical-ingress/test/fixtures/statements/bcp-savings-layout-v1.js',
  interbankFixture: 'spikes/physical-ingress/test/fixtures/statements/interbank-savings-layout-v1.js',
  adapterTests: 'spikes/physical-ingress/test/statement-profile-row-adapters.test.js',
  livePolicyTests: 'spikes/physical-ingress/test/statement-live-layout-policy.test.js'
};

const failures = [];
const fail = message => failures.push(message);
const text = path => fs.readFileSync(path, 'utf8');
for (const path of Object.values(files)) if (!fs.existsSync(path)) fail(`missing ${path}`);

if (!failures.length) {
  const graph = JSON.parse(text(files.graph));
  const registry = JSON.parse(text(files.registry));
  const specs = JSON.parse(text(files.specs));
  const docs = Object.fromEntries(Object.entries(files).filter(([key]) => !['graph','registry','specs'].includes(key)).map(([key, path]) => [key, text(path)]));

  if (graph.schemaVersion !== 4) fail('ETL graph schema must be v4');
  if (registry.schemaVersion !== 3) fail('format registry schema must remain v3');
  if (specs.schemaVersion !== 1) fail('profile spec schema must remain v1');
  if (graph.status !== 'S5_BCP_SAVINGS_TRUSTED_EDGE_HARNESS_AWAITING_CI_PHYSICAL_OPEN') fail('ETL graph status drifted');
  if (registry.status !== 'S4_SAVINGS_STATIC_READY_REAL_PARSE_OPEN') fail('format registry static status drifted');
  if (specs.status !== 'S2_PROFILE_SPEC_V1_STATIC_ONLY') fail('profile spec status drifted');

  if (graph.product?.surface !== 'FLUTTER_MOBILE_APP') fail('product surface drifted from Flutter mobile');
  if (graph.product?.primaryPhysicalTarget !== 'ANDROID') fail('Android must remain primary physical target');
  if (graph.product?.desktopHarnessAuthority !== false) fail('desktop harness gained product authority');
  if (graph.buildReady !== false) fail('BUILD_READY must remain false');
  if (graph.iosTouched !== false) fail('iOS touch marker changed');

  const extract = graph.etl?.extract ?? {};
  const requiredExtract = {
    nativePdfTextFirst: true,
    ocrFallback: true,
    ocrIsPrimary: false,
    pageBoundaryPreserved: true,
    textItemGeometryPreserved: true,
    flattenedTextColumnAuthority: false,
    pageRoleClassificationBeforeRows: true,
    activePdfContentExecution: false,
    formFieldFinancialAuthority: false,
    embeddedEducationalReferenceParse: false,
    documentIdentityConsistencyCheck: true,
    rawDurable: false,
    passwordDurable: false
  };
  for (const [key, expected] of Object.entries(requiredExtract)) if (extract[key] !== expected) fail(`extract.${key} must be ${expected}`);

  const transform = graph.etl?.transform ?? {};
  if (transform.bankSpecificLayoutInCore !== false) fail('bank layout leaked into core');
  if (transform.headerAnchoredGeometryAdapters !== true) fail('header-anchored geometry contract missing');
  if (transform.absoluteDeviceCoordinateParsers !== false) fail('absolute coordinate parser authorized');
  if (transform.separateBalanceEffectFromCashflowDirection !== true) fail('balance and cashflow semantics collapsed');

  const harness = graph.trustedEdgeHarness ?? {};
  if (harness.runtime !== 'WINDOWS_NODE_MK0_EVIDENCE_HARNESS_ONLY') fail('trusted-edge harness runtime drifted');
  if (harness.oauthScope !== 'gmail.readonly') fail('statement harness OAuth scope broadened');
  if (harness.desktopHarnessAuthority !== undefined) fail('desktop authority belongs to product boundary, not harness override');
  if (harness.historicalWriterConcurrencyGuard !== true) fail('shared-vault writer guard missing');
  if (JSON.stringify(harness.enabledProfiles) !== JSON.stringify(['PE-BCP-SAVINGS-REQUESTED'])) fail('physical harness enabled-profile set drifted');
  if (harness.creditImportPolicy !== 'BLOCKED_UNTIL_PROFILE_ADAPTER_READY') fail('credit physical import became enabled');
  if (harness.interbankSavingsLocalFilePath !== 'OPEN_NOT_IMPLEMENTED') fail('Interbank local-file debt was falsely closed');
  if (harness.layoutReviewPolicy !== 'FAIL_CLOSED_BEFORE_VAULT_MUTATION') fail('layout review no longer fails closed before write');
  if (harness.zeroMovementPolicy !== 'FAIL_CLOSED_BEFORE_VAULT_MUTATION') fail('zero-movement parse can falsely pass');
  if (harness.rawPdfDurable !== false || harness.layoutPlaintextDurable !== false || harness.passwordDurable !== false) fail('trusted-edge raw/password durability weakened');
  if (harness.physicalExecution !== 'OPEN') fail('physical execution falsely promoted');

  if (graph.etl?.load?.durableRawPdf !== false || graph.etl?.load?.durableRawEmailBody !== false || graph.etl?.load?.durableOcrText !== false) fail('raw durability weakened');
  if (graph.etl?.load?.idempotentReplayRequired !== true) fail('idempotent replay requirement missing');
  if (graph.reconciliation?.weakAmountDateOnlyAutoMerge !== false) fail('weak auto merge enabled');
  if (graph.reconciliation?.gmailAndStatementSameEventCreatesDuplicate !== false) fail('same Gmail+statement event may duplicate');
  if (graph.reconciliation?.statementOnlyMayCreateIncome !== true) fail('statement-only inflow support missing');
  if (graph.reconciliation?.cardPaymentMayBecomeIncome !== false) fail('card payment may become income');
  if (graph.monthlyClose?.singleCompletenessPercentAuthoritative !== false) fail('single completeness percent became authoritative');
  if (graph.monthlyClose?.reconciledMeansProductionReady !== false) fail('reconciled month promoted to production-ready');

  const laws = [
    'BANK_FORMAT_A != BANK_FORMAT_B',
    'BANK_ADAPTER != CORE_FINANCIAL_MODEL',
    'DOCUMENT_CLASSIFIED != ROWS_TRUSTED',
    'PAGE_ROLE_UNKNOWN != PARSE_ANYWAY',
    'EDUCATIONAL_REFERENCE_PAGE != TRANSACTION_LEDGER',
    'PDF_ACTIVE_CONTENT != FINANCIAL_AUTHORITY',
    'NATIVE_TEXT_PRESENT != REAL_ROW_PARSE_PASS',
    'FLATTENED_TEXT != COLUMN_SEMANTICS',
    'HEADER_POSITION != ABSOLUTE_DEVICE_COORDINATE',
    'FIXTURE_READY != REAL_PARSE_PASS',
    'STATIC_ADAPTER_PASS != REAL_PARSE_PASS',
    'STATIC_READY != ANDROID_PHYSICAL_PROVEN',
    'TRUSTED_EDGE_HARNESS_READY != PHYSICAL_PASS',
    'DESKTOP_HARNESS_PASS != MOBILE_PHYSICAL_PASS',
    'CREDIT_PROFILE_DETECTED != CREDIT_PROFILE_IMPORT_ENABLED',
    'OCR_OUTPUT != FINANCIAL_EVENT',
    'GMAIL_EVIDENCE != BANK_LEDGER_EVIDENCE',
    'APK_COMPILED != REAL_EECC_PROVEN',
    'REAL_EECC_PROVEN != PRODUCTION_READY'
  ];
  for (const law of laws) if (!graph.truthLaws?.includes(law)) fail(`graph missing truth law: ${law}`);

  for (const law of ['BANK_FORMAT_A != BANK_FORMAT_B','BANK_ADAPTER != CORE_FINANCIAL_MODEL','OCR_OUTPUT != FINANCIAL_EVENT','GMAIL_EVIDENCE != BANK_LEDGER_EVIDENCE','APK_COMPILED != REAL_EECC_PROVEN','REAL_EECC_PROVEN != PRODUCTION_READY']) {
    if (!docs.adr.includes(law)) fail(`ADR-035 missing truth law: ${law}`);
  }
  for (const law of ['DOCUMENT_CLASSIFIED != ROWS_TRUSTED','PAGE_ROLE_UNKNOWN != PARSE_ANYWAY','EDUCATIONAL_REFERENCE_PAGE != TRANSACTION_LEDGER','PDF_ACTIVE_CONTENT != FINANCIAL_AUTHORITY','NATIVE_TEXT_PRESENT != REAL_ROW_PARSE_PASS']) {
    if (!docs.discovery.includes(law)) fail(`real-format discovery missing law: ${law}`);
  }
  for (const law of ['FLATTENED_TEXT != COLUMN_SEMANTICS','HEADER_POSITION != ABSOLUTE_DEVICE_COORDINATE','RUNNING_BALANCE != MOVEMENT_AMOUNT','STATIC_ADAPTER_PASS != ANDROID_PHYSICAL_PASS']) {
    if (!docs.geometryArchitecture.includes(law)) fail(`geometry architecture missing law: ${law}`);
  }

  const rules = registry.rules ?? {};
  if (rules.oneUniversalParser !== false || rules.unknownSignatureFailsClosed !== true) fail('registry parser boundary drifted');
  if (rules.pageRoleClassificationRequired !== true || rules.embeddedEducationalSamplesFailClosed !== true) fail('registry page-role boundary drifted');
  if (rules.activePdfContentExecutionForbidden !== true || rules.formFieldsAreFinancialAuthority !== false) fail('registry passive-PDF boundary drifted');
  if (rules.geometryRequiredWhenColumnsCarrySemantics !== true || rules.flattenedTextIsColumnAuthority !== false || rules.absoluteDeviceCoordinatesForbidden !== true) fail('registry geometry boundary drifted');
  if (rules.realPrivateContentInRepository !== false || rules.adapterVersionRequired !== true) fail('registry privacy/version boundary drifted');

  const corpus = registry.observedCorpus ?? {};
  if (corpus.privateOwnedDocuments !== 4 || corpus.institutions !== 3 || corpus.profilesObserved !== 4) fail('sanitized corpus counts drifted');
  if (corpus.rawArtifactsCommitted !== 0 || corpus.rawStatementTextCommitted !== 0 || corpus.piiCommitted !== 0 || corpus.realFinancialValuesCommitted !== 0) fail('private corpus publication boundary weakened');
  if (corpus.physicalRowParseClaimed !== false) fail('real row parse falsely promoted');

  const staticWork = registry.staticWork ?? {};
  if (staticWork.ciStatus !== 'PASS_SYNTHETIC' || staticWork.ciRunId !== 33828461944 || staticWork.ciJobId !== 100886097801) fail('synthetic savings CI receipt drifted');
  if (staticWork.realParseClaimed !== false) fail('static work falsely claims real parse');

  const profiles = registry.profiles ?? [];
  for (const id of ['PE-BCP-SAVINGS-REQUESTED','PE-INTERBANK-SAVINGS-REQUESTED']) {
    const profile = profiles.find(p => p.profileId === id);
    if (!profile || profile.adapterStatus !== 'STATIC_READY' || profile.staticAdapter !== 'PASS_SYNTHETIC_CI' || profile.realParse !== 'OPEN') fail(`${id} must remain STATIC_READY synthetic / realParse OPEN`);
  }
  for (const id of ['PE-BCP-CREDIT-MONTHLY','PE-RIPLEY-CREDIT-MONTHLY']) {
    const profile = profiles.find(p => p.profileId === id);
    if (!profile || profile.adapterStatus !== 'FORMAT_OBSERVED' || profile.realParse !== 'OPEN') fail(`${id} promoted beyond format observation`);
  }
  const interbankCredit = profiles.find(p => p.profileId === 'PE-INTERBANK-CREDIT-MONTHLY');
  if (!interbankCredit || interbankCredit.adapterStatus !== 'UNPROVEN') fail('Interbank credit must remain UNPROVEN');

  const specRules = specs.layoutContract ?? {};
  if (specRules.strategy !== 'HEADER_ANCHORED_GEOMETRIC_COLUMNS') fail('profile spec geometry strategy drifted');
  if (specRules.absoluteDeviceCoordinatesForbidden !== true || specRules.pageTextFlatteningSufficientForColumnSemantics !== false || specRules.textItemGeometryRequiredWhenColumnIdentityCarriesMeaning !== true || specRules.unknownHeaderGeometryFailsClosed !== true) fail('profile spec geometry safety drifted');
  if (specs.privacy?.rawPrivateDocumentsCommitted !== false || specs.privacy?.rawPrivateTextCommitted !== false || specs.privacy?.realFinancialValuesCommitted !== false || specs.privacy?.realIdentityValuesCommitted !== false) fail('profile spec privacy boundary weakened');

  if (graph.evidence?.profileRowAdapters !== 'SAVINGS_2_STATIC_READY_SYNTHETIC') fail('graph static adapter evidence drifted');
  if (graph.evidence?.syntheticAdapterCi !== 'PASS_RUN_33828461944_JOB_100886097801') fail('graph synthetic CI receipt drifted');
  if (graph.evidence?.bcpSavingsTrustedEdgeHarness !== 'IMPLEMENTED_AWAITING_CI') fail('trusted-edge harness state drifted');
  if (graph.evidence?.nativeTextRealParse !== 'OPEN' || graph.evidence?.bcpSavingsRealParse !== 'OPEN') fail('real parse was falsely closed');
  if (graph.evidence?.creditStatementRealParse !== 'OPEN_BLOCKED') fail('credit real parse block drifted');
  if (graph.evidence?.interbankSavingsLocalFileImport !== 'OPEN') fail('Interbank local-file import falsely closed');
  if (graph.evidence?.androidRealStatement !== 'OPEN') fail('Android real statement falsely closed');
  if (graph.evidence?.iosRealStatement !== 'DEFERRED_REQUIRED') fail('iOS debt altered');

  for (const marker of ['StatementPageRole','EDUCATIONAL_REFERENCE','TRANSACTION_LEDGER']) if (!docs.pageClassifier.includes(marker)) fail(`page classifier missing ${marker}`);
  for (const marker of ['findHeaderAnchors','columnBoundaries','lineToColumns','groupPageItemsIntoLines']) if (!docs.geometry.includes(marker)) fail(`geometry helper missing ${marker}`);
  for (const marker of ['parseBcpSavingsLayout','parseInterbankSavingsLayout','STATEMENT_PROFILE_ADAPTER_NOT_READY']) if (!docs.profileAdapters.includes(marker)) fail(`profile adapter missing ${marker}`);
  for (const marker of ['importStatementLayoutSession','STATEMENT_LAYOUT_REVIEW_REQUIRED','STATEMENT_LAYOUT_NO_MOVEMENTS']) if (!docs.importSession.includes(marker)) fail(`layout import session missing ${marker}`);
  if (!docs.pdfParser.includes('extractPasswordProtectedPdfLayout') || !docs.pdfParser.includes('isEvalSupported: false')) fail('passive PDF layout extraction boundary missing');

  for (const marker of ['PHYSICAL_LAYOUT_IMPORT_PROFILES','StatementProviderProfile.BCP_SAVINGS_REQUESTED','STATEMENT_PROFILE_PHYSICAL_HARNESS_NOT_ENABLED','CREDIT_STATEMENT_PHYSICAL_IMPORT=OPEN','INTERBANK_LOCAL_FILE_IMPORT=OPEN','LAYOUT_PLAINTEXT_DURABILITY=0']) {
    if (!docs.viewer.includes(marker)) fail(`trusted-edge viewer missing marker ${marker}`);
  }
  const enabledBlock = docs.viewer.match(/const PHYSICAL_LAYOUT_IMPORT_PROFILES = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? '';
  if (enabledBlock.includes('BCP_CREDIT') || enabledBlock.includes('RIPLEY_CREDIT') || enabledBlock.includes('INTERBANK_SAVINGS_REQUESTED')) fail('unproven physical profile enabled in viewer');
  if (docs.viewer.includes("from '../src/statement-row-parser.js'")) fail('trusted-edge viewer regained generic statement row parser fallback');
  if (!docs.runner.includes('Parser fisico habilitado ahora: BCP AHORRO') || !docs.runner.includes('Perfiles de credito: DETECTABLES pero IMPORTACION FISICA BLOQUEADA')) fail('launcher physical boundary drifted');
  if (!docs.livePolicyTests.includes('credit statement import remains physically blocked')) fail('live harness policy regression test missing');

  if (!docs.bcpFixture.includes('ABONO DEMO') || !docs.bcpFixture.includes('COMPRA DEMO')) fail('BCP fixture not synthetic');
  if (!docs.interbankFixture.includes('PLANILLA DEMO') || !docs.interbankFixture.includes('PAGO DEMO')) fail('Interbank fixture not synthetic');
  for (const forbiddenRealMarker of ['MERINO','72196046','193-78711976','4349-25','525435']) {
    if (docs.bcpFixture.includes(forbiddenRealMarker) || docs.interbankFixture.includes(forbiddenRealMarker)) fail(`private marker leaked into synthetic fixture: ${forbiddenRealMarker}`);
  }

  if (!docs.adrIndex.includes('| ADR-035 | Statement ETL and monthly reconciliation |') || !docs.adrIndex.includes('**Next available ADR:** `ADR-037`.')) fail('ADR index drifted');
  for (const marker of ['StatementMovementEvidence','ReconciliationLink','AccountPeriodCoverage','MonthlyClose']) if (!docs.model.includes(marker)) fail(`data model missing ${marker}`);
  if (!docs.coreModel.includes('GMAIL + STATEMENT SAME EVENT => ONE CANONICAL EVENT')) fail('core dedup invariant missing');
  if (!docs.architecture.includes('Page-role and region scoping')) fail('architecture lost page/region layer');
  if (!docs.design.includes('Es hora de cerrar tu mes')) fail('monthly-close UX marker missing');
  if (!docs.productDesign.includes('OBSERVED != RECONCILED')) fail('product truth language missing');
  if (!docs.tests.includes('PDF_ACTIVE_CONTENT != FINANCIAL_AUTHORITY')) fail('test matrix passive-PDF boundary missing');
  if (!docs.plan.includes('PAGE/REGION SCOPE BEFORE ROW PARSING')) fail('rollout plan structural rule missing');
}

if (failures.length) {
  console.error('FINANCESENSOR_STATEMENT_ETL_RECONCILIATION=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_STATEMENT_ETL_RECONCILIATION=PASS');
console.log('PRODUCT_SURFACE=FLUTTER_MOBILE_APP');
console.log('SAVINGS_STATIC_READY_PROFILES=2');
console.log('BCP_SAVINGS_TRUSTED_EDGE_HARNESS=IMPLEMENTED_AWAITING_CI');
console.log('BCP_SAVINGS_REAL_PARSE=OPEN');
console.log('CREDIT_STATEMENT_PHYSICAL_IMPORT=OPEN_BLOCKED');
console.log('INTERBANK_LOCAL_FILE_IMPORT=OPEN');
console.log('RAW_SOURCE_DURABLE=0');
console.log('LAYOUT_PLAINTEXT_DURABLE=0');
console.log('PDF_ACTIVE_CONTENT_EXECUTION=0');
console.log('ANDROID_REAL_STATEMENT=OPEN');
console.log('IOS_TOUCHED=0');
console.log('BUILD_READY=false');
