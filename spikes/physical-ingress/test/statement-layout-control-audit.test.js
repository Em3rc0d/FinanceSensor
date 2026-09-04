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

  // Physical BCP multipage statements repeat blank TOTAL MOVIMIENTO / SALDO rows on
  // earlier pages and populate the statement-level controls only on the final ledger page.
  pages[0].items = pages[0].items.filter(value => !(value.y === 575 && value.text !== 'TOTAL MOVIMIENTO'));
  pages[0].items.push(item('SALDO', 180, 550, 40, 10, 101));

  pages[1].items.push(
    item('TOTAL MOVIMIENTO', 180, 600, 95, 10, 102),
    item('90.50', 395, 600, 35, 10, 103),
    item('125.00', 500, 600, 40, 10, 104)
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

test('BCP control audit uses first/final ledger page semantics instead of document-global label uniqueness', () => {
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
    totalCreditExact: true
  });
  assert.equal(JSON.stringify(audit).includes('125'), false);
  assert.equal(JSON.stringify(audit).includes('90.50'), false);
});

test('BCP control audit remains exact when final TOTAL MOVIMIENTO amounts have nearby baseline drift', () => {
  const pages = statementTotalPages();
  pages[1].items.find(value => value.text === '90.50' && value.y === 600).y -= 8;
  pages[1].items.find(value => value.text === '125.00' && value.y === 600).y += 8;
  const rows = parseRows(pages);
  const audit = auditBcpStatementControls({ pages, rows });

  assert.equal(audit.totalMovementLabelUnique, true);
  assert.equal(audit.totalDebitAvailable, true);
  assert.equal(audit.totalCreditAvailable, true);
  assert.equal(audit.totalDebitExact, true);
  assert.equal(audit.totalCreditExact, true);
});

test('BCP control audit detects parsed movement drift without exposing the discrepancy amount', () => {
  const pages = statementTotalPages();
  const rows = parseRows(pages);
  rows[0].amount += 0.01;
  const result = reconcileBcpSavingsStatement({ pages, rows });

  assert.equal(result.status, 'FAIL');
  assert.equal(result.code, 'STMT_AUDIT_BALANCE_MISMATCH');
  assert.equal(result.diagnostics.totalDebitExact, true);
  assert.equal(result.diagnostics.totalCreditExact, false);
  assert.equal(JSON.stringify(result).includes('125.01'), false);
});

test('BCP control audit distinguishes a missing final-page closing label from repeated blank earlier controls', () => {
  const pages = statementTotalPages();
  pages[1].items = pages[1].items.filter(value => value.text !== 'SALDO');
  const rows = parseRows(pages);
  const audit = auditBcpStatementControls({ pages, rows });

  assert.equal(audit.openingLabelUnique, true);
  assert.equal(audit.closingLabelUnique, false);
  assert.equal(audit.totalMovementLabelUnique, true);
});
