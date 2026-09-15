import 'dart:convert';
import 'dart:math' as math;

import 'package:crypto/crypto.dart';

import 'alpha2_models.dart';
import 'alpha2_statement_geometry.dart';

const String alpha2BcpCreditProfileId =
    'PE-BCP-CREDIT-MONTHLY-DISCOVERY-V1';
const String alpha2RipleyCreditProfileId =
    'PE-RIPLEY-CREDIT-MONTHLY-DISCOVERY-V1';
const String alpha2RipleyCreditAdapterVersion =
    'A2_RIPLEY_CREDIT_STRICT_V1';
const String alpha2BcpCreditProbeVersion =
    'A2_BCP_CREDIT_STRUCTURAL_PROBE_V1';
const String alpha2BcpCreditProbePrefix = 'BCP_CREDIT_STRUCTURAL_V1_';

/// Strict Banco Ripley credit-card statement adapter.
///
/// The supported ledger contract is intentionally narrow and follows Banco
/// Ripley's public "Conoce como leer tu Estado de Cuenta" template: movement
/// rows live under `Tus movimientos del mes` and are bounded by the documented
/// header family `Fecha de consumo`, `Fecha de proceso`, `N° Ticket`,
/// `Descripción`, `T/A`, `Monto`, `TEA`, `N° de cuotas`, `Valor cuota`,
/// `Capital`, `Interés`, `Total`. `Total` is the billed-period movement amount;
/// a negative total is an abono/pago/extorno and a positive total is a
/// consumption/cuota/comisión/seguro. Summary/formula sections are never rows.
class Alpha2StrictRipleyCreditAdapter {
  const Alpha2StrictRipleyCreditAdapter();

  Alpha2StatementParseResult parse({
    required Alpha2StatementLayout layout,
    required String sourceReceiptId,
    required String tenantId,
    String? accountId,
  }) {
    if (sourceReceiptId.trim().isEmpty || tenantId.trim().isEmpty) {
      throw ArgumentError('ALPHA2_RIPLEY_CREDIT_PARSE_IDENTITY_REQUIRED');
    }

    final period = _ripleyStatementPeriod(layout.pages);
    if (period == null) {
      return Alpha2StatementParseResult(
        evidence: const <Alpha2Evidence>[],
        reviewCodes: const <String>['RIPLEY_CREDIT_PERIOD_AMBIGUOUS'],
        pageCount: layout.pageCount,
        statementPeriodId: null,
      );
    }

    final evidence = <Alpha2Evidence>[];
    final review = <String>{};
    var ledgerPages = 0;
    var monetaryRows = 0;
    var explainedRows = 0;

    for (final page in layout.pages) {
      final geometry = _ripleyLedgerGeometry(page);
      if (geometry == null) continue;
      ledgerPages += 1;

      final footerY = _ripleyLedgerFooterY(page, geometry.headerY);
      for (final line in _creditLines(page)) {
        if (line.y >= geometry.headerY - 1) continue;
        if (footerY != null && line.y <= footerY + 1) continue;

        final totalText = _joinRange(
          line.items,
          geometry.totalMinX,
          double.infinity,
        );
        final signedTotal = _parseSignedMoney(totalText);
        if (signedTotal == null || signedTotal == 0) continue;
        monetaryRows += 1;

        final dateText = _joinRange(
          line.items,
          double.negativeInfinity,
          geometry.processDateMinX,
        );
        final occurredAt = _parseCreditDate(dateText);
        if (occurredAt == null) {
          review.add('RIPLEY_CREDIT_MONETARY_ROW_UNEXPLAINED');
          continue;
        }
        explainedRows += 1;

        final description = _joinRange(
          line.items,
          geometry.descriptionMinX,
          geometry.descriptionMaxX,
        ).trim();
        if (description.isEmpty) {
          review.add('RIPLEY_CREDIT_DESCRIPTION_REQUIRED');
          continue;
        }

        final direction = signedTotal < 0
            ? Alpha2FlowDirection.inflow
            : Alpha2FlowDirection.outflow;
        final semantic = _creditSemantic(
          description,
          direction,
          institutionCode: 'BANCO_RIPLEY',
        );
        final amount = signedTotal.abs();
        final sequence = evidence.length;
        final digest = sha256
            .convert(
              utf8.encode(
                'ripley-credit-v1|$sourceReceiptId|${page.pageNumber}|$sequence|${occurredAt.toIso8601String()}|${(amount * 100).round()}|${direction.name}',
              ),
            )
            .toString();

        evidence.add(
          Alpha2Evidence(
            evidenceId: 'stmt:${digest.substring(0, 40)}',
            tenantId: tenantId,
            amount: amount,
            currency: 'PEN',
            occurredAt: occurredAt,
            semanticType: semantic,
            channel: Alpha2EvidenceChannel.statementLedger,
            truthState: Alpha2TruthState.posted,
            institutionCode: 'BANCO_RIPLEY',
            accountId: accountId,
            merchantCanonical: description,
            statementPeriodId: period.id,
            flowDirection: direction,
          ).normalized(),
        );
      }
    }

    if (ledgerPages == 0) {
      review.add('RIPLEY_CREDIT_LEDGER_GEOMETRY_UNKNOWN');
    }
    if (monetaryRows > explainedRows) {
      review.add('RIPLEY_CREDIT_MONETARY_ROW_UNEXPLAINED');
    }
    if (evidence.isEmpty && review.isEmpty) {
      review.add('RIPLEY_CREDIT_LAYOUT_NO_MOVEMENTS');
    }

    return Alpha2StatementParseResult(
      evidence: List<Alpha2Evidence>.unmodifiable(evidence),
      reviewCodes: List<String>.unmodifiable(review.toList()..sort()),
      pageCount: layout.pageCount,
      statementPeriodId: period.id,
    );
  }
}

