import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINANCIAL_VAULT_DEK_BYTES,
  FINANCIAL_VAULT_SCHEMA_VERSION,
  FinancialVaultError,
  FinancialVaultRepository,
  REQUIRED_SQLCIPHER_VERSION,
  financialVaultStaticContract
} from '../src/financial-vault.js';

function createKeyStore({ keyBytes = Buffer.alloc(32, 0x5a), omitUnwrap = false } = {}) {
  const authority = new Map();
  const events = [];
  let lastEphemeral = null;
  let sequence = 0;

  const keyStore = {
    events,
    get lastEphemeral() { return lastEphemeral; },
    async createAndWrapDatabaseKey({ keyBits }) {
      events.push(`create:${keyBits}`);
      const handleId = `synthetic-platform-handle-${++sequence}`;
      authority.set(handleId, Buffer.from(keyBytes));
      return { handleId, provider: 'SYNTHETIC_NATIVE_KEYSTORE', keyBits, version: '1' };
    },
    async withUnwrappedDatabaseKey(handle, callback) {
      events.push(`unwrap:${handle.handleId}`);
      if (omitUnwrap) return undefined;
      const stored = authority.get(handle.handleId);
      if (!stored) throw new Error('NO_KEY_AUTHORITY');
      lastEphemeral = Buffer.from(stored);
      try {
        return await callback(lastEphemeral);
      } finally {
        lastEphemeral.fill(0);
      }
    },
    async deleteDatabaseKeyAuthority(handle) {
      events.push(`delete-authority:${handle.handleId}`);
      authority.delete(handle.handleId);
    },
    hasAuthority(handleId) { return authority.has(handleId); }
  };

  return keyStore;
}

function cloneState(state) {
  return structuredClone(state);
}

function createDatabase({
  schemaVersion = 0,
  failCreateSchema = false,
  failSetSchema = false,
  failInsertAt = null,
  failTerminal = false,
  events = []
} = {}) {
  let state = {
    schemaVersion,
    schemaCreated: false,
    schemaDefinition: null,
    evidence: [],
    sources: []
  };
  let insertCount = 0;
  let closed = false;

  const database = {
    events,
    get state() { return cloneState(state); },
    get closed() { return closed; },
    async transaction(callback) {
      events.push('tx:begin');
      const before = cloneState(state);
      const tx = {
        async getSchemaVersion() { return state.schemaVersion; },
        async createSchemaV1(definition) {
          events.push('schema:create-v1');
          if (failCreateSchema) throw new Error('SYNTHETIC_SCHEMA_CREATE_FAILURE');
          state.schemaCreated = true;
          state.schemaDefinition = structuredClone(definition);
        },
        async setSchemaVersion(version) {
          events.push(`schema:set:${version}`);
          if (failSetSchema) throw new Error('SYNTHETIC_SCHEMA_VERSION_FAILURE');
          state.schemaVersion = version;
        },
        async insertDerivedEvidence(row) {
          insertCount += 1;
          events.push(`evidence:insert:${insertCount}`);
          if (failInsertAt === insertCount) throw new Error('SYNTHETIC_INSERT_FAILURE');
          state.evidence.push(structuredClone(row));
        },
        async putTerminalSourceState(sourceState) {
          events.push('source:terminal');
          if (failTerminal) throw new Error('SYNTHETIC_TERMINAL_FAILURE');
          state.sources.push(structuredClone(sourceState));
        }
      };
      try {
        const result = await callback(tx);
        events.push('tx:commit');
        return result;
      } catch (error) {
        state = before;
        events.push('tx:rollback');
        throw error;
      }
    },
    async readDerivedEvidenceByTenant(tenantId) {
      return state.evidence.filter(row => row.tenantId === tenantId).map(structuredClone);
    },
    async close() {
      events.push('db:close');
      closed = true;
    }
  };

  return database;
}

