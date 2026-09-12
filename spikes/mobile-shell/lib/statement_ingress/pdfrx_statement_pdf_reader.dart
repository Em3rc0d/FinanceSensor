import 'dart:typed_data';

import 'package:pdfrx/pdfrx.dart';

class MobileStatementPdfException implements Exception {
  const MobileStatementPdfException(this.code);

  final String code;

  @override
  String toString() => code;
}

class MobileStatementPdfText {
  const MobileStatementPdfText({
    required this.text,
    required this.pageCount,
  });

  final String text;
  final int pageCount;
}

abstract interface class MobileStatementPdfReader {
  Future<MobileStatementPdfText> extractText({
    required Uint8List encryptedPdfBytes,
    required String password,
  });
}

class PdfrxStatementPdfReader implements MobileStatementPdfReader {
  const PdfrxStatementPdfReader();

  @override
  Future<MobileStatementPdfText> extractText({
    required Uint8List encryptedPdfBytes,
    required String password,
  }) async {
    if (encryptedPdfBytes.isEmpty) {
      throw const MobileStatementPdfException('STATEMENT_PDF_EMPTY');
    }
    if (password.isEmpty) {
      throw const MobileStatementPdfException('STATEMENT_PASSWORD_REQUIRED');
    }

    // FinanceSensor owns this mutable working copy and can zero it after PDFium
    // releases the document. The caller remains responsible for its source buffer.
    final workingBytes = Uint8List.fromList(encryptedPdfBytes);
    PdfDocument? document;

    try {
      await pdfrxFlutterInitialize();
      document = await PdfDocument.openData(
        workingBytes,
        sourceName: 'financesensor-local-statement',
        passwordProvider: createSimplePasswordProvider(password),
        firstAttemptByEmptyPassword: false,
        useProgressiveLoading: false,
        allowDataOwnershipTransfer: false,
      );

      final text = StringBuffer();
      for (final page in document.pages) {
        final pageText = await page.loadText();
        final value = pageText?.fullText.trim();
        if (value == null || value.isEmpty) continue;
        if (text.isNotEmpty) text.writeln();
        text.write(value);
      }

      return MobileStatementPdfText(
        text: text.toString(),
        pageCount: document.pages.length,
      );
    } catch (_) {
      // Provider/runtime details can contain implementation-specific text and are
      // intentionally collapsed into a stable local-only code.
      throw const MobileStatementPdfException(
        'STATEMENT_PDF_OPEN_OR_PASSWORD_REJECTED',
      );
    } finally {
      try {
        await document?.dispose();
      } finally {
        workingBytes.fillRange(0, workingBytes.length, 0);
      }
    }
  }
}
