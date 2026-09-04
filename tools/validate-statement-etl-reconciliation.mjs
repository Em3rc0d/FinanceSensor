import fs from 'node:fs';

const files = {
  graph: 'graph/statement-etl-reconciliation.json',
  registry: 'graph/statement-format-registry.json',
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
  rowParser: 'spikes/physical-ingress/src/statement-row-parser.js',
  pdfParser: 'spikes/physical-ingress/src/pdfjs-statement-parser.js',
};

const failures = [];
for (const path of Object.values(files)) {
  if (!fs.existsSync(path)) failures.push(`missing ${path}`);
}

if (!failures.length) {
  const graph = JSON.parse(fs.readFileSync(files.graph, 'utf8'));
  const registry = JSON.parse(fs.readFileSync(files.registry, 'utf8'));
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
  const rowParser = fs.readFileSync(files.rowParser, 'utf8');
  const pdfParser = fs.readFileSync(files.pdfParser, 'utf8');

  if (graph.schemaVersion !== 2) failures.push('ETL graph schema must be v2');
  if (registry.schemaVersion !== 2) failures.push('format registry schema must be v2');
  if (graph.status !== 'DESIGN_ACCEPTED_REAL_FORMAT_CORPUS_OBSERVED_PARSE_OPEN') failures.push('ETL graph status drifted or promoted unexpectedly');
  if (registry.status !== 'FORMAT_CORPUS_OBSERVED_PARSE_OPEN') failures.push('format registry status drifted or promoted unexpectedly');

  if (graph.product?.surface !== 'FLUTTER_MOBILE_APP') failures.push('product surface drifted from Flutter mobile');
  if (graph.product?.primaryPhysicalTarget !== 'ANDROID') failures.push('Android must remain primary physical target');
  if (graph.product?.desktopHarnessAuthority !== false) failures.push('desktop harness gained product authority');

  const extract = graph.etl?.extract ?? {};
  if (extract.nativePdfTextFirst !== true) failures.push('native PDF text must remain first strategy');
  if (extract.ocrFallback !== true || extract.ocrIsPrimary !== false) failures.push('OCR boundary drifted');
  if (extract.pageBoundaryPreserved !== true) failures.push('page boundaries must remain available before row parsing');
  if (extract.pageRoleClassificationBeforeRows !== true) failures.push('page-role classification must precede row parsing');
  if (extract.activePdfContentExecution !== false) failures.push('active PDF content execution must remain forbidden');
  if (extract.formFieldFinancialAuthority !== false) failures.push('form fields gained financial authority');
  if (extract.embeddedEducationalReferenceParse !== false) failures.push('educational/reference pages became row-parse eligible');
  if (extract.documentIdentityConsistencyCheck !== true) failures.push('document identity consistency gate missing');
  if (extract.rawDurable !== false || extract.passwordDurable !== false) failures.push('raw/password durability weakened');

  const pageScope = graph.etl?.pageScope ?? {};
  const requiredPageRoles = ['TRANSACTION_LEDGER','SUMMARY','INFORMATIONAL','EDUCATIONAL_REFERENCE','UNKNOWN'];
  for (const role of requiredPageRoles) {
    if (!pageScope.roles?.includes(role)) failures.push(`missing page role ${role}`);
  }
  if (JSON.stringify(pageScope.rowEligibleRoles) !== JSON.stringify(['TRANSACTION_LEDGER'])) failures.push('only TRANSACTION_LEDGER may be row eligible');
  if (pageScope.unknownRoleFailsClosed !== true) failures.push('unknown page role must fail closed');
  if (pageScope.sectionScopingAfterPageRole !== true) failures.push('section scoping after page role missing');

  if (graph.etl?.transform?.bankSpecificLayoutInCore !== false) failures.push('bank-specific layout leaked into core model');
  if (graph.etl?.transform?.separateBalanceEffectFromCashflowDirection !== true) failures.push('balance effect and cashflow direction collapsed');
  if (graph.etl?.load?.durableRawPdf !== false || graph.etl?.load?.durableRawEmailBody !== false || graph.etl?.load?.durableOcrText !== false) failures.push('raw plaintext durability weakened');
  if (graph.etl?.load?.idempotentReplayRequired !== true) failures.push('idempotent replay requirement missing');
  if (graph.reconciliation?.weakAmountDateOnlyAutoMerge !== false) failures.push('weak amount/date-only auto merge enabled');
  if (graph.reconciliation?.gmailAndStatementSameEventCreatesDuplicate !== false) failures.push('same Gmail+statement event may duplicate');
  if (graph.reconciliation?.statementOnlyMayCreateIncome !== true) failures.push('statement-only inflow support missing');
  if (graph.reconciliation?.cardPaymentMayBecomeIncome !== false) failures.push('card payment may become income');
  if (graph.monthlyClose?.singleCompletenessPercentAuthoritative !== false) failures.push('single completeness percentage became authoritative');
  if (graph.monthlyClose?.reconciledMeansProductionReady !== false) failures.push('month reconciliation promoted to production-ready');
  if (graph.buildReady !== false) failures.push('BUILD_READY must remain false');
  if (graph.iosTouched !== false) failures.push('iOS touch marker changed');

  const requiredCloseStates = ['OPEN_LIVE','WAITING_FOR_STATEMENTS','IMPORTING','RECONCILING','REVIEW_REQUIRED','RECONCILED','REOPENED'];
  for (const state of requiredCloseStates) {
    if (!graph.monthlyClose?.states?.includes(state)) failures.push(`missing monthly-close state ${state}`);
  }

  const originalLaws = [
    'BANK_FORMAT_A != BANK_FORMAT_B',
    'BANK_ADAPTER != CORE_FINANCIAL_MODEL',
    'OCR_OUTPUT != FINANCIAL_EVENT',
    'GMAIL_EVIDENCE != BANK_LEDGER_EVIDENCE',
    'APK_COMPILED != REAL_EECC_PROVEN',
    'REAL_EECC_PROVEN != PRODUCTION_READY',
  ];
  for (const law of originalLaws) {
    if (!graph.truthLaws?.includes(law)) failures.push(`graph missing truth law: ${law}`);
    if (!adr.includes(law)) failures.push(`ADR-035 missing truth law: ${law}`);
  }

  const discoveryLaws = [
    'DOCUMENT_CLASSIFIED != ROWS_TRUSTED',
    'PAGE_ROLE_UNKNOWN != PARSE_ANYWAY',
    'EDUCATIONAL_REFERENCE_PAGE != TRANSACTION_LEDGER',
    'PDF_ACTIVE_CONTENT != FINANCIAL_AUTHORITY',
    'NATIVE_TEXT_PRESENT != REAL_ROW_PARSE_PASS',
  ];
  for (const law of discoveryLaws) {
    if (!graph.truthLaws?.includes(law)) failures.push(`graph missing discovery law: ${law}`);
    if (!discovery.includes(law)) failures.push(`real-format discovery missing law: ${law}`);
  }

  if (registry.rules?.oneUniversalParser !== false) failures.push('registry allowed universal parser');
  if (registry.rules?.unknownSignatureFailsClosed !== true) failures.push('unknown statement signature no longer fails closed');
  if (registry.rules?.pageRoleClassificationRequired !== true) failures.push('registry no longer requires page-role classification');
  if (registry.rules?.embeddedEducationalSamplesFailClosed !== true) failures.push('embedded educational samples no longer fail closed');
  if (registry.rules?.activePdfContentExecutionForbidden !== true) failures.push('registry permits active PDF execution');
  if (registry.rules?.formFieldsAreFinancialAuthority !== false) failures.push('registry promoted form fields to financial authority');
  if (registry.rules?.documentIdentityConsistencyBeforeRows !== true) failures.push('registry document identity gate missing');
  if (registry.rules?.realPrivateContentInRepository !== false) failures.push('registry permits private statement corpus in repository');
  if (registry.rules?.adapterVersionRequired !== true) failures.push('adapter versioning no longer mandatory');

  const corpus = registry.observedCorpus ?? {};
  if (corpus.privateOwnedDocuments !== 4 || corpus.institutions !== 3 || corpus.profilesObserved !== 4) failures.push('sanitized real-format corpus counts drifted');
  if (corpus.rawArtifactsCommitted !== 0 || corpus.rawStatementTextCommitted !== 0 || corpus.piiCommitted !== 0 || corpus.realFinancialValuesCommitted !== 0) failures.push('private corpus publication boundary weakened');
  if (corpus.nativeTextPresentInObservedCopies !== 4) failures.push('native-text observation count drifted');
  if (corpus.embeddedEducationalReferenceObserved !== true) failures.push('embedded educational/reference observation missing');
  if (corpus.physicalRowParseClaimed !== false) failures.push('real row parse falsely promoted');

  if (JSON.stringify(registry.rowEligiblePageRoles) !== JSON.stringify(['TRANSACTION_LEDGER'])) failures.push('registry row-eligible page roles drifted');

  const profiles = registry.profiles ?? [];
  const observedIds = [
    'PE-BCP-SAVINGS-REQUESTED',
    'PE-BCP-CREDIT-MONTHLY',
    'PE-RIPLEY-CREDIT-MONTHLY',
    'PE-INTERBANK-SAVINGS-REQUESTED',
  ];
  for (const profileId of observedIds) {
    if (!profiles.some(p => p.profileId === profileId && p.adapterStatus === 'FORMAT_OBSERVED' && p.realParse === 'OPEN')) {
      failures.push(`${profileId} must remain FORMAT_OBSERVED with realParse OPEN`);
    }
  }
  if (!profiles.some(p => p.profileId === 'PE-INTERBANK-CREDIT-MONTHLY' && p.adapterStatus === 'UNPROVEN')) failures.push('Interbank credit must remain explicitly unproven');
  if (profiles.some(p => ['FIXTURE_READY','STATIC_READY','ANDROID_PHYSICAL_PROVEN','CROSS_PLATFORM_PHYSICAL_PROVEN','PHYSICAL_PROVEN','SUPPORTED','PRODUCTION_CANDIDATE'].includes(p.adapterStatus))) failures.push('format profile promoted beyond observed corpus evidence');

  for (const required of ['PAGE_ROLE_CLASSIFIER_TESTS','EMBEDDED_EXAMPLE_NEGATIVE_FIXTURE','ACTIVE_CONTENT_NON_EXECUTION_GUARD']) {
    if (!registry.promotionRequirements?.includes(required)) failures.push(`registry missing promotion requirement ${required}`);
  }
  for (const forbidden of ['FORMAT_OBSERVED=>REAL_PARSE_PASS','NATIVE_TEXT_PRESENT=>ADAPTER_SUPPORTED']) {
    if (!registry.forbiddenPromotions?.includes(forbidden)) failures.push(`registry missing forbidden promotion ${forbidden}`);
  }

  for (const marker of [
    'NATIVE_PDF_TEXT  → preferred',
    'OCR_FALLBACK     → only when native text is absent or unusable',
    'balance_effect',
    'cashflow_direction',
    'CONFIRMED_MATCH',
    'STATEMENT_ONLY',
    'EMAIL_ONLY_PENDING',
    'REOPENED',
  ]) {
    if (!adr.includes(marker)) failures.push(`ADR-035 missing marker: ${marker}`);
  }

  if (!adrIndex.includes('| ADR-035 | Statement ETL and monthly reconciliation |')) failures.push('ADR index missing ADR-035');
  if (!adrIndex.includes('**Next available ADR:** `ADR-036`.')) failures.push('ADR index next-ADR marker is not ADR-036');

  for (const marker of ['RawMailMessage','RawStatementDocument','ExtractionRun','StatementFormatProfile','StatementPeriod','StatementMovementEvidence','ReconciliationLink','AccountPeriodCoverage','MonthlyClose','AccountBalanceEvidence']) {
    if (!model.includes(marker)) failures.push(`data model missing ${marker}`);
  }
  for (const marker of ['## 16. Statement and monthly reconciliation extension','Raw email bodies, raw PDF bytes, decrypted text, OCR page images/text and raw statement rows remain **transient processing contracts**','GMAIL + STATEMENT SAME EVENT => ONE CANONICAL EVENT','No physical migrations are authorized by this extension.']) {
    if (!coreModel.includes(marker)) failures.push(`core data model missing statement extension marker: ${marker}`);
  }

  for (const marker of ['SOURCE LAYER','RAW / TRANSIENT ZONE','PASSIVE PDF SAFETY + EXTRACTION','STRUCTURAL SCOPE','ADAPTER ETL LAYER','RECONCILIATION / RESOLUTION','Page-role and region scoping','EDUCATIONAL_REFERENCE','STATEMENT_PAGE_ROLE_UNKNOWN']) {
    if (!architecture.includes(marker)) failures.push(`architecture missing ${marker}`);
  }

  for (const marker of ['Es hora de cerrar tu mes','Septiembre cerrado','OBSERVADO','RECONCILIADO','No weekly web copy/paste workflow becomes a product requirement.']) {
    if (!design.includes(marker)) failures.push(`monthly-close design missing ${marker}`);
  }
  for (const marker of ['## Monthly financial close','The signature product interaction is **Cerrar mi mes**.','OBSERVED != RECONCILED','MONTH_RECONCILED != PRODUCTION_READY']) {
    if (!productDesign.includes(marker)) failures.push(`product design missing monthly-close integration marker: ${marker}`);
  }

  for (const marker of ['T9 — Gmail ↔ statement reconciliation','T11 — Monthly close state machine','APK_BUILD_PASS != REAL_EECC_PASS','FORMAT_OBSERVED != REAL_ROW_PARSE_PASS','embedded educational/reference page','PDF_ACTIVE_CONTENT != FINANCIAL_AUTHORITY']) {
    if (!tests.includes(marker)) failures.push(`test matrix missing ${marker}`);
  }

  for (const marker of ['BCP savings/debit requested statement','FORMAT_OBSERVED','PAGE/REGION SCOPE BEFORE ROW PARSING','4 user-owned statement PDFs','Interbank savings/debit statement']) {
    if (!plan.includes(marker)) failures.push(`rollout plan missing ${marker}`);
  }

  for (const marker of ['raw PDFs            0','raw statement text  0','real amounts        0','real identities     0','real account IDs    0','real card IDs       0','real references     0','4 user-owned statement PDFs','3 institutions']) {
    if (!discovery.includes(marker)) failures.push(`sanitized discovery missing privacy/evidence marker: ${marker}`);
  }

  for (const marker of ['StatementPageRole','EDUCATIONAL_REFERENCE','TRANSACTION_LEDGER','classifyStatementDocument','selectTransactionLedgerPages']) {
    if (!pageClassifier.includes(marker)) failures.push(`page classifier missing marker ${marker}`);
  }
  if (!rowParser.includes('selectTransactionLedgerPages')) failures.push('row parser does not enforce page-role selection');
  if (!pdfParser.includes("pages.join('\\f')")) failures.push('PDF parser does not preserve page boundary delimiter');
  if (!pdfParser.includes('isEvalSupported: false')) failures.push('PDF parser lost passive eval guard');
}

