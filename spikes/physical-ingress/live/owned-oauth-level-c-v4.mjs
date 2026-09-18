import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
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
import { extractFinancialEvidence, isLikelyFinancialMetadata } from '../src/ingress.js';

const EXPECTED_CLIENT_ID = '150834461062-b32pvpc84plkl0ftftm2vcfqfoq1ff8t.apps.googleusercontent.com';
const HOST = '127.0.0.1';
const MAX_MESSAGES = 5;
const MAX_FULL_MESSAGES = 1;
const MAX_PROBE_ATTEMPTS = 2;
const RESULT_FILE = 'financesensor-level-c-result.json';
const marker = `FSLC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
const syntheticSubject = `FinanceSensor Test Purchase ${marker}`;
const syntheticBody = 'Purchase approved. PEN 12.34; Merchant: DEMO STORE; Operation code: DEMO-1234';
const sessionSecret = crypto.randomBytes(24).toString('base64url');
const state = crypto.randomBytes(24).toString('base64url');
const pkce = createPkcePair();

let desktopClientSecret = null;
let accessToken = null;
let refreshToken = null;
let baselineHistoryId = null;
let authorizationComplete = false;
let probeAttempts = 0;
let server;

const evidence = {
  schemaVersion: 4,
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
    clientSecretPersistedByRunner: 0,
    clientSecretWrittenToEvidence: 0,
    clientSecretCloudCopies: 0,
    realConsent: 'PENDING',
    pkceS256: true,
    stateBinding: 'PENDING',
    loopbackRootRedirect: true,
    tokenExchangeHttpStatus: 'PENDING'
  },
  gmail: {
    profileHistoryCursor: 'PENDING',
    list: 'SKIPPED_BY_DESIGN',
    incrementalHistory: 'PENDING',
    metadata: 'PENDING',
    syntheticMarkerMatched: 'PENDING',
    productionMetadataGate: 'PENDING',
    selectedFull: 'PENDING',
    extraction: 'PENDING',
    replayObserved: 'PENDING'
  },
  revocation: {
    providerAcceptedRevoke: 'PENDING',
    refreshAuthorityAfterRevoke: 'PENDING'
  },
  privacy: {
    rawGmailContentWrittenToResult: 0,
    financialPlaintextWrittenToResult: 0,
    authSecretWrittenToResult: 0,
    credentialPathWrittenToResult: 0,
    syntheticMarkerWrittenToResult: 0,
    preAuthorizationMailboxSweep: 0
  },
  requests: { profile: 0, list: 0, metadata: 0, full: 0, history: 0, tokenExchange: 0, tokenRefresh: 0, revoke: 0 },
  probeAttempts: 0,
  executionComplete: false,
  levelCPass: 'PENDING',
  result: 'IN_PROGRESS'
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:16px system-ui;max-width:760px;margin:48px auto;padding:0 20px;line-height:1.5}button,a.button{display:inline-block;padding:12px 18px;border:1px solid #555;border-radius:10px;background:#111;color:#fff;text-decoration:none;cursor:pointer}pre,code{background:#f3f3f3;border-radius:8px}pre{padding:16px;overflow:auto}.ok{color:#087a2f}.warn{color:#8a5700}</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
}
function sendHtml(res, status, title, body) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' });
  res.end(page(title, body));
}
function requireSession(url) { return url.searchParams.get('s') === sessionSecret; }
function openBrowser(url) {
  const options = { detached: true, stdio: 'ignore' };
  const child = process.platform === 'win32'
    ? spawn('cmd.exe', ['/c', 'start', '', url], options)
    : process.platform === 'darwin' ? spawn('open', [url], options) : spawn('xdg-open', [url], options);
  child.unref();
}
function rootRedirectUri() { const a = server.address(); return `http://${HOST}:${a.port}`; }
function headerValue(headers, wanted) {
  const target = String(wanted).toLowerCase();
  for (const [key, value] of Object.entries(headers ?? {})) if (String(key).toLowerCase() === target) return String(value ?? '');
  return '';
}
function uniqueMessageIds(history = []) { return [...new Set(history.map(x => String(x.messageId)).filter(Boolean))].slice(0, MAX_MESSAGES); }
async function persist() { await writeFile(RESULT_FILE, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 }); }
function cleanSensitiveMemory() { desktopClientSecret = null; accessToken = null; refreshToken = null; }

