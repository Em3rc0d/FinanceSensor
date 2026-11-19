import 'package:financesensor_mobile_shell/alpha2/alpha2_monthly_coverage.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_sensor_v1.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ACCOUNT_MAPPING_REQUIRED becomes a deterministic Sensor knowledge gap', () {
    final close = evaluateAlpha2MonthlyClose(
      tenantId: 'tenant-1',
      calendarYear: 2026,
      calendarMonth: 8,
      coverages: const <Alpha2AccountPeriodCoverage>[],
      closeRequested: true,
      externalBlockingReasons: const <String>['ACCOUNT_MAPPING_REQUIRED'],
    );

    final first = deriveAlpha2KnowledgeGaps(
      events: const [],
      monthlyClose: close,
    );
    final second = deriveAlpha2KnowledgeGaps(
      events: const [],
      monthlyClose: close,
    );

    expect(close.status, Alpha2MonthlyCloseStatus.reviewRequired);
    expect(close.reason, 'ACCOUNT_MAPPING_REQUIRED');
    expect(first, hasLength(1));
    expect(first.single.kind, 'ACCOUNT_MAPPING');
    expect(first.single.reason, 'ACCOUNT_MAPPING_REQUIRED');
    expect(first.single.evidenceInputs, isEmpty);
    expect(first.single.id, second.single.id);
  });
}
