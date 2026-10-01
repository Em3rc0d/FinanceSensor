import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPHA2_SENSOR_VERSION,
  BASE_CATEGORIES,
  SensorTruthState,
  SensorV1Repository,
  baseCategoryObservation,
  buildSensorV1Snapshot,
  deriveCashflowObservations,
  deriveKnowledgeGaps,
  deriveRecurringCandidates,
  sensorV1StaticContract
} from '../src/sensor-v1.js';

function event(overrides = {}) {
  return {
    id: 'evt-001',
    tenantId: 'tenant-synthetic',
    semanticType: 'EXPENSE',
    amount: 25,
    currency: 'PEN',
    occurredAt: '2026-07-05T10:00:00.000Z',
    merchantCanonical: 'Synthetic Service',
    accountId: 'account-001',
    canonicalStatus: 'ACTIVE',
    reconciliationState: 'RECONCILED',
    ledgerPostingState: 'STATEMENT_POSTED',
    ...overrides
  };
}

function close(overrides = {}) {
  return {
    closeId: 'close-2026-07',
    tenantId: 'tenant-synthetic',
    calendarYear: 2026,
    calendarMonth: 7,
    status: 'RECONCILED',
    coverage: {
      sources: []
    },
    ...overrides
  };
}

function recurringSeries({ currency = 'PEN', merchant = 'Synthetic Stream', startMonth = 6 } = {}) {
  return [0, 1, 2].map((offset, index) => event({
    id: `evt-rec-${currency}-${index + 1}`,
    currency,
    merchantCanonical: merchant,
    amount: 19.9 + index,
    occurredAt: `2026-${String(startMonth + offset).padStart(2, '0')}-05T10:00:00.000Z`,
    reconciliationState: index === 2 ? 'PARTIAL' : 'RECONCILED'
  }));
}

function createSensorDatabase({ failAt = null } = {}) {
  let state = { outputs: new Map(), replays: new Map() };
  const events = [];
  const copy = source => ({
    outputs: new Map([...source.outputs].map(([key, value]) => [key, structuredClone(value)])),
    replays: new Map([...source.replays].map(([key, value]) => [key, structuredClone(value)]))
  });
  const database = {
    events,
    get state() { return copy(state); },
    async transaction(callback) {
      const before = copy(state);
      events.push('tx:begin');
      const tx = {
        async getSensorReplay(snapshotId) {
          return state.replays.get(snapshotId) ?? null;
        },
        async putSensorOutput(output) {
          if (failAt === 'output') throw new Error('SYNTHETIC_SENSOR_OUTPUT_FAILURE');
          events.push(`output:${output.id}`);
          if (!state.outputs.has(output.id)) state.outputs.set(output.id, structuredClone(output));
        },
        async putSensorReplay(audit) {
          if (failAt === 'replay') throw new Error('SYNTHETIC_SENSOR_REPLAY_FAILURE');
          events.push(`replay:${audit.snapshotId}`);
          if (!state.replays.has(audit.snapshotId)) state.replays.set(audit.snapshotId, structuredClone(audit));
        }
      };
      try {
        const result = await callback(tx);
        events.push('tx:commit');
        return result;
      } catch (error) {
        state = before;
        events.push('tx:rollback');
        throw error;
      }
    }
  };
  return database;
}

test('static contract remains deterministic and refuses advice/LLM/build promotion', () => {
  const contract = sensorV1StaticContract();
  assert.equal(contract.version, ALPHA2_SENSOR_VERSION);
  assert.equal(contract.deterministicOnly, true);
  assert.equal(contract.llmEnabled, false);
  assert.equal(contract.automatedFinancialAdvice, false);
  assert.equal(contract.genericEvidencePercentageAllowed, false);
  assert.equal(contract.crossCurrencyAggregationAllowed, false);
  assert.equal(contract.recurrenceCandidateOnly, true);
  assert.equal(contract.everyOutputRequiresAlgorithmVersion, true);
  assert.equal(contract.everyOutputRequiresEvidenceInputs, true);
  assert.equal(contract.everyOutputRequiresTruthState, true);
  assert.equal(contract.physicalSensorPassClaimed, false);
  assert.equal(contract.alpha2ProductPassClaimed, false);
  assert.equal(contract.buildReady, false);
});

