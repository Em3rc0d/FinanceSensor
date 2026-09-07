import 'dart:convert';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';

import 'alpha2_ingress.dart';
import 'alpha2_models.dart';
import 'alpha2_projection.dart';
import 'alpha2_runtime.dart';
import 'alpha2_statement_geometry.dart';
import 'alpha2_vault.dart';

typedef Alpha2StatementPasswordProvider = Future<String?> Function(
  Alpha2StatementCandidateHandle candidate,
);

class Alpha2StatementImportOutcome {
  const Alpha2StatementImportOutcome({
    required this.profileId,
    required this.status,
    required this.evidenceCount,
    required this.reviewCodes,
    this.statementPeriodId,
  });

  final String profileId;
  final String status;
  final int evidenceCount;
  final List<String> reviewCodes;
  final String? statementPeriodId;
}

class Alpha2PipelineResult {
  const Alpha2PipelineResult({
    required this.ingressCoverage,
    required this.gmailEvidenceCount,
    required this.statementOutcomes,
    required this.runtime,
    required this.projection,
  });

  final String ingressCoverage;
  final int gmailEvidenceCount;
  final List<Alpha2StatementImportOutcome> statementOutcomes;
  final Alpha2RuntimeResult runtime;
  final Alpha2PublicDashboardProjection projection;
}

class Alpha2Pipeline {
  const Alpha2Pipeline({
    required this.ingress,
    required this.vault,
    this.pdfReader = const Alpha2StructuredPdfReader(),
    this.bcpSavingsParser = const Alpha2BcpSavingsGeometryParser(),
  });

  final Alpha2IngressSource ingress;
  final Alpha2Vault vault;
  final Alpha2StructuredPdfReader pdfReader;
  final Alpha2BcpSavingsGeometryParser bcpSavingsParser;

  Future<Alpha2PipelineResult> refresh({
    required String tenantId,
    required Alpha2StatementPasswordProvider passwordProvider,
  }) async {
    if (tenantId.trim().isEmpty) {
      throw ArgumentError('ALPHA2_PIPELINE_TENANT_REQUIRED');
    }
    await vault.initialize();
    final batch = await ingress.scan();

    // Gmail-derived observations already cross the platform boundary as minimized,
    // opaque receipts. Persist each independently so replay cannot turn a repeated
    // scan into duplicate financial evidence.
    for (final evidence in batch.gmailEvidence) {
      final normalized = evidence.normalized();
      await vault.commitEvidenceBatch(
        sourceReceiptId: _gmailSourceReceipt(normalized.evidenceId),
        evidence: <Alpha2Evidence>[normalized],
        terminalState: 'IMPORTED',
      );
    }

    final statementOutcomes = <Alpha2StatementImportOutcome>[];
    for (final candidate in batch.statementCandidates) {
      statementOutcomes.add(
        await _importStatementCandidate(
          tenantId: tenantId,
          candidate: candidate,
          passwordProvider: passwordProvider,
        ),
      );
    }

    final persisted = await vault.readSafeEvidence();
    final evidence = persisted.map(alpha2EvidenceFromSafeVaultRow).toList();
    final runtime = runAlpha2CanonicalRuntime(evidence: evidence);
    final projection = buildAlpha2PublicProjection(
      canonicalTransactions: runtime.canonicalTransactions,
      monthlyClose: null,
    );
    return Alpha2PipelineResult(
      ingressCoverage: batch.coverage,
      gmailEvidenceCount: batch.gmailEvidence.length,
      statementOutcomes:
          List<Alpha2StatementImportOutcome>.unmodifiable(statementOutcomes),
      runtime: runtime,
      projection: projection,
    );
  }