/// Private-content-free structural probe for the still-unpromoted BCP credit
/// format. It never emits evidence and never returns extracted text, dates,
/// amounts, merchants, card/account identifiers or geometry. The code only
/// encodes presence/absence of a fixed whitelist of public statement concepts
/// plus a coarse page-count bucket. This lets an owned-device UAT tell us which
/// certified adapter family is needed without copying the user's PDF to GitHub.
class Alpha2BcpCreditStructuralProbe {
  const Alpha2BcpCreditStructuralProbe();

  Alpha2StatementParseResult inspect({
    required Alpha2StatementLayout layout,
  }) {
    final normalized = _normalizeLayout(
      layout.pages.expand((page) => page.items).map((item) => item.text).join(' '),
    );
    var mask = 0;
    if (_containsAny(normalized, const <String>['BCP', 'BANCO DE CREDITO'])) {
      mask |= 1 << 0;
    }
    if (_containsAny(normalized, const <String>[
      'CICLO DE FACTURACION',
      'PERIODO DE FACTURACION',
      'FECHA DE FACTURACION',
    ])) {
      mask |= 1 << 1;
    }
    if (_containsAny(normalized, const <String>[
      'FECHA DE CONSUMO',
      'FECHA CONSUMO',
      'FECHA DE COMPRA',
      'FECHA COMPRA',
    ])) {
      mask |= 1 << 2;
    }
    if (_containsAny(normalized, const <String>[
      'FECHA DE PROCESO',
      'FECHA PROCESO',
      'FECHA PROC',
    ])) {
      mask |= 1 << 3;
    }
    if (_containsAny(normalized, const <String>[
      'DESCRIPCION',
      'DETALLE DE MOVIMIENTOS',
      'DETALLE DE TU ESTADO DE CUENTA',
    ])) {
      mask |= 1 << 4;
    }
    if (_containsAny(normalized, const <String>[
      'MONTO',
      'IMPORTE',
      'TOTAL',
    ])) {
      mask |= 1 << 5;
    }
    if (_containsAny(normalized, const <String>[
      'PAGO MINIMO',
      'PAGO TOTAL',
      'DEUDA TOTAL',
    ])) {
      mask |= 1 << 6;
    }
    if (_containsAny(normalized, const <String>['SOLES', 'PEN', 'S/'])) {
      mask |= 1 << 7;
    }
    if (_containsAny(normalized, const <String>['DOLARES', 'USD', 'US\$'])) {
      mask |= 1 << 8;
    }
    if (_containsAny(normalized, const <String>[
      'CUOTA',
      'CUOTAS',
      'TEA',
    ])) {
      mask |= 1 << 9;
    }

    final bucket = switch (layout.pageCount) {
      <= 0 => 'P0',
      1 => 'P1',
      >= 2 && <= 4 => 'P2_4',
      _ => 'P5P',
    };
    final signature = mask.toRadixString(16).toUpperCase().padLeft(3, '0');
    final safeCode = '$alpha2BcpCreditProbePrefix${bucket}_M$signature';

    return Alpha2StatementParseResult(
      evidence: const <Alpha2Evidence>[],
      reviewCodes: <String>[
        'BCP_CREDIT_ADAPTER_CERTIFICATION_REQUIRED',
        safeCode,
      ],
      pageCount: layout.pageCount,
      statementPeriodId: null,
    );
  }
}

