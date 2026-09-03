import test from 'node:test';
import assert from 'node:assert/strict';
import { HistoricalGmailImporter } from '../src/historical-gmail-importer.js';
import { LocalEncryptedVault } from '../src/vault.js';

class FakeProvider {
  constructor({ pages, messages, rejectResumeOnce = false }) {
    this.pages = pages;
    this.messages = messages;
    this.rejectResumeOnce = rejectResumeOnce;
    this.rejected = false;
    this.pageCalls = [];
    this.messageCalls = [];
  }

  async listMessagePage({ pageToken, maxResults, includeSpamTrash }) {
    this.pageCalls.push({ pageToken: pageToken ?? null, maxResults, includeSpamTrash });
    if (pageToken && this.rejectResumeOnce && !this.rejected) {
      this.rejected = true;
      const error = new Error('synthetic invalid page token');
      error.status = 400;
      throw error;
    }
    const key = pageToken ?? 'FIRST';
    return structuredClone(this.pages[key]);
  }

  async getMessage({ id, format }) {
    this.messageCalls.push({ id, format });
    const value = this.messages[id];
    if (!value) throw new Error(`missing synthetic message ${id}`);
    if (format === 'METADATA') {
      return { id, historyId: value.historyId, headers: structuredClone(value.headers) };
    }
    return structuredClone(value);
  }
}

const cardMessage = (id, historyId, amount, merchant) => ({
  id,
  historyId: String(historyId),
  headers: {
    From: 'Banco Demo <alerts@notificacionesbcp.com.pe>',
    Subject: 'Realizaste un consumo con tu Tarjeta de Debito BCP - Servicio de Notificaciones BCP',
    Date: `Thu, 03 Sep 2026 1${historyId}:00:00 -0500`
  },
  body: `Realizaste un consumo de S/ ${amount} con tu Tarjeta de Debito BCP en ${merchant}. Monto Total del consumo S/ ${amount}. Numero de operacion: OP-${id}`,
  attachments: []
});

const marketingMessage = (id, historyId) => ({
  id,
  historyId: String(historyId),
  headers: {
    From: 'Banco Demo <alerts@notificacionesbcp.com.pe>',
    Subject: 'Prestamo preaprobado y beneficios para tu tarjeta',
    Date: 'Thu, 03 Sep 2026 09:00:00 -0500'
  },
  body: 'Promocion S/ 10000',
  attachments: []
});

function importer(provider, vault = new LocalEncryptedVault()) {
  return { engine: new HistoricalGmailImporter({ provider, vault }), vault };
}

test('ALL_AVAILABLE traverses every page and only FULL-fetches strong candidates', async () => {
  const provider = new FakeProvider({
    pages: {
      FIRST: { messages: [{ id: 'm1' }, { id: 'm2' }], nextPageToken: 'P2' },
      P2: { messages: [{ id: 'm3' }], nextPageToken: null }
    },
    messages: {
      m1: cardMessage('m1', 101, '10.00', 'DEMO ONE'),
      m2: marketingMessage('m2', 102),
      m3: cardMessage('m3', 103, '20.00', 'DEMO TWO')
    }
  });
  const { engine } = importer(provider);
  const state = await engine.runAllAvailableActiveMailbox({ pageSize: 2 });
  assert.equal(state.historicalBootstrap.status, 'COMPLETE');
  assert.equal(state.historicalBootstrap.pagesCompleted, 2);
  assert.equal(state.historicalBootstrap.messagesEnumerated, 3);
  assert.equal(state.historicalBootstrap.metadataInspected, 3);
  assert.equal(state.historicalBootstrap.fullMessagesFetched, 2);
  assert.equal(state.historicalBootstrap.financialEvidenceCreated, 2);
  assert.equal(state.historicalBootstrap.nonCandidates, 1);
  assert.equal(state.historyCursor, '103');
  assert.equal(state.historyCursorSource, 'MESSAGE_DERIVED_HISTORY_ID');
  assert.equal(provider.pageCalls.every(call => call.includeSpamTrash === false), true);
  assert.equal(provider.pageCalls.every(call => call.maxResults === 2), true);
  assert.equal(provider.messageCalls.filter(call => call.format === 'FULL').length, 2);
});

