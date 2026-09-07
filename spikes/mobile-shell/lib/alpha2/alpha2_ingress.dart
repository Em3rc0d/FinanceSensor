import 'package:flutter/services.dart';

import 'alpha2_models.dart';

const String alpha2PlatformChannelName = 'com.financesensor.platform/alpha2';

class Alpha2StatementCandidateHandle {
  const Alpha2StatementCandidateHandle({
    required this.handle,
    required this.profileId,
    required this.institutionCode,
    required this.productType,
    required this.state,
    required this.byteLength,
    required this.requiresLocalPassword,
    required this.fetchEligible,
  });

  final String handle;
  final String profileId;
  final String institutionCode;
  final String productType;
  final String state;
  final int byteLength;
  final bool requiresLocalPassword;
  final bool fetchEligible;

  factory Alpha2StatementCandidateHandle.fromMap(Map<Object?, Object?> raw) {
    final handle = raw['handle'] as String? ?? '';
    final profileId = raw['profileId'] as String? ?? '';
    final institution = raw['institutionCode'] as String? ?? '';
    final productType = raw['productType'] as String? ?? '';
    final state = raw['state'] as String? ?? '';
    final byteLength = raw['byteLength'] is int ? raw['byteLength'] as int : -1;
    if (handle.isEmpty ||
        profileId.isEmpty ||
        institution.isEmpty ||
        productType.isEmpty ||
        state.isEmpty ||
        byteLength <= 0) {
      throw const FormatException('ALPHA2_STATEMENT_HANDLE_INVALID');
    }
    return Alpha2StatementCandidateHandle(
      handle: handle,
      profileId: profileId,
      institutionCode: institution.toUpperCase(),
      productType: productType.toUpperCase(),
      state: state.toUpperCase(),
      byteLength: byteLength,
      requiresLocalPassword: raw['requiresLocalPassword'] == true,
      fetchEligible: raw['fetchEligible'] == true,
    );
  }
}

class Alpha2IngressBatch {
  const Alpha2IngressBatch({
    required this.gmailEvidence,
    required this.statementCandidates,
    required this.coverage,
  });

  final List<Alpha2Evidence> gmailEvidence;
  final List<Alpha2StatementCandidateHandle> statementCandidates;
  final String coverage;
}

abstract interface class Alpha2IngressSource {
  Future<Alpha2IngressBatch> scan();
  Future<Uint8List> fetchStatementBytes(String candidateHandle);
  Future<void> releaseStatementHandle(String candidateHandle);
}

class Alpha2PlatformIngressSource implements Alpha2IngressSource {
  const Alpha2PlatformIngressSource({
    MethodChannel channel = const MethodChannel(alpha2PlatformChannelName),
  }) : _channel = channel;

  final MethodChannel _channel;

  @override
  Future<Alpha2IngressBatch> scan() async {
    final raw = await _channel.invokeMapMethod<Object?, Object?>('scanFinancialSources') ??
        const <Object?, Object?>{};
    final gmailRows = raw['gmailEvidence'];
    final candidateRows = raw['statementCandidates'];
    final gmail = <Alpha2Evidence>[];
    final candidates = <Alpha2StatementCandidateHandle>[];

    if (gmailRows is List<Object?>) {
      for (final row in gmailRows) {
        if (row is Map<Object?, Object?>) gmail.add(_gmailEvidenceFromMap(row));
      }
    }
    if (candidateRows is List<Object?>) {
      for (final row in candidateRows) {
        if (row is Map<Object?, Object?>) {
          candidates.add(Alpha2StatementCandidateHandle.fromMap(row));
        }
      }
    }
    return Alpha2IngressBatch(
      gmailEvidence: List<Alpha2Evidence>.unmodifiable(gmail),
      statementCandidates:
          List<Alpha2StatementCandidateHandle>.unmodifiable(candidates),
      coverage: raw['coverage'] as String? ?? 'UNKNOWN',
    );
  }

