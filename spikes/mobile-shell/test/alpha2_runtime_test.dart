import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_account_graph.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_monthly_coverage.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_projection.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_reconciliation.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_runtime.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_sensor_v1.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_vault.dart';

void main() {
  final vectors = jsonDecode(
    File('../../graph/alpha2-mobile-golden-vectors-v1.json').readAsStringSync(),
  ) as Map<String, dynamic>;

  group('Alpha.2 D golden parity', () {
    for (final raw in vectors['reconciliation'] as List<dynamic>) {
      final vector = raw as Map<String, dynamic>;
      test(vector['id'] as String, () {
        final result = reconcileAlpha2Evidence(
          leftEvidence: _evidenceFromVector(vector['left'] as Map<String, dynamic>),
          candidates: (vector['candidates'] as List<dynamic>)
              .map((item) => _evidenceFromVector(item as Map<String, dynamic>))
              .toList(),
        );
        final expected = vector['expected'] as Map<String, dynamic>;
        expect(_outcomeWire(result.outcome), expected['outcome']);
        if (expected.containsKey('topScore')) {
          expect(result.topScore, expected['topScore']);
        }
        if (expected.containsKey('margin')) {
          expect(result.margin, expected['margin']);
        }
        if (expected.containsKey('selectedEvidenceId')) {
          expect(result.selectedEvidenceId, expected['selectedEvidenceId']);
        }
        if (expected.containsKey('veto')) {
          expect(
            result.evaluations.expand((item) => item.snapshot.vetoes),
            contains(expected['veto']),
          );
        }
      });
    }
  });

  group('Alpha.2 E golden parity', () {
    for (final raw in vectors['accountGraph'] as List<dynamic>) {
      final vector = raw as Map<String, dynamic>;
      test(vector['id'] as String, () {
        final result = _accountCase(vector['mode'] as String);
        expect(_mappingStateWire(result.state), vector['expectedState']);
        if (vector.containsKey('expectedPeriods')) {
          expect(result.stableEvidencePeriodCount, vector['expectedPeriods']);
        }
      });
    }
  });

  group('Alpha.2 F golden parity', () {
    for (final raw in vectors['monthlyCoverage'] as List<dynamic>) {
      final vector = raw as Map<String, dynamic>;
      test(vector['id'] as String, () {
        final result = _monthlyCase(vector['mode'] as String);
        expect(alpha2MonthlyCloseStatusWire(result.status), vector['expectedStatus']);
        if (vector.containsKey('expectedExcluded')) {
          expect(result.userExcludedCount, vector['expectedExcluded']);
        }
        final publicJson = Alpha2PublicMonthlyState(
          status: alpha2MonthlyCloseStatusWire(result.status),
          includedSources: result.includedCount,
          reconciledIncludedSources: result.reconciledIncludedCount,
          pendingStatements: result.missingStatementCount,
          unresolvedItems: result.unresolvedCount,
          blockingConflicts: result.blockingConflictCount,
          userExcludedSources: result.userExcludedCount,
          notAvailableSources: result.notAvailableCount,
        ).toJson();
        expect(publicJson.keys.any((key) => key.toLowerCase().contains('percent')), isFalse);
      });
    }
  });

  group('Alpha.2 G golden parity', () {
    for (final raw in vectors['sensor'] as List<dynamic>) {
      final vector = raw as Map<String, dynamic>;
      test(vector['id'] as String, () {
        final mode = vector['mode'] as String;
        if (mode == 'FEE_CATEGORY') {
          final observation = alpha2BaseCategoryObservation(
            _canonical(id: 'fee-1', semantic: Alpha2SemanticType.fee),
          );
          expect(observation.category, vector['expectedCategory']);
          return;
        }
        if (mode == 'TWO_MONTHLY' || mode == 'THREE_MONTHLY') {
          final events = <Alpha2CanonicalTransaction>[
            _canonical(id: 'r1', occurredAt: DateTime.utc(2026, 6, 1)),
            _canonical(id: 'r2', occurredAt: DateTime.utc(2026, 7, 1)),
            if (mode == 'THREE_MONTHLY')
              _canonical(id: 'r3', occurredAt: DateTime.utc(2026, 8, 1)),
          ];
          final recurring = deriveAlpha2RecurringCandidates(events);
          expect(recurring.length, vector['expectedRecurring']);
          if (recurring.isNotEmpty) {
            expect(recurring.first.cadence, vector['expectedCadence']);
            expect(recurring.first.state, vector['expectedState']);
          }
          return;
        }
        if (mode == 'CARD_PAYMENT') {
          final cashflow = deriveAlpha2CashflowByCurrency(
            events: <Alpha2CanonicalTransaction>[
              _canonical(id: 'cp1', semantic: Alpha2SemanticType.cardPayment),
            ],
            monthlyClose: null,
          );
          expect(cashflow.length, vector['expectedCashflowBuckets']);
          return;
        }
        if (mode == 'CROSS_CURRENCY') {
          final cashflow = deriveAlpha2CashflowByCurrency(
            events: <Alpha2CanonicalTransaction>[
              _canonical(id: 'p1', currency: 'PEN'),
              _canonical(id: 'u1', currency: 'USD'),
            ],
            monthlyClose: null,
          );
          expect(cashflow.length, vector['expectedCashflowBuckets']);
        }
      });
    }
  });

  group('canonical runtime invariants', () {
    test('Gmail + statement strong match becomes one reconciled transaction', () {
      final left = _evidenceFromVector(
        (vectors['reconciliation'] as List<dynamic>).first['left'] as Map<String, dynamic>,
      );
      final right = _evidenceFromVector(
        ((vectors['reconciliation'] as List<dynamic>).first['candidates'] as List<dynamic>).first
            as Map<String, dynamic>,
      );
      final result = runAlpha2CanonicalRuntime(evidence: <Alpha2Evidence>[left, right]);
      expect(result.canonicalTransactions, hasLength(1));
      expect(result.canonicalTransactions.single.truthState, Alpha2TruthState.reconciled);
      expect(result.canonicalTransactions.single.evidenceIds.toSet(), <String>{'g1', 's1'});
    });

    test('ambiguous/proposed relations fail closed instead of double counting', () {
      final vector = (vectors['reconciliation'] as List<dynamic>)[1] as Map<String, dynamic>;
      final result = runAlpha2CanonicalRuntime(
        evidence: <Alpha2Evidence>[
          _evidenceFromVector(vector['left'] as Map<String, dynamic>),
          ...((vector['candidates'] as List<dynamic>)
              .map((item) => _evidenceFromVector(item as Map<String, dynamic>))),
        ],
      );
      expect(result.pendingResolutions, hasLength(1));
      expect(result.canonicalTransactions, isEmpty);
    });

    test('statement-only income materializes as POSTED', () {
      final income = Alpha2Evidence(
        evidenceId: 'statement-income-1',
        tenantId: 't1',
        amount: 1200,
        currency: 'PEN',
        occurredAt: DateTime.utc(2026, 8, 31),
        semanticType: Alpha2SemanticType.income,
        channel: Alpha2EvidenceChannel.statementLedger,
        truthState: Alpha2TruthState.posted,
        flowDirection: Alpha2FlowDirection.inflow,
      );
      final result = runAlpha2CanonicalRuntime(evidence: <Alpha2Evidence>[income]);
      expect(result.canonicalTransactions, hasLength(1));
      expect(result.canonicalTransactions.single.truthState, Alpha2TruthState.posted);
    });

    test('replay with reordered inputs is semantically stable', () {
      final vector = (vectors['reconciliation'] as List<dynamic>).first as Map<String, dynamic>;
      final left = _evidenceFromVector(vector['left'] as Map<String, dynamic>);
      final right = _evidenceFromVector(
        (vector['candidates'] as List<dynamic>).first as Map<String, dynamic>,
      );
      final first = runAlpha2CanonicalRuntime(evidence: <Alpha2Evidence>[left, right]);
      final second = runAlpha2CanonicalRuntime(evidence: <Alpha2Evidence>[right, left]);
      expect(first.canonicalTransactions.map((item) => item.id), second.canonicalTransactions.map((item) => item.id));
      expect(first.canonicalTransactions.single.evidenceIds, second.canonicalTransactions.single.evidenceIds);
    });

    test('cross-tenant evidence never reconciles', () {
      final left = Alpha2Evidence(
        evidenceId: 'g-x', tenantId: 'a', amount: 10, currency: 'PEN',
        occurredAt: DateTime.utc(2026, 8, 1), semanticType: Alpha2SemanticType.expense,
        channel: Alpha2EvidenceChannel.gmailTransaction, truthState: Alpha2TruthState.observed,
        flowDirection: Alpha2FlowDirection.outflow,
      );
      final right = Alpha2Evidence(
        evidenceId: 's-x', tenantId: 'b', amount: 10, currency: 'PEN',
        occurredAt: DateTime.utc(2026, 8, 1), semanticType: Alpha2SemanticType.expense,
        channel: Alpha2EvidenceChannel.statementLedger, truthState: Alpha2TruthState.posted,
        flowDirection: Alpha2FlowDirection.outflow,
      );
      final decision = reconcileAlpha2Evidence(leftEvidence: left, candidates: <Alpha2Evidence>[right]);
      expect(decision.outcome, Alpha2ReconciliationOutcome.rejected);
      expect(decision.evaluations.single.snapshot.vetoes, contains('TENANT_MISMATCH'));
    });
  });

  group('public projection privacy and truth', () {
    test('projection has no confidence, match score, raw Gmail/PDF or evidence percentage', () {
      final projection = buildAlpha2PublicProjection(
        canonicalTransactions: <Alpha2CanonicalTransaction>[
          _canonical(id: 'public-1', truth: Alpha2TruthState.observed),
          _canonical(
            id: 'public-2',
            semantic: Alpha2SemanticType.income,
            truth: Alpha2TruthState.posted,
            direction: Alpha2FlowDirection.inflow,
            amount: 100,
          ),
        ],
        monthlyClose: null,
      );
      final json = projection.toJson();
      _assertNoForbiddenPublicKeys(json);
      final serialized = jsonEncode(json).toLowerCase();
      expect(serialized.contains('96% evidencia'), isFalse);
      expect(serialized.contains('confidence'), isFalse);
      expect(serialized.contains('matchscore'), isFalse);
      expect(serialized.contains('pdfpassword'), isFalse);
    });

    test('card payment and internal transfer are excluded from Sensor cashflow', () {
      final cashflow = deriveAlpha2CashflowByCurrency(
        events: <Alpha2CanonicalTransaction>[
          _canonical(id: 'expense', semantic: Alpha2SemanticType.expense, amount: 50),
          _canonical(id: 'card', semantic: Alpha2SemanticType.cardPayment, amount: 50),
          _canonical(id: 'transfer', semantic: Alpha2SemanticType.internalTransfer, amount: 100),
        ],
        monthlyClose: null,
      );
      expect(cashflow, hasLength(1));
      expect(cashflow.single.expense, 50);
      expect(cashflow.single.income, 0);
    });
  });

  test('memory vault is idempotent per terminal source and crypto-shreds', () async {
    final vault = InMemoryAlpha2Vault();
    final capabilities = await vault.initialize();
    expect(capabilities.sqlcipherVersion, '4.18.0');
    expect(capabilities.plaintextFallback, isFalse);
    final evidence = <Alpha2Evidence>[
      Alpha2Evidence(
        evidenceId: 'ev-vault', tenantId: 't1', amount: 1, currency: 'PEN',
        occurredAt: DateTime.utc(2026, 8, 1), semanticType: Alpha2SemanticType.expense,
        channel: Alpha2EvidenceChannel.gmailTransaction, truthState: Alpha2TruthState.observed,
      ),
    ];
    await vault.commitEvidenceBatch(sourceReceiptId: 'src-1', evidence: evidence, terminalState: 'IMPORTED');
    await vault.commitEvidenceBatch(sourceReceiptId: 'src-1', evidence: evidence, terminalState: 'IMPORTED');
    expect(await vault.readSafeEvidence(), hasLength(1));
    await vault.cryptoShred();
    expect(vault.readSafeEvidence(), throwsStateError);
  });
}

