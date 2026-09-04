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

function nearestColumnResult(lines, labelLine, boundaries, columnId) {
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

  if (candidates.length === 0) return { cents: null, binding: 'MISSING' };
  candidates.sort((a, b) => a.distance - b.distance);
  const nearestDistance = candidates[0].distance;
  const nearest = candidates.filter(candidate => candidate.distance === nearestDistance);
  if (nearest.length !== 1) return { cents: null, binding: 'AMBIGUOUS' };
  return {
    cents: nearest[0].cents,
    binding: nearestDistance === 0 ? 'SAME_LINE' : 'NEARBY_LINE'
  };
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

function rowSum(rows, direction) {
  return rows
    .filter(row => row?.direction === direction)
    .reduce((sum, row) => sum + (toCents(row?.amount) ?? 0), 0);
}

function relation(parsedCents, printedCents) {
  if (printedCents === null || printedCents === undefined) return 'UNAVAILABLE';
  if (parsedCents === printedCents) return 'EXACT';
  return parsedCents > printedCents ? 'PARSED_GREATER' : 'PARSED_LOWER';
}

function pageTotalAudit(frame, rows = []) {
  const totalLine = uniqueControl(frame, 'TOTAL MOVIMIENTO');
  const pageRows = rows.filter(row => row?.sourcePage === frame?.page?.pageNumber);
  const parsedDebitCents = rowSum(pageRows, 'OUT');
  const parsedCreditCents = rowSum(pageRows, 'IN');
  const debit = totalLine
    ? nearestColumnResult(frame.lines, totalLine, frame.geometry.boundaries, 'debit')
    : { cents: null, binding: 'MISSING' };
  const credit = totalLine
    ? nearestColumnResult(frame.lines, totalLine, frame.geometry.boundaries, 'credit')
    : { cents: null, binding: 'MISSING' };

  return {
    hasDebitRows: pageRows.some(row => row?.direction === 'OUT'),
    hasCreditRows: pageRows.some(row => row?.direction === 'IN'),
    parsedDebitCents,
    parsedCreditCents,
    debit,
    credit
  };
}

function closingValueDiagnostic(frame) {
  const closingLine = uniqueControl(frame, 'SALDO');
  if (!closingLine) return { available: false, binding: 'MISSING' };
  const debit = nearestColumnResult(frame.lines, closingLine, frame.geometry.boundaries, 'debit');
  const credit = nearestColumnResult(frame.lines, closingLine, frame.geometry.boundaries, 'credit');
  const values = [debit, credit].filter(item => item.cents !== null);
  if (values.length === 0) {
    const ambiguous = debit.binding === 'AMBIGUOUS' || credit.binding === 'AMBIGUOUS';
    return { available: false, binding: ambiguous ? 'AMBIGUOUS' : 'MISSING' };
  }
  if (values.length !== 1) return { available: false, binding: 'AMBIGUOUS' };
  return { available: true, binding: values[0].binding };
}

export function auditBcpStatementControls({ pages = [], rows = [] } = {}) {
  const frames = ledgerFrames(pages);
  const first = frames[0] ?? null;
  const last = frames.at(-1) ?? null;

  const openingLines = matchingLines(first, 'SALDO ANTERIOR');
  const closingLines = matchingLines(last, 'SALDO');
  const totalLines = matchingLines(last, 'TOTAL MOVIMIENTO');
  const totalLine = uniqueControl(last, 'TOTAL MOVIMIENTO');

  const totalDebit = totalLine
    ? nearestColumnResult(last.lines, totalLine, last.geometry.boundaries, 'debit')
    : { cents: null, binding: 'MISSING' };
  const totalCredit = totalLine
    ? nearestColumnResult(last.lines, totalLine, last.geometry.boundaries, 'credit')
    : { cents: null, binding: 'MISSING' };

  const parsedDebitCents = rowSum(rows, 'OUT');
  const parsedCreditCents = rowSum(rows, 'IN');
  const totalDebitAvailable = totalDebit.cents !== null;
  const totalCreditAvailable = totalCredit.cents !== null;

  const pageAudits = frames.map(frame => pageTotalAudit(frame, rows));
  const pageDebitCoverageComplete = pageAudits.length > 0 && pageAudits.every(page => !page.hasDebitRows || page.debit.cents !== null);
  const pageCreditCoverageComplete = pageAudits.length > 0 && pageAudits.every(page => !page.hasCreditRows || page.credit.cents !== null);
  const pageDebitPrintedSum = pageAudits.reduce((sum, page) => sum + (page.debit.cents ?? 0), 0);
  const pageCreditPrintedSum = pageAudits.reduce((sum, page) => sum + (page.credit.cents ?? 0), 0);
  const closingValue = last ? closingValueDiagnostic(last) : { available: false, binding: 'MISSING' };

  return {
    openingLabelUnique: openingLines.length === 1,
    closingLabelUnique: closingLines.length === 1,
    totalMovementLabelUnique: totalLines.length === 1,
    totalDebitAvailable,
    totalCreditAvailable,
    totalDebitExact: totalDebitAvailable ? totalDebit.cents === parsedDebitCents : null,
    totalCreditExact: totalCreditAvailable ? totalCredit.cents === parsedCreditCents : null,
    totalDebitRelation: relation(parsedDebitCents, totalDebit.cents),
    totalCreditRelation: relation(parsedCreditCents, totalCredit.cents),
    totalDebitBinding: totalDebit.binding,
    totalCreditBinding: totalCredit.binding,
    pageDebitCoverageComplete,
    pageCreditCoverageComplete,
    pageDebitTotalsExact: pageDebitCoverageComplete ? pageDebitPrintedSum === parsedDebitCents : null,
    pageCreditTotalsExact: pageCreditCoverageComplete ? pageCreditPrintedSum === parsedCreditCents : null,
    closingValueAvailable: closingValue.available,
    closingValueBinding: closingValue.binding
  };
}
