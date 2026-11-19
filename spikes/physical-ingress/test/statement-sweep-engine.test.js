import test from 'node:test';
import assert from 'node:assert/strict';
import { StatementProviderProfile } from '../src/statement-source-adapters.js';
import { auditSweepProfile, summarizeSweep } from '../src/statement-sweep-engine.js';

const syntheticRow = (overrides = {}) => ({
  amount: 10,
  currency: 'PEN',
  direction: 'OUT',
  occurredAt: '2026-08-03T12:00:00.000Z',
  semanticType: 'PURCHASE',
  ...overrides
});

test('credit structural audit passes only valid positive movement rows', () => {
  const audit = auditSweepProfile({
    providerProfile: StatementProviderProfile.BCP_CREDIT,
    pages: [],
    parsed: { rows: [syntheticRow(), syntheticRow({ semanticType: 'CARD_PAYMENT' })], review: [] }
  });
  assert.equal(audit.status, 'PASS');
  assert.equal(audit.code, 'STATEMENT_PROFILE_PARSE_PASS');
  assert.equal(audit.movements, 2);
  assert.equal(audit.payments, 1);
});

test('sweep summary keeps one profile failure isolated from passes in other profiles', () => {
  const summary = summarizeSweep([
    { profile: StatementProviderProfile.BCP_CREDIT, status: 'PASS', code: 'STATEMENT_PROFILE_PARSE_PASS', movements: 5, pages: 2, parserFailure: false },
    { profile: StatementProviderProfile.RIPLEY_CREDIT, status: 'FAIL', code: 'PDF_PASSWORD_REJECTED', movements: 0, pages: 0, parserFailure: true },
    { profile: StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED, status: 'PASS', code: 'STATEMENT_PROFILE_PARSE_PASS', movements: 3, pages: 1, parserFailure: false }
  ]);
  assert.equal(summary.selected, 3);
  assert.equal(summary.audited, 2);
  assert.equal(summary.pass, 2);
  assert.equal(summary.fail, 1);
  assert.equal(summary.parserFailures, 1);
  assert.equal(summary.movements, 8);
  assert.equal(summary.profiles.find(group => group.profile === StatementProviderProfile.RIPLEY_CREDIT).codes.PDF_PASSWORD_REJECTED, 1);
});
