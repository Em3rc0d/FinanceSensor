import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EventType,
  evidenceToCandidate,
  resolveCandidates,
  economicContribution,
  matchScore
} from '../src/resolver.js';

const base = {
  tenantId: 'tenant-1',
  currency: 'PEN',
  accountId: 'account-visa',
  instrumentId: 'card-1234',
  occurredAt: '2026-08-31T18:42:00-05:00'
};

test('same evidence replay is idempotent', () => {
  const evidence = {
    ...base,
    sourceType: 'BANK_EMAIL',
    sourceMessageId: 'msg-1',
    subject: 'Compra realizada por S/ 49.90',
    amount: 49.90,
    direction: 'OUT',
    rawMerchant: 'UBER *TRIP'
  };

  const candidate = evidenceToCandidate(evidence);
  const result = resolveCandidates([candidate, candidate, candidate]);
  assert.equal(result.canonical.length, 1);
  assert.equal(result.review.length, 0);
});

test('bank email and merchant receipt can converge to one purchase', () => {
  const bank = evidenceToCandidate({
    ...base,
    sourceType: 'BANK_EMAIL',
    sourceMessageId: 'bank-1',
    subject: 'Compra realizada por S/ 49.90',
    amount: 49.90,
    direction: 'OUT',
    rawMerchant: 'UBER *TRIP',
    references: { orderId: 'trip-88' }
  });

  const receipt = evidenceToCandidate({
    ...base,
    sourceType: 'MERCHANT_EMAIL',
    sourceMessageId: 'uber-1',
    subject: 'Tu recibo de Uber',
    bodySnippet: 'Purchase completed',
    amount: 49.90,
    direction: 'OUT',
    rawMerchant: 'Uber',
    references: { orderId: 'trip-88' }
  });

  assert.ok(matchScore(bank, receipt) >= 0.9);
  const result = resolveCandidates([bank, receipt]);
  assert.equal(result.canonical.length, 1);
  assert.equal(result.canonical[0].evidenceIds.length, 2);
});

test('two genuine equal purchases remain separate when temporally distant', () => {
  const first = evidenceToCandidate({
    ...base,
    sourceType: 'BANK_EMAIL',
    sourceMessageId: 'purchase-1',
    subject: 'Compra realizada',
    amount: 20,
    direction: 'OUT',
    rawMerchant: 'STARBUCKS'
  });

  const second = evidenceToCandidate({
    ...base,
    sourceType: 'BANK_EMAIL',
    sourceMessageId: 'purchase-2',
    occurredAt: '2026-09-04T18:42:00-05:00',
    subject: 'Compra realizada',
    amount: 20,
    direction: 'OUT',
    rawMerchant: 'STARBUCKS'
  });

  const result = resolveCandidates([first, second]);
  assert.equal(result.canonical.length, 2);
});

test('internal transfer is neither income nor expense', () => {
  const candidate = evidenceToCandidate({
    ...base,
    sourceType: 'BANK_EMAIL',
    sourceMessageId: 'transfer-1',
    subject: 'Transferencia realizada',
    amount: 500,
    direction: 'OUT',
    ownAccountCounterparty: true
  });

  assert.equal(candidate.semanticType, EventType.INTERNAL_TRANSFER);
  assert.deepEqual(economicContribution(candidate), { income: 0, expense: 0 });
});

test('card settlement does not double count expense', () => {
  const purchase = evidenceToCandidate({
    ...base,
    sourceType: 'BANK_EMAIL',
    sourceMessageId: 'purchase-card',
    subject: 'Compra realizada',
    amount: 100,
    direction: 'OUT',
    rawMerchant: 'TOTTUS'
  });

  const settlement = evidenceToCandidate({
    ...base,
    sourceType: 'BANK_EMAIL',
    sourceMessageId: 'card-payment',
    occurredAt: '2026-09-10T10:00:00-05:00',
    subject: 'Pago de tarjeta recibido',
    amount: 100,
    direction: 'OUT'
  });

  assert.equal(purchase.semanticType, EventType.EXPENSE);
  assert.equal(settlement.semanticType, EventType.CARD_PAYMENT);
  const totals = [purchase, settlement]
    .map(economicContribution)
    .reduce((acc, x) => ({ income: acc.income + x.income, expense: acc.expense + x.expense }), { income: 0, expense: 0 });
  assert.deepEqual(totals, { income: 0, expense: 100 });
});

test('refund does not become ordinary income by default', () => {
  const refund = evidenceToCandidate({
    ...base,
    sourceType: 'MERCHANT_EMAIL',
    sourceMessageId: 'refund-1',
    subject: 'Reembolso procesado',
    amount: 149,
    direction: 'IN',
    rawMerchant: 'STORE X'
  });

  assert.equal(refund.semanticType, EventType.REFUND);
  assert.deepEqual(economicContribution(refund), { income: 0, expense: 0 });
});

test('ambiguous candidates are routed to review instead of forced merge', () => {
  const a = evidenceToCandidate({
    ...base,
    sourceType: 'BANK_EMAIL',
    sourceMessageId: 'a',
    subject: 'Compra realizada',
    amount: 35,
    direction: 'OUT',
    rawMerchant: 'CAFE CENTRAL'
  });
  const b = evidenceToCandidate({
    ...base,
    sourceType: 'MERCHANT_EMAIL',
    sourceMessageId: 'b',
    occurredAt: '2026-08-31T20:00:00-05:00',
    subject: 'Purchase receipt',
    amount: 35,
    direction: 'OUT',
    rawMerchant: 'Cafe Central'
  });

  const result = resolveCandidates([a, b], { autoMergeThreshold: 0.95, reviewThreshold: 0.8 });
  assert.equal(result.canonical.length, 1);
  assert.equal(result.review.length, 1);
});
