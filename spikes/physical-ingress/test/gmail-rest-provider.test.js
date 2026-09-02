import test from 'node:test';
import assert from 'node:assert/strict';
import { GmailRestProvider } from '../src/gmail-rest-provider.js';

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

test('GMAIL-AUTH-001 provider can obtain a short-lived access token from a credential provider', async () => {
  let tokenReads = 0;
  const credentialProvider = {
    async getAccessToken() { tokenReads += 1; return 'ephemeral-token-1'; }
  };
  const seenAuth = [];
  const provider = new GmailRestProvider({
    credentialProvider,
    fetchImpl: async (_url, init) => {
      seenAuth.push(init.headers.Authorization);
      return jsonResponse(200, { historyId: '42' });
    }
  });

  assert.equal(await provider.getCurrentHistoryId(), '42');
  assert.equal(tokenReads, 1);
  assert.deepEqual(seenAuth, ['Bearer ephemeral-token-1']);
});

test('GMAIL-AUTH-002 a 401 becomes explicit REAUTH_REQUIRED without silently retrying forever', async () => {
  let calls = 0;
  let unauthorizedSignals = 0;
  const credentialProvider = {
    async getAccessToken() { return 'expired-secret-token'; },
    async onUnauthorized() { unauthorizedSignals += 1; }
  };
  const provider = new GmailRestProvider({
    credentialProvider,
    fetchImpl: async () => { calls += 1; return jsonResponse(401, { error: { message: 'Invalid Credentials' } }); }
  });

  await assert.rejects(provider.getCurrentHistoryId(), error => {
    assert.equal(error.code, 'REAUTH_REQUIRED');
    assert.equal(String(error.message).includes('expired-secret-token'), false);
    return true;
  });
  assert.equal(calls, 1);
  assert.equal(unauthorizedSignals, 1);
});

test('GMAIL-AUTH-003 Gmail API error text cannot echo the bearer token', async () => {
  const secret = 'token-that-must-never-appear';
  const provider = new GmailRestProvider({
    accessToken: secret,
    fetchImpl: async () => new Response(`upstream accidentally reflected ${secret}`, { status: 500 })
  });

  await assert.rejects(provider.getCurrentHistoryId(), error => {
    assert.equal(String(error.message).includes(secret), false);
    return true;
  });
});

test('GMAIL-MIME-001 FULL message returns attachment descriptors without downloading attachment bytes', async () => {
  const provider = new GmailRestProvider({
    accessToken: 'safe-test-token',
    fetchImpl: async () => jsonResponse(200, {
      id: 'msg-1',
      historyId: '9',
      payload: {
        headers: [{ name:'Subject', value:'Purchase receipt' }],
        mimeType: 'multipart/related',
        parts: [
          { mimeType:'text/plain', filename:'', body:{ data: Buffer.from('PEN 10.00').toString('base64url') } },
          { mimeType:'image/png', filename:'logo.png', headers:[{name:'Content-ID',value:'<logo>'}], body:{ attachmentId:'att-inline', size:321 } },
          { mimeType:'application/pdf', filename:'receipt.pdf', body:{ attachmentId:'att-pdf', size:4567 } }
        ]
      }
    })
  });

  const message = await provider.getMessage({ id:'msg-1', format:'FULL' });
  assert.equal(message.body.includes('PEN 10.00'), true);
  assert.deepEqual(message.attachments, [
    { filename:'logo.png', mimeType:'image/png', attachmentId:'att-inline', size:321, inline:true, contentId:'logo' },
    { filename:'receipt.pdf', mimeType:'application/pdf', attachmentId:'att-pdf', size:4567, inline:false, contentId:null }
  ]);
  assert.equal(provider.calls.filter(call => call.path.includes('/attachments/')).length, 0);
});

test('GMAIL-BOOTSTRAP-001 bounded bootstrap can list only recent INBOX IDs without Gmail search q', async () => {
  let seenUrl;
  const provider = new GmailRestProvider({
    accessToken: 'safe-test-token',
    fetchImpl: async url => {
      seenUrl = new URL(url);
      return jsonResponse(200, { messages: [{ id: 'recent-1', threadId: 'thread-1' }] });
    }
  });

  const found = await provider.listMessages({ maxResults: 5, labelIds: ['INBOX'] });
  assert.deepEqual(found, [{ id: 'recent-1', threadId: 'thread-1' }]);
  assert.equal(seenUrl.searchParams.get('q'), null);
  assert.equal(seenUrl.searchParams.get('maxResults'), '5');
  assert.deepEqual(seenUrl.searchParams.getAll('labelIds'), ['INBOX']);
});
