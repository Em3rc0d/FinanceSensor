import fs from 'node:fs';

const files = {
  graph: 'graph/statement-etl-reconciliation.json',
  registry: 'graph/statement-format-registry.json',
  specs: 'graph/statement-profile-specs-v1.json',
  discovery: 'mk0/01-mining-site/STATEMENT-REAL-FORMAT-DISCOVERY-2026-09-03.md',
  adr: 'mk0/11-decisions/ADR-035-STATEMENT-ETL-MONTHLY-RECONCILIATION.md',
  adrIndex: 'mk0/11-decisions/ADR-INDEX.md',
  architecture: 'mk0/04-architecture/STATEMENT-ETL-RECONCILIATION.md',
  model: 'mk0/05-data-model/STATEMENT-RECONCILIATION-MODEL.md',
  coreModel: 'mk0/05-data-model/CORE-DATA-MODEL.md',
  design: 'mk0/03-design/MONTHLY-CLOSE-EXPERIENCE.md',
  productDesign: 'mk0/03-design/PRODUCT-DESIGN.md',
  tests: 'mk0/09-test/STATEMENT-ETL-TEST-MATRIX.md',
  plan: 'mk0/07-plan/STATEMENT-ADAPTER-ROLLOUT.md',
  pageClassifier: 'spikes/physical-ingress/src/statement-page-classifier.js',
  geometry: 'spikes/physical-ingress/src/statement-layout-geometry.js',
  profileAdapters: 'spikes/physical-ingress/src/statement-profile-row-adapters.js',
  pdfParser: 'spikes/physical-ingress/src/pdfjs-statement-parser.js',
  bcpFixture: 'spikes/physical-ingress/test/fixtures/statements/bcp-savings-layout-v1.js',
  interbankFixture: 'spikes/physical-ingress/test/fixtures/statements/interbank-savings-layout-v1.js',
  adapterTests: 'spikes/physical-ingress/test/statement-profile-row-adapters.test.js'
};

const failures = [];
const fail = message => failures.push(message);
for (const path of Object.values(files)) {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
}

