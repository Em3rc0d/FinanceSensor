import test from 'node:test';
import assert from 'node:assert/strict';
import { bcpSavingsLayoutV1 } from './fixtures/statements/bcp-savings-layout-v1.js';
import { parseBcpSavingsLayout } from '../src/statement-profile-row-adapters.js';
import { auditBcpStatementControls } from '../src/statement-layout-control-audit.js';
import { reconcileBcpSavingsStatement } from '../src/statement-layout-reconciliation.js';

const clone = value => structuredClone(value);

function parseRows(pages) {
  const parsed = parseBcpSavingsLayout({
    pages: clone(pages),
    tenantId: 'tenant-synthetic',
    accountId: 'account-synthetic'
  });
  assert.equal(parsed.review.length, 0);
  return parsed.rows;
}

test('BCP control audit matches parsed debit and credit sums to printed TOTAL MOVIMIENTO', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
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
  assert.equal(JSON.stringify(audit).includes('20.50'), false);
});

test('BCP control audit remains exact when TOTAL MOVIMIENTO amounts have nearby baseline drift', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  pages[0].items.find(item => item.text === '20.50' && item.y === 575).y -= 8;
  pages[0].items.find(item => item.text === '125.00' && item.y === 575).y += 8;
  const rows = parseRows(pages);
  const audit = auditBcpStatementControls({ pages, rows });

  assert.equal(audit.totalMovementLabelUnique, true);
  assert.equal(audit.totalDebitAvailable, true);
  assert.equal(audit.totalCreditAvailable, true);
  assert.equal(audit.totalDebitExact, true);
  assert.equal(audit.totalCreditExact, true);
});

test('BCP control audit detects parsed movement drift without exposing the discrepancy amount', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  const rows = parseRows(pages);
  rows[0].amount += 0.01;
  const result = reconcileBcpSavingsStatement({ pages, rows });

  assert.equal(result.status, 'FAIL');
  assert.equal(result.code, 'STMT_AUDIT_BALANCE_MISMATCH');
  assert.equal(result.diagnostics.totalDebitExact, true);
  assert.equal(result.diagnostics.totalCreditExact, false);
  assert.equal(JSON.stringify(result).includes('125.01'), false);
});

test('BCP control audit distinguishes a missing closing label from missing balance binding', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  pages[1].items = pages[1].items.filter(item => item.text !== 'SALDO');
  const rows = parseRows(pages);
  const audit = auditBcpStatementControls({ pages, rows });

  assert.equal(audit.openingLabelUnique, true);
  assert.equal(audit.closingLabelUnique, false);
  assert.equal(audit.totalMovementLabelUnique, true);
});
