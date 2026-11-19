import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
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
import {
  classifyStatementMessage,
  selectStatementPdfAttachment,
  StatementProviderProfile,
  StatementSourceClass
} from '../src/statement-source-adapters.js';
import { fetchGmailStatementAttachment } from '../src/gmail-statement-attachment.js';
import {
  extractLocalPdfLayout,
  extractPasswordProtectedPdfLayout
} from '../src/pdfjs-statement-parser.js';
import { parseStatementSweepProfileLayout } from '../src/statement-sweep-profile-adapters.js';
import {
  auditSweepProfile,
  summarizeSweep,
  SWEEP_SUPPORTED_PROFILES
} from '../src/statement-sweep-engine.js';

const EXPECTED_CLIENT_ID = '150834461062-b32pvpc84plkl0ftftm2vcfqfoq1ff8t.apps.googleusercontent.com';
const HOST = '127.0.0.1';
const sessionSecret = crypto.randomBytes(24).toString('base64url');
const oauthState = crypto.randomBytes(24).toString('base64url');
const pkce = createPkcePair();
const interbankLocalPath = String(process.env.FINANCESENSOR_INTERBANK_STATEMENT_PATH ?? '').trim();

const DISCOVERY_QUERIES = Object.freeze([
  'from:estadodecuenta@notificacionesbcp.com.pe subject:"Estado de Cuenta de tu Tarjeta VISA" has:attachment',
  'from:BRSimple@bancoripley.com.pe subject:"Estado de Cuenta Banco Ripley" has:attachment',
  'from:notificaciones@notificacionesbcp.com.pe subject:"Constancia de envío de Estado de Cuenta" has:attachment',
  'from:bcpalertasyavisos@bcp.com.pe subject:"Constancia de solicitud de copia de estado de cuenta" has:attachment'
]);

let server;
let desktopClientSecret = null;
let shortAccessToken = null;
let refreshToken = null;
let gmailProvider = null;
let authorized = false;
let discovered = [];
let discoveryError = null;

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

