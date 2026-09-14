import 'dart:typed_data';

import 'package:financesensor_mobile_shell/alpha2/alpha2_ingress.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_pipeline.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_vault.dart';
import 'package:financesensor_mobile_shell/main_alpha2.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('pipeline stage failure exposes only its bounded safe code', () {
    const failure = Alpha2PipelineFailure('ALPHA2_REFRESH_VAULT_READ_FAILED');

    expect(
      alpha2SafeRefreshFailureMessage(failure),
      'La actualización financiera se detuvo de forma segura. '
      'Código seguro: ALPHA2_REFRESH_VAULT_READ_FAILED',
    );
  });

  test('platform exception message and details never cross the UI boundary', () {
    final failure = PlatformException(
      code: 'ALPHA2_VAULT_FAILED',
      message: 'private local storage detail',
      details: 'raw value that must never render',
    );

    final message = alpha2SafeRefreshFailureMessage(failure);

    expect(message, contains('ALPHA2_VAULT_FAILED'));
    expect(message, isNot(contains('private local storage detail')));
    expect(message, isNot(contains('raw value that must never render')));
  });

  test('untrusted exception text collapses to the generic safe stop', () {
    final message = alpha2SafeRefreshFailureMessage(
      StateError('merchant/account/private provider detail'),
    );

    expect(message, 'La actualización financiera se detuvo de forma segura.');
    expect(message, isNot(contains('merchant')));
    expect(message, isNot(contains('account')));
    expect(message, isNot(contains('provider')));
  });

  test('vault read failure is classified by refresh stage without raw detail', () async {
    final pipeline = Alpha2Pipeline(
      ingress: const _EmptyIngress(),
      vault: _ReadFailingVault(),
    );

    try {
      await pipeline.refresh(
        tenantId: 'LOCAL_PRIMARY',
        passwordProvider: (_) async => null,
      );
      fail('refresh should fail closed');
    } on Alpha2PipelineFailure catch (error) {
      expect(error.code, 'ALPHA2_REFRESH_VAULT_READ_FAILED');
      expect(error.toString(), isNot(contains('private vault detail')));
    }
  });
}

class _EmptyIngress implements Alpha2IngressSource {
  const _EmptyIngress();

  @override
  Future<Alpha2IngressBatch> scan() async => const Alpha2IngressBatch(
        gmailEvidence: <Alpha2Evidence>[],
        statementCandidates: <Alpha2StatementCandidateHandle>[],
        coverage: 'TEST_EMPTY',
      );

  @override
  Future<Uint8List> fetchStatementBytes(String candidateHandle) async =>
      throw StateError('not used');

  @override
  Future<void> releaseStatementHandle(String candidateHandle) async {}
}

class _ReadFailingVault implements Alpha2Vault {
  @override
  Future<Alpha2VaultCapabilities> initialize() async =>
      const Alpha2VaultCapabilities(
        sqlcipherVersion: '4.18.0',
        encryptedOpenOnly: true,
        platformWrappedDek: true,
        plaintextFallback: false,
        hardwareBackedKey: true,
      );

  @override
  Future<void> commitEvidenceBatch({
    required String sourceReceiptId,
    required List<Alpha2Evidence> evidence,
    required String terminalState,
  }) async {}

  @override
  Future<List<Map<String, Object?>>> readSafeEvidence() async =>
      throw StateError('private vault detail');

  @override
  Future<void> cryptoShred() async {}
}
