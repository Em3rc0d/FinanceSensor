import 'dart:typed_data';

import 'package:financesensor_mobile_shell/alpha2/alpha2_ingress.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_pipeline.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_statement_geometry.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_vault.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('scan failure is reduced to a safe stage code', () async {
    final pipeline = Alpha2Pipeline(
      ingress: _ScanFailingIngress(),
      vault: InMemoryAlpha2Vault(),
    );

    await expectLater(
      () => pipeline.refresh(
        tenantId: 'LOCAL_PRIMARY',
        passwordProvider: (_) async => 'never-used',
      ),
      throwsA(
        isA<Alpha2PipelineStageException>().having(
          (error) => error.code,
          'code',
          'ALPHA2_REFRESH_SCAN_FAILED',
        ),
      ),
    );
  });

  test('vault read failure is reduced to a safe stage code', () async {
    final pipeline = Alpha2Pipeline(
      ingress: _EmptyIngress(),
      vault: _ReadFailingVault(),
    );

    await expectLater(
      () => pipeline.refresh(
        tenantId: 'LOCAL_PRIMARY',
        passwordProvider: (_) async => 'never-used',
      ),
      throwsA(
        isA<Alpha2PipelineStageException>().having(
          (error) => error.code,
          'code',
          'ALPHA2_REFRESH_VAULT_READ_FAILED',
        ),
      ),
    );
  });

  test('handle cleanup failure cannot mask candidate-local fetch rejection', () async {
    final ingress = _FetchAndReleaseFailingIngress();
    final pipeline = Alpha2Pipeline(
      ingress: ingress,
      vault: InMemoryAlpha2Vault(),
    );

    final result = await pipeline.refresh(
      tenantId: 'LOCAL_PRIMARY',
      passwordProvider: (_) async => 'session-only-test-password',
    );

    expect(result.statementOutcomes, hasLength(1));
    expect(result.statementOutcomes.single.status, 'FETCH_REJECTED');
    expect(
      result.statementOutcomes.single.reviewCodes,
      <String>['ALPHA2_STATEMENT_GMAIL_HTTP_503'],
    );
    expect(ingress.releaseAttempts, 1);
  });
}

class _ScanFailingIngress implements Alpha2IngressSource {
  @override
  Future<Alpha2IngressBatch> scan() async => throw StateError('private detail');
  @override
  Future<Uint8List> fetchStatementBytes(String candidateHandle) async => Uint8List(0);
  @override
  Future<void> releaseStatementHandle(String candidateHandle) async {}
}

class _EmptyIngress implements Alpha2IngressSource {
  @override
  Future<Alpha2IngressBatch> scan() async => const Alpha2IngressBatch(
        gmailEvidence: <Alpha2Evidence>[],
        statementCandidates: <Alpha2StatementCandidateHandle>[],
        coverage: 'TEST',
      );
  @override
  Future<Uint8List> fetchStatementBytes(String candidateHandle) async => Uint8List(0);
  @override
  Future<void> releaseStatementHandle(String candidateHandle) async {}
}

class _ReadFailingVault implements Alpha2Vault {
  final InMemoryAlpha2Vault _delegate = InMemoryAlpha2Vault();
  @override
  Future<Alpha2VaultCapabilities> initialize() => _delegate.initialize();
  @override
  Future<void> commitEvidenceBatch({required String sourceReceiptId, required List<Alpha2Evidence> evidence, required String terminalState}) =>
      _delegate.commitEvidenceBatch(sourceReceiptId: sourceReceiptId, evidence: evidence, terminalState: terminalState);
  @override
  Future<List<Map<String, Object?>>> readSafeEvidence() async => throw StateError('private detail');
  @override
  Future<void> cryptoShred() => _delegate.cryptoShred();
}

class _FetchAndReleaseFailingIngress implements Alpha2IngressSource {
  int releaseAttempts = 0;
  @override
  Future<Alpha2IngressBatch> scan() async => Alpha2IngressBatch(
        gmailEvidence: const <Alpha2Evidence>[],
        statementCandidates: const <Alpha2StatementCandidateHandle>[
          Alpha2StatementCandidateHandle(
            handle: 'opaque-local-handle',
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
    throw PlatformException(code: 'ALPHA2_STATEMENT_GMAIL_HTTP_503');
  }
  @override
  Future<void> releaseStatementHandle(String candidateHandle) async {
    releaseAttempts += 1;
    throw PlatformException(code: 'ALPHA2_STATEMENT_RELEASE_FAILED');
  }
}