  Future<Alpha2StatementImportOutcome> _importStatementCandidate({
    required String tenantId,
    required Alpha2StatementCandidateHandle candidate,
    required Alpha2StatementPasswordProvider passwordProvider,
  }) async {
    if (!candidate.fetchEligible ||
        candidate.state != 'STRONG' ||
        candidate.profileId != alpha2BcpSavingsProfileId) {
      // Visible/quarantined profiles are intentionally not fetched. No generic
      // parser fallback exists here.
      await ingress.releaseStatementHandle(candidate.handle);
      return Alpha2StatementImportOutcome(
        profileId: candidate.profileId,
        status: 'QUARANTINED_PROFILE',
        evidenceCount: 0,
        reviewCodes: const <String>['STATEMENT_PROFILE_ADAPTER_NOT_READY'],
      );
    }

    final password = await passwordProvider(candidate);
    if (password == null || password.isEmpty) {
      await ingress.releaseStatementHandle(candidate.handle);
      return Alpha2StatementImportOutcome(
        profileId: candidate.profileId,
        status: 'PASSWORD_REQUIRED',
        evidenceCount: 0,
        reviewCodes: const <String>[],
      );
    }

    Uint8List? bytes;
    try {
      bytes = await ingress.fetchStatementBytes(candidate.handle);
      final sourceReceiptId = _statementSourceReceipt(candidate.profileId, bytes);
      final layout = await pdfReader.extractLayout(
        encryptedPdfBytes: bytes,
        password: password,
      );
      final parsed = bcpSavingsParser.parse(
        layout: layout,
        sourceReceiptId: sourceReceiptId,
        tenantId: tenantId,
      );

      if (!parsed.importable) {
        // Never combine derived rows with a non-imported terminal source state.
        await vault.commitEvidenceBatch(
          sourceReceiptId: sourceReceiptId,
          evidence: const <Alpha2Evidence>[],
          terminalState: 'QUARANTINED',
        );
        return Alpha2StatementImportOutcome(
          profileId: candidate.profileId,
          status: 'REVIEW_REQUIRED',
          evidenceCount: 0,
          reviewCodes: parsed.reviewCodes,
          statementPeriodId: parsed.statementPeriodId,
        );
      }

      await vault.commitEvidenceBatch(
        sourceReceiptId: sourceReceiptId,
        evidence: parsed.evidence,
        terminalState: 'IMPORTED',
      );
      return Alpha2StatementImportOutcome(
        profileId: candidate.profileId,
        status: 'IMPORTED',
        evidenceCount: parsed.evidence.length,
        reviewCodes: const <String>[],
        statementPeriodId: parsed.statementPeriodId,
      );
    } on Alpha2StatementPdfException catch (error) {
      return Alpha2StatementImportOutcome(
        profileId: candidate.profileId,
        status: 'PDF_REJECTED',
        evidenceCount: 0,
        reviewCodes: <String>[error.code],
      );
    } finally {
      if (bytes != null) bytes.fillRange(0, bytes.length, 0);
      await ingress.releaseStatementHandle(candidate.handle);
      // password is a Dart String. We deliberately make no zeroization claim.
    }
  }
}

String _gmailSourceReceipt(String evidenceId) {
  final value = evidenceId.startsWith('gmail:')
      ? evidenceId.substring('gmail:'.length)
      : evidenceId;
  if (value.isEmpty) throw StateError('ALPHA2_GMAIL_SOURCE_RECEIPT_INVALID');
  return 'gmail-src:$value';
}

class _DigestCapture implements Sink<Digest> {
  Digest? value;

  @override
  void add(Digest data) {
    if (value != null) throw StateError('ALPHA2_DIGEST_MULTIPLE_VALUES');
    value = data;
  }

  @override
  void close() {}
}

String _statementSourceReceipt(String profileId, Uint8List encryptedPdfBytes) {
  final capture = _DigestCapture();
  final input = sha256.startChunkedConversion(capture);
  input.add(utf8.encode('FINANCESENSOR_ALPHA2_STATEMENT_SOURCE_V1|$profileId|'));
  input.add(encryptedPdfBytes);
  input.close();
  final digest = capture.value;
  if (digest == null) throw StateError('ALPHA2_STATEMENT_DIGEST_MISSING');
  return 'stmt-src:${digest.toString().substring(0, 48)}';
}

