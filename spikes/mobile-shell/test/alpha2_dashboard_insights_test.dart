import 'package:flutter_test/flutter_test.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_dashboard_insights.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_projection.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_sensor_v1.dart';

void main() {
  Alpha2PublicTransaction tx({
    required String id,
    required double amount,
    required String currency,
    required Alpha2SemanticType semantic,
    required Alpha2FlowDirection direction,
    String? category,
  }) => Alpha2PublicTransaction(
        id: id,
        occurredAt: DateTime.utc(2026, 9, 1),
        amount: amount,
        currency: currency,
        semanticType: semantic,
        truthState: Alpha2TruthState.observed,
        flowDirection: direction,
        category: category,
      );

  Alpha2PublicDashboardProjection projection(List<Alpha2PublicTransaction> rows) =>
      Alpha2PublicDashboardProjection(
        transactions: rows,
        cashflow: const [],
        recurringCandidates: const [],
        knowledgeGaps: const [],
        monthlyState: null,
      );

  test('category summaries keep PEN and USD separate', () {
    final result = summarizeAlpha2Categories(
      projection([
        tx(
          id: 'a',
          amount: 40,
          currency: 'PEN',
          semantic: Alpha2SemanticType.expense,
          direction: Alpha2FlowDirection.outflow,
          category: 'Comida',
        ),
        tx(
          id: 'b',
          amount: 10,
          currency: 'PEN',
          semantic: Alpha2SemanticType.expense,
          direction: Alpha2FlowDirection.outflow,
          category: 'Comida',
        ),
        tx(
          id: 'c',
          amount: 12,
          currency: 'USD',
          semantic: Alpha2SemanticType.expense,
          direction: Alpha2FlowDirection.outflow,
          category: 'Comida',
        ),
      ]),
    );

    expect(result, hasLength(2));
    expect(result.first.currency, 'PEN');
    expect(result.first.category, 'Comida');
    expect(result.first.expense, 50);
    expect(result.first.transactionCount, 2);
    expect(result.last.currency, 'USD');
    expect(result.last.expense, 12);
  });

  test('card payments and transfers do not become category expense', () {
    final result = summarizeAlpha2Categories(
      projection([
        tx(
          id: 'expense',
          amount: 20,
          currency: 'PEN',
          semantic: Alpha2SemanticType.expense,
          direction: Alpha2FlowDirection.outflow,
          category: 'Compras',
        ),
        tx(
          id: 'card-payment',
          amount: 100,
          currency: 'PEN',
          semantic: Alpha2SemanticType.cardPayment,
          direction: Alpha2FlowDirection.outflow,
          category: 'Compras',
        ),
        tx(
          id: 'transfer',
          amount: 200,
          currency: 'PEN',
          semantic: Alpha2SemanticType.internalTransfer,
          direction: Alpha2FlowDirection.outflow,
          category: 'Compras',
        ),
      ]),
    );

    expect(result, hasLength(1));
    expect(result.single.expense, 20);
    expect(result.single.transactionCount, 1);
  });

  test('knowledge gaps collapse repeated reasons deterministically', () {
    final gaps = <Alpha2KnowledgeGap>[
      const Alpha2KnowledgeGap(
        id: 'g1',
        kind: 'CATEGORY_UNKNOWN',
        reason: 'CATEGORY_SIGNAL_INSUFFICIENT',
        truthState: Alpha2TruthState.unknown,
        algorithmVersion: 'A2_SENSOR_V1',
        evidenceInputs: ['e1'],
      ),
      const Alpha2KnowledgeGap(
        id: 'g2',
        kind: 'CATEGORY_UNKNOWN',
        reason: 'CATEGORY_SIGNAL_INSUFFICIENT',
        truthState: Alpha2TruthState.unknown,
        algorithmVersion: 'A2_SENSOR_V1',
        evidenceInputs: ['e2'],
      ),
      const Alpha2KnowledgeGap(
        id: 'g3',
        kind: 'ACCOUNT_MAPPING',
        reason: 'ACCOUNT_MAPPING_REQUIRED',
        truthState: Alpha2TruthState.unknown,
        algorithmVersion: 'A2_SENSOR_V1',
        evidenceInputs: [],
      ),
    ];
    final result = summarizeAlpha2KnowledgeGaps(
      Alpha2PublicDashboardProjection(
        transactions: const [],
        cashflow: const [],
        recurringCandidates: const [],
        knowledgeGaps: gaps,
        monthlyState: null,
      ),
    );

    expect(result, hasLength(2));
    expect(result.first.kind, 'ACCOUNT_MAPPING');
    expect(result.first.count, 1);
    expect(result.last.kind, 'CATEGORY_UNKNOWN');
    expect(result.last.count, 2);
  });
}
