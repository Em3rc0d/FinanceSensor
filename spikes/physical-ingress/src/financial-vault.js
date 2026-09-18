const REQUIRED_SQLCIPHER_FAMILY = 'SQLCIPHER_4_X';
export const REQUIRED_SQLCIPHER_VERSION = '4.18.0';
export const FINANCIAL_VAULT_SCHEMA_VERSION = 1;
export const FINANCIAL_VAULT_DEK_BYTES = 32;

const TERMINAL_SOURCE_STATES = new Set(['IMPORTED', 'QUARANTINED', 'FAILED', 'DISCARDED']);
const ALLOWED_DIRECTIONS = new Set(['IN', 'OUT', null]);
const ALLOWED_EVIDENCE_FIELDS = new Set([
  'evidenceId',
  'tenantId',
  'accountId',
  'instrumentId',
  'sourceType',
  'evidenceClass',
  'amount',
  'currency',
  'direction',
  'balanceEffect',
  'cashflowDirection',
  'semanticType',
  'occurredAt',
  'rawMerchant',
  'merchantCanonical',
  'confidence',
  'references'
]);
const ALLOWED_REFERENCE_FIELDS = new Set([
  'externalReference',
  'statementPeriodId',
  'transactionReference',
  'profileVersion',
  'parserVersion'
]);
const FORBIDDEN_DURABLE_KEYS = new Set([
  'pdf',
  'pdfbytes',
  'attachmentbytes',
  'decryptedtext',
  'ocrpages',
  'layout',
  'layoutgeometry',
  'geometry',
  'rawrows',
  'gmailbody',
  'mimebody',
  'bodydata',
  'password',
  'passphrase',
  'dek',
  'databasekey',
  'keybytes',
  'sourcemessageid',
  'gmailmessageid',
  'attachmentid'
]);

export class FinancialVaultError extends Error {
  constructor(code) {
    super(code);
    this.name = 'FinancialVaultError';
    this.code = code;
  }
}

const fail = code => { throw new FinancialVaultError(code); };
const plainObject = value => value && typeof value === 'object' && !Array.isArray(value) && !Buffer.isBuffer(value) && !(value instanceof Uint8Array);

function assertNoForbiddenDurableMaterial(value, path = 'root') {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) fail('VAULT_BINARY_DURABLE_VALUE_FORBIDDEN');
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenDurableMaterial(item, `${path}[${index}]`));
    return;
  }
  if (!plainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (FORBIDDEN_DURABLE_KEYS.has(normalized)) fail('VAULT_RAW_OR_SECRET_FIELD_FORBIDDEN');
    assertNoForbiddenDurableMaterial(child, `${path}.${key}`);
  }
}

function assertOpaqueReceiptId(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) fail('VAULT_SOURCE_RECEIPT_ID_REQUIRED');
}

function assertWrappedHandle(handle) {
  if (!plainObject(handle)) fail('VAULT_WRAPPED_KEY_HANDLE_REQUIRED');
  assertNoForbiddenDurableMaterial(handle);
  if (typeof handle.handleId !== 'string' || handle.handleId.length < 16 || handle.handleId.length > 256) {
    fail('VAULT_WRAPPED_KEY_HANDLE_ID_INVALID');
  }
  if (typeof handle.provider !== 'string' || handle.provider.length < 2 || handle.provider.length > 64) {
    fail('VAULT_WRAPPED_KEY_PROVIDER_INVALID');
  }
  if (handle.keyBits !== 256) fail('VAULT_WRAPPED_KEY_BITS_INVALID');
  return Object.freeze({
    handleId: handle.handleId,
    provider: handle.provider,
    keyBits: handle.keyBits,
    version: String(handle.version ?? '1')
  });
}

