import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { readFile, writeFile } from 'node:fs/promises';
import { GmailRestProvider } from '../src/gmail-rest-provider.js';
import {
  GMAIL_READONLY_SCOPE,
  buildTokenExchangeRequest,
  createAuthorizationRequest,
  createPkcePair,
  parseDesktopCredentialsJson,
  validateAuthorizationResponse
} from '../src/oauth-native-contract.js';

const EXPECTED_CLIENT_ID = '150834461062-b32pvpc84plkl0ftftm2vcfqfoq1ff8t.apps.googleusercontent.com';
const HOST = '127.0.0.1';
const RESULT_FILE = 'financesensor-p1-production-lifecycle-result.json';
const MAX_ANCHOR_ATTEMPTS = 2;
const MAX_ANCHOR_WINDOW_MESSAGES = 5;
const MAX_HISTORY_MESSAGES = 5;
const MAX_FULL_MESSAGES = 1;
const POST_REVOKE_DELAYS_MS = [0, 1000, 3000, 7000];

const anchorMarker = `FSP1A-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
const anchorSubject = `FinanceSensor P1 Anchor ${anchorMarker}`;
const anchorBody = 'FinanceSensor P1 synthetic anchor. No financial data.';
const probeMarker = `FSP1P-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
const probeSubject = `FinanceSensor P1 Synthetic Purchase ${probeMarker}`;
const probeBody = `Synthetic purchase evidence only. Marker: ${probeMarker}. PEN 12.34; Merchant: DEMO STORE; Operation: DEMO-P1.`;

const sessionSecret = crypto.randomBytes(24).toString('base64url');
const oauthState = crypto.randomBytes(24).toString('base64url');
const pkce = createPkcePair();

let desktopClientSecret = null;
let accessToken = null;
let refreshToken = null;
let authorizedMailbox = null;
let baselineHistoryId = null;
let authorizationComplete = false;
let anchorEstablished = false;
let anchorAttempts = 0;
let server;

function metric() {
  return {
    count: 0,
    requestBodyBytes: 0,
    responseBodyBytes: 0,
    totalLatencyMs: 0,
    minLatencyMs: null,
    maxLatencyMs: 0,
    statuses: {},
    networkErrors: 0
  };
}

