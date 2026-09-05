import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readText = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`ALPHA2_C_VALIDATION_FAILED:${message}`);
};

const graph = readJson('graph/alpha2-c-financial-vault.json');
const alpha2A = readJson('graph/alpha2-a-statement-discovery.json');
const design = readJson('graph/alpha2-design-freeze.json');
const adr006 = readText('mk0/11-decisions/ADR-006-LOCAL-PERSISTENCE-ENCRYPTION.md');
const adr009 = readText('mk0/11-decisions/ADR-009-MOBILE-IMPLEMENTATION-STACK.md');
const adr030 = readText('mk0/11-decisions/ADR-030-DELETION-RESURRECTION-BARRIER.md');
const source = readText('spikes/physical-ingress/src/financial-vault.js');
const status = readText('STATUS.md');

assert(graph.slice === 'ALPHA_2_C', 'SLICE_ID');
assert(graph.status === 'STATIC_IMPLEMENTATION_CANDIDATE_CI_PENDING', 'CANDIDATE_STATUS');
assert(graph.baseCommit === '88747144e47bd8bbc17640565d18895126cdf821', 'BASE_COMMIT');
assert(graph.claims?.staticImplementationPass === false, 'STATIC_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.physicalVaultPass === false, 'PHYSICAL_VAULT_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.p3PhysicalPass === false, 'P3_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.alpha2ProductPass === false, 'ALPHA2_PRODUCT_PASS_MUST_REMAIN_FALSE');
assert(graph.claims?.buildReady === false, 'BUILD_READY_MUST_REMAIN_FALSE');

assert(alpha2A.status === 'STATIC_IMPLEMENTED_CI_PASS', 'ALPHA2_A_DEPENDENCY');
assert(alpha2A.buildReady === false, 'ALPHA2_A_BUILD_READY_DRIFT');
assert(design.buildReady === false, 'DESIGN_BUILD_READY_DRIFT');
assert(design.vaultPolicy?.databaseFamily === 'SQLCIPHER_4_X', 'DESIGN_SQLCIPHER_FAMILY');
assert(design.vaultPolicy?.dekBits === 256, 'DESIGN_DEK_BITS');
assert(design.vaultPolicy?.plaintextFallback === false, 'DESIGN_PLAINTEXT_FALLBACK');
assert(design.vaultPolicy?.platformWrappedDek === true, 'DESIGN_PLATFORM_WRAP');
assert(design.vaultPolicy?.atomicDerivedBatchAndTerminalSourceState === true, 'DESIGN_ATOMIC_COMMIT');

assert(graph.sqlcipher?.family === 'SQLCIPHER_4_X', 'GRAPH_SQLCIPHER_FAMILY');
assert(graph.sqlcipher?.exactVersion === '4.18.0', 'GRAPH_SQLCIPHER_PIN');
assert(graph.sqlcipher?.plaintextFallback === false, 'GRAPH_PLAINTEXT_FALLBACK');
assert(graph.sqlcipher?.encryptedOpenOnly === true, 'GRAPH_ENCRYPTED_OPEN_ONLY');
assert(graph.databaseKeyBoundary?.dekBits === 256, 'GRAPH_DEK_BITS');
assert(graph.databaseKeyBoundary?.platformWrapped === true, 'GRAPH_PLATFORM_WRAP');
assert(graph.databaseKeyBoundary?.durableDekInDartOrApplicationLayer === false, 'GRAPH_DURABLE_APP_DEK');
assert(graph.databaseKeyBoundary?.rawDekInRepositoryHandle === false, 'GRAPH_RAW_HANDLE_DEK');
assert(graph.schema?.version === 1, 'GRAPH_SCHEMA_VERSION');
assert(graph.schema?.transactionalMigration === true, 'GRAPH_TRANSACTIONAL_MIGRATION');
assert(graph.schema?.downgradeAllowed === false, 'GRAPH_DOWNGRADE');
assert(graph.schema?.durableRawContentColumns === 0, 'GRAPH_RAW_COLUMNS');
assert(graph.commitBoundary?.derivedBatchAndTerminalSourceState === 'SAME_TRANSACTION', 'GRAPH_ATOMIC_COMMIT');
assert(graph.deletionBoundary?.restoreResurrectionBarrier === 'SEPARATE_ADR_030_P3_BOUNDARY', 'GRAPH_RESTORE_BOUNDARY');
assert(graph.deletionBoundary?.cryptoShredAloneClaimsGlobalDeletion === false, 'GRAPH_DELETION_OVERCLAIM');

for (const marker of [
  'SQLCipher 4.x family',
  'random 256-bit DEK',
  'platform-native protected key facility',
  'SQLCIPHER_FAILURE => FAIL_CLOSED',
  'DEK DURABLE PLAINTEXT           FORBIDDEN'
]) {
  assert(adr006.toLowerCase().includes(marker.toLowerCase()), `ADR006_MARKER:${marker}`);
}
for (const marker of [
  'Durable DEK in Dart',
  'PlatformDatabaseKeyStore',
  'PLAINTEXT SQLITE FALLBACK',
  'SQLCipher 4.x family'
]) {
  assert(adr009.toLowerCase().includes(marker.toLowerCase()), `ADR009_MARKER:${marker}`);
}
for (const marker of [
  'CRYPTO_ERASURE + AUTHORITY_BARRIER > EITHER ALONE',
  'PHYSICAL_PROVIDER_RESTORE > SIMULATED_RESTORE CLAIM'
]) {
  assert(adr030.includes(marker), `ADR030_MARKER:${marker}`);
}

const moduleUrl = pathToFileURL(path.join(root, 'spikes/physical-ingress/src/financial-vault.js')).href;
const {
  REQUIRED_SQLCIPHER_VERSION,
  FINANCIAL_VAULT_DEK_BYTES,
  FINANCIAL_VAULT_SCHEMA_VERSION,
  financialVaultStaticContract
} = await import(moduleUrl);
assert(REQUIRED_SQLCIPHER_VERSION === '4.18.0', 'SOURCE_SQLCIPHER_PIN');
assert(FINANCIAL_VAULT_DEK_BYTES === 32, 'SOURCE_DEK_BYTES');
assert(FINANCIAL_VAULT_SCHEMA_VERSION === 1, 'SOURCE_SCHEMA_VERSION');
const contract = financialVaultStaticContract();
assert(contract.sqlcipherFamily === 'SQLCIPHER_4_X', 'SOURCE_SQLCIPHER_FAMILY');
assert(contract.sqlcipherVersion === '4.18.0', 'SOURCE_SQLCIPHER_VERSION');
assert(contract.dekBits === 256, 'SOURCE_DEK_BITS');
assert(contract.plaintextFallback === false, 'SOURCE_PLAINTEXT_FALLBACK');
assert(contract.durableDekInApplicationLayer === false, 'SOURCE_DURABLE_APP_DEK');
assert(contract.platformWrappedDekRequired === true, 'SOURCE_PLATFORM_WRAP');
assert(contract.atomicDerivedBatchAndTerminalSourceState === true, 'SOURCE_ATOMIC_COMMIT');
assert(contract.physicalVaultPassClaimed === false, 'SOURCE_PHYSICAL_OVERCLAIM');
assert(contract.buildReady === false, 'SOURCE_BUILD_READY_OVERCLAIM');

for (const marker of [
  "REQUIRED_SQLCIPHER_VERSION = '4.18.0'",
  'plaintextFallback !== false',
  'encryptedOpenOnly !== true',
  'withUnwrappedDatabaseKey',
  'FINANCIAL_VAULT_DEK_BYTES',
  'database.transaction',
  'insertDerivedEvidence',
  'putTerminalSourceState',
  'deleteDatabaseKeyAuthority',
  'destroyDatabaseFiles',
  'VAULT_SCHEMA_DOWNGRADE_FORBIDDEN',
  'VAULT_RAW_OR_SECRET_FIELD_FORBIDDEN'
]) {
  assert(source.includes(marker), `SOURCE_MARKER:${marker}`);
}

for (const forbidden of [
  'console.log(',
  'localStorage',
  'sessionStorage',
  'openPlaintext',
  'fallbackToPlaintext',
  'writeFileSync(',
  'gmail.googleapis.com',
  'oauth2.googleapis.com'
]) {
  assert(!source.includes(forbidden), `FORBIDDEN_SOURCE:${forbidden}`);
}

assert(/BUILD_READY\s+NO/.test(status), 'GLOBAL_BUILD_READY_STATUS');

console.log('ALPHA2_C_STATIC_CANDIDATE=PASS');
console.log('SQLCIPHER_FAMILY=SQLCIPHER_4_X');
console.log('SQLCIPHER_VERSION=4.18.0');
console.log('DEK_BITS=256');
console.log('PLAINTEXT_SQLITE_FALLBACK=0');
console.log('DURABLE_APP_DEK=0');
console.log('RAW_FINANCIAL_PLAINTEXT_COLUMNS=0');
console.log('ATOMIC_DERIVED_BATCH_AND_TERMINAL_STATE=1');
console.log('PHYSICAL_SQLCIPHER_INSPECTION=0');
console.log('P3_PHYSICAL_PASS=0');
console.log('BUILD_READY=NO');