function assertDriver(driver) {
  if (!driver || typeof driver.capabilities !== 'function' || typeof driver.openEncrypted !== 'function') {
    fail('VAULT_SQLCIPHER_DRIVER_REQUIRED');
  }
  const capabilities = driver.capabilities();
  if (!plainObject(capabilities)) fail('VAULT_SQLCIPHER_CAPABILITIES_REQUIRED');
  if (capabilities.family !== REQUIRED_SQLCIPHER_FAMILY) fail('VAULT_SQLCIPHER_FAMILY_MISMATCH');
  if (capabilities.version !== REQUIRED_SQLCIPHER_VERSION) fail('VAULT_SQLCIPHER_VERSION_MISMATCH');
  if (capabilities.plaintextFallback !== false) fail('VAULT_PLAINTEXT_FALLBACK_FORBIDDEN');
  if (capabilities.encryptedOpenOnly !== true) fail('VAULT_ENCRYPTED_OPEN_REQUIRED');
}

function assertKeyStore(keyStore) {
  if (!keyStore ||
      typeof keyStore.createAndWrapDatabaseKey !== 'function' ||
      typeof keyStore.withUnwrappedDatabaseKey !== 'function' ||
      typeof keyStore.deleteDatabaseKeyAuthority !== 'function') {
    fail('VAULT_PLATFORM_KEYSTORE_REQUIRED');
  }
}

function assertEvidenceRow(row) {
  if (!plainObject(row)) fail('VAULT_EVIDENCE_ROW_INVALID');
  assertNoForbiddenDurableMaterial(row);
  for (const key of Object.keys(row)) {
    if (!ALLOWED_EVIDENCE_FIELDS.has(key)) fail('VAULT_EVIDENCE_FIELD_NOT_ALLOWLISTED');
  }
  if (typeof row.evidenceId !== 'string' || row.evidenceId.length < 8) fail('VAULT_EVIDENCE_ID_REQUIRED');
  if (typeof row.tenantId !== 'string' || row.tenantId.length < 1) fail('VAULT_TENANT_ID_REQUIRED');
  if (!Number.isFinite(Number(row.amount)) || Number(row.amount) < 0) fail('VAULT_EVIDENCE_AMOUNT_INVALID');
  if (typeof row.currency !== 'string' || !/^[A-Z]{3}$/.test(row.currency)) fail('VAULT_EVIDENCE_CURRENCY_INVALID');
  if (!ALLOWED_DIRECTIONS.has(row.direction ?? null)) fail('VAULT_EVIDENCE_DIRECTION_INVALID');
  if (typeof row.occurredAt !== 'string' || Number.isNaN(Date.parse(row.occurredAt))) fail('VAULT_EVIDENCE_TIME_INVALID');
  if (row.references != null) {
    if (!plainObject(row.references)) fail('VAULT_EVIDENCE_REFERENCES_INVALID');
    for (const key of Object.keys(row.references)) {
      if (!ALLOWED_REFERENCE_FIELDS.has(key)) fail('VAULT_REFERENCE_FIELD_NOT_ALLOWLISTED');
    }
  }
}

function assertTerminalSourceState(sourceState, evidenceCount) {
  if (!plainObject(sourceState)) fail('VAULT_TERMINAL_SOURCE_STATE_REQUIRED');
  assertNoForbiddenDurableMaterial(sourceState);
  const allowed = new Set(['sourceReceiptId', 'state', 'profileVersion', 'parserVersion', 'failureCode']);
  for (const key of Object.keys(sourceState)) {
    if (!allowed.has(key)) fail('VAULT_SOURCE_STATE_FIELD_NOT_ALLOWLISTED');
  }
  assertOpaqueReceiptId(sourceState.sourceReceiptId);
  if (!TERMINAL_SOURCE_STATES.has(sourceState.state)) fail('VAULT_SOURCE_STATE_NOT_TERMINAL');
  if (evidenceCount > 0 && sourceState.state !== 'IMPORTED') fail('VAULT_DERIVED_BATCH_REQUIRES_IMPORTED_STATE');
  if (sourceState.failureCode != null && !/^[A-Z0-9_]{3,80}$/.test(sourceState.failureCode)) {
    fail('VAULT_FAILURE_CODE_INVALID');
  }
}