Alpha2Evidence _evidenceFromVector(Map<String, dynamic> raw) {
  final evidenceClass = (raw['evidenceClass'] as String? ?? '').toUpperCase();
  return Alpha2Evidence(
    evidenceId: raw['evidenceId'] as String,
    tenantId: raw['tenantId'] as String,
    amount: (raw['amount'] as num).toDouble(),
    currency: raw['currency'] as String,
    occurredAt: DateTime.parse(raw['occurredAt'] as String),
    semanticType: _semantic(raw['semanticType'] as String),
    channel: evidenceClass == 'BANK_STATEMENT'
        ? Alpha2EvidenceChannel.statementLedger
        : Alpha2EvidenceChannel.gmailTransaction,
    truthState: evidenceClass == 'BANK_STATEMENT'
        ? Alpha2TruthState.posted
        : Alpha2TruthState.observed,
    institutionCode: raw['institutionCode'] as String?,
    accountId: raw['accountId'] as String?,
    instrumentId: raw['instrumentId'] as String?,
    merchantCanonical: raw['merchantCanonical'] as String?,
    externalReference: raw['externalReference'] as String?,
    flowDirection: (raw['direction'] as String? ?? '').toUpperCase() == 'OUT'
        ? Alpha2FlowDirection.outflow
        : Alpha2FlowDirection.unknown,
  );
}

