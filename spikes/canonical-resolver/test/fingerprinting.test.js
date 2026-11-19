import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evidenceToCandidate,
  resolveCandidates,
  EventType
} from '../src/resolver.js';

const base = {
  tenantId: 'tenant-fp',
  currency: 'PEN',
  accountId: 'account-1',
  instrumentId: 'card-1',
  occurredAt: '2026-09-01T09:00:00-05:00',
  amount: 20,
  direction: 'OUT',
  subject: 'Compra realizada',
  rawMerchant: 'CAFE CENTRAL'
};

const ev = (id, extra = {}) => evidenceToCandidate({
  ...base,
  sourceType: 'BANK_EMAIL',
  sourceMessageId: id,
  ...extra
});

test('two same-source equal purchases minutes apart are never silently merged', () => {
  const a = ev('same-1');
  const b = ev('same-2', { occurredAt: '2026-09-01T09:02:00-05:00' });
  const result = resolveCandidates([a, b]);
  assert.equal(result.canonical.length, 2);
  assert.equal(result.review.length, 0);
});

test('cross-source similarity without hard reference routes to review', () => {
  const a = ev('cross-1');
  const b = ev('cross-2', {
    sourceType: 'MERCHANT_EMAIL',
    occurredAt: '2026-09-01T09:03:00-05:00'
  });
  const result = resolveCandidates([a, b]);
  assert.equal(result.canonical.length, 1);
  assert.equal(result.review.length, 1);
});

test('cross-source equal amount with different known merchants stays separate', () => {
  const a = ev('merchant-1', { rawMerchant: 'CAFE CENTRAL' });
  const b = ev('merchant-2', {
    sourceType: 'MERCHANT_EMAIL',
    rawMerchant: 'LIBRERIA SUR',
    occurredAt: '2026-09-01T09:03:00-05:00'
  });
  const result = resolveCandidates([a, b]);
  assert.equal(result.canonical.length, 2);
  assert.equal(result.review.length, 0);
});

test('shared order id allows cross-source automatic merge', () => {
  const a = ev('order-bank', { references: { orderId: 'ord-77' } });
  const b = ev('order-merchant', {
    sourceType: 'MERCHANT_EMAIL',
    references: { orderId: 'ord-77' },
    occurredAt: '2026-09-01T09:04:00-05:00'
  });
  const result = resolveCandidates([a, b]);
  assert.equal(result.canonical.length, 1);
  assert.equal(result.canonical[0].evidenceIds.length, 2);
});

test('shared authorization id can join same-source pending and posted evidence', () => {
  const pending = ev('pending-1', {
    rawMerchant: 'CAFE CENTRAL PENDING',
    references: { authorizationId: 'auth-991' }
  });
  const posted = ev('posted-1', {
    occurredAt: '2026-09-01T12:00:00-05:00',
    rawMerchant: 'CAFE CENTRAL',
    references: { authorizationId: 'auth-991' }
  });
  const result = resolveCandidates([pending, posted]);
  assert.equal(result.canonical.length, 1);
});

test('same immutable evidence replay converges even when candidate is recreated', () => {
  const a = ev('device-replay');
  const b = ev('device-replay');
  const result = resolveCandidates([a, b]);
  assert.equal(result.canonical.length, 1);
  assert.equal(result.review.length, 0);
});

test('same-looking events from different tenants never match', () => {
  const a = ev('tenant-a', { tenantId: 'tenant-a' });
  const b = ev('tenant-b', { tenantId: 'tenant-b', sourceType: 'MERCHANT_EMAIL' });
  const result = resolveCandidates([a, b]);
  assert.equal(result.canonical.length, 2);
});

test('same-looking events in different currencies never match', () => {
  const a = ev('pen', { currency: 'PEN' });
  const b = ev('usd', { currency: 'USD', sourceType: 'MERCHANT_EMAIL' });
  const result = resolveCandidates([a, b]);
  assert.equal(result.canonical.length, 2);
});

test('shared reference cannot override different amounts', () => {
  const a = ev('amount-a', { amount: 20, references: { orderId: 'ord-amount' } });
  const b = ev('amount-b', {
    sourceType: 'MERCHANT_EMAIL',
    amount: 21,
    references: { orderId: 'ord-amount' }
  });
  const result = resolveCandidates([a, b]);
  assert.equal(result.canonical.length, 2);
});

test('reversal and purchase remain semantically distinct even with shared reference', () => {
  const purchase = ev('purchase-reversal', { references: { authorizationId: 'auth-rev' } });
  const reversal = ev('reversal', {
    sourceType: 'BANK_EMAIL',
    subject: 'Authorization voided',
    direction: 'IN',
    references: { authorizationId: 'auth-rev' }
  });
  assert.equal(purchase.semanticType, EventType.EXPENSE);
  assert.equal(reversal.semanticType, EventType.REVERSAL);
  const result = resolveCandidates([purchase, reversal]);
  assert.equal(result.canonical.length, 2);
});

test('refund evidence misread as generic income can converge when a hard reference proves identity', () => {
  const refund = ev('refund-a', {
    sourceType: 'MERCHANT_EMAIL',
    subject: 'Refund issued',
    direction: 'IN',
    references: { orderId: 'refund-order' }
  });
  const genericIncome = ev('refund-b', {
    sourceType: 'BANK_EMAIL',
    subject: 'Payment received',
    direction: 'IN',
    references: { orderId: 'refund-order' }
  });
  assert.equal(refund.semanticType, EventType.REFUND);
  assert.equal(genericIncome.semanticType, EventType.INCOME);
  const result = resolveCandidates([refund, genericIncome]);
  assert.equal(result.canonical.length, 1);
});

test('same-source provider transaction reference allows deterministic replay convergence', () => {
  const a = ev('provider-a', { references: { providerTransactionId: 'provider-44' } });
  const b = ev('provider-b', {
    occurredAt: '2026-09-01T09:10:00-05:00',
    references: { providerTransactionId: 'provider-44' }
  });
  const result = resolveCandidates([a, b]);
  assert.equal(result.canonical.length, 1);
});

test('cross-source missing merchant is reviewable, not auto-merged', () => {
  const a = ev('missing-merchant-a', { rawMerchant: null });
  const b = ev('missing-merchant-b', {
    sourceType: 'MERCHANT_EMAIL',
    rawMerchant: null,
    occurredAt: '2026-09-01T09:05:00-05:00'
  });
  const result = resolveCandidates([a, b]);
  assert.equal(result.canonical.length, 1);
  assert.equal(result.review.length, 1);
});
