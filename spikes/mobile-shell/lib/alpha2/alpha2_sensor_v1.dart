import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'alpha2_models.dart';
import 'alpha2_monthly_coverage.dart';

const String alpha2SensorVersion = 'A2_SENSOR_V1';
const String alpha2SensorCategoryVersion = 'A2_BASE_CATEGORY_V1';
const String alpha2SensorRecurrenceVersion = 'A2_RECURRENCE_CANDIDATE_V1';

const List<String> alpha2BaseCategories = <String>[
  'Comida',
  'Transporte',
  'Hogar',
  'Servicios',
  'Compras',
  'Entretenimiento',
  'Suscripciones',
  'Salud',
  'Estudios',
  'Viajes',
  'Familia',
  'Mascotas',
  'Comisiones',
  'Impuestos',
  'Otros',
];

const Map<String, List<int>> alpha2CadenceWindowsDays = <String, List<int>>{
  'WEEKLY': <int>[5, 9],
  'MONTHLY': <int>[24, 38],
  'QUARTERLY': <int>[75, 105],
  'YEARLY': <int>[330, 400],
};

class Alpha2CategoryObservation {
  const Alpha2CategoryObservation({
    required this.id,
    required this.eventId,
    required this.category,
    required this.truthState,
    required this.algorithmVersion,
    required this.evidenceInputs,
    required this.reason,
  });

  final String id;
  final String eventId;
  final String? category;
  final Alpha2TruthState truthState;
  final String algorithmVersion;
  final List<String> evidenceInputs;
  final String reason;
}

class Alpha2RecurringCandidate {
  const Alpha2RecurringCandidate({
    required this.id,
    required this.cadence,
    required this.merchantCanonical,
    required this.currency,
    required this.semanticType,
    required this.scopeId,
    required this.occurrenceCount,
    required this.minimumAmount,
    required this.medianAmount,
    required this.maximumAmount,
    required this.truthState,
    required this.algorithmVersion,
    required this.evidenceInputs,
  });

  final String id;
  final String cadence;
  final String merchantCanonical;
  final String currency;
  final Alpha2SemanticType semanticType;
  final String? scopeId;
  final int occurrenceCount;
  final double minimumAmount;
  final double medianAmount;
  final double maximumAmount;
  final Alpha2TruthState truthState;
  final String algorithmVersion;
  final List<String> evidenceInputs;

  String get state => 'CANDIDATE';
}

class Alpha2CashflowPeriod {
  const Alpha2CashflowPeriod({
    required this.currency,
    required this.income,
    required this.expense,
    required this.net,
    required this.truthState,
    required this.algorithmVersion,
    required this.evidenceInputs,
  });

  final String currency;
  final double income;
  final double expense;
  final double net;
  final Alpha2TruthState truthState;
  final String algorithmVersion;
  final List<String> evidenceInputs;
}

class Alpha2KnowledgeGap {
  const Alpha2KnowledgeGap({
    required this.id,
    required this.kind,
    required this.reason,
    required this.truthState,
    required this.algorithmVersion,
    required this.evidenceInputs,
  });

  final String id;
  final String kind;
  final String reason;
  final Alpha2TruthState truthState;
  final String algorithmVersion;
  final List<String> evidenceInputs;
}

Alpha2CategoryObservation alpha2BaseCategoryObservation(
  Alpha2CanonicalTransaction event,
) {
  final explicit = _normalizedBaseCategory(event.categoryName);
  final category = explicit ??
      (event.semanticType == Alpha2SemanticType.fee ? 'Comisiones' : null);
  if (category == null) {
    return Alpha2CategoryObservation(
      id: _deterministicId(
        'catgap',
        '$alpha2SensorCategoryVersion|${event.id}',
      ),
      eventId: event.id,
      category: null,
      truthState: Alpha2TruthState.unknown,
      algorithmVersion: alpha2SensorCategoryVersion,
      evidenceInputs: <String>[event.id],
      reason: 'CATEGORY_SIGNAL_INSUFFICIENT',
    );
  }
  return Alpha2CategoryObservation(
    id: _deterministicId(
      'catobs',
      '$alpha2SensorCategoryVersion|${event.id}|$category',
    ),
    eventId: event.id,
    category: category,
    truthState: event.truthState,
    algorithmVersion: alpha2SensorCategoryVersion,
    evidenceInputs: <String>[event.id],
    reason: explicit != null ? 'EXPLICIT_BASE_CATEGORY' : 'SEMANTIC_FEE_CATEGORY',
  );
}

