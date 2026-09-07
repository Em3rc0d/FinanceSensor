const String alpha2MonthlyCoverageVersion = 'A2_MONTHLY_COVERAGE_V1';

enum Alpha2MonthlyCloseStatus {
  openLive,
  waitingForStatements,
  importing,
  reconciling,
  reviewRequired,
  reconciled,
  reopened,
}

enum Alpha2ExpectedSourceState { expected, notAvailable, userExcluded, unknown }

enum Alpha2CoverageScopeState { included, userExcluded, notAvailable }

enum Alpha2StatementCoverageState {
  none,
  received,
  parsedPartial,
  parsed,
  reviewRequired,
}

enum Alpha2InflowCoverageState { unknown, partial, covered }

enum Alpha2OutflowCoverageState { unknown, observed, partial, covered }

enum Alpha2PeriodCoverageState { unknown, partial, covered }

enum Alpha2AccountReconciliationState {
  notStarted,
  partial,
  reviewRequired,
  reconciled,
}

enum Alpha2CloseActivity { idle, importing, reconciling }

enum Alpha2ReopenSignal {
  lateEvidence,
  parserReprocessing,
  accountMappingCorrection,
  sourceScopeChanged,
}

enum Alpha2RequiredDirection { inflow, outflow }

class Alpha2AccountPeriodCoverage {
  const Alpha2AccountPeriodCoverage({
    required this.id,
    required this.tenantId,
    required this.ownerNodeId,
    required this.periodStart,
    required this.periodEnd,
    required this.expectedSourceState,
    required this.scopeState,
    required this.statementState,
    required this.inflowCoverageState,
    required this.outflowCoverageState,
    required this.periodCoverageState,
    required this.reconciliationState,
    required this.requiredDirections,
    this.unresolvedCount = 0,
    this.blockingConflictCount = 0,
    this.statementPeriodId,
  });

  final String id;
  final String tenantId;
  final String ownerNodeId;
  final DateTime periodStart;
  final DateTime periodEnd;
  final Alpha2ExpectedSourceState expectedSourceState;
  final Alpha2CoverageScopeState scopeState;
  final Alpha2StatementCoverageState statementState;
  final Alpha2InflowCoverageState inflowCoverageState;
  final Alpha2OutflowCoverageState outflowCoverageState;
  final Alpha2PeriodCoverageState periodCoverageState;
  final Alpha2AccountReconciliationState reconciliationState;
  final Set<Alpha2RequiredDirection> requiredDirections;
  final int unresolvedCount;
  final int blockingConflictCount;
  final String? statementPeriodId;
}

class Alpha2CoverageProjection {
  const Alpha2CoverageProjection({
    required this.id,
    required this.ownerNodeId,
    required this.scopeState,
    required this.expectedSourceState,
    required this.statementState,
    required this.inflowCoverageState,
    required this.outflowCoverageState,
    required this.periodCoverageState,
    required this.reconciliationState,
    required this.requiredDirections,
    required this.unresolvedCount,
    required this.blockingConflictCount,
    required this.readyForClose,
    required this.blockingReasons,
  });

  final String id;
  final String ownerNodeId;
  final Alpha2CoverageScopeState scopeState;
  final Alpha2ExpectedSourceState expectedSourceState;
  final Alpha2StatementCoverageState statementState;
  final Alpha2InflowCoverageState inflowCoverageState;
  final Alpha2OutflowCoverageState outflowCoverageState;
  final Alpha2PeriodCoverageState periodCoverageState;
  final Alpha2AccountReconciliationState reconciliationState;
  final Set<Alpha2RequiredDirection> requiredDirections;
  final int unresolvedCount;
  final int blockingConflictCount;
  final bool readyForClose;
  final List<String> blockingReasons;
}

class Alpha2MonthlyCloseEvaluation {
  const Alpha2MonthlyCloseEvaluation({
    required this.evaluationKey,
    required this.closeId,
    required this.tenantId,
    required this.calendarYear,
    required this.calendarMonth,
    required this.previousStatus,
    required this.status,
    required this.reason,
    required this.closeRequested,
    required this.activity,
    required this.reopenSignal,
    required this.sources,
    required this.includedCount,
    required this.reconciledIncludedCount,
    required this.userExcludedCount,
    required this.notAvailableCount,
    required this.missingStatementCount,
    required this.unresolvedCount,
    required this.blockingConflictCount,
  });

