enum StatementDirection { incoming, outgoing, unknown }

enum StatementSemanticType {
  income,
  expense,
  externalTransfer,
  cardPayment,
  refund,
  fee,
  unknown,
}

enum StatementProfile {
  bcpCredit,
  ripleyCredit,
  bcpSavingsRequested,
}

class StatementDerivedEvidence {
  const StatementDerivedEvidence({
    required this.amount,
    required this.currency,
    required this.occurredAt,
    required this.description,
    required this.direction,
    required this.semanticType,
    required this.confidence,
  });

  final double amount;
  final String currency;
  final DateTime occurredAt;
  final String description;
  final StatementDirection direction;
  final StatementSemanticType semanticType;
  final double confidence;

  Map<String, Object?> toSafeMap() => {
        'amount': amount,
        'currency': currency,
        'occurredAt': occurredAt.toUtc().toIso8601String(),
        'description': description,
        'direction': direction.name,
        'semanticType': semanticType.name,
        'confidence': confidence,
      };
}