test('base category catalog matches the frozen product-language foundation', () => {
  assert.deepEqual(BASE_CATEGORIES, [
    'Comida','Transporte','Hogar','Servicios','Compras','Entretenimiento','Suscripciones',
    'Salud','Estudios','Viajes','Familia','Mascotas','Comisiones','Impuestos','Otros'
  ]);
});

test('explicit base category is preserved with provenance', () => {
  const observation = baseCategoryObservation(event({ categoryName: 'Suscripciones' }));
  assert.equal(observation.category, 'Suscripciones');
  assert.equal(observation.truthState, SensorTruthState.RECONCILED);
  assert.equal(observation.algorithmVersion, 'A2_BASE_CATEGORY_V1');
  assert.deepEqual(observation.evidenceInputs, ['evt-001']);
});

test('fee semantic maps deterministically to Comisiones', () => {
  const observation = baseCategoryObservation(event({ semanticType: 'FEE', categoryName: null }));
  assert.equal(observation.category, 'Comisiones');
  assert.equal(observation.reason, 'SEMANTIC_FEE_CATEGORY');
});

test('unknown category is not guessed and becomes UNKNOWN', () => {
  const observation = baseCategoryObservation(event({ categoryName: null, semanticType: 'EXPENSE' }));
  assert.equal(observation.category, null);
  assert.equal(observation.truthState, SensorTruthState.UNKNOWN);
  assert.equal(observation.reason, 'CATEGORY_SIGNAL_INSUFFICIENT');
});

test('three monthly expense occurrences create only an OBSERVED recurrence candidate', () => {
  const candidates = deriveRecurringCandidates(recurringSeries());
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].state, 'CANDIDATE');
  assert.equal(candidates[0].cadence, 'MONTHLY');
  assert.equal(candidates[0].truthState, SensorTruthState.OBSERVED);
  assert.equal(candidates[0].occurrenceCount, 3);
  assert.equal(candidates[0].evidenceInputs.length, 3);
});

test('two occurrences are insufficient for recurrence', () => {
  const candidates = deriveRecurringCandidates(recurringSeries().slice(0, 2));
  assert.equal(candidates.length, 0);
});

test('card payments, income, refunds and internal transfers never become recurring expense candidates', () => {
  for (const semanticType of ['CARD_PAYMENT', 'INCOME', 'REFUND', 'INTERNAL_TRANSFER']) {
    const candidates = deriveRecurringCandidates(recurringSeries().map((row, index) => ({
      ...row,
      id: `${row.id}-${semanticType}-${index}`,
      semanticType
    })));
    assert.equal(candidates.length, 0, semanticType);
  }
});

test('irregular cadence is not promoted to recurring candidate', () => {
  const candidates = deriveRecurringCandidates([
    event({ id: 'ir-1', occurredAt: '2026-01-01T00:00:00Z', merchantCanonical: 'Irregular Merchant' }),
    event({ id: 'ir-2', occurredAt: '2026-01-13T00:00:00Z', merchantCanonical: 'Irregular Merchant' }),
    event({ id: 'ir-3', occurredAt: '2026-03-25T00:00:00Z', merchantCanonical: 'Irregular Merchant' })
  ]);
  assert.equal(candidates.length, 0);
});

test('candidate identity is order-independent', () => {
  const series = recurringSeries();
  const forward = deriveRecurringCandidates(series);
  const reverse = deriveRecurringCandidates([...series].reverse());
  assert.equal(forward[0].id, reverse[0].id);
  assert.deepEqual(forward[0].evidenceInputs, reverse[0].evidenceInputs);
});

