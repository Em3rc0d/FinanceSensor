import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:pdfrx/pdfrx.dart';

import 'alpha2_models.dart';

const String alpha2BcpSavingsProfileId =
    'PE-BCP-SAVINGS-REQUESTED-DISCOVERY-V1';

class Alpha2LayoutItem {
  const Alpha2LayoutItem({
    required this.text,
    required this.x,
    required this.y,
    required this.width,
    required this.sequence,
  });

  final String text;
  final double x;
  final double y;
  final double width;
  final int sequence;
}

class Alpha2LayoutPage {
  const Alpha2LayoutPage({required this.pageNumber, required this.items});

  final int pageNumber;
  final List<Alpha2LayoutItem> items;
}

class Alpha2StatementLayout {
  const Alpha2StatementLayout({required this.pages, required this.pageCount});

  final List<Alpha2LayoutPage> pages;
  final int pageCount;
}

class Alpha2StatementParseResult {
  const Alpha2StatementParseResult({
    required this.evidence,
    required this.reviewCodes,
    required this.pageCount,
    required this.statementPeriodId,
  });

  final List<Alpha2Evidence> evidence;
  final List<String> reviewCodes;
  final int pageCount;
  final String? statementPeriodId;

  bool get importable => evidence.isNotEmpty && reviewCodes.isEmpty;
}

class Alpha2StatementPdfException implements Exception {
  const Alpha2StatementPdfException(this.code);
  final String code;
  @override
  String toString() => code;
}

class Alpha2StructuredPdfReader {
  const Alpha2StructuredPdfReader();

  Future<Alpha2StatementLayout> extractLayout({
    required Uint8List encryptedPdfBytes,
    required String password,
  }) async {
    if (encryptedPdfBytes.isEmpty) {
      throw const Alpha2StatementPdfException('STATEMENT_PDF_EMPTY');
    }
    if (password.isEmpty) {
      throw const Alpha2StatementPdfException('STATEMENT_PASSWORD_REQUIRED');
    }

    final workingBytes = Uint8List.fromList(encryptedPdfBytes);
    PdfDocument? document;
    try {
      await pdfrxFlutterInitialize();
      document = await PdfDocument.openData(
        workingBytes,
        sourceName: 'financesensor-alpha2-statement',
        passwordProvider: createSimplePasswordProvider(password),
        firstAttemptByEmptyPassword: false,
        useProgressiveLoading: false,
        allowDataOwnershipTransfer: false,
      );

      final pages = <Alpha2LayoutPage>[];
      for (final page in document.pages) {
        final structured = await page.loadStructuredText();
        final items = <Alpha2LayoutItem>[];
        var sequence = 0;
        for (final fragment in structured.fragments) {
          final text = fragment.text.trim();
          if (text.isEmpty) continue;
          final bounds = fragment.bounds;
          items.add(
            Alpha2LayoutItem(
              text: text,
              x: bounds.left,
              y: bounds.top,
              width: math.max(0, bounds.right - bounds.left),
              sequence: sequence++,
            ),
          );
        }
        pages.add(
          Alpha2LayoutPage(
            pageNumber: page.pageNumber,
            items: List<Alpha2LayoutItem>.unmodifiable(items),
          ),
        );
      }
      return Alpha2StatementLayout(
        pages: List<Alpha2LayoutPage>.unmodifiable(pages),
        pageCount: document.pages.length,
      );
    } catch (error) {
      if (error is Alpha2StatementPdfException) rethrow;
      throw const Alpha2StatementPdfException(
        'STATEMENT_PDF_OPEN_OR_PASSWORD_REJECTED',
      );
    } finally {
      try {
        await document?.dispose();
      } finally {
        workingBytes.fillRange(0, workingBytes.length, 0);
      }
    }
  }
}

class Alpha2BcpSavingsGeometryParser {
  const Alpha2BcpSavingsGeometryParser();

  static const List<_HeaderSpec> _headers = <_HeaderSpec>[
    _HeaderSpec('processDate', 'FECHA PROC.'),
    _HeaderSpec('valueDate', 'FECHA VALOR'),
    _HeaderSpec('description', 'DESCRIPCION'),
    _HeaderSpec('debit', 'CARGOS / DEBE'),
    _HeaderSpec('credit', 'ABONOS / HABER'),
  ];

