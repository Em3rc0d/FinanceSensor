import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GMAIL_READONLY_SCOPE,
  createPkcePair,
  createAuthorizationRequest,
  validateAuthorizationResponse,
  buildTokenExchangeRequest,
  parseDesktopCredentialsJson,
  LocalOAuthCredentialProvider
} from '../src/oauth-native-contract.js';
import { GmailRestProvider } from '../src/gmail-rest-provider.js';

const CLIENT_ID = '1234567890-example.apps.googleusercontent.com';
const CLIENT_SECRET = 'desktop-local-client-secret';
const REDIRECT_URI = 'https://example.invalid/oauth/callback';

test('OAUTH-001 PKCE uses S256 and generates a verifier within RFC bounds', () => {
  const pair = createPkcePair({ randomBytes: size => Buffer.alloc(size, 0x5a) });
  assert.equal(pair.method, 'S256');
  assert.ok(pair.codeVerifier.length >= 43 && pair.codeVerifier.length <= 128);
  assert.match(pair.codeVerifier, /^[A-Za-z0-9._~-]+$/);
  assert.match(pair.codeChallenge, /^[A-Za-z0-9_-]+$/);
  assert.ok(!pair.codeChallenge.includes('='));
});

test('OAUTH-002 authorization request is least-privilege and binds state + PKCE', () => {
  const request = createAuthorizationRequest({
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    state: 'state-123',
    codeVerifier: 'A'.repeat(64)
  });
  const url = new URL(request.authorizationUrl);
  assert.equal(url.origin, 'https://accounts.google.com');
  assert.equal(url.pathname, '/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('scope'), GMAIL_READONLY_SCOPE);
  assert.equal(url.searchParams.get('state'), 'state-123');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('code_challenge'));
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(request.codeVerifier, 'A'.repeat(64));
});

test('OAUTH-003 MK0 refuses broader Gmail scopes', () => {
  assert.throws(() => createAuthorizationRequest({
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    state: 'state-123',
    scopes: [GMAIL_READONLY_SCOPE, 'https://mail.google.com/']
  }), /scope/i);
});

test('OAUTH-004 callback state mismatch fails closed before code use', () => {
  assert.throws(() => validateAuthorizationResponse(
    'https://example.invalid/oauth/callback?code=abc&state=wrong',
    { expectedState: 'expected' }
  ), /state/i);
});

test('OAUTH-005 provider denial becomes explicit authorization error', () => {
  assert.throws(() => validateAuthorizationResponse(
    'https://example.invalid/oauth/callback?error=access_denied&state=expected',
    { expectedState: 'expected' }
  ), /access_denied/i);
});

test('OAUTH-006 Desktop DEV token exchange binds PKCE plus the Google-issued local client credential', () => {
  const request = buildTokenExchangeRequest({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
    code: 'auth-code',
    codeVerifier: 'B'.repeat(64)
  });
  assert.equal(request.url, 'https://oauth2.googleapis.com/token');
  assert.equal(request.method, 'POST');
  const params = new URLSearchParams(request.body);
  assert.equal(params.get('grant_type'), 'authorization_code');
  assert.equal(params.get('client_id'), CLIENT_ID);
  assert.equal(params.get('client_secret'), CLIENT_SECRET);
  assert.equal(params.get('redirect_uri'), REDIRECT_URI);
  assert.equal(params.get('code'), 'auth-code');
  assert.equal(params.get('code_verifier'), 'B'.repeat(64));
});

