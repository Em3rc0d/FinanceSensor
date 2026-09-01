import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { SyntheticMailProvider } from '../src/provider.js';
import { LocalEncryptedVault, DeviceCredentialStore } from '../src/vault.js';
import { PrivacyTelemetrySink, assertNoSensitiveLiterals } from '../src/privacy.js';
import { FinancialIngressEngine } from '../src/ingress.js';

const NOW = new Date('2026-09-01T14:00:00Z');

const messages = [
  { id:'purchase-1', from:'alerts@bank.example', subject:'Compra realizada', internalDate:'2026-08-30T12:00:00Z', body:'Compra aprobada. PEN 42.50; Merchant: CAFE CENTRAL; tarjeta ****1234', attachments:[] },
  { id:'salary-1', from:'payroll@company.example', subject:'Sueldo depositado', internalDate:'2026-08-29T12:00:00Z', body:'Sueldo depositado. PEN 2800.00; Merchant: EMPLOYER ACME', attachments:[] },
  { id:'refund-1', from:'receipt@merchant.example', subject:'Reembolso procesado', internalDate:'2026-08-31T12:00:00Z', body:'Refund processed. PEN 12.50; Merchant: CAFE CENTRAL', attachments:[] },
  { id:'cardpay-1', from:'alerts@bank.example', subject:'Pago de tarjeta procesado', internalDate:'2026-08-28T12:00:00Z', body:'Pago de tarjeta procesado. PEN 100.00; Merchant: BANK CARD', attachments:[] },
  { id:'noise-1', from:'hello@newsletter.example', subject:'Tu resumen semanal', internalDate:'2026-08-31T10:00:00Z', body:'Nothing financial here. This body must never be fetched in FULL.', attachments:[] },
  { id:'attachment-1', from:'receipt@shop.example', subject:'Purchase receipt', internalDate:'2026-08-27T10:00:00Z', body:'Purchase approved. PEN 15.00; Merchant: BOOK SHOP', attachments:[{ filename:'receipt.pdf', content:'RAW-PDF-SECRET-9988' }] },
  { id:'old-1', from:'alerts@bank.example', subject:'Compra antigua', internalDate:'2026-04-01T10:00:00Z', body:'Compra. PEN 999.00; Merchant: OLD STORE', attachments:[] }
];

function rig({ source = messages, key = crypto.randomBytes(32), snapshot = null } = {}) {
  const provider = new SyntheticMailProvider(source);
  const vault = new LocalEncryptedVault(Buffer.from(key));
  if (snapshot) vault.importSnapshot(snapshot);
  const credentials = new DeviceCredentialStore();
  const telemetry = new PrivacyTelemetrySink();
  const engine = new FinancialIngressEngine({ provider, vault, credentials, telemetry, now: () => new Date(NOW) });
  return { provider, vault, credentials, telemetry, engine, key };
}

const authorize = credentials => credentials.save('synthetic-access-token-DO-NOT-LOG-123');

test('AUTH_CONTRACT: sync refuses to run without an authorized device credential', async () => {
  const { engine } = rig();
  await assert.rejects(engine.initialSync(), /authorization unavailable/);
});

test('BOUNDED_INITIAL_SYNC: 90-day scan excludes older mail before metadata retrieval', async () => {
  const { provider, credentials, engine } = rig(); authorize(credentials); await engine.initialSync({ days:90 });
  assert.equal(provider.calls.some(c => c.id === 'old-1'), false);
  assert.equal(provider.calls.filter(c => c.op === 'messages.list').length, 1);
});

test('METADATA_FIRST: every considered message is inspected as metadata before FULL', async () => {
  const { provider, credentials, engine } = rig(); authorize(credentials); await engine.initialSync();
  const full = provider.calls.filter(c => c.op === 'messages.get' && c.format === 'FULL');
  for (const call of full) {
    const metadataIndex = provider.calls.findIndex(c => c.op === 'messages.get' && c.format === 'METADATA' && c.id === call.id);
    const fullIndex = provider.calls.findIndex(c => c === call);
    assert.ok(metadataIndex >= 0 && metadataIndex < fullIndex);
  }
});

