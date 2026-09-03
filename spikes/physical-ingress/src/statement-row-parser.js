import { StatementProviderProfile } from './statement-source-adapters.js';

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

function explicitSavingsDirection(description) {
  const text = lower(description);
  if (/\b(abono|deposito|deposito recibido|transferencia recibida|te transfirieron|interes abonado|remuneracion|sueldo)\b/.test(text)) return 'IN';
  if (/\b(retiro|compra|consumo|transferencia enviada|transferencia a |cargo|comision|pago|debito)\b/.test(text)) return 'OUT';
  return null;
}

function cardSemanticHint(description) {
  const text = lower(description);
  if (/\b(devolucion|reembolso|refund)\b/.test(text)) return { direction: 'IN', hint: 'reembolso' };
  if (/\b(pago (de )?tarjeta|pago recibido|pago tc)\b/.test(text)) return { direction: null, hint: 'pago tarjeta' };
  if (/\b(comision|membresia|seguro|interes|fee)\b/.test(text)) return { direction: 'OUT', hint: 'comision' };
  if (/\b(compra|consumo|pos|establecimiento)\b/.test(text)) return { direction: 'OUT', hint: 'compra' };
  return { direction: null, hint: 'movimiento tarjeta' };
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

export function parseStatementRows({
  text,
  classification,
  tenantId,
  accountId = null,
  instrumentId = null
} = {}) {
  const profile = classification?.providerProfile;
  const rows = [];

  for (const segment of candidateSegments(text)) {
    const parsed = parseSegment(segment);
    if (!parsed) continue;

    let direction = null;
    let hint = 'movimiento estado de cuenta';
    if (profile === StatementProviderProfile.BCP_SAVINGS_REQUESTED) {
      direction = explicitSavingsDirection(parsed.description);
      hint = direction === 'IN' ? 'abono' : direction === 'OUT' ? 'movimiento debito' : 'movimiento cuenta';
    } else if (profile === StatementProviderProfile.BCP_CREDIT || profile === StatementProviderProfile.RIPLEY_CREDIT) {
      const semantic = cardSemanticHint(parsed.description);
      direction = semantic.direction;
      hint = semantic.hint;
    }

    rows.push({
      tenantId,
      accountId,
      instrumentId,
      amount: parsed.amount,
      currency: parsed.currency,
      direction,
      occurredAt: parsed.occurredAt,
      rawMerchant: parsed.description || null,
      subject: hint,
      bodySnippet: hint,
      confidence: direction ? 0.9 : 0.65,
      evidenceClass: 'BANK_STATEMENT'
    });
  }

  return rows;
}
