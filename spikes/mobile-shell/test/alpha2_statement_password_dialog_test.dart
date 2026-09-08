import 'package:financesensor_mobile_shell/alpha2/alpha2_ingress.dart';
import 'package:financesensor_mobile_shell/main_alpha2.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _candidate = Alpha2StatementCandidateHandle(
  handle: 'opaque-test-handle',
  profileId: 'BCP_SAVINGS_REQUESTED',
  institutionCode: 'BCP',
  productType: 'SAVINGS',
  state: 'FETCH_ALLOWED',
  byteLength: 4096,
  requiresLocalPassword: true,
  fetchEligible: true,
);

void main() {
  testWidgets(
    'submitting a session-only PDF password tears down the dialog without framework exceptions',
    (tester) async {
      String? result;

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: FilledButton(
                onPressed: () async {
                  result = await showDialog<String>(
                    context: context,
                    barrierDismissible: false,
                    builder: (_) => const Alpha2StatementPasswordDialog(
                      candidate: _candidate,
                    ),
                  );
                },
                child: const Text('Open test dialog'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open test dialog'));
      await tester.pumpAndSettle();
      expect(find.text('Abrir estado de cuenta'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'session-only-test');
      await tester.tap(find.text('Abrir localmente'));
      await tester.pumpAndSettle();

      expect(result, 'session-only-test');
      expect(find.text('Abrir estado de cuenta'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('cancel tears down the password dialog cleanly', (tester) async {
    String? result = 'not-null';

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: FilledButton(
              onPressed: () async {
                result = await showDialog<String>(
                  context: context,
                  barrierDismissible: false,
                  builder: (_) => const Alpha2StatementPasswordDialog(
                    candidate: _candidate,
                  ),
                );
              },
              child: const Text('Open test dialog'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open test dialog'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ahora no'));
    await tester.pumpAndSettle();

    expect(result, isNull);
    expect(tester.takeException(), isNull);
  });
}
