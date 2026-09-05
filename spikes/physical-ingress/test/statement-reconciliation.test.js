import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPHA2_RECONCILIATION_VERSION,
  ReconciliationOutcome,
  StatementReconciliationRepository,
  reconcileEvidenceCandidates,
  statementReconciliationStaticContract
} from '../src/statement-reconciliation.js';

function gmailEvidence(overrides = {}) {
  return {
    evidenceId: 'gmail-evidence-001',
    tenantId: 'tenant-synthetic',
    accountId: 'account-001',
    instrumentId: null,
    institutionCode: 'BCP',
    sourceType: 'GMAIL_TRANSACTION',
    evidenceClass: 'BANK_NOTIFICATION',
    amount: 42.5,
    currency: 'PEN',
    direction: 'OUT',
    semanticType: 'EXPENSE',
    occurredAt: '2026-09-01T12:00:00.000Z',
    rawMerchant: 'Synthetic Market',
    references: { externalReference: 'REF-SYNTHETIC-001' },
    ...overrides
  };
}

function statementEvidence(overrides = {}) {
  return {
    evidenceId: 'statement-evidence-001',
    tenantId: 'tenant-synthetic',
    accountId: 'account-001',
    instrumentId: null,
    institutionCode: 'BCP',
    sourceType: 'GMAIL_STATEMENT',
    evidenceClass: 'BANK_STATEMENT',
    amount: 42.5,
    currency: 'PEN',
    direction: 'OUT',
    semanticType: 'EXPENSE',
    occurredAt: '2026-09-01T12:00:00.000Z',
    rawMerchant: 'Synthetic Market',
    references: { externalReference: 'REF-SYNTHETIC-001', statementPeriodId: 'period-2026-09' },
    ...overrides
  };
}

function clone(value) {
  return structuredClone(value);
}

