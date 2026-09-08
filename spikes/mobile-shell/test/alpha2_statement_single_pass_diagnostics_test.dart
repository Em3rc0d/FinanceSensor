import 'package:financesensor_mobile_shell/alpha2/alpha2_dashboard_insights.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_dashboard_sections.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_pipeline.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_projection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('one refresh exposes sanitized EECC stage counts in the dashboard',
      (tester) async {
    const outcomes = <Alpha2StatementImportOutcome>[
      Alpha2StatementImportOutcome(
        profileId: 'BCP_SAVINGS',
        status: 'IMPORTED',
        evidenceCount: 4,
        reviewCodes: <String>[],
      ),
      Alpha2StatementImportOutcome(
        profileId: 'BCP_SAVINGS',
        status: 'FETCH_REJECTED',
        evidenceCount: 0,
        reviewCodes: <String>['ALPHA2_STATEMENT_FETCH_FAILED'],
      ),
      Alpha2StatementImportOutcome(
        profileId: 'BCP_SAVINGS',
        status: 'PDF_REJECTED',
        evidenceCount: 0,
        reviewCodes: <String>['STATEMENT_PDF_OPEN_OR_PASSWORD_REJECTED'],
      ),
      Alpha2StatementImportOutcome(
        profileId: 'BCP_SAVINGS',
        status: 'PDF_REJECTED',
        evidenceCount: 0,
        reviewCodes: <String>['STATEMENT_PDF_OPEN_OR_PASSWORD_REJECTED'],
      ),
      Alpha2StatementImportOutcome(
        profileId: 'BCP_SAVINGS',
        status: 'REVIEW_REQUIRED',
        evidenceCount: 0,
        reviewCodes: <String>['STATEMENT_HEADER_GEOMETRY_UNKNOWN'],
      ),
      Alpha2StatementImportOutcome(
        profileId: 'BCP_SAVINGS',
        status: 'PASSWORD_REQUIRED',
        evidenceCount: 0,
        reviewCodes: <String>[],
      ),
      Alpha2StatementImportOutcome(
        profileId: 'BCP_SAVINGS',
        status: 'PERSISTENCE_REJECTED',
        evidenceCount: 0,
        reviewCodes: <String>['STATEMENT_ENCRYPTED_PERSISTENCE_REJECTED'],
      ),
    ];

    final counts = alpha2StatementOutcomeCounts(outcomes);
    expect(counts['IMPORTED'], 1);
    expect(counts['FETCH_REJECTED'], 1);
    expect(counts['PDF_REJECTED'], 2);
    expect(counts['REVIEW_REQUIRED'], 1);
    expect(counts['PASSWORD_REQUIRED'], 1);
    expect(counts['PERSISTENCE_REJECTED'], 1);

    final projection = buildAlpha2PublicProjection(
      canonicalTransactions: const <Alpha2CanonicalTransaction>[],
      monthlyClose: null,
      statementStatusCounts: counts,
    );
    final gaps = summarizeAlpha2KnowledgeGaps(projection);
    final byReason = <String, int>{for (final gap in gaps) gap.reason: gap.count};

    expect(byReason['STATEMENT_FETCH_REJECTED'], 1);
    expect(byReason['STATEMENT_PDF_REJECTED'], 2);
    expect(byReason['STATEMENT_STRICT_REVIEW_REQUIRED'], 1);
    expect(byReason['STATEMENT_PASSWORD_REQUIRED'], 1);
    expect(byReason['STATEMENT_PERSISTENCE_REJECTED'], 1);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: Alpha2FinanceInsightsSections(projection: projection),
          ),
        ),
      ),
    );

    expect(find.text('No se pudo descargar un EECC desde Gmail'), findsOneWidget);
    expect(
      find.text('El PDF o su clave no pudieron abrirse localmente'),
      findsOneWidget,
    );
    expect(
      find.text('El EECC llegó al parser estricto y requiere revisión'),
      findsOneWidget,
    );
    expect(
      find.text('La clave del EECC fue omitida en esta actualización'),
      findsOneWidget,
    );
    expect(
      find.text('El EECC no pudo guardarse en el almacén cifrado'),
      findsOneWidget,
    );
    expect(find.text('×2'), findsOneWidget);
  });
}
