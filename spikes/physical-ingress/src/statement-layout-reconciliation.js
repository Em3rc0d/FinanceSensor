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
const BALANCE_VALUE_Y_TOLERANCE = 10;

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

function nearestBalanceValue(lines, labelLine, boundaries) {
  const candidates = [];
  for (const line of lines) {
    const distance = Math.abs(Number(line?.y) - Number(labelLine?.y));
    if (!Number.isFinite(distance) || distance > BALANCE_VALUE_Y_TOLERANCE) continue;
    const cents = balanceValue(lineToColumns(line, boundaries));
    if (cents === null) continue;
    candidates.push({ cents, distance });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  const nearestDistance = candidates[0].distance;
  const nearest = candidates.filter(candidate => candidate.distance === nearestDistance);
  return nearest.length === 1 ? nearest[0].cents : null;
}

function balanceControlLabel(line, boundaries) {
  const debit = boundaries.find(boundary => boundary.id === 'debit');
  if (!debit || !Number.isFinite(debit.minX)) return null;

  // Real BCP control labels are visually in the ledger's left/control region, but
  // their pdf.js x origin can straddle the synthetic DESCRIPCION bucket boundary.
  // Match the exact control phrase using every text item strictly left of CARGOS,
  // while amount extraction remains restricted to CARGOS/ABONOS.
  const leftText = normalizeLayoutText((line?.items ?? [])
    .filter(item => Number.isFinite(item?.x) && item.x < debit.minX)
    .map(item => String(item?.text ?? '').trim())
    .filter(Boolean)
    .join(' '));

  if (leftText === 'SALDO ANTERIOR') return 'SALDO ANTERIOR';
  if (leftText === 'SALDO') return 'SALDO';
  return null;
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

    const lines = groupPageItemsIntoLines(page);
    for (const labelLine of lines) {
      if (labelLine.y >= geometry.headerY - 1) continue;
      const label = balanceControlLabel(labelLine, geometry.boundaries);
      if (!label) continue;
      const cents = nearestBalanceValue(lines, labelLine, geometry.boundaries);
      if (cents === null) continue;
      if (label === 'SALDO ANTERIOR') opening.push(cents);
      else closing.push(cents);
    }
  }

  return {
    openingUnique: opening.length === 1,
    closingUnique: closing.length === 1,
    openingCents: opening.length === 1 ? opening[0] : null,
    closingCents: closing.length === 1 ? closing[0] : null
  };
}

function classifyDateRange(values = [], period = null) {
  if (!period) return 'PERIOD_UNAVAILABLE';
  let before = 0;
  let after = 0;
  let invalid = 0;

  for (const value of values) {
    const time = Date.parse(String(value ?? ''));
    if (!Number.isFinite(time)) invalid += 1;
    else if (time < period.start) before += 1;
    else if (time > period.end) after += 1;
  }

  const classes = Number(before > 0) + Number(after > 0) + Number(invalid > 0);
  if (classes === 0) return 'NONE';
  if (classes > 1) return 'MIXED';
  if (before > 0) return 'BEFORE_PERIOD';
  if (after > 0) return 'AFTER_PERIOD';
  return 'INVALID_DATE';
}

