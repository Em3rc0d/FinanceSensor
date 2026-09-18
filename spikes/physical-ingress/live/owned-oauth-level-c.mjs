import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { GmailRestProvider } from '../src/gmail-rest-provider.js';
import {
  GMAIL_READONLY_SCOPE,
  LocalOAuthCredentialProvider,
  buildTokenExchangeRequest,
  createAuthorizationRequest,
  createPkcePair,
  validateAuthorizationResponse
} from '../src/oauth-native-contract.js';
import { extractFinancialEvidence, isLikelyFinancialMetadata } from '../src/ingress.js';

const CLIENT_ID = '150834461062-b32pvpc84plkl0ftftm2vcfqfoq1ff8t.apps.googleusercontent.com';
const HOST = '127.0.0.1';
const MAX_MESSAGES = 5;
const RESULT_FILE = 'financesensor-level-c-result.json';

const sessionSecret = crypto.randomBytes(24).toString('base64url');
const state = crypto.randomBytes(24).toString('base64url');
const pkce = createPkcePair();

let baselineHistoryId = null;
let refreshToken = null;
let refreshAuthority = null;
let currentProvider = null;
let authorizationComplete = false;
let controlledProbeComplete = false;
let revocationComplete = false;
let server;

const evidence = {
  executionStartedAt: new Date().toISOString(),
  clientIdFingerprint: crypto.createHash('sha256').update(CLIENT_ID).digest('hex').slice(0, 16),
  scopeRequested: GMAIL_READONLY_SCOPE,
  limits: {
    maxMessages: MAX_MESSAGES,
    maxFullMessages: 1,
    initialHistoricalSweep: false
  },
  oauth: {
    realConsent: 'PENDING',
    pkceS256: true,
    stateBinding: 'PENDING',
    clientSecretOnEdge: 0,
    refreshAuthorityPersistedToDisk: 0,
    cloudRefreshAuthority: 0
  },
  gmail: {
    profileHistoryCursor: 'PENDING',
    list: 'PENDING',
    metadata: 'PENDING',
    selectedFull: 'PENDING',
    incrementalHistory: 'PENDING',
    replayObserved: 'PENDING'
  },
  privacy: {
    rawGmailContentWrittenToResult: 0,
    financialPlaintextWrittenToResult: 0,
    authSecretWrittenToResult: 0
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
  result: 'IN_PROGRESS'
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:16px system-ui;max-width:760px;margin:48px auto;padding:0 20px;line-height:1.5}button,a.button{display:inline-block;padding:12px 18px;border:1px solid #555;border-radius:10px;background:#111;color:#fff;text-decoration:none;cursor:pointer}code{background:#f2f2f2;padding:2px 5px;border-radius:5px}pre{background:#f6f6f6;padding:16px;border-radius:12px;overflow:auto}.ok{color:#087a2f}.warn{color:#8a5700}</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
}

function sendHtml(res, status, title, body) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
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

async function exchangeAuthorizationCode(code, redirectUri) {
  const request = buildTokenExchangeRequest({
    clientId: CLIENT_ID,
    redirectUri,
    code,
    codeVerifier: pkce.codeVerifier
  });
  evidence.requests.tokenExchange += 1;
  const response = await fetch(request.url, { method: request.method, headers: request.headers, body: request.body });
  if (!response.ok) throw new Error(`TOKEN_EXCHANGE_HTTP_${response.status}`);
  const payload = await response.json();
  if (!payload?.access_token) throw new Error('TOKEN_EXCHANGE_MISSING_ACCESS_TOKEN');
  if (!payload?.refresh_token) throw new Error('TOKEN_EXCHANGE_MISSING_REFRESH_TOKEN');
  return payload;
}

function shortTokenProvider(initialAccessToken) {
  return new GmailRestProvider({ accessToken: initialAccessToken });
}

function refreshTokenProvider() {
  const provider = new LocalOAuthCredentialProvider({
    clientId: CLIENT_ID,
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

async function runControlledProbe() {
  if (!authorizationComplete) throw new Error('AUTHORIZATION_NOT_COMPLETE');
  if (controlledProbeComplete) return;

  currentProvider = refreshTokenProvider();
  const after = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  evidence.requests.list += 1;
  const listed = await currentProvider.listMessages({ after, maxResults: MAX_MESSAGES });
  evidence.gmail.list = 'PASS';

  let selectedId = null;
  for (const item of listed.slice(0, MAX_MESSAGES)) {
    evidence.requests.metadata += 1;
    const metadata = await currentProvider.getMessage({ id: item.id, format: 'METADATA', metadataHeaders: ['From', 'Date', 'Subject'] });
    evidence.gmail.metadata = 'PASS';
    if (isLikelyFinancialMetadata(metadata.headers)) {
      selectedId = item.id;
      break;
    }
  }

  if (!selectedId) {
    evidence.gmail.selectedFull = 'NO_SYNTHETIC_CANDIDATE_FOUND';
  } else {
    evidence.requests.full += 1;
    const full = await currentProvider.getMessage({ id: selectedId, format: 'FULL' });
    const extracted = extractFinancialEvidence(full);
    evidence.gmail.selectedFull = extracted ? 'PASS' : 'FULL_RECEIVED_BUT_EXTRACTION_INCONCLUSIVE';
  }

  evidence.requests.history += 1;
  const incremental = await currentProvider.listHistory({ startHistoryId: baselineHistoryId, maxResults: MAX_MESSAGES });
  evidence.gmail.incrementalHistory = 'PASS';

  evidence.requests.history += 1;
  const replay = await currentProvider.listHistory({ startHistoryId: baselineHistoryId, maxResults: MAX_MESSAGES });
  evidence.gmail.replayObserved = incremental.history.length === replay.history.length ? 'PASS' : 'REVIEW';

  controlledProbeComplete = true;
  evidence.result = evidence.gmail.selectedFull === 'PASS' ? 'READY_FOR_REVOCATION' : 'PROBE_PARTIAL';
  await persistSanitizedEvidence();
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
  revocationComplete = true;
  evidence.result = evidence.revocation.refreshAuthorityAfterRevoke === 'DENIED' ? 'LEVEL_C_EXECUTION_COMPLETE' : 'LEVEL_C_REVIEW_REQUIRED';
  evidence.executionFinishedAt = new Date().toISOString();
  await persistSanitizedEvidence();
}

server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}`);
  try {
    if (url.pathname === '/') {
      if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor Level C', '<p>Invalid local session.</p>');
      return sendHtml(res, 200, 'FinanceSensor — Gmail Level C', `<p>This is a <strong>local-only</strong> controlled OAuth probe. It requests exactly <code>gmail.readonly</code>, stores no token on disk, scans at most ${MAX_MESSAGES} recent messages and fetches at most one FULL message.</p><p><a class="button" href="/authorize?s=${encodeURIComponent(sessionSecret)}">Authorize FinanceSensor DEV</a></p>`);
    }

    if (url.pathname === '/authorize') {
      if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor Level C', '<p>Invalid local session.</p>');
      const address = server.address();
      const redirectUri = `http://${HOST}:${address.port}/oauth2/callback`;
      const request = createAuthorizationRequest({ clientId: CLIENT_ID, redirectUri, state, codeVerifier: pkce.codeVerifier });
      const auth = new URL(request.authorizationUrl);
      auth.searchParams.set('prompt', 'consent');
      res.writeHead(302, { location: auth.toString(), 'cache-control': 'no-store' });
      return res.end();
    }

    if (url.pathname === '/oauth2/callback') {
      const address = server.address();
      const redirectUri = `http://${HOST}:${address.port}/oauth2/callback`;
      const callbackUrl = `http://${HOST}:${address.port}${req.url}`;
      const validated = validateAuthorizationResponse(callbackUrl, { expectedState: state });
      evidence.oauth.stateBinding = 'PASS';
      const tokens = await exchangeAuthorizationCode(validated.code, redirectUri);
      refreshToken = String(tokens.refresh_token);
      evidence.oauth.realConsent = 'PASS';

      currentProvider = shortTokenProvider(String(tokens.access_token));
      baselineHistoryId = await getProfileHistoryId(currentProvider);
      authorizationComplete = true;
      await persistSanitizedEvidence();

      return sendHtml(res, 200, 'Authorization received', `<p class="ok">FinanceSensor DEV is authorized and the Gmail history cursor was received.</p><p>Now send <strong>one harmless synthetic email</strong> to this test Gmail account. Suggested content:</p><pre>Subject: FinanceSensor Test Purchase\n\nPurchase approved. PEN 12.34; Merchant: DEMO STORE; Operation code: DEMO-1234</pre><p>No real account, card or purchase data is needed.</p><form method="post" action="/probe?s=${encodeURIComponent(sessionSecret)}"><button type="submit">I sent the test email — run bounded probe</button></form>`);
    }

    if (url.pathname === '/probe' && req.method === 'POST') {
      if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor Level C', '<p>Invalid local session.</p>');
      await runControlledProbe();
      const fullStatus = evidence.gmail.selectedFull;
      return sendHtml(res, 200, 'Controlled Gmail probe complete', `<p class="${fullStatus === 'PASS' ? 'ok' : 'warn'}">Selected FULL: ${escapeHtml(fullStatus)}</p><p>Gmail requests so far: profile ${evidence.requests.profile}, list ${evidence.requests.list}, metadata ${evidence.requests.metadata}, full ${evidence.requests.full}, history ${evidence.requests.history}.</p><p>The result file contains only aggregate evidence.</p><form method="post" action="/revoke?s=${encodeURIComponent(sessionSecret)}"><button type="submit">Revoke FinanceSensor DEV and verify</button></form>`);
    }

    if (url.pathname === '/revoke' && req.method === 'POST') {
      if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor Level C', '<p>Invalid local session.</p>');
      await revokeAndVerify();
      const status = evidence.result;
      sendHtml(res, 200, 'Level C finished', `<p class="${status === 'LEVEL_C_EXECUTION_COMPLETE' ? 'ok' : 'warn'}">${escapeHtml(status)}</p><p>Sanitized evidence was written to <code>${RESULT_FILE}</code>. You can upload that JSON to ChatGPT; it contains no Gmail body, message ID, token, authorization code, PKCE verifier or financial literal.</p><p>You may close this window.</p>`);
      setTimeout(() => server.close(), 1000).unref();
      return;
    }

    sendHtml(res, 404, 'FinanceSensor Level C', '<p>Not found.</p>');
  } catch (error) {
    evidence.result = 'FAIL';
    evidence.failureCode = String(error?.message ?? 'UNKNOWN').slice(0, 120).replace(/[?&].*/g, '');
    await persistSanitizedEvidence().catch(() => {});
    sendHtml(res, 500, 'FinanceSensor Level C — stopped safely', `<p class="warn">The probe stopped: <code>${escapeHtml(evidence.failureCode)}</code>.</p><p>No secret is shown here. Close the window and share only <code>${RESULT_FILE}</code> if you want me to diagnose it.</p>`);
  }
});

server.listen(0, HOST, () => {
  const address = server.address();
  const localUrl = `http://${HOST}:${address.port}/?s=${encodeURIComponent(sessionSecret)}`;
  const opened = openBrowser(localUrl);
  console.log(opened ? 'FinanceSensor Level C opened in your browser.' : `Open this local URL in your browser: ${localUrl}`);
  console.log(`Bounded Gmail policy: max ${MAX_MESSAGES} recent messages, max 1 FULL message, no historical sweep.`);
  console.log('Tokens and Gmail content are never printed or written to the result file.');
});

process.on('SIGINT', async () => {
  refreshToken = null;
  if (!revocationComplete) {
    evidence.result = 'STOPPED_BEFORE_REVOCATION';
    await persistSanitizedEvidence().catch(() => {});
  }
  server.close(() => process.exit(0));
});
