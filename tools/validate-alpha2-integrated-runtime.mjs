import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [
  authorityText,
  pipeline,
  projection,
  runtime,
  transactionScanner,
  statementScanner,
  vaultBridge,
  main,
  syncAdapter,
  webModel,
  webHtml,
  webApp,
  adrIndex
] = await Promise.all([
  read('graph/alpha2-mobile-runtime-authority.json'),
  read('spikes/mobile-shell/lib/alpha2/alpha2_pipeline.dart'),
  read('spikes/mobile-shell/lib/alpha2/alpha2_projection.dart'),
  read('spikes/mobile-shell/lib/alpha2/alpha2_runtime.dart'),
  read('spikes/mobile-shell/native/android/Alpha2TransactionScanner.kt'),
  read('spikes/mobile-shell/native/android/Alpha2StatementDiscoveryScanner.kt'),
  read('spikes/mobile-shell/native/android/Alpha2VaultBridge.kt'),
  read('spikes/mobile-shell/lib/main_alpha2.dart'),
  read('spikes/e2ee-sync/src/alpha2-projection-adapter.js'),
  read('product/labs/web-dashboard/projection-model.mjs'),
  read('product/labs/web-dashboard/index.html'),
  read('product/labs/web-dashboard/app.js'),
  read('mk0/11-decisions/ADR-INDEX.md')
]);

const authority = JSON.parse(authorityText);
if (authority.contract !== 'ALPHA2_MOBILE_RUNTIME_AUTHORITY_V1') throw new Error('ALPHA2_AUTHORITY_CONTRACT_MISMATCH');
if (authority.adr !== 'ADR-038') throw new Error('ALPHA2_AUTHORITY_ADR_MISMATCH');
if (authority.authorities?.dart?.canonicalTransactionAuthority !== true) throw new Error('ALPHA2_DART_CANONICAL_AUTHORITY_REQUIRED');
if (authority.authorities?.node?.shippedProductRuntime !== false) throw new Error('ALPHA2_NODE_PRODUCT_RUNTIME_FORBIDDEN');
if (authority.publicProjection?.numericConfidenceAllowed !== false) throw new Error('ALPHA2_PUBLIC_CONFIDENCE_FORBIDDEN');
if (authority.physicalCadence?.mode !== 'MILESTONE_ONLY') throw new Error('ALPHA2_PHYSICAL_CADENCE_MISMATCH');
if (authority.claims?.buildReady !== false || authority.claims?.releaseReady !== false) throw new Error('ALPHA2_PREMATURE_READY_CLAIM');

if (!adrIndex.includes('| ADR-038 | Alpha.2 mobile runtime authority and Node↔Dart parity |')) {
  throw new Error('ALPHA2_ADR_038_REGISTRY_MISSING');
}
if (!adrIndex.includes('**Next available ADR:** `ADR-039`.')) {
  throw new Error('ALPHA2_ADR_NEXT_NUMBER_INVALID');
}

for (const forbidden of ['ConservativeStatementParser', 'main_human_test.dart', 'FinancialMailScanner']) {
  if (pipeline.includes(forbidden) || main.includes(forbidden)) throw new Error(`ALPHA2_LEGACY_RUNTIME_REFERENCE:${forbidden}`);
}

if (!pipeline.includes('Alpha2BcpSavingsGeometryParser')) throw new Error('ALPHA2_BCP_GEOMETRY_PARSER_NOT_WIRED');
if (!pipeline.includes("terminalState: 'QUARANTINED'")) throw new Error('ALPHA2_PARSE_REVIEW_FAIL_CLOSED_MISSING');
if (!pipeline.includes('bytes.fillRange(0, bytes.length, 0)')) throw new Error('ALPHA2_OWNED_PDF_BUFFER_ZERO_MISSING');
if (!runtime.includes('blockedFromMaterialization')) throw new Error('ALPHA2_AMBIGUOUS_DOUBLE_COUNT_GUARD_MISSING');

if (/confidence\s*[:=]/i.test(transactionScanner) || transactionScanner.includes('0.96')) {
  throw new Error('ALPHA2_TRANSACTION_NUMERIC_CONFIDENCE_FORBIDDEN');
}
if (!transactionScanner.includes('truthState') || !transactionScanner.includes('OBSERVED')) {
  throw new Error('ALPHA2_GMAIL_OBSERVED_TRUTH_REQUIRED');
}

for (const marker of [
  'PE-BCP-SAVINGS-REQUESTED-DISCOVERY-V1',
  'PE-BCP-CREDIT-MONTHLY-DISCOVERY-V1',
  'PE-RIPLEY-CREDIT-MONTHLY-DISCOVERY-V1'
]) {
  if (!statementScanner.includes(marker)) throw new Error(`ALPHA2_STATEMENT_PROFILE_MISSING:${marker}`);
}
const enabledCount = (statementScanner.match(/runtimeFetchEnabled = true/g) ?? []).length;
if (enabledCount !== 1) throw new Error(`ALPHA2_FETCH_ENABLED_PROFILE_COUNT:${enabledCount}`);
if (!statementScanner.includes('attachmentBytesFetched" to false')) throw new Error('ALPHA2_DISCOVERY_FETCH_BOUNDARY_MISSING');

for (const marker of [
  'SQLCIPHER_VERSION = "4.18.0"',
  'context.noBackupFilesDir',
  'DEK_BYTES = 32',
  'AndroidKeyStore',
  'ALPHA2_KEYSTORE_SOFTWARE_FALLBACK_FORBIDDEN',
  'database key authority unavailable'
]) {
  if (!vaultBridge.toLowerCase().includes(marker.toLowerCase())) throw new Error(`ALPHA2_VAULT_MARKER_MISSING:${marker}`);
}
if (vaultBridge.includes('android.database.sqlite.SQLiteDatabase')) throw new Error('ALPHA2_PLAINTEXT_SQLITE_IMPORT_FORBIDDEN');

for (const key of ['confidence', 'matchScore', 'evidencePercent', 'rawPdf', 'pdfPassword']) {
  if (!projection.includes(`'${key}'`) || !webModel.includes(`'${key}'`)) {
    throw new Error(`ALPHA2_PUBLIC_FORBIDDEN_KEY_NOT_GATED:${key}`);
  }
}
if (!syncAdapter.includes("from './protocol.js'")) throw new Error('ALPHA2_SECOND_SYNC_PROTOCOL_FORBIDDEN');
if (!syncAdapter.includes('createEncryptedEnvelope')) throw new Error('ALPHA2_EXISTING_E2EE_ENVELOPE_NOT_REUSED');
const webSurface = `${webHtml}\n${webApp}`;
if (!webSurface.includes('Entró') || !webSurface.includes('Salió') || !webSurface.includes('Cobertura')) {
  throw new Error('ALPHA2_WEB_CORE_UX_MISSING');
}

console.log('ALPHA2_INTEGRATED_RUNTIME_ARCHITECTURE=PASS');
console.log('ADR_038_REGISTERED=YES');
console.log('NEXT_ADR=ADR-039');
console.log('FINANCIAL_AUTHORITY=DART');
console.log('ANDROID_TRUSTED_EDGE=KOTLIN');
console.log('NODE_ROLE=REFERENCE_ORACLE_ONLY');
console.log('GENERIC_STATEMENT_PARSER_PRODUCT_AUTHORITY=0');
console.log('PUBLIC_EVIDENCE_PERCENTAGE=0');
console.log('E2EE_SECOND_PROTOCOL_CREATED=0');
console.log('PHYSICAL_ALPHA2_PASS=OPEN');
console.log('BUILD_READY=NO');
console.log('RELEASE_READY=NO');
