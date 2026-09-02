import 'package:financesensor_mobile_shell/main_connected.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const MethodChannel channel = MethodChannel('com.financesensor.platform/gmail');

  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      (MethodCall call) async {
        switch (call.method) {
          case 'getGmailState':
            return <String, Object?>{
              'state': 'READY_TO_CONNECT',
              'scope': 'https://www.googleapis.com/auth/gmail.readonly',
              'accessTokenExposedToFlutter': false,
              'refreshTokenHeldByApp': false,
              'offlineAccessRequested': false,
            };
          case 'authorizeGmail':
          case 'probeGmail':
            return <String, Object?>{
              'state': 'CONNECTED',
              'scope': 'https://www.googleapis.com/auth/gmail.readonly',
              'accessTokenExposedToFlutter': false,
              'refreshTokenHeldByApp': false,
              'offlineAccessRequested': false,
              'profileReachable': true,
              'historyAnchorObserved': true,
              'messageCount': 42,
              'threadCount': 31,
              'latencyMs': 120,
              'responseBytes': 128,
            };
          case 'disconnectGmail':
            return <String, Object?>{
              'state': 'DISCONNECTED',
              'accessTokenExposedToFlutter': false,
              'refreshTokenHeldByApp': false,
              'offlineAccessRequested': false,
            };
        }
        return null;
      },
    );
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });

  testWidgets('Android connection surface starts disconnected and exposes privacy boundary', (tester) async {
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(const FinanceSensorConnectedApp());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tú'));
    await tester.pumpAndSettle();

    expect(find.text('CONNECTION LAB · FINANZAS SINTÉTICAS'), findsOneWidget);
    expect(find.text('Gmail · listo para conectar'), findsOneWidget);
    expect(find.text('Bearer fuera de Flutter · refresh token en app: 0'), findsOneWidget);

    await tester.tap(find.text('Conexiones'));
    await tester.pumpAndSettle();

    expect(find.text('Conectar Gmail'), findsWidgets);
    expect(find.text('Gmail solo lectura'), findsOneWidget);
    expect(find.text('No solicitado'), findsOneWidget);
    expect(find.text('Refresh token en app'), findsOneWidget);
    expect(find.text('Bearer hacia Flutter'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('successful native authorization exposes only coarse Gmail state to Flutter', (tester) async {
    tester.view.physicalSize = const Size(430, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(const FinanceSensorConnectedApp());
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tú'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Conexiones'));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, 'Conectar Gmail'));
    await tester.pumpAndSettle();

    expect(find.text('Conectado'), findsOneWidget);
    expect(find.text('Gmail respondió y se observó un ancla de historial.'), findsOneWidget);
    expect(find.text('Mensajes reportados'), findsOneWidget);
    expect(find.text('42'), findsOneWidget);
    expect(find.text('Probar acceso Gmail'), findsOneWidget);
    expect(find.text('Desconectar y revocar acceso'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
