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

function safeIso(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString();
}

function bcpStatementYear(pages = []) {
  const text = normalizeLayoutText(pages.map(pagePlainText).join(' '));
  const match = text.match(/DEL\s+\d{1,2}\/\d{1,2}\/(\d{2,4})\s+AL\s+\d{1,2}\/\d{1,2}\/\d{2,4}/);
  if (!match) return null;
  const value = Number(match[1]);
  return match[1].length === 2 ? 2000 + value : value;
}

function parseBcpDate(token, year) {
  // pdf.js can split a visually contiguous DDMMM token into adjacent text items.
  // lineToColumns joins those fragments with spaces, so normalize representation-only
  // whitespace before applying the observed BCP DDMMM grammar.
  const compact = normalizeLayoutText(token).replace(/\s+/g, '');
  const match = compact.match(/^(\d{2})(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)$/);
  if (!match || !year) return null;
  return safeIso(year, MONTHS[match[2]], Number(match[1]));
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

export function parseBcpSavingsLayout({ pages = [], tenantId, accountId = null } = {}) {
  const rows = [];
  const review = [];
  const year = bcpStatementYear(pages);
  if (!year) return { rows, review: [{ code: 'STATEMENT_PERIOD_AMBIGUOUS' }] };

  for (const page of pages) {
    const role = classifyStatementPage({ text: pagePlainText(page), providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED });
    if (role !== StatementPageRole.TRANSACTION_LEDGER) continue;
    const geometry = pageColumns(page, BCP_HEADERS);
    if (!geometry) {
      review.push({ code: 'STATEMENT_HEADER_GEOMETRY_UNKNOWN', pageNumber: page.pageNumber });
      continue;
    }

    for (const line of groupPageItemsIntoLines(page)) {
      if (line.y >= geometry.headerY - 1) continue;
      const columns = lineToColumns(line, geometry.boundaries);
      const occurredAt = parseBcpDate(columns.processDate, year);
      const valueAt = parseBcpDate(columns.valueDate, year);
      if (!occurredAt || !valueAt) continue;

      const debit = parseFlexibleMoney(columns.debit);
      const credit = parseFlexibleMoney(columns.credit);
      const hasDebit = debit !== null && debit > 0;
      const hasCredit = credit !== null && credit > 0;
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