test('FULL_ONLY_FOR_CANDIDATES: non-financial newsletter never receives FULL retrieval', async () => {
  const { provider, credentials, engine } = rig(); authorize(credentials); await engine.initialSync();
  assert.equal(provider.calls.some(c => c.id === 'noise-1' && c.format === 'FULL'), false);
  assert.equal(provider.calls.some(c => c.id === 'noise-1' && c.format === 'METADATA'), true);
});

test('CANONICAL_RESOLVER_REUSED: extracted meanings survive raw-content disposal', async () => {
  const { credentials, engine } = rig(); authorize(credentials); const state = await engine.initialSync();
  const types = new Set(state.canonical.map(e => e.semanticType));
  for (const type of ['EXPENSE','INCOME','REFUND','CARD_PAYMENT']) assert.ok(types.has(type));
});

test('RAW_CONTENT_NOT_DURABLE: durable evidence contains no subject/body/attachments', async () => {
  const { credentials, engine } = rig(); authorize(credentials); const state = await engine.initialSync();
  for (const evidence of state.evidence) for (const key of ['subject','bodySnippet','body','attachments']) assert.equal(key in evidence, false);
  assert.equal(state.metrics.rawBodiesRetained, 0); assert.equal(state.metrics.rawAttachmentsRetained, 0);
});

test('ENCRYPTED_LOCAL_STATE: raw financial literals are absent from serialized at-rest blob', async () => {
  const { vault, credentials, engine } = rig(); authorize(credentials); await engine.initialSync();
  assert.deepEqual(assertNoSensitiveLiterals(vault.serializedAtRest(), ['CAFE CENTRAL','2800.00','RAW-PDF-SECRET-9988','tarjeta ****1234']), []);
});

test('ATTACHMENT_MINIMIZATION: attachment bytes are never copied into durable state', async () => {
  const { vault, credentials, engine } = rig(); authorize(credentials); const state = await engine.initialSync();
  assert.equal(JSON.stringify(state).includes('RAW-PDF-SECRET-9988'), false); assert.equal(vault.serializedAtRest().includes('RAW-PDF-SECRET-9988'), false);
});

test('PLAINTEXT_FINANCIAL_CLOUD: telemetry carries counts only, never financial payload', async () => {
  const { credentials, telemetry, engine } = rig(); authorize(credentials); const state = await engine.initialSync();
  assert.equal(state.metrics.plaintextFinancialCloudBytes, 0);
  assert.deepEqual(assertNoSensitiveLiterals(telemetry.serialized(), ['CAFE CENTRAL','42.50','EMPLOYER ACME','synthetic-access-token']), []);
});

test('TELEMETRY_ALLOWLIST: content-bearing payloads are rejected by the sink', () => {
  const sink = new PrivacyTelemetrySink();
  assert.throws(() => sink.emit('bad', { amount:42.5 }), /privacy boundary violation/);
  assert.throws(() => sink.emit('bad', { nested:{ subject:'Compra' } }), /privacy boundary violation/);
});

test('INCREMENTAL_SYNC: history cursor fetches only newly changed message ids', async () => {
  const { provider, credentials, engine } = rig(); authorize(credentials); const before = await engine.initialSync(); const n = before.evidence.length;
  provider.resetCalls(); provider.addMessage({ id:'new-1', from:'alerts@bank.example', subject:'Compra realizada', internalDate:'2026-09-01T13:30:00Z', body:'Compra PEN 7.00; Merchant: KIOSKO' });
  const after = await engine.incrementalSync();
  assert.equal(after.evidence.length, n + 1); assert.equal(provider.calls.some(c => c.op === 'history.list'), true); assert.equal(provider.calls.some(c => c.op === 'messages.list'), false);
});

test('REPROCESSING_IDEMPOTENT: repeating incremental sync does not increase evidence/canonical counts', async () => {
  const { provider, credentials, engine } = rig(); authorize(credentials); await engine.initialSync();
  provider.addMessage({ id:'new-idempotent', from:'alerts@bank.example', subject:'Compra realizada', internalDate:'2026-09-01T13:40:00Z', body:'Compra PEN 8.00; Merchant: KIOSKO' });
  const once = await engine.incrementalSync(); const twice = await engine.incrementalSync();
  assert.equal(twice.evidence.length, once.evidence.length); assert.equal(twice.canonical.length, once.canonical.length);
});