  Alpha2StatementParseResult parse({
    required Alpha2StatementLayout layout,
    required String sourceReceiptId,
    required String tenantId,
    String? accountId,
  }) {
    if (sourceReceiptId.trim().isEmpty || tenantId.trim().isEmpty) {
      throw ArgumentError('ALPHA2_STATEMENT_PARSE_IDENTITY_REQUIRED');
    }
    final period = _bcpStatementPeriod(layout.pages);
    if (period == null) {
      return Alpha2StatementParseResult(
        evidence: const <Alpha2Evidence>[],
        reviewCodes: const <String>['STATEMENT_PERIOD_AMBIGUOUS'],
        pageCount: layout.pageCount,
        statementPeriodId: null,
      );
    }

    final rows = <Alpha2Evidence>[];
    final review = <String>[];
    var ledgerPages = 0;
    var processDateLines = 0;
    var valueDateLines = 0;
    var pairedDateLines = 0;
    var amountColumnLines = 0;
    var pairedDateAmountLines = 0;

    for (final page in layout.pages) {
      if (_bcpPageRole(page) != 'TRANSACTION_LEDGER') continue;
      ledgerPages += 1;
      final anchors = _findHeaderAnchors(page, _headers);
      if (anchors == null) {
        review.add('STATEMENT_HEADER_GEOMETRY_UNKNOWN');
        continue;
      }
      final boundaries = _columnBoundaries(_headers, anchors);
      if (boundaries == null) {
        review.add('STATEMENT_HEADER_GEOMETRY_UNKNOWN');
        continue;
      }
      final headerY = anchors.values.map((item) => item.y).reduce(math.min);

      for (final line in _groupLines(page)) {
        if (line.y >= headerY - 1) continue;
        final columns = _lineToColumns(line, boundaries);
        final debit = _parseFlexibleMoney(columns['debit']);
        final credit = _parseFlexibleMoney(columns['credit']);
        final hasDebit = debit != null && debit > 0;
        final hasCredit = credit != null && credit > 0;
        if (hasDebit || hasCredit) amountColumnLines += 1;

        var occurredAt = _parseBcpDate(columns['processDate'], period);
        var valueAt = _parseBcpDate(columns['valueDate'], period);
        if (occurredAt == null || valueAt == null) {
          final pair = _leadingBcpDatePair(line, boundaries, period);
          occurredAt ??= pair?.process;
          valueAt ??= pair?.value;
        }
        if (occurredAt != null) processDateLines += 1;
        if (valueAt != null) valueDateLines += 1;
        if (occurredAt == null || valueAt == null) continue;
        pairedDateLines += 1;
        if (hasDebit || hasCredit) pairedDateAmountLines += 1;

        if (hasDebit && hasCredit) {
          review.add('STATEMENT_ROW_BOTH_DEBIT_CREDIT');
          continue;
        }
        if (!hasDebit && !hasCredit) continue;

        final direction = hasCredit
            ? Alpha2FlowDirection.inflow
            : Alpha2FlowDirection.outflow;
        final description = columns['description']?.trim() ?? '';
        final semantic = _savingsSemantic(description, direction);
        final amount = hasCredit ? credit : debit!;
        final sequence = rows.length;
        final digest = sha256
            .convert(
              utf8.encode(
                'bcp-savings-v1|$sourceReceiptId|${page.pageNumber}|$sequence|${occurredAt.toIso8601String()}|${(amount * 100).round()}',
              ),
            )
            .toString();
        rows.add(
          Alpha2Evidence(
            evidenceId: 'stmt:${digest.substring(0, 40)}',
            tenantId: tenantId,
            amount: amount,
            currency: 'PEN',
            occurredAt: occurredAt,
            semanticType: semantic,
            channel: Alpha2EvidenceChannel.statementLedger,
            truthState: Alpha2TruthState.posted,
            institutionCode: 'BCP',
            accountId: accountId,
            merchantCanonical: description.isEmpty ? null : description,
            statementPeriodId: period.id,
            flowDirection: direction,
          ).normalized(),
        );
      }
    }

    if (rows.isEmpty && review.isEmpty) {
      review.add(
        _zeroRowDiagnostic(
          ledgerPages: ledgerPages,
          processDateLines: processDateLines,
          valueDateLines: valueDateLines,
          pairedDateLines: pairedDateLines,
          amountColumnLines: amountColumnLines,
          pairedDateAmountLines: pairedDateAmountLines,
        ),
      );
    }

    return Alpha2StatementParseResult(
      evidence: List<Alpha2Evidence>.unmodifiable(rows),
      reviewCodes: List<String>.unmodifiable(review.toSet().toList()..sort()),
      pageCount: layout.pageCount,
      statementPeriodId: period.id,
    );
  }
}

