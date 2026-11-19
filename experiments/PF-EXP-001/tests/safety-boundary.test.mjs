import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCandidates, projectEconomicEffect, EventType, EffectState } from '../../../spikes/canonical-resolver/src/resolver.js';

const at = '2026-02-12T10:15:00.000Z';
const candidate = (tenantId, evidenceId, references = {}, amount = 100, extra = {}) => ({
  tenantId, evidenceIds: [evidenceId], sourceTypes: ['GMAIL'], evidenceChannels: ['EMAIL'],
  accountId: 'A', instrumentId: null, amount, currency: 'PEN', flowDirection: 'OUT',
  occurredAt: at, rawMerchant: 'Synthetic Store', merchantCanonical: 'Synthetic Store',
  semanticType: EventType.EXPENSE, confidence: 0.8, references, ...extra
});

test('tenant isolation: same evidence ID in different tenants never drops second event', () => {
  const result = resolveCandidates([candidate('tenant-A','GMAIL:123'),candidate('tenant-B','GMAIL:123')]);
  assert.equal(result.canonical.length, 2);
});

test('contradictory strong references prevent automatic merging', () => {
  const result = resolveCandidates([
    candidate('tenant-A','GMAIL:a',{orderId:'shared',providerTransactionId:'tx-1'}),
    candidate('tenant-A','GMAIL:b',{orderId:'shared',providerTransactionId:'tx-2'})
  ]);
  assert.equal(result.canonical.length, 2);
});

test('malformed amounts cannot become canonical events', () => {
  for (const amount of [NaN,Infinity,'bad',-10,0,'']) {
    const result = resolveCandidates([candidate('tenant-A','GMAIL:invalid',{},amount)]);
    assert.equal(result.canonical.length,0);
    assert.equal(result.review.length,1);
    assert.equal(result.review[0].reason,'INVALID_MONETARY_CANDIDATE');
  }
});

test('malformed amounts cannot contaminate income or expense totals', () => {
  for (const amount of [NaN,Infinity,'bad',-10,0,'']) {
    const effect = projectEconomicEffect({ semanticType:EventType.EXPENSE, amount });
    assert.deepEqual(effect,{income:0,expense:0,state:EffectState.REQUIRES_REVIEW});
  }
});

test('unknown tenant and currency reject candidate', () => {
  for (const extra of [{tenantId:''},{currency:''}]) {
    const result = resolveCandidates([candidate('tenant-A','GMAIL:x',{},100,extra)]);
    assert.equal(result.canonical.length,0);
    assert.equal(result.review[0].reason,'INVALID_MONETARY_CANDIDATE');
  }
});

test('same evidence ID with changed amount is a visible conflict, not a silent replay', () => {
  const original = candidate('tenant-A', 'same-evidence', {}, 100);
  const revised = candidate('tenant-A', 'same-evidence', {}, 900);
  const result = resolveCandidates([original,revised]);
  assert.equal(result.canonical.length,1);
  assert.equal(result.canonical[0].amount,100);
  assert.equal(result.review.length,1);
  assert.equal(result.review[0].reason,'EVIDENCE_REPLAY_CONFLICT');
});

test('identical evidence replay remains idempotent', () => {
  const result = resolveCandidates([candidate('tenant-A','e-1'),candidate('tenant-A','e-1')]);
  assert.equal(result.canonical.length,1);
  assert.equal(result.review.length,0);
});
