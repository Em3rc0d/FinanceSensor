import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { GmailRestProvider } from '../src/gmail-rest-provider.js';
import {
  GMAIL_READONLY_SCOPE,
  LocalOAuthCredentialProvider,
  buildTokenExchangeRequest,
  createAuthorizationRequest,
  createPkcePair,
  parseDesktopCredentialsJson,
  validateAuthorizationResponse
} from '../src/oauth-native-contract.js';
import { extractFinancialEvidence, isLikelyFinancialMetadata } from '../src/ingress.js';

const EXPECTED_CLIENT_ID = '150834461062-b32pvpc84plkl0ftftm2vcfqfoq1ff8t.apps.googleusercontent.com';
const HOST = '127.0.0.1';
const MAX_MESSAGES = 5;
const MAX_FULL_MESSAGES = 1;
const MAX_PROBE_ATTEMPTS = 2;
const RESULT_FILE = 'financesensor-level-c-result.json';

const sessionSecret = crypto.randomBytes(24).toString('base64url');
const state = crypto.randomBytes(24).toString('base64url');
const pkce = createPkcePair();

let desktopClientSecret = null;
let baselineHistoryId = null;
let refreshToken = null;
let refreshAuthority = null;
let authorizationComplete = false;
let controlledProbeComplete = false;
let revocationComplete = false;
let probeAttempts = 0;
let server;

const evidence = {
  schemaVersion: 3,
  executionStartedAt: new Date().toISOString(),
  clientIdFingerprint: crypto.createHash('sha256').update(EXPECTED_CLIENT_ID).digest('hex').slice(0, 16),
  scopeRequested: GMAIL_READONLY_SCOPE,
  limits: {
    maxChangedMessagesPerAttempt: MAX_MESSAGES,
    maxFullMessages: MAX_FULL_MESSAGES,
    maxProbeAttempts: MAX_PROBE_ATTEMPTS,
    initialHistoricalSweep: false,
    messagesListUsed: false
  },
  oauth: {
    desktopCredentialFileSelected: false,
    desktopCredentialClientIdMatched: 'PENDING',
    clientSecretRequiredByObservedProvider: true,
    clientSecretInMemoryDuringSession: 0,
    clientSecretPersistedByRunner: 0,
    clientSecretWrittenToEvidence: 0,
    clientSecretCloudCopies: 0,
    realConsent: 'PENDING',
    pkceS256: true,
    stateBinding: 'PENDING',
    loopbackRootRedirect: true,
    tokenExchangeHttpStatus: 'PENDING',
    tokenExchangeErrorCode: null,
    refreshAuthorityPersistedToDisk: 0,
    cloudRefreshAuthority: 0
  },
  gmail: {
    profileHistoryCursor: 'PENDING',
    list: 'SKIPPED_BY_DESIGN',
    metadata: 'PENDING',
    selectedFull: 'PENDING',
    incrementalHistory: 'PENDING',
    replayObserved: 'PENDING'
  },
  privacy: {
    rawGmailContentWrittenToResult: 0,
    financialPlaintextWrittenToResult: 0,
    authSecretWrittenToResult: 0,
    credentialPathWrittenToResult: 0,
    preAuthorizationMailboxSweep: 0
  },
  requests: {
    profile: 0,
    list: 0,
    metadata: 0,
    full: 0,
    history: 0,
    tokenExchange: 0,
    tokenRefresh: 0,
    revoke: 0
  },
  revocation: {
    providerAcceptedRevoke: 'PENDING',
    refreshAuthorityAfterRevoke: 'PENDING'
  },
  probeAttempts: 0,
  result: 'IN_PROGRESS'
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:16px system-ui;max-width:760px;margin:48px auto;padding:0 20px;line-height:1.5}button,a.button{display:inline-block;padding:12px 18px;border:1px solid #555;border-radius:10px;background:#111;color:#fff;text-decoration:none;cursor:pointer}code{background:#f2f2f2;padding:2px 5px;border-radius:5px}pre{background:#f6f6f6;padding:16px;border-radius:12px;overflow:auto}.ok{color:#087a2f}.warn{color:#8a5700}</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
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
  try {
    let child;
    if (process.platform === 'win32') child = spawn('cmd.exe', ['/c', 'start', '', url], options);
    else if (process.platform === 'darwin') child = spawn('open', [url], options);
    else child = spawn('xdg-open', [url], options);
    child.unref();
    return true;
  } catch {
    return false;
  }
}