function createDriver({
  family = 'SQLCIPHER_4_X',
  version = '4.18.0',
  plaintextFallback = false,
  encryptedOpenOnly = true,
  database = createDatabase(),
  failOpen = false
} = {}) {
  const events = database.events ?? [];
  let lastOpen = null;
  let destroyed = null;
  const driver = {
    events,
    get lastOpen() { return lastOpen; },
    get destroyed() { return destroyed; },
    capabilities() { return { family, version, plaintextFallback, encryptedOpenOnly }; },
    async openEncrypted(options) {
      events.push('driver:open-encrypted');
      if (failOpen) throw new Error('SYNTHETIC_OPEN_FAILURE');
      lastOpen = {
        databasePath: options.databasePath,
        keyLength: options.keyBytes.byteLength,
        sqlcipherVersion: options.sqlcipherVersion,
        plaintextFallback: options.plaintextFallback
      };
      return database;
    },
    async destroyDatabaseFiles({ databasePath }) {
      events.push('driver:destroy-files');
      destroyed = databasePath;
    }
  };
  return { driver, database };
}

function wrappedHandle(overrides = {}) {
  return {
    handleId: 'synthetic-platform-handle-1234567890',
    provider: 'SYNTHETIC_NATIVE_KEYSTORE',
    keyBits: 256,
    version: '1',
    ...overrides
  };
}

function evidence(overrides = {}) {
  return {
    evidenceId: 'evidence-synthetic-0001',
    tenantId: 'tenant-synthetic',
    accountId: 'account-synthetic',
    instrumentId: null,
    sourceType: 'GMAIL_STATEMENT',
    evidenceClass: 'BANK_STATEMENT',
    amount: 25.5,
    currency: 'PEN',
    direction: 'OUT',
    balanceEffect: 'DECREASE',
    cashflowDirection: 'OUTFLOW',
    semanticType: 'PURCHASE',
    occurredAt: '2026-09-01T12:00:00.000Z',
    rawMerchant: 'Synthetic Merchant',
    merchantCanonical: 'SYNTHETIC MERCHANT',
    confidence: 0.95,
    references: {
      statementPeriodId: 'period-synthetic',
      profileVersion: '1.0.0-static',
      parserVersion: 'alpha2-b-v1'
    },
    ...overrides
  };
}

function terminalState(overrides = {}) {
  return {
    sourceReceiptId: 'a'.repeat(64),
    state: 'IMPORTED',
    profileVersion: '1.0.0-static',
    parserVersion: 'alpha2-b-v1',
    ...overrides
  };
}

async function openRepository({ driverOptions = {}, keyStore = createKeyStore(), handle = wrappedHandle() } = {}) {
  const { driver, database } = createDriver(driverOptions);
  // Seed authority for explicit handles without exposing it through the repository contract.
  if (!keyStore.hasAuthority?.(handle.handleId)) {
    const created = await keyStore.createAndWrapDatabaseKey({ keyBits: 256 });
    handle = created;
  }
  const repository = await FinancialVaultRepository.open({
    driver,
    keyStore,
    databasePath: '/synthetic/finance.db',
    wrappedKeyHandle: handle
  });
  return { repository, driver, database, keyStore, handle };
}

test('exact SQLCipher 4.18.0 opens encrypted-only, migrates schema v1, and wipes ephemeral DEK', async () => {
  const keyStore = createKeyStore();
  const { driver, database } = createDriver();
  const repository = await FinancialVaultRepository.create({
    driver,
    keyStore,
    databasePath: '/synthetic/finance.db'
  });

  assert.equal(driver.lastOpen.sqlcipherVersion, REQUIRED_SQLCIPHER_VERSION);
  assert.equal(driver.lastOpen.plaintextFallback, false);
  assert.equal(driver.lastOpen.keyLength, FINANCIAL_VAULT_DEK_BYTES);
  assert.equal(database.state.schemaVersion, FINANCIAL_VAULT_SCHEMA_VERSION);
  assert.deepEqual(database.state.schemaDefinition, {
    tables: ['derived_evidence', 'statement_sources', 'vault_meta'],
    durableRawContentColumns: 0
  });
  assert.ok(keyStore.lastEphemeral);
  assert.ok([...keyStore.lastEphemeral].every(byte => byte === 0));
  await repository.close();
});

