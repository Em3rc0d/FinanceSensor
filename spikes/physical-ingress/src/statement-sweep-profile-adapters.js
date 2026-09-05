import { classifyStatementPage, StatementPageRole } from './statement-page-classifier.js';
import { StatementProviderProfile } from './statement-source-adapters.js';
import {
  columnBoundaries,
  groupPageItemsIntoLines,
  lineToColumns,
  normalizeLayoutText,
  pagePlainText,
  parseFlexibleMoney
} from './statement-layout-geometry.js';
import {
  parseBcpSavingsLayout,
  parseInterbankSavingsLayout
} from './statement-profile-row-adapters.js';

const MONTHS = Object.freeze({
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12
});

const SHORT_MONTH = '(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)';

function safeIso(year, month, day) {
  const value = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(value.getTime())) return null;
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return null;
  return value.toISOString();
}

function expandYear(token) {
  const value = Number(token);
  if (!Number.isInteger(value)) return null;
  return String(token).length === 2 ? 2000 + value : value;
}

function compact(value) {
  return normalizeLayoutText(value).replace(/\s+/g, '');
}

function parseSignedMoney(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const trailingMinus = /-\s*$/.test(raw);
  const leadingMinus = /^\s*-/.test(raw);
  const amount = parseFlexibleMoney(raw);
  if (amount === null) return null;
  return (trailingMinus || leadingMinus) ? -amount : amount;
}

function normalizedPattern(alternative) {
  if (typeof alternative === 'string') return { kind: 'string', value: normalizeLayoutText(alternative) };
  const flags = alternative.flags.replace(/g/g, '').includes('i')
    ? alternative.flags.replace(/g/g, '')
    : `${alternative.flags.replace(/g/g, '')}i`;
  return { kind: 'regex', value: new RegExp(alternative.source, flags) };
}

function matchOffset(text, alternative) {
  const pattern = normalizedPattern(alternative);
  if (pattern.kind === 'string') {
    const index = text.indexOf(pattern.value);
    return index >= 0 ? { index, length: pattern.value.length } : null;
  }
  const match = text.match(pattern.value);
  return match && Number.isInteger(match.index) ? { index: match.index, length: match[0].length } : null;
}

function estimatedItemAnchor(item, match) {
  const text = normalizeLayoutText(item?.text);
  const x = Number(item?.x);
  const width = Math.max(0, Number(item?.width) || 0);
  if (!Number.isFinite(x)) return null;
  const ratio = text.length > 0 ? match.index / text.length : 0;
  return { x: x + width * ratio, y: Number(item?.y), text: item?.text };
}

function highestAnchor(page, alternatives = []) {
  const candidates = [];
  for (const item of page?.items ?? []) {
    const text = normalizeLayoutText(item?.text);
    if (!text) continue;
    for (const alternative of alternatives) {
      const match = matchOffset(text, alternative);
      if (!match) continue;
      const anchor = estimatedItemAnchor(item, match);
      if (anchor && Number.isFinite(anchor.y)) candidates.push(anchor);
    }
  }

  // pdf.js may split a visual header such as "Fecha de proceso" into adjacent items.
  // A fragmented match is authoritative only when the matched header begins at the
  // first item in the candidate window. This prevents an earlier neighboring header
  // from stealing the x-origin of a later column.
  for (const line of groupPageItemsIntoLines(page)) {
    const items = line.items ?? [];
    for (let start = 0; start < items.length; start += 1) {
      let combined = '';
      for (let end = start; end < Math.min(items.length, start + 5); end += 1) {
        combined = [combined, String(items[end]?.text ?? '').trim()].filter(Boolean).join(' ');
        const normalized = normalizeLayoutText(combined);
        for (const alternative of alternatives) {
          const match = matchOffset(normalized, alternative);
          if (!match || match.index !== 0) continue;
          candidates.push({ x: Number(items[start]?.x), y: Number(line.y), text: combined });
        }
      }
    }
  }

  candidates.sort((a, b) => b.y - a.y || a.x - b.x);
  return candidates[0] ?? null;
}

function stackedGeometry(page, specs = []) {
  const anchors = {};
  for (const spec of specs) {
    const anchor = highestAnchor(page, spec.alternatives);
    if (!anchor || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) return null;
    anchors[spec.id] = { id: spec.id, ...anchor };
  }
  const xs = Object.values(anchors).map(anchor => anchor.x);
  if (new Set(xs.map(value => value.toFixed(3))).size !== xs.length) return null;
  const boundaries = columnBoundaries(specs.map(spec => ({ id: spec.id, header: spec.id })), anchors);
  if (!boundaries) return null;
  const headerY = Math.min(...Object.values(anchors).map(anchor => anchor.y));
  return { anchors, boundaries, headerY };
}

