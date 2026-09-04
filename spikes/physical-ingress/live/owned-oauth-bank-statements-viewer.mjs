import http from 'node:http';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { GmailRestProvider } from '../src/gmail-rest-provider.js';
import { LocalFileEncryptedVault } from '../src/file-encrypted-vault.js';
import { windowsDpapi } from '../src/windows-dpapi.js';
import {
  GMAIL_READONLY_SCOPE,
  LocalOAuthCredentialProvider,
  buildTokenExchangeRequest,
  createAuthorizationRequest,
  createPkcePair,
  parseDesktopCredentialsJson,
  validateAuthorizationResponse
} from '../src/oauth-native-contract.js';
import {
  classifyStatementMessage,
  selectStatementPdfAttachment,
  StatementProviderProfile,
  StatementSourceClass
} from '../src/statement-source-adapters.js';
import { fetchGmailStatementAttachment } from '../src/gmail-statement-attachment.js';
import { extractPasswordProtectedPdfLayout } from '../src/pdfjs-statement-parser.js';
import { importStatementLayoutSession } from '../src/statement-import-session.js';
import { parseStatementProfileLayout } from '../src/statement-profile-row-adapters.js';
import { StatementEvidenceImporter } from '../src/statement-evidence-importer.js';

const EXPECTED_CLIENT_ID = '150834461062-b32pvpc84plkl0ftftm2vcfqfoq1ff8t.apps.googleusercontent.com';
const HOST = '127.0.0.1';
const sessionSecret = crypto.randomBytes(24).toString('base64url');
const oauthState = crypto.randomBytes(24).toString('base64url');
const pkce = createPkcePair();
const localRoot = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.financesensor'), 'FinanceSensor', 'gmail-history-dev');
const wrappedKeyPath = path.join(localRoot, 'history-key.dpapi');
const snapshotPath = path.join(localRoot, 'history-state.aesgcm.json');

const DISCOVERY_QUERIES = Object.freeze([
  'from:estadodecuenta@notificacionesbcp.com.pe subject:"Estado de Cuenta de tu Tarjeta VISA" has:attachment',
  'from:BRSimple@bancoripley.com.pe subject:"Estado de Cuenta Banco Ripley" has:attachment',
  'from:notificaciones@notificacionesbcp.com.pe subject:"Constancia de envío de Estado de Cuenta" has:attachment',
  'from:bcpalertasyavisos@bcp.com.pe subject:"Constancia de solicitud de copia de estado de cuenta" has:attachment'
]);

const PHYSICAL_LAYOUT_IMPORT_PROFILES = new Set([
  StatementProviderProfile.BCP_SAVINGS_REQUESTED
]);

let server;
let desktopClientSecret = null;
let shortAccessToken = null;
let refreshToken = null;
let gmailProvider = null;
let authorized = false;
let discovered = [];
let discoveryError = null;
let vault = null;
let statementImporter = null;

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