async function loadDesktopCredential() {
  const path = process.env.FINANCESENSOR_GOOGLE_CREDENTIALS_PATH;
  if (!path) throw new Error('DESKTOP_CREDENTIAL_FILE_NOT_SELECTED');
  evidence.oauth.desktopCredentialFileSelected = true;
  const credential = parseDesktopCredentialsJson(await readFile(path, 'utf8'), { expectedClientId: EXPECTED_CLIENT_ID });
  desktopClientSecret = credential.clientSecret;
  evidence.oauth.desktopCredentialClientIdMatched = 'PASS';
}

async function exchangeAuthorizationCode(code) {
  const request = buildTokenExchangeRequest({ clientId: EXPECTED_CLIENT_ID, clientSecret: desktopClientSecret, redirectUri: rootRedirectUri(), code, codeVerifier: pkce.codeVerifier });
  evidence.requests.tokenExchange += 1;
  const response = await fetch(request.url, { method: request.method, headers: request.headers, body: request.body });
  evidence.oauth.tokenExchangeHttpStatus = response.status;
  const raw = await response.text();
  if (!response.ok) throw new Error(`TOKEN_EXCHANGE_HTTP_${response.status}`);
  const payload = JSON.parse(raw);
  if (!payload?.access_token || !payload?.refresh_token) throw new Error('TOKEN_EXCHANGE_MISSING_AUTHORITY');
  return payload;
}

async function runProbe() {
  if (!authorizationComplete) throw new Error('AUTHORIZATION_NOT_COMPLETE');
  if (probeAttempts >= MAX_PROBE_ATTEMPTS) throw new Error('PROBE_ATTEMPT_LIMIT_REACHED');
  probeAttempts += 1;
  evidence.probeAttempts = probeAttempts;
  const provider = new GmailRestProvider({ accessToken });
  evidence.requests.history += 1;
  const incremental = await provider.listHistory({ startHistoryId: baselineHistoryId, maxResults: MAX_MESSAGES });
  evidence.gmail.incrementalHistory = 'PASS';
  const ids = uniqueMessageIds(incremental.history);
  let selectedId = null;

  for (const id of ids) {
    evidence.requests.metadata += 1;
    const metadata = await provider.getMessage({ id, format: 'METADATA', metadataHeaders: ['From', 'Date', 'Subject'] });
    evidence.gmail.metadata = 'PASS';
    const subject = headerValue(metadata.headers, 'Subject');
    if (subject.includes(marker)) {
      evidence.gmail.syntheticMarkerMatched = 'PASS';
      evidence.gmail.productionMetadataGate = isLikelyFinancialMetadata(metadata.headers) ? 'PASS' : 'FAIL';
      selectedId = id;
      break;
    }
  }

  if (!selectedId) {
    evidence.gmail.syntheticMarkerMatched = 'NOT_FOUND';
    evidence.result = probeAttempts < MAX_PROBE_ATTEMPTS ? 'WAIT_AND_RETRY_ONCE' : 'PROBE_PARTIAL';
    await persist();
    return evidence.result;
  }

  evidence.requests.full += 1;
  const full = await provider.getMessage({ id: selectedId, format: 'FULL' });
  evidence.gmail.selectedFull = 'PASS';
  const extracted = extractFinancialEvidence(full);
  evidence.gmail.extraction = extracted ? 'PASS' : 'FAIL';

  evidence.requests.history += 1;
  const replay = await provider.listHistory({ startHistoryId: baselineHistoryId, maxResults: MAX_MESSAGES });
  evidence.gmail.replayObserved = JSON.stringify(ids) === JSON.stringify(uniqueMessageIds(replay.history)) ? 'PASS' : 'REVIEW';
  evidence.result = evidence.gmail.productionMetadataGate === 'PASS' && evidence.gmail.extraction === 'PASS' && evidence.gmail.replayObserved === 'PASS'
    ? 'READY_FOR_REVOCATION' : 'PROBE_PARTIAL';
  await persist();
  return evidence.result;
}

