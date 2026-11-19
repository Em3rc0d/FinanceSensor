import 'statement_models.dart';

class ConservativeStatementParser {
  const ConservativeStatementParser();

  List<StatementDerivedEvidence> parse({
    required String text,
    required StatementProfile profile,
  }) {
    final rows = <StatementDerivedEvidence>[];
    for (final segment in _candidateSegments(text)) {
      final parsed = _parseSegment(segment);
      if (parsed == null) continue;

      final semantics = switch (profile) {
        StatementProfile.bcpSavingsRequested =>
          _savingsSemantics(parsed.description),
        StatementProfile.bcpCredit || StatementProfile.ripleyCredit =>
          _cardSemantics(parsed.description),
      };

      rows.add(
        StatementDerivedEvidence(
          amount: parsed.amount,
          currency: parsed.currency,
          occurredAt: parsed.occurredAt,
          description: parsed.description,
          direction: semantics.direction,
          semanticType: semantics.semanticType,
          confidence: semantics.direction == StatementDirection.unknown ? 0.65 : 0.90,
        ),
      );
    }
    return List.unmodifiable(rows);
  }
}

class _ParsedSegment {
  const _ParsedSegment({
    required this.amount,
    required this.currency,
    required this.occurredAt,
    required this.description,
  });

  final double amount;
  final String currency;
  final DateTime occurredAt;
  final String description;
}

class _Semantics {
  const _Semantics(this.direction, this.semanticType);

  final StatementDirection direction;
  final StatementSemanticType semanticType;
}

String _normalize(String value) => value
    .replaceAll(RegExp(r'\s+'), ' ')
    .trim();

String _lower(String value) => _normalize(value).toLowerCase();

Iterable<String> _candidateSegments(String text) sync* {
  final dateRe = RegExp(r'\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b');
  for (final rawLine in text.split(RegExp(r'\r?\n'))) {
    final line = _normalize(rawLine);
    if (line.isEmpty) continue;
    final matches = dateRe.allMatches(line).toList();
    if (matches.length <= 1) {
      yield line;
      continue;
    }
    for (var index = 0; index < matches.length; index += 1) {
      final start = matches[index].start;
      final end = index + 1 < matches.length ? matches[index + 1].start : line.length;
      final segment = line.substring(start, end).trim();
      if (segment.isNotEmpty) yield segment;
    }
  }
}

_ParsedSegment? _parseSegment(String segment) {
  final dateMatch = RegExp(r'\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b').firstMatch(segment);
  if (dateMatch == null) return null;

  final day = int.tryParse(dateMatch.group(1)!);
  final month = int.tryParse(dateMatch.group(2)!);
  final rawYear = int.tryParse(dateMatch.group(3)!);
  if (day == null || month == null || rawYear == null) return null;
  final year = rawYear < 100 ? 2000 + rawYear : rawYear;

  DateTime occurredAt;
  try {
    occurredAt = DateTime.utc(year, month, day, 12);
  } catch (_) {
    return null;
  }
  if (occurredAt.year != year || occurredAt.month != month || occurredAt.day != day) {
    return null;
  }

  final moneyRe = RegExp(
    r'(S\/?\.?|PEN|US\$|USD|\$)\s*[-+]?\s*([0-9][0-9.,]*)',
    caseSensitive: false,
  );
  final moneyMatches = moneyRe.allMatches(segment).toList();
  if (moneyMatches.isEmpty) return null;
  final money = moneyMatches.last;
  final amount = _parseMoney(money.group(2)!);
  if (amount == null || amount <= 0) return null;

  final currencyToken = money.group(1)!.toUpperCase();
  final currency = currencyToken.contains('USD') || currencyToken.contains(r'US$') || currencyToken == r'$'
      ? 'USD'
      : 'PEN';

  final description = _normalize(
    segment
        .replaceFirst(dateMatch.group(0)!, ' ')
        .replaceFirst(money.group(0)!, ' '),
  );

  return _ParsedSegment(
    amount: amount,
    currency: currency,
    occurredAt: occurredAt,
    description: description,
  );
}

double? _parseMoney(String raw) {
  var cleaned = raw.replaceAll(RegExp(r'[^0-9,.-]'), '');
  if (cleaned.isEmpty) return null;

  final comma = cleaned.lastIndexOf(',');
  final dot = cleaned.lastIndexOf('.');
  if (comma > dot) {
    cleaned = cleaned.replaceAll('.', '').replaceAll(',', '.');
  } else {
    cleaned = cleaned.replaceAll(',', '');
  }

  final value = double.tryParse(cleaned);
  return value?.abs();
}

_Semantics _savingsSemantics(String description) {
  final text = _lower(description);
  if (RegExp(r'\b(abono|deposito|deposito recibido|transferencia recibida|te transfirieron|interes abonado|remuneracion|sueldo)\b').hasMatch(text)) {
    return const _Semantics(StatementDirection.incoming, StatementSemanticType.income);
  }
  if (RegExp(r'\b(transferencia enviada|transferencia a )').hasMatch(text)) {
    return const _Semantics(StatementDirection.outgoing, StatementSemanticType.externalTransfer);
  }
  if (RegExp(r'\b(comision|membresia|fee)\b').hasMatch(text)) {
    return const _Semantics(StatementDirection.outgoing, StatementSemanticType.fee);
  }
  if (RegExp(r'\b(retiro|compra|consumo|cargo|pago|debito)\b').hasMatch(text)) {
    return const _Semantics(StatementDirection.outgoing, StatementSemanticType.expense);
  }
  return const _Semantics(StatementDirection.unknown, StatementSemanticType.unknown);
}

_Semantics _cardSemantics(String description) {
  final text = _lower(description);
  if (RegExp(r'\b(devolucion|reembolso|refund)\b').hasMatch(text)) {
    return const _Semantics(StatementDirection.incoming, StatementSemanticType.refund);
  }
  if (RegExp(r'\b(pago (de )?tarjeta|pago recibido|pago tc)\b').hasMatch(text)) {
    return const _Semantics(StatementDirection.unknown, StatementSemanticType.cardPayment);
  }
  if (RegExp(r'\b(comision|membresia|seguro|interes|fee)\b').hasMatch(text)) {
    return const _Semantics(StatementDirection.outgoing, StatementSemanticType.fee);
  }
  if (RegExp(r'\b(compra|consumo|pos|establecimiento)\b').hasMatch(text)) {
    return const _Semantics(StatementDirection.outgoing, StatementSemanticType.expense);
  }
  return const _Semantics(StatementDirection.unknown, StatementSemanticType.unknown);
}
