import 'alpha2_models.dart';

enum Alpha2ReconciliationOutcome {
  confirmed,
  proposed,
  review,
  rejected,
  conflict,
}

class Alpha2ReconciliationPolicy {
  const Alpha2ReconciliationPolicy._();

  static const int amountWeight = 30;
  static const int timeDistanceWeight = 15;
  static const int institutionWeight = 10;
  static const int accountOrInstrumentWeight = 15;
  static const int merchantOrCounterpartyWeight = 10;
  static const int externalReferenceWeight = 15;
  static const int movementCompatibilityWeight = 5;
  static const int minimumAutomaticScore = 85;
  static const int minimumMargin = 15;
}

class Alpha2ReconciliationSnapshot {
  const Alpha2ReconciliationSnapshot({
    required this.leftEvidenceId,
    required this.rightEvidenceId,
    required this.amountMatch,
    required this.currencyMatch,
    required this.exactTimestampMatch,
    required this.institutionMatch,
    required this.accountMatch,
    required this.instrumentMatch,
    required this.merchantMatch,
    required this.referenceMatch,
    required this.movementCompatibility,
    required this.sourceIndependence,
    required this.score,
    required this.vetoes,
  });

  final String leftEvidenceId;
  final String rightEvidenceId;
  final bool amountMatch;
  final bool currencyMatch;
  final bool exactTimestampMatch;
  final bool institutionMatch;
  final bool accountMatch;
  final bool instrumentMatch;
  final bool merchantMatch;
  final bool referenceMatch;
  final bool movementCompatibility;
  final bool sourceIndependence;
  final int score;
  final List<String> vetoes;

  bool get stableAnchor =>
      referenceMatch || ((accountMatch || instrumentMatch) && merchantMatch);
}

class Alpha2CandidateEvaluation {
  const Alpha2CandidateEvaluation({
    required this.evidenceId,
    required this.snapshot,
  });

  final String evidenceId;
  final Alpha2ReconciliationSnapshot snapshot;

  int get score => snapshot.score;
  bool get eligible => snapshot.vetoes.isEmpty;
  bool get conflict => snapshot.vetoes.contains('ALREADY_LINKED_CONFLICT');
  bool get stableAnchor => snapshot.stableAnchor;
}

class Alpha2ReconciliationDecision {
  const Alpha2ReconciliationDecision({
    required this.decisionKey,
    required this.leftEvidenceId,
    required this.outcome,
    required this.selectedEvidenceId,
    required this.topScore,
    required this.secondScore,
    required this.margin,
    required this.ambiguityCount,
    required this.reasons,
    required this.evaluations,
  });

  final String decisionKey;
  final String leftEvidenceId;
  final Alpha2ReconciliationOutcome outcome;
  final String? selectedEvidenceId;
  final int topScore;
  final int secondScore;
  final int margin;
  final int ambiguityCount;
  final List<String> reasons;
  final List<Alpha2CandidateEvaluation> evaluations;
}