List<Alpha2RecurringCandidate> deriveAlpha2RecurringCandidates(
  List<Alpha2CanonicalTransaction> events,
) {
  final groups = <String, List<Alpha2CanonicalTransaction>>{};
  for (final event in events) {
    if (event.semanticType != Alpha2SemanticType.expense &&
        event.semanticType != Alpha2SemanticType.fee) {
      continue;
    }
    final merchant = normalizeMerchant(event.merchantCanonical);
    if (merchant == null) continue;
    final scope = event.accountId ?? event.instrumentId ?? 'UNSCOPED';
    final key = <String>[
      event.tenantId,
      scope,
      event.currency.toUpperCase(),
      alpha2SemanticWire(event.semanticType),
      merchant,
    ].join('|');
    groups.putIfAbsent(key, () => <Alpha2CanonicalTransaction>[]).add(event);
  }

  final result = <Alpha2RecurringCandidate>[];
  for (final rows in groups.values) {
    rows.sort((a, b) {
      final byDate = a.occurredAt.compareTo(b.occurredAt);
      return byDate != 0 ? byDate : a.id.compareTo(b.id);
    });
    if (rows.length < 3) continue;
    final uniqueDays = rows
        .map((row) => row.occurredAt.toUtc().toIso8601String().substring(0, 10))
        .toSet();
    if (uniqueDays.length < 3) continue;

    final intervals = <int>[];
    for (var index = 1; index < rows.length; index += 1) {
      intervals.add(rows[index].occurredAt.difference(rows[index - 1].occurredAt).inDays);
    }
    final cadence = _cadenceForIntervals(intervals);
    if (cadence == null) continue;

    final evidenceInputs = rows.map((row) => row.id).toSet().toList()..sort();
    final amounts = rows.map((row) => row.amount.abs()).toList()..sort();
    final merchant = normalizeMerchant(rows.first.merchantCanonical)!;
    final payload = <String>[
      alpha2SensorRecurrenceVersion,
      merchant,
      rows.first.currency,
      alpha2SemanticWire(rows.first.semanticType),
      rows.first.accountId ?? rows.first.instrumentId ?? '',
      cadence,
      ...evidenceInputs,
    ].join('|');
    result.add(
      Alpha2RecurringCandidate(
        id: _deterministicId('rec', payload),
        cadence: cadence,
        merchantCanonical: merchant,
        currency: rows.first.currency,
        semanticType: rows.first.semanticType,
        scopeId: rows.first.accountId ?? rows.first.instrumentId,
        occurrenceCount: rows.length,
        minimumAmount: amounts.first,
        medianAmount: _median(amounts),
        maximumAmount: amounts.last,
        truthState: Alpha2TruthState.observed,
        algorithmVersion: alpha2SensorRecurrenceVersion,
        evidenceInputs: List<String>.unmodifiable(evidenceInputs),
      ),
    );
  }
  result.sort((a, b) => a.id.compareTo(b.id));
  return List<Alpha2RecurringCandidate>.unmodifiable(result);
}

List<Alpha2CashflowPeriod> deriveAlpha2CashflowByCurrency({
  required List<Alpha2CanonicalTransaction> events,
  required Alpha2MonthlyCloseEvaluation? monthlyClose,
}) {
  final byCurrency = <String, List<Alpha2CanonicalTransaction>>{};
  for (final event in events) {
    if (!_cashflowEligible(event.semanticType)) continue;
    byCurrency
        .putIfAbsent(event.currency.toUpperCase(), () => <Alpha2CanonicalTransaction>[])
        .add(event);
  }

  final result = <Alpha2CashflowPeriod>[];
  final currencies = byCurrency.keys.toList()..sort();
  for (final currency in currencies) {
    var income = 0.0;
    var expense = 0.0;
    final ids = <String>[];
    for (final event in byCurrency[currency]!) {
      ids.add(event.id);
      switch (event.semanticType) {
        case Alpha2SemanticType.income:
          income += event.amount.abs();
        case Alpha2SemanticType.expense:
        case Alpha2SemanticType.fee:
        case Alpha2SemanticType.cashWithdrawal:
        case Alpha2SemanticType.servicePayment:
          expense += event.amount.abs();
        case Alpha2SemanticType.cardPayment:
        case Alpha2SemanticType.internalTransfer:
        case Alpha2SemanticType.externalTransfer:
        case Alpha2SemanticType.refund:
        case Alpha2SemanticType.reversal:
        case Alpha2SemanticType.unknown:
          break;
      }
    }
    ids.sort();
    result.add(
      Alpha2CashflowPeriod(
        currency: currency,
        income: income,
        expense: expense,
        net: income - expense,
        truthState: monthlyClose?.status == Alpha2MonthlyCloseStatus.reconciled
            ? Alpha2TruthState.reconciled
            : Alpha2TruthState.partial,
        algorithmVersion: alpha2SensorVersion,
        evidenceInputs: List<String>.unmodifiable(ids),
      ),
    );
  }
  return List<Alpha2CashflowPeriod>.unmodifiable(result);
}

