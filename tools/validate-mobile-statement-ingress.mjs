import fs from 'node:fs';

const files = {
  graph: 'graph/mobile-statement-ingress.json',
  adr: 'mk0/11-decisions/ADR-034-MOBILE-STATEMENT-PDF-RUNTIME.md',
  pubspec: 'spikes/mobile-shell/pubspec.yaml',
  reader: 'spikes/mobile-shell/lib/statement_ingress/pdfrx_statement_pdf_reader.dart',
  models: 'spikes/mobile-shell/lib/statement_ingress/statement_models.dart',
  parser: 'spikes/mobile-shell/lib/statement_ingress/conservative_statement_parser.dart',
  session: 'spikes/mobile-shell/lib/statement_ingress/mobile_statement_import_session.dart',
  test: 'spikes/mobile-shell/test/mobile_statement_ingress_test.dart',
};

const failures = [];
for (const path of Object.values(files)) {
  if (!fs.existsSync(path)) failures.push(`missing ${path}`);
}

if (!failures.length) {
  const graph = JSON.parse(fs.readFileSync(files.graph, 'utf8'));
  const adr = fs.readFileSync(files.adr, 'utf8');
  const pubspec = fs.readFileSync(files.pubspec, 'utf8');
  const reader = fs.readFileSync(files.reader, 'utf8');
  const models = fs.readFileSync(files.models, 'utf8');
  const parser = fs.readFileSync(files.parser, 'utf8');
  const session = fs.readFileSync(files.session, 'utf8');
  const test = fs.readFileSync(files.test, 'utf8');
  const dart = `${reader}\n${models}\n${parser}\n${session}\n${test}`;

  if (graph.status !== 'STATIC_SPIKE_IN_PROGRESS_PHYSICAL_OPEN') failures.push('mobile statement status promoted unexpectedly');
  if (graph.product?.surface !== 'FLUTTER_MOBILE_APP') failures.push('product surface must be Flutter mobile');
  if (graph.product?.primaryPhysicalTarget !== 'ANDROID') failures.push('Android must remain primary physical target');
  if (JSON.stringify(graph.product?.requiredProductionTargets) !== JSON.stringify(['ANDROID', 'IOS'])) failures.push('Android+iOS production target set changed');
  if (graph.runtime?.package !== 'pdfrx' || graph.runtime?.version !== '2.4.8') failures.push('pdfrx exact compatible runtime pin missing');
  if (graph.runtime?.rejectedCandidate?.version !== '2.5.0') failures.push('incompatible pdfrx 2.5.0 candidate must remain recorded');
  if (!String(graph.runtime?.rejectedCandidate?.reason || '').includes('FLUTTER_GTE_3_47_0')) failures.push('rejected candidate reason must preserve real CI incompatibility');
  if (graph.runtime?.flutter !== '3.44.7' || graph.runtime?.dart !== '3.12.2') failures.push('FinanceSensor Flutter/Dart baseline changed unexpectedly');
  if (graph.runtime?.engine !== 'PDFIUM') failures.push('PDFium runtime boundary missing');
  if (graph.runtime?.networkRequiredForParse !== false) failures.push('statement parse must not require network');
  if (graph.passwordBoundary?.persist !== false || graph.passwordBoundary?.log !== false || graph.passwordBoundary?.cloud !== false || graph.passwordBoundary?.github !== false) failures.push('password persistence boundary weakened');
  if (graph.passwordBoundary?.memoryZeroizationClaim !== false) failures.push('Dart password zeroization must not be claimed');
  if (graph.pdfBufferBoundary?.zeroAfterDisposeRequired !== true) failures.push('owned mutable PDF buffer must be zeroed');
  if (!graph.forbiddenPromotions?.includes('DEPENDENCY_CONFLICT=>SILENT_FLUTTER_BASELINE_UPGRADE')) failures.push('silent framework upgrade must be forbidden');
  if (graph.buildReady !== false) failures.push('BUILD_READY must remain false');

  for (const marker of [
    'MOBILE_PDF_RUNTIME             pdfrx 2.4.8',
    'DEPENDENCY_CONFLICT != SILENT_FRAMEWORK_UPGRADE_AUTHORITY',
    'PASSWORD_REFERENCE_DROPPED != PASSWORD_BYTES_PROVEN_WIPED',
    'WINDOWS_HARNESS != MOBILE_PRODUCT_RUNTIME',
    'ANDROID_APK_BUILD_PASS != REAL_STATEMENT_PARSE_PASS',
    'BUILD_READY=false',
  ]) {
    if (!adr.includes(marker)) failures.push(`ADR-034 missing marker: ${marker}`);
  }

  if (!/sdk:\s*'>=3\.12\.0 <4\.0\.0'/.test(pubspec)) failures.push('Dart 3.12 baseline missing from pubspec');
  if (!/^\s*pdfrx:\s*2\.4\.8\s*$/m.test(pubspec)) failures.push('pubspec must exact-pin pdfrx 2.4.8');
  if (/^\s*pdfrx:\s*2\.5\.0\s*$/m.test(pubspec)) failures.push('incompatible pdfrx 2.5.0 must not return');

  for (const marker of [
    'PdfDocument.openData(',
    'createSimplePasswordProvider(password)',
    'firstAttemptByEmptyPassword: false',
    'useProgressiveLoading: false',
    'await page.loadText()',
    'await document?.dispose()',
    'workingBytes.fillRange(0, workingBytes.length, 0)',
    "STATEMENT_PDF_OPEN_OR_PASSWORD_REJECTED",
  ]) {
    if (!reader.includes(marker)) failures.push(`mobile reader missing marker: ${marker}`);
  }

  for (const marker of [
    'StatementSemanticType.income',
    'StatementSemanticType.externalTransfer',
    'StatementSemanticType.cardPayment',
    'StatementSemanticType.refund',
    'StatementSemanticType.unknown',
  ]) {
    if (!parser.includes(marker)) failures.push(`mobile parser missing semantic marker: ${marker}`);
  }

  for (const marker of [
    "'passwordPersisted': false",
    "'rawPdfPersisted': false",
    "'plaintextPersisted': false",
    'ownedEncryptedPdfBytes.fillRange(0, ownedEncryptedPdfBytes.length, 0)',
  ]) {
    if (!session.includes(marker)) failures.push(`mobile import session missing privacy marker: ${marker}`);
  }

  if (/print\s*\([^\n]*password/i.test(dart) || /debugPrint\s*\([^\n]*password/i.test(dart)) failures.push('statement password appears loggable from Dart code');
  if (/File\s*\([^\n]*(password|plaintext|statement)/i.test(dart)) failures.push('statement secret/plaintext file persistence pattern found');
  if (/https?:\/\//i.test(dart)) failures.push('mobile statement code must not contain network endpoint literals');

  for (const marker of [
    'credit card payment is never promoted to personal income',
    'ambiguous statement row remains unknown',
    'failed PDF open still zeros owned source bytes',
    "isNot(contains(password))",
  ]) {
    if (!test.includes(marker)) failures.push(`mobile statement tests missing marker: ${marker}`);
  }
}

if (failures.length) {
  console.error('FINANCESENSOR_MOBILE_STATEMENT_INGRESS=FAIL');
  for (const issue of failures) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('FINANCESENSOR_MOBILE_STATEMENT_INGRESS=PASS');
console.log('PRODUCT_SURFACE=FLUTTER_MOBILE_APP');
console.log('PRIMARY_PHYSICAL_TARGET=ANDROID');
console.log('FLUTTER_BASELINE=3.44.7');
console.log('DART_BASELINE=3.12.2');
console.log('MOBILE_PDF_RUNTIME=PDFRX_2_4_8');
console.log('PDFRX_2_5_0=REJECTED_BASELINE_INCOMPATIBLE');
console.log('STATEMENT_PARSE_NETWORK_REQUIRED=0');
console.log('PASSWORD_PERSISTENCE=0');
console.log('PASSWORD_MEMORY_ZEROIZATION_CLAIM=0');
console.log('OWNED_PDF_BUFFER_ZERO_REQUIRED=1');
console.log('MOBILE_STATEMENT_PHYSICAL_PASS=OPEN');
console.log('BUILD_READY=false');