class _CreditLine {
  _CreditLine(this.y, this.items);
  final double y;
  final List<Alpha2LayoutItem> items;
}

class _RipleyGeometry {
  const _RipleyGeometry({
    required this.headerY,
    required this.processDateMinX,
    required this.descriptionMinX,
    required this.descriptionMaxX,
    required this.totalMinX,
  });

  final double headerY;
  final double processDateMinX;
  final double descriptionMinX;
  final double descriptionMaxX;
  final double totalMinX;
}

class _CreditPeriod {
  const _CreditPeriod(this.start, this.end, this.id);
  final DateTime start;
  final DateTime end;
  final String id;
}

_RipleyGeometry? _ripleyLedgerGeometry(Alpha2LayoutPage page) {
  final pageText = _normalizeLayout(page.items.map((item) => item.text).join(' '));
  if (!pageText.contains('TUS MOVIMIENTOS DEL MES')) return null;

  final consumption = _findHeader(page, const <String>['FECHA DE CONSUMO']);
  final process = _findHeader(page, const <String>['FECHA DE PROCESO']);
  final ticket = _findHeader(page, const <String>['N DE TICKET', 'N° DE TICKET', 'Nº DE TICKET']);
  final description = _findHeader(page, const <String>['DESCRIPCION']);
  final owner = _findHeader(page, const <String>['T/A']);
  final interest = _findHeader(page, const <String>['INTERES']);
  final total = _findHeader(page, const <String>['TOTAL']);
  if (consumption == null ||
      process == null ||
      ticket == null ||
      description == null ||
      owner == null ||
      interest == null ||
      total == null) {
    return null;
  }

  final ordered = <double>[
    consumption.x,
    process.x,
    ticket.x,
    description.x,
    owner.x,
    interest.x,
    total.x,
  ];
  for (var index = 1; index < ordered.length; index += 1) {
    if (ordered[index] <= ordered[index - 1]) return null;
  }

  final headerY = <double>[
    consumption.y,
    process.y,
    ticket.y,
    description.y,
    owner.y,
    interest.y,
    total.y,
  ].reduce(math.min);
  return _RipleyGeometry(
    headerY: headerY,
    processDateMinX: (consumption.x + process.x) / 2,
    descriptionMinX: (ticket.x + description.x) / 2,
    descriptionMaxX: (description.x + owner.x) / 2,
    totalMinX: (interest.x + total.x) / 2,
  );
}

double? _ripleyLedgerFooterY(Alpha2LayoutPage page, double headerY) {
  final markers = page.items.where((item) {
    final text = _normalizeLayout(item.text);
    return text.contains('COMO SE CALCULA EL PAGO TOTAL') ||
        text.contains('PAGO TOTAL Y MINIMO DEL MES');
  }).where((item) => item.y < headerY).toList();
  if (markers.isEmpty) return null;
  return markers.map((item) => item.y).reduce(math.max);
}

