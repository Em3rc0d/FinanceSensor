import { classifyStatementPage, StatementPageRole } from './statement-page-classifier.js';
import { StatementProviderProfile } from './statement-source-adapters.js';
import {
  columnBoundaries,
  findHeaderAnchors,
  groupPageItemsIntoLines,
  lineToColumns,
  normalizeLayoutText,
  pagePlainText,
  parseFlexibleMoney
} from './statement-layout-geometry.js';

const BCP_HEADERS = [
  { id: 'processDate', header: 'FECHA PROC.' },
  { id: 'valueDate', header: 'FECHA VALOR' },
  { id: 'description', header: 'DESCRIPCION' },
  { id: 'debit', header: 'CARGOS / DEBE' },
  { id: 'credit', header: 'ABONOS / HABER' }
];

const INTERBANK_HEADERS = [
  { id: 'date', header: 'Fecha' },
  { id: 'concept', header: 'Concepto' },
  { id: 'income', header: 'Ingresos' },
  { id: 'expense', header: 'Gastos' },
  { id: 'runningBalance', header: 'Saldo Contable' }
];

const MONTHS = Object.freeze({
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12
});

const BCP_DATE_TOKEN_PATTERN = '(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)';

function safeIso(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString();
}

function expandBcpYear(token) {
  const value = Number(token);
  if (!Number.isInteger(value)) return null;
  return String(token).length === 2 ? 2000 + value : value;
}

