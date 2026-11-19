import 'package:flutter/services.dart';

import 'alpha2_models.dart';

const String alpha2VaultChannelName = 'com.financesensor.platform/alpha2_vault';

class Alpha2VaultCapabilities {
  const Alpha2VaultCapabilities({
    required this.sqlcipherVersion,
    required this.encryptedOpenOnly,
    required this.platformWrappedDek,
    required this.plaintextFallback,
    required this.hardwareBackedKey,
  });

  final String sqlcipherVersion;
  final bool encryptedOpenOnly;
  final bool platformWrappedDek;
  final bool plaintextFallback;
  final bool? hardwareBackedKey;
}

class Alpha2VaultCommitResult {
  const Alpha2VaultCommitResult({
    required this.replayed,
    required this.rowCount,
    required this.terminalState,
  });

  final bool replayed;
  final int rowCount;
  final String terminalState;
}

abstract interface class Alpha2Vault {
  Future<Alpha2VaultCapabilities> initialize();
  Future<Alpha2VaultCommitResult> commitEvidenceBatch({
    required String sourceReceiptId,
    required List<Alpha2Evidence> evidence,
    required String terminalState,
  });
  Future<List<Map<String, Object?>>> readSafeEvidence();
  Future<void> cryptoShred();
}

class Alpha2PlatformVault implements Alpha2Vault {
  const Alpha2PlatformVault({
    MethodChannel channel = const MethodChannel(alpha2VaultChannelName),
  }) : _channel = channel;

  final MethodChannel _channel;

  @override
  Future<Alpha2VaultCapabilities> initialize() async {
    final raw = await _channel.invokeMapMethod<Object?, Object?>('initialize') ??
        const <Object?, Object?>{};
    final version = raw['sqlcipherVersion'] as String? ?? '';
    final encryptedOnly = raw['encryptedOpenOnly'] == true;
    final wrapped = raw['platformWrappedDek'] == true;
    final plaintextFallback = raw['plaintextFallback'] == true;
    if (version != '4.18.0' || !encryptedOnly || !wrapped || plaintextFallback) {
      throw StateError('ALPHA2_VAULT_CAPABILITY_MISMATCH');
    }
    return Alpha2VaultCapabilities(
      sqlcipherVersion: version,
      encryptedOpenOnly: encryptedOnly,
      platformWrappedDek: wrapped,
      plaintextFallback: plaintextFallback,
      hardwareBackedKey: raw['hardwareBackedKey'] as bool?,
    );
  }

  @override
  Future<Alpha2VaultCommitResult> commitEvidenceBatch({
    required String sourceReceiptId,
    required List<Alpha2Evidence> evidence,
    required String terminalState,
  }) async {
    if (sourceReceiptId.trim().isEmpty) {
      throw ArgumentError('ALPHA2_VAULT_SOURCE_RECEIPT_REQUIRED');
    }
    if (!const <String>{'IMPORTED', 'QUARANTINED', 'FAILED', 'DISCARDED'}
        .contains(terminalState.toUpperCase())) {
      throw ArgumentError('ALPHA2_VAULT_TERMINAL_STATE_INVALID');
    }
    final raw = await _channel.invokeMapMethod<Object?, Object?>(
      'commitEvidenceBatch',
      <String, Object?>{
        'sourceReceiptId': sourceReceiptId,
        'terminalState': terminalState.toUpperCase(),
        'evidence': evidence.map((item) => item.normalized().toSafeDiagnosticMap()).toList(),
      },
    ) ?? const <Object?, Object?>{};
    final replayed = raw['replayed'];
    final rowCount = raw['rowCount'];
    final returnedState = (raw['terminalState'] as String? ?? '').toUpperCase();
    if (replayed is! bool || rowCount is! int || rowCount < 0 ||
        !const <String>{'IMPORTED', 'QUARANTINED', 'FAILED', 'DISCARDED'}
            .contains(returnedState) ||
        (!replayed && rowCount != evidence.length) ||
        (!replayed && returnedState != terminalState.toUpperCase())) {
      throw StateError('ALPHA2_VAULT_COMMIT_RESPONSE_INVALID');
    }
    return Alpha2VaultCommitResult(
      replayed: replayed,
      rowCount: rowCount,
      terminalState: returnedState,
    );
  }

