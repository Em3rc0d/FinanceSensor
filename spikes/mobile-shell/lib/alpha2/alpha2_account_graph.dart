import 'dart:convert';

import 'package:crypto/crypto.dart';

const String alpha2AccountGraphVersion = 'A2_ACCOUNT_GRAPH_V1';
const int alpha2StableEvidencePeriodsRequired = 2;

enum Alpha2AccountNodeKind { account, paymentInstrument }

enum Alpha2AccountMappingState {
  unmapped,
  probable,
  userConfirmed,
  systemConfirmedByStableEvidence,
}

class Alpha2AccountNode {
  const Alpha2AccountNode({
    required this.id,
    required this.tenantId,
    required this.institutionCode,
    required this.currency,
    required this.kind,
    required this.maskedHintDigest,
    required this.profileStableIdentifierDigest,
    required this.profileDeclaresStableIdentifier,
    this.productType,
    this.active = true,
  });

  final String id;
  final String tenantId;
  final String institutionCode;
  final String currency;
  final Alpha2AccountNodeKind kind;
  final String? productType;
  final String? maskedHintDigest;
  final String? profileStableIdentifierDigest;
  final bool profileDeclaresStableIdentifier;
  final bool active;
}

class Alpha2StatementOwnershipObservation {
  const Alpha2StatementOwnershipObservation({
    required this.tenantId,
    required this.statementPeriodId,
    required this.institutionCode,
    required this.currency,
    required this.kind,
    this.productType,
    this.maskedHint,
    this.profileStableIdentifierDigest,
    this.profileDeclaresStableIdentifier = false,
  });

  final String tenantId;
  final String statementPeriodId;
  final String institutionCode;
  final String currency;
  final Alpha2AccountNodeKind kind;
  final String? productType;
  final String? maskedHint;
  final String? profileStableIdentifierDigest;
  final bool profileDeclaresStableIdentifier;
}

class Alpha2PriorOwnershipEvidence {
  const Alpha2PriorOwnershipEvidence({
    required this.nodeId,
    required this.tenantId,
    required this.statementPeriodId,
    required this.institutionCode,
    required this.currency,
    required this.kind,
    required this.maskedHintDigest,
  });

  final String nodeId;
  final String tenantId;
  final String statementPeriodId;
  final String institutionCode;
  final String currency;
  final Alpha2AccountNodeKind kind;
  final String? maskedHintDigest;
}

class Alpha2OwnershipDecision {
  const Alpha2OwnershipDecision({
    required this.mappingId,
    required this.tenantId,
    required this.statementPeriodId,
    required this.state,
    required this.ownedNodeId,
    required this.proposedNodeId,
    required this.reason,
    required this.stableEvidencePeriodCount,
    required this.automaticOwnership,
  });

  final String mappingId;
  final String tenantId;
  final String statementPeriodId;
  final Alpha2AccountMappingState state;
  final String? ownedNodeId;
  final String? proposedNodeId;
  final String reason;
  final int stableEvidencePeriodCount;
  final bool automaticOwnership;
}

Alpha2AccountNode createAlpha2AccountNode({
  required String tenantId,
  required String institutionCode,
  required String currency,
  required Alpha2AccountNodeKind kind,
  String? productType,
  String? maskedHint,
  String? profileStableIdentifierDigest,
  bool profileDeclaresStableIdentifier = false,
  String? nodeId,
}) {
  final tenant = _required(tenantId, 'ACCOUNT_GRAPH_TENANT_REQUIRED');
  final institution = _institution(institutionCode);
  final normalizedCurrency = _currency(currency);
  final hintDigest = alpha2MaskedHintDigest(maskedHint);
  final stableDigest = _stableDigest(profileStableIdentifierDigest);
  if (stableDigest != null && !profileDeclaresStableIdentifier) {
    throw ArgumentError('ACCOUNT_GRAPH_PROFILE_STABLE_IDENTIFIER_AUTHORITY_REQUIRED');
  }
  final identityMaterial = stableDigest ??
      hintDigest ??
      _sha256Hex('unanchored|$tenant|$institution|$normalizedCurrency|${kind.name}|${nodeId ?? 'manual'}');
  final id = nodeId ??
      '${kind == Alpha2AccountNodeKind.account ? 'acct' : 'pi'}_${_sha256Hex('$tenant|$institution|${kind.name}|$identityMaterial').substring(0, 40)}';
  return Alpha2AccountNode(
    id: id,
    tenantId: tenant,
    institutionCode: institution,
    currency: normalizedCurrency,
    kind: kind,
    productType: _optionalUpper(productType),
    maskedHintDigest: hintDigest,
    profileStableIdentifierDigest: stableDigest,
    profileDeclaresStableIdentifier: profileDeclaresStableIdentifier,
  );
}

