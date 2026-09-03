import fs from 'node:fs';

const graph = JSON.parse(fs.readFileSync('graph/financial-source-coverage.json', 'utf8'));
const adr = fs.readFileSync('mk0/11-decisions/ADR-033-FINANCIAL-SOURCE-COVERAGE-ASYMMETRY.md', 'utf8');
const adapters = fs.readFileSync('spikes/physical-ingress/src/statement-source-adapters.js', 'utf8');
const session = fs.readFileSync('spikes/physical-ingress/src/statement-import-session.js', 'utf8');
const pdf = fs.readFileSync('spikes/physical-ingress/src/pdfjs-statement-parser.js', 'utf8');
const rows = fs.readFileSync('spikes/physical-ingress/src/statement-row-parser.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('spikes/physical-ingress/package.json', 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(`FINANCIAL_SOURCE_COVERAGE_FAIL: ${message}`);
}

assert(graph.status === 'DESIGN_FROZEN_STATEMENT_PIPELINE_STATIC_OPEN', 'status must stay static-open');
assert(graph.laws.noGmailIncomeEvidenceIsNotZeroIncome === true, 'missing no-email != zero-income law');
assert(graph.laws.outflowCoverageIsNotInflowCoverage === true, 'directional coverage must be split');
assert(graph.laws.gmailBootstrapCompleteIsNotCashflowComplete === true, 'Gmail completion cannot imply cashflow completion');
assert(graph.laws.cashflowCompleteRequiresBothDirections === true, 'cashflow completion must require both directions');
assert(graph.laws.cardStatementDoesNotProveSavingsInflows === true, 'card statement inflow boundary missing');
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
  'CARD_STATEMENT != SAVINGS_ACCOUNT_INFLOW_PROOF'
]) {
  assert(adr.includes(law), `ADR missing law ${law}`);
}
assert(adr.includes('STATEMENT_PDF_PASSWORD              LOCAL_MEMORY_ONLY'), 'ADR password boundary missing');
assert(adr.includes('NEVER_REQUESTED_IN_CHAT'), 'ADR must forbid requesting identity-derived password in chat');

for (const marker of ['BCP_CREDIT', 'RIPLEY_CREDIT', 'BCP_SAVINGS_REQUESTED', 'NOT_STATEMENT']) {
  assert(adapters.includes(marker), `statement adapter missing ${marker}`);
}
assert(adapters.includes('Anulación') === false, 'adapter must not whitelist unrelated insurance wording');
assert(session.includes('passwordPersisted: false'), 'session summary must state password not persisted');
assert(session.includes('rawPdfPersisted: false'), 'session summary must state raw PDF not persisted');
assert(session.includes('plaintextPersisted: false'), 'session summary must state plaintext not persisted');
assert(pdf.includes("password,"), 'PDF loader must receive password locally');
assert(pdf.includes("PDF_PASSWORD_REJECTED"), 'PDF errors must sanitize password rejection');
assert(rows.includes("return 'IN'"), 'savings parser must support explicit inflow evidence');
assert(rows.includes("return null"), 'parser must preserve ambiguous direction');
assert(pkg.dependencies?.['pdfjs-dist'] === '6.3.289', 'PDF.js must be exact-pinned');

const forbiddenPersistence = [
  /writeFile[^\n]{0,160}password/i,
  /setItem[^\n]{0,160}password/i,
  /console\.(?:log|error|warn)[^\n]{0,160}password/i
];
for (const pattern of forbiddenPersistence) {
  assert(!pattern.test(`${session}\n${pdf}`), `forbidden password handling matched ${pattern}`);
}

console.log('FINANCESENSOR_FINANCIAL_SOURCE_COVERAGE=PASS');
console.log('OUTFLOW_COVERAGE_SPLIT=PASS');
console.log('INFLOW_REQUIRES_STATEMENT_OR_OTHER_SOURCE=PASS');
console.log('STATEMENT_PASSWORD_PERSISTENCE=0');
console.log('RAW_DECRYPTED_STATEMENT_DURABILITY=0');
console.log('INTERBANK_STATEMENT_COVERAGE=UNPROVEN');
console.log('IOS_TOUCHED=0');
console.log('BUILD_READY=false');
