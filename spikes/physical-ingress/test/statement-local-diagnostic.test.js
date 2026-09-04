import test from 'node:test';
import assert from 'node:assert/strict';
import { compactStatementReviewCode } from '../src/statement-local-diagnostic.js';

test('maps known structural review reasons to compact non-content diagnostics', () => {
  assert.equal(compactStatementReviewCode([{ code: 'STATEMENT_PERIOD_AMBIGUOUS' }]), 'STMT_PERIOD_AMBIGUOUS');
  assert.equal(compactStatementReviewCode([{ code: 'STATEMENT_HEADER_GEOMETRY_UNKNOWN', pageNumber: 4 }]), 'STMT_HEADER_GEOMETRY');
  assert.equal(compactStatementReviewCode([{ code: 'STATEMENT_ROW_BOTH_DEBIT_CREDIT', lineY: 123.45 }]), 'STMT_ROW_BOTH_SIDES');
  assert.equal(compactStatementReviewCode([{ code: 'STATEMENT_ROW_BOTH_INCOME_EXPENSE' }]), 'STMT_ROW_BOTH_SIDES');
});

test('unknown review metadata never crosses the local diagnostic boundary', () => {
  assert.equal(compactStatementReviewCode([{ code: 'UNEXPECTED_PRIVATE_TEXT', detail: 'synthetic secret' }]), 'STMT_LAYOUT_REVIEW');
});