class _HeaderSpec {
  const _HeaderSpec(this.id, this.header);
  final String id;
  final String header;
}

class _Anchor {
  const _Anchor(this.x, this.y);
  final double x;
  final double y;
}

class _Boundary {
  const _Boundary(this.id, this.minX, this.maxX);
  final String id;
  final double minX;
  final double maxX;
}

class _Line {
  _Line(this.y, this.items);
  final double y;
  final List<Alpha2LayoutItem> items;
}

class _Period {
  const _Period(this.start, this.end, this.startYear, this.endYear, this.id);
  final DateTime start;
  final DateTime end;
  final int startYear;
  final int endYear;
  final String id;
}

class _DatePair {
  const _DatePair(this.process, this.value);
  final DateTime process;
  final DateTime value;
}

String _layoutNormalize(String value) {
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
  result = result.replaceAll(RegExp(r'\s+'), ' ').trim().toUpperCase();
  return result;
}

String _pagePlainText(Alpha2LayoutPage page) {
  final items = List<Alpha2LayoutItem>.from(page.items)
    ..sort((a, b) {
      final byY = b.y.compareTo(a.y);
      if (byY != 0) return byY;
      final byX = a.x.compareTo(b.x);
      return byX != 0 ? byX : a.sequence.compareTo(b.sequence);
    });
  return items.map((item) => item.text.trim()).where((text) => text.isNotEmpty).join(' ');
}

String _bcpPageRole(Alpha2LayoutPage page) {
  final text = _layoutNormalize(_pagePlainText(page)).toLowerCase();
  if (text.contains('te ayudamos a conocer tu estado de cuenta') ||
      text.contains('conoce el estado de cuenta de tu tarjeta de credito') ||
      text.contains('montos referenciales')) {
    return 'EDUCATIONAL_REFERENCE';
  }
  final required = <String>[
    'estado de cuenta de ahorros cuenta digital bcp',
    'fecha proc',
    'fecha valor',
    'cargos / debe',
    'abonos / haber',
  ];
  return required.every(text.contains) ? 'TRANSACTION_LEDGER' : 'UNKNOWN';
}

List<_Line> _groupLines(Alpha2LayoutPage page, {double yTolerance = 2.5}) {
  final items = page.items.where((item) => item.text.trim().isNotEmpty).toList()
    ..sort((a, b) {
      final byY = b.y.compareTo(a.y);
      if (byY != 0) return byY;
      final byX = a.x.compareTo(b.x);
      return byX != 0 ? byX : a.sequence.compareTo(b.sequence);
    });
  final lines = <_Line>[];
  for (final item in items) {
    _Line? target;
    for (final line in lines) {
      if ((line.y - item.y).abs() <= yTolerance) {
        target = line;
        break;
      }
    }
    target ??= _Line(item.y, <Alpha2LayoutItem>[])..items.add(item);
    if (!lines.contains(target)) lines.add(target);
    if (!target.items.contains(item)) target.items.add(item);
  }
  for (final line in lines) {
    line.items.sort((a, b) {
      final byX = a.x.compareTo(b.x);
      return byX != 0 ? byX : a.sequence.compareTo(b.sequence);
    });
  }
  lines.sort((a, b) => b.y.compareTo(a.y));
  return lines;
}

Map<String, _Anchor>? _findHeaderAnchors(
  Alpha2LayoutPage page,
  List<_HeaderSpec> headers,
) {
  final lines = _groupLines(page);
  final result = <String, _Anchor>{};
  for (final header in headers) {
    final target = _layoutNormalize(header.header);
    final direct = page.items.where((item) => _layoutNormalize(item.text).contains(target)).toList()
      ..sort((a, b) {
        final byY = b.y.compareTo(a.y);
        return byY != 0 ? byY : a.x.compareTo(b.x);
      });
    if (direct.isNotEmpty) {
      result[header.id] = _Anchor(direct.first.x, direct.first.y);
      continue;
    }

    _Anchor? fragmented;
    for (final line in lines) {
      for (var start = 0; start < line.items.length && fragmented == null; start += 1) {
        var combined = '';
        for (var end = start; end < math.min(line.items.length, start + 6); end += 1) {
          combined = <String>[combined, line.items[end].text.trim()]
              .where((text) => text.isNotEmpty)
              .join(' ');
          final normalized = _layoutNormalize(combined);
          if (normalized == target) {
            fragmented = _Anchor(line.items[start].x, line.y);
            break;
          }
          if (normalized.length > target.length + 24) break;
        }
      }
      if (fragmented != null) break;
    }
    if (fragmented == null) return null;
    result[header.id] = fragmented;
  }
  return result;
}

