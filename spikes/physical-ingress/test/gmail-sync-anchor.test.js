import test from 'node:test';
import assert from 'node:assert/strict';
import { GmailRestProvider } from '../src/gmail-rest-provider.js';

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

test('GMAIL-ANCHOR-001 targeted synthetic anchor search forwards exact query and maxResults=1', async () => {
  let seenUrl;
  const provider = new GmailRestProvider({
    accessToken: 'safe-test-token',
    fetchImpl: async url => {
      seenUrl = new URL(url);
      return jsonResponse(200, { messages: [{ id: 'anchor-msg', threadId: 't1' }] });
    }
  });

  const found = await provider.listMessages({
    query: 'subject:"FinanceSensor Sync Anchor FSLA-ABC123" newer_than:1d',
    maxResults: 1
  });

  assert.equal(seenUrl.pathname.endsWith('/messages'), true);
  assert.equal(seenUrl.searchParams.get('q'), 'subject:"FinanceSensor Sync Anchor FSLA-ABC123" newer_than:1d');
  assert.equal(seenUrl.searchParams.get('maxResults'), '1');
  assert.deepEqual(found, [{ id: 'anchor-msg', threadId: 't1' }]);
});

test('GMAIL-ANCHOR-002 METADATA anchor exposes historyId and requested Subject without body retrieval', async () => {
  const provider = new GmailRestProvider({
    accessToken: 'safe-test-token',
    fetchImpl: async url => {
      const parsed = new URL(url);
      assert.equal(parsed.searchParams.get('format'), 'METADATA');
      assert.deepEqual(parsed.searchParams.getAll('metadataHeaders'), ['Subject']);
      return jsonResponse(200, {
        id: 'anchor-msg',
        historyId: '987654321',
        payload: { headers: [{ name: 'Subject', value: 'FinanceSensor Sync Anchor FSLA-ABC123' }] }
      });
    }
  });

  const anchor = await provider.getMessage({
    id: 'anchor-msg',
    format: 'METADATA',
    metadataHeaders: ['Subject']
  });

  assert.equal(anchor.historyId, '987654321');
  assert.equal(anchor.headers.Subject, 'FinanceSensor Sync Anchor FSLA-ABC123');
  assert.equal('body' in anchor, false);
  assert.equal(provider.calls.some(call => call.path.includes('/attachments/')), false);
});