function dateRangeDiagnostic(rows = [], period = null) {
  const processRange = classifyDateRange(rows.map(row => row?.occurredAt), period);
  const valueRange = classifyDateRange(rows.map(row => row?.auditValueAt), period);

  // Keep the governing audit fail-closed on FECHA PROC. for now. The value-date
  // classification is diagnostic only and lets the physical corpus tell us whether
  // an out-of-period process date is nevertheless accounted inside the statement by
  // FECHA VALOR. No dates themselves are emitted by this function.
  if (processRange === 'BEFORE_PERIOD' && valueRange === 'NONE') return 'PROCESS_BEFORE_VALUE_IN_PERIOD';
  if (processRange === 'AFTER_PERIOD' && valueRange === 'NONE') return 'PROCESS_AFTER_VALUE_IN_PERIOD';
  return processRange;
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

function rowIntegrityFailureCode(checks = {}) {
  if (!checks.periodUnique) return 'STMT_AUDIT_PERIOD';
  if (!checks.datesWithinPeriod) return 'STMT_AUDIT_DATE_RANGE';
  if (!checks.directionalSemantics) return 'STMT_AUDIT_DIRECTION';
  if (!checks.positiveAmounts) return 'STMT_AUDIT_AMOUNT';
  if (!checks.summaryRowsExcluded) return 'STMT_AUDIT_SUMMARY_LEAK';
  return 'STMT_AUDIT_ROW_INTEGRITY';
}

function finalizeAudit(result) {
  if (process.env.FINANCESENSOR_LOCAL_AUDIT_DIAGNOSTICS === '1') {
    const checks = result?.checks ?? {};
    const diagnostics = result?.diagnostics ?? {};
    const bit = value => value === true ? 1 : 0;
    console.log([
      'FINANCESENSOR_STMT_AUDIT_SHAPE',
      `status=${String(result?.status ?? 'UNKNOWN')}`,
      `code=${String(result?.code ?? 'UNKNOWN')}`,
      `period=${bit(checks.periodUnique)}`,
      `date=${bit(checks.datesWithinPeriod)}`,
      `direction=${bit(checks.directionalSemantics)}`,
      `amount=${bit(checks.positiveAmounts)}`,
      `summary=${bit(checks.summaryRowsExcluded)}`,
      `opening=${bit(checks.openingBalanceUnique)}`,
      `closing=${bit(checks.closingBalanceUnique)}`,
      `range=${String(diagnostics.dateRange ?? 'UNKNOWN')}`
    ].join(';'));
  }
  return result;
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

  const diagnostics = {
    dateRange: dateRangeDiagnostic(rows, period)
  };

  const rowIntegrityPass = checks.periodUnique
    && checks.datesWithinPeriod
    && checks.directionalSemantics
    && checks.positiveAmounts
    && checks.summaryRowsExcluded;

  if (!rowIntegrityPass) {
    return finalizeAudit({
      profileId: StatementProviderProfile.BCP_SAVINGS_REQUESTED,
      status: 'FAIL',
      code: rowIntegrityFailureCode(checks),
      movementRows: rows.length,
      inflowRows: integrity.inflowRows,
      outflowRows: integrity.outflowRows,
      checks,
      diagnostics
    });
  }

  if (!anchors.openingUnique || !anchors.closingUnique) {
    return finalizeAudit({
      profileId: StatementProviderProfile.BCP_SAVINGS_REQUESTED,
      status: 'OPEN',
      code: 'STMT_AUDIT_BALANCE_ANCHOR_OPEN',
      movementRows: rows.length,
      inflowRows: integrity.inflowRows,
      outflowRows: integrity.outflowRows,
      checks,
      diagnostics
    });
  }

  const inflowCents = rows
    .filter(row => row.direction === 'IN')
    .reduce((sum, row) => sum + toCents(row.amount), 0);
  const outflowCents = rows
    .filter(row => row.direction === 'OUT')
    .reduce((sum, row) => sum + toCents(row.amount), 0);
  checks.balanceEquationExact = anchors.openingCents + inflowCents - outflowCents === anchors.closingCents;

  return finalizeAudit({
    profileId: StatementProviderProfile.BCP_SAVINGS_REQUESTED,
    status: checks.balanceEquationExact ? 'PASS' : 'FAIL',
    code: checks.balanceEquationExact ? 'STMT_AUDIT_PASS' : 'STMT_AUDIT_BALANCE_MISMATCH',
    movementRows: rows.length,
    inflowRows: integrity.inflowRows,
    outflowRows: integrity.outflowRows,
    checks,
    diagnostics
  });
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
    checks: {},
    diagnostics: { dateRange: 'PERIOD_UNAVAILABLE' }
  };
}