function candidateStatementYears(pages = []) {
  const years = new Set();
  for (const page of pages) {
    const text = pagePlainText(page);
    for (const match of text.matchAll(/\b\d{1,2}[\/-]\d{1,2}[\/-](\d{2,4})\b/g)) {
      const year = expandYear(match[1]);
      if (year) years.add(year);
    }
  }
  return [...years].sort((a, b) => a - b);
}

function parseShortMonthDate(token, years = []) {
  const value = compact(token);
  const match = value.match(new RegExp(`^(\\d{1,2})${SHORT_MONTH}$`));
  if (!match || years.length === 0) return null;
  const day = Number(match[1]);
  const month = MONTHS[match[2]];
  const candidates = years.map(year => safeIso(year, month, day)).filter(Boolean);
  if (candidates.length === 1) return candidates[0];
  return candidates[0] ?? null;
}

function leadingBcpCreditFields(line, years = []) {
  // Real BCP Visa rows are structurally led by process-date + consumption-date.
  // Header labels are visually centered inside wide columns, so midpoint boundaries
  // can absorb a left-aligned description item into the consumption-date bucket.
  // Recover only the strict observed row grammar and keep amount/currency geometric.
  const text = normalizeLayoutText(line?.text ?? '');
  const datePair = text.match(new RegExp(`^(\\d{1,2})\\s*${SHORT_MONTH}\\s+(\\d{1,2})\\s*${SHORT_MONTH}(?:\\s+|$)`));
  if (!datePair) return null;

  const processAt = parseShortMonthDate(`${datePair[1]}${datePair[2]}`, years);
  const consumptionAt = parseShortMonthDate(`${datePair[3]}${datePair[4]}`, years);
  if (!processAt || !consumptionAt) return null;

  const remainder = text.slice(datePair[0].length).trim();
  const operationMatches = [...remainder.matchAll(/\b(PAGO|CONSUMO)\b/g)];
  if (operationMatches.length === 0) return null;
  const operation = operationMatches.at(-1);
  const description = remainder.slice(0, operation.index).trim();
  if (!description) return null;

  return {
    processAt,
    consumptionAt,
    description,
    operationType: operation[1]
  };
}

function parseRipleyDate(token) {
  const value = normalizeLayoutText(token).replace(/\s+/g, '');
  const match = value.match(/^(\d{1,2})\/(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)\/(\d{4})$/);
  if (!match) return null;
  return safeIso(Number(match[3]), MONTHS[match[2]], Number(match[1]));
}

function creditSemantic(description, isPayment) {
  const text = normalizeLayoutText(description);
  if (isPayment || /\bPAGO\b/.test(text)) return 'CARD_PAYMENT';
  if (/\b(SEGURO|COMISION|INTERES|MEMBRESIA|GASTO)\b/.test(text)) return 'FEE';
  return 'PURCHASE';
}

function creditMovement({ tenantId, accountId, amount, currency, description, occurredAt, valueAt, sourcePage, sourceSequence, isPayment }) {
  const row = {
    tenantId,
    accountId,
    instrumentId: null,
    amount: Math.abs(amount),
    currency,
    direction: 'OUT',
    balanceEffect: isPayment ? 'DECREASE' : 'INCREASE',
    cashflowDirection: 'OUTFLOW',
    semanticType: creditSemantic(description, isPayment),
    occurredAt,
    rawMerchant: description || null,
    subject: 'credit statement movement',
    bodySnippet: 'credit statement movement',
    confidence: 0.90,
    evidenceClass: 'BANK_STATEMENT',
    sourcePage,
    sourceSequence
  };
  Object.defineProperty(row, 'auditValueAt', { value: valueAt, enumerable: false });
  Object.defineProperty(row, 'auditDebtDelta', { value: isPayment ? -Math.abs(amount) : Math.abs(amount), enumerable: false });
  return row;
}

const BCP_CREDIT_SPECS = Object.freeze([
  { id: 'processDate', alternatives: [/fecha\s+de\s+proceso/, /^proceso$/] },
  { id: 'consumptionDate', alternatives: [/fecha\s+de\s+consumo/, /^consumo$/] },
  { id: 'description', alternatives: [/^descripcion$/] },
  { id: 'operationType', alternatives: [/tipo\s+de\s+operacion/, /^operacion$/] },
  { id: 'pen', alternatives: [/\bsoles\b/] },
  { id: 'usd', alternatives: [/\bdolares\b/] }
]);