const evidence = {
  schemaVersion: 1,
  phase: 'P1',
  project: 'FinanceSensor',
  executionDay: new Date().toISOString().slice(0, 10),
  clientIdFingerprint: crypto.createHash('sha256').update(EXPECTED_CLIENT_ID).digest('hex').slice(0, 16),
  scopeRequested: GMAIL_READONLY_SCOPE,
  scopeGranted: 'PENDING',
  scopeAfterRefresh: 'PENDING',
  limits: {
    maxAnchorAttempts: MAX_ANCHOR_ATTEMPTS,
    maxAnchorWindowMessages: MAX_ANCHOR_WINDOW_MESSAGES,
    maxHistoryMessages: MAX_HISTORY_MESSAGES,
    maxFullMessages: MAX_FULL_MESSAGES,
    postRevokeAttempts: POST_REVOKE_DELAYS_MS.length,
    postRevokeDelayScheduleMs: POST_REVOKE_DELAYS_MS,
    historicalMailboxSweep: false,
    gmailSearchQueryUsed: false
  },
  oauth: {
    desktopCredentialFileSelected: false,
    desktopCredentialClientIdMatched: 'PENDING',
    clientSecretWrittenToEvidence: 0,
    accessTokenWrittenToEvidence: 0,
    refreshTokenWrittenToEvidence: 0,
    realConsent: 'PENDING',
    pkceS256: true,
    stateBinding: 'PENDING',
    tokenExchangeHttpStatus: 'PENDING',
    successfulRefreshBeforeRevoke: 'PENDING',
    refreshedBearerGmailUse: 'PENDING'
  },
  gmail: {
    profileBeforeRefresh: 'PENDING',
    profileAfterRefresh: 'PENDING',
    anchorEstablished: 'PENDING',
    incrementalHistory: 'PENDING',
    metadataFetch: 'PENDING',
    fullFetch: 'PENDING',
    syntheticProbeMatched: 'PENDING'
  },
  revocation: {
    revokeHttpStatus: 'PENDING',
    providerAcceptedRevoke: 'PENDING',
    postRevokeAttemptsUsed: 0,
    refreshAuthorityAfterRevoke: 'PENDING',
    denialSemantic: 'PENDING'
  },
  network: {
    measurement: 'HTTP_BODY_BYTES_AND_COMPLETE_RESPONSE_LATENCY_MS',
    requestByteDefinition: 'HTTP request body bytes only; GET bodies are measured zero',
    responseByteDefinition: 'complete HTTP response body bytes from Response.clone().arrayBuffer()',
    latencyDefinition: 'fetch start through complete cloned response-body read',
    sanitizedEndpointClassesOnly: true,
    totalObservedRequests: 0,
    totalRequestBodyBytes: 0,
    totalResponseBodyBytes: 0,
    endpointClasses: {
      tokenExchange: metric(),
      tokenRefresh: metric(),
      revoke: metric(),
      profile: metric(),
      list: metric(),
      metadata: metric(),
      full: metric(),
      history: metric(),
      other: metric()
    }
  },
  privacy: {
    rawGmailContentWrittenToResult: 0,
    financialPlaintextWrittenToResult: 0,
    gmailAddressWrittenToResult: 0,
    messageIdWrittenToResult: 0,
    historyIdWrittenToResult: 0,
    oauthSecretWrittenToResult: 0,
    rawHttpPayloadWrittenToResult: 0,
    requestUrlWrittenToResult: 0,
    syntheticMarkerWrittenToResult: 0
  },
  claims: {
    SUCCESSFUL_REFRESH_BEFORE_REVOKE: 'PENDING',
    MINIMUM_SCOPE_REFRESH: 'PENDING',
    REQUEST_BYTES_ACCOUNTED: 'PENDING',
    RESPONSE_BYTES_ACCOUNTED: 'PENDING',
    PER_ENDPOINT_LATENCY_RECORDED: 'PENDING',
    PROVIDER_REVOKE_ACCEPTED: 'PENDING',
    OLD_REFRESH_AUTHORITY_DENIED: 'PENDING',
    NO_REAL_GMAIL_CONTENT_IN_RESULT: 'PENDING'
  },
  executionComplete: false,
  p1Pass: 'PENDING',
  result: 'IN_PROGRESS'
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:16px system-ui;max-width:820px;margin:48px auto;padding:0 20px;line-height:1.5}button,a.button{display:inline-block;padding:12px 18px;border:1px solid #555;border-radius:10px;background:#111;color:#fff;text-decoration:none;cursor:pointer}pre,code{background:#f3f3f3;border-radius:8px}pre{padding:16px;overflow:auto}.ok{color:#087a2f}.warn{color:#8a5700}</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
}

function sendHtml(res, status, title, body) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer'
  });
  res.end(page(title, body));
}

function requireSession(url) {
  return url.searchParams.get('s') === sessionSecret;
}

function openBrowser(url) {
  const options = { detached: true, stdio: 'ignore' };
  const child = process.platform === 'win32'
    ? spawn('cmd.exe', ['/c', 'start', '', url], options)
    : process.platform === 'darwin'
      ? spawn('open', [url], options)
      : spawn('xdg-open', [url], options);
  child.unref();
}

function rootRedirectUri() {
  const address = server.address();
  return `http://${HOST}:${address.port}`;
}

function bodyByteLength(body) {
  if (body === undefined || body === null) return 0;
  if (typeof body === 'string') return Buffer.byteLength(body, 'utf8');
  if (body instanceof URLSearchParams) return Buffer.byteLength(body.toString(), 'utf8');
  if (Buffer.isBuffer(body)) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  if (body instanceof ArrayBuffer) return body.byteLength;
  return 0;
}

function requestBodyText(body) {
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  return '';
}