function safeError(error) {
  const raw = String(error?.code || error?.message || 'UNCLASSIFIED');
  return raw.replace(/[A-Za-z0-9_-]{28,}/g, '[REDACTED]').replace(/[^A-Za-z0-9_:-]/g, '_').slice(0, 120);
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
  :root{color-scheme:light dark;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;background:#0d1117;color:#e6edf3}.wrap{max-width:1020px;margin:0 auto;padding:28px}.brand{font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:#8b949e}.title{font-size:32px;margin:8px 0}.muted{color:#8b949e}.panel{background:#161b22;border:1px solid #30363d;border-radius:16px;padding:18px;margin-top:16px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.metric strong{display:block;font-size:24px;margin-top:5px}.status{display:inline-flex;padding:7px 11px;border-radius:999px;background:#21262d;border:1px solid #30363d;font-weight:700}.ok{color:#3fb950}.warn{color:#d29922}.bad{color:#f85149}button,a.button{border:0;border-radius:10px;background:#238636;color:#fff;padding:11px 15px;font-weight:700;text-decoration:none;cursor:pointer}input[type=password]{width:100%;max-width:420px;background:#0d1117;color:#e6edf3;border:1px solid #30363d;border-radius:9px;padding:11px 12px;margin:6px 0 12px}.group{border-top:1px solid #30363d;padding-top:14px;margin-top:14px}.profile-result{border-left:3px solid #30363d;padding-left:14px;margin:14px 0}.footer{margin-top:18px;color:#8b949e;font-size:13px}code{word-break:break-word}@media(max-width:760px){.grid{grid-template-columns:1fr 1fr}.wrap{padding:18px}}
  </style></head><body><div class="wrap">${body}</div></body></html>`);
}

function header(headers = {}, wanted = '') {
  const key = Object.keys(headers).find(name => name.toLowerCase() === String(wanted).toLowerCase());
  return key ? String(headers[key] ?? '') : '';
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
      if (!shortAccessToken) throw Object.assign(new Error('REAUTH_REQUIRED'), { code: 'REAUTH_REQUIRED' });
      return shortAccessToken;
    },
    async onUnauthorized() { shortAccessToken = null; }
  };
}

async function listQueryMessageIds(query) {
  const ids = [];
  let pageToken;
  do {
    const page = await gmailProvider.listMessagePage({ query, maxResults: 100, pageToken, includeSpamTrash: false });
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
        if (!SWEEP_SUPPORTED_PROFILES.has(classification.providerProfile)) continue;
        const attachment = selectStatementPdfAttachment(message);
        if (!attachment?.attachmentId) continue;
        found.push({
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
  const counts = new Map();
  for (const item of discovered) {
    const key = item.classification.providerProfile;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (interbankLocalPath) counts.set(StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED, 1);
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function homeBody(extra = '') {
  if (!authorized) {
    return `<div class="brand">FinanceSensor · Trusted local edge</div><h1 class="title">Statement Sweep</h1><p class="muted">Una sesión, todos los perfiles preparados. Solo Gmail <code>gmail.readonly</code>; ningún EECC se escribe al vault durante el barrido.</p><div class="panel"><p><span class="status warn">NOT AUTHORIZED</span></p><a class="button" href="/connect?s=${sessionSecret}">Conectar Gmail</a></div>${extra}`;
  }

  const groups = groupedCounts();
  const profileList = groups.map(([profile, count]) => `<div class="group"><strong>${escapeHtml(profile)}</strong> · ${count} EECC</div>`).join('');
  const interbankStatus = interbankLocalPath ? 'seleccionado localmente' : 'sin archivo local seleccionado';
  return `<div class="brand">FinanceSensor · Trusted local edge</div><h1 class="title">Statement Sweep</h1><p class="muted">Una sola campaña física. El barrido es de solo lectura y no escribe nuevas evidencias.</p>
  <div class="panel"><div class="grid"><div class="metric">Gmail EECC<strong>${discovered.length}</strong></div><div class="metric">Perfiles<strong>${groups.length}</strong></div><div class="metric">Scope<strong>readonly</strong></div><div class="metric">Interbank<strong>${interbankLocalPath ? '1' : '0'}</strong></div></div>${discoveryError ? `<p class="bad">${escapeHtml(discoveryError)}</p>` : ''}</div>
  <div class="panel"><h2>Fuentes del barrido</h2>${profileList || '<p class="muted">Sin EECC detectados.</p>'}<p class="muted">Interbank: ${interbankStatus}.</p></div>
  <div class="panel"><h2>Ejecutar todo de una</h2><form method="post" action="/sweep?s=${sessionSecret}" autocomplete="off">
    <label>Clave BCP · ahorro + Visa · solo memoria</label><br><input type="password" name="bcpPassword" maxlength="128" autocomplete="off" spellcheck="false"><br>
    <label>Clave Ripley · solo memoria</label><br><input type="password" name="ripleyPassword" maxlength="128" autocomplete="off" spellcheck="false"><br>
    <label>Clave Interbank si el PDF la requiere · opcional</label><br><input type="password" name="interbankPassword" maxlength="128" autocomplete="off" spellcheck="false"><br>
    <button type="submit">Auditar todos los EECC</button>
    <p class="muted">Una sola pulsación. Cada perfil falla cerrado por separado; un fallo no evita que los otros perfiles sean evaluados.</p>
  </form></div>${extra}<div class="footer">Password persistence=0 · decrypted PDF durability=0 · layout plaintext durability=0 · iOS untouched.</div>`;
}

async function readSmallForm(req) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 4096) throw new Error('FORM_TOO_LARGE');
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

function passwordForProfile(profile, passwords) {
  if (profile === StatementProviderProfile.BCP_SAVINGS_REQUESTED || profile === StatementProviderProfile.BCP_CREDIT) return passwords.bcp;
  if (profile === StatementProviderProfile.RIPLEY_CREDIT) return passwords.ripley;
  if (profile === StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED) return passwords.interbank;
  return '';
}

function wipe(bytes) {
  try { if (bytes instanceof Uint8Array || Buffer.isBuffer(bytes)) bytes.fill(0); } catch {}
}

async function auditGmailDescriptor(descriptor, passwords) {
  const profile = descriptor.classification.providerProfile;
  let encryptedPdfBytes = null;
  try {
    const password = passwordForProfile(profile, passwords);
    if (!password) throw Object.assign(new Error('STATEMENT_PASSWORD_REQUIRED'), { code: 'STATEMENT_PASSWORD_REQUIRED' });
    encryptedPdfBytes = await fetchGmailStatementAttachment({
      provider: gmailProvider,
      messageId: descriptor.messageId,
      attachmentId: descriptor.attachmentId
    });
    const { pages } = await extractPasswordProtectedPdfLayout({ pdfBytes: encryptedPdfBytes, password });
    const parsed = parseStatementSweepProfileLayout({ providerProfile: profile, pages, tenantId: 'tenant-sweep' });
    const audit = auditSweepProfile({ providerProfile: profile, pages, parsed });
    return { profile, pages: pages.length, ...audit, parserFailure: false };
  } catch (error) {
    return { profile, pages: 0, status: 'FAIL', code: safeError(error), movements: 0, parserFailure: true };
  } finally {
    wipe(encryptedPdfBytes);
  }
}

async function auditInterbankLocal(password) {
  const profile = StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED;
  let bytes = null;
  try {
    if (!interbankLocalPath) return null;
    bytes = await readFile(interbankLocalPath);
    const { pages } = await extractLocalPdfLayout({ pdfBytes: bytes, password });
    const parsed = parseStatementSweepProfileLayout({ providerProfile: profile, pages, tenantId: 'tenant-sweep' });
    const audit = auditSweepProfile({ providerProfile: profile, pages, parsed });
    return { profile, pages: pages.length, ...audit, parserFailure: false };
  } catch (error) {
    return { profile, pages: 0, status: 'FAIL', code: safeError(error), movements: 0, parserFailure: true };
  } finally {
    wipe(bytes);
  }
}

async function runSweep(passwords) {
  const entries = [];
  for (const descriptor of discovered) entries.push(await auditGmailDescriptor(descriptor, passwords));
  const interbank = await auditInterbankLocal(passwords.interbank);
  if (interbank) entries.push(interbank);
  const summary = summarizeSweep(entries);
  for (const profile of summary.profiles) {
    console.log(`FINANCESENSOR_STATEMENT_SWEEP_PROFILE;profile=${profile.profile};selected=${profile.selected};audited=${profile.audited};pass=${profile.pass};open=${profile.open};fail=${profile.fail};parserfail=${profile.parserFailures};pages=${profile.pages};movements=${profile.movements}`);
  }
  console.log(`FINANCESENSOR_STATEMENT_SWEEP;selected=${summary.selected};audited=${summary.audited};pass=${summary.pass};open=${summary.open};fail=${summary.fail};parserfail=${summary.parserFailures};pages=${summary.pages};movements=${summary.movements}`);
  return summary;
}

function sweepResultHtml(summary) {
  const bad = summary.fail > 0 || summary.parserFailures > 0;
  const open = summary.open > 0;
  const tone = bad || open ? 'warn' : 'ok';
  const label = bad ? 'SWEEP DISCREPANCY / SAFE' : open ? 'SWEEP OPEN / SAFE' : 'SWEEP PASS';
  const profileHtml = summary.profiles.map(profile => {
    const codes = Object.entries(profile.codes).sort((a, b) => a[0].localeCompare(b[0])).map(([code, count]) => `<code>${escapeHtml(code)}</code>: ${count}`).join(' · ');
    return `<div class="profile-result"><h3>${escapeHtml(profile.profile)}</h3><p>Seleccionados: <strong>${profile.selected}</strong> · Auditados: <strong>${profile.audited}</strong> · PASS: <strong>${profile.pass}</strong> · OPEN: <strong>${profile.open}</strong> · FAIL: <strong>${profile.fail}</strong> · Parser failures: <strong>${profile.parserFailures}</strong><br>Páginas: <strong>${profile.pages}</strong> · Movimientos: <strong>${profile.movements}</strong>${profile.payments ? ` · Pagos: <strong>${profile.payments}</strong>` : ''}${profile.fees ? ` · Fees: <strong>${profile.fees}</strong>` : ''}${profile.purchases ? ` · Compras: <strong>${profile.purchases}</strong>` : ''}</p><p class="muted">${codes || 'Sin código.'}</p></div>`;
  }).join('');
  return `<div class="panel"><p><span class="status ${tone}">${label}</span></p><div class="grid"><div class="metric">EECC<strong>${summary.selected}</strong></div><div class="metric">Auditados<strong>${summary.audited}</strong></div><div class="metric">Páginas<strong>${summary.pages}</strong></div><div class="metric">Movimientos<strong>${summary.movements}</strong></div></div><p>PASS: <strong>${summary.pass}</strong> · OPEN: <strong>${summary.open}</strong> · FAIL: <strong>${summary.fail}</strong> · Fallos de parseo: <strong>${summary.parserFailures}</strong></p>${profileHtml}<p class="muted">El reporte contiene solo contadores y códigos seguros. No imprime fechas, importes, descripciones, identificadores, texto PDF ni geometría.</p></div>`;
}

server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, rootRedirectUri());
    if (url.pathname === '/' && req.method === 'GET') {
      sendHtml(res, 200, 'FinanceSensor Statement Sweep', homeBody());
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
      gmailProvider = new GmailRestProvider({ credentialProvider: buildCredentialProvider(tokens) });
      await gmailProvider.getProfile();
      authorized = true;
      await discoverStatements();
      res.writeHead(302, { location: `/?s=${sessionSecret}`, 'cache-control': 'no-store' });
      res.end();
      return;
    }
    if (url.pathname === '/sweep' && req.method === 'POST') {
      if (!requireSession(url) || !authorized || !gmailProvider) {
        sendHtml(res, 403, 'Forbidden', '<p>Sesión local no autorizada.</p>');
        return;
      }
      const form = await readSmallForm(req);
      const passwords = {
        bcp: String(form.get('bcpPassword') ?? ''),
        ripley: String(form.get('ripleyPassword') ?? ''),
        interbank: String(form.get('interbankPassword') ?? '')
      };
      let summary;
      try {
        summary = await runSweep(passwords);
      } finally {
        passwords.bcp = '';
        passwords.ripley = '';
        passwords.interbank = '';
      }
      sendHtml(res, 200, 'FinanceSensor Statement Sweep', homeBody(sweepResultHtml(summary)));
      return;
    }
    sendHtml(res, 404, 'Not found', '<p>Ruta no encontrada.</p>');
  } catch (error) {
    sendHtml(res, 500, 'FinanceSensor safe stop', `<div class="brand">FinanceSensor · Trusted local edge</div><h1 class="title">STOPPED_SAFE</h1><div class="panel"><p>FinanceSensor detuvo esta operación de forma segura.</p><p>Código local: <code>${escapeHtml(safeError(error))}</code></p></div>`);
  }
});

await loadDesktopCredential();
server.listen(0, HOST, () => {
  const url = `${rootRedirectUri()}/?s=${sessionSecret}`;
  console.log('FINANCESENSOR_STATEMENT_SWEEP=READY');
  console.log('SCOPE=gmail.readonly');
  console.log('BCP_SAVINGS_SWEEP=ENABLED');
  console.log('BCP_CREDIT_SWEEP=ENABLED');
  console.log('RIPLEY_CREDIT_SWEEP=ENABLED');
  console.log(`INTERBANK_LOCAL_FILE_SWEEP=${interbankLocalPath ? 'SELECTED' : 'NOT_SELECTED'}`);
  console.log('STATEMENT_SWEEP_VAULT_WRITES=0');
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
  server?.close?.(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
