import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'alpha2_models.dart';
import 'alpha2_reconciliation.dart';

const String alpha2CanonicalRuntimeVersion = 'A2_CANONICAL_RUNTIME_V1';

class Alpha2PendingResolution {
  const Alpha2PendingResolution({
    required this.leftEvidenceId,
    required this.relatedEvidenceIds,
    required this.outcome,
    required this.reasons,
  });

  final String leftEvidenceId;
  final List<String> relatedEvidenceIds;
  final Alpha2ReconciliationOutcome outcome;
  final List<String> reasons;
}

class Alpha2RuntimeResult {
  const Alpha2RuntimeResult({
    required this.canonicalTransactions,
    required this.reconciliationDecisions,
    required this.pendingResolutions,
    required this.materializedEvidenceIds,
  });

  final List<Alpha2CanonicalTransaction> canonicalTransactions;
  final List<Alpha2ReconciliationDecision> reconciliationDecisions;
  final List<Alpha2PendingResolution> pendingResolutions;
  final Set<String> materializedEvidenceIds;
}

Alpha2RuntimeResult runAlpha2CanonicalRuntime({
  required List<Alpha2Evidence> evidence,
  Map<String, String> existingCanonicalByEvidence = const <String, String>{},
}) {
  final normalized = evidence.map((item) => item.normalized()).toList()
    ..sort((a, b) => a.evidenceId.compareTo(b.evidenceId));
  final ids = <String>{};
  for (final item in normalized) {
    if (!ids.add(item.evidenceId)) {
      throw ArgumentError('ALPHA2_RUNTIME_DUPLICATE_EVIDENCE_ID');
    }
  }

  final gmail = normalized
      .where((item) => item.channel == Alpha2EvidenceChannel.gmailTransaction)
      .toList();
  final statements = normalized
      .where((item) => item.channel == Alpha2EvidenceChannel.statementLedger)
      .toList();
  final other = normalized
      .where(
        (item) => item.channel != Alpha2EvidenceChannel.gmailTransaction &&
            item.channel != Alpha2EvidenceChannel.statementLedger,
      )
      .toList();

  final consumed = <String>{};
  final blockedFromMaterialization = <String>{};
  final canonical = <Alpha2CanonicalTransaction>[];
  final decisions = <Alpha2ReconciliationDecision>[];
  final pending = <Alpha2PendingResolution>[];
  final localCanonicalByEvidence = <String, String>{...existingCanonicalByEvidence};

  for (final left in gmail) {
    if (consumed.contains(left.evidenceId)) continue;
    final candidates = statements
        .where((item) => !consumed.contains(item.evidenceId))
        .toList();
    if (candidates.isEmpty) continue;

    final decision = reconcileAlpha2Evidence(
      leftEvidence: left,
      candidates: candidates,
      existingCanonicalByEvidence: localCanonicalByEvidence,
    );
    decisions.add(decision);

    if (decision.outcome == Alpha2ReconciliationOutcome.confirmed) {
      final selected = candidates.firstWhere(
        (item) => item.evidenceId == decision.selectedEvidenceId,
      );
      final transaction = reconcileCanonicalPair(
        leftEvidence: left,
        rightEvidence: selected,
        decision: decision,
      );
      canonical.add(transaction);
      consumed.add(left.evidenceId);
      consumed.add(selected.evidenceId);
      localCanonicalByEvidence[left.evidenceId] = transaction.id;
      localCanonicalByEvidence[selected.evidenceId] = transaction.id;
      continue;
    }

    if (decision.outcome == Alpha2ReconciliationOutcome.proposed ||
        decision.outcome == Alpha2ReconciliationOutcome.review ||
        decision.outcome == Alpha2ReconciliationOutcome.conflict) {
      final related = <String>[];
      if (decision.outcome == Alpha2ReconciliationOutcome.proposed &&
          decision.selectedEvidenceId != null) {
        related.add(decision.selectedEvidenceId!);
      } else if (decision.outcome == Alpha2ReconciliationOutcome.review) {
        related.addAll(
          decision.evaluations
              .where(
                (item) =>
                    item.eligible &&
                    decision.topScore - item.score <
                        Alpha2ReconciliationPolicy.minimumMargin,
              )
              .map((item) => item.evidenceId),
        );
      } else {
        related.addAll(
          decision.evaluations
              .where((item) => item.conflict)
              .map((item) => item.evidenceId),
        );
      }
      related.sort();
      blockedFromMaterialization.add(left.evidenceId);
      blockedFromMaterialization.addAll(related);
      pending.add(
        Alpha2PendingResolution(
          leftEvidenceId: left.evidenceId,
          relatedEvidenceIds: List<String>.unmodifiable(related),
          outcome: decision.outcome,
          reasons: List<String>.unmodifiable(decision.reasons),
        ),
      );
    }
  }

  for (final item in <Alpha2Evidence>[...gmail, ...statements, ...other]) {
    if (consumed.contains(item.evidenceId) ||
        blockedFromMaterialization.contains(item.evidenceId)) {
      continue;
    }
    final transaction = materializeAlpha2SourceObservation(item);
    canonical.add(transaction);
    consumed.add(item.evidenceId);
    localCanonicalByEvidence[item.evidenceId] = transaction.id;
  }

  canonical.sort((a, b) => a.id.compareTo(b.id));
  decisions.sort((a, b) => a.decisionKey.compareTo(b.decisionKey));
  pending.sort((a, b) => a.leftEvidenceId.compareTo(b.leftEvidenceId));

  return Alpha2RuntimeResult(
    canonicalTransactions:
        List<Alpha2CanonicalTransaction>.unmodifiable(canonical),
    reconciliationDecisions:
        List<Alpha2ReconciliationDecision>.unmodifiable(decisions),
    pendingResolutions: List<Alpha2PendingResolution>.unmodifiable(pending),
    materializedEvidenceIds: Set<String>.unmodifiable(consumed),
  );
}

Alpha2CanonicalTransaction materializeAlpha2SourceObservation(
  Alpha2Evidence input,
) {
  final evidence = input.normalized();
  if (evidence.truthState != Alpha2TruthState.observed &&
      evidence.truthState != Alpha2TruthState.posted &&
      evidence.truthState != Alpha2TruthState.reconciled) {
    throw StateError('ALPHA2_SOURCE_OBSERVATION_NOT_MATERIALIZABLE');
  }
  final digest = sha256
      .convert(
        utf8.encode(
          '$alpha2CanonicalRuntimeVersion|${evidence.tenantId}|${evidence.evidenceId}',
        ),
      )
      .toString();
  return Alpha2CanonicalTransaction(
    id: 'evt_${digest.substring(0, 40)}',
    tenantId: evidence.tenantId,
    evidenceIds: <String>[evidence.evidenceId],
    amount: evidence.amount,
    currency: evidence.currency,
    occurredAt: evidence.occurredAt,
    semanticType: evidence.semanticType,
    truthState: evidence.truthState,
    flowDirection: evidence.flowDirection,
    merchantCanonical: evidence.merchantCanonical,
    categoryName: evidence.categoryName,
    accountId: evidence.accountId,
    instrumentId: evidence.instrumentId,
  );
}
