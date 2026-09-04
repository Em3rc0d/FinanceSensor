import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTokenExchangeRequest,
  createAuthorizationRequest,
  createPkcePair,
  GMAIL_READONLY_SCOPE
} from '../src/oauth-native-contract.js';

test('authorization and token exchange accept one identical loopback callback URI contract', () => {
  const redirectUri = 'http://127.0.0.1:43210/oauth/callback';
  const pkce = createPkcePair({ randomBytes: () => Buffer.alloc(64, 7) });
  const auth = createAuthorizationRequest({
    clientId: 'synthetic-client.apps.googleusercontent.com',
    redirectUri,
    state: 'synthetic-state',
    codeVerifier: pkce.codeVerifier,
    scopes: [GMAIL_READONLY_SCOPE]
  });
  const authUrl = new URL(auth.authorizationUrl);
  assert.equal(authUrl.searchParams.get('redirect_uri'), redirectUri);

  const token = buildTokenExchangeRequest({
    clientId: 'synthetic-client.apps.googleusercontent.com',
    clientSecret: 'synthetic-secret',
    redirectUri,
    code: 'synthetic-code',
    codeVerifier: pkce.codeVerifier
  });
  const tokenBody = new URLSearchParams(token.body);
  assert.equal(tokenBody.get('redirect_uri'), redirectUri);
});
