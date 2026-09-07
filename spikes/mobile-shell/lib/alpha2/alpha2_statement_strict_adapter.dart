import 'dart:math' as math;

import 'alpha2_statement_geometry.dart';

const String alpha2StatementCompletenessVersion =
    'A2_BCP_SAVINGS_COMPLETENESS_V1';
const String alpha2UnexplainedMonetaryRowCode =
    'STATEMENT_MONETARY_ROW_UNEXPLAINED';
const String alpha2CompletenessGeometryUnknownCode =
    'STATEMENT_COMPLETENESS_GEOMETRY_UNKNOWN';

/// Product-authority adapter around the statically certified BCP Savings
/// geometry parser. The geometry parser remains responsible for extracting
/// evidence. This adapter adds a fail-closed completeness condition: every
/// monetary ledger row must be geometrically explainable before any row from
/// the statement is eligible for durable import.
class Alpha2StrictBcpSavingsAdapter {
  const Alpha2StrictBcpSavingsAdapter({
    this.geometryParser = const Alpha2BcpSavingsGeometryParser(),
  });

  final Alpha2BcpSavingsGeometryParser geometryParser;

  Alpha2StatementParseResult parse({
    required Alpha2StatementLayout layout,
    required String sourceReceiptId,
    required String tenantId,
    String? accountId,
  }) {
    final base = geometryParser.parse(
      layout: layout,
      sourceReceiptId: sourceReceiptId,
      tenantId: tenantId,
      accountId: accountId,
    );
    if (base.evidence.isEmpty || base.reviewCodes.isNotEmpty) return base;

    final audit = _auditMonetaryRows(layout.pages);
    final review = <String>{...base.reviewCodes};
    if (!audit.geometryKnown) {
      review.add(alpha2CompletenessGeometryUnknownCode);
    } else if (audit.monetaryRows > audit.explainedMonetaryRows) {
      review.add(alpha2UnexplainedMonetaryRowCode);
    }

    return Alpha2StatementParseResult(
      evidence: base.evidence,
      reviewCodes: List<String>.unmodifiable(review.toList()..sort()),
      pageCount: base.pageCount,
      statementPeriodId: base.statementPeriodId,
    );
  }
}

class _CompletenessAudit {
  const _CompletenessAudit({
    required this.geometryKnown,
    required this.monetaryRows,
    required this.explainedMonetaryRows,
  });

  final bool geometryKnown;
  final int monetaryRows;
  final int explainedMonetaryRows;
}

class _StrictLine {
  _StrictLine(this.y, this.items);
  final double y;
  final List<Alpha2LayoutItem> items;
}

class _StrictHeaderGeometry {
  const _StrictHeaderGeometry({
    required this.headerY,
    required this.descriptionMinX,
    required this.debitMinX,
    required this.debitMaxX,
    required this.creditMinX,
  });

  final double headerY;
  final double descriptionMinX;
  final double debitMinX;
  final double debitMaxX;
  final double creditMinX;
}

_CompletenessAudit _auditMonetaryRows(List<Alpha2LayoutPage> pages) {
  var monetaryRows = 0;
  var explainedMonetaryRows = 0;
  var inspectedLedgerPage = false;

  for (final page in pages) {
    if (!_looksLikeBcpSavingsLedger(page)) continue;
    inspectedLedgerPage = true;
    final geometry = _strictHeaderGeometry(page);
    if (geometry == null) {
      return _CompletenessAudit(
        geometryKnown: false,
        monetaryRows: monetaryRows,
        explainedMonetaryRows: explainedMonetaryRows,
      );
    }

    for (final line in _strictLines(page)) {
      if (line.y >= geometry.headerY - 1) continue;
      final debitText = _joinItemsInRange(
        line.items,
        geometry.debitMinX,
        geometry.debitMaxX,
      );
      final creditText = _joinItemsInRange(
        line.items,
        geometry.creditMinX,
        double.infinity,
      );
      final hasDebit = (_strictMoney(debitText) ?? 0) > 0;
      final hasCredit = (_strictMoney(creditText) ?? 0) > 0;
      if (!hasDebit && !hasCredit) continue;

      monetaryRows += 1;
      final leading = line.items
          .where((item) => item.x < geometry.descriptionMinX)
          .map((item) => item.text.trim())
          .where((text) => text.isNotEmpty)
          .join(' ');
      final dateCount = RegExp(
        r'\b\d{2}\s*(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)\b',
        caseSensitive: false,
      ).allMatches(_strictNormalize(leading)).length;
      if (dateCount == 2) explainedMonetaryRows += 1;
    }
  }

  return _CompletenessAudit(
    geometryKnown: inspectedLedgerPage,
    monetaryRows: monetaryRows,
    explainedMonetaryRows: explainedMonetaryRows,
  );
}