Alpha2LayoutItem? _findHeader(
  Alpha2LayoutPage page,
  List<String> aliases,
) {
  final normalizedAliases = aliases.map(_normalizeLayout).toList();
  final direct = page.items.where((item) {
    final value = _normalizeLayout(item.text);
    return normalizedAliases.any(value.contains);
  }).toList()
    ..sort((a, b) {
      final byY = b.y.compareTo(a.y);
      return byY != 0 ? byY : a.x.compareTo(b.x);
    });
  if (direct.isNotEmpty) return direct.first;

  for (final line in _creditLines(page)) {
    for (var start = 0; start < line.items.length; start += 1) {
      for (var end = start + 1;
          end <= math.min(line.items.length, start + 5);
          end += 1) {
        final segment = line.items.sublist(start, end);
        final joined = segment.map((item) => item.text.trim()).join(' ');
        final normalized = _normalizeLayout(joined);
        if (!normalizedAliases.any(normalized.contains)) continue;
        final left = segment.map((item) => item.x).reduce(math.min);
        final right = segment
            .map((item) => item.x + item.width)
            .reduce(math.max);
        return Alpha2LayoutItem(
          text: joined,
          x: left,
          y: line.y,
          width: math.max(0, right - left),
          sequence: segment.map((item) => item.sequence).reduce(math.min),
        );
      }
    }
  }
  return null;
}

List<_CreditLine> _creditLines(
  Alpha2LayoutPage page, {
  double yTolerance = 2.5,
}) {
  final items = page.items.where((item) => item.text.trim().isNotEmpty).toList()
    ..sort((a, b) {
      final byY = b.y.compareTo(a.y);
      return byY != 0 ? byY : a.x.compareTo(b.x);
    });
  final lines = <_CreditLine>[];
  for (final item in items) {
    _CreditLine? target;
    for (final candidate in lines) {
      if ((candidate.y - item.y).abs() <= yTolerance) {
        target = candidate;
        break;
      }
    }
    if (target == null) {
      target = _CreditLine(item.y, <Alpha2LayoutItem>[]);
      lines.add(target);
    }
    target.items.add(item);
  }
  for (final line in lines) {
    line.items.sort((a, b) => a.x.compareTo(b.x));
  }
  lines.sort((a, b) => b.y.compareTo(a.y));
  return lines;
}

String _joinRange(
  List<Alpha2LayoutItem> items,
  double minimum,
  double maximum,
) =>
    items
        .where((item) => item.x >= minimum && item.x < maximum)
        .map((item) => item.text.trim())
        .where((text) => text.isNotEmpty)
        .join(' ')
        .trim();

double? _parseSignedMoney(String raw) {
  var value = raw.trim();
  if (value.isEmpty) return null;
  final parenthesized = value.startsWith('(') && value.endsWith(')');
  final trailingMinus = value.endsWith('-');
  final leadingMinus = value.startsWith('-');
  value = value.replaceAll(RegExp(r'[^0-9,.-]'), '');
  value = value.replaceFirst(RegExp(r'^-'), '').replaceFirst(RegExp(r'-$'), '');
  if (value.isEmpty) return null;
  final comma = value.lastIndexOf(',');
  final dot = value.lastIndexOf('.');
  final normalized = comma > dot
      ? value.replaceAll('.', '').replaceFirst(',', '.')
      : value.replaceAll(',', '');
  final parsed = double.tryParse(normalized);
  if (parsed == null || !parsed.isFinite) return null;
  final negative = parenthesized || trailingMinus || leadingMinus;
  return negative ? -parsed.abs() : parsed.abs();
}

