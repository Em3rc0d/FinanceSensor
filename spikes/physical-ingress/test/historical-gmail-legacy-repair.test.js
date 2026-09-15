import test from 'node:test';
import assert from 'node:assert/strict';
import { HistoricalGmailImporter } from '../src/historical-gmail-importer.js';
import { LocalEncryptedVault } from '../src/vault.js';

class RepairProvider {
  constructor() {
    this.messageCalls = [];
  }

  async listMessagePage() {
    return { messages: [], nextPageToken: null };
  }

  async getMessage({ id, format }) {
    this.messageCalls.push({ id, format });
    if (id !== 'legacy-html-1') throw new Error('unexpected synthetic id');
    const headers = {
      From: 'Banco Demo <alerts@notificacionesbcp.com.pe>',
      Subject: 'Realizaste un consumo con tu Tarjeta de Debito BCP - Servicio de Notificaciones BCP',
      Date: 'Thu, 03 Sep 2026 12:00:00 -0500'
    };
    if (format === 'METADATA') return { id, historyId: '900', headers };
    return {
      id,
      historyId: '900',
      headers,
      body: '<html><body><div>Realizaste un consumo de <span style="font-weight:bold">S/ 23.83</span> con tu Tarjeta de Debito BCP en <span style="font-weight:bold">DEMO REPAIRED</span>.</div><div>Numero de operacion: LEGACY-HTML-1</div></body></html>',
      attachments: []
    };
  }
}

test('legacy markup-derived merchant is re-fetched by source id and replaced without raw-body persistence', async () => {
  const vault = new LocalEncryptedVault();
  vault.write({
    historyCursor: null,
    historyCursorSource: null,
    evidence: [{
      tenantId: 'tenant-ingress',
      sourceType: 'GMAIL',
      sourceMessageId: 'legacy-html-1',
      occurredAt: 'Thu, 03 Sep 2026 12:00:00 -0500',
      amount: 23.83,
      currency: 'PEN',
      rawMerchant: 'span style font weight bold',
      direction: 'OUT',
      semanticType: 'EXPENSE',
      confidence: 0.96,
      references: {},
      evidenceClass: 'BANK_NOTIFICATION',
      adapterId: 'BCP_CARD_PURCHASE'
    }],
    processedSourceIds: ['legacy-html-1'],
    canonical: [],
    review: [],
    historicalBootstrap: {
      mode: 'ALL_AVAILABLE_ACTIVE_MAILBOX',
      status: 'PAUSED',
      nextPageToken: null,
      pagesCompleted: 20,
      messagesEnumerated: 1000,
      metadataInspected: 1000,
      fullMessagesFetched: 1,
      financialEvidenceCreated: 1,
      nonCandidates: 999,
      adapterMatches: 1,
      reviewCandidates: 0,
      highestMessageHistoryId: '900',
      restartedFromInvalidCursor: 0,
      includeSpamTrash: false
    },
    metrics: {
      rawBodiesRetained: 0,
      rawAttachmentsRetained: 0,
      plaintextFinancialCloudBytes: 0
    }
  });

  const provider = new RepairProvider();
  const engine = new HistoricalGmailImporter({ provider, vault });
  const state = await engine.runAllAvailableActiveMailbox();
  const projection = engine.projection();

  assert.equal(state.historicalBootstrap.legacyDerivedRepairs, 1);
  assert.equal(state.historicalBootstrap.messagesEnumerated, 1000);
  assert.equal(state.historicalBootstrap.financialEvidenceCreated, 1);
  assert.equal(state.evidence[0].rawMerchant, 'DEMO REPAIRED');
  assert.equal(projection.transactions[0].merchant, 'demo repaired');
  assert.deepEqual(provider.messageCalls, [
    { id: 'legacy-html-1', format: 'METADATA' },
    { id: 'legacy-html-1', format: 'FULL' }
  ]);
  assert.equal(vault.serializedAtRest().includes('Realizaste un consumo de'), false);
  assert.equal(vault.serializedAtRest().includes('<span'), false);
});
