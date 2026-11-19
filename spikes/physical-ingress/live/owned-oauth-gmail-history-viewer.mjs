import http from 'node:http';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { GmailRestProvider } from '../src/gmail-rest-provider.js';
import { HistoricalGmailImporter } from '../src/historical-gmail-importer.js';
import { LocalFileEncryptedVault } from '../src/file-encrypted-vault.js';
import {
  GMAIL_READONLY_SCOPE,
  LocalOAuthCredentialProvider,
  buildTokenExchangeRequest,
  createAuthorizationRequest,
  createPkcePair,
  parseDesktopCredentialsJson,
  validateAuthorizationResponse
} from '../src/oauth-native-contract.js';

const EXPECTED_CLIENT_ID = '150834461062-b32pvpc84plkl0ftftm2vcfqfoq1ff8t.apps.googleusercontent.com';
const HOST = '127.0.0.1';
const PAGE_SIZE = 50;
const sessionSecret = crypto.randomBytes(24).toString('base64url');
const oauthState = crypto.randomBytes(24).toString('base64url');
const pkce = createPkcePair();

const localRoot = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.financesensor'), 'FinanceSensor', 'gmail-history-dev');
const wrappedKeyPath = path.join(localRoot, 'history-key.dpapi');
const snapshotPath = path.join(localRoot, 'history-state.aesgcm.json');

let server;
let desktopClientSecret = null;
let shortAccessToken = null;
let refreshToken = null;
let credentialProvider = null;
let gmailProvider = null;
let importer = null;
let vault = null;
let authorizedMailbox = null;
let authorizationComplete = false;
let scanPromise = null;
let scanError = null;
let scanStartedAt = null;
let scanFinishedAt = null;
let lastTelemetry = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
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

function requireSession(url) {
  return url.searchParams.get('s') === sessionSecret;
}