Alpha2OwnershipDecision _accountCase(String mode) {
  const commonTenant = 't1';
  if (mode == 'BANK_CURRENCY_ONLY') {
    final node = createAlpha2AccountNode(
      tenantId: commonTenant,
      institutionCode: 'BCP',
      currency: 'PEN',
      kind: Alpha2AccountNodeKind.account,
      nodeId: 'acct-demo',
    );
    return resolveAlpha2StatementOwnership(
      observation: const Alpha2StatementOwnershipObservation(
        tenantId: commonTenant,
        statementPeriodId: '2026-08',
        institutionCode: 'BCP',
        currency: 'PEN',
        kind: Alpha2AccountNodeKind.account,
      ),
      candidateNodes: <Alpha2AccountNode>[node],
    );
  }
  if (mode == 'MASKED_ONE_PERIOD' || mode == 'MASKED_TWO_PERIODS') {
    final node = createAlpha2AccountNode(
      tenantId: commonTenant,
      institutionCode: 'BCP',
      currency: 'PEN',
      kind: Alpha2AccountNodeKind.account,
      maskedHint: '****1234',
    );
    return resolveAlpha2StatementOwnership(
      observation: const Alpha2StatementOwnershipObservation(
        tenantId: commonTenant,
        statementPeriodId: '2026-08',
        institutionCode: 'BCP',
        currency: 'PEN',
        kind: Alpha2AccountNodeKind.account,
        maskedHint: '****1234',
      ),
      candidateNodes: <Alpha2AccountNode>[node],
      priorEvidence: mode == 'MASKED_TWO_PERIODS'
          ? <Alpha2PriorOwnershipEvidence>[
              Alpha2PriorOwnershipEvidence(
                nodeId: node.id,
                tenantId: commonTenant,
                statementPeriodId: '2026-07',
                institutionCode: 'BCP',
                currency: 'PEN',
                kind: Alpha2AccountNodeKind.account,
                maskedHintDigest: node.maskedHintDigest,
              ),
            ]
          : const <Alpha2PriorOwnershipEvidence>[],
    );
  }
  if (mode == 'EXACT_STABLE_IDENTIFIER') {
    final digest = alpha2StableIdentifierDigest('demo-stable-id');
    final node = createAlpha2AccountNode(
      tenantId: commonTenant,
      institutionCode: 'BCP',
      currency: 'PEN',
      kind: Alpha2AccountNodeKind.account,
      profileStableIdentifierDigest: digest,
      profileDeclaresStableIdentifier: true,
    );
    return resolveAlpha2StatementOwnership(
      observation: Alpha2StatementOwnershipObservation(
        tenantId: commonTenant,
        statementPeriodId: '2026-08',
        institutionCode: 'BCP',
        currency: 'PEN',
        kind: Alpha2AccountNodeKind.account,
        profileStableIdentifierDigest: digest,
        profileDeclaresStableIdentifier: true,
      ),
      candidateNodes: <Alpha2AccountNode>[node],
    );
  }
  throw ArgumentError('unknown account mode $mode');
}

