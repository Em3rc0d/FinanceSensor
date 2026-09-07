enum Alpha2TruthState { unknown, partial, observed, posted, reconciled }

enum Alpha2EvidenceChannel {
  gmailTransaction,
  statementLedger,
  merchantReceipt,
  userConfirmation,
  other,
}

enum Alpha2SemanticType {
  expense,
  income,
  fee,
  cashWithdrawal,
  servicePayment,
  cardPayment,
  internalTransfer,
  externalTransfer,
  refund,
  reversal,
  unknown,
}

enum Alpha2FlowDirection { inflow, outflow, unknown }

class Alpha2Evidence {
  const Alpha2Evidence({
    required this.evidenceId,
    required this.tenantId,
    required this.amount,
    required this.currency,
    required this.occurredAt,
    required this.semanticType,
    required this.channel,
    required this.truthState,
    this.institutionCode,
    this.accountId,
    this.instrumentId,
    this.merchantCanonical,
    this.externalReference,
    this.statementPeriodId,
    this.categoryName,
    this.flowDirection = Alpha2FlowDirection.unknown,
  });

  final String evidenceId;
  final String tenantId;
  final double amount;
  final String currency;
  final DateTime occurredAt;
  final Alpha2SemanticType semanticType;
  final Alpha2EvidenceChannel channel;
  final Alpha2TruthState truthState;
  final String? institutionCode;
  final String? accountId;
  final String? instrumentId;
  final String? merchantCanonical;
  final String? externalReference;
  final String? statementPeriodId;
  final String? categoryName;
  final Alpha2FlowDirection flowDirection;

  Alpha2Evidence normalized() {
    final normalizedCurrency = currency.trim().toUpperCase();
    if (evidenceId.trim().isEmpty) {
      throw ArgumentError('ALPHA2_EVIDENCE_ID_REQUIRED');
    }
    if (tenantId.trim().isEmpty) {
      throw ArgumentError('ALPHA2_EVIDENCE_TENANT_REQUIRED');
    }
    if (!RegExp(r'^[A-Z]{3}$').hasMatch(normalizedCurrency)) {
      throw ArgumentError('ALPHA2_EVIDENCE_CURRENCY_INVALID');
    }
    if (!amount.isFinite || amount <= 0) {
      throw ArgumentError('ALPHA2_EVIDENCE_AMOUNT_INVALID');
    }
    return Alpha2Evidence(
      evidenceId: evidenceId.trim(),
      tenantId: tenantId.trim(),
      amount: amount.abs(),
      currency: normalizedCurrency,
      occurredAt: occurredAt.toUtc(),
      semanticType: semanticType,
      channel: channel,
      truthState: truthState,
      institutionCode: _nullableUpper(institutionCode),
      accountId: _nullableTrim(accountId),
      instrumentId: _nullableTrim(instrumentId),
      merchantCanonical: normalizeMerchant(merchantCanonical),
      externalReference: _nullableTrim(externalReference),
      statementPeriodId: _nullableTrim(statementPeriodId),
      categoryName: _nullableTrim(categoryName),
      flowDirection: flowDirection,
    );
  }

  Map<String, Object?> toSafeDiagnosticMap() => <String, Object?>{
        'evidenceId': evidenceId,
        'tenantId': tenantId,
        'amount': amount,
        'currency': currency,
        'occurredAt': occurredAt.toUtc().toIso8601String(),
        'semanticType': semanticType.name,
        'channel': channel.name,
        'truthState': truthState.name,
        'institutionCode': institutionCode,
        'accountId': accountId,
        'instrumentId': instrumentId,
        'merchantCanonical': merchantCanonical,
        'statementPeriodId': statementPeriodId,
        'categoryName': categoryName,
        'flowDirection': flowDirection.name,
      };
}

class Alpha2CanonicalTransaction {
  const Alpha2CanonicalTransaction({
    required this.id,
    required this.tenantId,
    required this.evidenceIds,
    required this.amount,
    required this.currency,
    required this.occurredAt,
    required this.semanticType,
    required this.truthState,
    required this.flowDirection,
    this.merchantCanonical,
    this.categoryName,
    this.accountId,
    this.instrumentId,
  });

  final String id;
  final String tenantId;
  final List<String> evidenceIds;
  final double amount;
  final String currency;
  final DateTime occurredAt;
  final Alpha2SemanticType semanticType;
  final Alpha2TruthState truthState;
  final Alpha2FlowDirection flowDirection;
  final String? merchantCanonical;
  final String? categoryName;
  final String? accountId;
  final String? instrumentId;

  Alpha2CanonicalTransaction copyWith({
    String? id,
    List<String>? evidenceIds,
    double? amount,
    String? currency,
    DateTime? occurredAt,
    Alpha2SemanticType? semanticType,
    Alpha2TruthState? truthState,
    Alpha2FlowDirection? flowDirection,
    String? merchantCanonical,
    String? categoryName,
    String? accountId,
    String? instrumentId,
  }) =>
      Alpha2CanonicalTransaction(
        id: id ?? this.id,
        tenantId: tenantId,
        evidenceIds: evidenceIds ?? this.evidenceIds,
        amount: amount ?? this.amount,
        currency: currency ?? this.currency,
        occurredAt: occurredAt ?? this.occurredAt,
        semanticType: semanticType ?? this.semanticType,
        truthState: truthState ?? this.truthState,
        flowDirection: flowDirection ?? this.flowDirection,
        merchantCanonical: merchantCanonical ?? this.merchantCanonical,
        categoryName: categoryName ?? this.categoryName,
        accountId: accountId ?? this.accountId,
        instrumentId: instrumentId ?? this.instrumentId,
      );
}

String? normalizeMerchant(String? value) {
  final raw = value?.trim().toLowerCase() ?? '';
  if (raw.isEmpty) return null;
  return raw
      .replaceAll(RegExp(r'[^a-z0-9áéíóúüñ]+', caseSensitive: false), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

String? _nullableTrim(String? value) {
  final normalized = value?.trim();
  return normalized == null || normalized.isEmpty ? null : normalized;
}

String? _nullableUpper(String? value) => _nullableTrim(value)?.toUpperCase();

String alpha2TruthStateWire(Alpha2TruthState value) => switch (value) {
      Alpha2TruthState.unknown => 'UNKNOWN',
      Alpha2TruthState.partial => 'PARTIAL',
      Alpha2TruthState.observed => 'OBSERVED',
      Alpha2TruthState.posted => 'POSTED',
      Alpha2TruthState.reconciled => 'RECONCILED',
    };

String alpha2SemanticWire(Alpha2SemanticType value) => switch (value) {
      Alpha2SemanticType.expense => 'EXPENSE',
      Alpha2SemanticType.income => 'INCOME',
      Alpha2SemanticType.fee => 'FEE',
      Alpha2SemanticType.cashWithdrawal => 'CASH_WITHDRAWAL',
      Alpha2SemanticType.servicePayment => 'SERVICE_PAYMENT',
      Alpha2SemanticType.cardPayment => 'CARD_PAYMENT',
      Alpha2SemanticType.internalTransfer => 'INTERNAL_TRANSFER',
      Alpha2SemanticType.externalTransfer => 'EXTERNAL_TRANSFER',
      Alpha2SemanticType.refund => 'REFUND',
      Alpha2SemanticType.reversal => 'REVERSAL',
      Alpha2SemanticType.unknown => 'UNKNOWN',
    };