function parseBcpCreditLayout({ pages = [], tenantId, accountId = null } = {}) {
  const rows = [];
  const review = [];
  const years = candidateStatementYears(pages);

  for (const page of pages) {
    const role = classifyStatementPage({ text: pagePlainText(page), providerProfile: StatementProviderProfile.BCP_CREDIT });
    if (role !== StatementPageRole.TRANSACTION_LEDGER) continue;
    const geometry = stackedGeometry(page, BCP_CREDIT_SPECS);
    if (!geometry) {
      review.push({ code: 'STATEMENT_HEADER_GEOMETRY_UNKNOWN', pageNumber: page.pageNumber });
      continue;
    }

    for (const line of groupPageItemsIntoLines(page)) {
      if (line.y >= geometry.headerY - 1) continue;
      const columns = lineToColumns(line, geometry.boundaries);
      let processAt = parseShortMonthDate(columns.processDate, years);
      let consumptionAt = parseShortMonthDate(columns.consumptionDate, years);
      let fallback = null;
      if (!processAt || !consumptionAt) {
        fallback = leadingBcpCreditFields(line, years);
        processAt = processAt ?? fallback?.processAt ?? null;
        consumptionAt = consumptionAt ?? fallback?.consumptionAt ?? null;
      }
      if (!processAt || !consumptionAt) continue;

      const pen = parseSignedMoney(columns.pen);
      const usd = parseSignedMoney(columns.usd);
      const penPresent = pen !== null && pen !== 0;
      const usdPresent = usd !== null && usd !== 0;
      if (penPresent && usdPresent) {
        review.push({ code: 'STATEMENT_ROW_MULTI_CURRENCY_AMBIGUOUS', pageNumber: page.pageNumber });
        continue;
      }
      if (!penPresent && !usdPresent) continue;

      const signed = penPresent ? pen : usd;
      const description = fallback?.description || columns.description;
      const operation = normalizeLayoutText(fallback?.operationType || columns.operationType);
      const isPayment = signed < 0 || /\bPAGO\b/.test(operation) || /\bPAGO\b/.test(normalizeLayoutText(description));
      rows.push(creditMovement({
        tenantId,
        accountId,
        amount: signed,
        currency: penPresent ? 'PEN' : 'USD',
        description,
        occurredAt: processAt,
        valueAt: consumptionAt,
        sourcePage: page.pageNumber,
        sourceSequence: rows.length,
        isPayment
      }));
    }
  }

  if (rows.length === 0 && review.length === 0) review.push({ code: 'STATEMENT_LAYOUT_NO_MOVEMENTS' });
  return { rows, review };
}

const RIPLEY_SPECS = Object.freeze([
  { id: 'operationDate', alternatives: [/fecha\s+de\s+operacion/, /^operacion$/] },
  { id: 'processDate', alternatives: [/fecha\s+de\s+proceso/, /^proceso$/] },
  { id: 'ticket', alternatives: ['ticket', /n.? ticket/] },
  { id: 'description', alternatives: [/^descripcion$/] },
  { id: 'type', alternatives: [/^t\s*\/\s*a$/, /^ta$/] },
  { id: 'amount', alternatives: [/^monto$/] },
  { id: 'rate', alternatives: [/^tea/] }
]);

function parseRipleyCreditLayout({ pages = [], tenantId, accountId = null } = {}) {
  const rows = [];
  const review = [];

  for (const page of pages) {
    const role = classifyStatementPage({ text: pagePlainText(page), providerProfile: StatementProviderProfile.RIPLEY_CREDIT });
    if (role !== StatementPageRole.TRANSACTION_LEDGER) continue;
    const geometry = stackedGeometry(page, RIPLEY_SPECS);
    if (!geometry) {
      review.push({ code: 'STATEMENT_HEADER_GEOMETRY_UNKNOWN', pageNumber: page.pageNumber });
      continue;
    }

    for (const line of groupPageItemsIntoLines(page)) {
      if (line.y >= geometry.headerY - 1) continue;
      const columns = lineToColumns(line, geometry.boundaries);
      const operationAt = parseRipleyDate(columns.operationDate);
      const processAt = parseRipleyDate(columns.processDate);
      if (!operationAt || !processAt) continue;
      const signed = parseSignedMoney(columns.amount);
      if (signed === null || signed === 0) continue;
      const description = columns.description;
      const isPayment = signed < 0 || /\bPAGO\b/.test(normalizeLayoutText(description));
      rows.push(creditMovement({
        tenantId,
        accountId,
        amount: signed,
        currency: 'PEN',
        description,
        occurredAt: operationAt,
        valueAt: processAt,
        sourcePage: page.pageNumber,
        sourceSequence: rows.length,
        isPayment
      }));
    }
  }

  if (rows.length === 0 && review.length === 0) review.push({ code: 'STATEMENT_LAYOUT_NO_MOVEMENTS' });
  return { rows, review };
}

export function parseStatementSweepProfileLayout({ providerProfile, ...input } = {}) {
  if (providerProfile === StatementProviderProfile.BCP_SAVINGS_REQUESTED) return parseBcpSavingsLayout(input);
  if (providerProfile === StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED) return parseInterbankSavingsLayout(input);
  if (providerProfile === StatementProviderProfile.BCP_CREDIT) return parseBcpCreditLayout(input);
  if (providerProfile === StatementProviderProfile.RIPLEY_CREDIT) return parseRipleyCreditLayout(input);
  const error = new Error('STATEMENT_PROFILE_ADAPTER_NOT_READY');
  error.code = error.message;
  throw error;
}

export { parseBcpCreditLayout, parseRipleyCreditLayout };
