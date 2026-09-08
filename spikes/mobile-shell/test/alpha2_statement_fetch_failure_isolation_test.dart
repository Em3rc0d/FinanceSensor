import 'dart:typed_data';

import 'package:financesensor_mobile_shell/alpha2/alpha2_ingress.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_pipeline.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_statement_geometry.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_vault.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('native attachment fetch rejection stays candidate-local', () async {
    final ingress = _FetchRejectingIngress(
      const PlatformException(
        code: 'ALPHA2_STATEMENT_GMAIL_HTTP_429',
        message: 'must not cross the safe boundary',
        details: 'must not cross the safe boundary',
      ),
    );
    final pipeline = Alpha2Pipeline(
      ingress: ingress,
      vault: InMemoryAlpha2Vault(),
    );

    final result = await pipeline.refresh(
      tenantId: 'LOCAL_PRIMARY',
      passwordProvider: (_) async => 'session-only-test-password',
    );

    expect(result.statementOutcomes, hasLength(1));
    final outcome = result.statementOutcomes.single;
    expect(outcome.status, 'FETCH_REJECTED');
    expect(outcome.evidenceCount, 0);
    expect(outcome.reviewCodes, <String>['ALPHA2_STATEMENT_GMAIL_HTTP_429']);
    expect(ingress.released, isTrue);
  });

  test('unknown native fetch code is collapsed before entering product state', () async {
    final ingress = _FetchRejectingIngress(
      const PlatformException(
        code: 'RAW_PRIVATE_PROVIDER_MESSAGE',
        message: 'private provider detail',
      ),
    );
    final pipeline = Alpha2Pipeline(
      ingress: ingress,
      vault: InMemoryAlpha2Vault(),
    );

    final result = await pipeline.refresh(
      tenantId: 'LOCAL_PRIMARY',
      passwordProvider: (_) async => 'session-only-test-password',
    );

    expect(
      result.statementOutcomes.single.reviewCodes,
      <String>['ALPHA2_STATEMENT_FETCH_FAILED'],
    );
    expect(result.statementOutcomes.single.reviewCodes.join(' '),
        isNot(contains('private provider detail')));
  });
}

class _FetchRejectingIngress implements Alpha2IngressSource {
  _FetchRejectingIngress(this.error);

  final PlatformException error;
  bool released = false;

  @override
  Future<Alpha2IngressBatch> scan() async => const Alpha2IngressBatch(
        gmailEvidence: <Alpha2Evidence>[],
        statementCandidates: <Alpha2StatementCandidateHandle>[
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
    throw error;
  }

  @override
  Future<void> releaseStatementHandle(String candidateHandle) async {
    released = true;
  }
}