if (failures.length) {
  console.error('FINANCESENSOR_STATEMENT_ETL_RECONCILIATION=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('FINANCESENSOR_STATEMENT_ETL_RECONCILIATION=PASS');
console.log('PRODUCT_SURFACE=FLUTTER_MOBILE_APP');
console.log('CORE_DOC_INDEXES_BOUND=1');
console.log('RAW_SOURCE_DURABLE=0');
console.log('NATIVE_PDF_TEXT_FIRST=1');
console.log('PAGE_BOUNDARY_PRESERVED=1');
console.log('PAGE_ROLE_BEFORE_ROWS=1');
console.log('ROW_ELIGIBLE_PAGE_ROLE=TRANSACTION_LEDGER_ONLY');
console.log('EMBEDDED_EDUCATIONAL_REFERENCE_GUARD=1');
console.log('PDF_ACTIVE_CONTENT_EXECUTION=0');
console.log('FORM_FIELD_FINANCIAL_AUTHORITY=0');
console.log('OCR_FALLBACK=1');
console.log('UNIVERSAL_BANK_PARSER=0');
console.log('WEAK_AMOUNT_DATE_AUTO_MERGE=0');
console.log('STATEMENT_ONLY_INFLOW_SUPPORTED=1');
console.log('CARD_PAYMENT_TO_INCOME=0');
console.log('REAL_FORMAT_CORPUS=PRIVATE_STRUCTURE_OBSERVED');
console.log('PRIVATE_FORMAT_DOCUMENTS=4');
console.log('PRIVATE_FORMAT_INSTITUTIONS=3');
console.log('FORMAT_OBSERVED_PROFILES=4');
console.log('ROW_ADAPTER_REAL_PARSE=OPEN');
console.log('MONTHLY_RECONCILIATION_PHYSICAL=OPEN');
console.log('APK_COMPILED_EQ_REAL_EECC_PROVEN=0');
console.log('REAL_EECC_PROVEN_EQ_PRODUCTION_READY=0');
console.log('IOS_TOUCHED=0');
console.log('BUILD_READY=false');