Alpha2OwnershipDecision resolveAlpha2StatementOwnership({
  required Alpha2StatementOwnershipObservation observation,
  required List<Alpha2AccountNode> candidateNodes,
  List<Alpha2PriorOwnershipEvidence> priorEvidence = const <Alpha2PriorOwnershipEvidence>[],
}) {
  final tenant = _required(observation.tenantId, 'ACCOUNT_GRAPH_TENANT_REQUIRED');
  final period = _required(observation.statementPeriodId, 'ACCOUNT_GRAPH_STATEMENT_PERIOD_REQUIRED');
  final institution = _institution(observation.institutionCode);
  final currency = _currency(observation.currency);
  final hintDigest = alpha2MaskedHintDigest(observation.maskedHint);
  final stableDigest = _stableDigest(observation.profileStableIdentifierDigest);
  if (stableDigest != null && !observation.profileDeclaresStableIdentifier) {
    throw ArgumentError('ACCOUNT_GRAPH_PROFILE_STABLE_IDENTIFIER_AUTHORITY_REQUIRED');
  }

  final compatible = candidateNodes.where((node) {
    return node.active &&
        node.tenantId == tenant &&
        node.institutionCode == institution &&
        node.currency == currency &&
        node.kind == observation.kind;
  }).toList();

  final stableMatches = observation.profileDeclaresStableIdentifier && stableDigest != null
      ? compatible
          .where((node) => node.profileStableIdentifierDigest == stableDigest)
          .toList()
      : <Alpha2AccountNode>[];

  var state = Alpha2AccountMappingState.unmapped;
  String? ownedNodeId;
  String? proposedNodeId;
  var reason = 'NO_COMPATIBLE_NODE';
  var stableEvidencePeriodCount = 0;

  if (stableMatches.length > 1) {
    reason = 'STABLE_IDENTIFIER_CONFLICT';
  } else if (stableMatches.length == 1) {
    state = Alpha2AccountMappingState.systemConfirmedByStableEvidence;
    ownedNodeId = stableMatches.single.id;
    proposedNodeId = ownedNodeId;
    reason = 'EXACT_PROFILE_STABLE_IDENTIFIER';
    stableEvidencePeriodCount = 1;
  } else if (hintDigest != null) {
    final hintMatches = compatible
        .where((node) => node.maskedHintDigest == hintDigest)
        .toList();
    if (hintMatches.length > 1) {
      reason = 'MASKED_HINT_AMBIGUOUS';
    } else if (hintMatches.length == 1) {
      final candidate = hintMatches.single;
      final periods = <String>{period};
      for (final item in priorEvidence) {
        if (item.nodeId == candidate.id &&
            item.tenantId == tenant &&
            item.institutionCode.toUpperCase() == institution &&
            item.currency.toUpperCase() == currency &&
            item.kind == observation.kind &&
            item.maskedHintDigest == hintDigest) {
          periods.add(item.statementPeriodId);
        }
      }
      stableEvidencePeriodCount = periods.length;
      proposedNodeId = candidate.id;
      if (stableEvidencePeriodCount >= alpha2StableEvidencePeriodsRequired) {
        state = Alpha2AccountMappingState.systemConfirmedByStableEvidence;
        ownedNodeId = candidate.id;
        reason = 'MASKED_HINT_STABLE_ACROSS_TWO_PERIODS';
      } else {
        state = Alpha2AccountMappingState.probable;
        reason = 'MASKED_HINT_SINGLE_PERIOD';
      }
    } else if (compatible.length == 1) {
      state = Alpha2AccountMappingState.probable;
      proposedNodeId = compatible.single.id;
      reason = 'INSTITUTION_CURRENCY_KIND_ONLY';
    } else if (compatible.length > 1) {
      reason = 'NO_UNIQUE_HINT_MATCH';
    }
  } else if (compatible.length == 1) {
    state = Alpha2AccountMappingState.probable;
    proposedNodeId = compatible.single.id;
    reason = 'INSTITUTION_CURRENCY_KIND_ONLY';
  } else if (compatible.length > 1) {
    reason = 'INSTITUTION_CURRENCY_KIND_AMBIGUOUS';
  }

  final mappingPayload = <String>[
    alpha2AccountGraphVersion,
    tenant,
    period,
    state.name,
    ownedNodeId ?? '',
    proposedNodeId ?? '',
    reason,
    '$stableEvidencePeriodCount',
  ].join('|');
  return Alpha2OwnershipDecision(
    mappingId: 'map_${_sha256Hex(mappingPayload).substring(0, 40)}',
    tenantId: tenant,
    statementPeriodId: period,
    state: state,
    ownedNodeId: ownedNodeId,
    proposedNodeId: proposedNodeId,
    reason: reason,
    stableEvidencePeriodCount: stableEvidencePeriodCount,
    automaticOwnership:
        state == Alpha2AccountMappingState.systemConfirmedByStableEvidence,
  );
}

