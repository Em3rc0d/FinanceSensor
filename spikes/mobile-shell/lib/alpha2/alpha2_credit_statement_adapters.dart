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
/// Authority is deliberately limited to the public Banco Ripley statement
/// template. Movement rows live under `Tus movimientos del mes`; `Total` is the
/// billed-period row amount. Formula/summary/points sections are excluded.
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

        final signedTotal = _parseSignedMoney(
          _joinRange(line.items, geometry.totalMinX, double.infinity),
        );
        if (signedTotal == null || signedTotal == 0) continue;
        monetaryRows += 1;

        final occurredAt = _parseCreditDate(
          _joinRange(
            line.items,
            double.negativeInfinity,
            geometry.processDateMinX,
          ),
        );
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
        final amount = signedTotal.abs();
        final digest = sha256
            .convert(
              utf8.encode(
                'ripley-credit-v1|$sourceReceiptId|${page.pageNumber}|${evidence.length}|${occurredAt.toIso8601String()}|${(amount * 100).round()}|${direction.name}',
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
            semanticType: _creditSemantic(description, direction),
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

/// Private-content-free probe for BCP credit statements.
///
/// It emits no financial evidence and no raw text/geometry. The only diagnostic
/// is a bitmask over a fixed whitelist of public statement concepts plus a
/// coarse page-count bucket. This is safe to return from owned-device UAT and is
/// sufficient to choose the next certified, profile-specific adapter family.
class Alpha2BcpCreditStructuralProbe {
  const Alpha2BcpCreditStructuralProbe();

  Alpha2StatementParseResult inspect({
    required Alpha2StatementLayout layout,
  }) {
    final normalized = _normalizeLayout(
      layout.pages
          .expand((page) => page.items)
          .map((item) => item.text)
          .join(' '),
    );
    var mask = 0;
    if (_containsAny(normalized, const ['BCP', 'BANCO DE CREDITO'])) {
      mask |= 1 << 0;
    }
    if (_containsAny(normalized, const [
      'CICLO DE FACTURACION',
      'PERIODO DE FACTURACION',
      'FECHA DE FACTURACION',
    ])) {
      mask |= 1 << 1;
    }
    if (_containsAny(normalized, const [
      'FECHA DE CONSUMO',
      'FECHA CONSUMO',
      'FECHA DE COMPRA',
      'FECHA COMPRA',
    ])) {
      mask |= 1 << 2;
    }
    if (_containsAny(normalized, const [
      'FECHA DE PROCESO',
      'FECHA PROCESO',
      'FECHA PROC',
    ])) {
      mask |= 1 << 3;
    }
    if (_containsAny(normalized, const [
      'DESCRIPCION',
      'DETALLE DE MOVIMIENTOS',
      'DETALLE DE TU ESTADO DE CUENTA',
    ])) {
      mask |= 1 << 4;
    }
    if (_containsAny(normalized, const ['MONTO', 'IMPORTE', 'TOTAL'])) {
      mask |= 1 << 5;
    }
    if (_containsAny(normalized, const [
      'PAGO MINIMO',
      'PAGO TOTAL',
      'DEUDA TOTAL',
    ])) {
      mask |= 1 << 6;
    }
    if (_containsAny(normalized, const ['SOLES', 'PEN', 'S/'])) {
      mask |= 1 << 7;
    }
    if (_containsAny(normalized, const ['DOLARES', 'USD', 'US\$'])) {
      mask |= 1 << 8;
    }
    if (_containsAny(normalized, const ['CUOTA', 'CUOTAS', 'TEA'])) {
      mask |= 1 << 9;
    }

    final bucket = switch (layout.pageCount) {
      <= 0 => 'P0',
      1 => 'P1',
      >= 2 && <= 4 => 'P2_4',
      _ => 'P5P',
    };
    final signature = mask.toRadixString(16).toUpperCase().padLeft(3, '0');
    return Alpha2StatementParseResult(
      evidence: const <Alpha2Evidence>[],
      reviewCodes: <String>[
        'BCP_CREDIT_ADAPTER_CERTIFICATION_REQUIRED',
        '$alpha2BcpCreditProbePrefix${bucket}_M$signature',
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

  final consumption = _findHeader(page, const ['FECHA DE CONSUMO']);
  if (consumption == null) return null;
  final preferredY = consumption.y;
  final process = _findHeader(
    page,
    const ['FECHA DE PROCESO'],
    preferredY: preferredY,
  );
  final ticket = _findHeader(
    page,
    const ['N DE TICKET', 'N° DE TICKET', 'Nº DE TICKET'],
    preferredY: preferredY,
  );
  final description = _findHeader(
    page,
    const ['DESCRIPCION'],
    preferredY: preferredY,
  );
  final owner = _findHeader(page, const ['T/A'], preferredY: preferredY);
  final interest = _findHeader(
    page,
    const ['INTERES'],
    preferredY: preferredY,
  );
  final total = _findHeader(page, const ['TOTAL'], preferredY: preferredY);
  if (process == null ||
      ticket == null ||
      description == null ||
      owner == null ||
      interest == null ||
      total == null) {
    return null;
  }

  final anchors = <Alpha2LayoutItem>[
    consumption,
    process,
    ticket,
    description,
    owner,
    interest,
    total,
  ];
  if (anchors.any((item) => (item.y - preferredY).abs() > 8)) return null;
  final ordered = anchors.map((item) => item.x).toList();
  for (var index = 1; index < ordered.length; index += 1) {
    if (ordered[index] <= ordered[index - 1]) return null;
  }

  return _RipleyGeometry(
    headerY: anchors.map((item) => item.y).reduce(math.min),
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
  List<String> aliases, {
  double? preferredY,
}) {
  final normalizedAliases = aliases.map(_normalizeLayout).toList();
  final direct = page.items.where((item) {
    final normalized = _normalizeLayout(item.text);
    return normalizedAliases.any(normalized.contains);
  }).toList();

  if (direct.isNotEmpty) {
    direct.sort((a, b) {
      if (preferredY != null) {
        final byDistance =
            (a.y - preferredY).abs().compareTo((b.y - preferredY).abs());
        if (byDistance != 0) return byDistance;
      }
      final byY = b.y.compareTo(a.y);
      return byY != 0 ? byY : a.x.compareTo(b.x);
    });
    return direct.first;
  }

  final reconstructed = <Alpha2LayoutItem>[];
  for (final line in _creditLines(page)) {
    for (var start = 0; start < line.items.length; start += 1) {
      for (var end = start + 1;
          end <= math.min(line.items.length, start + 5);
          end += 1) {
        final segment = line.items.sublist(start, end);
        final joined = segment.map((item) => item.text.trim()).join(' ');
        final normalized = _normalizeLayout(joined);
        if (!normalizedAliases.any((alias) => normalized == alias)) continue;
        final left = segment.map((item) => item.x).reduce(math.min);
        final right = segment
            .map((item) => item.x + item.width)
            .reduce(math.max);
        reconstructed.add(
          Alpha2LayoutItem(
            text: joined,
            x: left,
            y: line.y,
            width: math.max(0, right - left),
            sequence: segment.map((item) => item.sequence).reduce(math.min),
          ),
        );
      }
    }
  }

  if (reconstructed.isEmpty) return null;
  reconstructed.sort((a, b) {
    if (preferredY != null) {
      final byDistance =
          (a.y - preferredY).abs().compareTo((b.y - preferredY).abs());
      if (byDistance != 0) return byDistance;
    }
    final byY = b.y.compareTo(a.y);
    if (byY != 0) return byY;
    final byWidth = a.width.compareTo(b.width);
    return byWidth != 0 ? byWidth : a.x.compareTo(b.x);
  });
  return reconstructed.first;
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
  final parenthesized = raw.trim().startsWith('(') && raw.trim().endsWith(')');
  var cleaned = raw.trim().replaceAll(RegExp(r'[^0-9,.-]'), '');
  if (cleaned.isEmpty) return null;
  final negative = parenthesized || cleaned.startsWith('-') || cleaned.endsWith('-');
  cleaned = cleaned
      .replaceFirst(RegExp(r'^-'), '')
      .replaceFirst(RegExp(r'-$'), '');
  if (cleaned.isEmpty) return null;
  final comma = cleaned.lastIndexOf(',');
  final dot = cleaned.lastIndexOf('.');
  final normalized = comma > dot
      ? cleaned.replaceAll('.', '').replaceFirst(',', '.')
      : cleaned.replaceAll(',', '');
  final parsed = double.tryParse(normalized);
  if (parsed == null || !parsed.isFinite) return null;
  return negative ? -parsed.abs() : parsed.abs();
}

DateTime? _parseCreditDate(String raw) {
  final normalized = _normalizeLayout(raw);
  final match = RegExp(
    r'\b(\d{1,2})/(\d{1,2}|ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)/(\d{2}|\d{4})\b',
  ).firstMatch(normalized);
  if (match == null) return null;
  final monthToken = match.group(2)!;
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
  final rawYear = int.tryParse(match.group(3)!);
  if (rawYear == null) return null;
  final year = match.group(3)!.length == 2 ? 2000 + rawYear : rawYear;
  final month = int.tryParse(monthToken) ?? months[monthToken];
  return _safeUtc(year, month, int.tryParse(match.group(1)!));
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
  final periodAnchor = text.indexOf('PERIODO DE FACTURACION');
  if (periodAnchor < 0) return null;
  final window = text.substring(
    periodAnchor,
    math.min(text.length, periodAnchor + 180),
  );
  final tokenPattern = RegExp(
    r'(\d{1,2}/(?:\d{1,2}|ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)/(?:\d{2}|\d{4}))',
  );
  final tokens = tokenPattern
      .allMatches(window)
      .map((match) => match.group(1)!)
      .toList();
  if (tokens.length != 2) return null;
  final start = _parseCreditDate(tokens[0]);
  final end = _parseCreditDate(tokens[1]);
  if (start == null || end == null || start.isAfter(end)) return null;
  return _CreditPeriod(
    start,
    end,
    'period:${start.toIso8601String().substring(0, 10)}:${end.toIso8601String().substring(0, 10)}',
  );
}

Alpha2SemanticType _creditSemantic(
  String description,
  Alpha2FlowDirection direction,
) {
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
