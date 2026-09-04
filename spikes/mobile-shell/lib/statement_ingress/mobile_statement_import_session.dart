import 'dart:typed_data';

import 'conservative_statement_parser.dart';
import 'pdfrx_statement_pdf_reader.dart';
import 'statement_models.dart';

class MobileStatementImportResult {
  const MobileStatementImportResult({
    required this.pageCount,
    required this.evidence,
  });

  final int pageCount;
  final List<StatementDerivedEvidence> evidence;

  Map<String, Object?> toSafeSummary() => {
        'pageCount': pageCount,
        'evidenceCount': evidence.length,
        'passwordPersisted': false,
        'rawPdfPersisted': false,
        'plaintextPersisted': false,
      };
}

class MobileStatementImportSession {
  const MobileStatementImportSession({
    required MobileStatementPdfReader reader,
    ConservativeStatementParser parser = const ConservativeStatementParser(),
  })  : _reader = reader,
        _parser = parser;

  final MobileStatementPdfReader _reader;
  final ConservativeStatementParser _parser;

  Future<MobileStatementImportResult> import({
    required Uint8List ownedEncryptedPdfBytes,
    required String password,
    required StatementProfile profile,
  }) async {
    if (ownedEncryptedPdfBytes.isEmpty) {
      throw const MobileStatementPdfException('STATEMENT_PDF_EMPTY');
    }
    if (password.isEmpty) {
      throw const MobileStatementPdfException('STATEMENT_PASSWORD_REQUIRED');
    }

    try {
      final extracted = await _reader.extractText(
        encryptedPdfBytes: ownedEncryptedPdfBytes,
        password: password,
      );
      final evidence = _parser.parse(
        text: extracted.text,
        profile: profile,
      );
      return MobileStatementImportResult(
        pageCount: extracted.pageCount,
        evidence: evidence,
      );
    } finally {
      // This session owns the mutable Gmail/local-file byte buffer handed to it.
      // Password is a Dart String and cannot honestly be claimed zeroized.
      ownedEncryptedPdfBytes.fillRange(0, ownedEncryptedPdfBytes.length, 0);
    }
  }
}