Alpha2Evidence alpha2EvidenceFromSafeVaultRow(Map<String, Object?> row) {
  final evidenceId = row['evidenceId'] as String? ?? '';
  final tenantId = row['tenantId'] as String? ?? '';
  final occurredAt = DateTime.tryParse(row['occurredAt'] as String? ?? '');
  final currency = row['currency'] as String? ?? '';
  final amount = row['amount'] is num
      ? (row['amount'] as num).toDouble()
      : row['amountMinor'] is num
          ? (row['amountMinor'] as num).toDouble() / 100.0
          : double.nan;
  if (evidenceId.isEmpty ||
      tenantId.isEmpty ||
      occurredAt == null ||
      !amount.isFinite ||
      amount <= 0) {
    throw const FormatException('ALPHA2_VAULT_SAFE_ROW_INVALID');
  }
  return Alpha2Evidence(
    evidenceId: evidenceId,
    tenantId: tenantId,
    amount: amount,
    currency: currency,
    occurredAt: occurredAt,
    semanticType: _semantic(row['semanticType'] as String?),
    channel: _channel(row['channel'] as String?),
    truthState: _truth(row['truthState'] as String?),
    institutionCode: row['institutionCode'] as String?,
    accountId: row['accountId'] as String?,
    instrumentId: row['instrumentId'] as String?,
    merchantCanonical: row['merchantCanonical'] as String?,
    statementPeriodId: row['statementPeriodId'] as String?,
    categoryName: row['categoryName'] as String?,
    flowDirection: _direction(row['flowDirection'] as String?),
  ).normalized();
}

Alpha2SemanticType _semantic(String? raw) => switch ((raw ?? '').toUpperCase()) {
      'EXPENSE' || 'PURCHASE' => Alpha2SemanticType.expense,
      'INCOME' || 'DEPOSIT' || 'SALARY' => Alpha2SemanticType.income,
      'FEE' => Alpha2SemanticType.fee,
      'CASHWITHDRAWAL' || 'CASH_WITHDRAWAL' => Alpha2SemanticType.cashWithdrawal,
      'SERVICEPAYMENT' || 'SERVICE_PAYMENT' => Alpha2SemanticType.servicePayment,
      'CARDPAYMENT' || 'CARD_PAYMENT' => Alpha2SemanticType.cardPayment,
      'INTERNALTRANSFER' || 'INTERNAL_TRANSFER' => Alpha2SemanticType.internalTransfer,
      'EXTERNALTRANSFER' || 'EXTERNAL_TRANSFER' => Alpha2SemanticType.externalTransfer,
      'REFUND' => Alpha2SemanticType.refund,
      'REVERSAL' => Alpha2SemanticType.reversal,
      _ => Alpha2SemanticType.unknown,
    };

Alpha2EvidenceChannel _channel(String? raw) => switch ((raw ?? '').toUpperCase()) {
      'GMAILTRANSACTION' || 'GMAIL_TRANSACTION' => Alpha2EvidenceChannel.gmailTransaction,
      'STATEMENTLEDGER' || 'STATEMENT_LEDGER' => Alpha2EvidenceChannel.statementLedger,
      'MERCHANTRECEIPT' || 'MERCHANT_RECEIPT' => Alpha2EvidenceChannel.merchantReceipt,
      'USERCONFIRMATION' || 'USER_CONFIRMATION' => Alpha2EvidenceChannel.userConfirmation,
      _ => Alpha2EvidenceChannel.other,
    };

Alpha2TruthState _truth(String? raw) => switch ((raw ?? '').toUpperCase()) {
      'OBSERVED' => Alpha2TruthState.observed,
      'POSTED' => Alpha2TruthState.posted,
      'RECONCILED' => Alpha2TruthState.reconciled,
      'PARTIAL' => Alpha2TruthState.partial,
      _ => Alpha2TruthState.unknown,
    };

Alpha2FlowDirection _direction(String? raw) => switch ((raw ?? '').toUpperCase()) {
      'INFLOW' || 'IN' => Alpha2FlowDirection.inflow,
      'OUTFLOW' || 'OUT' => Alpha2FlowDirection.outflow,
      _ => Alpha2FlowDirection.unknown,
    };
