import fs from 'node:fs';

const paths = {
  pubspec: 'spikes/mobile-shell/pubspec.yaml',
  main: 'spikes/mobile-shell/lib/main.dart',
  test: 'spikes/mobile-shell/test/widget_test.dart',
  readme: 'spikes/mobile-shell/README.md',
  statementReader: 'spikes/mobile-shell/lib/statement_ingress/pdfrx_statement_pdf_reader.dart',
  statementModels: 'spikes/mobile-shell/lib/statement_ingress/statement_models.dart',
  statementParser: 'spikes/mobile-shell/lib/statement_ingress/conservative_statement_parser.dart',
  statementSession: 'spikes/mobile-shell/lib/statement_ingress/mobile_statement_import_session.dart',
  statementTest: 'spikes/mobile-shell/test/mobile_statement_ingress_test.dart'
};

const failures = [];
for (const path of Object.values(paths)) {
  if (!fs.existsSync(path)) failures.push(`missing ${path}`);
}

if (!failures.length) {
  const pubspec = fs.readFileSync(paths.pubspec, 'utf8');
  const main = fs.readFileSync(paths.main, 'utf8');
  const test = fs.readFileSync(paths.test, 'utf8');
  const readme = fs.readFileSync(paths.readme, 'utf8');
  const statementDart = [
    paths.statementReader,
    paths.statementModels,
    paths.statementParser,
    paths.statementSession,
    paths.statementTest
  ].map(path => fs.readFileSync(path, 'utf8')).join('\n');
  const dart = `${main}\n${test}\n${statementDart}`;

  for (const marker of [
    'PRODUCT LAB · DATOS 100% SINTÉTICOS',
    'Tu dinero, en contexto.',
    'Financial Sensor',
    'Inicio',
    'Mov.',
    'Sensor',
    'Tú',
    'OAuth real está deshabilitado in Mobile Shell.'.replace(' in ', ' en '),
    'MOBILE SHELL SPIKE · NO ES PRODUCCIÓN'
  ]) {
    if (!main.includes(marker)) failures.push(`mobile shell missing required marker: ${marker}`);
  }

  for (const marker of [
    'MOBILE_SHELL != PRODUCTION_APP',
    'DEBUG_APK != RELEASE',
    'SYNTHETIC_DATA != FINANCIAL_EVIDENCE',
    'APK_BUILD_PASS != BUILD_READY',
    'Q-003 ACTIVE',
    'Q-004 ACTIVE',
    'Q-005 ACTIVE',
    'BUILD_READY NO'
  ]) {
    if (!readme.includes(marker)) failures.push(`mobile shell README missing gate marker: ${marker}`);
  }

  const forbiddenDart = [
    /import\s+['"]dart:io['"]/,
    /package:http\//,
    /package:dio\//i,
    /HttpClient\s*\(/,
    /https?:\/\//i,
    /gmail\.googleapis\.com/i,
    /accounts\.google\.com/i,
    /oauth2\.googleapis\.com/i,
    /\baccess_token\b/i,
    /\brefresh_token\b/i,
    /\bclient_secret\b/i,
    /\bcode_verifier\b/i,
    /\bauthorization_code\b/i,
    /WebSocket\s*\(/,
    /Socket\.connect\s*\(/
  ];
  for (const pattern of forbiddenDart) {
    if (pattern.test(dart)) failures.push(`mobile shell violates synthetic/offline boundary: ${pattern}`);
  }

  const dependenciesBlock = pubspec.match(/dependencies:\s*\n([\s\S]*?)\ndev_dependencies:/)?.[1] ?? '';
  const normalizedDependencyLines = dependenciesBlock
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !line.startsWith('sdk:'));

  if (!normalizedDependencyLines.includes('flutter:')) failures.push('Flutter SDK dependency missing');
  if (!normalizedDependencyLines.includes('pdfrx: 2.5.0')) failures.push('exact pdfrx 2.5.0 dependency missing');
  const allowed = new Set(['flutter:', 'pdfrx: 2.5.0']);
  const unexpected = normalizedDependencyLines.filter(line => !allowed.has(line));
  if (unexpected.length) failures.push(`unexpected runtime dependencies: ${unexpected.join(', ')}`);

  for (const marker of ['Size(360, 800)', 'Size(393, 852)', 'Size(430, 900)', 'tester.takeException()']) {
    if (!test.includes(marker)) failures.push(`widget test missing viewport/assertion marker: ${marker}`);
  }

  if (!statementDart.includes('PdfDocument.openData(')) failures.push('statement reader must open in-memory PDF data');
  if (!statementDart.includes('useProgressiveLoading: false')) failures.push('statement reader must not require progressive/network loading');
  if (!statementDart.includes('STATEMENT_PDF_OPEN_OR_PASSWORD_REJECTED')) failures.push('statement reader stable failure code missing');
}

if (failures.length) {
  console.error('FINANCESENSOR_FLUTTER_MOBILE_SHELL=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_FLUTTER_MOBILE_SHELL=PASS');
console.log('RUNTIME_DEPENDENCIES=FLUTTER_SDK,PDFRX_2_5_0');
console.log('NETWORK_DEPENDENCIES=0');
console.log('REAL_OAUTH_SURFACE=0');
console.log('REAL_GMAIL_SURFACE=0');
console.log('REAL_FINANCIAL_DATA=0');
console.log('STATEMENT_RUNTIME=LOCAL_PDFIUM');
console.log('APK_RELEASE_CLAIMED=0');
console.log('BUILD_READY_CLAIMED_BY_MOBILE_SHELL=0');
console.log('COMPACT_VIEWPORT_TEST_DECLARED=PASS');
