/**
 * PF-EXP-001 synthetic regression candidates for the EXISTING FinanceSensor
 * canonical resolver. This file belongs in experiments/PF-EXP-001/tests/ inside
 * the checked-out repo. No private data. Tests are NOT RUN until that code is
 * available in an executable environment; NOT an G1/G2 attestation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EventType, EffectState, EconomicEffect,
  resolveCandidates, projectEconomicEffect, matchScore
} from '../../../spikes/canonical-resolver/src/resolver.js';

const at = '2026-02-12T10:15:00.000Z';
const observation = (id, {
  sourceType = 'STATEMENT', evidenceChannel = 'BANK_STATEMENT',
  transactionId = null, amount = 100, currency = 'PEN',
  merchant = 'Synthetic Store', accountId = 'TEST_A',
  semanticType = EventType.EXPENSE, direction = 'OUT', occurredAt = at
} = {}) => ({
  tenantId: 'SYNTHETIC_TENANT',
  evidenceIds: [`synthetic:${id}`],
  sourceTypes: [sourceType],
  evidenceChannels: [evidenceChannel],
  accountId, instrumentId: null,
  amount, currency, flowDirection: direction, occurredAt,
  rawMerchant: merchant, merchantCanonical: merchant,
  semanticType, state: 'CANDIDATE', confidence: 0.75,
  references: transactionId ? { providerTransactionId: transactionId } : {}
});
const effect = (semanticType, amount, flowDirection = 'OUT') =>
  projectEconomicEffect({ semanticType, amount, flowDirection });
const totals = (events) => events.reduce((sum, e) => {
  const p = projectEconomicEffect(e);
  return { income: sum.income + p.income, expense: sum.expense + p.expense };
}, { income: 0, expense: 0 });
const withoutRuntimeIds = (xs) => xs.map(x => [x.amount, x.currency, x.semanticType, x.flowDirection, [...x.evidenceIds].sort()]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

test('T-01: two independent observations of same reference do not double count', () => {
  const a = observation('mail-A', { sourceType: 'GMAIL', evidenceChannel: 'EMAIL', transactionId: 'T01-SYN' });
  const b = observation('statement-A', { transactionId: 'T01-SYN' });
  const res = resolveCandidates([a, b]);
  assert.equal(res.canonical.length, 1);
  assert.equal(res.canonical[0].evidenceIds.length, 2);
  assert.equal(totals(res.canonical).expense, 100);
});

test('T-02: equal amount, time and merchant cannot merge distinct purchases', () => {
  const a = observation('purchase-A', { transactionId: 'T02-A' });
  const b = observation('purchase-B', { transactionId: 'T02-B' });
  const res = resolveCandidates([a,b]);
  assert.equal(res.canonical.length, 2);
  assert.equal(totals(res.canonical).expense, 200);
});

test('T-03: own transfer is neutral; related fee is separately an expense', () => {
  const transfer = effect(EventType.INTERNAL_TRANSFER, 300);
  const fee = effect(EventType.FEE, 2);
  assert.equal(transfer.expense, 0);
  assert.equal(transfer.state, EffectState.NEUTRAL);
  assert.equal(fee.expense, 2);
});

test('T-04: credit purchase and settlement produce one consumer expense', () => {
  const purchase = effect(EventType.EXPENSE, 120);
  const settlement = effect(EventType.CARD_PAYMENT, 120);
  assert.equal(purchase.expense + settlement.expense, 120);
  assert.equal(settlement.state, EffectState.NEUTRAL);
});

test('T-05: unclassified cash withdrawal is not fabricated spending', () => {
  const unknown = effect(EventType.UNKNOWN, 200);
  assert.equal(unknown.expense, 0);
  assert.equal(unknown.state, EffectState.REQUIRES_REVIEW);
});

test('T-08: linked refund offsets expense; does not create salary', () => {
  const refund = projectEconomicEffect(
    { semanticType: EventType.REFUND, amount: 30, flowDirection: 'IN' },
    { linkedContribution: { income: 0, expense: 100 } }
  );
  assert.deepEqual(refund, { income: 0, expense: -30, state: EffectState.OFFSET });
});

test('T-15: one-hundred replayed same evidence IDs remain one event', () => {
  const copies = Array.from({length:100}, () => observation('replay-identity', {transactionId:'T15'}));
  const res = resolveCandidates(copies);
  assert.equal(res.canonical.length, 1);
  assert.equal(totals(res.canonical).expense, 100);
});

test('T-16: order of Gmail and statement yields same economic projection', () => {
  const a = observation('mail-X', { sourceType:'GMAIL', evidenceChannel:'EMAIL', transactionId:'T16' });
  const b = observation('statement-X', { transactionId:'T16' });
  const normal = resolveCandidates([a,b]);
  const reverse = resolveCandidates([b,a]);
  assert.equal(normal.canonical.length, 1);
  assert.equal(reverse.canonical.length, 1);
  assert.equal(totals(normal.canonical).expense, totals(reverse.canonical).expense);
  assert.deepEqual(withoutRuntimeIds(normal.canonical), withoutRuntimeIds(reverse.canonical));
});

test('T-19: mismatched amount or currency cannot be auto-merged', () => {
  const a = observation('amount-A', { transactionId:'T19', amount:100 });
  const b = observation('amount-B', { sourceType:'GMAIL', transactionId:'T19', amount:90 });
  assert.equal(matchScore(a,b), 0);
  assert.equal(resolveCandidates([a,b]).canonical.length, 2);
});

test('T-21: cross-currency observations cannot merge (conversion remains out of scope)', () => {
  const a = observation('pen-A', {transactionId:'T21',currency:'PEN'});
  const b = observation('usd-B', {sourceType:'GMAIL',transactionId:'T21',currency:'USD'});
  assert.equal(matchScore(a,b), 0);
});

test('T-22: classifying an unknown after human decision does not mutate original source amount', () => {
  const src = Object.freeze(observation('correction', {semanticType:EventType.UNKNOWN}));
  const projected = projectEconomicEffect({ ...src, economicEffect:EconomicEffect.EXPENSE },
    { resolvedEconomicEffect:EconomicEffect.EXPENSE });
  assert.equal(projected.expense, 100);
  assert.equal(src.semanticType, EventType.UNKNOWN);
  assert.equal(src.amount, 100);
});

test('T-23: independent notices with shared strong reference represent one purchase', () => {
  const a = observation('first-notice', { sourceType:'GMAIL', evidenceChannel:'EMAIL', transactionId:'T23' });
  const b = observation('duplicate-notice', { sourceType:'GMAIL', evidenceChannel:'EMAIL', transactionId:'T23' });
  const res = resolveCandidates([a,b]);
  assert.equal(res.canonical.length, 1);
  assert.equal(res.canonical[0].evidenceIds.length, 2);
});

test('T-24: distinct external IDs with same display details stay distinct', () => {
  const a = observation('payment-1', {transactionId:'T24-A'});
  const b = observation('payment-2', {transactionId:'T24-B'});
  assert.equal(resolveCandidates([a,b]).canonical.length, 2);
});

test('T-25: repeated cold resolution preserves logical projection, not random runtime IDs', () => {
  const input = [
    observation('aa', {transactionId:'T25-A',amount:60}),
    observation('bb', {transactionId:'T25-B',amount:40})
  ];
  const a = resolveCandidates(input);
  const b = resolveCandidates(input);
  assert.deepEqual(withoutRuntimeIds(a.canonical), withoutRuntimeIds(b.canonical));
  assert.deepEqual(totals(a.canonical), totals(b.canonical));
});

/* Remaining T-06/07/09–14/17/18/20/26–28 require their own boundary or a
 * real-document/human oracle. Mark them NOT_RUN; never turn them into false PASS.
 */