function classifyEndpoint(input, init = {}) {
  const rawUrl = input instanceof URL ? input.toString() : typeof input === 'string' ? input : input?.url;
  if (!rawUrl) return 'other';
  const url = new URL(rawUrl);
  if (url.hostname === 'oauth2.googleapis.com') {
    if (url.pathname === '/revoke') return 'revoke';
    if (url.pathname === '/token') {
      const grantType = new URLSearchParams(requestBodyText(init.body)).get('grant_type');
      return grantType === 'refresh_token' ? 'tokenRefresh' : 'tokenExchange';
    }
    return 'other';
  }
  if (url.hostname === 'gmail.googleapis.com') {
    if (url.pathname.endsWith('/profile')) return 'profile';
    if (url.pathname.endsWith('/history')) return 'history';
    if (url.pathname.endsWith('/messages')) return 'list';
    if (url.pathname.includes('/messages/')) {
      return url.searchParams.get('format') === 'FULL' ? 'full' : 'metadata';
    }
  }
  return 'other';
}

function roundMs(value) {
  return Math.round(value * 1000) / 1000;
}

function recordNetwork(category, requestBytes, responseBytes, elapsedMs, status) {
  const metricItem = evidence.network.endpointClasses[category] ?? evidence.network.endpointClasses.other;
  const elapsed = roundMs(elapsedMs);
  metricItem.count += 1;
  metricItem.requestBodyBytes += requestBytes;
  metricItem.responseBodyBytes += responseBytes;
  metricItem.totalLatencyMs = roundMs(metricItem.totalLatencyMs + elapsed);
  metricItem.minLatencyMs = metricItem.minLatencyMs === null ? elapsed : Math.min(metricItem.minLatencyMs, elapsed);
  metricItem.maxLatencyMs = Math.max(metricItem.maxLatencyMs, elapsed);
  metricItem.statuses[String(status)] = (metricItem.statuses[String(status)] ?? 0) + 1;
  evidence.network.totalObservedRequests += 1;
  evidence.network.totalRequestBodyBytes += requestBytes;
  evidence.network.totalResponseBodyBytes += responseBytes;
}

async function instrumentedFetch(input, init = {}) {
  const category = classifyEndpoint(input, init);
  const requestBytes = bodyByteLength(init.body);
  const started = performance.now();
  try {
    const response = await globalThis.fetch(input, init);
    let responseBytes = 0;
    try {
      responseBytes = (await response.clone().arrayBuffer()).byteLength;
    } catch {
      responseBytes = 0;
    }
    recordNetwork(category, requestBytes, responseBytes, performance.now() - started, response.status);
    return response;
  } catch (error) {
    const metricItem = evidence.network.endpointClasses[category] ?? evidence.network.endpointClasses.other;
    metricItem.networkErrors += 1;
    throw error;
  }
}

function parseJsonObject(text) {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function exactGmailReadonlyScope(scopeText) {
  const scopes = String(scopeText ?? '').trim().split(/\s+/).filter(Boolean);
  return scopes.length === 1 && scopes[0] === GMAIL_READONLY_SCOPE;
}

function gmailProvider() {
  return new GmailRestProvider({ accessToken, fetchImpl: instrumentedFetch });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function persist() {
  await writeFile(RESULT_FILE, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });
}

function clearSensitiveMemory() {
  desktopClientSecret = null;
  accessToken = null;
  refreshToken = null;
  authorizedMailbox = null;
  baselineHistoryId = null;
}

async function loadDesktopCredential() {
  const path = process.env.FINANCESENSOR_GOOGLE_CREDENTIALS_PATH;
  if (!path) throw new Error('DESKTOP_CREDENTIAL_FILE_NOT_SELECTED');
  evidence.oauth.desktopCredentialFileSelected = true;
  const credential = parseDesktopCredentialsJson(await readFile(path, 'utf8'), {
    expectedClientId: EXPECTED_CLIENT_ID
  });
  desktopClientSecret = credential.clientSecret;
  evidence.oauth.desktopCredentialClientIdMatched = 'PASS';
}

async function exchangeAuthorizationCode(code) {
  const request = buildTokenExchangeRequest({
    clientId: EXPECTED_CLIENT_ID,
    clientSecret: desktopClientSecret,
    redirectUri: rootRedirectUri(),
    code,
    codeVerifier: pkce.codeVerifier
  });
  const response = await instrumentedFetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });
  evidence.oauth.tokenExchangeHttpStatus = response.status;
  const raw = await response.text();
  if (response.status !== 200) throw new Error(`TOKEN_EXCHANGE_HTTP_${response.status}`);
  const payload = parseJsonObject(raw);
  if (!payload.access_token || !payload.refresh_token) throw new Error('TOKEN_EXCHANGE_MISSING_AUTHORITY');
  if (!exactGmailReadonlyScope(payload.scope)) throw new Error('TOKEN_EXCHANGE_SCOPE_NOT_EXACT_GMAIL_READONLY');
  if (payload.token_type !== 'Bearer') throw new Error('TOKEN_EXCHANGE_TOKEN_TYPE_NOT_BEARER');
  evidence.scopeGranted = GMAIL_READONLY_SCOPE;
  return payload;
}

