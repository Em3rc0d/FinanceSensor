import 'package:financesensor_mobile_shell/alpha2/alpha2_credit_statement_adapters.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_dashboard_insights.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_dashboard_sections.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_pipeline.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_projection.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_statement_geometry.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('strict review diagnostics are profile-scoped, one-per-statement and allow-listed', () {
    const outcomes = <Alpha2StatementImportOutcome>[
      Alpha2StatementImportOutcome(
        profileId: alpha2BcpSavingsProfileId,
        status: 'REVIEW_REQUIRED',
        evidenceCount: 0,
        reviewCodes: <String>['STATEMENT_HEADER_GEOMETRY_UNKNOWN'],
      ),
      Alpha2StatementImportOutcome(
        profileId: alpha2BcpSavingsProfileId,
        status: 'REVIEW_REQUIRED',
        evidenceCount: 0,
        reviewCodes: <String>['PRIVATE_PROVIDER_DETAIL_SHOULD_NOT_ESCAPE'],
      ),
      Alpha2StatementImportOutcome(
        profileId: alpha2RipleyCreditProfileId,
        status: 'REVIEW_REQUIRED',
        evidenceCount: 0,
        reviewCodes: <String>['RIPLEY_CREDIT_PERIOD_AMBIGUOUS'],
      ),
      Alpha2StatementImportOutcome(
        profileId: alpha2BcpCreditProfileId,
        status: 'REVIEW_REQUIRED',
        evidenceCount: 0,
        reviewCodes: <String>[
          'BCP_CREDIT_STRUCTURAL_V1_P2_4_M3FF',
          'BCP_CREDIT_ADAPTER_CERTIFICATION_REQUIRED',
        ],
      ),
    ];

    final counts = alpha2StatementOutcomeCounts(outcomes);
    expect(counts['REVIEW_REQUIRED'], 4);
    expect(
      counts['REVIEW_DIAGNOSTIC:BCP_SAVINGS:STATEMENT_HEADER_GEOMETRY_UNKNOWN'],
      1,
    );
    expect(
      counts['REVIEW_DIAGNOSTIC:BCP_SAVINGS:STATEMENT_STRICT_REVIEW_OTHER'],
      1,
    );
    expect(
      counts['REVIEW_DIAGNOSTIC:RIPLEY_CREDIT:RIPLEY_CREDIT_PERIOD_AMBIGUOUS'],
      1,
    );
    expect(
      counts[
          'REVIEW_DIAGNOSTIC:BCP_CREDIT:BCP_CREDIT_ADAPTER_CERTIFICATION_REQUIRED'],
      1,
    );
    expect(
      counts.keys.join(' '),
      isNot(contains('PRIVATE_PROVIDER_DETAIL_SHOULD_NOT_ESCAPE')),
    );

    final projection = buildAlpha2PublicProjection(
      canonicalTransactions: const <Alpha2CanonicalTransaction>[],
      monthlyClose: null,
      statementStatusCounts: counts,
    );
    final gaps = summarizeAlpha2KnowledgeGaps(projection);
    final reviewGaps = gaps
        .where((gap) => gap.reason.startsWith('STATEMENT_REVIEW_'))
        .toList();

    expect(reviewGaps.fold<int>(0, (sum, gap) => sum + gap.count), 4);
    expect(
      reviewGaps.any(
        (gap) =>
            gap.reason ==
            'STATEMENT_REVIEW_BCP_SAVINGS_STATEMENT_HEADER_GEOMETRY_UNKNOWN',
      ),
      isTrue,
    );
    expect(
      reviewGaps.any(
        (gap) =>
            gap.reason ==
            'STATEMENT_REVIEW_RIPLEY_CREDIT_RIPLEY_CREDIT_PERIOD_AMBIGUOUS',
      ),
      isTrue,
    );
    expect(
      gaps.any((gap) => gap.reason == 'STATEMENT_STRICT_REVIEW_REQUIRED'),
      isFalse,
    );
    expect(
      projection.toJson().toString(),
      isNot(contains('PRIVATE_PROVIDER_DETAIL_SHOULD_NOT_ESCAPE')),
    );
  });

  testWidgets('dashboard renders safe review cause labels without private parser detail',
      (tester) async {
    final counts = alpha2StatementOutcomeCounts(
      const <Alpha2StatementImportOutcome>[
        Alpha2StatementImportOutcome(
          profileId: alpha2BcpSavingsProfileId,
          status: 'REVIEW_REQUIRED',
          evidenceCount: 0,
          reviewCodes: <String>['STATEMENT_HEADER_GEOMETRY_UNKNOWN'],
        ),
        Alpha2StatementImportOutcome(
          profileId: alpha2RipleyCreditProfileId,
          status: 'REVIEW_REQUIRED',
          evidenceCount: 0,
          reviewCodes: <String>['RIPLEY_CREDIT_PERIOD_AMBIGUOUS'],
        ),
        Alpha2StatementImportOutcome(
          profileId: alpha2BcpSavingsProfileId,
          status: 'REVIEW_REQUIRED',
          evidenceCount: 0,
          reviewCodes: <String>['RAW_BANK_TEXT_12345'],
        ),
      ],
    );
    final projection = buildAlpha2PublicProjection(
      canonicalTransactions: const <Alpha2CanonicalTransaction>[],
      monthlyClose: null,
      statementStatusCounts: counts,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: Alpha2FinanceInsightsSections(projection: projection),
          ),
        ),
      ),
    );

    expect(
      find.text(
        'BCP ahorro: la geometría del ledger no coincide con el contrato certificado',
      ),
      findsOneWidget,
    );
    expect(
      find.text(
        'Ripley tarjeta: no se pudo fijar un único período del estado de cuenta',
      ),
      findsOneWidget,
    );
    expect(
      find.text('BCP ahorro: el parser falló cerrado con una causa no publicable'),
      findsOneWidget,
    );
    expect(find.textContaining('RAW_BANK_TEXT_12345'), findsNothing);
  });
}