  @override
  Future<Uint8List> fetchStatementBytes(String candidateHandle) async {
    if (candidateHandle.trim().isEmpty) {
      throw ArgumentError('ALPHA2_STATEMENT_HANDLE_REQUIRED');
    }
    final bytes = await _channel.invokeMethod<Uint8List>(
      'fetchStatementBytes',
      <String, Object?>{'handle': candidateHandle},
    );
    if (bytes == null || bytes.isEmpty) {
      throw StateError('ALPHA2_STATEMENT_BYTES_EMPTY');
    }
    return bytes;
  }

  @override
  Future<void> releaseStatementHandle(String candidateHandle) =>
      _channel.invokeMethod<void>(
        'releaseStatementHandle',
        <String, Object?>{'handle': candidateHandle},
      );
}

Alpha2Evidence _gmailEvidenceFromMap(Map<Object?, Object?> raw) {
  final receiptId = raw['sourceReceiptId'] as String? ?? '';
  final amount = raw['amount'];
  final occurredAtRaw = raw['occurredAt'] as String? ?? '';
  final occurredAt = DateTime.tryParse(occurredAtRaw);
  if (receiptId.isEmpty || amount is! num || occurredAt == null) {
    throw const FormatException('ALPHA2_GMAIL_EVIDENCE_INVALID');
  }
  return Alpha2Evidence(
    evidenceId: 'gmail:$receiptId',
    tenantId: raw['tenantId'] as String? ?? 'LOCAL_PRIMARY',
    amount: amount.toDouble(),
    currency: raw['currency'] as String? ?? '',
    occurredAt: occurredAt,
    semanticType: _semanticFromWire(raw['semanticType'] as String?),
    channel: Alpha2EvidenceChannel.gmailTransaction,
    truthState: Alpha2TruthState.observed,
    institutionCode: raw['institutionCode'] as String?,
    accountId: raw['accountId'] as String?,
    instrumentId: raw['instrumentId'] as String?,
    merchantCanonical: raw['merchantCanonical'] as String? ?? raw['merchant'] as String?,
    externalReference: raw['externalReferenceDigest'] as String?,
    categoryName: raw['categoryName'] as String?,
    flowDirection: _directionFromWire(raw['direction'] as String?),
  ).normalized();
}

Alpha2SemanticType _semanticFromWire(String? raw) {
  return switch ((raw ?? '').toUpperCase()) {
    'EXPENSE' || 'PURCHASE' => Alpha2SemanticType.expense,
    'INCOME' || 'DEPOSIT' || 'SALARY' => Alpha2SemanticType.income,
    'FEE' => Alpha2SemanticType.fee,
    'CASH_WITHDRAWAL' => Alpha2SemanticType.cashWithdrawal,
    'SERVICE_PAYMENT' => Alpha2SemanticType.servicePayment,
    'CARD_PAYMENT' => Alpha2SemanticType.cardPayment,
    'INTERNAL_TRANSFER' => Alpha2SemanticType.internalTransfer,
    'EXTERNAL_TRANSFER' || 'P2P_PAYMENT' => Alpha2SemanticType.externalTransfer,
    'REFUND' => Alpha2SemanticType.refund,
    'REVERSAL' => Alpha2SemanticType.reversal,
    _ => Alpha2SemanticType.unknown,
  };
}

Alpha2FlowDirection _directionFromWire(String? raw) {
  return switch ((raw ?? '').toUpperCase()) {
    'IN' || 'INFLOW' => Alpha2FlowDirection.inflow,
    'OUT' || 'OUTFLOW' => Alpha2FlowDirection.outflow,
    _ => Alpha2FlowDirection.unknown,
  };
}

const Set<String> alpha2IngressForbiddenCrossBoundaryFields = <String>{
  'messageId',
  'attachmentId',
  'rawSender',
  'rawSubject',
  'rawFilename',
  'rawBody',
  'rawMime',
  'accessToken',
  'refreshToken',
};