async function withProtectedDek({ keyStore, wrappedKeyHandle, action }) {
  let callbackInvoked = false;
  const result = await keyStore.withUnwrappedDatabaseKey(wrappedKeyHandle, async keyBytes => {
    callbackInvoked = true;
    if (!(Buffer.isBuffer(keyBytes) || keyBytes instanceof Uint8Array)) fail('VAULT_UNWRAPPED_DEK_INVALID');
    if (keyBytes.byteLength !== FINANCIAL_VAULT_DEK_BYTES) fail('VAULT_UNWRAPPED_DEK_SIZE_INVALID');
    return action(keyBytes);
  });
  if (!callbackInvoked) fail('VAULT_UNWRAP_AUTHORITY_UNAVAILABLE');
  return result;
}

async function migrateSchemaV1(database) {
  if (!database || typeof database.transaction !== 'function') fail('VAULT_DATABASE_TRANSACTION_REQUIRED');
  await database.transaction(async tx => {
    if (typeof tx.getSchemaVersion !== 'function' ||
        typeof tx.createSchemaV1 !== 'function' ||
        typeof tx.setSchemaVersion !== 'function') {
      fail('VAULT_MIGRATION_SURFACE_INVALID');
    }
    const current = Number(await tx.getSchemaVersion());
    if (!Number.isInteger(current) || current < 0) fail('VAULT_SCHEMA_VERSION_INVALID');
    if (current > FINANCIAL_VAULT_SCHEMA_VERSION) fail('VAULT_SCHEMA_DOWNGRADE_FORBIDDEN');
    if (current === FINANCIAL_VAULT_SCHEMA_VERSION) return;
    if (current !== 0) fail('VAULT_MIGRATION_PATH_UNSUPPORTED');
    await tx.createSchemaV1({
      tables: Object.freeze(['derived_evidence', 'statement_sources', 'vault_meta']),
      durableRawContentColumns: 0
    });
    await tx.setSchemaVersion(FINANCIAL_VAULT_SCHEMA_VERSION);
  });
}

export class FinancialVaultRepository {
  constructor({ driver, keyStore, database, databasePath, wrappedKeyHandle }) {
    this.driver = driver;
    this.keyStore = keyStore;
    this.database = database;
    this.databasePath = databasePath;
    this.wrappedKeyHandle = wrappedKeyHandle;
    this.closed = false;
    this.shredded = false;
  }

  static async create({ driver, keyStore, databasePath }) {
    assertDriver(driver);
    assertKeyStore(keyStore);
    if (typeof databasePath !== 'string' || databasePath.length < 1) fail('VAULT_DATABASE_PATH_REQUIRED');
    const handle = assertWrappedHandle(await keyStore.createAndWrapDatabaseKey({ keyBits: 256 }));
    return FinancialVaultRepository.open({ driver, keyStore, databasePath, wrappedKeyHandle: handle });
  }

  static async open({ driver, keyStore, databasePath, wrappedKeyHandle }) {
    assertDriver(driver);
    assertKeyStore(keyStore);
    if (typeof databasePath !== 'string' || databasePath.length < 1) fail('VAULT_DATABASE_PATH_REQUIRED');
    const handle = assertWrappedHandle(wrappedKeyHandle);
    let database;
    try {
      database = await withProtectedDek({
        keyStore,
        wrappedKeyHandle: handle,
        action: keyBytes => driver.openEncrypted({
          databasePath,
          keyBytes,
          sqlcipherVersion: REQUIRED_SQLCIPHER_VERSION,
          plaintextFallback: false
        })
      });
    } catch (error) {
      if (error instanceof FinancialVaultError) throw error;
      fail('VAULT_ENCRYPTED_OPEN_FAILED');
    }
    if (!database) fail('VAULT_ENCRYPTED_OPEN_FAILED');
    const repository = new FinancialVaultRepository({ driver, keyStore, database, databasePath, wrappedKeyHandle: handle });
    await migrateSchemaV1(database);
    return repository;
  }

