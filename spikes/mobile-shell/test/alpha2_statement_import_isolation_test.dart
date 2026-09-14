import 'dart:typed_data';

import 'package:financesensor_mobile_shell/alpha2/alpha2_ingress.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_pipeline.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_statement_geometry.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_statement_pdf_reader.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_vault.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'unexpected PDF runtime failure is candidate-local and Gmail evidence still reaches runtime',
    () async {
      final ingress = _OneStatementIngress();
      final pipeline = Alpha2Pipeline(
        ingress: ingress,
        vault: InMemoryAlpha2Vault(),
        pdfReader: const _FailingPdfReader(),
      );

      final result = await pipeline.refresh(
        tenantId: 'LOCAL_PRIMARY',
        passwordProvider: (_) async => 'session-only-test-value',
      );

      expect(result.gmailEvidenceCount, 1);
      expect(result.statementOutcomes, hasLength(1));
      expect(result.statementOutcomes.single.status, 'PDF_REJECTED');
      expect(
        result.statementOutcomes.single.reviewCodes,
        const <String>[alpha2StatementPdfRuntimeRejected],
      );
      expect(result.runtime.canonicalTransactions, isNotEmpty);
      expect(ingress.releaseAttempts, 1);
    },
  );

  test(
    'password-provider runtime failure is sanitized and cannot abort refresh',
    () async {
      final ingress = _OneStatementIngress(includeGmailEvidence: false);
      final pipeline = Alpha2Pipeline(
        ingress: ingress,
        vault: InMemoryAlpha2Vault(),
      );

      final result = await pipeline.refresh(
        tenantId: 'LOCAL_PRIMARY',
        passwordProvider: (_) async => throw StateError('private UI detail'),
      );

      expect(result.statementOutcomes, hasLength(1));
      expect(result.statementOutcomes.single.status, 'REVIEW_REQUIRED');
      expect(
        result.statementOutcomes.single.reviewCodes,
        const <String>[alpha2StatementPasswordProviderRejected],
      );
      expect(ingress.fetchAttempts, 0);
      expect(ingress.releaseAttempts, 1);
    },
  );
}

class _FailingPdfReader implements Alpha2StatementLayoutReader {
  const _FailingPdfReader();

  @override
  Future<Alpha2StatementLayout> extractLayout({
    required Uint8List encryptedPdfBytes,
    required String password,
  }) async {
    throw StateError('private native/PDF detail must not escape');
  }
}

class _OneStatementIngress implements Alpha2IngressSource {
  _OneStatementIngress({this.includeGmailEvidence = true});

  final bool includeGmailEvidence;
  int fetchAttempts = 0;
  int releaseAttempts = 0;

  @override
  Future<Alpha2IngressBatch> scan() async => Alpha2IngressBatch(
        gmailEvidence: includeGmailEvidence
            ? <Alpha2Evidence>[
                Alpha2Evidence(
                  evidenceId: 'gmail:test-observation',
                  tenantId: 'LOCAL_PRIMARY',
                  amount: 19.90,
                  currency: 'PEN',
                  occurredAt: DateTime.utc(2026, 9, 14, 12),
                  semanticType: Alpha2SemanticType.expense,
                  channel: Alpha2EvidenceChannel.gmailTransaction,
                  truthState: Alpha2TruthState.observed,
                  institutionCode: 'BCP',
                  flowDirection: Alpha2FlowDirection.outflow,
                ),
              ]
            : const <Alpha2Evidence>[],
        statementCandidates: const <Alpha2StatementCandidateHandle>[
          Alpha2StatementCandidateHandle(
            handle: 'opaque-owned-device-handle',
            profileId: alpha2BcpSavingsProfileId,
            institutionCode: 'BCP',
            productType: 'SAVINGS',
            state: 'STRONG',
            byteLength: 4096,
            requiresLocalPassword: true,
            fetchEligible: true,
          ),
        ],
        coverage: 'TEST',
      );

  @override
  Future<Uint8List> fetchStatementBytes(String candidateHandle) async {
    fetchAttempts += 1;
    return Uint8List.fromList(<int>[0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  }

  @override
  Future<void> releaseStatementHandle(String candidateHandle) async {
    releaseAttempts += 1;
  }
}
