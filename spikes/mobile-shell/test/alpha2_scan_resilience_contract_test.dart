import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  late String trustedEdge;

  setUpAll(() {
    trustedEdge = File('native/android/Alpha2MainActivity.kt').readAsStringSync();
  });

  test('physical scan isolates transaction and statement source failures', () {
    for (final marker in <String>[
      'scanTransactionsResilient(token)',
      'scanStatementsResilient(token)',
      'SCAN_PARTIAL_SAFE',
      'GMAIL_TRANSACTIONS_ONLY_STATEMENT_DISCOVERY_DEGRADED',
      'STATEMENT_DISCOVERY_ONLY_TRANSACTION_SCAN_DEGRADED',
      'ALPHA2_SCAN_ALL_SOURCES_FAILED',
    ]) {
      expect(trustedEdge, contains(marker), reason: 'missing $marker');
    }
  });

  test('physical scan retries only through a bounded retry surface', () {
    expect(trustedEdge, contains('SCAN_MAX_ATTEMPTS = 2'));
    expect(trustedEdge, contains('SCAN_RETRY_DELAY_MS = 500L'));
    expect(trustedEdge, contains('isTransientScanCode'));
    for (final status in <String>['408', '429', '500', '502', '503', '504']) {
      expect(trustedEdge, contains(status), reason: 'missing transient HTTP $status');
    }
  });

  test('reauthorization stays fail closed and no raw Gmail data is surfaced', () {
    expect(trustedEdge, contains('reauthRequired = true'));
    expect(trustedEdge, contains('clearCachedToken(token)'));
    expect(trustedEdge, contains('rawGmailReturned" to false'));
    expect(trustedEdge, contains('attachmentBytesFetchedDuringDiscovery" to false'));
    expect(trustedEdge, contains('numericConfidenceReturned" to false'));
    expect(trustedEdge, contains('safeScanDiagnostics'));

    for (final forbidden in <String>[
      'messageId" to',
      'attachmentId" to',
      'accessToken" to',
      'refreshToken" to',
      'rawBody" to',
      'rawMime" to',
    ]) {
      expect(trustedEdge, isNot(contains(forbidden)), reason: 'forbidden boundary $forbidden');
    }
  });
}
