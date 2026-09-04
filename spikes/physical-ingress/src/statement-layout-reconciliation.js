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

const BCP_HEADERS = Object.freeze([
  { id: 'processDate', header: 'FECHA PROC.' },
  { id: 'valueDate', header: 'FECHA VALOR' },
  { id: 'description', header: 'DESCRIPCION' },
  { id: 'debit', header: 'CARGOS / DEBE' },
  { id: 'credit', header: 'ABONOS / HABER' }
]);

const SUMMARY_LABELS = new Set(['SALDO ANTERIOR', 'TOTAL MOVIMIENTO', 'SALDO']);

function toCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

function safeUtcDate(year, month, day) {
  const value = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(value.getTime())) return null;
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return null;
  return value;
}

function expandYear(token) {
  const year = Number(token);
  if (!Number.isInteger(year)) return null;
  return String(token).length === 2 ? 2000 + year : year;
}

function observedPeriod(pages = []) {
  const matches = [];
  for (const page of pages) {
    const text = normalizeLayoutText(pagePlainText(page));
    for (const match of text.matchAll(/DEL\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+AL\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g)) {
      const start = safeUtcDate(expandYear(match[3]), Number(match[2]), Number(match[1]));
      const end = safeUtcDate(expandYear(match[6]), Number(match[5]), Number(match[4]));
      if (!start || !end) continue;
      matches.push({ start: start.getTime(), end: end.getTime() });
    }
  }

  const unique = new Map(matches.map(value => [`${value.start}:${value.end}`, value]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}

function pageGeometry(page) {
  const anchors = findHeaderAnchors(page, BCP_HEADERS);
  if (!anchors) return null;
  const boundaries = columnBoundaries(BCP_HEADERS, anchors);
  if (!boundaries) return null;
  const headerY = Math.min(...Object.values(anchors).map(anchor => anchor.y));
  return { boundaries, headerY };
}

function balanceValue(columns = {}) {
  const values = [columns.debit, columns.credit]
    .map(parseFlexibleMoney)
    .filter(value => value !== null);
  if (values.length !== 1) return null;
  return toCents(values[0]);
}

function balanceAnchors(pages = []) {
  const opening = [];
  const closing = [];

  for (const page of pages) {
    const role = classifyStatementPage({
      text: pagePlainText(page),
      providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED
    });
    if (role !== StatementPageRole.TRANSACTION_LEDGER) continue;

    const geometry = pageGeometry(page);
    if (!geometry) continue;

    for (const line of groupPageItemsIntoLines(page)) {
      if (line.y >= geometry.headerY - 1) continue;
      const columns = lineToColumns(line, geometry.boundaries);
      const description = normalizeLayoutText(columns.description);
      const cents = balanceValue(columns);
      if (cents === null) continue;
      if (description === 'SALDO ANTERIOR') opening.push(cents);
      else if (description === 'SALDO') closing.push(cents);
    }
  }

  return {
    openingUnique: opening.length === 1,
    closingUnique: closing.length === 1,
    openingCents: opening.length === 1 ? opening[0] : null,
    closingCents: closing.length === 1 ? closing[0] : null
  };
}

function rowIntegrity(rows = [], period = null) {
  let datesWithinPeriod = Boolean(period);
  let directionalSemantics = true;
  let positiveAmounts = true;
  let summaryRowsExcluded = true;
  let inflowRows = 0;
  let outflowRows = 0;

  for (const row of rows) {
    const time = Date.parse(String(row?.occurredAt ?? ''));
    if (!period || !Number.isFinite(time) || time < period.start || time > period.end) datesWithinPeriod = false;

    const amount = Number(row?.amount);
    if (!Number.isFinite(amount) || amount <= 0) positiveAmounts = false;

    if (row?.direction === 'IN') {
      inflowRows += 1;
      if (row?.balanceEffect !== 'INCREASE' || row?.cashflowDirection !== 'INFLOW') directionalSemantics = false;
    } else if (row?.direction === 'OUT') {
      outflowRows += 1;
      if (row?.balanceEffect !== 'DECREASE' || row?.cashflowDirection !== 'OUTFLOW') directionalSemantics = false;
    } else {
      directionalSemantics = false;
    }

    if (SUMMARY_LABELS.has(normalizeLayoutText(row?.rawMerchant))) summaryRowsExcluded = false;
  }

  return {
    datesWithinPeriod,
    directionalSemantics,
    positiveAmounts,
    summaryRowsExcluded,
    inflowRows,
    outflowRows
  };
}

export function reconcileBcpSavingsStatement({ pages = [], rows = [] } = {}) {
  const period = observedPeriod(pages);
  const anchors = balanceAnchors(pages);
  const integrity = rowIntegrity(rows, period);

  const checks = {
    periodUnique: Boolean(period),
    datesWithinPeriod: integrity.datesWithinPeriod,
    directionalSemantics: integrity.directionalSemantics,
    positiveAmounts: integrity.positiveAmounts,
    summaryRowsExcluded: integrity.summaryRowsExcluded,
    openingBalanceUnique: anchors.openingUnique,
    closingBalanceUnique: anchors.closingUnique,
    balanceEquationExact: null
  };

  const rowIntegrityPass = checks.periodUnique
    && checks.datesWithinPeriod
    && checks.directionalSemantics
    && checks.positiveAmounts
    && checks.summaryRowsExcluded;

  if (!rowIntegrityPass) {
    return {
      profileId: StatementProviderProfile.BCP_SAVINGS_REQUESTED,
      status: 'FAIL',
      code: 'STMT_AUDIT_ROW_INTEGRITY',
      movementRows: rows.length,
      inflowRows: integrity.inflowRows,
      outflowRows: integrity.outflowRows,
      checks
    };
  }

  if (!anchors.openingUnique || !anchors.closingUnique) {
    return {
      profileId: StatementProviderProfile.BCP_SAVINGS_REQUESTED,
      status: 'OPEN',
      code: 'STMT_AUDIT_BALANCE_ANCHOR_OPEN',
      movementRows: rows.length,
      inflowRows: integrity.inflowRows,
      outflowRows: integrity.outflowRows,
      checks
    };
  }

  const inflowCents = rows
    .filter(row => row.direction === 'IN')
    .reduce((sum, row) => sum + toCents(row.amount), 0);
  const outflowCents = rows
    .filter(row => row.direction === 'OUT')
    .reduce((sum, row) => sum + toCents(row.amount), 0);
  checks.balanceEquationExact = anchors.openingCents + inflowCents - outflowCents === anchors.closingCents;

  return {
    profileId: StatementProviderProfile.BCP_SAVINGS_REQUESTED,
    status: checks.balanceEquationExact ? 'PASS' : 'FAIL',
    code: checks.balanceEquationExact ? 'STMT_AUDIT_PASS' : 'STMT_AUDIT_BALANCE_MISMATCH',
    movementRows: rows.length,
    inflowRows: integrity.inflowRows,
    outflowRows: integrity.outflowRows,
    checks
  };
}

export function reconcileStatementProfileLayout({ providerProfile, pages = [], rows = [] } = {}) {
  if (providerProfile === StatementProviderProfile.BCP_SAVINGS_REQUESTED) {
    return reconcileBcpSavingsStatement({ pages, rows });
  }
  return {
    profileId: providerProfile ?? 'UNKNOWN',
    status: 'OPEN',
    code: 'STMT_AUDIT_PROFILE_NOT_READY',
    movementRows: Array.isArray(rows) ? rows.length : 0,
    inflowRows: 0,
    outflowRows: 0,
    checks: {}
  };
}