test('cashflow is never aggregated across currencies', () => {
  const observations = deriveCashflowObservations([
    event({ id: 'pen-exp', amount: 20, currency: 'PEN' }),
    event({ id: 'usd-exp', amount: 10, currency: 'USD' }),
    event({ id: 'pen-inc', semanticType: 'INCOME', amount: 100, currency: 'PEN' })
  ], [close()]);
  assert.equal(observations.length, 2);
  const pen = observations.find(item => item.currency === 'PEN');
  const usd = observations.find(item => item.currency === 'USD');
  assert.deepEqual({ income: pen.income, expense: pen.expense, net: pen.netCashflow }, { income: 100, expense: 20, net: 80 });
  assert.deepEqual({ income: usd.income, expense: usd.expense, net: usd.netCashflow }, { income: 0, expense: 10, net: -10 });
});

test('reconciled close makes same-period cashflow RECONCILED', () => {
  const observations = deriveCashflowObservations([event()], [close()]);
  assert.equal(observations[0].truthState, SensorTruthState.RECONCILED);
});

test('open or absent close keeps cashflow PARTIAL', () => {
  const observations = deriveCashflowObservations([event()], [close({ status: 'OPEN_LIVE' })]);
  assert.equal(observations[0].truthState, SensorTruthState.PARTIAL);
});

test('non-cashflow semantics do not contaminate cashflow observations', () => {
  const observations = deriveCashflowObservations([
    event({ id: 'transfer', semanticType: 'INTERNAL_TRANSFER', amount: 100 }),
    event({ id: 'payment', semanticType: 'CARD_PAYMENT', amount: 50 })
  ], [close()]);
  assert.equal(observations.length, 0);
});

test('monthly blocking reasons become explicit knowledge gaps', () => {
  const monthly = close({
    status: 'REVIEW_REQUIRED',
    coverage: {
      sources: [{
        id: 'coverage-1',
        ownerNodeId: 'account-001',
        blockingReasons: ['MISSING_EXPECTED_STATEMENT', 'INFLOW_NOT_COVERED']
      }]
    }
  });
  const gaps = deriveKnowledgeGaps({ monthlyCloseEvaluations: [monthly], categoryObservations: [] });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].kind, 'MONTHLY_SOURCE_GAP');
  assert.equal(gaps[0].truthState, SensorTruthState.UNKNOWN);
  assert.ok(gaps[0].reasonCodes.includes('MISSING_EXPECTED_STATEMENT'));
});

test('category unknown becomes explicit knowledge gap', () => {
  const category = baseCategoryObservation(event({ categoryName: null }));
  const gaps = deriveKnowledgeGaps({ categoryObservations: [category] });
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].kind, 'CATEGORY_UNKNOWN');
});

test('snapshot carries version/evidence/truth on every persisted output and no advice', () => {
  const recurring = recurringSeries();
  const snapshot = buildSensorV1Snapshot({
    tenantId: 'tenant-synthetic',
    sourceInventory: [{ sourceId: 'source-bcp' }, { sourceId: 'source-ripley' }],
    monthlyCloseEvaluations: [close()],
    canonicalEvents: [
      ...recurring,
      event({ id: 'fee-1', semanticType: 'FEE', merchantCanonical: 'Synthetic Bank', categoryName: null })
    ]
  });
  assert.equal(snapshot.algorithmVersion, ALPHA2_SENSOR_VERSION);
  assert.equal(snapshot.llmUsed, false);
  assert.equal(snapshot.automatedFinancialAdvice, false);
  assert.deepEqual(snapshot.recommendations, []);
  assert.equal(snapshot.genericEvidencePercentage, null);
  const outputs = [
    ...snapshot.claims,
    ...snapshot.recurringCandidates,
    ...snapshot.cashflowObservations,
    ...snapshot.categoryObservations,
    ...snapshot.knowledgeGaps
  ];
  for (const output of outputs) {
    assert.equal(typeof output.algorithmVersion, 'string');
    assert.ok(Object.values(SensorTruthState).includes(output.truthState));
    assert.ok(Array.isArray(output.evidenceInputs));
  }
  assert.equal(snapshot.claims.find(item => item.kind === 'SOURCES_DETECTED').value, 2);
  assert.equal(snapshot.claims.find(item => item.kind === 'MONTHS_RECONCILED').value, 1);
  assert.equal(snapshot.claims.find(item => item.kind === 'RECURRING_OBSERVED').value, 1);
});

