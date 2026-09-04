import fs from 'node:fs';

const files = {
  graph: 'graph/statement-etl-reconciliation.json',
  registry: 'graph/statement-format-registry.json',
  adr: 'mk0/11-decisions/ADR-035-STATEMENT-ETL-MONTHLY-RECONCILIATION.md',
  adrIndex: 'mk0/11-decisions/ADR-INDEX.md',
  architecture: 'mk0/04-architecture/STATEMENT-ETL-RECONCILIATION.md',
  model: 'mk0/05-data-model/STATEMENT-RECONCILIATION-MODEL.md',
  coreModel: 'mk0/05-data-model/CORE-DATA-MODEL.md',
  design: 'mk0/03-design/MONTHLY-CLOSE-EXPERIENCE.md',
  productDesign: 'mk0/03-design/PRODUCT-DESIGN.md',
  tests: 'mk0/09-test/STATEMENT-ETL-TEST-MATRIX.md',
  plan: 'mk0/07-plan/STATEMENT-ADAPTER-ROLLOUT.md',
};

const failures = [];
for (const path of Object.values(files)) {
  if (!fs.existsSync(path)) failures.push(`missing ${path}`);
}

if (!failures.length) {
  const graph = JSON.parse(fs.readFileSync(files.graph, 'utf8'));
  const registry = JSON.parse(fs.readFileSync(files.registry, 'utf8'));
  const adr = fs.readFileSync(files.adr, 'utf8');
  const adrIndex = fs.readFileSync(files.adrIndex, 'utf8');
  const architecture = fs.readFileSync(files.architecture, 'utf8');
  const model = fs.readFileSync(files.model, 'utf8');
  const coreModel = fs.readFileSync(files.coreModel, 'utf8');
  const design = fs.readFileSync(files.design, 'utf8');
  const productDesign = fs.readFileSync(files.productDesign, 'utf8');
  const tests = fs.readFileSync(files.tests, 'utf8');
  const plan = fs.readFileSync(files.plan, 'utf8');

  if (graph.status !== 'DESIGN_ACCEPTED_REAL_FORMAT_EVIDENCE_OPEN') failures.push('ETL graph status promoted unexpectedly');
  if (graph.product?.surface !== 'FLUTTER_MOBILE_APP') failures.push('product surface drifted from Flutter mobile');
  if (graph.product?.primaryPhysicalTarget !== 'ANDROID') failures.push('Android must remain primary physical target');
  if (graph.product?.desktopHarnessAuthority !== false) failures.push('desktop harness gained product authority');
  if (graph.etl?.extract?.nativePdfTextFirst !== true) failures.push('native PDF text must remain first strategy');
  if (graph.etl?.extract?.ocrFallback !== true || graph.etl?.extract?.ocrIsPrimary !== false) failures.push('OCR boundary drifted');
  if (graph.etl?.extract?.rawDurable !== false || graph.etl?.extract?.passwordDurable !== false) failures.push('raw/password durability weakened');
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

  const laws = [
    'BANK_FORMAT_A != BANK_FORMAT_B',
    'BANK_ADAPTER != CORE_FINANCIAL_MODEL',
    'OCR_OUTPUT != FINANCIAL_EVENT',
    'GMAIL_EVIDENCE != BANK_LEDGER_EVIDENCE',
    'APK_COMPILED != REAL_EECC_PROVEN',
    'REAL_EECC_PROVEN != PRODUCTION_READY',
  ];
  for (const law of laws) {
    if (!graph.truthLaws?.includes(law)) failures.push(`graph missing truth law: ${law}`);
    if (!adr.includes(law)) failures.push(`ADR-035 missing truth law: ${law}`);
  }

  if (registry.rules?.oneUniversalParser !== false) failures.push('registry allowed universal parser');
  if (registry.rules?.unknownSignatureFailsClosed !== true) failures.push('unknown statement signature no longer fails closed');
  if (registry.rules?.realPrivateContentInRepository !== false) failures.push('registry permits private statement corpus in repository');
  if (registry.rules?.adapterVersionRequired !== true) failures.push('adapter versioning no longer mandatory');

  const profiles = registry.profiles ?? [];
  if (!profiles.some(p => p.profileId === 'PE-BCP-SAVINGS-REQUESTED' && p.adapterStatus === 'DISCOVERY')) failures.push('BCP savings discovery profile missing');
  if (!profiles.some(p => p.profileId === 'PE-BCP-CREDIT-MONTHLY' && p.adapterStatus === 'DISCOVERY')) failures.push('BCP credit discovery profile missing');
  if (!profiles.some(p => p.profileId === 'PE-RIPLEY-CREDIT-MONTHLY' && p.adapterStatus === 'DISCOVERY')) failures.push('Ripley credit discovery profile missing');
  if (!profiles.some(p => p.institution === 'INTERBANK' && p.adapterStatus === 'UNPROVEN')) failures.push('Interbank must remain explicitly unproven');
  if (profiles.some(p => ['STATIC_READY','PHYSICAL_PROVEN','SUPPORTED'].includes(p.adapterStatus))) failures.push('format profile promoted without real sanitized corpus evidence');

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

  for (const marker of [
    'RawMailMessage',
    'RawStatementDocument',
    'ExtractionRun',
    'StatementFormatProfile',
    'StatementPeriod',
    'StatementMovementEvidence',
    'ReconciliationLink',
    'AccountPeriodCoverage',
    'MonthlyClose',
    'AccountBalanceEvidence',
  ]) {
    if (!model.includes(marker)) failures.push(`data model missing ${marker}`);
  }

  for (const marker of [
    '## 16. Statement and monthly reconciliation extension',
    'Raw email bodies, raw PDF bytes, decrypted text, OCR page images/text and raw statement rows remain **transient processing contracts**',
    'GMAIL + STATEMENT SAME EVENT => ONE CANONICAL EVENT',
    'No physical migrations are authorized by this extension.',
  ]) {
    if (!coreModel.includes(marker)) failures.push(`core data model missing statement extension marker: ${marker}`);
  }

  for (const marker of [
    'SOURCE LAYER',
    'RAW / TRANSIENT ZONE',
    'ADAPTER ETL LAYER',
    'RECONCILIATION / RESOLUTION',
    'STATEMENT_PROFILE_UNKNOWN',
    'STATEMENT_OCR_LOW_CONFIDENCE',
  ]) {
    if (!architecture.includes(marker)) failures.push(`architecture missing ${marker}`);
  }

  for (const marker of [
    'Es hora de cerrar tu mes',
    'Septiembre cerrado',
    'OBSERVADO',
    'RECONCILIADO',
    'No weekly web copy/paste workflow becomes a product requirement.',
  ]) {
    if (!design.includes(marker)) failures.push(`monthly-close design missing ${marker}`);
  }

  for (const marker of [
    '## Monthly financial close',
    'The signature product interaction is **Cerrar mi mes**.',
    'OBSERVED != RECONCILED',
    'MONTH_RECONCILED != PRODUCTION_READY',
  ]) {
    if (!productDesign.includes(marker)) failures.push(`product design missing monthly-close integration marker: ${marker}`);
  }

  for (const marker of [
    'T9 — Gmail ↔ statement reconciliation',
    'T11 — Monthly close state machine',
    'APK_BUILD_PASS != REAL_EECC_PASS',
  ]) {
    if (!tests.includes(marker)) failures.push(`test matrix missing ${marker}`);
  }

  for (const marker of [
    'BCP savings/debit requested monthly statement',
    'SANITIZED STRUCTURAL COPY',
    'FORMAT DISCOVERY BEFORE PARSER PROMOTION',
  ]) {
    if (!plan.includes(marker)) failures.push(`rollout plan missing ${marker}`);
  }
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
console.log('OCR_FALLBACK=1');
console.log('UNIVERSAL_BANK_PARSER=0');
console.log('WEAK_AMOUNT_DATE_AUTO_MERGE=0');
console.log('STATEMENT_ONLY_INFLOW_SUPPORTED=1');
console.log('CARD_PAYMENT_TO_INCOME=0');
console.log('REAL_FORMAT_CORPUS=OPEN');
console.log('MONTHLY_RECONCILIATION_PHYSICAL=OPEN');
console.log('APK_COMPILED_EQ_REAL_EECC_PROVEN=0');
console.log('REAL_EECC_PROVEN_EQ_PRODUCTION_READY=0');
console.log('IOS_TOUCHED=0');
console.log('BUILD_READY=false');
