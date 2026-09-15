import 'package:financesensor_mobile_shell/alpha2/alpha2_account_graph.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_monthly_coverage.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_product_gate.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_runtime.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Alpha.2 E -> F product gate', () {
    test('an imported statement without an account mapping cannot close the month', () {
      final evidence = <Alpha2Evidence>[_statementEvidence()];
      final runtime = runAlpha2CanonicalRuntime(evidence: evidence);
      final result = evaluateAlpha2ProductGate(
        tenantId: 't1',
        evidence: evidence,
        runtime: runtime,
      );

      expect(result.accountMappingRequired, isTrue);
      expect(result.ownershipDecisions, hasLength(1));
      expect(
        result.ownershipDecisions.single.state,
        Alpha2AccountMappingState.unmapped,
      );
      expect(result.monthlyClose, isNotNull);
      expect(
        result.monthlyClose!.status,
        Alpha2MonthlyCloseStatus.reviewRequired,
      );
      expect(result.monthlyClose!.reason, 'ACCOUNT_MAPPING_REQUIRED');
      expect(result.monthlyClose!.externalBlockingReasons,
          contains('ACCOUNT_MAPPING_REQUIRED'));
    });

    test('bank + currency alone stays probable and cannot auto-own an account', () {
      final evidence = <Alpha2Evidence>[_statementEvidence()];
      final runtime = runAlpha2CanonicalRuntime(evidence: evidence);
      final node = createAlpha2AccountNode(
        tenantId: 't1',
        institutionCode: 'BCP',
        currency: 'PEN',
        kind: Alpha2AccountNodeKind.account,
        nodeId: 'acct-local-1',
      );
      final result = evaluateAlpha2ProductGate(
        tenantId: 't1',
        evidence: evidence,
        runtime: runtime,
        context: Alpha2ProductGateContext(candidateNodes: <Alpha2AccountNode>[node]),
      );

      expect(result.ownershipDecisions.single.state,
          Alpha2AccountMappingState.probable);
      expect(result.ownershipDecisions.single.ownedNodeId, isNull);
      expect(result.accountMappingRequired, isTrue);
      expect(result.monthlyClose!.status,
          Alpha2MonthlyCloseStatus.reviewRequired);
    });

    test('explicit user confirmation permits a fully covered month to reconcile', () {
      final evidence = <Alpha2Evidence>[_statementEvidence()];
      final runtime = runAlpha2CanonicalRuntime(evidence: evidence);
      final node = createAlpha2AccountNode(
        tenantId: 't1',
        institutionCode: 'BCP',
        currency: 'PEN',
        kind: Alpha2AccountNodeKind.account,
        nodeId: 'acct-local-1',
      );
      final result = evaluateAlpha2ProductGate(
        tenantId: 't1',
        evidence: evidence,
        runtime: runtime,
        context: Alpha2ProductGateContext(
          candidateNodes: <Alpha2AccountNode>[node],
          userConfirmedOwnerByStatementPeriod: const <String, String>{
            'period:2026-08-01:2026-08-31': 'acct-local-1',
          },
        ),
      );

      expect(result.blockingReasons, isEmpty);
      expect(result.ownershipDecisions.single.state,
          Alpha2AccountMappingState.userConfirmed);
      expect(result.monthlyClose, isNotNull);
      expect(result.monthlyClose!.includedCount, 1);
      expect(result.monthlyClose!.reconciledIncludedCount, 1);
      expect(result.monthlyClose!.status, Alpha2MonthlyCloseStatus.reconciled);
      expect(result.monthlyClose!.reason, 'ALL_INCLUDED_SOURCES_RECONCILED');
    });

    test('reordered evidence keeps the product gate semantically stable', () {
      final firstEvidence = <Alpha2Evidence>[
        _statementEvidence(id: 's1', amount: 10),
        _statementEvidence(id: 's2', amount: 20),
      ];
      final secondEvidence = firstEvidence.reversed.toList();
      final node = createAlpha2AccountNode(
        tenantId: 't1',
        institutionCode: 'BCP',
        currency: 'PEN',
        kind: Alpha2AccountNodeKind.account,
        nodeId: 'acct-local-1',
      );
      final context = Alpha2ProductGateContext(
        candidateNodes: <Alpha2AccountNode>[node],
        userConfirmedOwnerByStatementPeriod: const <String, String>{
          'period:2026-08-01:2026-08-31': 'acct-local-1',
        },
      );
      final first = evaluateAlpha2ProductGate(
        tenantId: 't1',
        evidence: firstEvidence,
        runtime: runAlpha2CanonicalRuntime(evidence: firstEvidence),
        context: context,
      );
      final second = evaluateAlpha2ProductGate(
        tenantId: 't1',
        evidence: secondEvidence,
        runtime: runAlpha2CanonicalRuntime(evidence: secondEvidence),
        context: context,
      );

      expect(first.monthlyClose!.evaluationKey,
          second.monthlyClose!.evaluationKey);
      expect(first.ownershipDecisions.single.mappingId,
          second.ownershipDecisions.single.mappingId);
    });
  });
}

Alpha2Evidence _statementEvidence({
  String id = 'statement-1',
  double amount = 100,
}) =>
    Alpha2Evidence(
      evidenceId: id,
      tenantId: 't1',
      amount: amount,
      currency: 'PEN',
      occurredAt: DateTime.utc(2026, 8, 15, 12),
      semanticType: Alpha2SemanticType.expense,
      channel: Alpha2EvidenceChannel.statementLedger,
      truthState: Alpha2TruthState.posted,
      institutionCode: 'BCP',
      statementPeriodId: 'period:2026-08-01:2026-08-31',
      flowDirection: Alpha2FlowDirection.outflow,
    );