test('OAUTH-007 refresh credential authority remains local and uses the Desktop credential only at token endpoint', async () => {
  const calls = [];
  const provider = new LocalOAuthCredentialProvider({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: 'refresh-local-only',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: String(init.body) });
      return new Response(JSON.stringify({ access_token: 'short-lived', expires_in: 3600, token_type: 'Bearer' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });

  assert.equal(await provider.getAccessToken(), 'short-lived');
  assert.equal(calls.length, 1);
  const params = new URLSearchParams(calls[0].body);
  assert.equal(params.get('refresh_token'), 'refresh-local-only');
  assert.equal(params.get('client_id'), CLIENT_ID);
  assert.equal(params.get('client_secret'), CLIENT_SECRET);
  const serialized = JSON.stringify(provider);
  assert.equal(serialized.includes('refresh-local-only'), false);
  assert.equal(serialized.includes(CLIENT_SECRET), false);
});

test('OAUTH-008 repeated access-token reads reuse one unexpired refresh result', async () => {
  let refreshCalls = 0;
  const provider = new LocalOAuthCredentialProvider({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: 'refresh-local-only',
    now: () => 1_000_000,
    fetchImpl: async () => {
      refreshCalls += 1;
      return new Response(JSON.stringify({ access_token: 'cached-short-token', expires_in: 3600, token_type: 'Bearer' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });

  assert.equal(await provider.getAccessToken(), 'cached-short-token');
  assert.equal(await provider.getAccessToken(), 'cached-short-token');
  assert.equal(refreshCalls, 1);
});

test('OAUTH-009 explicit unauthorized signal invalidates cache but does not refresh by itself', async () => {
  let refreshCalls = 0;
  const provider = new LocalOAuthCredentialProvider({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: 'refresh-local-only',
    now: () => 1_000_000,
    fetchImpl: async () => {
      refreshCalls += 1;
      return new Response(JSON.stringify({ access_token: `short-${refreshCalls}`, expires_in: 3600, token_type: 'Bearer' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });

  assert.equal(await provider.getAccessToken(), 'short-1');
  assert.equal(refreshCalls, 1);
  await provider.onUnauthorized({ status: 401 });
  assert.equal(refreshCalls, 1);
  assert.equal(await provider.getAccessToken(), 'short-2');
  assert.equal(refreshCalls, 2);
});

test('OAUTH-010 concurrent token demand coalesces to one refresh request', async () => {
  let refreshCalls = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const provider = new LocalOAuthCredentialProvider({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: 'refresh-local-only',
    now: () => 1_000_000,
    fetchImpl: async () => {
      refreshCalls += 1;
      await gate;
      return new Response(JSON.stringify({ access_token: 'shared-short', expires_in: 3600, token_type: 'Bearer' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });

  const first = provider.getAccessToken();
  const second = provider.getAccessToken();
  release();
  assert.deepEqual(await Promise.all([first, second]), ['shared-short', 'shared-short']);
  assert.equal(refreshCalls, 1);
});

test('OAUTH-011 Gmail receives only the short-lived bearer; neither refresh nor Desktop client credential crosses provider boundary', async () => {
  const REFRESH = 'refresh-never-crosses';
  const ACCESS = 'short-only-crosses';
  const oauthCalls = [];
  const gmailCalls = [];
  const credentialProvider = new LocalOAuthCredentialProvider({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: REFRESH,
    fetchImpl: async (url, init) => {
      oauthCalls.push({ url: String(url), body: String(init.body) });
      return new Response(JSON.stringify({ access_token: ACCESS, expires_in: 3600, token_type: 'Bearer' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });
  const gmail = new GmailRestProvider({
    credentialProvider,
    fetchImpl: async (url, init) => {
      gmailCalls.push({ url: String(url), authorization: init.headers.Authorization });
      return new Response(JSON.stringify({ messages: [{ id: 'm-1' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });

  assert.deepEqual(await gmail.listMessages({ after: '2026-08-01T00:00:00Z', maxResults: 1 }), [{ id: 'm-1' }]);
  assert.equal(oauthCalls.length, 1);
  assert.equal(gmailCalls.length, 1);
  assert.equal(gmailCalls[0].authorization, `Bearer ${ACCESS}`);
  assert.equal(JSON.stringify(gmailCalls).includes(REFRESH), false);
  assert.equal(JSON.stringify(gmailCalls).includes(CLIENT_SECRET), false);
  assert.equal(JSON.stringify(gmail.calls).includes(REFRESH), false);
  assert.equal(JSON.stringify(gmail.calls).includes(ACCESS), false);
  assert.equal(JSON.stringify(gmail.calls).includes(CLIENT_SECRET), false);
});

test('OAUTH-012 Gmail 401 invalidates local short token without hidden retry', async () => {
  let refreshCalls = 0;
  let gmailCalls = 0;
  const credentialProvider = new LocalOAuthCredentialProvider({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: 'refresh-local-only',
    fetchImpl: async () => {
      refreshCalls += 1;
      return new Response(JSON.stringify({ access_token: `short-${refreshCalls}`, expires_in: 3600, token_type: 'Bearer' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  });
  const gmail = new GmailRestProvider({
    credentialProvider,
    fetchImpl: async () => {
      gmailCalls += 1;
      if (gmailCalls === 1) return new Response('unauthorized', { status: 401 });
      return new Response(JSON.stringify({ messages: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });

  await assert.rejects(gmail.listMessages({ after: '2026-08-01T00:00:00Z', maxResults: 1 }), error => error.code === 'REAUTH_REQUIRED');
  assert.equal(gmailCalls, 1);
  assert.equal(refreshCalls, 1);

  assert.deepEqual(await gmail.listMessages({ after: '2026-08-01T00:00:00Z', maxResults: 1 }), []);
  assert.equal(gmailCalls, 2);
  assert.equal(refreshCalls, 2);
});

test('OAUTH-013 retired Gmail CI workflow cannot become custodian of OAuth authority', () => {
  const workflow = readFileSync(new URL('../../../.github/workflows/gmail-live-spike.yml', import.meta.url), 'utf8');

  assert.match(workflow, /RETIRED/);
  assert.match(workflow, /if:\s*\$\{\{\s*false\s*\}\}/);
  assert.match(workflow, /runs-on:\s*ubuntu-latest/);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, /controlled local edge runtime/i);
  assert.match(workflow, /SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE/);

  for (const forbidden of [
    'FINANCESENSOR_GMAIL_ACCESS_TOKEN',
    'FINANCESENSOR_GMAIL_REFRESH_TOKEN',
    'GOOGLE_CLIENT_SECRET',
    'OAUTH_CLIENT_SECRET',
    'FINANCESENSOR_AUTHORIZATION_CODE',
    'FINANCESENSOR_CODE_VERIFIER',
    'FINANCESENSOR_GOOGLE_CREDENTIALS_PATH',
    '${{ secrets.',
    'run-gmail.mjs',
    'owned-oauth-level-c'
  ]) {
    assert.equal(workflow.includes(forbidden), false, `${forbidden} must remain outside retired CI`);
  }
});

test('OAUTH-014 Desktop credentials JSON is accepted only for the exact expected installed client', () => {
  const raw = JSON.stringify({
    installed: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token'
    }
  });

  assert.deepEqual(parseDesktopCredentialsJson(raw, { expectedClientId: CLIENT_ID }), {
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET
  });

  assert.throws(() => parseDesktopCredentialsJson(raw, {
    expectedClientId: 'different.apps.googleusercontent.com'
  }), /does not match expected/i);

  assert.throws(() => parseDesktopCredentialsJson(JSON.stringify({
    installed: { client_id: CLIENT_ID }
  }), { expectedClientId: CLIENT_ID }), /client_secret is required/i);

  assert.throws(() => parseDesktopCredentialsJson('{not-json', {
    expectedClientId: CLIENT_ID
  }), /invalid/i);
});