async function establishAnchor() {
  if (!authorizationComplete) throw new Error('AUTHORIZATION_NOT_COMPLETE');
  if (anchorEstablished) return 'ANCHOR_READY';
  if (anchorAttempts >= MAX_ANCHOR_ATTEMPTS) throw new Error('ANCHOR_ATTEMPT_LIMIT_REACHED');

  anchorAttempts += 1;
  const provider = gmailProvider();
  const found = await provider.listMessages({
    maxResults: MAX_ANCHOR_WINDOW_MESSAGES,
    labelIds: ['INBOX']
  });

  const matches = [];
  for (const item of found.slice(0, MAX_ANCHOR_WINDOW_MESSAGES)) {
    const metadata = await provider.getMessage({
      id: item.id,
      format: 'METADATA',
      metadataHeaders: ['Subject']
    });
    if (metadata.headers?.Subject === anchorSubject && metadata.historyId) matches.push(metadata);
  }

  if (matches.length !== 1) {
    evidence.result = anchorAttempts < MAX_ANCHOR_ATTEMPTS ? 'ANCHOR_NOT_READY' : 'ANCHOR_ATTEMPT_LIMIT_REACHED';
    await persist();
    return evidence.result;
  }

  baselineHistoryId = String(matches[0].historyId);
  anchorEstablished = true;
  evidence.gmail.anchorEstablished = 'PASS';
  evidence.result = 'ANCHOR_READY';
  await persist();
  return evidence.result;
}

async function runSyntheticProductionProbe() {
  if (!anchorEstablished || !baselineHistoryId) throw new Error('ANCHOR_NOT_ESTABLISHED');
  const provider = gmailProvider();
  const incremental = await provider.listHistory({
    startHistoryId: baselineHistoryId,
    maxResults: MAX_HISTORY_MESSAGES,
    historyTypes: ['messageAdded']
  });
  evidence.gmail.incrementalHistory = 'PASS';

  const ids = [...new Set(incremental.history.map(item => String(item.messageId)).filter(Boolean))]
    .slice(0, MAX_HISTORY_MESSAGES);
  if (!ids.length) {
    evidence.result = 'SYNTHETIC_PROBE_NOT_OBSERVED';
    await persist();
    return evidence.result;
  }

  let selectedId = null;
  for (const id of ids) {
    const metadata = await provider.getMessage({
      id,
      format: 'METADATA',
      metadataHeaders: ['Subject']
    });
    evidence.gmail.metadataFetch = 'PASS';
    if (String(metadata.headers?.Subject ?? '') === probeSubject) {
      selectedId = id;
      evidence.gmail.syntheticProbeMatched = 'PASS';
      break;
    }
  }

  if (!selectedId) {
    evidence.result = 'SYNTHETIC_PROBE_NOT_OBSERVED';
    await persist();
    return evidence.result;
  }

  const full = await provider.getMessage({ id: selectedId, format: 'FULL' });
  if (!String(full.body ?? '').includes(probeMarker)) {
    throw new Error('SYNTHETIC_FULL_BODY_MARKER_MISMATCH');
  }
  evidence.gmail.fullFetch = 'PASS';
  evidence.result = 'READY_FOR_REFRESH_REVOKE';
  await persist();
  return evidence.result;
}