Alpha2MonthlyCloseEvaluation _monthlyCase(String mode) {
  Alpha2AccountPeriodCoverage base({
    String id = 'cov-1',
    String ownerNodeId = 'acct-1',
    Alpha2ExpectedSourceState expected = Alpha2ExpectedSourceState.expected,
    Alpha2CoverageScopeState scope = Alpha2CoverageScopeState.included,
    Alpha2StatementCoverageState statement = Alpha2StatementCoverageState.parsed,
    Alpha2InflowCoverageState inflow = Alpha2InflowCoverageState.covered,
    Alpha2OutflowCoverageState outflow = Alpha2OutflowCoverageState.covered,
    Alpha2PeriodCoverageState period = Alpha2PeriodCoverageState.covered,
    Alpha2AccountReconciliationState reconciliation = Alpha2AccountReconciliationState.reconciled,
    int unresolved = 0,
    int conflicts = 0,
  }) =>
      Alpha2AccountPeriodCoverage(
        id: id,
        tenantId: 't1',
        ownerNodeId: ownerNodeId,
        periodStart: DateTime.utc(2026, 8, 1),
        periodEnd: DateTime.utc(2026, 8, 31, 23, 59, 59),
        expectedSourceState: expected,
        scopeState: scope,
        statementState: statement,
        inflowCoverageState: inflow,
        outflowCoverageState: outflow,
        periodCoverageState: period,
        reconciliationState: reconciliation,
        requiredDirections: const <Alpha2RequiredDirection>{
          Alpha2RequiredDirection.inflow,
          Alpha2RequiredDirection.outflow,
        },
        unresolvedCount: unresolved,
        blockingConflictCount: conflicts,
        statementPeriodId: 'period-2026-08',
      );

  late final List<Alpha2AccountPeriodCoverage> coverages;
  switch (mode) {
    case 'MISSING_STATEMENT':
      coverages = <Alpha2AccountPeriodCoverage>[
        base(
          statement: Alpha2StatementCoverageState.none,
          inflow: Alpha2InflowCoverageState.partial,
          outflow: Alpha2OutflowCoverageState.observed,
          period: Alpha2PeriodCoverageState.partial,
          reconciliation: Alpha2AccountReconciliationState.partial,
        ),
      ];
    case 'ALL_COVERED':
      coverages = <Alpha2AccountPeriodCoverage>[base()];
    case 'BLOCKING_CONFLICT':
      coverages = <Alpha2AccountPeriodCoverage>[base(conflicts: 1)];
    case 'ONE_INCLUDED_ONE_EXCLUDED':
      coverages = <Alpha2AccountPeriodCoverage>[
        base(id: 'cov-included'),
        base(
          id: 'cov-excluded',
          ownerNodeId: 'acct-2',
          expected: Alpha2ExpectedSourceState.userExcluded,
          scope: Alpha2CoverageScopeState.userExcluded,
          statement: Alpha2StatementCoverageState.none,
          inflow: Alpha2InflowCoverageState.unknown,
          outflow: Alpha2OutflowCoverageState.unknown,
          period: Alpha2PeriodCoverageState.unknown,
          reconciliation: Alpha2AccountReconciliationState.notStarted,
        ),
      ];
    default:
      throw ArgumentError('unknown monthly mode $mode');
  }
  return evaluateAlpha2MonthlyClose(
    tenantId: 't1',
    calendarYear: 2026,
    calendarMonth: 8,
    closeRequested: true,
    coverages: coverages,
  );
}