if (!failures.length) {
  const graph = JSON.parse(fs.readFileSync(files.graph, 'utf8'));
  const registry = JSON.parse(fs.readFileSync(files.registry, 'utf8'));
  const specs = JSON.parse(fs.readFileSync(files.specs, 'utf8'));
  const discovery = fs.readFileSync(files.discovery, 'utf8');
  const adr = fs.readFileSync(files.adr, 'utf8');
  const adrIndex = fs.readFileSync(files.adrIndex, 'utf8');
  const architecture = fs.readFileSync(files.architecture, 'utf8');
  const model = fs.readFileSync(files.model, 'utf8');
  const coreModel = fs.readFileSync(files.coreModel, 'utf8');
  const design = fs.readFileSync(files.design, 'utf8');
  const productDesign = fs.readFileSync(files.productDesign, 'utf8');
  const tests = fs.readFileSync(files.tests, 'utf8');
  const plan = fs.readFileSync(files.plan, 'utf8');
  const pageClassifier = fs.readFileSync(files.pageClassifier, 'utf8');
  const geometry = fs.readFileSync(files.geometry, 'utf8');
  const profileAdapters = fs.readFileSync(files.profileAdapters, 'utf8');
  const pdfParser = fs.readFileSync(files.pdfParser, 'utf8');
  const bcpFixture = fs.readFileSync(files.bcpFixture, 'utf8');
  const interbankFixture = fs.readFileSync(files.interbankFixture, 'utf8');
  const adapterTests = fs.readFileSync(files.adapterTests, 'utf8');

  if (graph.schemaVersion !== 3) fail('ETL graph schema must be v3');
  if (registry.schemaVersion !== 3) fail('format registry schema must be v3');
  if (specs.schemaVersion !== 1) fail('profile spec schema must be v1');
  if (graph.status !== 'DESIGN_ACCEPTED_S3_FIXTURES_S4_SAVINGS_ADAPTERS_AWAITING_CI') fail('ETL graph status drifted');
  if (registry.status !== 'S3_FIXTURES_READY_S4_SAVINGS_ADAPTERS_AWAITING_CI') fail('format registry status drifted');
  if (specs.status !== 'S2_PROFILE_SPEC_V1_STATIC_ONLY') fail('profile spec status drifted');

  if (graph.product?.surface !== 'FLUTTER_MOBILE_APP') fail('product surface drifted from Flutter mobile');
  if (graph.product?.primaryPhysicalTarget !== 'ANDROID') fail('Android must remain primary physical target');
  if (graph.product?.desktopHarnessAuthority !== false) fail('desktop harness gained product authority');
  if (graph.buildReady !== false) fail('BUILD_READY must remain false');
  if (graph.iosTouched !== false) fail('iOS touch marker changed');

  const extract = graph.etl?.extract ?? {};
  if (extract.nativePdfTextFirst !== true) fail('native PDF text must remain first strategy');
  if (extract.ocrFallback !== true || extract.ocrIsPrimary !== false) fail('OCR boundary drifted');
  if (extract.pageBoundaryPreserved !== true) fail('page boundaries must be preserved');
  if (extract.textItemGeometryPreserved !== true) fail('text item geometry must be preserved for column semantics');
  if (extract.flattenedTextColumnAuthority !== false) fail('flattened text became column authority');
  if (extract.pageRoleClassificationBeforeRows !== true) fail('page-role classification must precede rows');
  if (extract.activePdfContentExecution !== false) fail('active PDF execution must remain forbidden');
  if (extract.formFieldFinancialAuthority !== false) fail('form fields gained financial authority');
  if (extract.embeddedEducationalReferenceParse !== false) fail('educational reference pages became parse eligible');
  if (extract.rawDurable !== false || extract.passwordDurable !== false) fail('raw/password durability weakened');

  const transform = graph.etl?.transform ?? {};
  if (transform.bankSpecificLayoutInCore !== false) fail('bank-specific layout leaked into core');
  if (transform.headerAnchoredGeometryAdapters !== true) fail('header-anchored geometry adapter contract missing');
  if (transform.absoluteDeviceCoordinateParsers !== false) fail('absolute coordinate parser was authorized');
  if (transform.separateBalanceEffectFromCashflowDirection !== true) fail('balance effect and cashflow direction collapsed');

  const load = graph.etl?.load ?? {};
  if (load.durableRawPdf !== false || load.durableRawEmailBody !== false || load.durableOcrText !== false) fail('raw plaintext durability weakened');
  if (load.idempotentReplayRequired !== true) fail('idempotent replay requirement missing');

  if (graph.reconciliation?.weakAmountDateOnlyAutoMerge !== false) fail('weak amount/date-only auto merge enabled');
  if (graph.reconciliation?.gmailAndStatementSameEventCreatesDuplicate !== false) fail('same Gmail+statement event may duplicate');
  if (graph.reconciliation?.statementOnlyMayCreateIncome !== true) fail('statement-only inflow support missing');
  if (graph.reconciliation?.cardPaymentMayBecomeIncome !== false) fail('card payment may become income');
  if (graph.monthlyClose?.singleCompletenessPercentAuthoritative !== false) fail('single completeness percent became authoritative');
  if (graph.monthlyClose?.reconciledMeansProductionReady !== false) fail('monthly close promoted to production-ready');

  for (const state of ['OPEN_LIVE','WAITING_FOR_STATEMENTS','IMPORTING','RECONCILING','REVIEW_REQUIRED','RECONCILED','REOPENED']) {
    if (!graph.monthlyClose?.states?.includes(state)) fail(`missing monthly-close state ${state}`);
  }

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
    'OCR_OUTPUT != FINANCIAL_EVENT',
    'GMAIL_EVIDENCE != BANK_LEDGER_EVIDENCE',
    'APK_COMPILED != REAL_EECC_PROVEN',
    'REAL_EECC_PROVEN != PRODUCTION_READY'
  ];
  for (const law of laws) {
    if (!graph.truthLaws?.includes(law)) fail(`graph missing truth law: ${law}`);
  }
  for (const law of ['BANK_FORMAT_A != BANK_FORMAT_B','BANK_ADAPTER != CORE_FINANCIAL_MODEL','OCR_OUTPUT != FINANCIAL_EVENT','GMAIL_EVIDENCE != BANK_LEDGER_EVIDENCE','APK_COMPILED != REAL_EECC_PROVEN','REAL_EECC_PROVEN != PRODUCTION_READY']) {
    if (!adr.includes(law)) fail(`ADR-035 missing truth law: ${law}`);
  }
  for (const law of ['DOCUMENT_CLASSIFIED != ROWS_TRUSTED','PAGE_ROLE_UNKNOWN != PARSE_ANYWAY','EDUCATIONAL_REFERENCE_PAGE != TRANSACTION_LEDGER','PDF_ACTIVE_CONTENT != FINANCIAL_AUTHORITY','NATIVE_TEXT_PRESENT != REAL_ROW_PARSE_PASS']) {
    if (!discovery.includes(law)) fail(`real-format discovery missing law: ${law}`);
  }

  const rules = registry.rules ?? {};
  if (rules.oneUniversalParser !== false) fail('registry allowed universal parser');
  if (rules.unknownSignatureFailsClosed !== true) fail('unknown signature no longer fails closed');
  if (rules.pageRoleClassificationRequired !== true) fail('page-role classification no longer required');
  if (rules.embeddedEducationalSamplesFailClosed !== true) fail('educational samples no longer fail closed');
  if (rules.activePdfContentExecutionForbidden !== true) fail('active PDF execution allowed');
  if (rules.formFieldsAreFinancialAuthority !== false) fail('form fields promoted to financial authority');
  if (rules.geometryRequiredWhenColumnsCarrySemantics !== true) fail('geometry requirement missing');
  if (rules.flattenedTextIsColumnAuthority !== false) fail('flattened text promoted to column authority');
  if (rules.absoluteDeviceCoordinatesForbidden !== true) fail('absolute coordinate parser no longer forbidden');
  if (rules.realPrivateContentInRepository !== false) fail('registry permits private corpus in repository');
  if (rules.adapterVersionRequired !== true) fail('adapter versioning no longer mandatory');

  const corpus = registry.observedCorpus ?? {};
  if (corpus.privateOwnedDocuments !== 4 || corpus.institutions !== 3 || corpus.profilesObserved !== 4) fail('sanitized real-format corpus counts drifted');
  if (corpus.rawArtifactsCommitted !== 0 || corpus.rawStatementTextCommitted !== 0 || corpus.piiCommitted !== 0 || corpus.realFinancialValuesCommitted !== 0) fail('private corpus publication boundary weakened');
  if (corpus.physicalRowParseClaimed !== false) fail('real row parse falsely promoted');

  const staticWork = registry.staticWork ?? {};
  if (staticWork.profileSpec !== files.specs) fail('profile spec path mismatch');
  if (staticWork.geometricFixtures !== 2 || staticWork.implementedSavingsAdapters !== 2) fail('static savings work counts drifted');
  if (staticWork.ciStatus !== 'AWAITING_PR_CI') fail('static work prematurely marked CI pass');
  if (staticWork.realParseClaimed !== false) fail('static work falsely claims real parse');

  const profiles = registry.profiles ?? [];
  const bcpSavings = profiles.find(p => p.profileId === 'PE-BCP-SAVINGS-REQUESTED');
  const interbankSavings = profiles.find(p => p.profileId === 'PE-INTERBANK-SAVINGS-REQUESTED');
  const bcpCredit = profiles.find(p => p.profileId === 'PE-BCP-CREDIT-MONTHLY');
  const ripleyCredit = profiles.find(p => p.profileId === 'PE-RIPLEY-CREDIT-MONTHLY');
  const interbankCredit = profiles.find(p => p.profileId === 'PE-INTERBANK-CREDIT-MONTHLY');
  for (const profile of [bcpSavings, interbankSavings]) {
    if (!profile || profile.adapterStatus !== 'FIXTURE_READY' || profile.staticAdapter !== 'IMPLEMENTED_AWAITING_CI' || profile.realParse !== 'OPEN') fail('savings profile must remain FIXTURE_READY / awaiting CI / realParse OPEN');
  }
  for (const profile of [bcpCredit, ripleyCredit]) {
    if (!profile || profile.adapterStatus !== 'FORMAT_OBSERVED' || profile.realParse !== 'OPEN') fail('credit profile promoted beyond format observation');
  }
  if (!interbankCredit || interbankCredit.adapterStatus !== 'UNPROVEN' || interbankCredit.realParse !== 'OPEN') fail('Interbank credit must remain UNPROVEN');
  if (profiles.some(p => ['STATIC_READY','ANDROID_PHYSICAL_PROVEN','CROSS_PLATFORM_PHYSICAL_PROVEN','PHYSICAL_PROVEN','SUPPORTED','PRODUCTION_CANDIDATE'].includes(p.adapterStatus))) fail('profile promoted beyond current evidence');

  for (const required of ['HEADER_GEOMETRY_TESTS','EMBEDDED_EXAMPLE_NEGATIVE_FIXTURE','ACTIVE_CONTENT_NON_EXECUTION_GUARD']) {
    if (!registry.promotionRequirements?.includes(required)) fail(`registry missing promotion requirement ${required}`);
  }
  for (const forbidden of ['FIXTURE_READY=>REAL_PARSE_PASS','STATIC_ADAPTER_PASS=>REAL_PARSE_PASS','ANDROID_PARSE_PASS=>IOS_PARSE_PASS']) {
    if (!registry.forbiddenPromotions?.includes(forbidden)) fail(`registry missing forbidden promotion ${forbidden}`);
  }

  const specRules = specs.layoutContract ?? {};
  if (specRules.strategy !== 'HEADER_ANCHORED_GEOMETRIC_COLUMNS') fail('profile spec layout strategy drifted');
  if (specRules.absoluteDeviceCoordinatesForbidden !== true) fail('profile spec allows absolute coordinates');
  if (specRules.pageTextFlatteningSufficientForColumnSemantics !== false) fail('profile spec says flattened text is sufficient');
  if (specRules.textItemGeometryRequiredWhenColumnIdentityCarriesMeaning !== true) fail('profile spec geometry requirement missing');
  if (specRules.unknownHeaderGeometryFailsClosed !== true) fail('unknown header geometry no longer fails closed');
  if (specs.privacy?.rawPrivateDocumentsCommitted !== false || specs.privacy?.rawPrivateTextCommitted !== false || specs.privacy?.realFinancialValuesCommitted !== false || specs.privacy?.realIdentityValuesCommitted !== false) fail('profile spec privacy boundary weakened');

  const specProfiles = specs.profiles ?? [];
  for (const id of ['PE-BCP-SAVINGS-REQUESTED','PE-INTERBANK-SAVINGS-REQUESTED']) {
    const profile = specProfiles.find(p => p.profileId === id);
    if (!profile || profile.status !== 'FIXTURE_READY' || profile.realParse !== 'OPEN') fail(`${id} profile spec not FIXTURE_READY / realParse OPEN`);
  }
  for (const id of ['PE-BCP-CREDIT-MONTHLY','PE-RIPLEY-CREDIT-MONTHLY']) {
    const profile = specProfiles.find(p => p.profileId === id);
    if (!profile || profile.status !== 'FORMAT_OBSERVED' || profile.realParse !== 'OPEN') fail(`${id} profile spec promoted unexpectedly`);
  }
  for (const law of ['FLATTENED_TEXT != COLUMN_SEMANTICS','RUNNING_BALANCE != MOVEMENT_AMOUNT','FIXTURE_READY != REAL_PARSE_PASS','STATIC_ADAPTER_PASS != ANDROID_PHYSICAL_PASS']) {
    if (!specs.truthLaws?.includes(law)) fail(`profile spec missing truth law ${law}`);
  }

  for (const marker of ['StatementPageRole','EDUCATIONAL_REFERENCE','TRANSACTION_LEDGER']) {
    if (!pageClassifier.includes(marker)) fail(`page classifier missing ${marker}`);
  }
  for (const marker of ['findHeaderAnchors','columnBoundaries','lineToColumns','groupPageItemsIntoLines']) {
    if (!geometry.includes(marker)) fail(`layout geometry helper missing ${marker}`);
  }
  for (const marker of ['parseBcpSavingsLayout','parseInterbankSavingsLayout','STATEMENT_PROFILE_ADAPTER_NOT_READY']) {
    if (!profileAdapters.includes(marker)) fail(`profile adapter missing ${marker}`);
  }
  if (!pdfParser.includes('extractPasswordProtectedPdfLayout')) fail('PDF parser missing layout extraction');
  if (!pdfParser.includes('isEvalSupported: false')) fail('PDF parser lost passive eval guard');
  if (!bcpFixture.includes('ABONO DEMO') || !bcpFixture.includes('COMPRA DEMO')) fail('BCP fixture not synthetic/structural');
  if (!interbankFixture.includes('PLANILLA DEMO') || !interbankFixture.includes('PAGO DEMO')) fail('Interbank fixture not synthetic/structural');
  for (const forbiddenRealMarker of ['MERINO','72196046','193-78711976','4349-25','525435']) {
    if (bcpFixture.includes(forbiddenRealMarker) || interbankFixture.includes(forbiddenRealMarker)) fail(`real/private marker leaked into synthetic fixtures: ${forbiddenRealMarker}`);
  }
  for (const marker of ['opening balance must not become movement','running balances must not become movements','educational reference page must remain excluded']) {
    if (!adapterTests.includes(marker)) fail(`adapter tests missing negative assertion: ${marker}`);
  }

  if (!adrIndex.includes('| ADR-035 | Statement ETL and monthly reconciliation |')) fail('ADR index missing ADR-035');
  if (!adrIndex.includes('**Next available ADR:** `ADR-036`.')) fail('ADR index next marker is not ADR-036');
  for (const marker of ['StatementMovementEvidence','ReconciliationLink','AccountPeriodCoverage','MonthlyClose']) {
    if (!model.includes(marker)) fail(`data model missing ${marker}`);
  }
  if (!coreModel.includes('GMAIL + STATEMENT SAME EVENT => ONE CANONICAL EVENT')) fail('core model lost Gmail+statement dedup invariant');
  if (!architecture.includes('Page-role and region scoping')) fail('architecture lost page-role/region layer');
  if (!design.includes('Es hora de cerrar tu mes')) fail('monthly-close UX marker missing');
  if (!productDesign.includes('OBSERVED != RECONCILED')) fail('product design truth language missing');
  if (!tests.includes('PDF_ACTIVE_CONTENT != FINANCIAL_AUTHORITY')) fail('test matrix lost active-PDF boundary');
  if (!plan.includes('PAGE/REGION SCOPE BEFORE ROW PARSING')) fail('rollout plan lost structural scope rule');
}