  async commitDerivedBatchAndTerminalSourceState({ derivedEvidence, sourceState }) {
    if (this.closed || this.shredded) fail('VAULT_NOT_OPEN');
    if (!Array.isArray(derivedEvidence)) fail('VAULT_DERIVED_BATCH_REQUIRED');
    derivedEvidence.forEach(assertEvidenceRow);
    assertTerminalSourceState(sourceState, derivedEvidence.length);
    const rows = structuredClone(derivedEvidence);
    const terminal = structuredClone(sourceState);

    try {
      await this.database.transaction(async tx => {
        if (typeof tx.insertDerivedEvidence !== 'function' || typeof tx.putTerminalSourceState !== 'function') {
          fail('VAULT_REPOSITORY_SURFACE_INVALID');
        }
        for (const row of rows) await tx.insertDerivedEvidence(row);
        await tx.putTerminalSourceState(terminal);
      });
    } catch (error) {
      if (error instanceof FinancialVaultError) throw error;
      fail('VAULT_ATOMIC_COMMIT_FAILED');
    }

    return Object.freeze({
      committedEvidence: rows.length,
      sourceState: terminal.state,
      sourceReceiptId: terminal.sourceReceiptId,
      atomicCommit: true,
      rawContentPersisted: false
    });
  }

  async readDerivedEvidenceByTenant(tenantId) {
    if (this.closed || this.shredded) fail('VAULT_NOT_OPEN');
    if (typeof tenantId !== 'string' || tenantId.length < 1) fail('VAULT_TENANT_ID_REQUIRED');
    if (typeof this.database.readDerivedEvidenceByTenant !== 'function') fail('VAULT_READ_SURFACE_INVALID');
    const rows = await this.database.readDerivedEvidenceByTenant(tenantId);
    if (!Array.isArray(rows)) fail('VAULT_READ_RESULT_INVALID');
    rows.forEach(assertEvidenceRow);
    return structuredClone(rows);
  }

  async close() {
    if (this.closed) return;
    if (typeof this.database?.close === 'function') await this.database.close();
    this.closed = true;
  }

  async cryptoShred() {
    if (this.shredded) return Object.freeze({ authorityDeleted: true, databaseFilesDeletionAttempted: true, idempotent: true });
    await this.keyStore.deleteDatabaseKeyAuthority(this.wrappedKeyHandle);
    this.shredded = true;
    await this.close();
    if (typeof this.driver.destroyDatabaseFiles !== 'function') fail('VAULT_DATABASE_FILE_DELETION_SURFACE_REQUIRED');
    await this.driver.destroyDatabaseFiles({ databasePath: this.databasePath });
    return Object.freeze({
      authorityDeleted: true,
      databaseFilesDeletionAttempted: true,
      idempotent: false,
      financialPlaintextReturned: false
    });
  }
}

export function financialVaultStaticContract() {
  return Object.freeze({
    sqlcipherFamily: REQUIRED_SQLCIPHER_FAMILY,
    sqlcipherVersion: REQUIRED_SQLCIPHER_VERSION,
    schemaVersion: FINANCIAL_VAULT_SCHEMA_VERSION,
    dekBits: FINANCIAL_VAULT_DEK_BYTES * 8,
    plaintextFallback: false,
    durableDekInApplicationLayer: false,
    platformWrappedDekRequired: true,
    atomicDerivedBatchAndTerminalSourceState: true,
    durableRawPdf: false,
    durableDecryptedText: false,
    durableLayoutGeometry: false,
    durableRawRows: false,
    physicalVaultPassClaimed: false,
    buildReady: false
  });
}
