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
  Map<String, int> statementStatusCounts = const <String, int>{},
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
  final gaps = <Alpha2KnowledgeGap>[
    ...deriveAlpha2KnowledgeGaps(
      events: sorted,
      monthlyClose: monthlyClose,
    ),
    ..._statementOutcomeGaps(statementStatusCounts),
  ]..sort((a, b) => a.id.compareTo(b.id));
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
    knowledgeGaps: List<Alpha2KnowledgeGap>.unmodifiable(gaps),
    monthlyState: monthlyState,
  );
}

const String _fetchDiagnosticPrefix = 'FETCH_DIAGNOSTIC:';

List<Alpha2KnowledgeGap> _statementOutcomeGaps(
  Map<String, int> statementStatusCounts,
) {
  const reasons = <String, String>{
    'PASSWORD_REQUIRED': 'STATEMENT_PASSWORD_REQUIRED',
    'PDF_REJECTED': 'STATEMENT_PDF_REJECTED',
    'REVIEW_REQUIRED': 'STATEMENT_STRICT_REVIEW_REQUIRED',
    'PERSISTENCE_REJECTED': 'STATEMENT_PERSISTENCE_REJECTED',
  };
  final gaps = <Alpha2KnowledgeGap>[];

  void addGaps(String idKey, String reason, int count) {
    for (var index = 0; index < count; index += 1) {
      gaps.add(
        Alpha2KnowledgeGap(
          id: 'stmt_gap_${idKey.toLowerCase()}_${index + 1}',
          kind: 'STATEMENT_IMPORT',
          reason: reason,
          truthState: Alpha2TruthState.unknown,
          algorithmVersion: alpha2SensorVersion,
          evidenceInputs: const <String>[],
        ),
      );
    }
  }

  for (final entry in reasons.entries) {
    addGaps(entry.key, entry.value, statementStatusCounts[entry.key] ?? 0);
  }

  final fetchReasonCounts = <String, int>{};
  var classifiedFetchCount = 0;
  for (final entry in statementStatusCounts.entries) {
    if (!entry.key.startsWith(_fetchDiagnosticPrefix) || entry.value <= 0) continue;
    final safeCode = entry.key.substring(_fetchDiagnosticPrefix.length);
    final reason = _statementFetchReason(safeCode);
    fetchReasonCounts[reason] = (fetchReasonCounts[reason] ?? 0) + entry.value;
    classifiedFetchCount += entry.value;
  }
  final totalFetchCount = statementStatusCounts['FETCH_REJECTED'] ?? 0;
  final genericFetchCount = totalFetchCount > classifiedFetchCount
      ? totalFetchCount - classifiedFetchCount
      : 0;
  if (genericFetchCount > 0) {
    fetchReasonCounts['STATEMENT_FETCH_REJECTED'] =
        (fetchReasonCounts['STATEMENT_FETCH_REJECTED'] ?? 0) + genericFetchCount;
  }
  for (final entry in fetchReasonCounts.entries) {
    addGaps('fetch_${entry.key}', entry.key, entry.value);
  }

  return gaps;
}

String _statementFetchReason(String safeCode) {
  final code = safeCode.trim().toUpperCase();
  if (code == 'REAUTH_REQUIRED') return 'STATEMENT_REAUTH_REQUIRED';
  if (code == 'ALPHA2_STATEMENT_ATTACHMENT_TIMEOUT' ||
      code == 'ALPHA2_STATEMENT_ATTACHMENT_IO_RETRY_EXHAUSTED') {
    return 'STATEMENT_FETCH_NETWORK_RETRY_EXHAUSTED';
  }
  if (code == 'ALPHA2_STATEMENT_GMAIL_HTTP_429') {
    return 'STATEMENT_FETCH_RATE_LIMITED';
  }
  final httpMatch = RegExp(r'^ALPHA2_STATEMENT_GMAIL_HTTP_(\d{3})$').firstMatch(code);
  if (httpMatch != null) {
    final status = int.tryParse(httpMatch.group(1) ?? '');
    if (status == 403) return 'STATEMENT_FETCH_ACCESS_REJECTED';
    if (status == 404) return 'STATEMENT_ATTACHMENT_NOT_FOUND';
    if (status == 408 || (status != null && status >= 500 && status <= 599)) {
      return 'STATEMENT_FETCH_SERVICE_TEMPORARY';
    }
    return 'STATEMENT_FETCH_REJECTED';
  }
  if (code == 'ALPHA2_STATEMENT_ATTACHMENT_EMPTY' ||
      code == 'ALPHA2_STATEMENT_ATTACHMENT_INVALID_BASE64' ||
      code == 'ALPHA2_STATEMENT_ATTACHMENT_SIZE_INVALID' ||
      code == 'ALPHA2_STATEMENT_ATTACHMENT_SIZE_MISMATCH' ||
      code == 'ALPHA2_STATEMENT_ATTACHMENT_RESPONSE_INVALID' ||
      code == 'ALPHA2_STATEMENT_BYTES_EMPTY') {
    return 'STATEMENT_ATTACHMENT_INVALID';
  }
  if (code == 'ALPHA2_STATEMENT_PDF_SIGNATURE_INVALID') {
    return 'STATEMENT_PDF_SIGNATURE_INVALID';
  }
  return 'STATEMENT_FETCH_REJECTED';
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