List<Alpha2KnowledgeGap> deriveAlpha2KnowledgeGaps({
  required List<Alpha2CanonicalTransaction> events,
  required Alpha2MonthlyCloseEvaluation? monthlyClose,
}) {
  final gaps = <Alpha2KnowledgeGap>[];
  for (final event in events) {
    final category = alpha2BaseCategoryObservation(event);
    if (category.category == null) {
      gaps.add(
        Alpha2KnowledgeGap(
          id: _deterministicId('gap', 'CATEGORY|${event.id}'),
          kind: 'CATEGORY_UNKNOWN',
          reason: 'CATEGORY_SIGNAL_INSUFFICIENT',
          truthState: Alpha2TruthState.unknown,
          algorithmVersion: alpha2SensorVersion,
          evidenceInputs: <String>[event.id],
        ),
      );
    }
  }

  if (monthlyClose != null) {
    final reasons = monthlyClose.sources
        .expand((source) => source.blockingReasons)
        .toSet()
        .toList()
      ..sort();
    for (final reason in reasons) {
      final sourceIds = monthlyClose.sources
          .where((source) => source.blockingReasons.contains(reason))
          .map((source) => source.id)
          .toList()
        ..sort();
      gaps.add(
        Alpha2KnowledgeGap(
          id: _deterministicId(
            'gap',
            'MONTHLY|${monthlyClose.closeId}|$reason|${sourceIds.join(",")}',
          ),
          kind: 'MONTHLY_COVERAGE',
          reason: reason,
          truthState: Alpha2TruthState.unknown,
          algorithmVersion: alpha2SensorVersion,
          evidenceInputs: List<String>.unmodifiable(sourceIds),
        ),
      );
    }
  }

  gaps.sort((a, b) => a.id.compareTo(b.id));
  return List<Alpha2KnowledgeGap>.unmodifiable(gaps);
}

bool _cashflowEligible(Alpha2SemanticType semantic) => switch (semantic) {
      Alpha2SemanticType.income ||
      Alpha2SemanticType.expense ||
      Alpha2SemanticType.fee ||
      Alpha2SemanticType.cashWithdrawal ||
      Alpha2SemanticType.servicePayment => true,
      Alpha2SemanticType.cardPayment ||
      Alpha2SemanticType.internalTransfer ||
      Alpha2SemanticType.externalTransfer ||
      Alpha2SemanticType.refund ||
      Alpha2SemanticType.reversal ||
      Alpha2SemanticType.unknown => false,
    };

String? _normalizedBaseCategory(String? value) {
  final raw = value?.trim() ?? '';
  if (raw.isEmpty) return null;
  for (final category in alpha2BaseCategories) {
    if (category.toLowerCase() == raw.toLowerCase()) return category;
  }
  return null;
}

String? _cadenceForIntervals(List<int> intervals) {
  if (intervals.length < 2) return null;
  for (final entry in alpha2CadenceWindowsDays.entries) {
    final minimum = entry.value[0];
    final maximum = entry.value[1];
    if (intervals.every((days) => days >= minimum && days <= maximum)) {
      return entry.key;
    }
  }
  return null;
}

double _median(List<double> sorted) {
  final middle = sorted.length ~/ 2;
  if (sorted.length.isOdd) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

String _deterministicId(String prefix, String payload) {
  final digest = sha256.convert(utf8.encode(payload)).toString();
  return '${prefix}_${digest.substring(0, 40)}';
}
