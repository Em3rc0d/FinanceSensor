import 'alpha2_models.dart';

/// Local read model only. Never serialized to ALPHA2_PUBLIC_DASHBOARD_V1.
DateTime alpha2LimaTime(DateTime instant) =>
    instant.toUtc().subtract(const Duration(hours: 5));

class Alpha2ReportScope {
  const Alpha2ReportScope({
    this.year,
    this.month,
    this.accountId,
    this.unassignedOnly = false,
  }) : assert((year == null) == (month == null)),
       assert(month == null || (month >= 1 && month <= 12)),
       assert(accountId == null || !unassignedOnly);

  factory Alpha2ReportScope.current(DateTime Function() clock) {
    final local = alpha2LimaTime(clock());
    return Alpha2ReportScope(year: local.year, month: local.month);
  }

  final int? year;
  final int? month;
  final String? accountId;
  final bool unassignedOnly;

  bool includes(
    Alpha2CanonicalTransaction event,
    Set<String> confirmedAccounts,
  ) {
    final local = alpha2LimaTime(event.occurredAt);
    if (year != null && (local.year != year || local.month != month))
      return false;
    if (unassignedOnly) return !confirmedAccounts.contains(event.accountId);
    if (accountId != null) {
      return confirmedAccounts.contains(accountId) &&
          event.accountId == accountId;
    }
    return true;
  }
}

enum Alpha2ReportKind {
  income,
  consumption,
  fee,
  withdrawal,
  cardPayment,
  transfer,
  refund,
  reversal,
  unknown,
}

Alpha2ReportKind alpha2ReportKind(Alpha2SemanticType semantic) =>
    switch (semantic) {
      Alpha2SemanticType.income => Alpha2ReportKind.income,
      Alpha2SemanticType.expense ||
      Alpha2SemanticType.servicePayment => Alpha2ReportKind.consumption,
      Alpha2SemanticType.fee => Alpha2ReportKind.fee,
      Alpha2SemanticType.cashWithdrawal => Alpha2ReportKind.withdrawal,
      Alpha2SemanticType.cardPayment => Alpha2ReportKind.cardPayment,
      Alpha2SemanticType.internalTransfer ||
      Alpha2SemanticType.externalTransfer => Alpha2ReportKind.transfer,
      Alpha2SemanticType.refund => Alpha2ReportKind.refund,
      Alpha2SemanticType.reversal => Alpha2ReportKind.reversal,
      Alpha2SemanticType.unknown => Alpha2ReportKind.unknown,
    };

String alpha2ReportLabel(Alpha2ReportKind kind) => switch (kind) {
  Alpha2ReportKind.income => 'Ingresos registrados',
  Alpha2ReportKind.consumption => 'Consumo identificado',
  Alpha2ReportKind.fee => 'Comisiones identificadas',
  Alpha2ReportKind.withdrawal => 'Retiros de efectivo',
  Alpha2ReportKind.cardPayment => 'Pagos de tarjeta',
  Alpha2ReportKind.transfer => 'Transferencias',
  Alpha2ReportKind.refund => 'Reembolsos sin compensar',
  Alpha2ReportKind.reversal => 'Reversiones sin compensar',
  Alpha2ReportKind.unknown => 'Pendientes de interpretar',
};

bool alpha2NeedsSpendingCategory(Alpha2CanonicalTransaction event) =>
    (event.semanticType == Alpha2SemanticType.expense ||
        event.semanticType == Alpha2SemanticType.servicePayment ||
        event.semanticType == Alpha2SemanticType.fee) &&
    (event.categoryName?.trim().isEmpty ?? true);

int alpha2RegisteredMinorUnits(double amount) {
  if (!amount.isFinite || amount <= 0)
    throw ArgumentError('RES_AMOUNT_INVALID');
  final scaled = amount * 100;
  if (scaled > 9007199254740991 || (scaled - scaled.round()).abs() > 0.000001) {
    throw ArgumentError('RES_AMOUNT_PRECISION_INVALID');
  }
  return scaled.round();
}

class Alpha2RegisteredBucket {
  Alpha2RegisteredBucket({
    required this.currency,
    required this.kind,
    required List<Alpha2CanonicalTransaction> events,
  }) : events = List.unmodifiable(events),
       minorUnits = events.fold<int>(
         0,
         (sum, e) => sum + alpha2RegisteredMinorUnits(e.amount),
       );
  final String currency;
  final Alpha2ReportKind kind;
  final List<Alpha2CanonicalTransaction> events;
  final int minorUnits;
}

class Alpha2RegisteredSummary {
  Alpha2RegisteredSummary({
    required this.tenantId,
    required this.scope,
    required List<Alpha2CanonicalTransaction> events,
    Set<String> confirmedAccounts = const {},
  }) {
    final ids = <String>{};
    final selected =
        events.where((event) {
          if (event.tenantId != tenantId) return false;
          if (!ids.add(event.id))
            throw ArgumentError('RES_DUPLICATE_CANONICAL_ID');
          return scope.includes(event, confirmedAccounts);
        }).toList()..sort((a, b) {
          final order = b.occurredAt.compareTo(a.occurredAt);
          return order != 0 ? order : a.id.compareTo(b.id);
        });
    transactions = List.unmodifiable(selected);
    final groups = <String, List<Alpha2CanonicalTransaction>>{};
    for (final event in selected) {
      final key =
          '${event.currency.toUpperCase()}|${alpha2ReportKind(event.semanticType).name}';
      groups.putIfAbsent(key, () => []).add(event);
    }
    final keys = groups.keys.toList()..sort();
    buckets = List.unmodifiable(
      keys.map((key) {
        final rows = groups[key]!;
        return Alpha2RegisteredBucket(
          currency: rows.first.currency.toUpperCase(),
          kind: alpha2ReportKind(rows.first.semanticType),
          events: rows,
        );
      }),
    );
  }
  final String tenantId;
  final Alpha2ReportScope scope;
  late final List<Alpha2CanonicalTransaction> transactions;
  late final List<Alpha2RegisteredBucket> buckets;
  int get categoryPendingCount =>
      transactions.where(alpha2NeedsSpendingCategory).length;
  int get interpretationPendingCount => transactions
      .where((e) => e.semanticType == Alpha2SemanticType.unknown)
      .length;
  // No source/account/period coverage certificate is attached to this read model.
  String get coverageLabel =>
      'Cobertura parcial: este resumen no acredita un periodo completo.';
}

List<Alpha2Evidence> alpha2LocalProvenance({
  required Alpha2CanonicalTransaction event,
  required String tenantId,
  required List<Alpha2Evidence> evidence,
}) {
  if (event.tenantId != tenantId) return const [];
  final ids = event.evidenceIds.toSet();
  return List.unmodifiable(
    evidence.where(
      (item) => item.tenantId == tenantId && ids.contains(item.evidenceId),
    ),
  );
}
