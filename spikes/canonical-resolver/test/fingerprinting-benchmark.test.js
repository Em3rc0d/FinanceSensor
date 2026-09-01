import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceToCandidate, resolveCandidates } from '../src/resolver.js';

const THRESHOLDS = Object.freeze({
  unsafeFalseMerges: 0,
  autoMergePrecision: 1,
  hardLinkFalseSplits: 0,
  replayDuplicateCount: 0,
  decisionAccuracy: 0.95
});

const base = Object.freeze({
  tenantId: 'tenant-benchmark',
  currency: 'PEN',
  accountId: 'account-a',
  instrumentId: 'card-a',
  occurredAt: '2026-09-01T09:00:00-05:00',
  amount: 20,
  direction: 'OUT',
  subject: 'Compra realizada',
  rawMerchant: 'CAFE CENTRAL'
});

function evidence(id, extra = {}) {
  const value = {
    ...base,
    sourceType: 'BANK_EMAIL',
    sourceMessageId: id,
    ...extra
  };
  if (extra.sourceMessageId === null) delete value.sourceMessageId;
  return value;
}

function decision(result) {
  if (result.canonical.length === 1 && result.review.length === 0) return 'MERGE';
  if (result.canonical.length === 1 && result.review.length === 1) return 'REVIEW';
  if (result.canonical.length === 2 && result.review.length === 0) return 'SEPARATE';
  return 'OTHER';
}