function coreProbePassed() {
  return evidence.oauth.realConsent === 'PASS' &&
    evidence.oauth.stateBinding === 'PASS' &&
    evidence.gmail.profileHistoryCursor === 'PASS' &&
    evidence.gmail.incrementalHistory === 'PASS' &&
    evidence.gmail.metadata === 'PASS' &&
    evidence.gmail.syntheticMarkerMatched === 'PASS' &&
    evidence.gmail.productionMetadataGate === 'PASS' &&
    evidence.gmail.selectedFull === 'PASS' &&
    evidence.gmail.extraction === 'PASS' &&
    evidence.gmail.replayObserved === 'PASS';
}

async function revokeAndVerify() {
  if (!refreshToken) throw new Error('NO_REFRESH_AUTHORITY');
  evidence.requests.revoke += 1;
  const revoke = await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: refreshToken }).toString()
  });
  evidence.revocation.providerAcceptedRevoke = revoke.ok ? 'PASS' : `HTTP_${revoke.status}`;

  evidence.requests.tokenRefresh += 1;
  const refreshAttempt = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: EXPECTED_CLIENT_ID, client_secret: desktopClientSecret, refresh_token: refreshToken }).toString()
  });
  evidence.revocation.refreshAuthorityAfterRevoke = refreshAttempt.ok ? 'UNEXPECTEDLY_USABLE_OR_PROVIDER_GRACE' : 'DENIED';
  evidence.executionComplete = true;
  evidence.levelCPass = coreProbePassed() && evidence.revocation.providerAcceptedRevoke === 'PASS' && evidence.revocation.refreshAuthorityAfterRevoke === 'DENIED' ? 'PASS' : 'FAIL';
  evidence.result = evidence.levelCPass === 'PASS' ? 'LEVEL_C_PASS' : 'LEVEL_C_EXECUTION_COMPLETE_WITH_GAPS';
  evidence.executionFinishedAt = new Date().toISOString();
  cleanSensitiveMemory();
  await persist();
}

