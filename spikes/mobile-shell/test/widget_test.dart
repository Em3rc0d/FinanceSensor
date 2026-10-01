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

  void expectFullyVisible(WidgetTester tester, Finder finder, Size viewport) {
    expect(finder, findsAtLeastNWidgets(1));
    final Rect rect = tester.getRect(finder.first);
    expect(rect.left, greaterThanOrEqualTo(0));
    expect(rect.top, greaterThanOrEqualTo(0));
    expect(rect.right, lessThanOrEqualTo(viewport.width));
    expect(rect.bottom, lessThanOrEqualTo(viewport.height));
  }

  testWidgets('compact Home is structurally no-scroll and critical answers stay in first viewport', (tester) async {
    const Size viewport = Size(360, 800);
    await pumpAt(tester, viewport);

    expect(find.text('PRODUCT LAB · DATOS 100% SINTÉTICOS'), findsOneWidget);
    expect(find.text('Tu dinero, en contexto.'), findsOneWidget);
    expect(find.text('S/ 586'), findsOneWidget);
    expect(find.text('FinanceSensor encontró algo'), findsOneWidget);
    expect(find.text('Inicio'), findsOneWidget);
    expect(find.text('Mov.'), findsOneWidget);
    expect(find.text('Sensor'), findsOneWidget);
    expect(find.text('Tú'), findsOneWidget);

    expect(
      find.descendant(of: find.byType(HomePage), matching: find.byType(Scrollable)),
      findsNothing,
      reason: 'VIEW-003: Home cannot solve density by adding vertical scrolling.',
    );

    for (final Finder critical in <Finder>[
      find.text('Tu dinero, en contexto.'),
      find.text('S/ 586'),
      find.text('S/ 1,520'),
      find.text('S/ 934'),
      find.text('¿Dónde se fue?'),
      find.text('Presupuesto'),
      find.text('FinanceSensor encontró algo'),
      find.text('~S/75 ›'),
      find.text('Inicio'),
    ]) {
      expectFullyVisible(tester, critical, viewport);
    }

    expect(tester.takeException(), isNull);
  });

  testWidgets('compact Sensor is structurally no-scroll and all three material signals are visible', (tester) async {
    const Size viewport = Size(360, 800);
    await pumpAt(tester, viewport);

    await tester.tap(find.text('Sensor'));
    await tester.pumpAndSettle();

    expect(
      find.descendant(of: find.byType(SensorPage), matching: find.byType(Scrollable)),
      findsNothing,
      reason: 'VIEW-004: Sensor overview cannot require vertical exploration.',
    );

    for (final Finder critical in <Finder>[
      find.text('Lo que cambió.'),
      find.text('Hay señales para mirar'),
      find.text('Oportunidad'),
      find.text('Necesitamos tu ayuda'),
      find.text('Cambió'),
      find.text('~S/75'),
      find.text('S/49.90'),
      find.text('+S/25'),
    ]) {
      expectFullyVisible(tester, critical, viewport);
    }

    expect(tester.takeException(), isNull);
  });

  testWidgets('Opportunity signature fits compact viewport and exposes its primary option without scrolling', (tester) async {
    const Size viewport = Size(360, 800);
    await pumpAt(tester, viewport);

    await tester.tap(find.text('Sensor'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Oportunidad'));
    await tester.pumpAndSettle();

    expect(find.text('Oportunidad'), findsWidgets);
    expect(find.text('~S/75'), findsWidgets);
    expect(find.text('impacto potencial · dato sintético'), findsOneWidget);
    expect(find.text('Crear un límite'), findsOneWidget);

    for (final Finder critical in <Finder>[
      find.text('~S/75').last,
      find.text('Crear un límite'),
    ]) {
      expectFullyVisible(tester, critical, viewport);
    }

    expect(tester.takeException(), isNull);
  });

  testWidgets('Needs Review signature fits compact viewport and keeps decision context visible', (tester) async {
    const Size viewport = Size(360, 800);
    await pumpAt(tester, viewport);

    await tester.tap(find.text('Sensor'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Necesitamos tu ayuda'));
    await tester.pumpAndSettle();

    for (final Finder critical in <Finder>[
      find.text('Necesitamos tu ayuda').last,
      find.text('S/49.90').last,
      find.text('Revisión sintética'),
      find.text('Clasificar o descartar'),
    ]) {
      expectFullyVisible(tester, critical, viewport);
    }

    expect(tester.takeException(), isNull);
  });

  testWidgets('Movements remains scrollable because chronology is an intrinsic sequence', (tester) async {
    const Size viewport = Size(393, 852);
    await pumpAt(tester, viewport);

    await tester.tap(find.text('Mov.'));
    await tester.pumpAndSettle();

    expect(find.text('Movimientos'), findsOneWidget);
    expect(find.text('Uber'), findsOneWidget);
    expect(find.text('Starbucks'), findsOneWidget);
    expect(
      find.descendant(of: find.byType(MovementsPage), matching: find.byType(Scrollable)),
      findsWidgets,
      reason: 'VIEW-006 explicitly permits scroll for intrinsic chronological sequences.',
    );

    await tester.tap(find.text('Uber'));
    await tester.pumpAndSettle();

    expect(find.text('Movimiento'), findsOneWidget);
    expect(find.text('-S/ 18.70'), findsWidgets);
    expect(find.text('evidencia sintética'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('regular Sensor exposes opportunity review and change flows', (tester) async {
    await pumpAt(tester, const Size(393, 852));

    await tester.tap(find.text('Sensor'));
    await tester.pumpAndSettle();

    expect(find.text('Lo que cambió.'), findsOneWidget);
    expect(find.text('Oportunidad'), findsOneWidget);
    expect(find.text('Necesitamos tu ayuda'), findsOneWidget);
    expect(find.text('Cambió'), findsOneWidget);

    await tester.tap(find.text('Oportunidad'));
    await tester.pumpAndSettle();
    expect(find.text('~S/75'), findsWidgets);
    expect(find.text('impacto potencial · dato sintético'), findsOneWidget);
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
