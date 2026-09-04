import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/financial-source-coverage.json', 'utf8'));
const adr = fs.readFileSync('mk0/11-decisions/ADR-033-FINANCIAL-SOURCE-COVERAGE-ASYMMETRY.md', 'utf8');
const mobileStackAdr = fs.readFileSync('mk0/11-decisions/ADR-009-MOBILE-IMPLEMENTATION-STACK.md', 'utf8');
const mobileShell = fs.readFileSync('spikes/mobile-shell/README.md', 'utf8');
const adapters = fs.readFileSync('spikes/physical-ingress/src/statement-source-adapters.js', 'utf8');
const session = fs.readFileSync('spikes/physical-ingress/src/statement-import-session.js', 'utf8');
const pdf = fs.readFileSync('spikes/physical-ingress/src/pdfjs-statement-parser.js', 'utf8');
const rows = fs.readFileSync('spikes/physical-ingress/src/statement-row-parser.js', 'utf8');
const importer = fs.readFileSync('spikes/physical-ingress/src/statement-evidence-importer.js', 'utf8');
const viewer = fs.readFileSync('spikes/physical-ingress/live/owned-oauth-bank-statements-viewer.mjs', 'utf8');
const launcher = fs.readFileSync('spikes/physical-ingress/live/RUN-FINANCESENSOR-BANK-STATEMENTS.cmd', 'utf8');
const workflow = fs.readFileSync('.github/workflows/gmail-historical.yml', 'utf8');
const pkg = JSON.parse(fs.readFileSync('spikes/physical-ingress/package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('spikes/physical-ingress/package-lock.json', 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(`FINANCIAL_SOURCE_COVERAGE_FAIL: ${message}`);
}

function assertNoPasswordValueLogging(source, label) {
  const forbidden = [
    /console\.(?:log|error|warn)\([^\n]*\$\{\s*password\s*\}/i,
    /console\.(?:log|error|warn)\([^\n]*,\s*password(?:\s*[,)]|\s*$)/i,
    /console\.(?:log|error|warn)\([^\n]*\+\s*password(?:\s*[,)]|\s*$)/i,
    /console\.(?:log|error|warn)\(\s*password\s*\)/i
  ];
  for (const pattern of forbidden) {
    assert(!pattern.test(source), `${label} must never log statement password value`);
  }
}

assert(graph.status === 'DESIGN_FROZEN_STATEMENT_PIPELINE_STATIC_OPEN', 'status must stay static-open');
assert(graph.laws.noGmailIncomeEvidenceIsNotZeroIncome === true, 'missing no-email != zero-income law');
assert(graph.laws.outflowCoverageIsNotInflowCoverage === true, 'directional coverage must be split');
assert(graph.laws.gmailBootstrapCompleteIsNotCashflowComplete === true, 'Gmail completion cannot imply cashflow completion');
assert(graph.laws.cashflowCompleteRequiresBothDirections === true, 'cashflow completion must require both directions');
assert(graph.laws.creditStatementAutoIsNotDebitStatementAuto === true, 'credit/debit statement acquisition must stay distinct');
assert(graph.laws.debitStatementManualRequestIsNotManualTransactionEntry === true, 'requested statement is not manual transaction entry');
assert(graph.laws.cardStatementDoesNotProveSavingsInflows === true, 'card statement inflow boundary missing');
assert(graph.laws.windowsStatementRunnerIsEvidenceHarnessOnly === true, 'Windows runner must stay evidence-only');
assert(graph.laws.desktopHarnessPassIsNotMobileProductPass === true, 'desktop harness cannot promote mobile product PASS');
assert(graph.laws.productStatementRuntimeIsMobile === true, 'statement product runtime must remain mobile');

assert(graph.productRuntimeBoundary.productSurface === 'FLUTTER_MOBILE_APP', 'product surface must remain Flutter mobile');
assert(graph.productRuntimeBoundary.primaryPhysicalTarget === 'ANDROID', 'Android must remain primary physical target');
assert(JSON.stringify(graph.productRuntimeBoundary.requiredProductionTargets) === JSON.stringify(['ANDROID', 'IOS']), 'Android+iOS must remain required production targets');
assert(graph.productRuntimeBoundary.productStatementIngress === 'MOBILE_DEVICE_LOCAL', 'statement ingress must be device-local in product');
assert(graph.productRuntimeBoundary.nativeSecurityBridge.android === 'KOTLIN', 'Android security bridge must be Kotlin');
assert(graph.productRuntimeBoundary.nativeSecurityBridge.ios === 'SWIFT', 'iOS security bridge must be Swift');
assert(graph.productRuntimeBoundary.windowsStatementRunner === 'MK0_EVIDENCE_HARNESS_ONLY', 'Windows statement runner classification mismatch');
assert(graph.productRuntimeBoundary.windowsRunnerShipsInProduct === false, 'Windows runner must never ship in product');
assert(graph.productRuntimeBoundary.desktopProductClaimAllowed === false, 'desktop product claim must remain forbidden');
assert(graph.productRuntimeBoundary.desktopHarnessCanPromoteMobilePass === false, 'desktop harness must not promote mobile PASS');

assert(graph.statementPasswordBoundary.localMemoryOnly === true, 'statement password must be memory-only');
for (const key of ['persist', 'log', 'cloud', 'github', 'chat']) {
  assert(graph.statementPasswordBoundary[key] === false, `statement password ${key} must be false`);
}
assert(graph.rawStatementBoundary.decryptedPdfDurable === false, 'decrypted PDF durability forbidden');
assert(graph.rawStatementBoundary.decryptedTextDurable === false, 'decrypted text durability forbidden');
assert(graph.uiTruth.allowNetCashflowCompleteWhenInflowUnknown === false, 'UI must fail closed on unknown inflows');
assert(graph.providerCoverage.INTERBANK_STATEMENT_COVERAGE === 'UNPROVEN', 'unproven provider coverage cannot be promoted');
assert(graph.iosTouched === false, 'iOS must remain untouched');
assert(graph.buildReady === false, 'BUILD_READY must remain false');

for (const law of [
  'NO_GMAIL_INCOME_EVIDENCE != ZERO_INCOME',
  'OUTFLOW_COVERAGE != INFLOW_COVERAGE',
  'GMAIL_BOOTSTRAP_COMPLETE != CASHFLOW_COMPLETE',
  'CREDIT_STATEMENT_AUTO != DEBIT_STATEMENT_AUTO',
  'CARD_STATEMENT != SAVINGS_ACCOUNT_INFLOW_PROOF',
  'WINDOWS_STATEMENT_RUNNER = MK0_EVIDENCE_HARNESS_ONLY',
  'DESKTOP_HARNESS_PASS != MOBILE_PRODUCT_PASS',
  'PRODUCT_STATEMENT_RUNTIME = MOBILE_DEVICE_LOCAL'
]) {
  assert(adr.includes(law), `ADR missing law ${law}`);
}
assert(adr.includes('STATEMENT_PDF_PASSWORD              LOCAL_MEMORY_ONLY'), 'ADR password boundary missing');
assert(adr.includes('NEVER_REQUESTED_IN_CHAT'), 'ADR must forbid requesting identity-derived password in chat');
assert(adr.includes('A Windows harness can satisfy item 7 only. It cannot satisfy items 8 or 9.'), 'ADR must bound desktop evidence authority');
assert(mobileStackAdr.includes('FinanceSensor as a mobile-first product'), 'ADR-009 mobile-first authority missing');
assert(mobileStackAdr.includes('Flutter / Dart'), 'ADR-009 Flutter product stack missing');
assert(mobileShell.includes('FLUTTER MOBILE APP SHELL'), 'mobile shell product surface marker missing');
assert(mobileShell.includes('PRIMARY TARGET         ANDROID DEBUG APK'), 'mobile shell Android-first marker missing');

for (const marker of ['BCP_CREDIT', 'RIPLEY_CREDIT', 'BCP_SAVINGS_REQUESTED', 'NOT_STATEMENT']) {
  assert(adapters.includes(marker), `statement adapter missing ${marker}`);
}
assert(adapters.includes('Anulación') === false, 'adapter must not whitelist unrelated insurance wording');
assert(session.includes('passwordPersisted: false'), 'session summary must state password not persisted');
assert(session.includes('rawPdfPersisted: false'), 'session summary must state raw PDF not persisted');
assert(session.includes('plaintextPersisted: false'), 'session summary must state plaintext not persisted');
assert(pdf.includes('password,'), 'PDF loader must receive password locally');
assert(pdf.includes('PDF_PASSWORD_REJECTED'), 'PDF errors must sanitize password rejection');
assert(rows.includes("direction: 'IN', semanticType: 'INCOME'"), 'savings parser must support explicit inflow evidence');
assert(rows.includes("semanticType: 'CARD_PAYMENT'"), 'card payment must stay card payment rather than personal income');
assert(rows.includes("direction: null, semanticType: 'UNKNOWN'"), 'parser must preserve ambiguous direction');
assert(importer.includes("semanticType: item.semanticType ?? 'UNKNOWN'"), 'statement rebuild must preserve previously resolved evidence semantics');
assert(importer.includes("evidence?.evidenceClass === 'BANK_STATEMENT'"), 'statement authority must be explicit');

assert(viewer.includes("state?.historicalBootstrap?.status === 'RUNNING'"), 'statement writer must refuse concurrent historical writer');
assert(viewer.includes("error.code = 'HISTORICAL_SCAN_ACTIVE'"), 'concurrent writer must fail with stable safe code');
assert(viewer.includes('Clave del PDF · solo esta sesión'), 'local password input must describe session-only custody');
assert(viewer.includes('autocomplete="off"'), 'local password form must disable autocomplete');
assert(viewer.includes('fetchGmailStatementAttachment'), 'statement bytes must be fetched through local Gmail boundary');
assert(viewer.includes('extractPasswordProtectedPdfLayout'), 'statement viewer must use local password-aware geometric PDF parser');
assert(viewer.includes('importStatementLayoutSession'), 'statement viewer must use the layout session boundary');
assert(viewer.includes('parseStatementProfileLayout'), 'statement viewer must dispatch to the profile-specific layout adapter');
assert(viewer.includes('password = \'\''), 'statement password reference must be dropped after local import');
assertNoPasswordValueLogging(viewer, 'viewer');
assert(!/writeFile[^\n]{0,200}(?:\$\{\s*password\s*\}|,\s*password\b|\+\s*password\b)/i.test(viewer), 'viewer must never write statement password value');

assert(launcher.includes('npm ci --omit=optional --ignore-scripts --no-audit --no-fund'), 'launcher must use locked minimal dependency install');
assert(launcher.includes('windows-dpapi-preflight.mjs'), 'launcher must validate DPAPI before OAuth');
assert(launcher.includes('Nunca pegues esa clave en ChatGPT ni en GitHub'), 'launcher must keep statement password out of chat/repo');
assert(launcher.indexOf('windows-dpapi-preflight.mjs') < launcher.indexOf('OpenFileDialog'), 'DPAPI preflight must precede OAuth credential selection');

assert(pkg.dependencies?.['pdfjs-dist'] === '6.3.289', 'PDF.js must be exact-pinned');
assert(lock.packages?.['']?.dependencies?.['pdfjs-dist'] === '6.3.289', 'lockfile root must preserve exact PDF.js pin');
assert(lock.packages?.['node_modules/pdfjs-dist']?.version === '6.3.289', 'lockfile must resolve exact PDF.js version');
assert(workflow.includes('npm ci --omit=optional --ignore-scripts --no-audit --no-fund'), 'CI must use locked minimal PDF runtime');
assert(workflow.includes('Financial source coverage contract'), 'CI must run source-coverage contract');
assert(workflow.includes('REAL_STATEMENT_PARSE remains physically OPEN'), 'CI must never promote synthetic statement tests to physical PASS');

assertNoPasswordValueLogging(`${session}\n${pdf}`, 'statement parser boundary');
const forbiddenPersistence = [
  /writeFile[^\n]{0,200}(?:\$\{\s*password\s*\}|,\s*password\b|\+\s*password\b)/i,
  /setItem[^\n]{0,200}(?:\$\{\s*password\s*\}|,\s*password\b|\+\s*password\b)/i
];
for (const pattern of forbiddenPersistence) {
  assert(!pattern.test(`${session}\n${pdf}`), `forbidden password-value persistence matched ${pattern}`);
}

console.log('FINANCESENSOR_FINANCIAL_SOURCE_COVERAGE=PASS');
console.log('PRODUCT_SURFACE=FLUTTER_MOBILE_APP');
console.log('PRIMARY_PHYSICAL_TARGET=ANDROID');
console.log('WINDOWS_STATEMENT_RUNNER=MK0_EVIDENCE_HARNESS_ONLY');
console.log('DESKTOP_HARNESS_CAN_PROMOTE_MOBILE_PASS=0');
console.log('OUTFLOW_COVERAGE_SPLIT=PASS');
console.log('INFLOW_REQUIRES_STATEMENT_OR_OTHER_SOURCE=PASS');
console.log('CREDIT_STATEMENT_AUTO_LANE=PASS');
console.log('DEBIT_STATEMENT_REQUESTED_LANE=PASS');
console.log('HISTORICAL_CONCURRENT_WRITER=DENIED');
console.log('STATEMENT_PASSWORD_PERSISTENCE=0');
console.log('RAW_DECRYPTED_STATEMENT_DURABILITY=0');
console.log('INTERBANK_STATEMENT_COVERAGE=UNPROVEN');
console.log('REAL_STATEMENT_PARSE=OPEN');
console.log('MOBILE_STATEMENT_PHYSICAL_PASS=OPEN');
console.log('IOS_TOUCHED=0');
console.log('BUILD_READY=false');
