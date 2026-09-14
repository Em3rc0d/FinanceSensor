import 'dart:typed_data';

import 'package:financesensor_mobile_shell/alpha2/alpha2_ingress.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_pipeline.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_statement_geometry.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_vault.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('candidate-local runtime failure does not erase Gmail evidence or abort projection', () async {
    final pipeline = Alpha2Pipeline(
      ingress: _RuntimeRejectingIngress(),
      vault: InMemoryAlpha2Vault(),
    );

    final result = await pipeline.refresh(
      tenantId: 'LOCAL_PRIMARY',
      passwordProvider: (_) async => 'session-only-value',
    );

    expect(result.gmailEvidenceCount, 1);
    expect(result.statementOutcomes, hasLength(1));
    expect(result.statementOutcomes.single.status, 'REVIEW_REQUIRED');
    expect(
      result.statementOutcomes.single.reviewCodes,
      const <String>['STATEMENT_IMPORT_RUNTIME_REJECTED'],
    );
    expect(result.projection.transactions, isNotEmpty);
    expect(result.runtime.canonicalTransactions, isNotEmpty);
  });
}

class _RuntimeRejectingIngress implements Alpha2IngressSource {
  @override
  Future<Alpha2IngressBatch> scan() async => Alpha2IngressBatch(
        gmailEvidence: <Alpha2Evidence>[
          Alpha2Evidence(
            evidenceId: 'gmail:safe-test-receipt',
            tenantId: 'LOCAL_PRIMARY',
            amount: 25,
            currency: 'PEN',
            occurredAt: DateTime.utc(2026, 9, 14, 20),
            semanticType: Alpha2SemanticType.expense,
            channel: Alpha2EvidenceChannel.gmailTransaction,
            truthState: Alpha2TruthState.observed,
            institutionCode: 'BCP',
            flowDirection: Alpha2FlowDirection.outflow,
          ),
        ],
        statementCandidates: const <Alpha2StatementCandidateHandle>[
          Alpha2StatementCandidateHandle(
            handle: 'opaque-test-handle',
            profileId: alpha2BcpSavingsProfileId,
            institutionCode: 'BCP',
            productType: 'SAVINGS',
            state: 'STRONG',
            byteLength: 1024,
            requiresLocalPassword: true,
            fetchEligible: true,
          ),
        ],
        coverage: 'PARTIAL',
      );

  @override
  Future<Uint8List> fetchStatementBytes(String candidateHandle) async {
    throw const FormatException('synthetic candidate-local runtime failure');
  }

  @override
  Future<void> releaseStatementHandle(String candidateHandle) async {}
}
