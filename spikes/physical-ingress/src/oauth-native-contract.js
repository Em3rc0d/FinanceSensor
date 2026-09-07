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

export function parseDesktopCredentialsJson(raw, { expectedClientId } = {}) {
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new Error('Desktop credentials JSON is invalid');
  }

  const installed = parsed?.installed;
  if (!installed || typeof installed !== 'object') {
    throw new Error('Desktop credentials JSON must contain an installed client');
  }

  const clientId = assertNonEmpty(installed.client_id, 'installed.client_id');
  const clientSecret = assertNonEmpty(installed.client_secret, 'installed.client_secret');

  if (expectedClientId && clientId !== String(expectedClientId)) {
    throw new Error('Desktop credentials client_id does not match expected FinanceSensor client');
  }

  return { clientId, clientSecret };
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

export function buildTokenExchangeRequest({ clientId, clientSecret, redirectUri, code, codeVerifier }) {
  const params = new URLSearchParams();
  params.set('grant_type', 'authorization_code');
  params.set('client_id', assertNonEmpty(clientId, 'clientId'));
  if (clientSecret) params.set('client_secret', assertNonEmpty(clientSecret, 'clientSecret'));
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
  #clientSecret;
  #refreshToken;
  #fetch;
  #now;
  #refreshSkewMs;
  #accessToken = null;
  #expiresAtMs = 0;
  #refreshPromise = null;

  constructor({
    clientId,
    clientSecret,
    refreshToken,
    fetchImpl = globalThis.fetch,
    now = () => Date.now(),
    refreshSkewMs = 60_000
  }) {
    this.#clientId = assertNonEmpty(clientId, 'clientId');
    this.#clientSecret = clientSecret ? assertNonEmpty(clientSecret, 'clientSecret') : null;
    this.#refreshToken = assertNonEmpty(refreshToken, 'refreshToken');
    if (typeof fetchImpl !== 'function') throw new Error('fetch implementation required');
    if (typeof now !== 'function') throw new Error('now implementation required');
    if (!Number.isFinite(refreshSkewMs) || refreshSkewMs < 0) throw new Error('refreshSkewMs must be non-negative');
    this.#fetch = fetchImpl;
    this.#now = now;
    this.#refreshSkewMs = Number(refreshSkewMs);
  }

  toJSON() {
    return { type: 'LocalOAuthCredentialProvider', credentialAuthority: 'DEVICE_LOCAL' };
  }

  #hasUsableAccessToken() {
    return Boolean(this.#accessToken) && this.#now() < (this.#expiresAtMs - this.#refreshSkewMs);
  }

  async #refreshAccessToken() {
    const params = new URLSearchParams();
    params.set('grant_type', 'refresh_token');
    params.set('client_id', this.#clientId);
    if (this.#clientSecret) params.set('client_secret', this.#clientSecret);
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
        sanitizeOAuthErrorText(raw, [this.#refreshToken, this.#clientSecret])
      );
    }

    const payload = await response.json();
    if (!payload?.access_token) throw new OAuthTokenError('MISSING_ACCESS_TOKEN');

    const expiresInSeconds = Number(payload.expires_in);
    const boundedLifetimeMs = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
      ? expiresInSeconds * 1000
      : 5 * 60 * 1000;

    this.#accessToken = String(payload.access_token);
    this.#expiresAtMs = this.#now() + boundedLifetimeMs;
    return this.#accessToken;
  }

  async getAccessToken() {
    if (this.#hasUsableAccessToken()) return this.#accessToken;
    if (this.#refreshPromise) return this.#refreshPromise;

    this.#refreshPromise = this.#refreshAccessToken();
    try {
      return await this.#refreshPromise;
    } finally {
      this.#refreshPromise = null;
    }
  }

  async onUnauthorized({ status } = {}) {
    if (status !== undefined && status !== 401) return;
    this.#accessToken = null;
    this.#expiresAtMs = 0;
  }
}