for (const [label, driverOptions, expectedCode] of [
  ['wrong family', { family: 'SQLITE' }, 'VAULT_SQLCIPHER_FAMILY_MISMATCH'],
  ['wrong SQLCipher version', { version: '4.17.0' }, 'VAULT_SQLCIPHER_VERSION_MISMATCH'],
  ['plaintext fallback enabled', { plaintextFallback: true }, 'VAULT_PLAINTEXT_FALLBACK_FORBIDDEN'],
  ['encrypted-only disabled', { encryptedOpenOnly: false }, 'VAULT_ENCRYPTED_OPEN_REQUIRED']
]) {
  test(`${label} fails before key unwrap/open`, async () => {
    const keyStore = createKeyStore();
    const { driver } = createDriver(driverOptions);
    await assert.rejects(
      FinancialVaultRepository.open({
        driver,
        keyStore,
        databasePath: '/synthetic/finance.db',
        wrappedKeyHandle: wrappedHandle()
      }),
      error => error instanceof FinancialVaultError && error.code === expectedCode
    );
    assert.equal(keyStore.events.some(event => event.startsWith('unwrap:')), false);
  });
}

test('wrapped handle carrying raw key bytes is rejected', async () => {
  const keyStore = createKeyStore();
  const { driver } = createDriver();
  await assert.rejects(
    FinancialVaultRepository.open({
      driver,
      keyStore,
      databasePath: '/synthetic/finance.db',
      wrappedKeyHandle: wrappedHandle({ keyBytes: Buffer.alloc(32, 1) })
    }),
    error => error.code === 'VAULT_BINARY_DURABLE_VALUE_FORBIDDEN' || error.code === 'VAULT_RAW_OR_SECRET_FIELD_FORBIDDEN'
  );
});

test('wrong-size unwrapped DEK fails closed without plaintext fallback', async () => {
  const keyStore = createKeyStore({ keyBytes: Buffer.alloc(16, 1) });
  const created = await keyStore.createAndWrapDatabaseKey({ keyBits: 256 });
  const { driver } = createDriver();
  await assert.rejects(
    FinancialVaultRepository.open({
      driver,
      keyStore,
      databasePath: '/synthetic/finance.db',
      wrappedKeyHandle: created
    }),
    error => error.code === 'VAULT_UNWRAPPED_DEK_SIZE_INVALID'
  );
  assert.equal(driver.lastOpen, null);
});

test('missing unwrap authority fails closed and never opens database', async () => {
  const keyStore = createKeyStore({ omitUnwrap: true });
  const created = await keyStore.createAndWrapDatabaseKey({ keyBits: 256 });
  const { driver } = createDriver();
  await assert.rejects(
    FinancialVaultRepository.open({
      driver,
      keyStore,
      databasePath: '/synthetic/finance.db',
      wrappedKeyHandle: created
    }),
    error => error.code === 'VAULT_UNWRAP_AUTHORITY_UNAVAILABLE'
  );
  assert.equal(driver.lastOpen, null);
});

test('schema creation failure rolls migration back', async () => {
  const keyStore = createKeyStore();
  const created = await keyStore.createAndWrapDatabaseKey({ keyBits: 256 });
  const database = createDatabase({ failCreateSchema: true });
  const { driver } = createDriver({ database });
  await assert.rejects(
    FinancialVaultRepository.open({ driver, keyStore, databasePath: '/synthetic/finance.db', wrappedKeyHandle: created }),
    /SYNTHETIC_SCHEMA_CREATE_FAILURE/
  );
  assert.equal(database.state.schemaVersion, 0);
  assert.equal(database.state.schemaCreated, false);
  assert.ok(database.events.includes('tx:rollback'));
});