async function refreshBeforeRevoke() {
  if (!refreshToken) throw new Error('NO_REFRESH_AUTHORITY');
  if (evidence.gmail.fullFetch !== 'PASS') throw new Error('PRODUCTION_PROBE_NOT_COMPLETE');

  const response = await instrumentedFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: EXPECTED_CLIENT_ID,
      client_secret: desktopClientSecret,
      refresh_token: refreshToken
    }).toString()
  });
  const raw = await response.text();
  if (response.status !== 200) throw new Error(`PRE_REVOKE_REFRESH_HTTP_${response.status}`);
  const payload = parseJsonObject(raw);
  if (!payload.access_token) throw new Error('PRE_REVOKE_REFRESH_MISSING_ACCESS_TOKEN');
  if (!exactGmailReadonlyScope(payload.scope)) throw new Error('PRE_REVOKE_REFRESH_SCOPE_NOT_EXACT_GMAIL_READONLY');
  if (payload.token_type !== 'Bearer') throw new Error('PRE_REVOKE_REFRESH_TOKEN_TYPE_NOT_BEARER');

  evidence.scopeAfterRefresh = GMAIL_READONLY_SCOPE;
  evidence.oauth.successfulRefreshBeforeRevoke = 'PASS';
  accessToken = String(payload.access_token);

  const profile = await gmailProvider().getProfile();
  evidence.gmail.profileAfterRefresh = profile.emailAddress && profile.emailAddress === authorizedMailbox ? 'PASS' : 'FAIL';
  evidence.oauth.refreshedBearerGmailUse = evidence.gmail.profileAfterRefresh;
  if (evidence.gmail.profileAfterRefresh !== 'PASS') throw new Error('REFRESHED_BEARER_GMAIL_PROFILE_FAILED');
  await persist();
}

async function revokeAndVerifySemanticDenial() {
  if (!refreshToken) throw new Error('NO_REFRESH_AUTHORITY');
  if (evidence.oauth.successfulRefreshBeforeRevoke !== 'PASS') throw new Error('PRE_REVOKE_REFRESH_NOT_PROVEN');

  const revoke = await instrumentedFetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken }).toString()
  });
  evidence.revocation.revokeHttpStatus = revoke.status;
  evidence.revocation.providerAcceptedRevoke = revoke.status === 200 ? 'PASS' : `HTTP_${revoke.status}`;
  await revoke.text();
  if (revoke.status !== 200) throw new Error(`PROVIDER_REVOKE_HTTP_${revoke.status}`);

  let semanticDenialObserved = false;
  for (let index = 0; index < POST_REVOKE_DELAYS_MS.length; index += 1) {
    const delay = POST_REVOKE_DELAYS_MS[index];
    if (delay > 0) await sleep(delay);
    evidence.revocation.postRevokeAttemptsUsed = index + 1;

    let response;
    try {
      response = await instrumentedFetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: EXPECTED_CLIENT_ID,
          client_secret: desktopClientSecret,
          refresh_token: refreshToken
        }).toString()
      });
    } catch {
      evidence.revocation.refreshAuthorityAfterRevoke = 'AMBIGUOUS_NETWORK_ERROR';
      evidence.revocation.denialSemantic = 'NOT_PROVEN';
      continue;
    }

    const raw = await response.text();
    const payload = parseJsonObject(raw);
    if (response.status === 400 && payload.error === 'invalid_grant') {
      semanticDenialObserved = true;
      evidence.revocation.refreshAuthorityAfterRevoke = 'DENIED';
      evidence.revocation.denialSemantic = 'HTTP_400_INVALID_GRANT';
      break;
    }

    if (response.ok) {
      evidence.revocation.refreshAuthorityAfterRevoke = 'PROVIDER_GRACE_STILL_USABLE';
      evidence.revocation.denialSemantic = 'NOT_YET_DENIED';
      continue;
    }

    evidence.revocation.refreshAuthorityAfterRevoke = `AMBIGUOUS_HTTP_${response.status}`;
    evidence.revocation.denialSemantic = payload.error ? `NON_ACCEPTED_ERROR_${String(payload.error).slice(0, 40)}` : 'NON_ACCEPTED_ERROR';
  }

  if (!semanticDenialObserved) {
    throw new Error('POST_REVOKE_INVALID_GRANT_NOT_OBSERVED_WITHIN_BOUND');
  }
}