Alpha2ReconciliationSnapshot alpha2PairSnapshot(
  Alpha2Evidence leftInput,
  Alpha2Evidence rightInput, {
  Map<String, String> existingCanonicalByEvidence = const <String, String>{},
}) {
  final left = leftInput.normalized();
  final right = rightInput.normalized();
  final vetoes = <String>[];

  if (left.evidenceId == right.evidenceId) {
    vetoes.add('SELF_MATCH_FORBIDDEN');
  }
  if (left.tenantId != right.tenantId) {
    vetoes.add('TENANT_MISMATCH');
  }

  final currencyMatch = left.currency == right.currency;
  if (!currencyMatch) {
    vetoes.add('CURRENCY_MISMATCH');
  }

  final compatible = _movementCompatible(left, right);
  if (!compatible) {
    vetoes.add('ECONOMIC_SEMANTICS_INCOMPATIBLE');
  }

  final sourceIndependence = left.channel != right.channel;
  if (!sourceIndependence) {
    vetoes.add('SOURCE_CHANNEL_NOT_INDEPENDENT');
  }

  final accountMatch = left.accountId != null &&
      right.accountId != null &&
      left.accountId == right.accountId;
  final instrumentMatch = left.instrumentId != null &&
      right.instrumentId != null &&
      left.instrumentId == right.instrumentId;
  final knownAccountConflict = left.accountId != null &&
      right.accountId != null &&
      left.accountId != right.accountId;
  final knownInstrumentConflict = left.instrumentId != null &&
      right.instrumentId != null &&
      left.instrumentId != right.instrumentId;
  if (knownAccountConflict || knownInstrumentConflict) {
    vetoes.add('SCOPE_ACCOUNT_OR_INSTRUMENT_MISMATCH');
  }

  if (left.statementPeriodId != null &&
      right.statementPeriodId != null &&
      left.statementPeriodId != right.statementPeriodId) {
    vetoes.add('SCOPE_STATEMENT_PERIOD_MISMATCH');
  }

  final leftCanonical = existingCanonicalByEvidence[left.evidenceId];
  final rightCanonical = existingCanonicalByEvidence[right.evidenceId];
  if (leftCanonical != null &&
      rightCanonical != null &&
      leftCanonical != rightCanonical) {
    vetoes.add('ALREADY_LINKED_CONFLICT');
  }

  final amountMatch = _minorUnits(left.amount) == _minorUnits(right.amount);
  final exactTimestampMatch = left.occurredAt.isAtSameMomentAs(right.occurredAt);
  final institutionMatch = left.institutionCode != null &&
      right.institutionCode != null &&
      left.institutionCode == right.institutionCode;
  final merchantMatch = left.merchantCanonical != null &&
      right.merchantCanonical != null &&
      left.merchantCanonical == right.merchantCanonical;
  final referenceMatch = left.externalReference != null &&
      right.externalReference != null &&
      left.externalReference == right.externalReference;

  var score = 0;
  if (amountMatch) score += Alpha2ReconciliationPolicy.amountWeight;
  if (exactTimestampMatch) {
    score += Alpha2ReconciliationPolicy.timeDistanceWeight;
  }
  if (institutionMatch) score += Alpha2ReconciliationPolicy.institutionWeight;
  if (accountMatch || instrumentMatch) {
    score += Alpha2ReconciliationPolicy.accountOrInstrumentWeight;
  }
  if (merchantMatch) {
    score += Alpha2ReconciliationPolicy.merchantOrCounterpartyWeight;
  }
  if (referenceMatch) {
    score += Alpha2ReconciliationPolicy.externalReferenceWeight;
  }
  if (compatible) {
    score += Alpha2ReconciliationPolicy.movementCompatibilityWeight;
  }

  vetoes.sort();
  return Alpha2ReconciliationSnapshot(
    leftEvidenceId: left.evidenceId,
    rightEvidenceId: right.evidenceId,
    amountMatch: amountMatch,
    currencyMatch: currencyMatch,
    exactTimestampMatch: exactTimestampMatch,
    institutionMatch: institutionMatch,
    accountMatch: accountMatch,
    instrumentMatch: instrumentMatch,
    merchantMatch: merchantMatch,
    referenceMatch: referenceMatch,
    movementCompatibility: compatible,
    sourceIndependence: sourceIndependence,
    score: score,
    vetoes: List<String>.unmodifiable(vetoes),
  );
}