function sendHtml(res, status, title, body) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  });
  res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
  :root{color-scheme:light dark;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;background:#0d1117;color:#e6edf3}.wrap{max-width:1180px;margin:0 auto;padding:28px}.hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:20px}.brand{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#8b949e}.title{font-size:34px;line-height:1.1;margin:8px 0}.muted{color:#8b949e}.panel{background:#161b22;border:1px solid #30363d;border-radius:16px;padding:18px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metric strong{display:block;font-size:25px;margin-top:6px}.status{display:inline-flex;padding:7px 11px;border-radius:999px;background:#21262d;border:1px solid #30363d;font-weight:700}.ok{color:#3fb950}.warn{color:#d29922}.bad{color:#f85149}button,a.button{border:0;border-radius:10px;background:#238636;color:#fff;padding:11px 15px;font-weight:700;text-decoration:none;cursor:pointer}.filters{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.filters input,.filters select{background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:9px;padding:10px 12px}.table{width:100%;border-collapse:collapse}.table th,.table td{text-align:left;padding:11px 9px;border-bottom:1px solid #21262d;vertical-align:top}.table th{font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.06em}.amount{font-variant-numeric:tabular-nums;font-weight:800}.pill{display:inline-block;border:1px solid #30363d;border-radius:999px;padding:4px 8px;font-size:12px}.footer{margin-top:18px;color:#8b949e;font-size:13px}.empty{padding:28px;text-align:center;color:#8b949e}@media(max-width:820px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{display:block}.title{font-size:28px}.table{font-size:13px}.wrap{padding:18px}}@media(max-width:520px){.grid{grid-template-columns:1fr}.table th:nth-child(4),.table td:nth-child(4){display:none}}
  </style></head><body><div class="wrap">${body}</div></body></html>`);
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer'
  });
  res.end(JSON.stringify(payload));
}

function powershellDpapi(mode, inputBuffer) {
  if (process.platform !== 'win32') throw new Error('WINDOWS_DPAPI_REQUIRED_FOR_REAL_HISTORY_VIEWER');
  const script = mode === 'protect'
    ? "$s=[Console]::In.ReadToEnd();$b=[Convert]::FromBase64String($s.Trim());$p=[System.Security.Cryptography.ProtectedData]::Protect($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($p))"
    : "$s=[Console]::In.ReadToEnd();$b=[Convert]::FromBase64String($s.Trim());$p=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($p))";
  const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    input: Buffer.from(inputBuffer).toString('base64'),
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
  return Buffer.from(output, 'base64');
}

function loadOrCreateDpapiKey() {
  fs.mkdirSync(localRoot, { recursive: true });
  if (fs.existsSync(wrappedKeyPath)) {
    const wrapped = Buffer.from(fs.readFileSync(wrappedKeyPath, 'utf8').trim(), 'base64');
    const key = powershellDpapi('unprotect', wrapped);
    if (key.length !== 32) throw new Error('DPAPI_VAULT_KEY_LENGTH_INVALID');
    return key;
  }
  const key = crypto.randomBytes(32);
  const wrapped = powershellDpapi('protect', key);
  fs.writeFileSync(wrappedKeyPath, `${wrapped.toString('base64')}\n`, { encoding: 'utf8', mode: 0o600 });
  return key;
}

function sanitizeError(error) {
  const code = String(error?.code || error?.message || 'UNCLASSIFIED').slice(0, 120);
  return code.replace(/[A-Za-z0-9_-]{28,}/g, '[REDACTED]');
}

async function loadDesktopCredential() {
  const credentialPath = process.env.FINANCESENSOR_GOOGLE_CREDENTIALS_PATH;
  if (!credentialPath) throw new Error('DESKTOP_CREDENTIAL_FILE_NOT_SELECTED');
  const parsed = parseDesktopCredentialsJson(await readFile(credentialPath, 'utf8'), { expectedClientId: EXPECTED_CLIENT_ID });
  desktopClientSecret = parsed.clientSecret;
}

async function exchangeAuthorizationCode(code) {
  const request = buildTokenExchangeRequest({
    clientId: EXPECTED_CLIENT_ID,
    clientSecret: desktopClientSecret,
    redirectUri: rootRedirectUri(),
    code,
    codeVerifier: pkce.codeVerifier
  });
  const response = await fetch(request.url, { method: request.method, headers: request.headers, body: request.body });
  const raw = await response.text();
  if (!response.ok) throw new Error(`TOKEN_EXCHANGE_HTTP_${response.status}`);
  const payload = JSON.parse(raw);
  if (!payload?.access_token) throw new Error('TOKEN_EXCHANGE_MISSING_ACCESS_TOKEN');
  const scopes = String(payload.scope || GMAIL_READONLY_SCOPE).split(/\s+/).filter(Boolean);
  if (scopes.length !== 1 || scopes[0] !== GMAIL_READONLY_SCOPE) throw new Error('TOKEN_SCOPE_NOT_EXACT_GMAIL_READONLY');
  return payload;
}

function buildCredentialProvider(tokens) {
  shortAccessToken = String(tokens.access_token);
  refreshToken = tokens.refresh_token ? String(tokens.refresh_token) : null;
  if (refreshToken) {
    return new LocalOAuthCredentialProvider({
      clientId: EXPECTED_CLIENT_ID,
      clientSecret: desktopClientSecret,
      refreshToken
    });
  }
  return {
    async getAccessToken() {
      if (!shortAccessToken) {
        const error = new Error('REAUTH_REQUIRED');
        error.code = 'REAUTH_REQUIRED';
        throw error;
      }
      return shortAccessToken;
    },
    async onUnauthorized() {
      shortAccessToken = null;
    }
  };
}

function startHistoricalScan() {
  if (scanPromise) return scanPromise;
  scanStartedAt = new Date().toISOString();
  scanError = null;
  scanPromise = importer.runAllAvailableActiveMailbox({ pageSize: PAGE_SIZE })
    .then(() => {
      scanFinishedAt = new Date().toISOString();
    })
    .catch(error => {
      scanError = sanitizeError(error);
      scanFinishedAt = new Date().toISOString();
    });
  return scanPromise;
}

function projectionPayload() {
  let projection = {
    coverage: {
      status: authorizationComplete ? 'NOT_STARTED' : 'AUTHORIZATION_REQUIRED',
      pagesCompleted: 0,
      messagesEnumerated: 0,
      metadataInspected: 0,
      fullMessagesFetched: 0,
      financialEvidenceCreated: 0,
      reviewCandidates: 0,
      includeSpamTrash: false
    },
    transactions: [],
    reviewCount: 0,
    historyCursorSource: null
  };
  if (importer) {
    try { projection = importer.projection(); } catch (error) { scanError ||= sanitizeError(error); }
  }
  const transactions = (projection.transactions ?? []).map(item => ({
    occurredAt: item.occurredAt,
    amount: item.amount,
    currency: item.currency,
    direction: item.direction,
    merchant: item.merchant,
    semanticType: item.semanticType,
    confidence: item.confidence,
    evidenceCount: item.evidenceCount
  }));
  return {
    product: 'FinanceSensor Gmail History DEV',
    scope: GMAIL_READONLY_SCOPE,
    mailbox: authorizedMailbox,
    coverageClaim: 'ALL_DETECTED_TRANSACTION_EVIDENCE_WITHIN_COMPLETED_GMAIL_MAILBOX_SCOPE',
    forbiddenClaim: 'ALL_BANK_TRANSACTIONS_EXISTING_OUTSIDE_GMAIL',
    activeMailboxExcludesSpamTrash: true,
    authorizationComplete,
    scanStartedAt,
    scanFinishedAt,
    scanError,
    scanInProgress: Boolean(scanPromise && !scanFinishedAt),
    lastTelemetry,
    coverage: projection.coverage,
    historyCursorSource: projection.historyCursorSource,
    transactionCount: transactions.length,
    reviewCount: projection.reviewCount,
    transactions
  };
}

function dashboardHtml() {
  const api = `/api/status?s=${encodeURIComponent(sessionSecret)}`;
  return `<div class="hero"><div><div class="brand">FinanceSensor · Trusted local edge</div><h1 class="title">Gmail Transaction History</h1><p class="muted">Solo <code>gmail.readonly</code>. Buzón activo completo; spam y papelera excluidos. El correo crudo no se conserva.</p></div><span id="status" class="status">CARGANDO</span></div>
<div class="grid">
  <div class="panel metric"><span class="muted">Correos enumerados</span><strong id="enumerated">0</strong></div>
  <div class="panel metric"><span class="muted">Evidencias financieras</span><strong id="evidence">0</strong></div>
  <div class="panel metric"><span class="muted">Movimientos canónicos</span><strong id="transactions">0</strong></div>
  <div class="panel metric"><span class="muted">Revisión pendiente</span><strong id="review">0</strong></div>
</div>
<div class="panel" style="margin-top:14px"><div id="mailbox" class="muted"></div><div id="coverage" style="margin-top:8px"></div><div class="filters"><input id="search" type="search" placeholder="Buscar comercio"><select id="type"><option value="">Todos los tipos</option><option>EXPENSE</option><option>INCOME</option><option>INTERNAL_TRANSFER</option><option>EXTERNAL_TRANSFER</option><option>CARD_PAYMENT</option><option>REFUND</option><option>REVERSAL</option><option>FEE</option><option>UNKNOWN</option></select></div><div style="overflow:auto"><table class="table"><thead><tr><th>Fecha</th><th>Movimiento</th><th>Importe</th><th>Confianza</th></tr></thead><tbody id="rows"></tbody></table></div><div id="empty" class="empty">Todavía no hay movimientos visibles.</div></div>
<div class="footer">COMPLETE solo significa que FinanceSensor agotó <code>nextPageToken</code> del buzón Gmail cubierto. No significa que Gmail contenga todas las operaciones existentes en tus bancos.</div>
<script>
const API=${JSON.stringify(api)};let DATA=null;const money=(n,c)=>new Intl.NumberFormat('es-PE',{style:'currency',currency:c==='USD'?'USD':'PEN'}).format(Number(n||0));const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){if(!DATA)return;const c=DATA.coverage||{};document.getElementById('enumerated').textContent=c.messagesEnumerated??0;document.getElementById('evidence').textContent=c.financialEvidenceCreated??0;document.getElementById('transactions').textContent=DATA.transactionCount??0;document.getElementById('review').textContent=DATA.reviewCount??0;document.getElementById('mailbox').textContent=DATA.mailbox?'Cuenta autorizada localmente: '+DATA.mailbox:'';const st=DATA.scanError?'STOPPED_SAFE':(c.status||'RUNNING');const s=document.getElementById('status');s.textContent=st;s.className='status '+(st==='COMPLETE'?'ok':DATA.scanError?'bad':'warn');document.getElementById('coverage').textContent=DATA.scanError?'Escaneo detenido de forma segura: '+DATA.scanError:(st==='COMPLETE'?'Cobertura Gmail completada.':'Escaneando por páginas. Los resultados visibles todavía son PREVIEW.');const q=document.getElementById('search').value.toLowerCase();const t=document.getElementById('type').value;const rows=(DATA.transactions||[]).filter(x=>(!q||String(x.merchant||'').toLowerCase().includes(q))&&(!t||x.semanticType===t));document.getElementById('rows').innerHTML=rows.map(x=>'<tr><td>'+esc(x.occurredAt||'')+'</td><td><strong>'+esc(x.merchant||'Sin comercio')+'</strong><br><span class="pill">'+esc(x.semanticType||'UNKNOWN')+'</span></td><td class="amount">'+esc(money(x.amount,x.currency))+'</td><td>'+Math.round(Number(x.confidence||0)*100)+'% · '+Number(x.evidenceCount||0)+' evidencia(s)</td></tr>').join('');document.getElementById('empty').style.display=rows.length?'none':'block';}
async function poll(){try{const r=await fetch(API,{cache:'no-store'});DATA=await r.json();render();}catch{}setTimeout(poll,1500)}document.getElementById('search').addEventListener('input',render);document.getElementById('type').addEventListener('change',render);poll();
</script>`;
}

function cleanSensitiveMemory() {
  desktopClientSecret = null;
  shortAccessToken = null;
  refreshToken = null;
  credentialProvider = null;
  gmailProvider = null;
}

async function start() {
  await loadDesktopCredential();
  const key = loadOrCreateDpapiKey();
  vault = new LocalFileEncryptedVault({ key, snapshotPath });
  key.fill(0);

  server = http.createServer(async (req, res) => {
    const base = rootRedirectUri();
    const url = new URL(req.url, base);
    try {
      if (url.pathname === '/' && (url.searchParams.has('code') || url.searchParams.has('error'))) {
        const validated = validateAuthorizationResponse(`${base}${req.url}`, { expectedState: oauthState });
        const tokens = await exchangeAuthorizationCode(validated.code);
        credentialProvider = buildCredentialProvider(tokens);
        gmailProvider = new GmailRestProvider({ credentialProvider });
        const profile = await gmailProvider.getProfile();
        authorizedMailbox = profile.emailAddress ? String(profile.emailAddress) : null;
        if (!authorizedMailbox) throw new Error('GMAIL_PROFILE_IDENTITY_MISSING');
        authorizationComplete = true;
        importer = new HistoricalGmailImporter({
          provider: gmailProvider,
          vault,
          credentials: { requireToken: () => { if (!authorizationComplete) throw new Error('source authorization unavailable'); return true; } },
          telemetry: { emit: (_name, payload) => { lastTelemetry = structuredClone(payload); } }
        });
        startHistoricalScan();
        res.writeHead(302, { location: `/dashboard?s=${encodeURIComponent(sessionSecret)}`, 'cache-control': 'no-store' });
        return res.end();
      }

      if (url.pathname === '/') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor', '<div class="panel"><p>Sesión local inválida.</p></div>');
        return sendHtml(res, 200, 'FinanceSensor Gmail History', `<div class="hero"><div><div class="brand">FinanceSensor · DEV</div><h1 class="title">Conectar Gmail y reconstruir movimientos</h1><p class="muted">FinanceSensor pedirá exclusivamente <code>gmail.readonly</code>. Enumerará el buzón activo sin query de completitud, leerá METADATA primero y FULL solo para candidatos fuertes.</p></div></div><div class="panel"><p><strong>Privacidad:</strong> OAuth y Gmail permanecen en esta computadora. El estado derivado se cifra con AES-256-GCM y su clave se protege mediante Windows DPAPI para tu usuario.</p><p><strong>Cobertura:</strong> "completo" significa todo el buzón Gmail cubierto hasta que desaparezca <code>nextPageToken</code>; no significa todas las operaciones que tus bancos jamás hayan enviado por correo.</p><p><a class="button" href="/authorize?s=${encodeURIComponent(sessionSecret)}">Conectar Gmail</a></p></div>`);
      }

      if (url.pathname === '/authorize') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor', '<div class="panel"><p>Sesión local inválida.</p></div>');
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

      if (url.pathname === '/dashboard') {
        if (!requireSession(url)) return sendHtml(res, 403, 'FinanceSensor', '<div class="panel"><p>Sesión local inválida.</p></div>');
        if (!authorizationComplete) return sendHtml(res, 409, 'FinanceSensor', '<div class="panel"><p>Primero autoriza Gmail.</p></div>');
        return sendHtml(res, 200, 'FinanceSensor Gmail History', dashboardHtml());
      }

      if (url.pathname === '/api/status') {
        if (!requireSession(url)) return sendJson(res, 403, { error: 'INVALID_LOCAL_SESSION' });
        return sendJson(res, 200, projectionPayload());
      }

      return sendHtml(res, 404, 'FinanceSensor', '<div class="panel"><p>No encontrado.</p></div>');
    } catch (error) {
      scanError = sanitizeError(error);
      return sendHtml(res, 500, 'FinanceSensor — detenido de forma segura', `<div class="panel"><p class="bad"><strong>${escapeHtml(scanError)}</strong></p><p>No se imprime ningún secreto. Puedes cerrar esta ventana y volver a ejecutar el runner; los checkpoints cifrados ya completados permanecen locales.</p></div>`);
    }
  });

  server.listen(0, HOST, () => openBrowser(`http://${HOST}:${server.address().port}/?s=${encodeURIComponent(sessionSecret)}`));
}

process.on('SIGINT', () => { cleanSensitiveMemory(); vault?.destroyKeyMaterial?.(); process.exit(130); });
process.on('SIGTERM', () => { cleanSensitiveMemory(); vault?.destroyKeyMaterial?.(); process.exit(143); });
process.on('exit', () => { cleanSensitiveMemory(); vault?.destroyKeyMaterial?.(); });

try {
  await start();
} catch (error) {
  console.error(`FINANCESENSOR_GMAIL_HISTORY_VIEWER=STOPPED_SAFE:${sanitizeError(error)}`);
  cleanSensitiveMemory();
  vault?.destroyKeyMaterial?.();
  process.exit(1);
}