test('schema downgrade is forbidden', async () => {
  const keyStore = createKeyStore();
  const created = await keyStore.createAndWrapDatabaseKey({ keyBits: 256 });
  const database = createDatabase({ schemaVersion: 2 });
  const { driver } = createDriver({ database });
  await assert.rejects(
    FinancialVaultRepository.open({ driver, keyStore, databasePath: '/synthetic/finance.db', wrappedKeyHandle: created }),
    error => error.code === 'VAULT_SCHEMA_DOWNGRADE_FORBIDDEN'
  );
  assert.equal(database.state.schemaVersion, 2);
  assert.ok(database.events.includes('tx:rollback'));
});

test('derived evidence and terminal source state commit in one transaction', async () => {
  const { repository, database } = await openRepository();
  const result = await repository.commitDerivedBatchAndTerminalSourceState({
    derivedEvidence: [evidence(), evidence({ evidenceId: 'evidence-synthetic-0002', amount: 15, direction: 'IN' })],
    sourceState: terminalState()
  });
  assert.deepEqual(result, {
    committedEvidence: 2,
    sourceState: 'IMPORTED',
    sourceReceiptId: 'a'.repeat(64),
    atomicCommit: true,
    rawContentPersisted: false
  });
  assert.equal(database.state.evidence.length, 2);
  assert.equal(database.state.sources.length, 1);
  assert.ok(database.events.includes('tx:commit'));
});

for (const [label, override, expected] of [
  ['raw PDF bytes', { pdfBytes: Buffer.from('%PDF-') }, ['VAULT_EVIDENCE_FIELD_NOT_ALLOWLISTED', 'VAULT_BINARY_DURABLE_VALUE_FORBIDDEN', 'VAULT_RAW_OR_SECRET_FIELD_FORBIDDEN']],
  ['password', { password: 'synthetic-secret' }, ['VAULT_RAW_OR_SECRET_FIELD_FORBIDDEN']],
  ['Gmail message id', { gmailMessageId: 'gmail-raw-id' }, ['VAULT_RAW_OR_SECRET_FIELD_FORBIDDEN']],
  ['layout geometry', { layoutGeometry: [{ x: 1, y: 2 }] }, ['VAULT_RAW_OR_SECRET_FIELD_FORBIDDEN']],
  ['raw rows', { rawRows: [{ raw: 'synthetic' }] }, ['VAULT_RAW_OR_SECRET_FIELD_FORBIDDEN']],
  ['unknown durable field', { arbitraryNewField: 'nope' }, ['VAULT_EVIDENCE_FIELD_NOT_ALLOWLISTED']]
]) {
  test(`${label} is rejected before durable transaction`, async () => {
    const { repository, database } = await openRepository();
    await assert.rejects(
      repository.commitDerivedBatchAndTerminalSourceState({
        derivedEvidence: [evidence(override)],
        sourceState: terminalState()
      }),
      error => expected.includes(error.code)
    );
    assert.equal(database.state.evidence.length, 0);
    assert.equal(database.state.sources.length, 0);
  });
}

test('nested binary material in allowlisted references is rejected', async () => {
  const { repository, database } = await openRepository();
  await assert.rejects(
    repository.commitDerivedBatchAndTerminalSourceState({
      derivedEvidence: [evidence({ references: { externalReference: Buffer.from('raw') } })],
      sourceState: terminalState()
    }),
    error => error.code === 'VAULT_BINARY_DURABLE_VALUE_FORBIDDEN'
  );
  assert.equal(database.state.evidence.length, 0);
});

