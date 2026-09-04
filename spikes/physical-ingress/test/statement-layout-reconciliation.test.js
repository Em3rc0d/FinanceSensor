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

test('BCP savings balance audit tolerates small summary-label/value baseline offsets without widening movement parsing', () => {
  const pages = clone(bcpSavingsLayoutV1.pages);
  const openingAmount = pages[0].items.find(item => item.text === '50.00' && item.y === 675);
  const closingAmount = pages[1].items.find(item => item.text === '84.50' && item.y === 575);
  openingAmount.y -= 4;
  closingAmount.y += 4;

  const rows = parsed({ pages });
  const result = reconcileBcpSavingsStatement({ pages, rows });

  assert.equal(result.status, 'PASS');
  assert.equal(result.code, 'STMT_AUDIT_PASS');
  assert.equal(result.checks.openingBalanceUnique, true);
  assert.equal(result.checks.closingBalanceUnique, true);
  assert.equal(result.checks.balanceEquationExact, true);
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
