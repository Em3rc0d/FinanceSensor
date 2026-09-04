import test from 'node:test';
import assert from 'node:assert/strict';
import { bcpSavingsLayoutV1 } from './fixtures/statements/bcp-savings-layout-v1.js';
import { interbankSavingsLayoutV1 } from './fixtures/statements/interbank-savings-layout-v1.js';
import {
  parseBcpSavingsLayout,
  parseInterbankSavingsLayout,
  parseStatementProfileLayout
} from '../src/statement-profile-row-adapters.js';
import { StatementProviderProfile } from '../src/statement-source-adapters.js';

const clone = value => structuredClone(value);

test('BCP savings geometric adapter preserves debit/credit column semantics across pages', () => {
  const result = parseBcpSavingsLayout({
    pages: clone(bcpSavingsLayoutV1.pages),
    tenantId: 'tenant-synthetic',
    accountId: 'account-synthetic'
  });
  assert.equal(result.review.length, 0);
  assert.equal(result.rows.length, 3);
  assert.deepEqual(result.rows.map(row => [row.direction, row.amount, row.sourcePage]), [
    ['IN', 125, 1],
    ['OUT', 20.5, 1],
    ['OUT', 70, 2]
  ]);
  assert.equal(result.rows[0].occurredAt.startsWith('2026-07-01'), true);
  assert.equal(result.rows[2].occurredAt.startsWith('2026-07-03'), true);
  assert.equal(result.rows.some(row => row.amount === 50), false, 'opening balance must not become movement');
  assert.equal(result.rows.some(row => row.amount === 84.5), false, 'closing balance must not become movement');
});

test('Interbank savings adapter ignores running balance, summary totals and educational sample page', () => {
  const result = parseInterbankSavingsLayout({
    pages: clone(interbankSavingsLayoutV1.pages),
    tenantId: 'tenant-synthetic',
    accountId: 'account-synthetic'
  });
  assert.equal(result.review.length, 0);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(result.rows.map(row => [row.direction, row.amount, row.sourcePage]), [
    ['IN', 300, 1],
    ['OUT', 80, 1]
  ]);
  assert.equal(result.rows[0].semanticType, 'INCOME');
  assert.equal(result.rows.some(row => row.amount === 800 || row.amount === 720), false, 'running balances must not become movements');
  assert.equal(result.rows.some(row => row.sourcePage === 3), false, 'educational reference page must remain excluded');
});

test('BCP savings ambiguous row with both debit and credit fails to review instead of choosing a side', () => {
  const fixture = clone(bcpSavingsLayoutV1);
  fixture.pages[0].items.push({ text: '25.00', x: 500, y: 625, width: 35, height: 10, sequence: 99 });
  const result = parseBcpSavingsLayout({ pages: fixture.pages, tenantId: 'tenant-synthetic' });
  assert.equal(result.rows.length, 2);
  assert.equal(result.review.length, 1);
  assert.equal(result.review[0].code, 'STATEMENT_ROW_BOTH_DEBIT_CREDIT');
});

test('profile dispatcher exposes only adapters that reached this static stage', () => {
  const result = parseStatementProfileLayout({
    providerProfile: StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED,
    pages: clone(interbankSavingsLayoutV1.pages),
    tenantId: 'tenant-synthetic'
  });
  assert.equal(result.rows.length, 2);

  assert.throws(
    () => parseStatementProfileLayout({ providerProfile: StatementProviderProfile.BCP_CREDIT, pages: [] }),
    error => error.code === 'STATEMENT_PROFILE_ADAPTER_NOT_READY'
  );
});
