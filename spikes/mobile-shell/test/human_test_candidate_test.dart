import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../lib/main_human_test.dart';

void main() {
  test('derived event preserves card payment semantics outside expense', () {
    final event = FinancialEvent.fromMap(<Object?, Object?>{
      'amount': 120.50,
      'currency': 'PEN',
      'semanticType': 'CARD_PAYMENT',
      'merchant': 'Pago de tarjeta',
      'adapterId': 'BCP_CARD_PAYMENT',
      'confidence': .96,
    });

    expect(event.isCardPayment, isTrue);
    expect(event.isExpense, isFalse);
    expect(event.amountLabel, 'S/ 120.50');
  });

  test('scan snapshot contains only derived event model and bounded counters', () {
    final snapshot = ScanState.fromMap(<Object?, Object?>{
      'status': 'SCAN_COMPLETE',
      'messagesInspected': 240,
      'candidates': 3,
      'fullMessagesFetched': 3,
      'parseMisses': 1,
      'maxMessages': 300,
      'events': <Object?>[
        <Object?, Object?>{
          'amount': 10,
          'currency': 'PEN',
          'semanticType': 'EXPENSE',
          'merchant': 'DEMO',
          'adapterId': 'BCP_CARD_PURCHASE',
          'confidence': .96,
        },
      ],
    });

    expect(snapshot.messagesInspected, 240);
    expect(snapshot.fullMessagesFetched, 3);
    expect(snapshot.events, hasLength(1));
    expect(snapshot.maxMessages, 300);
  });

  testWidgets('human-test home renders on compact Android viewport without overflow', (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const FinanceSensorHumanTestApp());
    await tester.pump();

    expect(find.textContaining('ALPHA HUMANA'), findsOneWidget);
    expect(find.text('Conecta tu primera fuente'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('human-test surface states its session-only privacy boundary', (tester) async {
    await tester.pumpWidget(const FinanceSensorHumanTestApp());
    await tester.pump();

    expect(find.textContaining('DATOS REALES SOLO EN ESTA SESIÓN'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
