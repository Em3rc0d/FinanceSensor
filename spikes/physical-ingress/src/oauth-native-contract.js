import { createHash, randomBytes as nodeRandomBytes } from 'node:crypto';

export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const VERIFIER_RE = /^[A-Za-z0-9._~-]{43,128}$/;

function base64Url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function assertNonEmpty(value, name) {
  if (!value || !String(value).trim()) throw new Error(`${name} is required`);
  return String(value);
}

function assertVerifier(codeVerifier) {
  const verifier = assertNonEmpty(codeVerifier, 'codeVerifier');
  if (!VERIFIER_RE.test(verifier)) {
    throw new Error('codeVerifier must contain 43-128 RFC 7636 unreserved characters');
  }
  return verifier;
}

function challengeFor(verifier) {
  return base64Url(createHash('sha256').update(verifier, 'ascii').digest());
}

function sanitizeOAuthErrorText(text = '', secrets = []) {
  let safe = String(text).slice(0, 500);
  for (const secret of secrets.filter(Boolean)) safe = safe.split(String(secret)).join('[REDACTED]');
  return safe;
}

export class OAuthAuthorizationError extends Error {
  constructor(code, message = code) {
    super(`OAUTH_AUTHORIZATION_ERROR:${code}${message && message !== code ? `:${message}` : ''}`);
    this.name = 'OAuthAuthorizationError';
    this.code = code;
  }
}

export class OAuthTokenError extends Error {
  constructor(code, message = code) {
    super(`OAUTH_TOKEN_ERROR:${code}${message && message !== code ? `:${message}` : ''}`);
    this.name = 'OAuthTokenError';
    this.code = code;
  }
}

export function createPkcePair({ randomBytes = nodeRandomBytes } = {}) {
  if (typeof randomBytes !== 'function') throw new Error('randomBytes implementation required');
  const codeVerifier = base64Url(randomBytes(64));
  assertVerifier(codeVerifier);
  return {
    method: 'S256',
    codeVerifier,
    codeChallenge: challengeFor(codeVerifier)
  };
}

export function createAuthorizationRequest({
  clientId,
  redirectUri,
  state,
  codeVerifier,
  scopes = [GMAIL_READONLY_SCOPE],
  loginHint
}) {
  const resolvedClientId = assertNonEmpty(clientId, 'clientId');
  const resolvedRedirectUri = assertNonEmpty(redirectUri, 'redirectUri');
  const resolvedState = assertNonEmpty(state, 'state');
  const normalizedScopes = Array.isArray(scopes) ? scopes.map(String) : [];

  if (normalizedScopes.length !== 1 || normalizedScopes[0] !== GMAIL_READONLY_SCOPE) {
    throw new Error('MK0 OAuth scope must be exactly gmail.readonly');
  }

  const resolvedVerifier = codeVerifier ? assertVerifier(codeVerifier) : createPkcePair().codeVerifier;
  const codeChallenge = challengeFor(resolvedVerifier);
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set('client_id', resolvedClientId);
  url.searchParams.set('redirect_uri', resolvedRedirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GMAIL_READONLY_SCOPE);
  url.searchParams.set('state', resolvedState);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'offline');
  if (loginHint) url.searchParams.set('login_hint', String(loginHint));

  return {
    authorizationUrl: url.toString(),
    codeVerifier: resolvedVerifier,
    state: resolvedState,
    scope: GMAIL_READONLY_SCOPE,
    pkceMethod: 'S256'
  };
}

export function validateAuthorizationResponse(callbackUrl, { expectedState } = {}) {
  const expected = assertNonEmpty(expectedState, 'expectedState');
  const parsed = new URL(assertNonEmpty(callbackUrl, 'callbackUrl'));
  const returnedState = parsed.searchParams.get('state');

  if (!returnedState || returnedState !== expected) {
    throw new OAuthAuthorizationError('STATE_MISMATCH');
  }

  const providerError = parsed.searchParams.get('error');
  if (providerError) {
    throw new OAuthAuthorizationError(providerError, parsed.searchParams.get('error_description') ?? providerError);
  }

  const code = parsed.searchParams.get('code');
  if (!code) throw new OAuthAuthorizationError('MISSING_CODE');
  return { code, state: returnedState };
}

export function buildTokenExchangeRequest({ clientId, redirectUri, code, codeVerifier }) {
  const params = new URLSearchParams();
  params.set('grant_type', 'authorization_code');
  params.set('client_id', assertNonEmpty(clientId, 'clientId'));
  params.set('redirect_uri', assertNonEmpty(redirectUri, 'redirectUri'));
  params.set('code', assertNonEmpty(code, 'code'));
  params.set('code_verifier', assertVerifier(codeVerifier));

  return {
    url: TOKEN_ENDPOINT,
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  };
}

export class LocalOAuthCredentialProvider {
  #clientId;
  #refreshToken;
  #fetch;

  constructor({ clientId, refreshToken, fetchImpl = globalThis.fetch }) {
    this.#clientId = assertNonEmpty(clientId, 'clientId');
    this.#refreshToken = assertNonEmpty(refreshToken, 'refreshToken');
    if (typeof fetchImpl !== 'function') throw new Error('fetch implementation required');
    this.#fetch = fetchImpl;
  }

  toJSON() {
    return { type: 'LocalOAuthCredentialProvider', credentialAuthority: 'DEVICE_LOCAL' };
  }

  async getAccessToken() {
    const params = new URLSearchParams();
    params.set('grant_type', 'refresh_token');
    params.set('client_id', this.#clientId);
    params.set('refresh_token', this.#refreshToken);

    const response = await this.#fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new OAuthTokenError(
        `HTTP_${response.status}`,
        sanitizeOAuthErrorText(raw, [this.#refreshToken])
      );
    }

    const payload = await response.json();
    if (!payload?.access_token) throw new OAuthTokenError('MISSING_ACCESS_TOKEN');
    return String(payload.access_token);
  }
}