Alpha2ReconciliationDecision reconcileAlpha2Evidence({
  required Alpha2Evidence leftEvidence,
  required List<Alpha2Evidence> candidates,
  Map<String, String> existingCanonicalByEvidence = const <String, String>{},
}) {
  final left = leftEvidence.normalized();
  final seen = <String>{};
  final evaluations = <Alpha2CandidateEvaluation>[];
  for (final rawCandidate in candidates) {
    final candidate = rawCandidate.normalized();
    if (!seen.add(candidate.evidenceId)) {
      throw ArgumentError('RECONCILIATION_DUPLICATE_CANDIDATE_ID');
    }
    evaluations.add(
      Alpha2CandidateEvaluation(
        evidenceId: candidate.evidenceId,
        snapshot: alpha2PairSnapshot(
          left,
          candidate,
          existingCanonicalByEvidence: existingCanonicalByEvidence,
        ),
      ),
    );
  }
  evaluations.sort((a, b) {
    final byScore = b.score.compareTo(a.score);
    return byScore != 0 ? byScore : a.evidenceId.compareTo(b.evidenceId);
  });

  final conflicts = evaluations.where((item) => item.conflict).toList();
  final eligible = evaluations.where((item) => item.eligible).toList();

  var outcome = Alpha2ReconciliationOutcome.rejected;
  String? selectedEvidenceId;
  var topScore = 0;
  var secondScore = 0;
  var margin = 0;
  var ambiguityCount = 0;
  var reasons = <String>[];

  if (conflicts.isNotEmpty) {
    outcome = Alpha2ReconciliationOutcome.conflict;
    reasons = <String>['ALREADY_LINKED_CONFLICT'];
  } else if (eligible.isEmpty) {
    outcome = Alpha2ReconciliationOutcome.rejected;
    reasons = evaluations
        .expand((item) => item.snapshot.vetoes)
        .toSet()
        .toList()
      ..sort();
  } else {
    final top = eligible.first;
    final second = eligible.length > 1 ? eligible[1] : null;
    topScore = top.score;
    secondScore = second?.score ?? 0;
    margin = second == null ? 100 : topScore - secondScore;
    ambiguityCount = eligible
        .where(
          (item) =>
              topScore - item.score < Alpha2ReconciliationPolicy.minimumMargin,
        )
        .length -
        1;
    if (ambiguityCount < 0) ambiguityCount = 0;

    final uniqueEnough = second == null ||
        margin >= Alpha2ReconciliationPolicy.minimumMargin;
    final autoConfirm = topScore >=
            Alpha2ReconciliationPolicy.minimumAutomaticScore &&
        uniqueEnough &&
        top.snapshot.sourceIndependence &&
        top.snapshot.amountMatch &&
        top.snapshot.currencyMatch &&
        top.stableAnchor;

    if (autoConfirm) {
      outcome = Alpha2ReconciliationOutcome.confirmed;
      selectedEvidenceId = top.evidenceId;
      reasons = <String>['UNIQUE_STRONG_MATCH'];
    } else if (!uniqueEnough) {
      outcome = Alpha2ReconciliationOutcome.review;
      reasons = <String>['AMBIGUOUS_SCORE_MARGIN'];
    } else if (topScore > 0) {
      outcome = Alpha2ReconciliationOutcome.proposed;
      selectedEvidenceId = top.evidenceId;
      reasons = <String>[
        top.stableAnchor ? 'BELOW_AUTOMATIC_SCORE' : 'STABLE_ANCHOR_REQUIRED',
      ];
    } else {
      outcome = Alpha2ReconciliationOutcome.rejected;
      reasons = <String>['NO_POSITIVE_MATCH_FEATURES'];
    }
  }

  final decisionKey = _decisionKey(
    leftEvidenceId: left.evidenceId,
    outcome: outcome,
    evaluations: evaluations,
  );
  return Alpha2ReconciliationDecision(
    decisionKey: decisionKey,
    leftEvidenceId: left.evidenceId,
    outcome: outcome,
    selectedEvidenceId: selectedEvidenceId,
    topScore: topScore,
    secondScore: secondScore,
    margin: margin,
    ambiguityCount: ambiguityCount,
    reasons: List<String>.unmodifiable(reasons),
    evaluations: List<Alpha2CandidateEvaluation>.unmodifiable(evaluations),
  );
}

