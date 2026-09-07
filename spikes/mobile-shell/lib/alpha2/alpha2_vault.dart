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

abstract interface class Alpha2Vault {
  Future<Alpha2VaultCapabilities> initialize();
  Future<void> commitEvidenceBatch({
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
  Future<void> commitEvidenceBatch({
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
    await _channel.invokeMethod<void>(
      'commitEvidenceBatch',
      <String, Object?>{
        'sourceReceiptId': sourceReceiptId,
        'terminalState': terminalState.toUpperCase(),
        'evidence': evidence.map((item) => item.normalized().toSafeDiagnosticMap()).toList(),
      },
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
  final Set<String> _terminalSources = <String>{};

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
  Future<void> commitEvidenceBatch({
    required String sourceReceiptId,
    required List<Alpha2Evidence> evidence,
    required String terminalState,
  }) async {
    if (!_initialized || _shredded) throw StateError('ALPHA2_VAULT_NOT_OPEN');
    if (_terminalSources.contains(sourceReceiptId)) return;
    final staged = evidence
        .map((item) => Map<String, Object?>.from(item.normalized().toSafeDiagnosticMap()))
        .toList();
    // Atomic test-double behavior: publish the batch only after all rows validate.
    _rows.addAll(staged);
    _terminalSources.add(sourceReceiptId);
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