async function persistSanitizedEvidence() {
  await writeFile(RESULT_FILE, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

function safeOAuthErrorCode(raw) {
  try {
    const parsed = JSON.parse(raw);
    const candidate = String(parsed?.error ?? '').toLowerCase();
    const allowed = new Set([
      'invalid_grant',
      'invalid_client',
      'invalid_request',
      'redirect_uri_mismatch',
      'unauthorized_client',
      'unsupported_grant_type',
      'access_denied'
    ]);
    return allowed.has(candidate) ? candidate.toUpperCase() : 'UNCLASSIFIED';
  } catch {
    return 'UNCLASSIFIED';
  }
}

async function loadDesktopCredential() {
  const credentialPath = process.env.FINANCESENSOR_GOOGLE_CREDENTIALS_PATH;
  if (!credentialPath) throw new Error('DESKTOP_CREDENTIAL_FILE_NOT_SELECTED');
  evidence.oauth.desktopCredentialFileSelected = true;

  const raw = await readFile(credentialPath, 'utf8');
  const credential = parseDesktopCredentialsJson(raw, { expectedClientId: EXPECTED_CLIENT_ID });
  desktopClientSecret = credential.clientSecret;
  evidence.oauth.desktopCredentialClientIdMatched = 'PASS';
  evidence.oauth.clientSecretInMemoryDuringSession = 1;
}

async function exchangeAuthorizationCode(code, redirectUri) {
  if (!desktopClientSecret) throw new Error('DESKTOP_CLIENT_CREDENTIAL_NOT_LOADED');
  const request = buildTokenExchangeRequest({
    clientId: EXPECTED_CLIENT_ID,
    clientSecret: desktopClientSecret,
    redirectUri,
    code,
    codeVerifier: pkce.codeVerifier
  });
  evidence.requests.tokenExchange += 1;
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });
  evidence.oauth.tokenExchangeHttpStatus = response.status;

  const raw = await response.text();
  if (!response.ok) {
    const safeCode = safeOAuthErrorCode(raw);
    evidence.oauth.tokenExchangeErrorCode = safeCode;
    throw new Error(`TOKEN_EXCHANGE_${safeCode}`);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error('TOKEN_EXCHANGE_INVALID_JSON');
  }
  if (!payload?.access_token) throw new Error('TOKEN_EXCHANGE_MISSING_ACCESS_TOKEN');
  if (!payload?.refresh_token) throw new Error('TOKEN_EXCHANGE_MISSING_REFRESH_TOKEN');
  evidence.oauth.tokenExchangeErrorCode = null;
  return payload;
}

function shortTokenProvider(initialAccessToken) {
  return new GmailRestProvider({ accessToken: initialAccessToken });
}

function refreshTokenProvider() {
  if (!desktopClientSecret) throw new Error('DESKTOP_CLIENT_CREDENTIAL_NOT_LOADED');
  const provider = new LocalOAuthCredentialProvider({
    clientId: EXPECTED_CLIENT_ID,
    clientSecret: desktopClientSecret,
    refreshToken,
    fetchImpl: async (...args) => {
      evidence.requests.tokenRefresh += 1;
      return fetch(...args);
    }
  });
  refreshAuthority = provider;
  return new GmailRestProvider({ credentialProvider: provider });
}

async function getProfileHistoryId(provider) {
  evidence.requests.profile += 1;
  const id = await provider.getCurrentHistoryId();
  evidence.gmail.profileHistoryCursor = 'PASS';
  return id;
}

function uniqueMessageIds(history = []) {
  return [...new Set(history.map(item => String(item.messageId)).filter(Boolean))].slice(0, MAX_MESSAGES);
}

async function runControlledProbe() {
  if (!authorizationComplete) throw new Error('AUTHORIZATION_NOT_COMPLETE');
  if (controlledProbeComplete) return { status: 'ALREADY_COMPLETE' };
  if (probeAttempts >= MAX_PROBE_ATTEMPTS) throw new Error('PROBE_ATTEMPT_LIMIT_REACHED');

  probeAttempts += 1;
  evidence.probeAttempts = probeAttempts;
  const provider = refreshTokenProvider();

  evidence.requests.history += 1;
  const incremental = await provider.listHistory({ startHistoryId: baselineHistoryId, maxResults: MAX_MESSAGES });
  evidence.gmail.incrementalHistory = 'PASS';
  const ids = uniqueMessageIds(incremental.history);

  let selectedId = null;
  for (const id of ids) {
    evidence.requests.metadata += 1;
    const metadata = await provider.getMessage({
      id,
      format: 'METADATA',
      metadataHeaders: ['From', 'Date', 'Subject']
    });
    evidence.gmail.metadata = 'PASS';
    if (isLikelyFinancialMetadata(metadata.headers)) {
      selectedId = id;
      break;
    }
  }

  if (!selectedId) {
    evidence.gmail.selectedFull = 'NO_SYNTHETIC_CANDIDATE_FOUND';
    evidence.result = probeAttempts < MAX_PROBE_ATTEMPTS ? 'WAIT_AND_RETRY_ONCE' : 'PROBE_PARTIAL';
    await persistSanitizedEvidence();
    return { status: evidence.result };
  }

  evidence.requests.full += 1;
  const full = await provider.getMessage({ id: selectedId, format: 'FULL' });
  const extracted = extractFinancialEvidence(full);
  evidence.gmail.selectedFull = extracted ? 'PASS' : 'FULL_RECEIVED_BUT_EXTRACTION_INCONCLUSIVE';

  evidence.requests.history += 1;
  const replay = await provider.listHistory({ startHistoryId: baselineHistoryId, maxResults: MAX_MESSAGES });
  const replayIds = uniqueMessageIds(replay.history);
  evidence.gmail.replayObserved = JSON.stringify(ids) === JSON.stringify(replayIds) ? 'PASS' : 'REVIEW';

  controlledProbeComplete = true;
  evidence.result = evidence.gmail.selectedFull === 'PASS' ? 'READY_FOR_REVOCATION' : 'PROBE_PARTIAL';
  await persistSanitizedEvidence();
  return { status: evidence.result };
}