if (failures.length) {
  console.error('FINANCESENSOR_STATEMENT_ETL_RECONCILIATION=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_STATEMENT_ETL_RECONCILIATION=PASS');
console.log('PRODUCT_SURFACE=FLUTTER_MOBILE_APP');
console.log('RAW_SOURCE_DURABLE=0');
console.log('NATIVE_PDF_TEXT_FIRST=1');
console.log('PDF_ITEM_GEOMETRY_PRESERVED=1');
console.log('FLATTENED_TEXT_COLUMN_AUTHORITY=0');
console.log('HEADER_ANCHORED_GEOMETRY_ADAPTERS=1');
console.log('ABSOLUTE_DEVICE_COORDINATE_PARSERS=0');
console.log('PAGE_ROLE_BEFORE_ROWS=1');
console.log('ROW_ELIGIBLE_PAGE_ROLE=TRANSACTION_LEDGER_ONLY');
console.log('PDF_ACTIVE_CONTENT_EXECUTION=0');
console.log('PRIVATE_FORMAT_DOCUMENTS=4');
console.log('PRIVATE_FORMAT_INSTITUTIONS=3');
console.log('SAVINGS_FIXTURE_READY_PROFILES=2');
console.log('SAVINGS_STATIC_ADAPTERS_IMPLEMENTED=2');
console.log('STATIC_ADAPTER_CI=AWAITING_PR_CI');
console.log('REAL_ROW_PARSE=OPEN');
console.log('ANDROID_REAL_STATEMENT=OPEN');
console.log('IOS_TOUCHED=0');
console.log('BUILD_READY=false');
