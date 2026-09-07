import test from 'node:test';
import assert from 'node:assert/strict';
import { GmailRestProvider } from '../src/gmail-rest-provider.js';

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

test('GMAIL-PROFILE-001 profile exposes exact local account identity and history cursor', async () => {
  const provider = new GmailRestProvider({
    accessToken: 'short-test-token',
    fetchImpl: async url => {
      assert.equal(new URL(url).pathname.endsWith('/profile'), true);
      return jsonResponse(200, {
        emailAddress: 'tester@example.com',
        messagesTotal: 12,
        threadsTotal: 7,
        historyId: '12345'
      });
    }
  });

  assert.deepEqual(await provider.getProfile(), {
    emailAddress: 'tester@example.com',
    messagesTotal: 12,
    threadsTotal: 7,
    historyId: '12345'
  });
});

test('GMAIL-HISTORY-001 messageAdded filter is encoded as the official repeated historyTypes query', async () => {
  let observed;
  const provider = new GmailRestProvider({
    accessToken: 'short-test-token',
    fetchImpl: async url => {
      observed = new URL(url);
      return jsonResponse(200, {
        historyId: '105',
        history: [{
          id: '104',
          messages: [{ id: 'm-1', threadId: 't-1' }],
          messagesAdded: [{ message: { id: 'm-1', threadId: 't-1' } }]
        }]
      });
    }
  });

  const result = await provider.listHistory({ startHistoryId: '100', maxResults: 5 });
  assert.deepEqual(observed.searchParams.getAll('historyTypes'), ['messageAdded']);
  assert.equal(result.history.length, 1);
  assert.equal(result.changed.length, 1);
  assert.equal(result.diagnostics.historyRecordCount, 1);
  assert.equal(result.diagnostics.messageAddedCount, 1);
});

test('GMAIL-HISTORY-002 unfiltered diagnostic mode omits historyTypes and counts event families', async () => {
  let observed;
  const provider = new GmailRestProvider({
    accessToken: 'short-test-token',
    fetchImpl: async url => {
      observed = new URL(url);
      return jsonResponse(200, {
        historyId: '210',
        history: [{
          id: '205',
          messages: [{ id: 'm-2', threadId: 't-2' }],
          labelsAdded: [{ message: { id: 'm-2' }, labelIds: ['INBOX'] }]
        }]
      });
    }
  });

  const result = await provider.listHistory({ startHistoryId: '200', maxResults: 5, historyTypes: null });
  assert.deepEqual(observed.searchParams.getAll('historyTypes'), []);
  assert.equal(result.history.length, 0);
  assert.equal(result.changed.length, 1);
  assert.equal(result.diagnostics.messageAddedCount, 0);
  assert.equal(result.diagnostics.labelAddedCount, 1);
});

test('GMAIL-HISTORY-003 empty history remains a successful zero-change observation', async () => {
  const provider = new GmailRestProvider({
    accessToken: 'short-test-token',
    fetchImpl: async () => jsonResponse(200, { historyId: '300' })
  });
  const result = await provider.listHistory({ startHistoryId: '300', maxResults: 5 });
  assert.deepEqual(result.history, []);
  assert.deepEqual(result.changed, []);
  assert.equal(result.historyId, '300');
  assert.equal(result.diagnostics.historyRecordCount, 0);
});