async function revokeAndVerify() {
  if (!refreshToken) throw new Error('NO_REFRESH_AUTHORITY');
  const body = new URLSearchParams({ token: refreshToken }).toString();
  evidence.requests.revoke += 1;
  const response = await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) throw new Error(`OAUTH_REVOKE_HTTP_${response.status}`);
  evidence.revocation.providerAcceptedRevoke = 'PASS';

  if (refreshAuthority) {
    await refreshAuthority.onUnauthorized({ status: 401 });
    try {
      await refreshAuthority.getAccessToken();
      evidence.revocation.refreshAuthorityAfterRevoke = 'UNEXPECTEDLY_USABLE_OR_PROVIDER_GRACE';
    } catch {
      evidence.revocation.refreshAuthorityAfterRevoke = 'DENIED';
    }
  } else {
    evidence.revocation.refreshAuthorityAfterRevoke = 'NOT_EXERCISED';
  }

  refreshToken = null;
  refreshAuthority = null;
  desktopClientSecret = null;
  evidence.oauth.clientSecretInMemoryDuringSession = 0;
  revocationComplete = true;
  evidence.result = evidence.revocation.refreshAuthorityAfterRevoke === 'DENIED'
    ? 'LEVEL_C_EXECUTION_COMPLETE'
    : 'LEVEL_C_REVIEW_REQUIRED';
  evidence.executionFinishedAt = new Date().toISOString();
  await persistSanitizedEvidence();
}

function rootRedirectUri() {
  const address = server.address();
  return `http://${HOST}:${address.port}`;
}

function cleanSensitiveMemory() {
  refreshToken = null;
  refreshAuthority = null;
  desktopClientSecret = null;
  evidence.oauth.clientSecretInMemoryDuringSession = 0;
}

