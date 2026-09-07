import 'dart:convert';

import 'package:crypto/crypto.dart';

import 'alpha2_account_graph.dart';
import 'alpha2_models.dart';
import 'alpha2_monthly_coverage.dart';
import 'alpha2_reconciliation.dart';
import 'alpha2_runtime.dart';

const String alpha2ProductGateVersion = 'A2_PRODUCT_GATE_V1';

class Alpha2ProductGateContext {
  const Alpha2ProductGateContext({
    this.candidateNodes = const <Alpha2AccountNode>[],
    this.priorOwnershipEvidence = const <Alpha2PriorOwnershipEvidence>[],
    this.userConfirmedOwnerByStatementPeriod = const <String, String>{},
    this.calendarYear,
    this.calendarMonth,
    this.closeRequested = true,
  });

  final List<Alpha2AccountNode> candidateNodes;
  final List<Alpha2PriorOwnershipEvidence> priorOwnershipEvidence;
  final Map<String, String> userConfirmedOwnerByStatementPeriod;
  final int? calendarYear;
  final int? calendarMonth;
  final bool closeRequested;
}

class Alpha2ProductGateResult {
  const Alpha2ProductGateResult({
    required this.ownershipDecisions,
    required this.blockingReasons,
    required this.monthlyClose,
  });

  final List<Alpha2OwnershipDecision> ownershipDecisions;
  final List<String> blockingReasons;
  final Alpha2MonthlyCloseEvaluation? monthlyClose;

  bool get accountMappingRequired =>
      blockingReasons.contains('ACCOUNT_MAPPING_REQUIRED');
}

Alpha2ProductGateResult evaluateAlpha2ProductGate({
  required String tenantId,
  required List<Alpha2Evidence> evidence,
  required Alpha2RuntimeResult runtime,
  Alpha2ProductGateContext context = const Alpha2ProductGateContext(),
}) {
  final normalizedTenant = tenantId.trim();
  if (normalizedTenant.isEmpty) {
    throw ArgumentError('ALPHA2_PRODUCT_GATE_TENANT_REQUIRED');
  }
  if ((context.calendarYear == null) != (context.calendarMonth == null)) {
    throw ArgumentError('ALPHA2_PRODUCT_GATE_CALENDAR_PAIR_REQUIRED');
  }
  if (context.calendarMonth != null &&
      (context.calendarMonth! < 1 || context.calendarMonth! > 12)) {
    throw ArgumentError('ALPHA2_PRODUCT_GATE_MONTH_INVALID');
  }

  final statements = evidence
      .map((item) => item.normalized())
      .where(
        (item) =>
            item.tenantId == normalizedTenant &&
            item.channel == Alpha2EvidenceChannel.statementLedger &&
            (item.statementPeriodId?.trim().isNotEmpty ?? false),
      )
      .toList();

  final grouped = <String, List<Alpha2Evidence>>{};
  for (final item in statements) {
    grouped.putIfAbsent(item.statementPeriodId!, () => <Alpha2Evidence>[]).add(item);
  }
  final periods = grouped.keys.toList()..sort();
  final parsedPeriods = <String, _CalendarSpan>{};
  for (final periodId in periods) {
    final parsed = _parseStatementPeriod(periodId);
    if (parsed != null) parsedPeriods[periodId] = parsed;
  }

  final target = _targetCalendar(context, parsedPeriods.values);
  if (target == null) {
    return const Alpha2ProductGateResult(
      ownershipDecisions: <Alpha2OwnershipDecision>[],
      blockingReasons: <String>[],
      monthlyClose: null,
    );
  }

  final decisions = <Alpha2OwnershipDecision>[];
  final coverages = <Alpha2AccountPeriodCoverage>[];
  final blocks = <String>{};

  for (final periodId in periods) {
    final rows = grouped[periodId]!;
    final institutions = rows
        .map((item) => item.institutionCode?.trim().toUpperCase())
        .whereType<String>()
        .where((item) => item.isNotEmpty)
        .toSet();
    final currencies = rows.map((item) => item.currency.toUpperCase()).toSet();
    if (institutions.length != 1 || currencies.length != 1) {
      blocks.add('STATEMENT_OWNERSHIP_OBSERVATION_AMBIGUOUS');
      continue;
    }

    final institution = institutions.single;
    final currency = currencies.single;
    var decision = resolveAlpha2StatementOwnership(
      observation: Alpha2StatementOwnershipObservation(
        tenantId: normalizedTenant,
        statementPeriodId: periodId,
        institutionCode: institution,
        currency: currency,
        kind: Alpha2AccountNodeKind.account,
      ),
      candidateNodes: context.candidateNodes,
      priorEvidence: context.priorOwnershipEvidence,
    );

    final userOwnerId = context.userConfirmedOwnerByStatementPeriod[periodId];
    if (userOwnerId != null) {
      final compatible = context.candidateNodes.where(
        (node) =>
            node.id == userOwnerId &&
            node.active &&
            node.tenantId == normalizedTenant &&
            node.institutionCode == institution &&
            node.currency == currency &&
            node.kind == Alpha2AccountNodeKind.account,
      );
      if (compatible.length != 1) {
        blocks.add('ACCOUNT_MAPPING_CONFIRMATION_INVALID');
      } else {
        decision = confirmAlpha2OwnershipByUser(
          decision: decision,
          nodeId: userOwnerId,
        );
      }
    }
    decisions.add(decision);

    final ownerNodeId = decision.ownedNodeId;
    if (ownerNodeId == null) {
      blocks.add('ACCOUNT_MAPPING_REQUIRED');
      continue;
    }

    final span = parsedPeriods[periodId];
    if (span == null) {
      blocks.add('STATEMENT_PERIOD_INVALID');
      continue;
    }
    if (!_overlapsMonth(span, target.year, target.month)) continue;

    final evidenceIds = rows.map((item) => item.evidenceId).toSet();
    final pending = runtime.pendingResolutions.where((item) {
      if (evidenceIds.contains(item.leftEvidenceId)) return true;
      return item.relatedEvidenceIds.any(evidenceIds.contains);
    }).toList();
    final conflicts = pending
        .where((item) => item.outcome == Alpha2ReconciliationOutcome.conflict)
        .length;
    final reviewRequired = pending.any(
      (item) =>
          item.outcome == Alpha2ReconciliationOutcome.review ||
          item.outcome == Alpha2ReconciliationOutcome.conflict,
    );
    final fullMonth = _coversMonth(span, target.year, target.month);
    final reconciliation = pending.isEmpty
        ? Alpha2AccountReconciliationState.reconciled
        : reviewRequired
            ? Alpha2AccountReconciliationState.reviewRequired
            : Alpha2AccountReconciliationState.partial;
    final coverageId = _coverageId(
      ownerNodeId: ownerNodeId,
      periodId: periodId,
      year: target.year,
      month: target.month,
    );

    coverages.add(
      Alpha2AccountPeriodCoverage(
        id: coverageId,
        tenantId: normalizedTenant,
        ownerNodeId: ownerNodeId,
        periodStart: span.start,
        periodEnd: span.end,
        expectedSourceState: Alpha2ExpectedSourceState.expected,
        scopeState: Alpha2CoverageScopeState.included,
        statementState: Alpha2StatementCoverageState.parsed,
        inflowCoverageState: fullMonth
            ? Alpha2InflowCoverageState.covered
            : Alpha2InflowCoverageState.partial,
        outflowCoverageState: fullMonth
            ? Alpha2OutflowCoverageState.covered
            : Alpha2OutflowCoverageState.partial,
        periodCoverageState: fullMonth
            ? Alpha2PeriodCoverageState.covered
            : Alpha2PeriodCoverageState.partial,
        reconciliationState: reconciliation,
        requiredDirections: const <Alpha2RequiredDirection>{
          Alpha2RequiredDirection.inflow,
          Alpha2RequiredDirection.outflow,
        },
        unresolvedCount: pending.length,
        blockingConflictCount: conflicts,
        statementPeriodId: periodId,
      ),
    );
  }

  final sortedBlocks = blocks.toList()..sort();
  final monthlyClose = evaluateAlpha2MonthlyClose(
    tenantId: normalizedTenant,
    calendarYear: target.year,
    calendarMonth: target.month,
    closeRequested: context.closeRequested,
    coverages: coverages,
    externalBlockingReasons: sortedBlocks,
  );
  decisions.sort((a, b) => a.mappingId.compareTo(b.mappingId));

  return Alpha2ProductGateResult(
    ownershipDecisions: List<Alpha2OwnershipDecision>.unmodifiable(decisions),
    blockingReasons: List<String>.unmodifiable(sortedBlocks),
    monthlyClose: monthlyClose,
  );
}

