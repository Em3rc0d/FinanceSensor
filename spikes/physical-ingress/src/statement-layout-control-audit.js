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

const CONTROL_VALUE_Y_TOLERANCE = 10;

function toCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function pageGeometry(page) {
  const anchors = findHeaderAnchors(page, BCP_HEADERS);
  if (!anchors) return null;
  const boundaries = columnBoundaries(BCP_HEADERS, anchors);
  if (!boundaries) return null;
  const headerY = Math.min(...Object.values(anchors).map(anchor => anchor.y));
  return { boundaries, headerY };
}

function controlLabel(line, boundaries) {
  const debit = boundaries.find(boundary => boundary.id === 'debit');
  if (!debit || !Number.isFinite(debit.minX)) return null;
  const leftText = normalizeLayoutText((line?.items ?? [])
    .filter(item => Number.isFinite(item?.x) && item.x < debit.minX)
    .map(item => String(item?.text ?? '').trim())
    .filter(Boolean)
    .join(' '));

  if (leftText === 'SALDO ANTERIOR') return 'SALDO ANTERIOR';
  if (leftText === 'TOTAL MOVIMIENTO') return 'TOTAL MOVIMIENTO';
  if (leftText === 'SALDO') return 'SALDO';
  return null;
}

function nearestColumnCents(lines, labelLine, boundaries, columnId) {
  const candidates = [];
  for (const line of lines) {
    const distance = Math.abs(Number(line?.y) - Number(labelLine?.y));
    if (!Number.isFinite(distance) || distance > CONTROL_VALUE_Y_TOLERANCE) continue;
    const columns = lineToColumns(line, boundaries);
    const amount = parseFlexibleMoney(columns[columnId]);
    const cents = amount === null ? null : toCents(amount);
    if (cents === null) continue;
    candidates.push({ cents, distance });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  const nearestDistance = candidates[0].distance;
  const nearest = candidates.filter(candidate => candidate.distance === nearestDistance);
  return nearest.length === 1 ? nearest[0].cents : null;
}

function controls(pages = []) {
  const found = [];

  for (const page of pages) {
    const role = classifyStatementPage({
      text: pagePlainText(page),
      providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED
    });
    if (role !== StatementPageRole.TRANSACTION_LEDGER) continue;

    const geometry = pageGeometry(page);
    if (!geometry) continue;
    const lines = groupPageItemsIntoLines(page);

    for (const line of lines) {
      if (line.y >= geometry.headerY - 1) continue;
      const label = controlLabel(line, geometry.boundaries);
      if (!label) continue;
      found.push({
        label,
        debitCents: nearestColumnCents(lines, line, geometry.boundaries, 'debit'),
        creditCents: nearestColumnCents(lines, line, geometry.boundaries, 'credit')
      });
    }
  }

  return found;
}

export function auditBcpStatementControls({ pages = [], rows = [] } = {}) {
  const found = controls(pages);
  const opening = found.filter(item => item.label === 'SALDO ANTERIOR');
  const closing = found.filter(item => item.label === 'SALDO');
  const totals = found.filter(item => item.label === 'TOTAL MOVIMIENTO');
  const total = totals.length === 1 ? totals[0] : null;

  const parsedDebitCents = rows
    .filter(row => row?.direction === 'OUT')
    .reduce((sum, row) => sum + (toCents(row?.amount) ?? 0), 0);
  const parsedCreditCents = rows
    .filter(row => row?.direction === 'IN')
    .reduce((sum, row) => sum + (toCents(row?.amount) ?? 0), 0);

  const totalDebitAvailable = total?.debitCents !== null && total?.debitCents !== undefined;
  const totalCreditAvailable = total?.creditCents !== null && total?.creditCents !== undefined;

  return {
    openingLabelUnique: opening.length === 1,
    closingLabelUnique: closing.length === 1,
    totalMovementLabelUnique: totals.length === 1,
    totalDebitAvailable,
    totalCreditAvailable,
    totalDebitExact: totalDebitAvailable ? total.debitCents === parsedDebitCents : null,
    totalCreditExact: totalCreditAvailable ? total.creditCents === parsedCreditCents : null
  };
}