  final String evaluationKey;
  final String closeId;
  final String tenantId;
  final int calendarYear;
  final int calendarMonth;
  final Alpha2MonthlyCloseStatus previousStatus;
  final Alpha2MonthlyCloseStatus status;
  final String reason;
  final bool closeRequested;
  final Alpha2CloseActivity activity;
  final Alpha2ReopenSignal? reopenSignal;
  final List<Alpha2CoverageProjection> sources;
  final int includedCount;
  final int reconciledIncludedCount;
  final int userExcludedCount;
  final int notAvailableCount;
  final int missingStatementCount;
  final int unresolvedCount;
  final int blockingConflictCount;

  bool get allIncludedExpectedSourcesCovered =>
      includedCount > 0 && reconciledIncludedCount == includedCount;
  bool get zeroBlockingConflicts => blockingConflictCount == 0;
}

Alpha2CoverageProjection projectAlpha2Coverage(
  Alpha2AccountPeriodCoverage coverage,
) {
  _validateCoverage(coverage);
  final reasons = <String>[];

  final scopeCoherent = switch (coverage.scopeState) {
    Alpha2CoverageScopeState.userExcluded =>
      coverage.expectedSourceState == Alpha2ExpectedSourceState.userExcluded,
    Alpha2CoverageScopeState.notAvailable =>
      coverage.expectedSourceState == Alpha2ExpectedSourceState.notAvailable,
    Alpha2CoverageScopeState.included => true,
  };
  if (!scopeCoherent) reasons.add('SCOPE_DISPOSITION_CONFLICT');

  if (coverage.scopeState == Alpha2CoverageScopeState.included) {
    if (coverage.expectedSourceState == Alpha2ExpectedSourceState.unknown) {
      reasons.add('EXPECTED_SOURCE_DISPOSITION_UNKNOWN');
    }
    if (coverage.expectedSourceState != Alpha2ExpectedSourceState.expected) {
      reasons.add('INCLUDED_SOURCE_NOT_EXPECTED');
    }
    if (coverage.statementState == Alpha2StatementCoverageState.none) {
      reasons.add('MISSING_EXPECTED_STATEMENT');
    }
    if (coverage.statementState == Alpha2StatementCoverageState.reviewRequired) {
      reasons.add('STATEMENT_REVIEW_REQUIRED');
    }
    if (coverage.statementState == Alpha2StatementCoverageState.received ||
        coverage.statementState == Alpha2StatementCoverageState.parsedPartial) {
      reasons.add('STATEMENT_NOT_FULLY_PARSED');
    }
    if (coverage.periodCoverageState != Alpha2PeriodCoverageState.covered) {
      reasons.add('STATEMENT_PERIOD_NOT_COVERED');
    }
    for (final direction in coverage.requiredDirections) {
      if (!_directionCovered(coverage, direction)) {
        reasons.add(
          direction == Alpha2RequiredDirection.inflow
              ? 'INFLOW_NOT_COVERED'
              : 'OUTFLOW_NOT_COVERED',
        );
      }
    }
    if (coverage.reconciliationState ==
        Alpha2AccountReconciliationState.reviewRequired) {
      reasons.add('RECONCILIATION_REVIEW_REQUIRED');
    }
    if (coverage.reconciliationState !=
        Alpha2AccountReconciliationState.reconciled) {
      reasons.add('RECONCILIATION_NOT_COMPLETE');
    }
    if (coverage.unresolvedCount > 0) reasons.add('UNRESOLVED_ITEMS');
    if (coverage.blockingConflictCount > 0) reasons.add('BLOCKING_CONFLICT');
  }

  final uniqueReasons = reasons.toSet().toList()..sort();
  return Alpha2CoverageProjection(
    id: coverage.id,
    ownerNodeId: coverage.ownerNodeId,
    scopeState: coverage.scopeState,
    expectedSourceState: coverage.expectedSourceState,
    statementState: coverage.statementState,
    inflowCoverageState: coverage.inflowCoverageState,
    outflowCoverageState: coverage.outflowCoverageState,
    periodCoverageState: coverage.periodCoverageState,
    reconciliationState: coverage.reconciliationState,
    requiredDirections: Set<Alpha2RequiredDirection>.unmodifiable(
      coverage.requiredDirections,
    ),
    unresolvedCount: coverage.unresolvedCount,
    blockingConflictCount: coverage.blockingConflictCount,
    readyForClose: coverage.scopeState == Alpha2CoverageScopeState.included &&
        uniqueReasons.isEmpty,
    blockingReasons: List<String>.unmodifiable(uniqueReasons),
  );
}