async function start() {
  try { await loadDesktopCredential(); } catch (error) {
    evidence.result = 'FAIL'; evidence.failureCode = String(error?.message ?? 'DESKTOP_CREDENTIAL_LOAD_FAILED').slice(0, 120); cleanSensitiveMemory(); await persist().catch(() => {}); return;
  }

  server = http.createServer(async (req, res) => {
    const base = rootRedirectUri();
    const url = new URL(req.url, base);
    try {
      if (url.pathname === '/' && (url.searchParams.has('code') || url.searchParams.has('error'))) {
        const validated = validateAuthorizationResponse(`${base}${req.url}`, { expectedState: state });
        evidence.oauth.stateBinding = 'PASS';
        const tokens = await exchangeAuthorizationCode(validated.code);
        accessToken = String(tokens.access_token); refreshToken = String(tokens.refresh_token); evidence.oauth.realConsent = 'PASS';
        const provider = new GmailRestProvider({ accessToken }); evidence.requests.profile += 1; baselineHistoryId = await provider.getCurrentHistoryId(); evidence.gmail.profileHistoryCursor = 'PASS'; authorizationComplete = true; await persist();
        return sendHtml(res, 200, 'Authorization received', `<p class="ok">OAuth and the Gmail history cursor are live.</p><p>Send exactly one harmless synthetic email to this same test Gmail account:</p><pre>Subject: ${escapeHtml(syntheticSubject)}\n\n${escapeHtml(syntheticBody)}</pre><p>The random proof marker is used only in memory to select this synthetic message; it is not written to evidence.</p><form method="post" action="/probe?s=${encodeURIComponent(sessionSecret)}"><button>I sent it — run bounded probe</button></form>`);
      }
      if (url.pathname === '/') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor Level C', '<p>Invalid local session.</p>');
        return sendHtml(res, 200, 'FinanceSensor — Gmail Level C v4', `<p>History-only, no mailbox listing, ≤${MAX_MESSAGES} changed IDs per attempt, ≤${MAX_FULL_MESSAGES} FULL.</p><p><a class="button" href="/authorize?s=${encodeURIComponent(sessionSecret)}">Authorize FinanceSensor DEV</a></p>`);
      }
      if (url.pathname === '/authorize') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor Level C', '<p>Invalid local session.</p>');
        const auth = createAuthorizationRequest({ clientId: EXPECTED_CLIENT_ID, redirectUri: rootRedirectUri(), state, codeVerifier: pkce.codeVerifier, scopes: [GMAIL_READONLY_SCOPE] });
        const authUrl = new URL(auth.authorizationUrl); authUrl.searchParams.set('prompt', 'consent');
        res.writeHead(302, { location: authUrl.toString(), 'cache-control': 'no-store' }); return res.end();
      }
      if (url.pathname === '/probe' && req.method === 'POST') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor Level C', '<p>Invalid local session.</p>');
        const status = await runProbe();
        if (status === 'WAIT_AND_RETRY_ONCE') return sendHtml(res, 200, 'Synthetic message not observed yet', `<p class="warn">Confirm the message arrived, wait a few seconds, then use the one allowed retry.</p><form method="post" action="/probe?s=${encodeURIComponent(sessionSecret)}"><button>Retry bounded probe once</button></form>`);
        return sendHtml(res, 200, 'Controlled Gmail probe finished', `<p>Probe state: <strong>${escapeHtml(status)}</strong></p><p>FULL requests: ${evidence.requests.full}; history: ${evidence.requests.history}; metadata: ${evidence.requests.metadata}.</p><form method="post" action="/revoke?s=${encodeURIComponent(sessionSecret)}"><button>Revoke FinanceSensor DEV and verify</button></form>`);
      }
      if (url.pathname === '/revoke' && req.method === 'POST') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor Level C', '<p>Invalid local session.</p>');
        await revokeAndVerify();
        return sendHtml(res, 200, evidence.levelCPass === 'PASS' ? 'Level C PASS' : 'Level C completed with gaps', `<p><strong>${escapeHtml(evidence.result)}</strong></p><p>Sanitized aggregate evidence was written to <code>${RESULT_FILE}</code>. No Gmail content, message ID, proof marker, token, authorization code, PKCE verifier, client secret or credential path is included.</p>`);
      }
      return sendHtml(res, 404, 'FinanceSensor Level C', '<p>Not found.</p>');
    } catch (error) {
      evidence.result = 'FAIL'; evidence.failureCode = String(error?.message ?? 'UNCLASSIFIED').slice(0, 120); await persist().catch(() => {});
      return sendHtml(res, 500, 'FinanceSensor Level C — stopped safely', `<p>The probe stopped: <code>${escapeHtml(evidence.failureCode)}</code>.</p><p>No secret is shown here.</p>`);
    }
  });

  server.listen(0, HOST, () => openBrowser(`http://${HOST}:${server.address().port}/?s=${encodeURIComponent(sessionSecret)}`));
}

process.on('SIGINT', async () => { cleanSensitiveMemory(); await persist().catch(() => {}); process.exit(130); });
process.on('SIGTERM', async () => { cleanSensitiveMemory(); await persist().catch(() => {}); process.exit(143); });
await start();
