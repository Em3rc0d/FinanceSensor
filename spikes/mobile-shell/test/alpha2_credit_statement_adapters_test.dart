import 'package:financesensor_mobile_shell/alpha2/alpha2_credit_statement_adapters.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_statement_geometry.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const ripley = Alpha2StrictRipleyCreditAdapter();
  const bcpProbe = Alpha2BcpCreditStructuralProbe();

  test('Ripley strict adapter imports ledger totals and excludes summary/formulas', () {
    final result = ripley.parse(
      layout: _ripleyLayout(),
      sourceReceiptId: 'stmt-src:ripley-public-template',
      tenantId: 'tenant-1',
    );

    expect(result.importable, isTrue);
    expect(result.reviewCodes, isEmpty);
    expect(result.evidence, hasLength(2));

    final purchase = result.evidence[0];
    expect(purchase.amount, 120.50);
    expect(purchase.flowDirection, Alpha2FlowDirection.outflow);
    expect(purchase.semanticType, Alpha2SemanticType.expense);
    expect(purchase.merchantCanonical, 'comercio prueba');

    final payment = result.evidence[1];
    expect(payment.amount, 50.00);
    expect(payment.flowDirection, Alpha2FlowDirection.inflow);
    expect(payment.semanticType, Alpha2SemanticType.cardPayment);
    expect(payment.merchantCanonical, 'pago recibido');

    expect(result.evidence.every((item) => item.amount != 9999), isTrue);
    expect(result.evidence.every((item) => item.amount != 7777), isTrue);
  });

  test('Ripley billing period ignores unrelated nearby dates', () {
    final result = ripley.parse(
      layout: _ripleyLayout(includeNearbyUnrelatedDate: true),
      sourceReceiptId: 'stmt-src:ripley-nearby-date',
      tenantId: 'tenant-1',
    );

    expect(result.importable, isTrue);
    expect(result.reviewCodes, isEmpty);
    expect(result.statementPeriodId, contains('2026-08-01'));
    expect(result.statementPeriodId, contains('2026-08-31'));
  });

  test('Ripley conflicting anchored billing periods still fail closed', () {
    final result = ripley.parse(
      layout: _ripleyLayout(includeConflictingPeriod: true),
      sourceReceiptId: 'stmt-src:ripley-conflicting-period',
      tenantId: 'tenant-1',
    );

    expect(result.importable, isFalse);
    expect(result.evidence, isEmpty);
    expect(
      result.reviewCodes,
      contains('RIPLEY_CREDIT_PERIOD_AMBIGUOUS'),
    );
  });

  test('Ripley unknown undated monetary row fails closed', () {
    final result = ripley.parse(
      layout: _ripleyLayout(includeUnknownUndatedMonetaryRow: true),
      sourceReceiptId: 'stmt-src:ripley-negative',
      tenantId: 'tenant-1',
    );

    expect(result.importable, isFalse);
    expect(
      result.reviewCodes,
      contains('RIPLEY_CREDIT_MONETARY_ROW_UNEXPLAINED'),
    );
  });

  test('Ripley rate/installment numbers are not movement amount authority', () {
    final result = ripley.parse(
      layout: _ripleyLayout(totalAmount: '35.10', noisyRate: '99.99'),
      sourceReceiptId: 'stmt-src:ripley-column-authority',
      tenantId: 'tenant-1',
    );

    expect(result.importable, isTrue);
    expect(result.evidence.first.amount, 35.10);
  });

  test('Ripley physical header variant accepts operation date and TEA/TNA', () {
    final result = ripley.parse(
      layout: _ripleyPhysicalHeaderLayout(),
      sourceReceiptId: 'stmt-src:ripley-physical-header-variant',
      tenantId: 'tenant-1',
    );

    expect(result.importable, isTrue);
    expect(result.reviewCodes, isEmpty);
    expect(result.evidence, hasLength(3));
    expect(result.evidence.map((item) => item.amount).toList(), <double>[
      243.46,
      20.90,
      2.94,
    ]);
    expect(
      result.evidence.map((item) => item.semanticType).toList(),
      <Alpha2SemanticType>[
        Alpha2SemanticType.cardPayment,
        Alpha2SemanticType.expense,
        Alpha2SemanticType.fee,
      ],
    );
    expect(result.evidence.every((item) => item.amount != 243.45), isTrue);
  });

  test('BCP credit probe emits only coarse whitelisted structural code', () {
    final result = bcpProbe.inspect(
      layout: Alpha2StatementLayout(
        pages: <Alpha2LayoutPage>[
          Alpha2LayoutPage(
            pageNumber: 1,
            items: <Alpha2LayoutItem>[
              _item('BCP', 10, 800, 0),
              _item('Periodo de facturación', 10, 780, 1),
              _item('Fecha de consumo', 10, 760, 2),
              _item('Fecha de proceso', 120, 760, 3),
              _item('Descripción', 240, 760, 4),
              _item('Monto', 400, 760, 5),
              _item('Pago mínimo', 10, 700, 6),
              _item('Soles', 10, 680, 7),
              _item('USD', 10, 660, 8),
              _item('Cuotas TEA', 10, 640, 9),
              _item('TIENDA PRIVADA 123.45', 240, 600, 10),
            ],
          ),
        ],
        pageCount: 1,
      ),
    );

    expect(result.evidence, isEmpty);
    expect(result.importable, isFalse);
    expect(
      result.reviewCodes,
      contains('BCP_CREDIT_ADAPTER_CERTIFICATION_REQUIRED'),
    );
    final structural = result.reviewCodes.singleWhere(
      (code) => code.startsWith(alpha2BcpCreditProbePrefix),
    );
    expect(
      RegExp(r'^BCP_CREDIT_STRUCTURAL_V1_P(?:0|1|2_4|5P)_M[0-9A-F]{3}$')
          .hasMatch(structural),
      isTrue,
    );
    expect(result.reviewCodes.join(' '), isNot(contains('TIENDA PRIVADA')));
    expect(result.reviewCodes.join(' '), isNot(contains('123.45')));
  });
}

