import test from 'node:test';
import assert from 'node:assert/strict';
import { bcpSavingsLayoutV1 } from './fixtures/statements/bcp-savings-layout-v1.js';
import { parseBcpSavingsLayout } from '../src/statement-profile-row-adapters.js';
import { auditBcpStatementControls } from '../src/statement-layout-control-audit.js';
import { reconcileBcpSavingsStatement } from '../src/statement-layout-reconciliation.js';

const clone = value => structuredClone(value);
const item = (text, x, y, width = 40, height = 10, sequence = 100) => ({ text, x, y, width, height, sequence });

function statementTotalPages() {
  const pages = clone(bcpSavingsLayoutV1.pages);

  pages[0].items = pages[0].items.filter(value => !(value.y === 575 && value.text !== 'TOTAL MOVIMIENTO'));
  pages[0].items.push(item('SALDO', 180, 550, 40, 10, 101));

  pages[1].items.push(
    item('TOTAL MOVIMIENTO', 180, 600, 95, 10, 102),
    item('90.50', 395, 600, 35, 10, 103),
    item('125.00', 500, 600, 40, 10, 104)
  );
  return pages;
}

function pageSubtotalPages() {
  const pages = clone(bcpSavingsLayoutV1.pages);
  pages[1].items.push(
    item('TOTAL MOVIMIENTO', 180, 600, 95, 10, 102),
    item('70.00', 395, 600, 35, 10, 103)
  );
  return pages;
}

function parseRows(pages) {
  const parsed = parseBcpSavingsLayout({
    pages: clone(pages),
    tenantId: 'tenant-synthetic',
    accountId: 'account-synthetic'
  });
  assert.equal(parsed.review.length, 0);
  return parsed.rows;
}

test('BCP control audit exposes only safe structure for final-page statement totals', () => {
  const pages = statementTotalPages();
  const rows = parseRows(pages);
  const audit = auditBcpStatementControls({ pages, rows });

  assert.deepEqual(audit, {
    openingLabelUnique: true,
    closingLabelUnique: true,
    totalMovementLabelUnique: true,
    totalDebitAvailable: true,
    totalCreditAvailable: true,
    totalDebitExact: true,
    totalCreditExact: true,
    totalDebitRelation: 'EXACT',
    totalCreditRelation: 'EXACT',
    totalDebitBinding: 'SAME_LINE',
    totalCreditBinding: 'SAME_LINE',
    pageDebitCoverageComplete: false,
    pageCreditCoverageComplete: false,
    pageDebitTotalsExact: null,
    pageCreditTotalsExact: null,
    closingValueAvailable: true,
    closingValueBinding: 'SAME_LINE'
  });
  assert.equal(JSON.stringify(audit).includes('125'), false);
  assert.equal(JSON.stringify(audit).includes('90.50'), false);
});

test('BCP control audit records nearby binding without widening movement parsing', () => {
  const pages = statementTotalPages();
  pages[1].items.find(value => value.text === '90.50' && value.y === 600).y -= 8;
  pages[1].items.find(value => value.text === '125.00' && value.y === 600).y += 8;
  const rows = parseRows(pages);
  const audit = auditBcpStatementControls({ pages, rows });

  assert.equal(audit.totalDebitExact, true);
  assert.equal(audit.totalCreditExact, true);
  assert.equal(audit.totalDebitBinding, 'NEARBY_LINE');
  assert.equal(audit.totalCreditBinding, 'NEARBY_LINE');
});

test('BCP control audit distinguishes parsed-greater debit mismatch without exposing magnitude', () => {
  const pages = statementTotalPages();
  const rows = parseRows(pages);
  rows.find(row => row.direction === 'OUT').amount += 0.01;
  const result = reconcileBcpSavingsStatement({ pages, rows });

  assert.equal(result.status, 'FAIL');
  assert.equal(result.code, 'STMT_AUDIT_BALANCE_MISMATCH');
  assert.equal(result.diagnostics.totalDebitExact, false);
  assert.equal(result.diagnostics.totalDebitRelation, 'PARSED_GREATER');
  assert.equal(JSON.stringify(result).includes('0.01'), false);
});

test('BCP control audit can distinguish per-page subtotal semantics from final-page statement totals', () => {
  const pages = pageSubtotalPages();
  const rows = parseRows(pages);
  const audit = auditBcpStatementControls({ pages, rows });

  assert.equal(audit.totalDebitExact, false);
  assert.equal(audit.totalDebitRelation, 'PARSED_GREATER');
  assert.equal(audit.pageDebitCoverageComplete, true);
  assert.equal(audit.pageDebitTotalsExact, true);
  assert.equal(audit.pageCreditCoverageComplete, true);
  assert.equal(audit.pageCreditTotalsExact, true);
});

test('BCP control audit distinguishes a missing final-page closing label from value binding', () => {
  const pages = statementTotalPages();
  pages[1].items = pages[1].items.filter(value => value.text !== 'SALDO');
  const rows = parseRows(pages);
  const audit = auditBcpStatementControls({ pages, rows });

  assert.equal(audit.openingLabelUnique, true);
  assert.equal(audit.closingLabelUnique, false);
  assert.equal(audit.closingValueAvailable, false);
  assert.equal(audit.closingValueBinding, 'MISSING');
});
