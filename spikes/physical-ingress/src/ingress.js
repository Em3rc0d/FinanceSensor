import {
  classifyCandidate,
  resolveCandidates,
  stableEvidenceKey,
  normalizeMerchant,
  candidateFingerprint
} from '../../canonical-resolver/src/resolver.js';
import { HistoryExpiredError } from './provider.js';

const FINANCIAL_SUBJECT = /(compra|purchase|consumo|cargo|charged|abono|deposito|salary|sueldo|transfer|transferencia|refund|reembolso|devolucion|revers|anulad|comision|fee|tarjeta|card payment)/i;
const FINANCIAL_SENDER = /(bank|banco|visa|mastercard|merchant|store|shop|payment|payments|billing|invoice|receipt)/i;

export function isLikelyFinancialMetadata(headers = {}) {
  return FINANCIAL_SUBJECT.test(headers.Subject ?? '') || FINANCIAL_SENDER.test(headers.From ?? '');
}

function parseLocalizedNumber(raw = '') {
  const token = String(raw).replace(/[\u00A0 ]/g, '').replace(/[^0-9.,]/g, '');
  if (!token || !/\d/.test(token)) return null;

  const lastDot = token.lastIndexOf('.');
  const lastComma = token.lastIndexOf(',');
  let decimalSeparator = null;

  if (lastDot >= 0 && lastComma >= 0) {
    decimalSeparator = lastDot > lastComma ? '.' : ',';
  } else {
    const separator = lastDot >= 0 ? '.' : lastComma >= 0 ? ',' : null;
    if (separator) {
      const last = token.lastIndexOf(separator);
      const trailingDigits = token.length - last - 1;
      if (trailingDigits === 1 || trailingDigits === 2) decimalSeparator = separator;
    }
  }

  let normalized;
  if (decimalSeparator) {
    const decimalIndex = token.lastIndexOf(decimalSeparator);
    const integerPart = token.slice(0, decimalIndex).replace(/[.,]/g, '');
    const fractionalPart = token.slice(decimalIndex + 1).replace(/[.,]/g, '');
    normalized = `${integerPart}.${fractionalPart}`;
  } else {
    normalized = token.replace(/[.,]/g, '');
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseAmount(body = '') {
  const match = String(body).match(/(?:PEN|S\/|USD|US\$|\$)\s*([0-9][0-9.,\u00A0 ]*)/i);
  if (!match) return null;
  return parseLocalizedNumber(match[1]);
}

function parseCurrency(body = '') {
  const text = String(body);
  if (/USD|US\$|\$/i.test(text) && !/S\//i.test(text)) return 'USD';
  return 'PEN';
}

function parseMerchant(body = '') {
  const match = String(body).match(/(?:merchant|comercio|establecimiento)\s*:\s*([^;\n]+)/i);
  return match ? match[1].trim() : null;
}

function parseProviderTransactionId(body = '') {
  const text = String(body);
  const match = text.match(/(?:c[oó]digo\s+de\s+operaci[oó]n|operation\s+code|transaction\s+id)\s*[:#-]?\s*(?:\r?\n\s*)?([A-Za-z0-9-]{4,64})/i);
  return match ? match[1].trim() : null;
}

function inferDirection(subject = '', body = '') {
  const text = `${subject} ${body}`.toLowerCase();

  if (/cuenta\s+(?:a|de)\s+cargo|transferencia\s+(?:realizada|enviada)|transfer sent/.test(text)) return 'OUT';
  if (/cuenta\s+(?:de\s+)?abono|transferencia\s+(?:recibida|entrante)|transfer received/.test(text)) return 'IN';
  if (/refund|reembolso|devolucion|abono|deposito|salary|sueldo|recibida|received/.test(text)) return 'IN';
  if (/compra|purchase|consumo|charged|payment|pago|comision|fee|\bcargo\b/.test(text)) return 'OUT';
  return null;
}

export function extractFinancialEvidence(fullMessage) {
  const amount = parseAmount(fullMessage.body);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const subject = fullMessage.headers?.Subject ?? '';
  const providerTransactionId = parseProviderTransactionId(fullMessage.body);
  const evidence = {
    tenantId: 'tenant-ingress',
    sourceType: 'GMAIL',
    sourceMessageId: fullMessage.id,
    occurredAt: fullMessage.headers?.Date,
    amount,
    currency: parseCurrency(fullMessage.body),
    rawMerchant: parseMerchant(fullMessage.body),
    subject,
    bodySnippet: String(fullMessage.body).slice(0, 160),
    direction: inferDirection(subject, fullMessage.body),
    confidence: 0.9,
    references: providerTransactionId ? { providerTransactionId } : {}
  };
  evidence.semanticType = classifyCandidate(evidence);
  return evidence;
}

function durableEvidence(evidence) {
  return {
    tenantId: evidence.tenantId,
    sourceType: evidence.sourceType,
    sourceMessageId: evidence.sourceMessageId,
    occurredAt: evidence.occurredAt,
    amount: evidence.amount,
    currency: evidence.currency,
    rawMerchant: evidence.rawMerchant,
    direction: evidence.direction,
    semanticType: evidence.semanticType,
    confidence: evidence.confidence,
    references: evidence.references
  };
}

function toCandidate(item) {
  const candidate = {
    tenantId: item.tenantId,
    evidenceIds: [stableEvidenceKey(item)],
    sourceTypes: [item.sourceType],
    accountId: null,
    instrumentId: null,
    amount: Math.abs(Number(item.amount)),
    currency: item.currency,
    flowDirection: item.direction ?? null,
    occurredAt: item.occurredAt,
    rawMerchant: item.rawMerchant ?? null,
    merchantCanonical: normalizeMerchant(item.rawMerchant ?? ''),
    semanticType: item.semanticType,
    state: 'CANDIDATE',
    confidence: item.confidence ?? 0.8,
    references: item.references ?? {}
  };
  candidate.fingerprint = candidateFingerprint(candidate);
  return candidate;
}

function defaultState() {
  return {
    historyCursor: null,
    evidence: [],
    processedSourceIds: [],
    canonical: [],
    review: [],
    metrics: {
      emailsChecked: 0,
      fullMessagesFetched: 0,
      financialCandidates: 0,
      rawBodiesRetained: 0,
      rawAttachmentsRetained: 0,
      plaintextFinancialCloudBytes: 0,
      listCalls: 0,
      metadataCalls: 0,
      fullCalls: 0,
      historyCalls: 0,
      recoveryFullSyncs: 0
    }
  };
}

export class FinancialIngressEngine {
  constructor({ provider, vault, credentials, telemetry, now = () => new Date() }) {
    this.provider = provider;
    this.vault = vault;
    this.credentials = credentials;
    this.telemetry = telemetry;
    this.now = now;
  }

  _load() { return this.vault.read() ?? defaultState(); }
  _save(state) { this.vault.write(state); }
  _requireAuth() { this.credentials.requireToken(); }

  _rebuildCanonical(state) {
    const result = resolveCandidates(state.evidence.map(toCandidate));
    state.canonical = result.canonical;
    state.review = result.review;
  }

  async _processIds(ids, state) {
    const processed = new Set(state.processedSourceIds);
    for (const { id } of ids) {
      state.metrics.emailsChecked += 1;
      if (processed.has(id)) continue;

      const metadata = await this.provider.getMessage({ id, format: 'METADATA', metadataHeaders: ['From', 'Date', 'Subject'] });
      state.metrics.metadataCalls += 1;
      if (!isLikelyFinancialMetadata(metadata.headers)) {
        processed.add(id);
        continue;
      }

      const full = await this.provider.getMessage({ id, format: 'FULL' });
      state.metrics.fullCalls += 1;
      state.metrics.fullMessagesFetched += 1;
      const extracted = extractFinancialEvidence(full);
      if (extracted) {
        state.evidence.push(durableEvidence(extracted));
        state.metrics.financialCandidates += 1;
      }
      processed.add(id);
    }

    state.processedSourceIds = [...processed];
    this._rebuildCanonical(state);
    return state;
  }

  async initialSync({ days = 90 } = {}) {
    this._requireAuth();
    const state = this._load();
    const after = new Date(this.now().getTime() - days * 86400000).toISOString();
    const ids = await this.provider.listMessages({ after });
    state.metrics.listCalls += 1;
    await this._processIds(ids, state);
    state.historyCursor = this.provider.getCurrentHistoryId
      ? String(await this.provider.getCurrentHistoryId())
      : String(this.provider.currentHistoryId ?? state.historyCursor ?? '1');
    this._save(state);
    this.telemetry.emit('ingress.initial.complete', {
      checkedCount: ids.length,
      candidateCount: state.metrics.financialCandidates,
      canonicalCount: state.canonical.length,
      durationClass: 'bounded'
    });
    return structuredClone(state);
  }

  async incrementalSync({ recoveryDays = 90 } = {}) {
    this._requireAuth();
    const state = this._load();
    if (!state.historyCursor) return this.initialSync({ days: recoveryDays });
    let history;
    try {
      history = await this.provider.listHistory({ startHistoryId: state.historyCursor });
      state.metrics.historyCalls += 1;
    } catch (error) {
      if (!(error instanceof HistoryExpiredError) && error?.code !== 404) throw error;
      state.metrics.historyCalls += 1;
      state.metrics.recoveryFullSyncs += 1;
      this._save(state);
      return this.initialSync({ days: recoveryDays });
    }
    const ids = history.history.map(item => ({ id: item.messageId }));
    await this._processIds(ids, state);
    state.historyCursor = String(history.historyId);
    this._save(state);
    this.telemetry.emit('ingress.incremental.complete', {
      changedCount: ids.length,
      candidateCount: state.metrics.financialCandidates,
      canonicalCount: state.canonical.length
    });
    return structuredClone(state);
  }

  disconnect({ deleteDerived = false } = {}) {
    this.credentials.revokeAndDelete();
    const state = this._load();
    state.historyCursor = null;
    state.processedSourceIds = [];
    if (deleteDerived) {
      state.evidence = [];
      state.canonical = [];
      state.review = [];
    }
    this._save(state);
    this.telemetry.emit('source.disconnected', { deleteDerived: Boolean(deleteDerived) });
    return structuredClone(state);
  }

  deleteTenant() {
    this.credentials.revokeAndDelete();
    this.vault.destroy();
    this.telemetry.emit('tenant.deleted', { localStateDeleted: true, credentialDeleted: true });
    return true;
  }
}
