import { StatementProviderProfile } from './statement-source-adapters.js';
import { selectTransactionLedgerPages } from './statement-page-classifier.js';

const normalize = (value = '') => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const lower = value => normalize(value).toLowerCase();

function parseMoney(raw) {
  const cleaned = String(raw ?? '').replace(/[^0-9,.-]/g, '');
  if (!cleaned) return null;
  const comma = cleaned.lastIndexOf(',');
  const dot = cleaned.lastIndexOf('.');
  let normalized = cleaned;
  if (comma > dot) normalized = cleaned.replace(/\./g, '').replace(',', '.');
  else normalized = cleaned.replace(/,/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.abs(value) : null;
}

function isoDate(raw) {
  const match = String(raw).match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/);
  if (!match) return null;
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  const month = Number(match[2]);
  const day = Number(match[1]);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(date.getTime()) || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString();
}

function savingsSemantic(description) {
  const text = lower(description);
  if (/\b(abono|deposito|deposito recibido|transferencia recibida|te transfirieron|interes abonado|remuneracion|sueldo)\b/.test(text)) {
    return { direction: 'IN', semanticType: 'INCOME', hint: 'abono' };
  }
  if (/\b(comision|cargo por comision)\b/.test(text)) {
    return { direction: 'OUT', semanticType: 'FEE', hint: 'comision' };
  }
  if (/\b(transferencia enviada|transferencia a )\b/.test(text)) {
    return { direction: 'OUT', semanticType: 'EXTERNAL_TRANSFER', hint: 'transferencia' };
  }
  if (/\b(compra|consumo|cargo|pago|debito)\b/.test(text)) {
    return { direction: 'OUT', semanticType: 'EXPENSE', hint: 'movimiento debito' };
  }
  if (/\b(retiro|cajero)\b/.test(text)) {
    return { direction: 'OUT', semanticType: 'UNKNOWN', hint: 'retiro' };
  }
  return { direction: null, semanticType: 'UNKNOWN', hint: 'movimiento cuenta' };
}

function cardSemantic(description) {
  const text = lower(description);
  if (/\b(devolucion|reembolso|refund)\b/.test(text)) return { direction: 'IN', semanticType: 'REFUND', hint: 'reembolso' };
  if (/\b(pago (de )?tarjeta|pago recibido|pago tc)\b/.test(text)) return { direction: null, semanticType: 'CARD_PAYMENT', hint: 'pago tarjeta' };
  if (/\b(comision|membresia|seguro|interes|fee)\b/.test(text)) return { direction: 'OUT', semanticType: 'FEE', hint: 'comision' };
  if (/\b(compra|consumo|pos|establecimiento)\b/.test(text)) return { direction: 'OUT', semanticType: 'EXPENSE', hint: 'compra' };
  return { direction: null, semanticType: 'UNKNOWN', hint: 'movimiento tarjeta' };
}

function candidateSegments(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map(normalize)
    .filter(Boolean)
    .flatMap(line => {
      const dateMatches = [...line.matchAll(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g)];
      if (dateMatches.length <= 1) return [line];
      const segments = [];
      for (let i = 0; i < dateMatches.length; i += 1) {
        const start = dateMatches[i].index;
        const end = dateMatches[i + 1]?.index ?? line.length;
        segments.push(line.slice(start, end).trim());
      }
      return segments.filter(Boolean);
    });
}

function parseSegment(segment) {
  const dateMatch = segment.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/);
  if (!dateMatch) return null;
  const occurredAt = isoDate(dateMatch[0]);
  if (!occurredAt) return null;

  const moneyMatches = [...segment.matchAll(/(?:S\/?\.?|PEN|US\$|USD|\$)\s*[-+]?\s*([0-9][0-9.,]*)/gi)];
  if (moneyMatches.length === 0) return null;
  const amount = parseMoney(moneyMatches.at(-1)[1]);
  if (!(amount > 0)) return null;
  const currencyToken = moneyMatches.at(-1)[0].toUpperCase();
  const currency = /US\$|USD|\$/.test(currencyToken) ? 'USD' : 'PEN';
  const description = normalize(segment
    .replace(dateMatch[0], ' ')
    .replace(moneyMatches.at(-1)[0], ' '));
  return { occurredAt, amount, currency, description };
}

function scopedText({ text, pages, classification }) {
  const raw = String(text ?? '');
  const multiPage = Array.isArray(pages) ? pages.length > 1 : raw.includes('\f');
  if (!multiPage) return raw;
  const selected = selectTransactionLedgerPages({ pages, text: raw, classification });
  if (selected.ledgers.length === 0) return '';
  return selected.ledgers.map(page => page.text).join('\n');
}

export function parseStatementRows({
  text,
  pages,
  classification,
  tenantId,
  accountId = null,
  instrumentId = null
} = {}) {
  const profile = classification?.providerProfile;
  const rows = [];
  const eligibleText = scopedText({ text, pages, classification });

  for (const segment of candidateSegments(eligibleText)) {
    const parsed = parseSegment(segment);
    if (!parsed) continue;

    let semantic = { direction: null, semanticType: 'UNKNOWN', hint: 'movimiento estado de cuenta' };
    if (profile === StatementProviderProfile.BCP_SAVINGS_REQUESTED || profile === StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED) {
      semantic = savingsSemantic(parsed.description);
    } else if (profile === StatementProviderProfile.BCP_CREDIT || profile === StatementProviderProfile.RIPLEY_CREDIT) {
      semantic = cardSemantic(parsed.description);
    }

    rows.push({
      tenantId,
      accountId,
      instrumentId,
      amount: parsed.amount,
      currency: parsed.currency,
      direction: semantic.direction,
      semanticType: semantic.semanticType,
      occurredAt: parsed.occurredAt,
      rawMerchant: parsed.description || null,
      subject: semantic.hint,
      bodySnippet: semantic.hint,
      confidence: semantic.direction || semantic.semanticType === 'CARD_PAYMENT' ? 0.9 : 0.65,
      evidenceClass: 'BANK_STATEMENT'
    });
  }

  return rows;
}
