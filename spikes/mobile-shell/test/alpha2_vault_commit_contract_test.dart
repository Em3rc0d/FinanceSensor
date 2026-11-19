import 'dart:io';

import 'package:financesensor_mobile_shell/alpha2/alpha2_models.dart';
import 'package:financesensor_mobile_shell/alpha2/alpha2_vault.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'empty quarantined source can retry once with imported evidence, then replays',
    () async {
      final vault = InMemoryAlpha2Vault();
      await vault.initialize();

      final quarantine = await vault.commitEvidenceBatch(
        sourceReceiptId: 'source-retry',
        evidence: const <Alpha2Evidence>[],
        terminalState: 'QUARANTINED',
      );
      expect(quarantine.replayed, isFalse);
      expect(quarantine.rowCount, 0);
      expect(quarantine.terminalState, 'QUARANTINED');

      final retry = await vault.commitEvidenceBatch(
        sourceReceiptId: 'source-retry',
        evidence: <Alpha2Evidence>[_evidence('evidence-retry')],
        terminalState: 'IMPORTED',
      );
      expect(retry.replayed, isFalse);
      expect(retry.rowCount, 1);
      expect(retry.terminalState, 'IMPORTED');

      final replay = await vault.commitEvidenceBatch(
        sourceReceiptId: 'source-retry',
        evidence: <Alpha2Evidence>[_evidence('evidence-retry')],
        terminalState: 'IMPORTED',
      );
      expect(replay.replayed, isTrue);
      expect(replay.rowCount, 1);
      expect(replay.terminalState, 'IMPORTED');
      expect(await vault.readSafeEvidence(), hasLength(1));
    },
  );

  test(
    'duplicate evidence fails atomically before publishing any row',
    () async {
      final vault = InMemoryAlpha2Vault();
      await vault.initialize();
      final duplicate = _evidence('duplicate-id');

      await expectLater(
        vault.commitEvidenceBatch(
          sourceReceiptId: 'source-duplicate',
          evidence: <Alpha2Evidence>[duplicate, duplicate],
          terminalState: 'IMPORTED',
        ),
        throwsA(isA<StateError>()),
      );
      expect(await vault.readSafeEvidence(), isEmpty);
    },
  );

  test(
    'platform vault accepts and returns the validated native commit result',
    () async {
      const channel = MethodChannel('test.alpha2.vault.commit');
      final messenger =
          TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
      addTearDown(() => messenger.setMockMethodCallHandler(channel, null));
    messenger.setMockMethodCallHandler(channel, (call) async {
        expect(call.method, 'commitEvidenceBatch');
        return <String, Object?>{
          'replayed': false,
          'rowCount': 1,
          'terminalState': 'IMPORTED',
        };
      });

      const vault = Alpha2PlatformVault(channel: channel);
      final result = await vault.commitEvidenceBatch(
        sourceReceiptId: 'source-platform',
        evidence: <Alpha2Evidence>[_evidence('evidence-platform')],
        terminalState: 'IMPORTED',
      );
      expect(result.replayed, isFalse);
      expect(result.rowCount, 1);
      expect(result.terminalState, 'IMPORTED');
    },
  );

  test(
    'platform vault rejects a native response with an inconsistent row count',
    () async {
      const channel = MethodChannel('test.alpha2.vault.invalid-commit');
      final messenger =
          TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
      addTearDown(() => messenger.setMockMethodCallHandler(channel, null));
    messenger.setMockMethodCallHandler(
        channel,
        (_) async => <String, Object?>{
          'replayed': false,
          'rowCount': 0,
          'terminalState': 'IMPORTED',
        },
      );

      const vault = Alpha2PlatformVault(channel: channel);
      await expectLater(
        vault.commitEvidenceBatch(
          sourceReceiptId: 'source-invalid-platform',
          evidence: <Alpha2Evidence>[_evidence('evidence-invalid-platform')],
          terminalState: 'IMPORTED',
        ),
        throwsA(isA<StateError>()),
      );
    },
  );

  test(
    'native schema 1 to 2 migration preserves rows and version atomically',
    () {
      final source = File(
        'native/android/Alpha2VaultBridge.kt',
      ).readAsStringSync();
      expect(source, contains('private const val SCHEMA_VERSION = 2'));
      expect(
        source,
        contains('existing !in setOf("1", SCHEMA_VERSION.toString())'),
      );
      expect(
        source,
        contains('ALTER TABLE derived_evidence ADD COLUMN processed_at TEXT'),
      );
      expect(source, contains('processed_at TEXT'));
      expect(
        source,
        contains('putNullable("processed_at", row["processedAt"])'),
      );

      final begin = source.indexOf('db.beginTransaction()');
      final alter = source.indexOf(
        'ALTER TABLE derived_evidence ADD COLUMN processed_at TEXT',
      );
      final version = source.indexOf(
        "INSERT OR REPLACE INTO vault_meta(key,value) VALUES('schema_version',?)",
      );
      final success = source.indexOf('db.setTransactionSuccessful()', alter);
      final end = source.indexOf('db.endTransaction()', success);
      expect(begin, greaterThanOrEqualTo(0));
      expect(alter, greaterThan(begin));
      expect(version, greaterThan(alter));
      expect(success, greaterThan(version));
      expect(end, greaterThan(success));
    },
  );
}

Alpha2Evidence _evidence(String id) => Alpha2Evidence(
  evidenceId: id,
  tenantId: 'tenant-1',
  amount: 10,
  currency: 'PEN',
  occurredAt: DateTime.utc(2026, 8, 1),
  processedAt: DateTime.utc(2026, 8, 2),
  semanticType: Alpha2SemanticType.expense,
  channel: Alpha2EvidenceChannel.statementLedger,
  truthState: Alpha2TruthState.posted,
  flowDirection: Alpha2FlowDirection.outflow,
);