  @override
  Future<List<Map<String, Object?>>> readSafeEvidence() async {
    final raw = await _channel.invokeListMethod<Object?>('readSafeEvidence') ??
        const <Object?>[];
    return raw
        .whereType<Map<Object?, Object?>>()
        .map(
          (item) => item.map(
            (key, value) => MapEntry<String, Object?>(key.toString(), value),
          ),
        )
        .toList(growable: false);
  }

  @override
  Future<void> cryptoShred() => _channel.invokeMethod<void>('cryptoShred');
}

class InMemoryAlpha2Vault implements Alpha2Vault {
  bool _initialized = false;
  bool _shredded = false;
  final List<Map<String, Object?>> _rows = <Map<String, Object?>>[];
  final Map<String, ({String state, int rowCount})> _terminalSources =
      <String, ({String state, int rowCount})>{};

  @override
  Future<Alpha2VaultCapabilities> initialize() async {
    _initialized = true;
    _shredded = false;
    return const Alpha2VaultCapabilities(
      sqlcipherVersion: '4.18.0',
      encryptedOpenOnly: true,
      platformWrappedDek: true,
      plaintextFallback: false,
      hardwareBackedKey: null,
    );
  }

  @override
  Future<Alpha2VaultCommitResult> commitEvidenceBatch({
    required String sourceReceiptId,
    required List<Alpha2Evidence> evidence,
    required String terminalState,
  }) async {
    if (!_initialized || _shredded) throw StateError('ALPHA2_VAULT_NOT_OPEN');
    final normalizedState = terminalState.trim().toUpperCase();
    if (!const <String>{'IMPORTED', 'QUARANTINED', 'FAILED', 'DISCARDED'}
        .contains(normalizedState)) {
      throw ArgumentError('ALPHA2_VAULT_TERMINAL_STATE_INVALID');
    }
    if (evidence.isNotEmpty && normalizedState != 'IMPORTED') {
      throw ArgumentError('ALPHA2_VAULT_EVIDENCE_REQUIRES_IMPORTED');
    }
    final existing = _terminalSources[sourceReceiptId];
    if (existing != null) {
      final retryable = existing.rowCount == 0 &&
          (existing.state == 'QUARANTINED' || existing.state == 'FAILED') &&
          normalizedState == 'IMPORTED' && evidence.isNotEmpty;
      if (!retryable) {
        return Alpha2VaultCommitResult(
          replayed: true,
          rowCount: existing.rowCount,
          terminalState: existing.state,
        );
      }
    }
    final staged = evidence
        .map((item) => Map<String, Object?>.from(item.normalized().toSafeDiagnosticMap()))
        .toList();
    final ids = staged.map((row) => row['evidenceId']).toSet();
    if (ids.length != staged.length ||
        _rows.any((row) => ids.contains(row['evidenceId']))) {
      throw StateError('ALPHA2_VAULT_DUPLICATE_EVIDENCE');
    }
    // Atomic test-double behavior: publish the batch only after all rows validate.
    _rows.addAll(staged);
    _terminalSources[sourceReceiptId] =
        (state: normalizedState, rowCount: staged.length);
    return Alpha2VaultCommitResult(
      replayed: false,
      rowCount: staged.length,
      terminalState: normalizedState,
    );
  }

  @override
  Future<List<Map<String, Object?>>> readSafeEvidence() async {
    if (!_initialized || _shredded) throw StateError('ALPHA2_VAULT_NOT_OPEN');
    return _rows.map((item) => Map<String, Object?>.from(item)).toList();
  }

  @override
  Future<void> cryptoShred() async {
    _rows.clear();
    _terminalSources.clear();
    _shredded = true;
  }
}

const Set<String> alpha2VaultForbiddenDurableFields = <String>{
  'rawPdf',
  'decryptedText',
  'ocrPages',
  'layoutGeometry',
  'rawRows',
  'password',
  'gmailBody',
  'rawGmailMessageId',
  'rawAttachmentId',
  'rawDek',
};