Alpha2CanonicalTransaction reconcileCanonicalPair({
  required Alpha2Evidence leftEvidence,
  required Alpha2Evidence rightEvidence,
  required Alpha2ReconciliationDecision decision,
}) {
  if (decision.outcome != Alpha2ReconciliationOutcome.confirmed ||
      decision.selectedEvidenceId != rightEvidence.evidenceId) {
    throw StateError('RECONCILIATION_CONFIRMED_SELECTION_REQUIRED');
  }
  final left = leftEvidence.normalized();
  final right = rightEvidence.normalized();
  if (left.tenantId != right.tenantId) {
    throw StateError('RECONCILIATION_CANONICAL_TENANT_MISMATCH');
  }
  final evidenceIds = <String>[left.evidenceId, right.evidenceId]..sort();
  final posted = left.channel == Alpha2EvidenceChannel.statementLedger
      ? left
      : right.channel == Alpha2EvidenceChannel.statementLedger
          ? right
          : null;
  final canonicalSource = posted ?? left;
  return Alpha2CanonicalTransaction(
    id: 'evt:${left.tenantId}:${evidenceIds.join("+")}',
    tenantId: left.tenantId,
    evidenceIds: List<String>.unmodifiable(evidenceIds),
    amount: canonicalSource.amount,
    currency: canonicalSource.currency,
    occurredAt: canonicalSource.occurredAt,
    semanticType: canonicalSource.semanticType,
    truthState: Alpha2TruthState.reconciled,
    flowDirection: canonicalSource.flowDirection,
    merchantCanonical:
        canonicalSource.merchantCanonical ?? left.merchantCanonical ?? right.merchantCanonical,
    categoryName:
        canonicalSource.categoryName ?? left.categoryName ?? right.categoryName,
    accountId: canonicalSource.accountId ?? left.accountId ?? right.accountId,
    instrumentId:
        canonicalSource.instrumentId ?? left.instrumentId ?? right.instrumentId,
  );
}

int _minorUnits(double amount) => (amount.abs() * 100).round();

String? _semanticFamily(Alpha2SemanticType value) => switch (value) {
      Alpha2SemanticType.expense ||
      Alpha2SemanticType.fee ||
      Alpha2SemanticType.cashWithdrawal ||
      Alpha2SemanticType.servicePayment =>
        'EXPENSE',
      Alpha2SemanticType.income => 'INCOME',
      Alpha2SemanticType.cardPayment => 'CARD_PAYMENT',
      Alpha2SemanticType.internalTransfer => 'INTERNAL_TRANSFER',
      Alpha2SemanticType.externalTransfer => 'EXTERNAL_TRANSFER',
      Alpha2SemanticType.refund => 'REFUND',
      Alpha2SemanticType.reversal => 'REVERSAL',
      Alpha2SemanticType.unknown => null,
    };

bool _movementCompatible(Alpha2Evidence left, Alpha2Evidence right) {
  final leftFamily = _semanticFamily(left.semanticType);
  final rightFamily = _semanticFamily(right.semanticType);
  if (leftFamily == null || rightFamily == null || leftFamily != rightFamily) {
    return false;
  }
  return left.flowDirection == Alpha2FlowDirection.unknown ||
      right.flowDirection == Alpha2FlowDirection.unknown ||
      left.flowDirection == right.flowDirection;
}

String _decisionKey({
  required String leftEvidenceId,
  required Alpha2ReconciliationOutcome outcome,
  required List<Alpha2CandidateEvaluation> evaluations,
}) {
  final rows = evaluations
      .map(
        (item) =>
            '${item.evidenceId}:${item.score}:${item.snapshot.vetoes.join(",")}',
      )
      .toList()
    ..sort();
  return 'rec:$leftEvidenceId:${outcome.name}:${rows.join("|")}';
}