List<_Boundary>? _columnBoundaries(
  List<_HeaderSpec> headers,
  Map<String, _Anchor> anchors,
) {
  final ordered = headers
      .map((header) => (header: header, x: anchors[header.id]?.x))
      .where((item) => item.x != null)
      .toList()
    ..sort((a, b) => a.x!.compareTo(b.x!));
  if (ordered.length != headers.length) return null;
  final result = <_Boundary>[];
  for (var index = 0; index < ordered.length; index += 1) {
    final x = ordered[index].x!;
    final minX = index == 0
        ? double.negativeInfinity
        : (ordered[index - 1].x! + x) / 2;
    final maxX = index == ordered.length - 1
        ? double.infinity
        : (x + ordered[index + 1].x!) / 2;
    result.add(_Boundary(ordered[index].header.id, minX, maxX));
  }
  return result;
}

Map<String, String> _lineToColumns(_Line line, List<_Boundary> boundaries) {
  final grouped = <String, List<Alpha2LayoutItem>>{
    for (final boundary in boundaries) boundary.id: <Alpha2LayoutItem>[],
  };
  for (final item in line.items) {
    for (final boundary in boundaries) {
      if (item.x >= boundary.minX && item.x < boundary.maxX) {
        grouped[boundary.id]!.add(item);
        break;
      }
    }
  }
  return grouped.map(
    (key, items) => MapEntry(
      key,
      items.map((item) => item.text.trim()).where((text) => text.isNotEmpty).join(' ').trim(),
    ),
  );
}

_Period? _bcpStatementPeriod(List<Alpha2LayoutPage> pages) {
  final text = _layoutNormalize(pages.map(_pagePlainText).join(' '));
  final regex = RegExp(
    r'DEL\s+(\d{1,2})/(\d{1,2})/(\d{2,4})\s+AL\s+(\d{1,2})/(\d{1,2})/(\d{2,4})',
  );
  final periods = <String, _Period>{};
  for (final match in regex.allMatches(text)) {
    final startYear = _expandYear(match.group(3));
    final endYear = _expandYear(match.group(6));
    final start = _safeUtc(startYear, int.tryParse(match.group(2) ?? ''), int.tryParse(match.group(1) ?? ''));
    final end = _safeUtc(endYear, int.tryParse(match.group(5) ?? ''), int.tryParse(match.group(4) ?? ''));
    if (start == null || end == null || start.isAfter(end)) continue;
    final id = 'period:${start.toIso8601String().substring(0, 10)}:${end.toIso8601String().substring(0, 10)}';
    periods['${start.millisecondsSinceEpoch}:${end.millisecondsSinceEpoch}'] =
        _Period(start, end, startYear!, endYear!, id);
  }
  return periods.length == 1 ? periods.values.single : null;
}

int? _expandYear(String? token) {
  final value = int.tryParse(token ?? '');
  if (value == null) return null;
  return (token?.length ?? 0) == 2 ? 2000 + value : value;
}

DateTime? _safeUtc(int? year, int? month, int? day) {
  if (year == null || month == null || day == null) return null;
  final value = DateTime.utc(year, month, day, 12);
  return value.year == year && value.month == month && value.day == day ? value : null;
}

const Map<String, int> _months = <String, int>{
  'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
  'JUL': 7, 'AGO': 8, 'SEP': 9, 'SET': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12,
};