Alpha2MonthlyCloseEvaluation evaluateAlpha2MonthlyClose({
  required String tenantId,
  required int calendarYear,
  required int calendarMonth,
  required List<Alpha2AccountPeriodCoverage> coverages,
  Alpha2MonthlyCloseStatus previousStatus = Alpha2MonthlyCloseStatus.openLive,
  bool closeRequested = false,
  Alpha2CloseActivity activity = Alpha2CloseActivity.idle,
  Alpha2ReopenSignal? reopenSignal,
  String closeScopeVersion = 'A2_CLOSE_SCOPE_V1',
}) {
  if (tenantId.trim().isEmpty) {
    throw ArgumentError('MONTHLY_CLOSE_TENANT_REQUIRED');
  }
  if (calendarYear < 2000 || calendarYear > 2200) {
    throw ArgumentError('MONTHLY_CLOSE_YEAR_INVALID');
  }
  if (calendarMonth < 1 || calendarMonth > 12) {
    throw ArgumentError('MONTHLY_CLOSE_MONTH_INVALID');
  }
  if (coverages.any((item) => item.tenantId != tenantId)) {
    throw ArgumentError('MONTHLY_CLOSE_COVERAGE_TENANT_MISMATCH');
  }
  final ids = <String>{};
  for (final coverage in coverages) {
    if (!ids.add(coverage.id)) {
      throw ArgumentError('MONTHLY_CLOSE_DUPLICATE_COVERAGE_ID');
    }
  }

  final projections = coverages.map(projectAlpha2Coverage).toList()
    ..sort((a, b) => a.id.compareTo(b.id));
  final included = projections
      .where((item) => item.scopeState == Alpha2CoverageScopeState.included)
      .toList();
  final excluded = projections
      .where((item) => item.scopeState == Alpha2CoverageScopeState.userExcluded)
      .toList();
  final unavailable = projections
      .where((item) => item.scopeState == Alpha2CoverageScopeState.notAvailable)
      .toList();
  final blockingReasons = included
      .expand((item) => item.blockingReasons)
      .toSet()
      .toList()
    ..sort();
  final missingStatements = included
      .where(
        (item) => item.blockingReasons.contains('MISSING_EXPECTED_STATEMENT'),
      )
      .length;
  final blockingConflictCount = included.fold<int>(
    0,
    (sum, item) => sum + item.blockingConflictCount,
  );
  final unresolvedCount = included.fold<int>(
    0,
    (sum, item) => sum + item.unresolvedCount,
  );
  final allIncludedReady =
      included.isNotEmpty && included.every((item) => item.readyForClose);

  var status = Alpha2MonthlyCloseStatus.openLive;
  var reason = 'MONTH_LIVE';
  if (previousStatus == Alpha2MonthlyCloseStatus.reconciled &&
      reopenSignal != null) {
    status = Alpha2MonthlyCloseStatus.reopened;
    reason = _reopenWire(reopenSignal);
  } else if (!closeRequested &&
      previousStatus == Alpha2MonthlyCloseStatus.openLive) {
    status = Alpha2MonthlyCloseStatus.openLive;
    reason = 'CLOSE_NOT_REQUESTED';
  } else if (activity == Alpha2CloseActivity.importing) {
    status = Alpha2MonthlyCloseStatus.importing;
    reason = 'IMPORT_IN_PROGRESS';
  } else if (activity == Alpha2CloseActivity.reconciling) {
    status = Alpha2MonthlyCloseStatus.reconciling;
    reason = 'RECONCILIATION_IN_PROGRESS';
  } else if (included.isEmpty) {
    status = Alpha2MonthlyCloseStatus.reviewRequired;
    reason = 'NO_INCLUDED_SOURCES';
  } else if (blockingConflictCount > 0 ||
      unresolvedCount > 0 ||
      blockingReasons.any(
        (item) => item.contains('REVIEW_REQUIRED') ||
            item == 'SCOPE_DISPOSITION_CONFLICT' ||
            item == 'EXPECTED_SOURCE_DISPOSITION_UNKNOWN',
      )) {
    status = Alpha2MonthlyCloseStatus.reviewRequired;
    reason = blockingConflictCount > 0
        ? 'BLOCKING_CONFLICT'
        : unresolvedCount > 0
            ? 'UNRESOLVED_ITEMS'
            : 'SCOPE_OR_REVIEW_REQUIRED';
  } else if (missingStatements > 0) {
    status = Alpha2MonthlyCloseStatus.waitingForStatements;
    reason = 'MISSING_EXPECTED_STATEMENT';
  } else if (allIncludedReady) {
    status = Alpha2MonthlyCloseStatus.reconciled;
    reason = 'ALL_INCLUDED_SOURCES_RECONCILED';
  } else {
    status = Alpha2MonthlyCloseStatus.reconciling;
    reason = 'COVERAGE_INCOMPLETE';
  }

  final closeId =
      'close:$tenantId:$calendarYear:${calendarMonth.toString().padLeft(2, '0')}:$closeScopeVersion';
  final evaluationKey = <String>[
    alpha2MonthlyCoverageVersion,
    closeId,
    previousStatus.name,
    status.name,
    reason,
    '$closeRequested',
    activity.name,
    reopenSignal?.name ?? '',
    ...projections.map(
      (item) =>
          '${item.id}:${item.readyForClose}:${item.blockingReasons.join(",")}',
    ),
  ].join('|');

  return Alpha2MonthlyCloseEvaluation(
    evaluationKey: evaluationKey,
    closeId: closeId,
    tenantId: tenantId,
    calendarYear: calendarYear,
    calendarMonth: calendarMonth,
    previousStatus: previousStatus,
    status: status,
    reason: reason,
    closeRequested: closeRequested,
    activity: activity,
    reopenSignal: reopenSignal,
    sources: List<Alpha2CoverageProjection>.unmodifiable(projections),
    includedCount: included.length,
    reconciledIncludedCount: included.where((item) => item.readyForClose).length,
    userExcludedCount: excluded.length,
    notAvailableCount: unavailable.length,
    missingStatementCount: missingStatements,
    unresolvedCount: unresolvedCount,
    blockingConflictCount: blockingConflictCount,
  );
}

