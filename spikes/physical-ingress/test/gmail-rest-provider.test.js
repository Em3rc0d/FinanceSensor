import test from 'node:test';
import assert from 'node:assert/strict';
import { GmailRestProvider } from '../src/gmail-rest-provider.js';

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

const noWait = {
  quotaBudgetPerMinute: 1_000_000_000,
  sleepImpl: async () => {},
  randomImpl: () => 0
};

test('GMAIL-AUTH-001 provider can obtain a short-lived access token from a credential provider', async () => {
  let tokenReads = 0;
  const credentialProvider = {
    async getAccessToken() { tokenReads += 1; return 'ephemeral-token-1'; }
  };
  const seenAuth = [];
  const provider = new GmailRestProvider({
    credentialProvider,
    ...noWait,
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
    ...noWait,
    fetchImpl: async () => { calls += 1; return jsonResponse(401, { error: { message: 'Invalid Credentials' } }); }
  });

  await assert.rejects(provider.getCurrentHistoryId(), error => {
    assert.equal(error.code, 'REAUTH_REQUIRED');
    assert.equal(error.status, 401);
    assert.equal(String(error.message).includes('expired-secret-token'), false);
    return true;
  });
  assert.equal(calls, 1);
  assert.equal(unauthorizedSignals, 1);
});

test('GMAIL-AUTH-003 Gmail API error text cannot echo the bearer token and exposes only sanitized HTTP status', async () => {
  const secret = 'token-that-must-never-appear';
  const provider = new GmailRestProvider({
    accessToken: secret,
    ...noWait,
    maxRetries: 0,
    fetchImpl: async () => new Response(`upstream accidentally reflected ${secret}`, { status: 500 })
  });

  await assert.rejects(provider.getCurrentHistoryId(), error => {
    assert.equal(error.code, 'GMAIL_API_HTTP_500');
    assert.equal(error.status, 500);
    assert.equal(error.retryable, true);
    assert.equal(String(error.message).includes(secret), false);
    return true;
  });
});

test('GMAIL-AUTH-004 unknown 403 remains sanitized and non-retryable', async () => {
  const provider = new GmailRestProvider({
    accessToken: 'safe-test-token',
    ...noWait,
    fetchImpl: async () => jsonResponse(403, { error: { message: 'private upstream detail' } })
  });

  await assert.rejects(provider.getCurrentHistoryId(), error => {
    assert.equal(error.code, 'GMAIL_API_HTTP_403');
    assert.equal(error.status, 403);
    assert.equal(error.reason, 'UNKNOWN');
    assert.equal(error.retryable, false);
    assert.equal(String(error.message).includes('private upstream detail'), false);
    return true;
  });
});

test('GMAIL-AUTH-005 userRateLimitExceeded is allowlisted, retried, and raw provider message is discarded', async () => {
  let calls = 0;
  const sleeps = [];
  const provider = new GmailRestProvider({
    accessToken: 'safe-test-token',
    quotaBudgetPerMinute: 1_000_000_000,
    sleepImpl: async ms => { sleeps.push(ms); },
    randomImpl: () => 0,
    maxRetries: 2,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse(403, {
          error: {
            errors: [{ reason: 'userRateLimitExceeded', message: 'private rate detail' }],
            message: 'private provider detail'
          }
        });
      }
      return jsonResponse(200, { historyId: '84' });
    }
  });

  assert.equal(await provider.getCurrentHistoryId(), '84');
  assert.equal(calls, 2);
  assert.ok(sleeps.some(ms => ms >= 2000));
});

test('GMAIL-AUTH-006 non-retryable domainPolicy remains explicit but does not expose provider prose', async () => {
  const provider = new GmailRestProvider({
    accessToken: 'safe-test-token',
    ...noWait,
    fetchImpl: async () => jsonResponse(403, {
      error: {
        errors: [{ reason: 'domainPolicy', message: 'private admin policy prose' }]
      }
    })
  });

  await assert.rejects(provider.getCurrentHistoryId(), error => {
    assert.equal(error.code, 'GMAIL_API_HTTP_403_DOMAIN_POLICY');
    assert.equal(error.reason, 'DOMAIN_POLICY');
    assert.equal(error.retryable, false);
    assert.equal(String(error.message).includes('private admin policy prose'), false);
    return true;
  });
});

test('GMAIL-QUOTA-001 messages.get calls are paced by quota units instead of raw request count', async () => {
  let now = 10_000;
  const sleeps = [];
  const provider = new GmailRestProvider({
    accessToken: 'safe-test-token',
    quotaBudgetPerMinute: 4800,
    quotaWindowMs: 60_000,
    nowImpl: () => now,
    sleepImpl: async ms => { sleeps.push(ms); now += ms; },
    randomImpl: () => 0,
    fetchImpl: async url => {
      const id = new URL(url).pathname.split('/').pop();
      return jsonResponse(200, {
        id,
        historyId: '90',
        payload: { headers: [], body: { data: '' } }
      });
    }
  });

  await provider.getMessage({ id: 'm1', format: 'METADATA' });
  await provider.getMessage({ id: 'm2', format: 'METADATA' });
  assert.ok(sleeps.some(ms => ms >= 250));
});

test('GMAIL-MIME-001 FULL message returns attachment descriptors without downloading attachment bytes', async () => {
  const provider = new GmailRestProvider({
    accessToken: 'safe-test-token',
    ...noWait,
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

test('GMAIL-MIME-002 FULL descriptor projection excludes body data and does not download attachment bytes', async () => {
  const provider = new GmailRestProvider({
    accessToken: 'safe-test-token',
    ...noWait,
    fetchImpl: async () => jsonResponse(200, {
      id: 'statement-message',
      historyId: '91',
      payload: {
        headers: [
          { name: 'From', value: 'Bank <statement@bank.example>' },
          { name: 'Subject', value: 'Statement' }
        ],
        parts: [{
          filename: 'statement.pdf',
          mimeType: 'application/pdf',
          headers: [],
          body: { attachmentId: 'attachment-91', size: 321000 }
        }]
      }
    })
  });

  const message = await provider.getMessage({
    id: 'statement-message',
    format: 'FULL',
    descriptorOnly: true
  });
  assert.equal(message.id, 'statement-message');
  assert.deepEqual(message.attachments, [{
    filename: 'statement.pdf',
    mimeType: 'application/pdf',
    attachmentId: 'attachment-91',
    size: 321000,
    inline: false,
    contentId: null
  }]);
  assert.equal(provider.calls[0].query.format, 'FULL');
  assert.match(provider.calls[0].query.fields, /body\(attachmentId,size\)/);
  assert.doesNotMatch(provider.calls[0].query.fields, /data/);
  assert.equal(provider.calls.some(call => call.path.includes('/attachments/')), false);
});

test('GMAIL-BOOTSTRAP-001 bounded bootstrap can list only recent INBOX IDs without Gmail search q', async () => {
  let seenUrl;
  const provider = new GmailRestProvider({
    accessToken: 'safe-test-token',
    ...noWait,
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
