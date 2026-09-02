import 'package:financesensor_mobile_shell/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<void> pumpAt(WidgetTester tester, Size size) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });
    await tester.pumpWidget(const FinanceSensorApp());
    await tester.pumpAndSettle();
  }

  testWidgets('compact Android-class viewport renders Home without framework errors', (tester) async {
    await pumpAt(tester, const Size(360, 800));

    expect(find.text('PRODUCT LAB · DATOS 100% SINTÉTICOS'), findsOneWidget);
    expect(find.text('Tu dinero, en contexto.'), findsOneWidget);
    expect(find.text('S/ 586'), findsOneWidget);
    expect(find.text('FinanceSensor encontró algo'), findsOneWidget);
    expect(find.text('Inicio'), findsOneWidget);
    expect(find.text('Mov.'), findsOneWidget);
    expect(find.text('Sensor'), findsOneWidget);
    expect(find.text('Tú'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('regular viewport navigates to movements and opens synthetic detail', (tester) async {
    await pumpAt(tester, const Size(393, 852));

    await tester.tap(find.text('Mov.'));
    await tester.pumpAndSettle();

    expect(find.text('Movimientos'), findsOneWidget);
    expect(find.text('Uber'), findsOneWidget);
    expect(find.text('Starbucks'), findsOneWidget);

    await tester.tap(find.text('Uber'));
    await tester.pumpAndSettle();

    expect(find.text('Movimiento'), findsOneWidget);
    // The source row intentionally remains behind the modal sheet; the amount can exist twice.
    expect(find.text('-S/ 18.70'), findsWidgets);
    expect(find.text('evidencia sintética'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Sensor exposes opportunity review and change flows', (tester) async {
    await pumpAt(tester, const Size(393, 852));

    await tester.tap(find.text('Sensor'));
    await tester.pumpAndSettle();

    expect(find.text('Lo que cambió.'), findsOneWidget);
    expect(find.text('Oportunidad'), findsOneWidget);
    expect(find.text('Necesitamos tu ayuda'), findsOneWidget);
    expect(find.text('Cambió'), findsOneWidget);

    await tester.tap(find.text('Oportunidad'));
    await tester.pumpAndSettle();
    // The source signal remains mounted behind the sheet; the amount can exist twice.
    expect(find.text('~S/75'), findsWidgets);
    expect(find.text('dato sintético'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('You screen states that real OAuth and data are absent', (tester) async {
    await pumpAt(tester, const Size(430, 900));

    await tester.tap(find.text('Tú'));
    await tester.pumpAndSettle();

    expect(find.text('Conexiones'), findsOneWidget);
    expect(find.text('Privacidad'), findsOneWidget);
    expect(find.text('Product Lab'), findsOneWidget);

    await tester.tap(find.text('Product Lab'));
    await tester.pumpAndSettle();

    expect(find.text('Red'), findsOneWidget);
    expect(find.text('No utilizada'), findsOneWidget);
    expect(find.text('Credenciales'), findsOneWidget);
    expect(find.text('Ninguna'), findsOneWidget);
    expect(find.text('BUILD_READY'), findsOneWidget);
    expect(find.text('NO'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
