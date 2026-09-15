import test from 'node:test';
import assert from 'node:assert/strict';
import { bcpSavingsLayoutV1 } from './fixtures/statements/bcp-savings-layout-v1.js';
import { parseBcpSavingsLayout } from '../src/statement-profile-row-adapters.js';
import { reconcileBcpSavingsStatement } from '../src/statement-layout-reconciliation.js';

const clone = value => structuredClone(value);

function parsed(fixture = bcpSavingsLayoutV1) {
  const result = parseBcpSavingsLayout({
    pages: clone(fixture.pages),
    tenantId: 'tenant-synthetic',
    accountId: 'account-synthetic'
  });
  assert.equal(result.review.length, 0);
  return result.rows;
}

test('BCP savings balance audit proves the synthetic ledger equation without exposing amounts', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  const rows = parsed({ pages });
  const result = reconcileBcpSavingsStatement({ pages, rows });

  assert.equal(result.status, 'PASS');
  assert.equal(result.code, 'STMT_AUDIT_PASS');
  assert.equal(result.movementRows, 3);
  assert.equal(result.inflowRows, 1);
  assert.equal(result.outflowRows, 2);
  assert.deepEqual(result.checks, {
    periodUnique: true,
    datesWithinPeriod: true,
    directionalSemantics: true,
    positiveAmounts: true,
    summaryRowsExcluded: true,
    openingBalanceUnique: true,
    closingBalanceUnique: true,
    balanceEquationExact: true
  });
  assert.equal(JSON.stringify(result).includes('125'), false);
  assert.equal(JSON.stringify(result).includes('84.5'), false);
});

test('BCP savings parser resolves DDMMM years from a statement period that crosses New Year', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  for (const page of pages) {
    const period = page.items.find(item => String(item.text).startsWith('DEL '));
    period.text = 'DEL 15/12/25 AL 15/01/26';
  }

  for (const item of pages[0].items) {
    if (item.y === 650 && (item.x === 40 || item.x === 105)) item.text = '31DIC';
    if (item.y === 625 && (item.x === 40 || item.x === 105)) item.text = '02ENE';
  }
  for (const item of pages[1].items) {
    if (item.y === 650 && (item.x === 40 || item.x === 105)) item.text = '03ENE';
  }

  const rows = parsed({ pages });
  assert.equal(rows[0].occurredAt.startsWith('2025-12-31'), true);
  assert.equal(rows[1].occurredAt.startsWith('2026-01-02'), true);
  assert.equal(rows[2].occurredAt.startsWith('2026-01-03'), true);

  const result = reconcileBcpSavingsStatement({ pages, rows });
  assert.equal(result.code, 'STMT_AUDIT_PASS');
  assert.equal(result.checks.datesWithinPeriod, true);
});

test('BCP savings balance audit binds control labels to nearby values without widening movement parsing', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  const openingAmount = pages[0].items.find(item => item.text === '50.00' && item.y === 675);
  const closingAmount = pages[1].items.find(item => item.text === '84.50' && item.y === 575);
  openingAmount.y -= 8;
  closingAmount.y += 8;

  const rows = parsed({ pages });
  const result = reconcileBcpSavingsStatement({ pages, rows });

  assert.equal(result.status, 'PASS');
  assert.equal(result.code, 'STMT_AUDIT_PASS');
  assert.equal(result.checks.openingBalanceUnique, true);
  assert.equal(result.checks.closingBalanceUnique, true);
  assert.equal(result.checks.balanceEquationExact, true);
});

test('BCP savings balance audit recognizes exact control labels even when pdf.js x origin falls left of DESCRIPCION bucket', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  pages[0].items.find(item => item.text === 'SALDO ANTERIOR').x = 130;
  pages[1].items.find(item => item.text === 'SALDO').x = 130;

  const rows = parsed({ pages });
  const result = reconcileBcpSavingsStatement({ pages, rows });

  assert.equal(result.status, 'PASS');
  assert.equal(result.checks.openingBalanceUnique, true);
  assert.equal(result.checks.closingBalanceUnique, true);
  assert.equal(result.checks.balanceEquationExact, true);
});

test('BCP savings value date remains transient and non-enumerable', () => {
  const rows = parsed();
  assert.equal(typeof rows[0].auditValueAt, 'string');
  assert.equal(Object.keys(rows[0]).includes('auditValueAt'), false);
  assert.equal(JSON.stringify(rows[0]).includes('auditValueAt'), false);
});

test('BCP savings audit distinguishes process-date-before-period when value date remains inside period', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  const rows = parsed({ pages });
  rows[0].occurredAt = '2026-06-30T12:00:00.000Z';

  const result = reconcileBcpSavingsStatement({ pages, rows });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.code, 'STMT_AUDIT_DATE_RANGE');
  assert.equal(result.checks.datesWithinPeriod, false);
  assert.equal(result.diagnostics.dateRange, 'PROCESS_BEFORE_VALUE_IN_PERIOD');
  assert.equal(JSON.stringify(result).includes('2026-06-30'), false);
  assert.equal(JSON.stringify(result).includes('2026-07-01'), false);
});

test('BCP savings balance audit fails closed when parsed movement value breaks the ledger equation', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  const rows = parsed({ pages });
  rows[0].amount += 0.01;

  const result = reconcileBcpSavingsStatement({ pages, rows });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.code, 'STMT_AUDIT_BALANCE_MISMATCH');
  assert.equal(result.checks.balanceEquationExact, false);
});

test('BCP savings balance audit remains OPEN when the closing balance anchor is unavailable', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  pages[1].items = pages[1].items.filter(item => !(item.y === 575 && (item.text === 'SALDO' || item.text === '84.50')));
  const rows = parsed({ pages });

  const result = reconcileBcpSavingsStatement({ pages, rows });
  assert.equal(result.status, 'OPEN');
  assert.equal(result.code, 'STMT_AUDIT_BALANCE_ANCHOR_OPEN');
  assert.equal(result.checks.openingBalanceUnique, true);
  assert.equal(result.checks.closingBalanceUnique, false);
  assert.equal(result.checks.balanceEquationExact, null);
});

test('BCP savings balance audit exposes only a compact direction diagnostic on semantic drift', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  const rows = parsed({ pages });
  rows[0].cashflowDirection = 'OUTFLOW';

  const result = reconcileBcpSavingsStatement({ pages, rows });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.code, 'STMT_AUDIT_DIRECTION');
  assert.equal(result.checks.directionalSemantics, false);
});

test('BCP savings balance audit exposes only a compact date-range diagnostic', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  const rows = parsed({ pages });
  rows[0].occurredAt = '2026-08-01T12:00:00.000Z';

  const result = reconcileBcpSavingsStatement({ pages, rows });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.code, 'STMT_AUDIT_DATE_RANGE');
  assert.equal(result.checks.datesWithinPeriod, false);
  assert.equal(result.diagnostics.dateRange, 'PROCESS_AFTER_VALUE_IN_PERIOD');
});

test('BCP savings balance audit rejects summary rows with a compact leak diagnostic', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  const rows = parsed({ pages });
  rows.push({
    ...rows[0],
    rawMerchant: 'SALDO',
    sourceSequence: 99
  });

  const result = reconcileBcpSavingsStatement({ pages, rows });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.code, 'STMT_AUDIT_SUMMARY_LEAK');
  assert.equal(result.checks.summaryRowsExcluded, false);
});