function createReconciliationDatabase({ failAt = null } = {}) {
  let state = {
    snapshots: new Map(),
    links: new Map(),
    canonicalEvents: new Map(),
    canonicalByEvidence: new Map(),
    replays: new Map()
  };
  const events = [];

  function copyState(value) {
    return {
      snapshots: new Map([...value.snapshots].map(([k, v]) => [k, clone(v)])),
      links: new Map([...value.links].map(([k, v]) => [k, clone(v)])),
      canonicalEvents: new Map([...value.canonicalEvents].map(([k, v]) => [k, clone(v)])),
      canonicalByEvidence: new Map(value.canonicalByEvidence),
      replays: new Map([...value.replays].map(([k, v]) => [k, clone(v)]))
    };
  }

  function maybeFail(marker) {
    if (failAt === marker) throw new Error(`SYNTHETIC_FAILURE:${marker}`);
  }

  const database = {
    events,
    get state() { return copyState(state); },
    async transaction(callback) {
      const before = copyState(state);
      events.push('tx:begin');
      const tx = {
        async getReconciliationReplay(decisionId) {
          return state.replays.get(decisionId) ?? null;
        },
        async putFeatureSnapshot(snapshot) {
          maybeFail('snapshot');
          events.push(`snapshot:${snapshot.snapshotId}`);
          if (!state.snapshots.has(snapshot.snapshotId)) state.snapshots.set(snapshot.snapshotId, clone(snapshot));
        },
        async putReconciliationLink(link) {
          maybeFail('link');
          events.push(`link:${link.id}`);
          if (!state.links.has(link.id)) state.links.set(link.id, clone(link));
        },
        async getCanonicalEventIdByEvidence(evidenceId) {
          return state.canonicalByEvidence.get(evidenceId) ?? null;
        },
        async upsertCanonicalEvent(event) {
          maybeFail('canonical');
          events.push(`canonical:${event.id}`);
          const previous = state.canonicalEvents.get(event.id);
          if (!previous) {
            state.canonicalEvents.set(event.id, clone(event));
            return;
          }
          state.canonicalEvents.set(event.id, {
            ...previous,
            ...clone(event),
            evidenceIds: [...new Set([...(previous.evidenceIds ?? []), ...(event.evidenceIds ?? [])])].sort()
          });
        },
        async putEvidenceCanonicalLink(link) {
          maybeFail('canonical-link');
          events.push(`canonical-link:${link.evidenceId}`);
          const existing = state.canonicalByEvidence.get(link.evidenceId);
          if (existing && existing !== link.canonicalEventId) throw new Error('SYNTHETIC_CANONICAL_LINK_CONFLICT');
          state.canonicalByEvidence.set(link.evidenceId, link.canonicalEventId);
        },
        async putReconciliationReplay(audit) {
          maybeFail('replay');
          events.push(`replay:${audit.decisionId}`);
          if (!state.replays.has(audit.decisionId)) state.replays.set(audit.decisionId, clone(audit));
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

test('frozen static contract keeps 85/15 automatic confirmation law and no physical promotion', () => {
  const contract = statementReconciliationStaticContract();
  assert.equal(contract.resolverVersion, ALPHA2_RECONCILIATION_VERSION);
  assert.equal(contract.automaticConfirmation.minimumScore, 85);
  assert.equal(contract.automaticConfirmation.minimumMarginOverSecondCandidate, 15);
  assert.equal(contract.independentChannelsRequired, true);
  assert.equal(contract.amountOnlyAutoConfirmation, false);
  assert.equal(contract.canonicalMergeTransactional, true);
  assert.equal(contract.replayIdempotent, true);
  assert.equal(contract.physicalSchemaMigrationClaimed, false);
  assert.equal(contract.physicalReconciliationPassClaimed, false);
  assert.equal(contract.buildReady, false);
});

test('Gmail plus statement strong unique match is confirmed', () => {
  const decision = reconcileEvidenceCandidates({
    leftEvidence: gmailEvidence(),
    candidates: [statementEvidence()]
  });
  assert.equal(decision.outcome, ReconciliationOutcome.CONFIRMED);
  assert.equal(decision.selectedEvidenceId, 'statement-evidence-001');
  assert.equal(decision.topScore, 100);
  assert.equal(decision.margin, 100);
  assert.deepEqual(decision.reasons, ['UNIQUE_STRONG_MATCH']);
});

test('amount equality alone never auto-confirms', () => {
  const left = gmailEvidence({
    accountId: null,
    institutionCode: null,
    rawMerchant: null,
    references: {},
    occurredAt: '2026-09-01T10:00:00.000Z'
  });
  const right = statementEvidence({
    accountId: null,
    institutionCode: null,
    rawMerchant: null,
    references: {},
    occurredAt: '2026-09-02T10:00:00.000Z'
  });
  const decision = reconcileEvidenceCandidates({ leftEvidence: left, candidates: [right] });
  assert.equal(decision.topScore, 35);
  assert.equal(decision.outcome, ReconciliationOutcome.PROPOSED);
  assert.notEqual(decision.outcome, ReconciliationOutcome.CONFIRMED);
});

test('ambiguous equal-score candidates go to REVIEW and select nothing', () => {
  const candidates = [
    statementEvidence({ evidenceId: 'statement-evidence-A' }),
    statementEvidence({ evidenceId: 'statement-evidence-B' })
  ];
  const decision = reconcileEvidenceCandidates({ leftEvidence: gmailEvidence(), candidates });
  assert.equal(decision.outcome, ReconciliationOutcome.REVIEW);
  assert.equal(decision.selectedEvidenceId, null);
  assert.equal(decision.margin, 0);
  assert.equal(decision.ambiguityCount, 1);
  assert.deepEqual(decision.reasons, ['AMBIGUOUS_SCORE_MARGIN']);
});

test('candidate order cannot change the reconciliation decision identity', () => {
  const a = statementEvidence({ evidenceId: 'statement-evidence-A' });
  const b = statementEvidence({ evidenceId: 'statement-evidence-B', rawMerchant: 'Other Merchant', references: {} });
  const forward = reconcileEvidenceCandidates({ leftEvidence: gmailEvidence(), candidates: [a, b] });
  const reverse = reconcileEvidenceCandidates({ leftEvidence: gmailEvidence(), candidates: [b, a] });
  assert.equal(forward.outcome, reverse.outcome);
  assert.equal(forward.selectedEvidenceId, reverse.selectedEvidenceId);
  assert.equal(forward.decisionId, reverse.decisionId);
});

test('cross-currency evidence is rejected', () => {
  const decision = reconcileEvidenceCandidates({
    leftEvidence: gmailEvidence({ currency: 'PEN' }),
    candidates: [statementEvidence({ currency: 'USD' })]
  });
  assert.equal(decision.outcome, ReconciliationOutcome.REJECTED);
  assert.ok(decision.reasons.includes('CURRENCY_MISMATCH'));
});

test('same evidence channel is rejected even when all financial fields match', () => {
  const decision = reconcileEvidenceCandidates({
    leftEvidence: gmailEvidence(),
    candidates: [statementEvidence({ evidenceClass: 'BANK_NOTIFICATION', sourceType: 'GMAIL_TRANSACTION' })]
  });
  assert.equal(decision.outcome, ReconciliationOutcome.REJECTED);
  assert.ok(decision.reasons.includes('SOURCE_CHANNEL_NOT_INDEPENDENT'));
});

test('known account mismatch fails candidate scope closed', () => {
  const decision = reconcileEvidenceCandidates({
    leftEvidence: gmailEvidence({ accountId: 'account-A' }),
    candidates: [statementEvidence({ accountId: 'account-B' })]
  });
  assert.equal(decision.outcome, ReconciliationOutcome.REJECTED);
  assert.ok(decision.reasons.includes('SCOPE_ACCOUNT_OR_INSTRUMENT_MISMATCH'));
});

test('statement card payment cannot be reconciled as income', () => {
  const decision = reconcileEvidenceCandidates({
    leftEvidence: gmailEvidence({ semanticType: 'INCOME', direction: 'IN' }),
    candidates: [statementEvidence({ semanticType: 'CARD_PAYMENT', direction: 'OUT' })]
  });
  assert.equal(decision.outcome, ReconciliationOutcome.REJECTED);
  assert.ok(decision.reasons.includes('ECONOMIC_SEMANTICS_INCOMPATIBLE'));
});

test('own-account transfer cannot be reconciled as expense', () => {
  const decision = reconcileEvidenceCandidates({
    leftEvidence: gmailEvidence({ semanticType: 'INTERNAL_TRANSFER', direction: 'OUT' }),
    candidates: [statementEvidence({ semanticType: 'EXPENSE', direction: 'OUT' })]
  });
  assert.equal(decision.outcome, ReconciliationOutcome.REJECTED);
  assert.ok(decision.reasons.includes('ECONOMIC_SEMANTICS_INCOMPATIBLE'));
});

test('different existing canonical links force CONFLICT before merge', () => {
  const decision = reconcileEvidenceCandidates({
    leftEvidence: gmailEvidence(),
    candidates: [statementEvidence()],
    existingCanonicalByEvidence: {
      'gmail-evidence-001': 'evt-existing-A',
      'statement-evidence-001': 'evt-existing-B'
    }
  });
  assert.equal(decision.outcome, ReconciliationOutcome.CONFLICT);
  assert.ok(decision.reasons.includes('ALREADY_LINKED_CONFLICT'));
});

test('feature snapshot contains derived facts only, not raw merchant/reference values', () => {
  const decision = reconcileEvidenceCandidates({ leftEvidence: gmailEvidence(), candidates: [statementEvidence()] });
  const serialized = JSON.stringify(decision.evaluations[0].snapshot);
  assert.equal(serialized.includes('Synthetic Market'), false);
  assert.equal(serialized.includes('REF-SYNTHETIC-001'), false);
  assert.equal(serialized.includes('rawMerchant'), false);
  assert.equal(serialized.includes('externalReference'), false);
});

test('confirmed canonical merge commits one canonical event atomically', async () => {
  const left = gmailEvidence();
  const right = statementEvidence();
  const decision = reconcileEvidenceCandidates({ leftEvidence: left, candidates: [right] });
  const database = createReconciliationDatabase();
  const repository = new StatementReconciliationRepository({ database, now: () => '2026-09-05T20:00:00.000Z' });
  const result = await repository.commitDecision({
    decision,
    evidenceById: new Map([[left.evidenceId, left], [right.evidenceId, right]])
  });
  assert.equal(result.outcome, ReconciliationOutcome.CONFIRMED);
  assert.equal(result.replayed, false);
  assert.equal(result.duplicateCanonicalCount, 0);
  assert.equal(database.state.canonicalEvents.size, 1);
  assert.equal(database.state.canonicalByEvidence.size, 2);
  assert.equal(database.state.links.size, 1);
  assert.equal(database.state.snapshots.size, 1);
  assert.equal(database.state.replays.size, 1);
  assert.ok(database.events.includes('tx:commit'));
});

test('replay of the same confirmed decision creates zero duplicate canonical events', async () => {
  const left = gmailEvidence();
  const right = statementEvidence();
  const decision = reconcileEvidenceCandidates({ leftEvidence: left, candidates: [right] });
  const database = createReconciliationDatabase();
  const repository = new StatementReconciliationRepository({ database, now: () => '2026-09-05T20:00:00.000Z' });
  const evidenceById = { [left.evidenceId]: left, [right.evidenceId]: right };
  const first = await repository.commitDecision({ decision, evidenceById });
  const second = await repository.commitDecision({ decision, evidenceById });
  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(second.duplicateCanonicalCount, 0);
  assert.equal(second.canonicalEventId, first.canonicalEventId);
  assert.equal(database.state.canonicalEvents.size, 1);
  assert.equal(database.state.links.size, 1);
  assert.equal(database.state.snapshots.size, 1);
  assert.equal(database.state.replays.size, 1);
});

test('failure during canonical merge rolls snapshots, links, mappings and audit back together', async () => {
  const left = gmailEvidence();
  const right = statementEvidence();
  const decision = reconcileEvidenceCandidates({ leftEvidence: left, candidates: [right] });
  const database = createReconciliationDatabase({ failAt: 'link' });
  const repository = new StatementReconciliationRepository({ database });
  await assert.rejects(
    repository.commitDecision({ decision, evidenceById: { [left.evidenceId]: left, [right.evidenceId]: right } }),
    /SYNTHETIC_FAILURE:link/
  );
  assert.equal(database.state.canonicalEvents.size, 0);
  assert.equal(database.state.canonicalByEvidence.size, 0);
  assert.equal(database.state.snapshots.size, 0);
  assert.equal(database.state.links.size, 0);
  assert.equal(database.state.replays.size, 0);
  assert.ok(database.events.includes('tx:rollback'));
});

test('transaction re-check refuses to merge evidence already split across canonical events', async () => {
  const left = gmailEvidence();
  const right = statementEvidence();
  const decision = reconcileEvidenceCandidates({ leftEvidence: left, candidates: [right] });
  const database = createReconciliationDatabase();
  await database.transaction(async tx => {
    await tx.putEvidenceCanonicalLink({ evidenceId: left.evidenceId, canonicalEventId: 'evt-existing-A' });
    await tx.putEvidenceCanonicalLink({ evidenceId: right.evidenceId, canonicalEventId: 'evt-existing-B' });
  });
  const repository = new StatementReconciliationRepository({ database });
  await assert.rejects(
    repository.commitDecision({ decision, evidenceById: { [left.evidenceId]: left, [right.evidenceId]: right } }),
    /RECONCILIATION_CANONICAL_CONFLICT/
  );
  assert.equal(database.state.canonicalEvents.size, 0);
  assert.equal(database.state.replays.size, 0);
  assert.ok(database.events.includes('tx:rollback'));
});

test('PROPOSED and REVIEW paths persist audit without creating canonical events', async () => {
  const left = gmailEvidence({ accountId: null, institutionCode: null, rawMerchant: null, references: {}, occurredAt: '2026-09-01T10:00:00.000Z' });
  const proposedRight = statementEvidence({ accountId: null, institutionCode: null, rawMerchant: null, references: {}, occurredAt: '2026-09-02T10:00:00.000Z' });
  const proposed = reconcileEvidenceCandidates({ leftEvidence: left, candidates: [proposedRight] });
  const database = createReconciliationDatabase();
  const repository = new StatementReconciliationRepository({ database });
  await repository.commitDecision({ proposed, decision: proposed, evidenceById: { [left.evidenceId]: left, [proposedRight.evidenceId]: proposedRight } });
  assert.equal(database.state.canonicalEvents.size, 0);
  assert.equal(database.state.links.size, 1);
  assert.equal(database.state.replays.size, 1);

  const reviewA = statementEvidence({ evidenceId: 'review-A' });
  const reviewB = statementEvidence({ evidenceId: 'review-B' });
  const review = reconcileEvidenceCandidates({ leftEvidence: gmailEvidence(), candidates: [reviewA, reviewB] });
  const database2 = createReconciliationDatabase();
  const repository2 = new StatementReconciliationRepository({ database: database2 });
  await repository2.commitDecision({
    decision: review,
    evidenceById: { 'gmail-evidence-001': gmailEvidence(), 'review-A': reviewA, 'review-B': reviewB }
  });
  assert.equal(database2.state.canonicalEvents.size, 0);
  assert.equal(database2.state.links.size, 2);
  assert.equal(database2.state.replays.size, 1);
});