DateTime? _parseCreditDate(String raw) {
  final normalized = _normalizeLayout(raw);
  final numeric = RegExp(r'\b(\d{1,2})/(\d{1,2})/(\d{4})\b').firstMatch(normalized);
  if (numeric != null) {
    return _safeUtc(
      int.tryParse(numeric.group(3) ?? ''),
      int.tryParse(numeric.group(2) ?? ''),
      int.tryParse(numeric.group(1) ?? ''),
    );
  }
  final named = RegExp(
    r'\b(\d{1,2})/(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)/(\d{4})\b',
  ).firstMatch(normalized);
  if (named == null) return null;
  const months = <String, int>{
    'ENE': 1,
    'FEB': 2,
    'MAR': 3,
    'ABR': 4,
    'MAY': 5,
    'JUN': 6,
    'JUL': 7,
    'AGO': 8,
    'SEP': 9,
    'SET': 9,
    'OCT': 10,
    'NOV': 11,
    'DIC': 12,
  };
  return _safeUtc(
    int.tryParse(named.group(3) ?? ''),
    months[named.group(2)],
    int.tryParse(named.group(1) ?? ''),
  );
}

DateTime? _safeUtc(int? year, int? month, int? day) {
  if (year == null || month == null || day == null) return null;
  final result = DateTime.utc(year, month, day, 12);
  return result.year == year && result.month == month && result.day == day
      ? result
      : null;
}

_CreditPeriod? _ripleyStatementPeriod(List<Alpha2LayoutPage> pages) {
  final text = _normalizeLayout(
    pages.expand((page) => page.items).map((item) => item.text).join(' '),
  );
  final candidates = <_CreditPeriod>[];
  final pattern = RegExp(
    r'PERIODO DE FACTURACION[^0-9]*(\d{1,2})/(\d{1,2})/(\d{4})\s*(?:-|AL)\s*(\d{1,2})/(\d{1,2})/(\d{4})',
  );
  for (final match in pattern.allMatches(text)) {
    final start = _safeUtc(
      int.tryParse(match.group(3) ?? ''),
      int.tryParse(match.group(2) ?? ''),
      int.tryParse(match.group(1) ?? ''),
    );
    final end = _safeUtc(
      int.tryParse(match.group(6) ?? ''),
      int.tryParse(match.group(5) ?? ''),
      int.tryParse(match.group(4) ?? ''),
    );
    if (start == null || end == null || start.isAfter(end)) continue;
    candidates.add(
      _CreditPeriod(
        start,
        end,
        'period:${start.toIso8601String().substring(0, 10)}:${end.toIso8601String().substring(0, 10)}',
      ),
    );
  }
  final unique = <String, _CreditPeriod>{
    for (final item in candidates)
      '${item.start.millisecondsSinceEpoch}:${item.end.millisecondsSinceEpoch}': item,
  };
  return unique.length == 1 ? unique.values.single : null;
}

Alpha2SemanticType _creditSemantic(
  String description,
  Alpha2FlowDirection direction, {
  required String institutionCode,
}) {
  final text = _normalizeLayout(description);
  if (direction == Alpha2FlowDirection.inflow) {
    if (RegExp(r'\b(PAGO|ABONO)\b').hasMatch(text)) {
      return Alpha2SemanticType.cardPayment;
    }
    if (RegExp(r'\b(EXTORNO|DEVOLUCION|REEMBOLSO)\b').hasMatch(text)) {
      return Alpha2SemanticType.refund;
    }
    return Alpha2SemanticType.unknown;
  }
  if (RegExp(r'\b(RETIRO|EFECTIVO EXPRESS|DISPOSICION)\b').hasMatch(text)) {
    return Alpha2SemanticType.cashWithdrawal;
  }
  if (RegExp(r'\b(COMISION|SEGURO|PENALIDAD|ITF|MEMBRESIA)\b').hasMatch(text)) {
    return Alpha2SemanticType.fee;
  }
  return Alpha2SemanticType.expense;
}

bool _containsAny(String haystack, List<String> needles) =>
    needles.map(_normalizeLayout).any(haystack.contains);

String _normalizeLayout(String value) {
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
      .replaceAll('Ñ', 'N')
      .replaceAll('º', '')
      .replaceAll('°', '');
  return result.replaceAll(RegExp(r'\s+'), ' ').trim().toUpperCase();
}