bool _directionCovered(
  Alpha2AccountPeriodCoverage coverage,
  Alpha2RequiredDirection direction,
) {
  return switch (direction) {
    Alpha2RequiredDirection.inflow =>
      coverage.inflowCoverageState == Alpha2InflowCoverageState.covered,
    Alpha2RequiredDirection.outflow =>
      coverage.outflowCoverageState == Alpha2OutflowCoverageState.covered,
  };
}

void _validateCoverage(Alpha2AccountPeriodCoverage coverage) {
  if (coverage.id.trim().isEmpty ||
      coverage.tenantId.trim().isEmpty ||
      coverage.ownerNodeId.trim().isEmpty) {
    throw ArgumentError('MONTHLY_COVERAGE_ACCOUNT_PERIOD_REQUIRED');
  }
  if (coverage.periodEnd.isBefore(coverage.periodStart)) {
    throw ArgumentError('MONTHLY_COVERAGE_PERIOD_INVALID');
  }
  if (coverage.unresolvedCount < 0 || coverage.blockingConflictCount < 0) {
    throw ArgumentError('MONTHLY_COVERAGE_COUNT_INVALID');
  }
  if (coverage.requiredDirections.isEmpty) {
    throw ArgumentError('MONTHLY_COVERAGE_REQUIRED_DIRECTIONS_REQUIRED');
  }
}

String _reopenWire(Alpha2ReopenSignal signal) => switch (signal) {
      Alpha2ReopenSignal.lateEvidence => 'LATE_EVIDENCE',
      Alpha2ReopenSignal.parserReprocessing => 'PARSER_REPROCESSING',
      Alpha2ReopenSignal.accountMappingCorrection => 'ACCOUNT_MAPPING_CORRECTION',
      Alpha2ReopenSignal.sourceScopeChanged => 'SOURCE_SCOPE_CHANGED',
    };

String alpha2MonthlyCloseStatusWire(Alpha2MonthlyCloseStatus status) => switch (status) {
      Alpha2MonthlyCloseStatus.openLive => 'OPEN_LIVE',
      Alpha2MonthlyCloseStatus.waitingForStatements => 'WAITING_FOR_STATEMENTS',
      Alpha2MonthlyCloseStatus.importing => 'IMPORTING',
      Alpha2MonthlyCloseStatus.reconciling => 'RECONCILING',
      Alpha2MonthlyCloseStatus.reviewRequired => 'REVIEW_REQUIRED',
      Alpha2MonthlyCloseStatus.reconciled => 'RECONCILED',
      Alpha2MonthlyCloseStatus.reopened => 'REOPENED',
    };