async function start() {
  try {
    await loadDesktopCredential();
  } catch (error) {
    cleanSensitiveMemory();
    evidence.result = 'FAIL';
    evidence.failureCode = String(error?.message ?? 'DESKTOP_CREDENTIAL_LOAD_FAILED').slice(0, 120);
    await persistSanitizedEvidence().catch(() => {});
    console.error(`FinanceSensor Level C stopped safely: ${evidence.failureCode}`);
    process.exitCode = 1;
    return;
  }

  server = http.createServer(async (req, res) => {
    const address = server.address();
    const base = `http://${HOST}:${address.port}`;
    const url = new URL(req.url, base);
    try {
      const isOAuthCallback = url.pathname === '/' && (url.searchParams.has('code') || url.searchParams.has('error'));

      if (isOAuthCallback) {
        const callbackUrl = `${base}${req.url}`;
        const validated = validateAuthorizationResponse(callbackUrl, { expectedState: state });
        evidence.oauth.stateBinding = 'PASS';
        const tokens = await exchangeAuthorizationCode(validated.code, rootRedirectUri());
        refreshToken = String(tokens.refresh_token);
        evidence.oauth.realConsent = 'PASS';

        const provider = shortTokenProvider(String(tokens.access_token));
        baselineHistoryId = await getProfileHistoryId(provider);
        authorizationComplete = true;
        await persistSanitizedEvidence();

        return sendHtml(res, 200, 'Authorization received', `<p class="ok">FinanceSensor DEV is authorized and the Gmail history cursor was received.</p><p>Now send <strong>one harmless synthetic email</strong> to this test Gmail account:</p><pre>Subject: FinanceSensor Test Purchase\n\nPurchase approved. PEN 12.34; Merchant: DEMO STORE; Operation code: DEMO-1234</pre><p>The probe will inspect only Gmail history created <strong>after this authorization</strong>. It will not list older mailbox content.</p><form method="post" action="/probe?s=${encodeURIComponent(sessionSecret)}"><button type="submit">I sent the test email — run bounded probe</button></form>`);
      }

      if (url.pathname === '/') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor Level C', '<p>Invalid local session.</p>');
        return sendHtml(res, 200, 'FinanceSensor — Gmail Level C v3', `<p>This is a <strong>local-only</strong> controlled OAuth probe. The selected Google Desktop credential is read locally and never copied to the result, repository, CI or cloud. The probe requests exactly <code>gmail.readonly</code>, performs no historical mailbox listing, inspects at most ${MAX_MESSAGES} changed messages per attempt and fetches at most ${MAX_FULL_MESSAGES} FULL message.</p><p><a class="button" href="/authorize?s=${encodeURIComponent(sessionSecret)}">Authorize FinanceSensor DEV</a></p>`);
      }

      if (url.pathname === '/authorize') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor Level C', '<p>Invalid local session.</p>');
        const request = createAuthorizationRequest({
          clientId: EXPECTED_CLIENT_ID,
          redirectUri: rootRedirectUri(),
          state,
          codeVerifier: pkce.codeVerifier
        });
        const auth = new URL(request.authorizationUrl);
        auth.searchParams.set('prompt', 'consent');
        res.writeHead(302, { location: auth.toString(), 'cache-control': 'no-store' });
        return res.end();
      }

      if (url.pathname === '/probe' && req.method === 'POST') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor Level C', '<p>Invalid local session.</p>');
        const result = await runControlledProbe();
        if (result.status === 'WAIT_AND_RETRY_ONCE') {
          return sendHtml(res, 200, 'No synthetic candidate yet', `<p class="warn">No qualifying post-authorization message was observed yet. Wait a few seconds, confirm the synthetic email arrived, then retry once.</p><form method="post" action="/probe?s=${encodeURIComponent(sessionSecret)}"><button type="submit">Retry bounded probe once</button></form>`);
        }
        const fullStatus = evidence.gmail.selectedFull;
        return sendHtml(res, 200, 'Controlled Gmail probe complete', `<p class="${fullStatus === 'PASS' ? 'ok' : 'warn'}">Selected FULL: ${escapeHtml(fullStatus)}</p><p>Requests: profile ${evidence.requests.profile}, list ${evidence.requests.list}, metadata ${evidence.requests.metadata}, full ${evidence.requests.full}, history ${evidence.requests.history}.</p><p>The result file contains only aggregate evidence.</p><form method="post" action="/revoke?s=${encodeURIComponent(sessionSecret)}"><button type="submit">Revoke FinanceSensor DEV and verify</button></form>`);
      }

      if (url.pathname === '/revoke' && req.method === 'POST') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor Level C', '<p>Invalid local session.</p>');
        await revokeAndVerify();
        const status = evidence.result;
        sendHtml(res, 200, 'Level C finished', `<p class="${status === 'LEVEL_C_EXECUTION_COMPLETE' ? 'ok' : 'warn'}">${escapeHtml(status)}</p><p>Sanitized evidence was written to <code>${RESULT_FILE}</code>. It contains no Gmail body, message ID, token, authorization code, PKCE verifier, client secret, credential path or financial literal.</p><p>You may close this window.</p>`);
        setTimeout(() => server.close(), 1000).unref();
        return;
      }

      sendHtml(res, 404, 'FinanceSensor Level C', '<p>Not found.</p>');
    } catch (error) {
      evidence.result = 'FAIL';
      evidence.failureCode = String(error?.message ?? 'UNKNOWN').slice(0, 120).replace(/[?&].*/g, '');
      cleanSensitiveMemory();
      await persistSanitizedEvidence().catch(() => {});
      sendHtml(res, 500, 'FinanceSensor Level C — stopped safely', `<p class="warn">The probe stopped: <code>${escapeHtml(evidence.failureCode)}</code>.</p><p>No secret is shown here. Close the window and share only <code>${RESULT_FILE}</code> if you want me to diagnose it.</p>`);
    }
  });

  server.listen(0, HOST, () => {
    const address = server.address();
    const localUrl = `http://${HOST}:${address.port}/?s=${encodeURIComponent(sessionSecret)}`;
    const opened = openBrowser(localUrl);
    console.log(opened ? 'FinanceSensor Level C v3 opened in your browser.' : `Open this local URL in your browser: ${localUrl}`);
    console.log(`Bounded Gmail policy: history-only, max ${MAX_MESSAGES} changed messages per attempt, max ${MAX_FULL_MESSAGES} FULL message.`);
    console.log('The selected Google credential, tokens and Gmail content are never printed or written to the result file.');
  });
}

process.on('SIGINT', async () => {
  cleanSensitiveMemory();
  if (!revocationComplete) {
    evidence.result = 'STOPPED_BEFORE_REVOCATION';
    await persistSanitizedEvidence().catch(() => {});
  }
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
});

await start();