const scenarios = [
  {
    id: 'B-001', expected: 'MERGE', tags: ['replay'],
    evidence: [evidence('same-message'), evidence('same-message')]
  },
  {
    id: 'B-002', expected: 'MERGE', tags: ['hard-link'],
    evidence: [
      evidence('order-bank', { references: { orderId: 'ord-1' } }),
      evidence('order-merchant', { sourceType: 'MERCHANT_EMAIL', references: { orderId: 'ord-1' } })
    ]
  },
  {
    id: 'B-003', expected: 'MERGE', tags: ['hard-link'],
    evidence: [
      evidence('pending', { rawMerchant: 'CAFE CENTRAL PENDING', references: { authorizationId: 'auth-1' } }),
      evidence('posted', { occurredAt: '2026-09-01T12:00:00-05:00', references: { authorizationId: 'auth-1' } })
    ]
  },
  {
    id: 'B-004', expected: 'MERGE', tags: ['hard-link'],
    evidence: [
      evidence('receipt-bank', { references: { receiptId: 'receipt-1' } }),
      evidence('receipt-merchant', { sourceType: 'MERCHANT_EMAIL', occurredAt: '2026-09-01T11:00:00-05:00', references: { receiptId: 'receipt-1' } })
    ]
  },
  {
    id: 'B-005', expected: 'MERGE', tags: ['hard-link'],
    evidence: [
      evidence('provider-a', { references: { providerTransactionId: 'tx-44' } }),
      evidence('provider-b', { occurredAt: '2026-09-01T09:10:00-05:00', references: { providerTransactionId: 'tx-44' } })
    ]
  },
  {
    id: 'B-006', expected: 'REVIEW', tags: ['weak-similarity'],
    evidence: [evidence('weak-a'), evidence('weak-b', { sourceType: 'MERCHANT_EMAIL', occurredAt: '2026-09-01T09:03:00-05:00' })]
  },
  {
    id: 'B-007', expected: 'REVIEW', tags: ['weak-similarity'],
    evidence: [
      evidence('missing-a', { rawMerchant: null }),
      evidence('missing-b', { sourceType: 'MERCHANT_EMAIL', rawMerchant: null, occurredAt: '2026-09-01T09:04:00-05:00' })
    ]
  },
  {
    id: 'B-008', expected: 'SEPARATE', tags: ['false-merge-trap'],
    evidence: [evidence('same-source-a'), evidence('same-source-b', { occurredAt: '2026-09-01T09:02:00-05:00' })]
  },
  {
    id: 'B-009', expected: 'SEPARATE', tags: ['false-merge-trap'],
    evidence: [
      evidence('merchant-a'),
      evidence('merchant-b', { sourceType: 'MERCHANT_EMAIL', rawMerchant: 'LIBRERIA SUR', occurredAt: '2026-09-01T09:03:00-05:00' })
    ]
  },
  {
    id: 'B-010', expected: 'SEPARATE', tags: ['hard-contradiction'],
    evidence: [evidence('tenant-a'), evidence('tenant-b', { tenantId: 'tenant-other', sourceType: 'MERCHANT_EMAIL' })]
  },
  {
    id: 'B-011', expected: 'SEPARATE', tags: ['hard-contradiction'],
    evidence: [evidence('pen'), evidence('usd', { currency: 'USD', sourceType: 'MERCHANT_EMAIL' })]
  },
  {
    id: 'B-012', expected: 'SEPARATE', tags: ['hard-contradiction', 'hard-link'],
    evidence: [
      evidence('amount-a', { amount: 20, references: { orderId: 'ord-amount' } }),
      evidence('amount-b', { amount: 21, sourceType: 'MERCHANT_EMAIL', references: { orderId: 'ord-amount' } })
    ]
  },
  {
    id: 'B-013', expected: 'SEPARATE', tags: ['hard-contradiction', 'hard-link'],
    evidence: [
      evidence('direction-out', { subject: 'Transferencia realizada', direction: 'OUT', references: { orderId: 'ord-direction' } }),
      evidence('direction-in', { subject: 'Transferencia recibida', direction: 'IN', sourceType: 'MERCHANT_EMAIL', references: { orderId: 'ord-direction' } })
    ]
  },
  {
    id: 'B-014', expected: 'SEPARATE', tags: ['hard-contradiction'],
    evidence: [evidence('account-a'), evidence('account-b', { accountId: 'account-b', sourceType: 'MERCHANT_EMAIL' })]
  },
  {
    id: 'B-015', expected: 'SEPARATE', tags: ['hard-contradiction'],
    evidence: [evidence('instrument-a'), evidence('instrument-b', { instrumentId: 'card-b', sourceType: 'MERCHANT_EMAIL' })]
  },
  {
    id: 'B-016', expected: 'SEPARATE', tags: ['semantic-contradiction', 'hard-link'],
    evidence: [
      evidence('purchase-reversal', { references: { authorizationId: 'auth-reversal' } }),
      evidence('reversal', { subject: 'Authorization voided', direction: 'IN', references: { authorizationId: 'auth-reversal' } })
    ]
  },
  {
    id: 'B-017', expected: 'SEPARATE', tags: ['weak-similarity'],
    evidence: [
      evidence('far-a'),
      evidence('far-b', { sourceType: 'MERCHANT_EMAIL', occurredAt: '2026-09-05T09:00:00-05:00' })
    ]
  },
  {
    id: 'B-018', expected: 'MERGE', tags: ['hard-link'],
    evidence: [
      evidence('far-order-a', { references: { orderId: 'ord-far' } }),
      evidence('far-order-b', { sourceType: 'MERCHANT_EMAIL', occurredAt: '2026-09-05T09:00:00-05:00', references: { orderId: 'ord-far' } })
    ]
  },
  {
    id: 'B-019', expected: 'MERGE', tags: ['hard-link'],
    evidence: [
      evidence('descriptor-a', { rawMerchant: 'CAFE CENTRAL', references: { orderId: 'ord-descriptor' } }),
      evidence('descriptor-b', { sourceType: 'MERCHANT_EMAIL', rawMerchant: 'CENTRAL COFFEE SAC', references: { orderId: 'ord-descriptor' } })
    ]
  },
  {
    id: 'B-020', expected: 'MERGE', tags: ['replay'],
    evidence: [
      evidence('unused', { sourceMessageId: null, sender: 'bank@example', subject: 'Compra realizada', occurredAt: '2026-09-01T09:00:00-05:00' }),
      evidence('unused', { sourceMessageId: null, sender: 'bank@example', subject: 'Compra realizada', occurredAt: '2026-09-01T09:00:00-05:00' })
    ]
  },
  {
    id: 'B-021', expected: 'SEPARATE', tags: ['hard-contradiction'],
    evidence: [
      evidence('fallback-out', { sourceMessageId: null, sender: 'bank@example', subject: 'Movimiento', direction: 'OUT' }),
      evidence('fallback-in', { sourceMessageId: null, sender: 'bank@example', subject: 'Movimiento', direction: 'IN' })
    ]
  },
  {
    id: 'B-022', expected: 'REVIEW', tags: ['weak-similarity'],
    evidence: [
      evidence('pending-weak', { rawMerchant: 'CAFE CENTRAL PENDING' }),
      evidence('posted-weak', { sourceType: 'MERCHANT_EMAIL', rawMerchant: 'CAFE CENTRAL', occurredAt: '2026-09-01T09:07:00-05:00' })
    ]
  },
  {
    id: 'B-023', expected: 'REVIEW', tags: ['partial-locator'],
    evidence: [
      evidence('known-account'),
      evidence('unknown-account', { sourceType: 'MERCHANT_EMAIL', accountId: null, instrumentId: null, occurredAt: '2026-09-01T09:05:00-05:00' })
    ]
  },
  {
    id: 'B-024', expected: 'MERGE', tags: ['hard-link', 'partial-locator'],
    evidence: [
      evidence('known-order', { references: { orderId: 'ord-partial-locator' } }),
      evidence('unknown-order', { sourceType: 'MERCHANT_EMAIL', accountId: null, instrumentId: null, references: { orderId: 'ord-partial-locator' } })
    ]
  },
  {
    id: 'B-025', expected: 'SEPARATE', tags: ['hard-contradiction', 'hard-link'],
    evidence: [
      evidence('known-account-order-a', { references: { providerTransactionId: 'provider-account' } }),
      evidence('known-account-order-b', { accountId: 'account-b', sourceType: 'MERCHANT_EMAIL', references: { providerTransactionId: 'provider-account' } })
    ]
  },
  {
    id: 'B-026', expected: 'MERGE', tags: ['hard-link', 'semantic-compatible'],
    evidence: [
      evidence('refund-explicit', { subject: 'Refund issued', direction: 'IN', sourceType: 'MERCHANT_EMAIL', references: { orderId: 'refund-order' } }),
      evidence('refund-generic', { subject: 'Payment received', direction: 'IN', references: { orderId: 'refund-order' } })
    ]
  },
  {
    id: 'B-027', expected: 'SEPARATE', tags: ['hard-contradiction', 'hard-link'],
    evidence: [
      evidence('currency-hard-a', { references: { invoiceId: 'invoice-currency' } }),
      evidence('currency-hard-b', { currency: 'USD', sourceType: 'MERCHANT_EMAIL', references: { invoiceId: 'invoice-currency' } })
    ]
  },
  {
    id: 'B-028', expected: 'SEPARATE', tags: ['hard-contradiction', 'hard-link'],
    evidence: [
      evidence('tenant-hard-a', { references: { receiptId: 'receipt-tenant' } }),
      evidence('tenant-hard-b', { tenantId: 'tenant-other', sourceType: 'MERCHANT_EMAIL', references: { receiptId: 'receipt-tenant' } })
    ]
  }
];

