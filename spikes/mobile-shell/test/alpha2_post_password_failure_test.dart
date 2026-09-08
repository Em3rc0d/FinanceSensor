import 'dart:typed_data';

import 'package:financesensor_mobile_shell/alpha2/alpha2_ingress.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_pipeline.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_statement_geometry.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_vault.dart';
import 'package:financesensor_mobile_shell/main_alpha2.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

const _candidate = Alpha2StatementCandidateHandle(
  handle: 'opaque-physical-shape-handle',
  profileId: alpha2BcpSavingsProfileId,
  institutionCode: 'BCP',
  productType: 'SAVINGS',
  state: 'STRONG',
  byteLength: 4096,
  requiresLocalPassword: true,
  fetchEligible: true,
);

void main() {
  test('statement attachment failure stays local to the candidate', () async {
    final ingress = _FetchRejectingIngress();
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
      const <String>['STATEMENT_FETCH_GMAIL_HTTP_REJECTED'],
    );
    expect(ingress.releaseCount, 1);
    expect(
      alpha2StatementOutcomeNotice(result),
      contains('A2_STATEMENT_FETCH_REJECTED'),
    );
  });

  test('reauth from the trusted edge becomes a stable stage code', () async {
    final pipeline = Alpha2Pipeline(
      ingress: _ReauthIngress(),
      vault: InMemoryAlpha2Vault(),
    );

    try {
      await pipeline.refresh(
        tenantId: 'LOCAL_PRIMARY',
        passwordProvider: (_) async => 'unused',
      );
      fail('refresh should require reauthorization');
    } on Alpha2PipelineFailure catch (error) {
      expect(error.safeCode, 'A2_SESSION_REAUTH_REQUIRED');
      expect(
        alpha2SafeRefreshMessage(error.safeCode),
        contains('A2_SESSION_REAUTH_REQUIRED'),
      );
    }
  });

  test('password-provider failure still releases the opaque handle', () async {
    final ingress = _FetchRejectingIngress();
    final pipeline = Alpha2Pipeline(
      ingress: ingress,
      vault: InMemoryAlpha2Vault(),
    );

    try {
      await pipeline.refresh(
        tenantId: 'LOCAL_PRIMARY',
        passwordProvider: (_) async => throw StateError('synthetic-ui-failure'),
      );
      fail('password provider should fail closed');
    } on Alpha2PipelineFailure catch (error) {
      expect(error.safeCode, 'A2_PASSWORD_PROVIDER');
    }
    expect(ingress.releaseCount, 1);
  });

  test('safe refresh messages never echo exception material', () {
    final message = alpha2SafeRefreshMessage('A2_STATEMENT_VAULT_WRITE');
    expect(message, contains('A2_STATEMENT_VAULT_WRITE'));
    expect(message.toLowerCase(), isNot(contains('password')));
    expect(message.toLowerCase(), isNot(contains('messageid')));
    expect(message.toLowerCase(), isNot(contains('attachmentid')));
  });
}

class _FetchRejectingIngress implements Alpha2IngressSource {
  int releaseCount = 0;

  @override
  Future<Alpha2IngressBatch> scan() async => const Alpha2IngressBatch(
        gmailEvidence: <Alpha2Evidence>[],
        statementCandidates: <Alpha2StatementCandidateHandle>[_candidate],
        coverage: 'TEST_ONLY',
      );

  @override
  Future<Uint8List> fetchStatementBytes(String candidateHandle) async {
    throw PlatformException(
      code: 'ALPHA2_STATEMENT_GMAIL_HTTP_503',
    );
  }

  @override
  Future<void> releaseStatementHandle(String candidateHandle) async {
    releaseCount += 1;
  }
}

class _ReauthIngress implements Alpha2IngressSource {
  @override
  Future<Alpha2IngressBatch> scan() async {
    throw PlatformException(code: 'REAUTH_REQUIRED');
  }

  @override
  Future<Uint8List> fetchStatementBytes(String candidateHandle) async =>
      Uint8List(0);

  @override
  Future<void> releaseStatementHandle(String candidateHandle) async {}
}
