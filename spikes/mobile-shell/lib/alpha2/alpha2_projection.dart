import 'alpha2_models.dart';
import 'alpha2_monthly_coverage.dart';
import 'alpha2_sensor_v1.dart';

class Alpha2PublicTransaction {
  const Alpha2PublicTransaction({
    required this.id,
    required this.occurredAt,
    required this.amount,
    required this.currency,
    required this.semanticType,
    required this.truthState,
    required this.flowDirection,
    this.merchant,
    this.category,
    this.accountDisplay,
  });

  final String id;
  final DateTime occurredAt;
  final double amount;
  final String currency;
  final Alpha2SemanticType semanticType;
  final Alpha2TruthState truthState;
  final Alpha2FlowDirection flowDirection;
  final String? merchant;
  final String? category;
  final String? accountDisplay;

  Map<String, Object?> toJson() => <String, Object?>{
        'id': id,
        'occurredAt': occurredAt.toUtc().toIso8601String(),
        'amount': amount,
        'currency': currency,
        'semanticType': alpha2SemanticWire(semanticType),
        'truthState': alpha2TruthStateWire(truthState),
        'flowDirection': switch (flowDirection) {
          Alpha2FlowDirection.inflow => 'INFLOW',
          Alpha2FlowDirection.outflow => 'OUTFLOW',
          Alpha2FlowDirection.unknown => 'UNKNOWN',
        },
        if (merchant != null) 'merchant': merchant,
        if (category != null) 'category': category,
        if (accountDisplay != null) 'account': accountDisplay,
      };
}

class Alpha2PublicMonthlyState {
  const Alpha2PublicMonthlyState({
    required this.status,
    required this.includedSources,
    required this.reconciledIncludedSources,
    required this.pendingStatements,
    required this.unresolvedItems,
    required this.blockingConflicts,
    required this.userExcludedSources,
    required this.notAvailableSources,
  });

  final String status;
  final int includedSources;
  final int reconciledIncludedSources;
  final int pendingStatements;
  final int unresolvedItems;
  final int blockingConflicts;
  final int userExcludedSources;
  final int notAvailableSources;

  Map<String, Object?> toJson() => <String, Object?>{
        'status': status,
        'includedSources': includedSources,
        'reconciledIncludedSources': reconciledIncludedSources,
        'pendingStatements': pendingStatements,
        'unresolvedItems': unresolvedItems,
        'blockingConflicts': blockingConflicts,
        'userExcludedSources': userExcludedSources,
        'notAvailableSources': notAvailableSources,
      };
}

class Alpha2PublicDashboardProjection {
  const Alpha2PublicDashboardProjection({
    required this.transactions,
    required this.cashflow,
    required this.recurringCandidates,
    required this.knowledgeGaps,
    required this.monthlyState,
  });

  final List<Alpha2PublicTransaction> transactions;
  final List<Alpha2CashflowPeriod> cashflow;
  final List<Alpha2RecurringCandidate> recurringCandidates;
  final List<Alpha2KnowledgeGap> knowledgeGaps;
  final Alpha2PublicMonthlyState? monthlyState;

  Map<String, Object?> toJson() => <String, Object?>{
        'schema': 'ALPHA2_PUBLIC_DASHBOARD_V1',
        'transactions': transactions.map((item) => item.toJson()).toList(),
        'cashflow': cashflow
            .map(
              (item) => <String, Object?>{
                'currency': item.currency,
                'income': item.income,
                'expense': item.expense,
                'net': item.net,
                'truthState': alpha2TruthStateWire(item.truthState),
              },
            )
            .toList(),
        'recurringCandidates': recurringCandidates
            .map(
              (item) => <String, Object?>{
                'id': item.id,
                'state': item.state,
                'cadence': item.cadence,
                'merchant': item.merchantCanonical,
                'currency': item.currency,
                'semanticType': alpha2SemanticWire(item.semanticType),
                'occurrenceCount': item.occurrenceCount,
                'truthState': alpha2TruthStateWire(item.truthState),
              },
            )
            .toList(),
        'knowledgeGaps': knowledgeGaps
            .map(
              (item) => <String, Object?>{
                'id': item.id,
                'kind': item.kind,
                'reason': item.reason,
                'truthState': alpha2TruthStateWire(item.truthState),
              },
            )
            .toList(),
        if (monthlyState != null) 'monthlyState': monthlyState!.toJson(),
      };
}

Alpha2PublicDashboardProjection buildAlpha2PublicProjection({
  required List<Alpha2CanonicalTransaction> canonicalTransactions,
  required Alpha2MonthlyCloseEvaluation? monthlyClose,
}) {
  final sorted = List<Alpha2CanonicalTransaction>.from(canonicalTransactions)
    ..sort((a, b) {
      final byDate = b.occurredAt.compareTo(a.occurredAt);
      return byDate != 0 ? byDate : a.id.compareTo(b.id);
    });
  final transactions = sorted
      .map(
        (event) => Alpha2PublicTransaction(
          id: event.id,
          occurredAt: event.occurredAt,
          amount: event.amount,
          currency: event.currency,
          semanticType: event.semanticType,
          truthState: event.truthState,
          flowDirection: event.flowDirection,
          merchant: event.merchantCanonical,
          category: event.categoryName,
          accountDisplay: _safeAccountDisplay(event.accountId, event.instrumentId),
        ),
      )
      .toList();
  final cashflow = deriveAlpha2CashflowByCurrency(
    events: sorted,
    monthlyClose: monthlyClose,
  );
  final recurrence = deriveAlpha2RecurringCandidates(sorted);
  final gaps = deriveAlpha2KnowledgeGaps(
    events: sorted,
    monthlyClose: monthlyClose,
  );
  final monthlyState = monthlyClose == null
      ? null
      : Alpha2PublicMonthlyState(
          status: alpha2MonthlyCloseStatusWire(monthlyClose.status),
          includedSources: monthlyClose.includedCount,
          reconciledIncludedSources: monthlyClose.reconciledIncludedCount,
          pendingStatements: monthlyClose.missingStatementCount,
          unresolvedItems: monthlyClose.unresolvedCount,
          blockingConflicts: monthlyClose.blockingConflictCount,
          userExcludedSources: monthlyClose.userExcludedCount,
          notAvailableSources: monthlyClose.notAvailableCount,
        );
  return Alpha2PublicDashboardProjection(
    transactions: List<Alpha2PublicTransaction>.unmodifiable(transactions),
    cashflow: cashflow,
    recurringCandidates: recurrence,
    knowledgeGaps: gaps,
    monthlyState: monthlyState,
  );
}

String? _safeAccountDisplay(String? accountId, String? instrumentId) {
  final value = accountId ?? instrumentId;
  if (value == null || value.isEmpty) return null;
  // Canonical ids are opaque application identifiers, not raw bank account numbers.
  // The web receives only a shortened display token.
  return value.length <= 8 ? value : '…${value.substring(value.length - 6)}';
}

const Set<String> alpha2ForbiddenPublicProjectionKeys = <String>{
  'confidence',
  'matchScore',
  'evidencePercent',
  'evidencePercentage',
  'messageId',
  'attachmentId',
  'gmailMessageId',
  'rawGmailBody',
  'rawMime',
  'rawPdf',
  'pdfPassword',
  'externalReference',
};