class _CalendarTarget {
  const _CalendarTarget(this.year, this.month);
  final int year;
  final int month;
}

class _CalendarSpan {
  const _CalendarSpan(this.start, this.end);
  final DateTime start;
  final DateTime end;
}

_CalendarTarget? _targetCalendar(
  Alpha2ProductGateContext context,
  Iterable<_CalendarSpan> spans,
) {
  if (context.calendarYear != null && context.calendarMonth != null) {
    return _CalendarTarget(context.calendarYear!, context.calendarMonth!);
  }
  if (spans.isEmpty) return null;
  final latest = spans.reduce(
    (left, right) => right.end.isAfter(left.end) ? right : left,
  );
  return _CalendarTarget(latest.end.year, latest.end.month);
}

_CalendarSpan? _parseStatementPeriod(String periodId) {
  final match = RegExp(
    r'^period:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$',
  ).firstMatch(periodId.trim());
  if (match == null) return null;
  final start = DateTime.tryParse('${match.group(1)}T00:00:00Z');
  final end = DateTime.tryParse('${match.group(2)}T23:59:59.999Z');
  if (start == null || end == null || end.isBefore(start)) return null;
  return _CalendarSpan(start, end);
}

bool _overlapsMonth(_CalendarSpan span, int year, int month) {
  final start = DateTime.utc(year, month, 1);
  final next = month == 12
      ? DateTime.utc(year + 1, 1, 1)
      : DateTime.utc(year, month + 1, 1);
  return span.start.isBefore(next) && !span.end.isBefore(start);
}

bool _coversMonth(_CalendarSpan span, int year, int month) {
  final start = DateTime.utc(year, month, 1);
  final next = month == 12
      ? DateTime.utc(year + 1, 1, 1)
      : DateTime.utc(year, month + 1, 1);
  final end = next.subtract(const Duration(milliseconds: 1));
  return !span.start.isAfter(start) && !span.end.isBefore(end);
}

String _coverageId({
  required String ownerNodeId,
  required String periodId,
  required int year,
  required int month,
}) {
  final payload = <String>[
    alpha2ProductGateVersion,
    ownerNodeId,
    periodId,
    '$year',
    '$month',
  ].join('|');
  final digest = sha256.convert(utf8.encode(payload)).toString();
  return 'cov_${digest.substring(0, 40)}';
}