test('snapshot identity is stable under source/event ordering', () => {
  const events = recurringSeries();
  const a = buildSensorV1Snapshot({
    tenantId: 'tenant-synthetic',
    sourceInventory: [{ sourceId: 'source-b' }, { sourceId: 'source-a' }],
    monthlyCloseEvaluations: [close()],
    canonicalEvents: events
  });
  const b = buildSensorV1Snapshot({
    tenantId: 'tenant-synthetic',
    sourceInventory: [{ sourceId: 'source-a' }, { sourceId: 'source-b' }],
    monthlyCloseEvaluations: [close()],
    canonicalEvents: [...events].reverse()
  });
  assert.equal(a.id, b.id);
});

test('cross-tenant canonical event fails closed', () => {
  assert.throws(() => buildSensorV1Snapshot({
    tenantId: 'tenant-synthetic',
    canonicalEvents: [event({ tenantId: 'tenant-other' })]
  }), /SENSOR_EVENT_TENANT_MISMATCH/);
});

test('repository persists deterministic outputs transactionally', async () => {
  const snapshot = buildSensorV1Snapshot({
    tenantId: 'tenant-synthetic',
    sourceInventory: [{ sourceId: 'source-1' }],
    monthlyCloseEvaluations: [close()],
    canonicalEvents: recurringSeries()
  });
  const database = createSensorDatabase();
  const repository = new SensorV1Repository({ database, now: () => '2026-09-05T23:45:00.000Z' });
  const result = await repository.commitSnapshot(snapshot);
  assert.equal(result.replayed, false);
  assert.ok(result.outputCount > 0);
  assert.equal(database.state.outputs.size, result.outputCount);
  assert.equal(database.state.replays.size, 1);
  assert.ok(database.events.includes('tx:commit'));
});

test('repository replay creates zero duplicate outputs', async () => {
  const snapshot = buildSensorV1Snapshot({
    tenantId: 'tenant-synthetic',
    sourceInventory: [{ sourceId: 'source-1' }],
    monthlyCloseEvaluations: [close()],
    canonicalEvents: recurringSeries()
  });
  const database = createSensorDatabase();
  const repository = new SensorV1Repository({ database });
  const first = await repository.commitSnapshot(snapshot);
  const second = await repository.commitSnapshot(snapshot);
  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(database.state.outputs.size, first.outputCount);
  assert.equal(database.state.replays.size, 1);
});

test('repository failure rolls all Sensor outputs and replay back', async () => {
  const snapshot = buildSensorV1Snapshot({
    tenantId: 'tenant-synthetic',
    sourceInventory: [{ sourceId: 'source-1' }],
    monthlyCloseEvaluations: [close()],
    canonicalEvents: recurringSeries()
  });
  const database = createSensorDatabase({ failAt: 'replay' });
  const repository = new SensorV1Repository({ database });
  await assert.rejects(repository.commitSnapshot(snapshot), /SYNTHETIC_SENSOR_REPLAY_FAILURE/);
  assert.equal(database.state.outputs.size, 0);
  assert.equal(database.state.replays.size, 0);
  assert.ok(database.events.includes('tx:rollback'));
});

test('repository refuses a mutated snapshot that attempts advice', async () => {
  const snapshot = buildSensorV1Snapshot({ tenantId: 'tenant-synthetic' });
  const database = createSensorDatabase();
  const repository = new SensorV1Repository({ database });
  await assert.rejects(
    repository.commitSnapshot({ ...snapshot, recommendations: [{ action: 'SPEND_LESS' }] }),
    /SENSOR_RECOMMENDATION_FORBIDDEN/
  );
});