function networkEvidencePassed() {
  const endpoint = evidence.network.endpointClasses;
  const required = ['tokenExchange', 'tokenRefresh', 'revoke', 'profile', 'list', 'metadata', 'full', 'history'];
  if (endpoint.other.count !== 0 || endpoint.other.networkErrors !== 0) return false;
  if (evidence.network.totalObservedRequests <= 0) return false;
  for (const name of required) {
    const item = endpoint[name];
    if (!item || item.count < 1) return false;
    if (!Number.isFinite(item.requestBodyBytes) || item.requestBodyBytes < 0) return false;
    if (!Number.isFinite(item.responseBodyBytes) || item.responseBodyBytes < 0) return false;
    if (!Number.isFinite(item.totalLatencyMs) || item.totalLatencyMs < 0) return false;
    if (!Number.isFinite(item.minLatencyMs) || item.minLatencyMs < 0) return false;
    if (!Number.isFinite(item.maxLatencyMs) || item.maxLatencyMs < 0) return false;
  }
  return endpoint.tokenExchange.count === 1 &&
    endpoint.tokenRefresh.count >= 2 &&
    endpoint.revoke.count === 1 &&
    endpoint.full.count === 1 &&
    endpoint.profile.count >= 2;
}

function privacyEvidencePassed() {
  return Object.values(evidence.privacy).every(value => value === 0);
}

function finalizeClaims() {
  const networkPass = networkEvidencePassed();
  const privacyPass = privacyEvidencePassed();
  evidence.claims.SUCCESSFUL_REFRESH_BEFORE_REVOKE = evidence.oauth.successfulRefreshBeforeRevoke === 'PASS' ? 'PASS' : 'FAIL';
  evidence.claims.MINIMUM_SCOPE_REFRESH = evidence.scopeGranted === GMAIL_READONLY_SCOPE && evidence.scopeAfterRefresh === GMAIL_READONLY_SCOPE ? 'PASS' : 'FAIL';
  evidence.claims.REQUEST_BYTES_ACCOUNTED = networkPass ? 'PASS' : 'FAIL';
  evidence.claims.RESPONSE_BYTES_ACCOUNTED = networkPass ? 'PASS' : 'FAIL';
  evidence.claims.PER_ENDPOINT_LATENCY_RECORDED = networkPass ? 'PASS' : 'FAIL';
  evidence.claims.PROVIDER_REVOKE_ACCEPTED = evidence.revocation.providerAcceptedRevoke === 'PASS' && evidence.revocation.revokeHttpStatus === 200 ? 'PASS' : 'FAIL';
  evidence.claims.OLD_REFRESH_AUTHORITY_DENIED = evidence.revocation.refreshAuthorityAfterRevoke === 'DENIED' && evidence.revocation.denialSemantic === 'HTTP_400_INVALID_GRANT' ? 'PASS' : 'FAIL';
  evidence.claims.NO_REAL_GMAIL_CONTENT_IN_RESULT = privacyPass ? 'PASS' : 'FAIL';
  evidence.p1Pass = Object.values(evidence.claims).every(value => value === 'PASS') ? 'PASS' : 'FAIL';
  evidence.result = evidence.p1Pass === 'PASS' ? 'P1_PRODUCTION_LIFECYCLE_PASS' : 'P1_EXECUTION_COMPLETE_WITH_GAPS';
  evidence.executionComplete = true;
}

async function bestEffortRevokeWithoutPass(result = 'STOPPED_BEFORE_PASS') {
  evidence.p1Pass = 'FAIL';
  evidence.result = result;
  if (refreshToken) {
    try {
      const revoke = await instrumentedFetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: refreshToken }).toString()
      });
      evidence.revocation.revokeHttpStatus = revoke.status;
      evidence.revocation.providerAcceptedRevoke = revoke.status === 200 ? 'BEST_EFFORT_HTTP_200' : `BEST_EFFORT_HTTP_${revoke.status}`;
      await revoke.text();
    } catch {
      evidence.revocation.providerAcceptedRevoke = 'BEST_EFFORT_NETWORK_ERROR';
    }
  } else {
    evidence.revocation.providerAcceptedRevoke = 'NO_REFRESH_AUTHORITY_OBTAINED';
  }
  evidence.executionComplete = true;
  clearSensitiveMemory();
  await persist();
}