Alpha2CanonicalTransaction _canonical({
  required String id,
  Alpha2SemanticType semantic = Alpha2SemanticType.expense,
  String currency = 'PEN',
  double amount = 10,
  DateTime? occurredAt,
  Alpha2TruthState truth = Alpha2TruthState.observed,
  Alpha2FlowDirection direction = Alpha2FlowDirection.outflow,
}) =>
    Alpha2CanonicalTransaction(
      id: id,
      tenantId: 't1',
      evidenceIds: <String>['ev-$id'],
      amount: amount,
      currency: currency,
      occurredAt: occurredAt ?? DateTime.utc(2026, 8, 1),
      semanticType: semantic,
      truthState: truth,
      flowDirection: direction,
      merchantCanonical: 'DEMO SHOP',
      accountId: 'acct-1',
    );

Alpha2SemanticType _semantic(String raw) => switch (raw.toUpperCase()) {
      'EXPENSE' => Alpha2SemanticType.expense,
      'INCOME' => Alpha2SemanticType.income,
      'FEE' => Alpha2SemanticType.fee,
      'CARD_PAYMENT' => Alpha2SemanticType.cardPayment,
      'INTERNAL_TRANSFER' => Alpha2SemanticType.internalTransfer,
      'EXTERNAL_TRANSFER' => Alpha2SemanticType.externalTransfer,
      _ => Alpha2SemanticType.unknown,
    };

String _outcomeWire(Alpha2ReconciliationOutcome value) => switch (value) {
      Alpha2ReconciliationOutcome.confirmed => 'CONFIRMED',
      Alpha2ReconciliationOutcome.proposed => 'PROPOSED',
      Alpha2ReconciliationOutcome.review => 'REVIEW',
      Alpha2ReconciliationOutcome.rejected => 'REJECTED',
      Alpha2ReconciliationOutcome.conflict => 'CONFLICT',
    };

String _mappingStateWire(Alpha2AccountMappingState value) => switch (value) {
      Alpha2AccountMappingState.unmapped => 'UNMAPPED',
      Alpha2AccountMappingState.probable => 'PROBABLE',
      Alpha2AccountMappingState.userConfirmed => 'USER_CONFIRMED',
      Alpha2AccountMappingState.systemConfirmedByStableEvidence =>
        'SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE',
    };

void _assertNoForbiddenPublicKeys(Object? value) {
  if (value is Map<String, Object?>) {
    for (final entry in value.entries) {
      expect(alpha2ForbiddenPublicProjectionKeys, isNot(contains(entry.key)));
      _assertNoForbiddenPublicKeys(entry.value);
    }
  } else if (value is List<Object?>) {
    for (final item in value) {
      _assertNoForbiddenPublicKeys(item);
    }
  }
}
