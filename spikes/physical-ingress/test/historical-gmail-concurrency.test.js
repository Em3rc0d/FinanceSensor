import test from 'node:test';
import assert from 'node:assert/strict';
import { HistoricalGmailImporter } from '../src/historical-gmail-importer.js';
import { LocalEncryptedVault } from '../src/vault.js';

const FIXED_DATE = 'Thu, 03 Sep 2026 12:00:00 -0500';

function cardMessage(id, historyId, amount, merchant) {
  return {
    id,
    historyId: String(historyId),
    headers: {
      From: 'Banco Demo <alerts@notificacionesbcp.com.pe>',
      Subject: 'Realizaste un consumo con tu Tarjeta de Debito BCP - Servicio de Notificaciones BCP',
      Date: FIXED_DATE
    },
    body: `Realizaste un consumo de S/ ${amount} con tu Tarjeta de Debito BCP en ${merchant}. Monto Total del consumo S/ ${amount}. Numero de operacion: OP-${id}`,
    attachments: []
  };
}

class ScrambledProvider {
  constructor() {
    this.ids = ['m4', 'm2', 'm1', 'm3'];
    this.messages = {
      m1: cardMessage('m1', 601, '11.10', 'DEMO ALPHA'),
      m2: cardMessage('m2', 602, '22.20', 'DEMO BETA'),
      m3: cardMessage('m3', 603, '33.30', 'DEMO GAMMA'),
      m4: cardMessage('m4', 604, '44.40', 'DEMO DELTA')
    };
  }

  async listMessagePage() {
    return { messages: this.ids.map(id => ({ id })), nextPageToken: null };
  }

  async getMessage({ id, format }) {
    const delayById = { m1: 28, m2: 18, m3: 8, m4: 2 };
    await new Promise(resolve => setTimeout(resolve, delayById[id]));
    const value = this.messages[id];
    if (format === 'METADATA') {
      return { id, historyId: value.historyId, headers: structuredClone(value.headers) };
    }
    return structuredClone(value);
  }
}

async function projectionAt(concurrency) {
  const engine = new HistoricalGmailImporter({
    provider: new ScrambledProvider(),
    vault: new LocalEncryptedVault()
  });
  await engine.runAllAvailableActiveMailbox({ pageSize: 4, messageConcurrency: concurrency });
  return engine.projection();
}

test('concurrency 1 and 4 yield the same canonical projection despite response reordering', async () => {
  const serial = await projectionAt(1);
  const concurrent = await projectionAt(4);
  assert.equal(serial.coverage.status, 'COMPLETE');
  assert.equal(concurrent.coverage.status, 'COMPLETE');
  assert.equal(serial.transactions.length, 4);
  assert.deepEqual(concurrent.transactions, serial.transactions);
  assert.equal(concurrent.historyCursorSource, 'MESSAGE_DERIVED_HISTORY_ID');
});