Alpha2StatementLayout _ripleyLayout({
  bool includeUnknownUndatedMonetaryRow = false,
  bool includeNearbyUnrelatedDate = false,
  bool includeConflictingPeriod = false,
  String totalAmount = '120.50',
  String noisyRate = '12.34',
}) {
  final items = <Alpha2LayoutItem>[
    _item('Periodo de facturación 01/08/2026 - 31/08/2026', 20, 790, 0),
    if (includeNearbyUnrelatedDate)
      _item('Fecha límite 15/09/2026', 20, 775, 100),
    if (includeConflictingPeriod)
      _item('Periodo de facturación 01/07/2026 - 31/07/2026', 20, 770, 101),
    _item('Pago Total del Mes', 20, 760, 1),
    _item('9999.00', 850, 760, 2),
    _item('Tus movimientos del mes', 20, 730, 3),
    _item('Fecha de consumo', 20, 700, 4),
    _item('Fecha de proceso', 100, 700, 5),
    _item('N° de Ticket', 180, 700, 6),
    _item('Descripción', 280, 700, 7),
    _item('T/A', 420, 700, 8),
    _item('Monto', 500, 700, 9),
    _item('TEA', 580, 700, 10),
    _item('N° de cuotas', 630, 700, 11),
    _item('Valor cuota', 700, 700, 12),
    _item('Capital', 760, 700, 13),
    _item('Interés', 820, 700, 14),
    _item('Total', 900, 700, 15),
    _item('05/08/2026', 20, 650, 16),
    _item('06/08/2026', 100, 650, 17),
    _item('T001', 180, 650, 18),
    _item('COMERCIO PRUEBA', 280, 650, 19),
    _item('T', 420, 650, 20),
    _item('100.00', 500, 650, 21),
    _item(noisyRate, 580, 650, 22),
    _item('2', 630, 650, 23),
    _item('60.25', 700, 650, 24),
    _item('110.00', 760, 650, 25),
    _item('10.50', 820, 650, 26),
    _item(totalAmount, 900, 650, 27),
    _item('08/08/2026', 20, 610, 28),
    _item('09/08/2026', 100, 610, 29),
    _item('T002', 180, 610, 30),
    _item('PAGO RECIBIDO', 280, 610, 31),
    _item('T', 420, 610, 32),
    _item('50.00', 500, 610, 33),
    _item('0.00', 580, 610, 34),
    _item('1', 630, 610, 35),
    _item('50.00', 700, 610, 36),
    _item('50.00', 760, 610, 37),
    _item('0.00', 820, 610, 38),
    _item('50.00-', 900, 610, 39),
    if (includeUnknownUndatedMonetaryRow) ...<Alpha2LayoutItem>[
      _item('FILA DESCONOCIDA', 280, 570, 40),
      _item('42.00', 900, 570, 41),
    ],
    _item('Cómo se calcula el Pago Total', 20, 300, 42),
    _item('7777.00', 900, 250, 43),
  ];
  return Alpha2StatementLayout(
    pages: <Alpha2LayoutPage>[
      Alpha2LayoutPage(pageNumber: 1, items: items),
    ],
    pageCount: 1,
  );
}

Alpha2StatementLayout _ripleyPhysicalHeaderLayout() {
  final items = <Alpha2LayoutItem>[
    _item('Periodo de facturación 01/08/2026 - 31/08/2026', 20, 850, 0),
    _item('EECC Tarjeta de Crédito Ripley', 500, 830, 1),
    _item('Tus movimientos del mes', 40, 820, 2),
    _item('Fecha de operación', 40, 780, 3),
    _item('Fecha de proceso', 120, 780, 4),
    _item('Nº Ticket', 220, 780, 5),
    _item('Descripción', 340, 780, 6),
    _item('T/A', 430, 780, 7),
    _item('Monto', 500, 780, 8),
    _item('TEA / TNA', 560, 780, 9),
    _item('Total', 690, 780, 10),
    _item('03/AGO/2026', 40, 730, 11),
    _item('03/AGO/2026', 120, 730, 12),
    _item('288299', 220, 730, 13),
    _item('PAGO DIGITAL OTRO BANCO', 285, 730, 14),
    _item('-243.46', 690, 730, 15),
    _item('15/AGO/2026', 40, 700, 16),
    _item('16/AGO/2026', 120, 700, 17),
    _item('008665', 220, 700, 18),
    _item('COMERCIO DEMO', 285, 700, 19),
    _item('T', 430, 700, 20),
    _item('20.90', 500, 700, 21),
    _item('109.83%', 560, 700, 22),
    _item('20.90', 690, 700, 23),
    _item('22/AGO/2026', 40, 670, 24),
    _item('22/AGO/2026', 120, 670, 25),
    _item('SEGURO DE DESGRAVAMEN', 285, 670, 26),
    _item('2.94', 690, 670, 27),
    _item('SALDO INICIAL', 285, 640, 28),
    _item('243.45', 690, 640, 29),
  ];
  return Alpha2StatementLayout(
    pages: <Alpha2LayoutPage>[
      Alpha2LayoutPage(pageNumber: 1, items: items),
    ],
    pageCount: 1,
  );
}

Alpha2LayoutItem _item(
  String text,
  double x,
  double y,
  int sequence,
) =>
    Alpha2LayoutItem(
      text: text,
      x: x,
      y: y,
      width: 60,
      sequence: sequence,
    );
