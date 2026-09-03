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
              'disconnectBarrierActive': false,
              'providerRevokeVerified': false,
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
              'disconnectBarrierActive': false,
              'providerRevokeVerified': false,
              'explicitReconnect': false,
              'consentResolutionObserved': true,
              'providerGrantReused': false,
            };
          case 'disconnectGmail':
            return <String, Object?>{
              'state': 'DISCONNECTED_VERIFIED',
              'accessTokenExposedToFlutter': false,
              'refreshTokenHeldByApp': false,
              'offlineAccessRequested': false,
              'disconnectBarrierActive': true,
              'providerRevokeVerified': true,
              'oldTokenDeniedAfterRevoke': true,
              'providerRevokeHttpStatus': 401,
            };
        }
        return null;
      },
    );
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
  });

  test('OAuth authorization alone is not a verified Gmail connection', () {
    const GmailConnectionSnapshot authorized = GmailConnectionSnapshot(state: 'AUTHORIZED');
    const GmailConnectionSnapshot connected = GmailConnectionSnapshot(
      state: 'CONNECTED',
      profileReachable: true,
      historyAnchorObserved: true,
    );

    expect(authorized.isConnected, isFalse);
    expect(connected.isConnected, isTrue);
  });

  test('explicit reconnect may reuse a Google project grant after user action', () {
    const GmailConnectionSnapshot reused = GmailConnectionSnapshot(
      state: 'CONNECTED',
      profileReachable: true,
      historyAnchorObserved: true,
      explicitReconnect: true,
      consentResolutionObserved: false,
      providerGrantReused: true,
      disconnectBarrierActive: false,
    );

    expect(reused.isConnected, isTrue);
    expect(reused.providerGrantReused, isTrue);
    expect(reused.supportingState, contains('reutilizó un permiso existente'));
  });

  test('verified revoke is proven by denial of the previous bearer', () {
    const GmailConnectionSnapshot disconnected = GmailConnectionSnapshot(
      state: 'DISCONNECTED_VERIFIED',
      disconnectBarrierActive: true,
      providerRevokeVerified: true,
      oldTokenDeniedAfterRevoke: true,
      providerRevokeHttpStatus: 401,
    );

    expect(disconnected.isConnected, isFalse);
    expect(disconnected.humanState, 'Desconectado');
    expect(disconnected.menuSubtitle, 'Gmail · desconectado');
    expect(disconnected.supportingState, contains('token anterior ya no accede'));
  });

  test('unverified provider revoke still stays locally disconnected', () {
    const GmailConnectionSnapshot disconnected = GmailConnectionSnapshot(
      state: 'DISCONNECTED',
      disconnectBarrierActive: true,
      providerRevokeVerified: false,
    );

    expect(disconnected.isConnected, isFalse);
    expect(disconnected.humanState, 'Desconectado');
    expect(disconnected.menuSubtitle, 'Gmail · desconectado');
    expect(disconnected.supportingState, contains('barrera local permanece activa'));
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

  testWidgets('disconnect reports previous-bearer revoke proof and local barrier', (tester) async {
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
    await tester.tap(find.text('Desconectar y revocar acceso'));
    await tester.pumpAndSettle();

    expect(find.text('Desconectado'), findsOneWidget);
    expect(find.text('Acceso local cerrado; el token anterior ya no accede a Gmail.'), findsOneWidget);
    expect(find.text('Barrera de desconexión'), findsOneWidget);
    expect(find.text('Revocación Google'), findsOneWidget);
    expect(find.text('Verificada'), findsOneWidget);
    expect(find.text('Conectar Gmail'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}