import 'package:financesensor_mobile_shell/alpha2/alpha2_statement_geometry.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_statement_strict_adapter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const parser = Alpha2StrictBcpSavingsAdapter();

  test('one unexplained monetary row quarantines the whole statement batch', () {
    final result = parser.parse(
      layout: _layout(includeBrokenMonetaryRow: true),
      sourceReceiptId: 'stmt-src:test-partial',
      tenantId: 'tenant-1',
    );
    expect(result.evidence, hasLength(1));
    expect(result.importable, isFalse);
    expect(result.reviewCodes, contains(alpha2UnexplainedMonetaryRowCode));
  });

  test('fully explained monetary rows remain importable', () {
    final result = parser.parse(
      layout: _layout(includeBrokenMonetaryRow: false),
      sourceReceiptId: 'stmt-src:test-complete',
      tenantId: 'tenant-1',
    );
    expect(result.evidence, hasLength(1));
    expect(result.reviewCodes, isEmpty);
    expect(result.importable, isTrue);
  });

  test('strict audit reconstructs fragmented BCP debit and credit headers', () {
    final result = parser.parse(
      layout: _layout(includeBrokenMonetaryRow: false, fragmentedHeaders: true),
      sourceReceiptId: 'stmt-src:test-fragmented-headers',
      tenantId: 'tenant-1',
    );
    expect(result.evidence, hasLength(1));
    expect(result.reviewCodes, isEmpty);
    expect(result.importable, isTrue);
    expect(result.reviewCodes, isNot(contains(alpha2CompletenessGeometryUnknownCode)));
  });

  test('certified BCP balance and total rows are not ledger movements', () {
    final result = parser.parse(
      layout: _layout(includeBrokenMonetaryRow: false, includeBcpSummaryRows: true),
      sourceReceiptId: 'stmt-src:test-bcp-summary',
      tenantId: 'tenant-1',
    );
    expect(result.evidence, hasLength(1));
    expect(result.reviewCodes, isEmpty);
    expect(result.importable, isTrue);
  });

  test('unknown undated monetary row still fails closed', () {
    final result = parser.parse(
      layout: _layout(includeBrokenMonetaryRow: false, includeUnknownFooter: true),
      sourceReceiptId: 'stmt-src:test-unknown-footer',
      tenantId: 'tenant-1',
    );
    expect(result.evidence, hasLength(1));
    expect(result.importable, isFalse);
    expect(result.reviewCodes, contains(alpha2UnexplainedMonetaryRowCode));
  });
}

Alpha2StatementLayout _layout({
  required bool includeBrokenMonetaryRow,
  bool fragmentedHeaders = false,
  bool includeBcpSummaryRows = false,
  bool includeUnknownFooter = false,
}) {
  final items = <Alpha2LayoutItem>[
    _item('ESTADO DE CUENTA DE AHORROS CUENTA DIGITAL BCP', 20, 780, 0),
    _item('DEL 01/08/2026 AL 31/08/2026', 20, 750, 1),
    _item('FECHA PROC.', 20, 700, 2),
    _item('FECHA VALOR', 100, 700, 3),
    _item('DESCRIPCION', 200, 700, 4),
    if (!fragmentedHeaders) ...<Alpha2LayoutItem>[
      _item('CARGOS / DEBE', 400, 700, 5),
      _item('ABONOS / HABER', 500, 700, 6),
    ] else ...<Alpha2LayoutItem>[
      _item('CARGOS /', 400, 700, 5),
      _item('DEBE', 445, 700, 6),
      _item('ABONOS /', 500, 700, 7),
      _item('HABER', 550, 700, 8),
    ],
    _item('15AGO', 20, 650, 9),
    _item('15AGO', 100, 650, 10),
    _item('COMPRA LOCAL', 200, 650, 11),
    _item('10.00', 400, 650, 12),
  ];
  var sequence = 13;
  if (includeBcpSummaryRows) {
    items.addAll(<Alpha2LayoutItem>[
      _item('SALDO ANTERIOR', 200, 680, sequence++),
      _item('1,000.00', 500, 680, sequence++),
      _item('TOTAL MOVIMIENTO', 200, 600, sequence++),
      _item('10.00', 400, 600, sequence++),
      _item('SALDO', 200, 580, sequence++),
      _item('990.00', 500, 580, sequence++),
    ]);
  }
  if (includeBrokenMonetaryRow) {
    items.addAll(<Alpha2LayoutItem>[
      _item('FILA MONETARIA SIN FECHAS', 200, 560, sequence++),
      _item('20.00', 400, 560, sequence++),
    ]);
  }
  if (includeUnknownFooter) {
    items.addAll(<Alpha2LayoutItem>[
      _item('AJUSTE DESCONOCIDO', 200, 540, sequence++),
      _item('20.00', 400, 540, sequence++),
    ]);
  }
  return Alpha2StatementLayout(
    pages: <Alpha2LayoutPage>[Alpha2LayoutPage(pageNumber: 1, items: items)],
    pageCount: 1,
  );
}

Alpha2LayoutItem _item(String text, double x, double y, int sequence) =>
    Alpha2LayoutItem(text: text, x: x, y: y, width: 60, sequence: sequence);