test('paused page checkpoint resumes without redefining completed coverage', async () => {
  const provider = new FakeProvider({
    pages: {
      FIRST: { messages: [{ id: 'm1' }], nextPageToken: 'P2' },
      P2: { messages: [{ id: 'm2' }], nextPageToken: null }
    },
    messages: {
      m1: cardMessage('m1', 201, '11.00', 'DEMO ONE'),
      m2: cardMessage('m2', 202, '12.00', 'DEMO TWO')
    }
  });
  const { engine, vault } = importer(provider);
  const paused = await engine.runAllAvailableActiveMailbox({ pageSize: 1, maxPagesPerRun: 1 });
  assert.equal(paused.historicalBootstrap.status, 'PAUSED');
  assert.equal(paused.historicalBootstrap.nextPageToken, 'P2');

  const resumed = new HistoricalGmailImporter({ provider, vault });
  const complete = await resumed.runAllAvailableActiveMailbox({ pageSize: 1 });
  assert.equal(complete.historicalBootstrap.status, 'COMPLETE');
  assert.equal(complete.historicalBootstrap.financialEvidenceCreated, 2);
  assert.equal(complete.canonical.length, 2);
});

test('invalid persisted cursor restarts enumeration and source IDs prevent duplicate evidence', async () => {
  const provider = new FakeProvider({
    pages: {
      FIRST: { messages: [{ id: 'm1' }], nextPageToken: 'P2' },
      P2: { messages: [{ id: 'm2' }], nextPageToken: null }
    },
    messages: {
      m1: cardMessage('m1', 301, '13.00', 'DEMO ONE'),
      m2: cardMessage('m2', 302, '14.00', 'DEMO TWO')
    },
    rejectResumeOnce: true
  });
  const { engine, vault } = importer(provider);
  await engine.runAllAvailableActiveMailbox({ pageSize: 1, maxPagesPerRun: 1 });
  const resumed = new HistoricalGmailImporter({ provider, vault });
  const complete = await resumed.runAllAvailableActiveMailbox({ pageSize: 1 });
  assert.equal(complete.historicalBootstrap.status, 'COMPLETE');
  assert.equal(complete.historicalBootstrap.restartedFromInvalidCursor, 1);
  assert.equal(complete.evidence.length, 2);
  assert.equal(new Set(complete.evidence.map(item => item.sourceMessageId)).size, 2);
});

test('raw bodies and attachments are never copied into durable evidence', async () => {
  const provider = new FakeProvider({
    pages: { FIRST: { messages: [{ id: 'm1' }], nextPageToken: null } },
    messages: { m1: cardMessage('m1', 401, '15.00', 'DEMO PRIVATE') }
  });
  const { engine, vault } = importer(provider);
  const state = await engine.runAllAvailableActiveMailbox();
  const serialized = vault.serializedAtRest();
  assert.equal(state.metrics.rawBodiesRetained, 0);
  assert.equal(state.metrics.rawAttachmentsRetained, 0);
  assert.equal(state.metrics.plaintextFinancialCloudBytes, 0);
  assert.equal(serialized.includes('Realizaste un consumo de'), false);
  assert.equal(serialized.includes('attachments'), false);
});

test('complete empty mailbox does not invent a message-derived history anchor', async () => {
  const provider = new FakeProvider({
    pages: { FIRST: { messages: [], nextPageToken: null } },
    messages: {}
  });
  const { engine } = importer(provider);
  const state = await engine.runAllAvailableActiveMailbox();
  assert.equal(state.historicalBootstrap.status, 'COMPLETE_NO_INCREMENTAL_ANCHOR');
  assert.equal(state.historyCursor, null);
  assert.equal(state.historyCursorSource, null);
});
