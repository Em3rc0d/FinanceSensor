import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EventType,
  EffectState,
  projectEconomicEffect,
  economicContribution
} from '../src/resolver.js';

const event = (semanticType, amount = 100) => ({ semanticType, amount });

test('ordinary expense projects as resolved expense', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.EXPENSE, 80)), {
    income: 0,
    expense: 80,
    state: EffectState.RESOLVED
  });
});

test('ordinary income projects as resolved income', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.INCOME, 500)), {
    income: 500,
    expense: 0,
    state: EffectState.RESOLVED
  });
});

test('internal transfer is explicitly neutral', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.INTERNAL_TRANSFER, 500)), {
    income: 0,
    expense: 0,
    state: EffectState.NEUTRAL
  });
});

test('card settlement is explicitly neutral', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.CARD_PAYMENT, 500)), {
    income: 0,
    expense: 0,
    state: EffectState.NEUTRAL
  });
});

test('external transfer is unresolved rather than silently neutral', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.EXTERNAL_TRANSFER, 500)), {
    income: 0,
    expense: 0,
    state: EffectState.REQUIRES_REVIEW
  });
});

test('unlinked refund cannot alter totals yet', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.REFUND, 40)), {
    income: 0,
    expense: 0,
    state: EffectState.REQUIRES_LINK
  });
});

test('linked partial refund offsets the original expense', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.REFUND, 40), {
    linkedContribution: { income: 0, expense: 100 }
  }), {
    income: 0,
    expense: -40,
    state: EffectState.OFFSET
  });
});

test('linked full refund can reduce net expense to zero', () => {
  const purchase = economicContribution(event(EventType.EXPENSE, 100));
  const refund = economicContribution(event(EventType.REFUND, 100), {
    linkedContribution: purchase
  });
  assert.deepEqual({
    income: purchase.income + refund.income,
    expense: purchase.expense + refund.expense
  }, { income: 0, expense: 0 });
});

test('refund larger than linked expense requires review instead of inventing an offset', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.REFUND, 120), {
    linkedContribution: { income: 0, expense: 100 }
  }), {
    income: 0,
    expense: 0,
    state: EffectState.REQUIRES_REVIEW
  });
});

test('unlinked reversal requires an original event', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.REVERSAL, 75)), {
    income: 0,
    expense: 0,
    state: EffectState.REQUIRES_LINK
  });
});

test('linked reversal negates an expense contribution', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.REVERSAL, 75), {
    linkedContribution: { income: 0, expense: 75 }
  }), {
    income: 0,
    expense: -75,
    state: EffectState.OFFSET
  });
});

test('linked reversal can negate an income contribution', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.REVERSAL, 200), {
    linkedContribution: { income: 200, expense: 0 }
  }), {
    income: -200,
    expense: 0,
    state: EffectState.OFFSET
  });
});

test('reversal amount mismatch requires review', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.REVERSAL, 90), {
    linkedContribution: { income: 0, expense: 100 }
  }), {
    income: 0,
    expense: 0,
    state: EffectState.REQUIRES_REVIEW
  });
});

test('unknown semantic event remains reviewable and economically inert', () => {
  assert.deepEqual(projectEconomicEffect(event(EventType.UNKNOWN, 12)), {
    income: 0,
    expense: 0,
    state: EffectState.REQUIRES_REVIEW
  });
});