test('source receipt must be opaque 64-hex and cannot carry Gmail ids', async () => {
  const { repository, database } = await openRepository();
  await assert.rejects(
    repository.commitDerivedBatchAndTerminalSourceState({
      derivedEvidence: [evidence()],
      sourceState: terminalState({ sourceReceiptId: 'gmail-message-id:attachment-id' })
    }),
    error => error.code === 'VAULT_SOURCE_RECEIPT_ID_REQUIRED'
  );
  await assert.rejects(
    repository.commitDerivedBatchAndTerminalSourceState({
      derivedEvidence: [],
      sourceState: { ...terminalState({ state: 'FAILED', failureCode: 'PARSE_FAILED' }), gmailMessageId: 'raw-id' }
    }),
    error => error.code === 'VAULT_RAW_OR_SECRET_FIELD_FORBIDDEN'
  );
  assert.equal(database.state.sources.length, 0);
});

test('evidence batch cannot be committed with FAILED terminal state', async () => {
  const { repository, database } = await openRepository();
  await assert.rejects(
    repository.commitDerivedBatchAndTerminalSourceState({
      derivedEvidence: [evidence()],
      sourceState: terminalState({ state: 'FAILED', failureCode: 'PARSE_FAILED' })
    }),
    error => error.code === 'VAULT_DERIVED_BATCH_REQUIRES_IMPORTED_STATE'
  );
  assert.equal(database.state.evidence.length, 0);
  assert.equal(database.state.sources.length, 0);
});

test('failure during evidence insert rolls back both evidence and source state', async () => {
  const database = createDatabase({ failInsertAt: 2 });
  const { repository } = await openRepository({ driverOptions: { database } });
  await assert.rejects(
    repository.commitDerivedBatchAndTerminalSourceState({
      derivedEvidence: [evidence(), evidence({ evidenceId: 'evidence-synthetic-0002' })],
      sourceState: terminalState()
    }),
    error => error.code === 'VAULT_ATOMIC_COMMIT_FAILED'
  );
  assert.equal(database.state.evidence.length, 0);
  assert.equal(database.state.sources.length, 0);
  assert.ok(database.events.includes('tx:rollback'));
});

test('failure writing terminal source state rolls back derived evidence', async () => {
  const database = createDatabase({ failTerminal: true });
  const { repository } = await openRepository({ driverOptions: { database } });
  await assert.rejects(
    repository.commitDerivedBatchAndTerminalSourceState({
      derivedEvidence: [evidence()],
      sourceState: terminalState()
    }),
    error => error.code === 'VAULT_ATOMIC_COMMIT_FAILED'
  );
  assert.equal(database.state.evidence.length, 0);
  assert.equal(database.state.sources.length, 0);
  assert.ok(database.events.includes('tx:rollback'));
});

test('crypto-shred destroys key authority before database file cleanup and future open fails', async () => {
  const keyStore = createKeyStore();
  const { driver, database } = createDriver();
  const repository = await FinancialVaultRepository.create({ driver, keyStore, databasePath: '/synthetic/finance.db' });
  const handle = repository.wrappedKeyHandle;
  assert.equal(keyStore.hasAuthority(handle.handleId), true);

  const result = await repository.cryptoShred();
  assert.equal(result.authorityDeleted, true);
  assert.equal(keyStore.hasAuthority(handle.handleId), false);
  assert.equal(database.closed, true);
  assert.equal(driver.destroyed, '/synthetic/finance.db');
  const deleteIndex = keyStore.events.findIndex(event => event.startsWith('delete-authority:'));
  const closeIndex = driver.events.indexOf('db:close');
  const destroyIndex = driver.events.indexOf('driver:destroy-files');
  assert.ok(deleteIndex >= 0);
  assert.ok(closeIndex >= 0);
  assert.ok(destroyIndex > closeIndex);

  await assert.rejects(
    FinancialVaultRepository.open({ driver, keyStore, databasePath: '/synthetic/finance.db', wrappedKeyHandle: handle }),
    error => error.code === 'VAULT_ENCRYPTED_OPEN_FAILED'
  );
});

test('static contract never promotes physical vault or global build readiness', () => {
  assert.deepEqual(financialVaultStaticContract(), {
    sqlcipherFamily: 'SQLCIPHER_4_X',
    sqlcipherVersion: '4.18.0',
    schemaVersion: 1,
    dekBits: 256,
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
});