async function runRefreshRevokeSequence() {
  await refreshBeforeRevoke();
  await revokeAndVerifySemanticDenial();
  finalizeClaims();
  clearSensitiveMemory();
  await persist();
}

async function start() {
  try {
    await loadDesktopCredential();
  } catch (error) {
    evidence.failureCode = String(error?.message ?? 'DESKTOP_CREDENTIAL_LOAD_FAILED').slice(0, 120);
    await bestEffortRevokeWithoutPass('FAIL');
    return;
  }

  server = http.createServer(async (req, res) => {
    const base = rootRedirectUri();
    const url = new URL(req.url, base);
    try {
      if (url.pathname === '/' && (url.searchParams.has('code') || url.searchParams.has('error'))) {
        const validated = validateAuthorizationResponse(`${base}${req.url}`, { expectedState: oauthState });
        evidence.oauth.stateBinding = 'PASS';
        const tokens = await exchangeAuthorizationCode(validated.code);
        accessToken = String(tokens.access_token);
        refreshToken = String(tokens.refresh_token);
        evidence.oauth.realConsent = 'PASS';

        const profile = await gmailProvider().getProfile();
        authorizedMailbox = profile.emailAddress;
        evidence.gmail.profileBeforeRefresh = authorizedMailbox ? 'PASS' : 'FAIL';
        if (!authorizedMailbox) throw new Error('GMAIL_PROFILE_IDENTITY_MISSING');
        authorizationComplete = true;
        await persist();

        return sendHtml(res, 200, 'P1 authorization received', `<p class="ok">OAuth is live with the exact requested scope.</p><p>Send this harmless synthetic anchor to <strong>${escapeHtml(authorizedMailbox)}</strong>:</p><pre>Subject: ${escapeHtml(anchorSubject)}\n\n${escapeHtml(anchorBody)}</pre><p>When it is visible in Inbox, continue.</p><form method="post" action="/anchor?s=${encodeURIComponent(sessionSecret)}"><button>Anchor visible — continue</button></form>`);
      }

      if (url.pathname === '/') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor P1', '<p>Invalid local session.</p>');
        return sendHtml(res, 200, 'FinanceSensor — P1 production lifecycle', `<p>This controlled run proves the P1 lifecycle with exact <code>gmail.readonly</code>, sanitized endpoint byte/latency evidence, provider revoke HTTP 200, and a bounded post-revoke refresh check that accepts only HTTP 400 <code>invalid_grant</code> as semantic denial.</p><p><a class="button" href="/authorize?s=${encodeURIComponent(sessionSecret)}">Authorize FinanceSensor DEV</a></p>`);
      }

      if (url.pathname === '/authorize') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor P1', '<p>Invalid local session.</p>');
        const auth = createAuthorizationRequest({
          clientId: EXPECTED_CLIENT_ID,
          redirectUri: rootRedirectUri(),
          state: oauthState,
          codeVerifier: pkce.codeVerifier,
          scopes: [GMAIL_READONLY_SCOPE]
        });
        const authUrl = new URL(auth.authorizationUrl);
        authUrl.searchParams.set('prompt', 'consent');
        res.writeHead(302, { location: authUrl.toString(), 'cache-control': 'no-store' });
        return res.end();
      }

      if (url.pathname === '/anchor' && req.method === 'POST') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor P1', '<p>Invalid local session.</p>');
        const status = await establishAnchor();
        if (status !== 'ANCHOR_READY') {
          if (anchorAttempts < MAX_ANCHOR_ATTEMPTS) {
            return sendHtml(res, 200, 'Anchor not observed yet', `<p class="warn">Only the bounded recent Inbox window was inspected. Confirm the anchor is visible and retry once.</p><form method="post" action="/anchor?s=${encodeURIComponent(sessionSecret)}"><button>Retry anchor once</button></form>`);
          }
          return sendHtml(res, 200, 'Anchor bound exhausted', `<p>No PASS is possible in this run.</p><form method="post" action="/stop?s=${encodeURIComponent(sessionSecret)}"><button>Revoke and stop safely</button></form>`);
        }

        return sendHtml(res, 200, 'P1 anchor established', `<p class="ok">The sync anchor is bound to the synthetic message historyId.</p><p>Now send this synthetic probe to <strong>${escapeHtml(authorizedMailbox)}</strong>:</p><pre>Subject: ${escapeHtml(probeSubject)}\n\n${escapeHtml(probeBody)}</pre><p>When visible, continue.</p><form method="post" action="/probe?s=${encodeURIComponent(sessionSecret)}"><button>Synthetic probe visible — inspect bounded history</button></form>`);
      }

      if (url.pathname === '/probe' && req.method === 'POST') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor P1', '<p>Invalid local session.</p>');
        const status = await runSyntheticProductionProbe();
        if (status !== 'READY_FOR_REFRESH_REVOKE') {
          return sendHtml(res, 200, 'Synthetic probe not observed', `<p class="warn">The bounded history window did not produce the exact synthetic probe. No lifecycle PASS is claimed.</p><form method="post" action="/stop?s=${encodeURIComponent(sessionSecret)}"><button>Revoke and stop safely</button></form>`);
        }
        return sendHtml(res, 200, 'Production path exercised', `<p class="ok">Profile, list, metadata, history and one synthetic FULL retrieval are complete.</p><p>The next action performs a successful real refresh, validates Gmail with the refreshed bearer, revokes provider authority, and then performs bounded post-revoke checks.</p><form method="post" action="/refresh-revoke?s=${encodeURIComponent(sessionSecret)}"><button>Run refresh → revoke → semantic denial proof</button></form>`);
      }

      if (url.pathname === '/refresh-revoke' && req.method === 'POST') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor P1', '<p>Invalid local session.</p>');
        await runRefreshRevokeSequence();
        return sendHtml(res, 200, evidence.p1Pass === 'PASS' ? 'P1 physical lifecycle PASS candidate' : 'P1 completed with gaps', `<p><strong>${escapeHtml(evidence.result)}</strong></p><p>Revoke HTTP: ${escapeHtml(evidence.revocation.revokeHttpStatus)}. Post-revoke semantic: ${escapeHtml(evidence.revocation.denialSemantic)}. Scope: ${escapeHtml(evidence.scopeAfterRefresh)}.</p><p>Only sanitized aggregate evidence was written to <code>${RESULT_FILE}</code>. A separate receipt validator must still bind the controlled-edge result before P1 can be promoted.</p>`);
      }

      if (url.pathname === '/stop' && req.method === 'POST') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor P1', '<p>Invalid local session.</p>');
        await bestEffortRevokeWithoutPass('STOPPED_BEFORE_P1_PASS');
        return sendHtml(res, 200, 'P1 stopped safely', `<p>No PASS was claimed. Best-effort provider revoke ran before local authority was cleared.</p>`);
      }

      return sendHtml(res, 404, 'FinanceSensor P1', '<p>Not found.</p>');
    } catch (error) {
      evidence.failureCode = String(error?.message ?? 'UNCLASSIFIED').slice(0, 120);
      await bestEffortRevokeWithoutPass('FAIL').catch(async () => {
        clearSensitiveMemory();
        await persist().catch(() => {});
      });
      return sendHtml(res, 500, 'FinanceSensor P1 — stopped safely', `<p>The run stopped with <code>${escapeHtml(evidence.failureCode)}</code>.</p><p>No PASS was claimed. Best-effort provider revoke was attempted if authority existed.</p>`);
    }
  });

  server.listen(0, HOST, () => {
    openBrowser(`http://${HOST}:${server.address().port}/?s=${encodeURIComponent(sessionSecret)}`);
  });
}

process.on('SIGINT', async () => {
  await bestEffortRevokeWithoutPass('INTERRUPTED').catch(async () => {
    clearSensitiveMemory();
    await persist().catch(() => {});
  });
  process.exit(130);
});

process.on('SIGTERM', async () => {
  await bestEffortRevokeWithoutPass('TERMINATED').catch(async () => {
    clearSensitiveMemory();
    await persist().catch(() => {});
  });
  process.exit(143);
});

await start();