test('Q-002 adversarial benchmark satisfies the thresholds frozen before execution', () => {
  assert.ok(scenarios.length >= 20, 'benchmark must remain meaningfully adversarial');

  const observations = scenarios.map(scenario => {
    const candidates = scenario.evidence.map(evidenceToCandidate);
    const result = resolveCandidates(candidates);
    return {
      ...scenario,
      result,
      actual: decision(result)
    };
  });

  const actualMerges = observations.filter(item => item.actual === 'MERGE');
  const correctMerges = actualMerges.filter(item => item.expected === 'MERGE');
  const unsafeFalseMerges = actualMerges.filter(item => item.expected !== 'MERGE');
  const hardLinkFalseSplits = observations.filter(item =>
    item.tags.includes('hard-link') && item.expected === 'MERGE' && item.actual !== 'MERGE'
  );
  const replayDuplicateCount = observations
    .filter(item => item.tags.includes('replay'))
    .reduce((sum, item) => sum + Math.max(0, item.result.canonical.length - 1), 0);
  const correctDecisions = observations.filter(item => item.actual === item.expected).length;

  const metrics = {
    unsafeFalseMerges: unsafeFalseMerges.length,
    autoMergePrecision: actualMerges.length === 0 ? 1 : correctMerges.length / actualMerges.length,
    hardLinkFalseSplits: hardLinkFalseSplits.length,
    replayDuplicateCount,
    decisionAccuracy: correctDecisions / observations.length
  };

  const mismatches = observations
    .filter(item => item.actual !== item.expected)
    .map(item => `${item.id}: expected=${item.expected} actual=${item.actual}`);

  assert.equal(metrics.unsafeFalseMerges, THRESHOLDS.unsafeFalseMerges, `unsafe false merges: ${mismatches.join('; ')}`);
  assert.equal(metrics.autoMergePrecision, THRESHOLDS.autoMergePrecision, `auto-merge precision: ${mismatches.join('; ')}`);
  assert.equal(metrics.hardLinkFalseSplits, THRESHOLDS.hardLinkFalseSplits, `hard-link false splits: ${mismatches.join('; ')}`);
  assert.equal(metrics.replayDuplicateCount, THRESHOLDS.replayDuplicateCount, `replay duplicates: ${mismatches.join('; ')}`);
  assert.ok(metrics.decisionAccuracy >= THRESHOLDS.decisionAccuracy, `decision accuracy=${metrics.decisionAccuracy}; ${mismatches.join('; ')}`);

  console.log(`Q002_BENCHMARK_METRICS=${JSON.stringify(metrics)}`);
});