bool _looksLikeBcpSavingsLedger(Alpha2LayoutPage page) {
  final text = _strictNormalize(page.items.map((item) => item.text).join(' '));
  const required = <String>[
    'ESTADO DE CUENTA DE AHORROS CUENTA DIGITAL BCP',
    'FECHA PROC',
    'FECHA VALOR',
    'CARGOS / DEBE',
    'ABONOS / HABER',
  ];
  return required.every(text.contains);
}

_StrictHeaderGeometry? _strictHeaderGeometry(Alpha2LayoutPage page) {
  final process = _headerItem(page, 'FECHA PROC');
  final value = _headerItem(page, 'FECHA VALOR');
  final description = _headerItem(page, 'DESCRIPCION');
  final debit = _headerItem(page, 'CARGOS / DEBE');
  final credit = _headerItem(page, 'ABONOS / HABER');
  if (process == null ||
      value == null ||
      description == null ||
      debit == null ||
      credit == null) {
    return null;
  }
  final orderedX = <double>[
    process.x,
    value.x,
    description.x,
    debit.x,
    credit.x,
  ];
  for (var index = 1; index < orderedX.length; index += 1) {
    if (orderedX[index] <= orderedX[index - 1]) return null;
  }
  final headerY = <double>[
    process.y,
    value.y,
    description.y,
    debit.y,
    credit.y,
  ].reduce(math.min);
  return _StrictHeaderGeometry(
    headerY: headerY,
    descriptionMinX: (value.x + description.x) / 2,
    debitMinX: (description.x + debit.x) / 2,
    debitMaxX: (debit.x + credit.x) / 2,
    creditMinX: (debit.x + credit.x) / 2,
  );
}

Alpha2LayoutItem? _headerItem(Alpha2LayoutPage page, String target) {
  final normalizedTarget = _strictNormalize(target);
  final matches = page.items
      .where((item) => _strictNormalize(item.text).contains(normalizedTarget))
      .toList()
    ..sort((a, b) {
      final byY = b.y.compareTo(a.y);
      return byY != 0 ? byY : a.x.compareTo(b.x);
    });
  return matches.isEmpty ? null : matches.first;
}

List<_StrictLine> _strictLines(
  Alpha2LayoutPage page, {
  double yTolerance = 2.5,
}) {
  final items = page.items.where((item) => item.text.trim().isNotEmpty).toList()
    ..sort((a, b) {
      final byY = b.y.compareTo(a.y);
      return byY != 0 ? byY : a.x.compareTo(b.x);
    });
  final lines = <_StrictLine>[];
  for (final item in items) {
    _StrictLine? line;
    for (final candidate in lines) {
      if ((candidate.y - item.y).abs() <= yTolerance) {
        line = candidate;
        break;
      }
    }
    if (line == null) {
      line = _StrictLine(item.y, <Alpha2LayoutItem>[]);
      lines.add(line);
    }
    line.items.add(item);
  }
  for (final line in lines) {
    line.items.sort((a, b) => a.x.compareTo(b.x));
  }
  lines.sort((a, b) => b.y.compareTo(a.y));
  return lines;
}

String _joinItemsInRange(
  List<Alpha2LayoutItem> items,
  double minimum,
  double maximum,
) =>
    items
        .where((item) => item.x >= minimum && item.x < maximum)
        .map((item) => item.text.trim())
        .where((text) => text.isNotEmpty)
        .join(' ');

double? _strictMoney(String value) {
  final token = value.trim().replaceAll(RegExp(r'[^0-9,.-]'), '');
  if (token.isEmpty) return null;
  final signless = token
      .replaceFirst(RegExp(r'^-'), '')
      .replaceFirst(RegExp(r'-$'), '');
  if (signless.isEmpty) return null;
  final comma = signless.lastIndexOf(',');
  final dot = signless.lastIndexOf('.');
  final normalized = comma > dot
      ? signless.replaceAll('.', '').replaceFirst(',', '.')
      : signless.replaceAll(',', '');
  final amount = double.tryParse(normalized);
  return amount == null || !amount.isFinite ? null : amount.abs();
}

String _strictNormalize(String value) {
  var result = value
      .replaceAll('á', 'a')
      .replaceAll('é', 'e')
      .replaceAll('í', 'i')
      .replaceAll('ó', 'o')
      .replaceAll('ú', 'u')
      .replaceAll('ü', 'u')
      .replaceAll('ñ', 'n')
      .replaceAll('Á', 'A')
      .replaceAll('É', 'E')
      .replaceAll('Í', 'I')
      .replaceAll('Ó', 'O')
      .replaceAll('Ú', 'U')
      .replaceAll('Ü', 'U')
      .replaceAll('Ñ', 'N');
  return result.replaceAll(RegExp(r'\s+'), ' ').trim().toUpperCase();
}