function oauthRedirectUri() {
  return `${rootRedirectUri()}/oauth/callback`;
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
    'content-security-policy': "default-src 'self'; style-src 'unsafe-inline'; form-action 'self'; script-src 'none'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  });
  res.end(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
  :root{color-scheme:light dark;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;background:#0d1117;color:#e6edf3}.wrap{max-width:980px;margin:0 auto;padding:28px}.brand{font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:#8b949e}.title{font-size:32px;margin:8px 0}.muted{color:#8b949e}.panel{background:#161b22;border:1px solid #30363d;border-radius:16px;padding:18px;margin-top:16px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.metric strong{display:block;font-size:24px;margin-top:5px}.status{display:inline-flex;padding:7px 11px;border-radius:999px;background:#21262d;border:1px solid #30363d;font-weight:700}.ok{color:#3fb950}.warn{color:#d29922}.bad{color:#f85149}button,a.button{border:0;border-radius:10px;background:#238636;color:#fff;padding:11px 15px;font-weight:700;text-decoration:none;cursor:pointer}input[type=password]{width:100%;max-width:380px;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:9px;padding:11px 12px;margin:8px 0 12px}.group{border-top:1px solid #30363d;padding-top:16px;margin-top:16px}.footer{margin-top:18px;color:#8b949e;font-size:13px}@media(max-width:700px){.grid{grid-template-columns:1fr}.wrap{padding:18px}}
  </style></head><body><div class="wrap">${body}</div></body></html>`);
}

function safeError(error) {
  const raw = String(error?.code || error?.message || 'UNCLASSIFIED');
  return raw.replace(/[A-Za-z0-9_-]{28,}/g, '[REDACTED]').replace(/[^A-Za-z0-9_:-]/g, '_').slice(0, 120);
}

function header(headers = {}, wanted = '') {
  const key = Object.keys(headers).find(name => name.toLowerCase() === String(wanted).toLowerCase());
  return key ? String(headers[key] ?? '') : '';
}

function physicalImportEnabled(profile) {
  return PHYSICAL_LAYOUT_IMPORT_PROFILES.has(profile);
}

function loadVault() {
  if (process.platform !== 'win32') throw new Error('WINDOWS_DPAPI_REQUIRED_FOR_STATEMENT_IMPORT');
  fs.mkdirSync(localRoot, { recursive: true });
  let key;
  if (fs.existsSync(wrappedKeyPath)) {
    const wrapped = Buffer.from(fs.readFileSync(wrappedKeyPath, 'utf8').trim(), 'base64');
    key = windowsDpapi('unprotect', wrapped);
    wrapped.fill(0);
  } else {
    key = crypto.randomBytes(32);
    const wrapped = windowsDpapi('protect', key);
    fs.writeFileSync(wrappedKeyPath, `${wrapped.toString('base64')}\n`, { encoding: 'utf8', mode: 0o600 });
    wrapped.fill(0);
  }
  if (key.length !== 32) throw new Error('DPAPI_VAULT_KEY_LENGTH_INVALID');
  vault = new LocalFileEncryptedVault({ key, snapshotPath });
  key.fill(0);
  statementImporter = new StatementEvidenceImporter({ vault });
}

function assertHistoricalWriterInactive() {
  const state = vault?.read?.();
  if (state?.historicalBootstrap?.status === 'RUNNING') {
    const error = new Error('HISTORICAL_SCAN_ACTIVE');
    error.code = 'HISTORICAL_SCAN_ACTIVE';
    throw error;
  }
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
    redirectUri: oauthRedirectUri(),
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
    async onUnauthorized() { shortAccessToken = null; }
  };
}

async function listQueryMessageIds(query) {
  const ids = [];
  let pageToken;
  do {
    const page = await gmailProvider.listMessagePage({
      query,
      maxResults: 100,
      pageToken,
      includeSpamTrash: false
    });
    ids.push(...(page.messages ?? []).map(item => item?.id).filter(Boolean));
    pageToken = page.nextPageToken || undefined;
  } while (pageToken && ids.length < 5000);
  return ids;
}

async function discoverStatements() {
  discoveryError = null;
  const seen = new Set();
  const found = [];
  try {
    for (const query of DISCOVERY_QUERIES) {
      const ids = await listQueryMessageIds(query);
      for (const id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        const full = await gmailProvider.getMessage({ id, format: 'FULL' });
        const message = {
          from: header(full.headers, 'From'),
          subject: header(full.headers, 'Subject'),
          snippet: full.body,
          attachments: full.attachments
        };
        const classification = classifyStatementMessage(message);
        if (classification.sourceClass === StatementSourceClass.NOT_STATEMENT) continue;
        const attachment = selectStatementPdfAttachment(message);
        if (!attachment?.attachmentId) continue;
        const descriptorId = crypto.createHash('sha256')
          .update(`${id}|${attachment.attachmentId}`)
          .digest('hex')
          .slice(0, 24);
        found.push({
          descriptorId,
          messageId: id,
          attachmentId: attachment.attachmentId,
          classification
        });
      }
    }
    discovered = found;
  } catch (error) {
    discoveryError = safeError(error);
    throw error;
  }
}

function groupedCounts() {
  const out = new Map();
  for (const item of discovered) {
    const key = item.classification.providerProfile;
    const current = out.get(key) ?? { profile: key, sourceClass: item.classification.sourceClass, count: 0 };
    current.count += 1;
    out.set(key, current);
  }
  return [...out.values()].sort((a, b) => a.profile.localeCompare(b.profile));
}

function groupControl(group) {
  if (!physicalImportEnabled(group.profile)) {
    return `<p class="muted">Formato detectado, pero su parser físico permanece cerrado en este harness. No se importará con un parser genérico.</p>`;
  }
  return `<form method="post" action="/import?profile=${encodeURIComponent(group.profile)}&s=${sessionSecret}" autocomplete="off">
    <label>Clave del PDF · solo esta sesión</label><br>
    <input type="password" name="password" required maxlength="128" autocomplete="off" spellcheck="false">
    <br><button type="submit">Probar importación geométrica</button>
  </form>`;
}

function homeBody(extra = '') {
  if (!authorized) {
    return `<div class="brand">FinanceSensor · Trusted local edge</div><h1 class="title">Bank Statement Recovery</h1><p class="muted">Solo Gmail <code>gmail.readonly</code>. Los PDF y su clave no salen de este proceso local.</p><div class="panel"><p><span class="status warn">NOT AUTHORIZED</span></p><a class="button" href="/connect?s=${sessionSecret}">Conectar Gmail</a></div>${extra}`;
  }

  const groups = groupedCounts();
  const groupHtml = groups.length ? groups.map(group => `
    <div class="group">
      <h3>${escapeHtml(group.profile)}</h3>
      <p>${group.count} estado(s) detectado(s) · ${escapeHtml(group.sourceClass)}</p>
      ${groupControl(group)}
    </div>`).join('') : '<p class="muted">No se detectaron estados de cuenta compatibles todavía.</p>';

  return `<div class="brand">FinanceSensor · Trusted local edge</div><h1 class="title">Bank Statement Recovery</h1><p class="muted">Gmail autorizado localmente. La clave del PDF nunca se persiste.</p>
  <div class="panel"><div class="grid"><div class="metric">EECC detectados<strong>${discovered.length}</strong></div><div class="metric">Perfiles<strong>${groups.length}</strong></div><div class="metric">Scope<strong>readonly</strong></div></div>${discoveryError ? `<p class="bad">${escapeHtml(discoveryError)}</p>` : ''}</div>
  <div class="panel"><h2>Fuentes detectadas</h2>${groupHtml}</div>${extra}<div class="footer">BCP ahorro usa el adapter geométrico estático. Los perfiles de crédito permanecen bloqueados para importación física hasta tener su adapter específico. Interbank ahorro necesita todavía el carril de archivo local.</div>`;
}

async function readSmallForm(req) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 1024) throw new Error('FORM_TOO_LARGE');
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

async function importProfile(profile, password) {
  assertHistoricalWriterInactive();
  if (!physicalImportEnabled(profile)) {
    const error = new Error('STATEMENT_PROFILE_PHYSICAL_HARNESS_NOT_ENABLED');
    error.code = error.message;
    throw error;
  }

  const selected = discovered.filter(item => item.classification.providerProfile === profile);
  if (!selected.length) throw new Error('STATEMENT_PROFILE_EMPTY');
  let statementsParsed = 0;
  let evidenceAdded = 0;
  let pagesParsed = 0;
  let failures = 0;
  let lastFailure = null;

  for (const descriptor of selected) {
    assertHistoricalWriterInactive();
    try {
      const encryptedPdfBytes = await fetchGmailStatementAttachment({
        provider: gmailProvider,
        messageId: descriptor.messageId,
        attachmentId: descriptor.attachmentId
      });
      const layoutResult = await importStatementLayoutSession({
        encryptedPdfBytes,
        password,
        sourceMessageId: descriptor.messageId,
        attachmentIdentity: descriptor.attachmentId,
        statementClassification: descriptor.classification,
        decryptAndExtractLayout: extractPasswordProtectedPdfLayout,
        parseStatementLayout: ({ pages, classification }) => parseStatementProfileLayout({
          providerProfile: classification?.providerProfile,
          pages,
          tenantId: 'tenant-ingress'
        })
      });
      const result = statementImporter.importEvidence({
        evidence: layoutResult.evidence,
        sourceClass: descriptor.classification.sourceClass
      });
      statementsParsed += 1;
      evidenceAdded += result.addedEvidence;
      pagesParsed += layoutResult.pageCount;
    } catch (error) {
      failures += 1;
      lastFailure = safeError(error);
    }
  }

  return { statementsParsed, evidenceAdded, pagesParsed, failures, lastFailure };
}

server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, rootRedirectUri());

    if (url.pathname === '/' && req.method === 'GET') {
      sendHtml(res, 200, 'FinanceSensor Statements', homeBody());
      return;
    }

    if (url.pathname === '/connect' && req.method === 'GET') {
      if (!requireSession(url)) { sendHtml(res, 403, 'Forbidden', '<p>Sesión local inválida.</p>'); return; }
      const request = createAuthorizationRequest({
        clientId: EXPECTED_CLIENT_ID,
        redirectUri: oauthRedirectUri(),
        state: oauthState,
        codeVerifier: pkce.codeVerifier,
        scopes: [GMAIL_READONLY_SCOPE]
      });
      res.writeHead(302, { location: request.authorizationUrl, 'cache-control': 'no-store' });
      res.end();
      return;
    }

    if (url.pathname === '/oauth/callback' && req.method === 'GET') {
      const callback = validateAuthorizationResponse(url.toString(), { expectedState: oauthState });
      const tokens = await exchangeAuthorizationCode(callback.code);
      const credentialProvider = buildCredentialProvider(tokens);
      gmailProvider = new GmailRestProvider({ credentialProvider });
      await gmailProvider.getProfile();
      authorized = true;
      await discoverStatements();
      res.writeHead(302, { location: `/?s=${sessionSecret}`, 'cache-control': 'no-store' });
      res.end();
      return;
    }

    if (url.pathname === '/import' && req.method === 'POST') {
      if (!requireSession(url) || !authorized || !gmailProvider) {
        sendHtml(res, 403, 'Forbidden', '<p>Sesión local no autorizada.</p>');
        return;
      }
      const form = await readSmallForm(req);
      let password = String(form.get('password') ?? '');
      const profile = String(url.searchParams.get('profile') ?? '');
      if (!password) throw new Error('STATEMENT_PASSWORD_REQUIRED');
      let result;
      try {
        result = await importProfile(profile, password);
      } finally {
        password = '';
      }
      const tone = result.failures === 0 ? 'ok' : 'warn';
      const extra = `<div class="panel"><p><span class="status ${tone}">${result.failures === 0 ? 'IMPORT FINISHED' : 'PARTIAL / SAFE'}</span></p><p>EECC procesados: <strong>${result.statementsParsed}</strong><br>Páginas procesadas: <strong>${result.pagesParsed}</strong><br>Evidencias nuevas: <strong>${result.evidenceAdded}</strong><br>EECC no procesados: <strong>${result.failures}</strong>${result.lastFailure ? `<br>Código local: <code>${escapeHtml(result.lastFailure)}</code>` : ''}</p><p class="muted">La clave no fue guardada. El PDF, texto y geometría descifrados no fueron persistidos.</p></div>`;
      sendHtml(res, 200, 'FinanceSensor Statements', homeBody(extra));
      return;
    }

    sendHtml(res, 404, 'Not found', '<p>Ruta no encontrada.</p>');
  } catch (error) {
    const code = safeError(error);
    const message = code === 'HISTORICAL_SCAN_ACTIVE'
      ? 'El histórico Gmail sigue RUNNING. FinanceSensor se niega a escribir el mismo vault desde dos procesos. Termina o detén el histórico antes de importar EECC.'
      : 'FinanceSensor detuvo esta operación de forma segura.';
    sendHtml(res, 500, 'FinanceSensor safe stop', `<div class="brand">FinanceSensor · Trusted local edge</div><h1 class="title">STOPPED_SAFE</h1><div class="panel"><p>${escapeHtml(message)}</p><p>Código local: <code>${escapeHtml(code)}</code></p></div>`);
  }
});

await loadDesktopCredential();
loadVault();
server.listen(0, HOST, () => {
  const url = `${rootRedirectUri()}/?s=${sessionSecret}`;
  console.log('FINANCESENSOR_STATEMENT_VIEWER=READY');
  console.log('SCOPE=gmail.readonly');
  console.log('BCP_SAVINGS_LAYOUT_PHYSICAL_HARNESS=ENABLED');
  console.log('CREDIT_STATEMENT_PHYSICAL_IMPORT=OPEN');
  console.log('INTERBANK_LOCAL_FILE_IMPORT=OPEN');
  console.log('STATEMENT_PASSWORD_PERSISTENCE=0');
  console.log('RAW_DECRYPTED_STATEMENT_DURABILITY=0');
  console.log('LAYOUT_PLAINTEXT_DURABILITY=0');
  console.log('IOS_TOUCHED=0');
  openBrowser(url);
});

function shutdown() {
  shortAccessToken = null;
  refreshToken = null;
  desktopClientSecret = null;
  discovered = [];
  try { vault?.destroyKeyMaterial?.(); } catch {}
  server?.close?.(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