Alpha2OwnershipDecision confirmAlpha2OwnershipByUser({
  required Alpha2OwnershipDecision decision,
  required String nodeId,
}) {
  final id = _required(nodeId, 'ACCOUNT_GRAPH_USER_NODE_REQUIRED');
  final payload = <String>[
    alpha2AccountGraphVersion,
    decision.tenantId,
    decision.statementPeriodId,
    Alpha2AccountMappingState.userConfirmed.name,
    id,
    'USER_CONFIRMED',
  ].join('|');
  return Alpha2OwnershipDecision(
    mappingId: 'map_${_sha256Hex(payload).substring(0, 40)}',
    tenantId: decision.tenantId,
    statementPeriodId: decision.statementPeriodId,
    state: Alpha2AccountMappingState.userConfirmed,
    ownedNodeId: id,
    proposedNodeId: id,
    reason: 'USER_CONFIRMED',
    stableEvidencePeriodCount: decision.stableEvidencePeriodCount,
    automaticOwnership: false,
  );
}

String? alpha2MaskedHintDigest(String? value) {
  final raw = value?.trim().replaceAll(RegExp(r'\s+'), '').toUpperCase() ?? '';
  if (raw.isEmpty) return null;
  if (!RegExp(r'[X*•]').hasMatch(raw)) {
    throw ArgumentError('ACCOUNT_GRAPH_UNMASKED_IDENTIFIER_FORBIDDEN');
  }
  final visible = raw.replaceAll(RegExp(r'[X*•]'), '');
  if (visible.isEmpty || visible.length > 8) {
    throw ArgumentError('ACCOUNT_GRAPH_MASKED_HINT_INVALID');
  }
  final normalized = raw.replaceAll('•', '*').replaceAll('X', '*');
  return _sha256Hex('masked-hint-v1|$normalized');
}

String alpha2StableIdentifierDigest(String canonicalStableIdentifier) {
  final normalized = _required(
    canonicalStableIdentifier,
    'ACCOUNT_GRAPH_STABLE_IDENTIFIER_REQUIRED',
  );
  return _sha256Hex('profile-stable-id-v1|$normalized');
}

String _sha256Hex(String value) => sha256.convert(utf8.encode(value)).toString();

String _required(String value, String code) {
  final normalized = value.trim();
  if (normalized.isEmpty) throw ArgumentError(code);
  return normalized;
}

String _institution(String value) =>
    _required(value, 'ACCOUNT_GRAPH_INSTITUTION_REQUIRED').toUpperCase();

String _currency(String value) {
  final normalized = value.trim().toUpperCase();
  if (!RegExp(r'^[A-Z]{3}$').hasMatch(normalized)) {
    throw ArgumentError('ACCOUNT_GRAPH_CURRENCY_REQUIRED');
  }
  return normalized;
}

String? _stableDigest(String? value) {
  final normalized = value?.trim().toLowerCase();
  if (normalized == null || normalized.isEmpty) return null;
  if (!RegExp(r'^[a-f0-9]{64}$').hasMatch(normalized)) {
    throw ArgumentError('ACCOUNT_GRAPH_STABLE_IDENTIFIER_DIGEST_REQUIRED');
  }
  return normalized;
}

String? _optionalUpper(String? value) {
  final normalized = value?.trim();
  return normalized == null || normalized.isEmpty ? null : normalized.toUpperCase();
}
