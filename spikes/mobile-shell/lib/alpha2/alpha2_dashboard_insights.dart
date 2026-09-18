import 'alpha2_models.dart';
import 'alpha2_projection.dart';

/// Presentation-only aggregation for the Alpha.2 dashboard.
///
/// This file does not create financial truth. It only groups fields that are
/// already present in the minimized public projection. Currencies stay
/// separated and non-cashflow semantics are excluded from expense summaries.
class Alpha2CategorySummary {
  const Alpha2CategorySummary({
    required this.category,
    required this.currency,
    required this.expense,
    required this.transactionCount,
  });

  final String category;
  final String currency;
  final double expense;
  final int transactionCount;
}

class Alpha2GapSummary {
  const Alpha2GapSummary({
    required this.kind,
    required this.reason,
    required this.count,
  });

  final String kind;
  final String reason;
  final int count;
}

List<Alpha2CategorySummary> summarizeAlpha2Categories(
  Alpha2PublicDashboardProjection projection,
) {
  final totals = <String, double>{};
  final counts = <String, int>{};
  final labels = <String, (String, String)>{};

  for (final item in projection.transactions) {
    final category = item.category?.trim();
    if (category == null || category.isEmpty) continue;
    if (item.flowDirection != Alpha2FlowDirection.outflow) continue;
    if (!_expenseCategoryEligible(item.semanticType)) continue;

    final currency = item.currency.toUpperCase();
    final key = '$currency|$category';
    totals[key] = (totals[key] ?? 0) + item.amount.abs();
    counts[key] = (counts[key] ?? 0) + 1;
    labels[key] = (category, currency);
  }

  final result = totals.entries.map((entry) {
    final label = labels[entry.key]!;
    return Alpha2CategorySummary(
      category: label.$1,
      currency: label.$2,
      expense: entry.value,
      transactionCount: counts[entry.key]!,
    );
  }).toList()
    ..sort((a, b) {
      final byCurrency = a.currency.compareTo(b.currency);
      if (byCurrency != 0) return byCurrency;
      final byExpense = b.expense.compareTo(a.expense);
      if (byExpense != 0) return byExpense;
      return a.category.compareTo(b.category);
    });

  return List<Alpha2CategorySummary>.unmodifiable(result);
}

List<Alpha2GapSummary> summarizeAlpha2KnowledgeGaps(
  Alpha2PublicDashboardProjection projection,
) {
  final counts = <String, int>{};
  final values = <String, (String, String)>{};
  for (final gap in projection.knowledgeGaps) {
    final key = '${gap.kind}|${gap.reason}';
    counts[key] = (counts[key] ?? 0) + 1;
    values[key] = (gap.kind, gap.reason);
  }
  final result = counts.entries.map((entry) {
    final value = values[entry.key]!;
    return Alpha2GapSummary(
      kind: value.$1,
      reason: value.$2,
      count: entry.value,
    );
  }).toList()
    ..sort((a, b) {
      final byKind = a.kind.compareTo(b.kind);
      return byKind != 0 ? byKind : a.reason.compareTo(b.reason);
    });
  return List<Alpha2GapSummary>.unmodifiable(result);
}

bool _expenseCategoryEligible(Alpha2SemanticType semantic) => switch (semantic) {
      Alpha2SemanticType.expense ||
      Alpha2SemanticType.fee ||
      Alpha2SemanticType.cashWithdrawal ||
      Alpha2SemanticType.servicePayment => true,
      Alpha2SemanticType.income ||
      Alpha2SemanticType.cardPayment ||
      Alpha2SemanticType.internalTransfer ||
      Alpha2SemanticType.externalTransfer ||
      Alpha2SemanticType.refund ||
      Alpha2SemanticType.reversal ||
      Alpha2SemanticType.unknown => false,
    };