function bcpStatementPeriod(pages = []) {
  const text = normalizeLayoutText(pages.map(pagePlainText).join(' '));
  const matches = [...text.matchAll(/DEL\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+AL\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g)];
  const periods = [];

  for (const match of matches) {
    const startYear = expandBcpYear(match[3]);
    const endYear = expandBcpYear(match[6]);
    if (!startYear || !endYear) continue;
    const startIso = safeIso(startYear, Number(match[2]), Number(match[1]));
    const endIso = safeIso(endYear, Number(match[5]), Number(match[4]));
    if (!startIso || !endIso) continue;
    const start = Date.parse(startIso);
    const end = Date.parse(endIso);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) continue;
    periods.push({ start, end, startYear, endYear });
  }

  const unique = new Map(periods.map(period => [`${period.start}:${period.end}`, period]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}

function distanceToPeriod(time, period) {
  if (time < period.start) return period.start - time;
  if (time > period.end) return time - period.end;
  return 0;
}

function parseBcpDate(token, period) {
  // pdf.js can split a visually contiguous DDMMM token into adjacent text items.
  // lineToColumns joins those fragments with spaces, so normalize representation-only
  // whitespace before applying the observed BCP DDMMM grammar.
  const compact = normalizeLayoutText(token).replace(/\s+/g, '');
  const match = compact.match(new RegExp(`^(\\d{2})${BCP_DATE_TOKEN_PATTERN}$`));
  if (!match || !period) return null;

  const day = Number(match[1]);
  const month = MONTHS[match[2]];
  const years = [...new Set([period.startYear, period.endYear])];
  const candidates = years
    .map(year => safeIso(year, month, day))
    .filter(Boolean)
    .map(iso => ({ iso, time: Date.parse(iso) }))
    .filter(candidate => Number.isFinite(candidate.time));
  if (candidates.length === 0) return null;

  const within = candidates.filter(candidate => candidate.time >= period.start && candidate.time <= period.end);
  if (within.length === 1) return within[0].iso;
  if (within.length > 1) return null;
  if (candidates.length === 1) return candidates[0].iso;

  // Preserve an out-of-range candidate for fail-closed audit diagnostics rather than
  // silently dropping the movement. Across a year boundary, choose only when one
  // candidate is uniquely nearer to the declared statement period.
  const ranked = candidates
    .map(candidate => ({ ...candidate, distance: distanceToPeriod(candidate.time, period) }))
    .sort((a, b) => a.distance - b.distance);
  if (ranked[0].distance === ranked[1].distance) return null;
  return ranked[0].iso;
}

function leadingBcpDatePair(line, boundaries, period) {
  const description = boundaries.find(boundary => boundary.id === 'description');
  if (!description || !Number.isFinite(description.minX)) return null;

  // Physical BCP savings evidence shows the first two table columns are exclusively
  // FECHA PROC. and FECHA VALOR. pdf.js may place both visual dates inside one text
  // item or assign the second item's x to the neighboring geometric bucket. Recover
  // only an exact two-token DDMMM pair from the area strictly before DESCRIPCION.
  const leadingText = (line?.items ?? [])
    .filter(item => Number.isFinite(item?.x) && item.x < description.minX)
    .map(item => String(item?.text ?? '').trim())
    .filter(Boolean)
    .join(' ');
  const compact = normalizeLayoutText(leadingText).replace(/\s+/g, '');
  const matches = [...compact.matchAll(new RegExp(`(\\d{2})${BCP_DATE_TOKEN_PATTERN}`, 'g'))];
  if (matches.length !== 2) return null;

  const dates = matches.map(match => parseBcpDate(`${match[1]}${match[2]}`, period));
  if (dates.some(value => !value)) return null;
  return { occurredAt: dates[0], valueAt: dates[1] };
}

function parseInterbankDate(token) {
  const match = String(token ?? '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return safeIso(Number(match[3]), Number(match[2]), Number(match[1]));
}

function savingsSemantic(description, direction) {
  const text = normalizeLayoutText(description);
  if (direction === 'IN' && /\b(PLANILLA|SUELDO|REMUNERACION)\b/.test(text)) return 'INCOME';
  if (direction === 'OUT' && /\b(COMISION|MANTENIMIENTO|MANT\.)\b/.test(text)) return 'FEE';
  if (direction === 'OUT' && /\b(RETIRO|CAJERO)\b/.test(text)) return 'UNKNOWN';
  return 'UNKNOWN';
}

function movement({ tenantId, accountId, amount, direction, occurredAt, description, sourcePage, sourceSequence }) {
  return {
    tenantId,
    accountId,
    instrumentId: null,
    amount,
    currency: 'PEN',
    direction,
    balanceEffect: direction === 'IN' ? 'INCREASE' : 'DECREASE',
    cashflowDirection: direction === 'IN' ? 'INFLOW' : 'OUTFLOW',
    semanticType: savingsSemantic(description, direction),
    occurredAt,
    rawMerchant: description || null,
    subject: direction === 'IN' ? 'statement inflow' : 'statement outflow',
    bodySnippet: direction === 'IN' ? 'statement inflow' : 'statement outflow',
    confidence: 0.92,
    evidenceClass: 'BANK_STATEMENT',
    sourcePage,
    sourceSequence
  };
}

function pageColumns(page, headers) {
  const anchors = findHeaderAnchors(page, headers);
  if (!anchors) return null;
  const boundaries = columnBoundaries(headers, anchors);
  if (!boundaries) return null;
  const headerY = Math.min(...Object.values(anchors).map(anchor => anchor.y));
  return { boundaries, headerY };
}

function zeroRowDiagnostic({
  ledgerPages,
  processDateLines,
  valueDateLines,
  pairedDateLines,
  amountColumnLines,
  pairedDateAmountLines
}) {
  if (ledgerPages === 0) return 'STATEMENT_LEDGER_PAGE_NOT_FOUND';
  if (processDateLines === 0) return 'STATEMENT_ROW_PROCESS_DATE_NOT_FOUND';
  if (valueDateLines === 0) return 'STATEMENT_ROW_VALUE_DATE_NOT_FOUND';
  if (pairedDateLines === 0) return 'STATEMENT_ROW_DATE_PAIR_VERTICAL_FRAGMENTATION';
  if (pairedDateAmountLines === 0 && amountColumnLines > 0) return 'STATEMENT_ROW_VERTICAL_FRAGMENTATION';
  if (pairedDateAmountLines === 0) return 'STATEMENT_ROW_AMOUNT_NOT_FOUND';
  return 'STATEMENT_LAYOUT_NO_MOVEMENTS';
}

export function parseBcpSavingsLayout({ pages = [], tenantId, accountId = null } = {}) {
  const rows = [];
  const review = [];
  const period = bcpStatementPeriod(pages);
  if (!period) return { rows, review: [{ code: 'STATEMENT_PERIOD_AMBIGUOUS' }] };

  let ledgerPages = 0;
  let processDateLines = 0;
  let valueDateLines = 0;
  let pairedDateLines = 0;
  let amountColumnLines = 0;
  let pairedDateAmountLines = 0;

  for (const page of pages) {
    const role = classifyStatementPage({ text: pagePlainText(page), providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED });
    if (role !== StatementPageRole.TRANSACTION_LEDGER) continue;
    ledgerPages += 1;

    const geometry = pageColumns(page, BCP_HEADERS);
    if (!geometry) {
      review.push({ code: 'STATEMENT_HEADER_GEOMETRY_UNKNOWN', pageNumber: page.pageNumber });
      continue;
    }

    for (const line of groupPageItemsIntoLines(page)) {
      if (line.y >= geometry.headerY - 1) continue;
      const columns = lineToColumns(line, geometry.boundaries);

      const debit = parseFlexibleMoney(columns.debit);
      const credit = parseFlexibleMoney(columns.credit);
      const hasDebit = debit !== null && debit > 0;
      const hasCredit = credit !== null && credit > 0;
      if (hasDebit || hasCredit) amountColumnLines += 1;

      let occurredAt = parseBcpDate(columns.processDate, period);
      let valueAt = parseBcpDate(columns.valueDate, period);
      if (!occurredAt || !valueAt) {
        const pair = leadingBcpDatePair(line, geometry.boundaries, period);
        occurredAt = occurredAt ?? pair?.occurredAt ?? null;
        valueAt = valueAt ?? pair?.valueAt ?? null;
      }
      if (occurredAt) processDateLines += 1;
      if (valueAt) valueDateLines += 1;
      if (!occurredAt || !valueAt) continue;
      pairedDateLines += 1;
      if (hasDebit || hasCredit) pairedDateAmountLines += 1;

      if (hasDebit && hasCredit) {
        review.push({ code: 'STATEMENT_ROW_BOTH_DEBIT_CREDIT', pageNumber: page.pageNumber, lineY: line.y });
        continue;
      }
      if (!hasDebit && !hasCredit) continue;
      const direction = hasCredit ? 'IN' : 'OUT';
      rows.push(movement({
        tenantId,
        accountId,
        amount: hasCredit ? credit : debit,
        direction,
        occurredAt,
        description: columns.description,
        sourcePage: page.pageNumber,
        sourceSequence: rows.length
      }));
    }
  }

  if (rows.length === 0 && review.length === 0) {
    review.push({
      code: zeroRowDiagnostic({
        ledgerPages,
        processDateLines,
        valueDateLines,
        pairedDateLines,
        amountColumnLines,
        pairedDateAmountLines
      })
    });
  }

  return { rows, review };
}

export function parseInterbankSavingsLayout({ pages = [], tenantId, accountId = null } = {}) {
  const rows = [];
  const review = [];

  for (const page of pages) {
    const role = classifyStatementPage({ text: pagePlainText(page), providerProfile: StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED });
    if (role !== StatementPageRole.TRANSACTION_LEDGER) continue;
    const geometry = pageColumns(page, INTERBANK_HEADERS);
    if (!geometry) {
      review.push({ code: 'STATEMENT_HEADER_GEOMETRY_UNKNOWN', pageNumber: page.pageNumber });
      continue;
    }

    for (const line of groupPageItemsIntoLines(page)) {
      if (line.y >= geometry.headerY - 1) continue;
      const columns = lineToColumns(line, geometry.boundaries);
      const occurredAt = parseInterbankDate(columns.date);
      if (!occurredAt) continue;

      const income = parseFlexibleMoney(columns.income);
      const expense = parseFlexibleMoney(columns.expense);
      const hasIncome = income !== null && income > 0;
      const hasExpense = expense !== null && expense > 0;
      if (hasIncome && hasExpense) {
        review.push({ code: 'STATEMENT_ROW_BOTH_INCOME_EXPENSE', pageNumber: page.pageNumber, lineY: line.y });
        continue;
      }
      if (!hasIncome && !hasExpense) continue;
      const direction = hasIncome ? 'IN' : 'OUT';
      rows.push(movement({
        tenantId,
        accountId,
        amount: hasIncome ? income : expense,
        direction,
        occurredAt,
        description: columns.concept,
        sourcePage: page.pageNumber,
        sourceSequence: rows.length
      }));
    }
  }

  return { rows, review };
}

export function parseStatementProfileLayout({ providerProfile, ...input } = {}) {
  if (providerProfile === StatementProviderProfile.BCP_SAVINGS_REQUESTED) return parseBcpSavingsLayout(input);
  if (providerProfile === StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED) return parseInterbankSavingsLayout(input);
  const error = new Error('STATEMENT_PROFILE_ADAPTER_NOT_READY');
  error.code = error.message;
  throw error;
}