test('RESTART_RECOVERY: encrypted snapshot restores cursor, evidence and semantic meaning', async () => {
  const first = rig(); authorize(first.credentials); const initial = await first.engine.initialSync(); const snapshot = first.vault.exportSnapshot();
  const second = rig({ key:first.key, snapshot }); authorize(second.credentials); const restored = second.vault.read();
  assert.equal(restored.historyCursor, initial.historyCursor); assert.equal(restored.evidence.length, initial.evidence.length); assert.ok(restored.evidence.some(e => e.semanticType === 'REFUND'));
});

test('HISTORY_404_RECOVERY_MODEL: expired history cursor falls back to bounded full sync without duplicates', async () => {
  const { provider, credentials, engine } = rig(); authorize(credentials); const initial = await engine.initialSync();
  provider.addMessage({ id:'after-expiry', from:'alerts@bank.example', subject:'Compra realizada', internalDate:'2026-09-01T13:50:00Z', body:'Compra PEN 11.00; Merchant: MARKET' });
  provider.expireHistoryBefore(999); const recovered = await engine.incrementalSync({ recoveryDays:90 });
  assert.equal(recovered.metrics.recoveryFullSyncs, 1); assert.equal(recovered.evidence.length, initial.evidence.length + 1); assert.equal(new Set(recovered.evidence.map(e => e.sourceMessageId)).size, recovered.evidence.length);
});

test('DISCONNECT_CREDENTIAL_DELETE: disconnect removes credential and cursor', async () => {
  const { credentials, engine } = rig(); authorize(credentials); await engine.initialSync(); const after = engine.disconnect();
  assert.equal(credentials.hasCredential(), false); assert.equal(after.historyCursor, null); await assert.rejects(engine.incrementalSync(), /authorization unavailable/);
});

test('DISCONNECT_CAN_RETAIN_DERIVED: source disconnect can retain user-owned derived history', async () => {
  const { credentials, engine } = rig(); authorize(credentials); const before = await engine.initialSync(); const after = engine.disconnect({ deleteDerived:false });
  assert.equal(after.evidence.length, before.evidence.length); assert.equal(after.canonical.length, before.canonical.length);
});

test('DISCONNECT_DELETE_DERIVED: explicit source reset can erase Gmail-derived local state', async () => {
  const { credentials, engine } = rig(); authorize(credentials); await engine.initialSync(); const after = engine.disconnect({ deleteDerived:true });
  assert.equal(after.evidence.length, 0); assert.equal(after.canonical.length, 0); assert.equal(after.review.length, 0);
});

test('TENANT_DELETE: credential and encrypted local state are destroyed', async () => {
  const { vault, credentials, engine } = rig(); authorize(credentials); await engine.initialSync(); engine.deleteTenant();
  assert.equal(credentials.hasCredential(), false); assert.equal(vault.exportSnapshot(), null); assert.equal(vault.serializedAtRest(), '{}');
});

test('REQUEST_ACCOUNTING: metrics match provider operations at the privacy boundary', async () => {
  const { provider, credentials, engine } = rig(); authorize(credentials); const state = await engine.initialSync();
  assert.equal(state.metrics.listCalls, provider.calls.filter(c => c.op === 'messages.list').length);
  assert.equal(state.metrics.metadataCalls, provider.calls.filter(c => c.format === 'METADATA').length);
  assert.equal(state.metrics.fullCalls, provider.calls.filter(c => c.format === 'FULL').length);
  assert.equal(state.metrics.fullMessagesFetched, state.metrics.fullCalls);
});

test('30-DAY_BOUND: a tighter scan window excludes otherwise valid financial messages', async () => {
  const source = [...messages, { id:'forty-days', from:'alerts@bank.example', subject:'Compra realizada', internalDate:'2026-07-20T12:00:00Z', body:'Compra PEN 20.00; Merchant: MID STORE' }];
  const { provider, credentials, engine } = rig({ source }); authorize(credentials); await engine.initialSync({ days:30 }); assert.equal(provider.calls.some(c => c.id === 'forty-days'), false);
});

test('TOKEN_IN_LOGS: credential literal never appears in provider calls, telemetry or vault blob', async () => {
  const { provider, vault, credentials, telemetry, engine } = rig(); authorize(credentials); await engine.initialSync();
  const combined = JSON.stringify(provider.calls) + telemetry.serialized() + vault.serializedAtRest(); assert.equal(combined.includes('synthetic-access-token-DO-NOT-LOG-123'), false);
});
