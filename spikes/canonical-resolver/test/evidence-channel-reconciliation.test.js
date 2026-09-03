import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCandidates } from '../src/resolver.js';

function candidate({ id, channel, source = 'GMAIL', reference = null }) {
  return {
    tenantId: 'tenant-synthetic',
    evidenceIds: [id],
    sourceTypes: [source],
    evidenceChannels: [channel],
    accountId: null,
    instrumentId: null,
    amount: 42.5,
    currency: 'PEN',
    flowDirection: 'OUT',
    occurredAt: '2026-09-03T12:00:00-05:00',
    rawMerchant: 'DEMO STORE',
    merchantCanonical: 'demo store',
    semanticType: 'EXPENSE',
    state: 'CANDIDATE',
    confidence: 0.95,
    references: reference ? { providerTransactionId: reference } : {},
    fingerprint: `fp-${id}`
  };
}

test('same Gmail source but independent evidence channels can trigger reconciliation review', () => {
  const bank = candidate({ id: 'bank-evidence', channel: 'BANK_NOTIFICATION' });
  const merchant = candidate({ id: 'merchant-evidence', channel: 'MERCHANT_RECEIPT' });
  const result = resolveCandidates([bank, merchant]);
  assert.equal(result.canonical.length, 1);
  assert.equal(result.review.length, 1);
  assert.equal(result.review[0].candidate.evidenceChannels[0], 'MERCHANT_RECEIPT');
});

test('same strong transaction reference can merge independent Gmail evidence channels', () => {
  const bank = candidate({ id: 'bank-evidence', channel: 'BANK_NOTIFICATION', reference: 'DEMO-REF-1' });
  const merchant = candidate({ id: 'merchant-evidence', channel: 'MERCHANT_RECEIPT', reference: 'DEMO-REF-1' });
  const result = resolveCandidates([bank, merchant]);
  assert.equal(result.canonical.length, 1);
  assert.equal(result.review.length, 0);
  assert.deepEqual(new Set(result.canonical[0].evidenceChannels), new Set(['BANK_NOTIFICATION', 'MERCHANT_RECEIPT']));
});

test('same evidence channel does not become independent merely because message IDs differ', () => {
  const first = candidate({ id: 'bank-1', channel: 'BANK_NOTIFICATION' });
  const second = candidate({ id: 'bank-2', channel: 'BANK_NOTIFICATION' });
  const result = resolveCandidates([first, second]);
  assert.equal(result.canonical.length, 2);
  assert.equal(result.review.length, 0);
});