DateTime? _parseBcpDate(String? token, _Period period) {
  final compact = _layoutNormalize(token ?? '').replaceAll(' ', '');
  final match = RegExp(r'^(\d{2})(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)$')
      .firstMatch(compact);
  if (match == null) return null;
  final day = int.parse(match.group(1)!);
  final month = _months[match.group(2)!]!;
  final years = <int>{period.startYear, period.endYear};
  final candidates = years.map((year) => _safeUtc(year, month, day)).whereType<DateTime>().toList();
  final inside = candidates
      .where((date) => !date.isBefore(period.start) && !date.isAfter(period.end))
      .toList();
  if (inside.length == 1) return inside.single;
  if (inside.length > 1) return null;
  if (candidates.length == 1) return candidates.single;
  if (candidates.length < 2) return null;
  candidates.sort((a, b) => _distanceToPeriod(a, period).compareTo(_distanceToPeriod(b, period)));
  if (_distanceToPeriod(candidates[0], period) == _distanceToPeriod(candidates[1], period)) return null;
  return candidates[0];
}

int _distanceToPeriod(DateTime value, _Period period) {
  if (value.isBefore(period.start)) return period.start.difference(value).inMilliseconds;
  if (value.isAfter(period.end)) return value.difference(period.end).inMilliseconds;
  return 0;
}

_DatePair? _leadingBcpDatePair(_Line line, List<_Boundary> boundaries, _Period period) {
  final description = boundaries.where((item) => item.id == 'description').firstOrNull;
  if (description == null) return null;
  final leading = line.items
      .where((item) => item.x < description.minX)
      .map((item) => item.text.trim())
      .where((text) => text.isNotEmpty)
      .join(' ');
  final compact = _layoutNormalize(leading).replaceAll(' ', '');
  final matches = RegExp(r'(\d{2})(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC)')
      .allMatches(compact)
      .toList();
  if (matches.length != 2) return null;
  final process = _parseBcpDate('${matches[0].group(1)}${matches[0].group(2)}', period);
  final value = _parseBcpDate('${matches[1].group(1)}${matches[1].group(2)}', period);
  return process == null || value == null ? null : _DatePair(process, value);
}

double? _parseFlexibleMoney(String? value) {
  final token = (value ?? '').trim().replaceAll(RegExp(r'[^0-9,.-]'), '');
  if (token.isEmpty) return null;
  final signless = token.replaceFirst(RegExp(r'^-'), '').replaceFirst(RegExp(r'-$'), '');
  if (signless.isEmpty) return null;
  final comma = signless.lastIndexOf(',');
  final dot = signless.lastIndexOf('.');
  final normalized = comma > dot
      ? signless.replaceAll('.', '').replaceFirst(',', '.')
      : signless.replaceAll(',', '');
  final amount = double.tryParse(normalized);
  return amount == null || !amount.isFinite ? null : amount.abs();
}

Alpha2SemanticType _savingsSemantic(
  String description,
  Alpha2FlowDirection direction,
) {
  final text = _layoutNormalize(description);
  if (direction == Alpha2FlowDirection.inflow &&
      RegExp(r'\b(PLANILLA|SUELDO|REMUNERACION)\b').hasMatch(text)) {
    return Alpha2SemanticType.income;
  }
  if (direction == Alpha2FlowDirection.outflow &&
      RegExp(r'\b(COMISION|MANTENIMIENTO|MANT\.)\b').hasMatch(text)) {
    return Alpha2SemanticType.fee;
  }
  return Alpha2SemanticType.unknown;
}

String _zeroRowDiagnostic({
  required int ledgerPages,
  required int processDateLines,
  required int valueDateLines,
  required int pairedDateLines,
  required int amountColumnLines,
  required int pairedDateAmountLines,
}) {
  if (ledgerPages == 0) return 'STATEMENT_LEDGER_PAGE_NOT_FOUND';
  if (processDateLines == 0) return 'STATEMENT_ROW_PROCESS_DATE_NOT_FOUND';
  if (valueDateLines == 0) return 'STATEMENT_ROW_VALUE_DATE_NOT_FOUND';
  if (pairedDateLines == 0) return 'STATEMENT_ROW_DATE_PAIR_VERTICAL_FRAGMENTATION';
  if (pairedDateAmountLines == 0 && amountColumnLines > 0) return 'STATEMENT_ROW_VERTICAL_FRAGMENTATION';
  if (pairedDateAmountLines == 0) return 'STATEMENT_ROW_AMOUNT_NOT_FOUND';
  return 'STATEMENT_LAYOUT_NO_MOVEMENTS';
}

extension<T> on Iterable<T> {
  T? get firstOrNull {
    final iterator = this.iterator;
    return iterator.moveNext() ? iterator.current : null;
  }
}
