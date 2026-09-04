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

function ledgerFrames(pages = []) {
  const frames = [];
  for (const page of pages) {
    const role = classifyStatementPage({
      text: pagePlainText(page),
      providerProfile: StatementProviderProfile.BCP_SAVINGS_REQUESTED
    });
    if (role !== StatementPageRole.TRANSACTION_LEDGER) continue;
    const geometry = pageGeometry(page);
    frames.push({
      page,
      geometry,
      lines: geometry ? groupPageItemsIntoLines(page) : []
    });
  }
  return frames;
}

function matchingLines(frame, wanted) {
  if (!frame?.geometry) return [];
  return frame.lines.filter(line => {
    if (line.y >= frame.geometry.headerY - 1) return false;
    return controlLabel(line, frame.geometry.boundaries) === wanted;
  });
}

function uniqueControl(frame, wanted) {
  const lines = matchingLines(frame, wanted);
  return lines.length === 1 ? lines[0] : null;
}

export function auditBcpStatementControls({ pages = [], rows = [] } = {}) {
  const frames = ledgerFrames(pages);
  const first = frames[0] ?? null;
  const last = frames.at(-1) ?? null;

  // Physical BCP multipage statements repeat blank control-row templates on earlier
  // ledger pages. Statement semantics are therefore positional: SALDO ANTERIOR belongs
  // to the first ledger page, while TOTAL MOVIMIENTO and final SALDO belong to the last.
  const openingLines = matchingLines(first, 'SALDO ANTERIOR');
  const closingLines = matchingLines(last, 'SALDO');
  const totalLines = matchingLines(last, 'TOTAL MOVIMIENTO');
  const totalLine = uniqueControl(last, 'TOTAL MOVIMIENTO');

  const totalDebitCents = totalLine
    ? nearestColumnCents(last.lines, totalLine, last.geometry.boundaries, 'debit')
    : null;
  const totalCreditCents = totalLine
    ? nearestColumnCents(last.lines, totalLine, last.geometry.boundaries, 'credit')
    : null;

  const parsedDebitCents = rows
    .filter(row => row?.direction === 'OUT')
    .reduce((sum, row) => sum + (toCents(row?.amount) ?? 0), 0);
  const parsedCreditCents = rows
    .filter(row => row?.direction === 'IN')
    .reduce((sum, row) => sum + (toCents(row?.amount) ?? 0), 0);

  const totalDebitAvailable = totalDebitCents !== null;
  const totalCreditAvailable = totalCreditCents !== null;

  return {
    openingLabelUnique: openingLines.length === 1,
    closingLabelUnique: closingLines.length === 1,
    totalMovementLabelUnique: totalLines.length === 1,
    totalDebitAvailable,
    totalCreditAvailable,
    totalDebitExact: totalDebitAvailable ? totalDebitCents === parsedDebitCents : null,
    totalCreditExact: totalCreditAvailable ? totalCreditCents === parsedCreditCents : null
  };
}
