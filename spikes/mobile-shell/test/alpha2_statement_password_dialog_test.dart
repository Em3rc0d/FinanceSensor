import 'package:financesensor_mobile_shell/alpha2/alpha2_statement_password_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'submitting the statement password survives the full dialog pop transition',
    (tester) async {
      String? result;

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: FilledButton(
                onPressed: () async {
                  result = await showAlpha2StatementPasswordDialog(
                    context: context,
                    institutionCode: 'BCP',
                    productType: 'SAVINGS',
                  );
                },
                child: const Text('Open fixture'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open fixture'));
      await tester.pumpAndSettle();

      expect(find.text('Abrir estado de cuenta'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'fixture-value-123');
      await tester.tap(find.text('Abrir localmente'));

      // The showDialog result may complete before the reverse route transition
      // has finished. Exercise both the completion frame and final teardown.
      await tester.pump();
      expect(tester.takeException(), isNull);
      await tester.pumpAndSettle();

      expect(result, 'fixture-value-123');
      expect(find.text('Abrir estado de cuenta'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('cancelling returns null and tears down cleanly', (tester) async {
    String? result = 'sentinel';

    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: FilledButton(
              onPressed: () async {
                result = await showAlpha2StatementPasswordDialog(
                  context: context,
                  institutionCode: 'BCP',
                  productType: 'SAVINGS',
                );
              },
              child: const Text('Open fixture'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open fixture'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ahora no'));
    await tester.pumpAndSettle();

    expect(result, isNull);
    expect(tester.takeException(), isNull);
  });
}
