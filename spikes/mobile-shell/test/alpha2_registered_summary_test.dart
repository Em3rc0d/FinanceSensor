import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_registered_summary.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_registered_summary_view.dart';

Alpha2CanonicalTransaction tx(
  String id, {
  double amount = 10,
  String currency = 'PEN',
  String tenant = 't',
  String? account,
  String? category,
  Alpha2SemanticType kind = Alpha2SemanticType.expense,
  DateTime? at,
}) => Alpha2CanonicalTransaction(
  id: id,
  tenantId: tenant,
  evidenceIds: ['e-$id'],
  amount: amount,
  currency: currency,
  occurredAt: at ?? DateTime.utc(2026, 11, 10, 12),
  semanticType: kind,
  truthState: Alpha2TruthState.reconciled,
  flowDirection: Alpha2FlowDirection.outflow,
  accountId: account,
  categoryName: category,
);

void main() {
  test('scope respects Lima month boundaries and injected clock', () {
    final scope = Alpha2ReportScope.current(
      () => DateTime.utc(2026, 12, 1, 4, 59),
    );
    expect(scope.month, 11);
    final summary = Alpha2RegisteredSummary(
      tenantId: 't',
      scope: scope,
      events: [
        tx('before', at: DateTime.utc(2026, 11, 1, 4, 59)),
        tx('start', at: DateTime.utc(2026, 11, 1, 5)),
        tx('last', at: DateTime.utc(2026, 12, 1, 4, 59)),
        tx('end', at: DateTime.utc(2026, 12, 1, 5)),
      ],
    );
    expect(summary.transactions.map((e) => e.id), ['last', 'start']);
  });

  test('selection isolates tenant, confirmed account and currency', () {
    final events = [
      tx('pen', account: 'a'),
      tx('usd', account: 'a', currency: 'USD'),
      tx('other', account: 'b'),
      tx('unmapped'),
      tx('foreign', tenant: 'other', account: 'a'),
    ];
    final summary = Alpha2RegisteredSummary(
      tenantId: 't',
      scope: const Alpha2ReportScope(accountId: 'a'),
      events: events,
      confirmedAccounts: {'a', 'b'},
    );
    expect(summary.transactions.map((e) => e.id), ['pen', 'usd']);
    expect(summary.buckets.map((b) => b.currency), ['PEN', 'USD']);
    final unassigned = Alpha2RegisteredSummary(
      tenantId: 't',
      scope: const Alpha2ReportScope(unassignedOnly: true),
      events: events,
      confirmedAccounts: {'a'},
    );
    expect(unassigned.transactions.map((e) => e.id), ['other', 'unmapped']);
    expect(
      Alpha2RegisteredSummary(
        tenantId: 't',
        scope: const Alpha2ReportScope(accountId: 'b'),
        events: events,
        confirmedAccounts: {'a'},
      ).transactions,
      isEmpty,
    );
  });

  test(
    'economic classes do not double consumption or treat cash as spending',
    () {
      final summary = Alpha2RegisteredSummary(
        tenantId: 't',
        scope: const Alpha2ReportScope(),
        events: [
          tx('purchase', amount: 100),
          tx('payment', amount: 100, kind: Alpha2SemanticType.cardPayment),
          tx('withdraw', amount: 100, kind: Alpha2SemanticType.cashWithdrawal),
          tx(
            'transfer',
            amount: 100,
            kind: Alpha2SemanticType.internalTransfer,
          ),
          tx('refund', amount: 40, kind: Alpha2SemanticType.refund),
          tx('reverse', amount: 20, kind: Alpha2SemanticType.reversal),
          tx('fee', amount: 1.71, kind: Alpha2SemanticType.fee),
          tx('unknown', kind: Alpha2SemanticType.unknown),
        ],
      );
      expect(
        summary.buckets
            .singleWhere((b) => b.kind == Alpha2ReportKind.consumption)
            .minorUnits,
        10000,
      );
      expect(
        summary.buckets
            .singleWhere((b) => b.kind == Alpha2ReportKind.refund)
            .minorUnits,
        4000,
      );
      expect(
        summary.buckets
            .singleWhere((b) => b.kind == Alpha2ReportKind.fee)
            .minorUnits,
        171,
      );
      expect(summary.categoryPendingCount, 2);
      expect(summary.interpretationPendingCount, 1);
      expect(summary.coverageLabel, contains('parcial'));
      for (final bucket in summary.buckets) {
        expect(
          bucket.minorUnits,
          bucket.events.fold<int>(
            0,
            (sum, e) => sum + (e.amount * 100).round(),
          ),
        );
      }
    },
  );

  test(
    'integer sums, duplicate rejection and filtering leave input intact',
    () {
      final events = [tx('a', amount: .1), tx('b', amount: .2)];
      for (var i = 0; i < 10; i++) {
        final summary = Alpha2RegisteredSummary(
          tenantId: 't',
          scope: const Alpha2ReportScope(),
          events: events,
        );
        expect(summary.buckets.single.minorUnits, 30);
      }
      expect(events.map((e) => e.id), ['a', 'b']);
      expect(
        () => Alpha2RegisteredSummary(
          tenantId: 't',
          scope: const Alpha2ReportScope(),
          events: [events.first, events.first],
        ),
        throwsArgumentError,
      );
      expect(() => alpha2RegisteredMinorUnits(1.001), throwsArgumentError);
      expect(() => alpha2RegisteredMinorUnits(double.nan), throwsArgumentError);
    },
  );

  test(
    'local provenance never returns another tenant or unlinked evidence',
    () {
      Alpha2Evidence source(String id, String tenant) => Alpha2Evidence(
        evidenceId: id,
        tenantId: tenant,
        amount: 10,
        currency: 'PEN',
        occurredAt: DateTime.utc(2026, 11, 10, 12),
        processedAt: DateTime.utc(2026, 11, 11, 12),
        semanticType: Alpha2SemanticType.expense,
        channel: Alpha2EvidenceChannel.statementLedger,
        truthState: Alpha2TruthState.posted,
      );
      final result = alpha2LocalProvenance(
        event: tx('a'),
        tenantId: 't',
        evidence: [
          source('e-a', 't'),
          source('e-a', 'other'),
          source('e-b', 't'),
        ],
      );
      expect(result, hasLength(1));
      expect(result.single.processedAt, DateTime.utc(2026, 11, 11, 12));
      expect(
        alpha2LocalProvenance(
          event: tx('a', tenant: 'other'),
          tenantId: 't',
          evidence: result,
        ),
        isEmpty,
      );
    },
  );

  test(
    'empty and historical scopes never inherit reconciliation or fabricate income',
    () {
      final empty = Alpha2RegisteredSummary(
        tenantId: 't',
        scope: const Alpha2ReportScope(year: 2026, month: 10),
        events: [tx('a')],
      );
      expect(empty.buckets, isEmpty);
      expect(empty.coverageLabel, contains('parcial'));
      final all = Alpha2RegisteredSummary(
        tenantId: 't',
        scope: const Alpha2ReportScope(),
        events: [
          tx('a'),
          tx('fee', kind: Alpha2SemanticType.fee),
        ],
      );
      expect(
        all.buckets.any((b) => b.kind == Alpha2ReportKind.income),
        isFalse,
      );
      expect(
        all.transactions.every(
          (e) => e.truthState == Alpha2TruthState.reconciled,
        ),
        isTrue,
      );
      expect(all.coverageLabel, contains('no acredita'));
    },
  );

  testWidgets(
    'account selection filters the report and survives refreshed inputs',
    (tester) async {
      final rows = [
        tx('a', account: 'account-a'),
        tx('b', account: 'account-b'),
      ];
      Widget screen(List<Alpha2CanonicalTransaction> events) => MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: Alpha2RegisteredSummaryView(
              tenantId: 't',
              events: events,
              evidence: const [],
              confirmedAccounts: const {'account-a', 'account-b'},
              updatedAt: DateTime.utc(2026, 11, 19, 12),
              clock: () => DateTime.utc(2026, 11, 19, 12),
            ),
          ),
        ),
      );
      await tester.pumpWidget(screen(rows));
      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cuenta …ount-a').last);
      await tester.pumpAndSettle();
      await tester.pumpWidget(
        screen([...rows, tx('new', account: 'account-b')]),
      );
      await tester.pumpAndSettle();
      expect(find.text('1 movimientos en la selección'), findsOneWidget);
      expect(rows, hasLength(2));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'movement detail shows local processing date and opaque source reference',
    (tester) async {
      final source = Alpha2Evidence(
        evidenceId: 'e-a',
        tenantId: 't',
        amount: 10,
        currency: 'PEN',
        occurredAt: DateTime.utc(2026, 11, 10, 12),
        processedAt: DateTime.utc(2026, 11, 11, 12),
        semanticType: Alpha2SemanticType.expense,
        channel: Alpha2EvidenceChannel.statementLedger,
        truthState: Alpha2TruthState.posted,
        institutionCode: 'SYNTHETIC',
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: Alpha2RegisteredSummaryView(
                tenantId: 't',
                events: [tx('a')],
                evidence: [source],
                updatedAt: DateTime.utc(2026, 11, 19, 12),
                clock: () => DateTime.utc(2026, 11, 19, 12),
              ),
            ),
          ),
        ),
      );
      await tester.ensureVisible(find.byKey(const ValueKey('res-event-a')));
      await tester.tap(find.byKey(const ValueKey('res-event-a')));
      await tester.pumpAndSettle();
      expect(find.text('Procesamiento: 11/11/2026'), findsOneWidget);
      expect(find.textContaining('Referencia local: e-a'), findsOneWidget);
      expect(find.text('Fuente no disponible.'), findsNothing);
    },
  );

  testWidgets(
    'scope, exact component drill-down and missing source are accessible',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: Alpha2RegisteredSummaryView(
                tenantId: 't',
                events: [tx('purchase', amount: 100)],
                evidence: const [],
                updatedAt: DateTime.utc(2026, 11, 19, 12),
                clock: () => DateTime.utc(2026, 11, 19, 12),
              ),
            ),
          ),
        ),
      );
      expect(find.text('Resumen registrado'), findsOneWidget);
      expect(find.textContaining('No es saldo disponible'), findsOneWidget);
      await tester.tap(find.text('Consumo identificado').first);
      await tester.pumpAndSettle();
      expect(find.text('PEN 100.00 · 1 componentes'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('res-event-purchase')));
      await tester.pumpAndSettle();
      expect(find.text('Origen del movimiento'), findsOneWidget);
      expect(find.text('Fuente no disponible.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'large text and account/month controls do not overflow or mutate events',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final events = [
        tx('a', account: 'confirmed-a'),
        tx('nov', at: DateTime.utc(2026, 10, 10, 12)),
      ];
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(
              size: Size(360, 800),
              textScaler: TextScaler.linear(2),
            ),
            child: Scaffold(
              body: SingleChildScrollView(
                child: Alpha2RegisteredSummaryView(
                  tenantId: 't',
                  events: events,
                  evidence: const [],
                  confirmedAccounts: const {'confirmed-a'},
                  updatedAt: DateTime.utc(2026, 11, 19, 12),
                  clock: () => DateTime.utc(2026, 11, 19, 12),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.byTooltip('Mes anterior'));
      await tester.pumpAndSettle();
      expect(find.text('10/2026'), findsOneWidget);
      expect(events, hasLength(2));
      expect(tester.takeException(), isNull);
    },
  );
}
