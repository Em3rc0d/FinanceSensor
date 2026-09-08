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
      PlatformException(
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
    expect(outcome.requiresReview, isTrue);
    expect(ingress.releaseCount, 1);
  });

  test('unknown native fetch code is collapsed before entering product state', () async {
    final ingress = _FetchRejectingIngress(
      PlatformException(
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
    expect(
      result.statementOutcomes.single.reviewCodes.join(' '),
      isNot(contains('private provider detail')),
    );
  });

  test('one refresh prompts once for multiple BCP Savings candidates', () async {
    final ingress = _FetchRejectingIngress(
      PlatformException(code: 'ALPHA2_STATEMENT_FETCH_FAILED'),
      candidateCount: 3,
    );
    final pipeline = Alpha2Pipeline(
      ingress: ingress,
      vault: InMemoryAlpha2Vault(),
    );
    var passwordPrompts = 0;

    final result = await pipeline.refresh(
      tenantId: 'LOCAL_PRIMARY',
      passwordProvider: (_) async {
        passwordPrompts += 1;
        return 'session-only-test-password';
      },
    );

    expect(passwordPrompts, 1);
    expect(ingress.fetchCount, 3);
    expect(ingress.releaseCount, 3);
    expect(result.statementOutcomes, hasLength(3));
    expect(
      result.statementOutcomes.map((item) => item.status),
      everyElement('FETCH_REJECTED'),
    );
  });

  test('Ahora no suppresses repeated prompts and skips every candidate in profile', () async {
    final ingress = _FetchRejectingIngress(
      PlatformException(code: 'SHOULD_NOT_FETCH'),
      candidateCount: 3,
    );
    final pipeline = Alpha2Pipeline(
      ingress: ingress,
      vault: InMemoryAlpha2Vault(),
    );
    var passwordPrompts = 0;

    final result = await pipeline.refresh(
      tenantId: 'LOCAL_PRIMARY',
      passwordProvider: (_) async {
        passwordPrompts += 1;
        return null;
      },
    );

    expect(passwordPrompts, 1);
    expect(ingress.fetchCount, 0);
    expect(ingress.releaseCount, 3);
    expect(result.statementOutcomes, hasLength(3));
    expect(
      result.statementOutcomes.map((item) => item.status),
      everyElement('PASSWORD_REQUIRED'),
    );
    expect(result.statementOutcomes.every((item) => item.requiresReview), isTrue);
  });
}

class _FetchRejectingIngress implements Alpha2IngressSource {
  _FetchRejectingIngress(this.error, {this.candidateCount = 1});

  final PlatformException error;
  final int candidateCount;
  int fetchCount = 0;
  int releaseCount = 0;

  @override
  Future<Alpha2IngressBatch> scan() async => Alpha2IngressBatch(
        gmailEvidence: const <Alpha2Evidence>[],
        statementCandidates: List<Alpha2StatementCandidateHandle>.generate(
          candidateCount,
          (index) => Alpha2StatementCandidateHandle(
            handle: 'opaque-local-handle-$index',
            profileId: alpha2BcpSavingsProfileId,
            institutionCode: 'BCP',
            productType: 'SAVINGS',
            state: 'STRONG',
            byteLength: 4096,
            requiresLocalPassword: true,
            fetchEligible: true,
          ),
        ),
        coverage: 'TEST',
      );

  @override
  Future<Uint8List> fetchStatementBytes(String candidateHandle) async {
    fetchCount += 1;
    throw error;
  }

  @override
  Future<void> releaseStatementHandle(String candidateHandle) async {
    releaseCount += 1;
  }
}
