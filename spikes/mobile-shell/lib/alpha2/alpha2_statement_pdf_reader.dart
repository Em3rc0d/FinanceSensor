import 'dart:math' as math;
import 'dart:typed_data';

import 'package:pdfrx/pdfrx.dart';

import 'alpha2_statement_geometry.dart';

/// Narrow reader contract used by the Alpha.2 statement-import pipeline.
///
/// The production implementation owns a private mutable copy of the PDF bytes,
/// never exposes extracted geometry outside the in-memory import path, and
/// treats document disposal as secondary cleanup. A disposal failure must not
/// erase an already-computed safe import result.
abstract interface class Alpha2StatementLayoutReader {
  Future<Alpha2StatementLayout> extractLayout({
    required Uint8List encryptedPdfBytes,
    required String password,
  });
}

class Alpha2SafeStructuredPdfReader implements Alpha2StatementLayoutReader {
  const Alpha2SafeStructuredPdfReader();

  @override
  Future<Alpha2StatementLayout> extractLayout({
    required Uint8List encryptedPdfBytes,
    required String password,
  }) async {
    if (encryptedPdfBytes.isEmpty) {
      throw const Alpha2StatementPdfException('STATEMENT_PDF_EMPTY');
    }
    if (password.isEmpty) {
      throw const Alpha2StatementPdfException('STATEMENT_PASSWORD_REQUIRED');
    }

    final workingBytes = Uint8List.fromList(encryptedPdfBytes);
    PdfDocument? document;
    try {
      await pdfrxFlutterInitialize();
      document = await PdfDocument.openData(
        workingBytes,
        sourceName: 'financesensor-alpha2-statement',
        passwordProvider: createSimplePasswordProvider(password),
        firstAttemptByEmptyPassword: false,
        useProgressiveLoading: false,
        allowDataOwnershipTransfer: false,
      );

      final pages = <Alpha2LayoutPage>[];
      for (final page in document.pages) {
        final structured = await page.loadStructuredText();
        final items = <Alpha2LayoutItem>[];
        var sequence = 0;
        for (final fragment in structured.fragments) {
          final text = fragment.text.trim();
          if (text.isEmpty) continue;
          final bounds = fragment.bounds;
          items.add(
            Alpha2LayoutItem(
              text: text,
              x: bounds.left,
              y: bounds.top,
              width: math.max(0, bounds.right - bounds.left),
              sequence: sequence++,
            ),
          );
        }
        pages.add(
          Alpha2LayoutPage(
            pageNumber: page.pageNumber,
            items: List<Alpha2LayoutItem>.unmodifiable(items),
          ),
        );
      }

      return Alpha2StatementLayout(
        pages: List<Alpha2LayoutPage>.unmodifiable(pages),
        pageCount: document.pages.length,
      );
    } catch (error) {
      if (error is Alpha2StatementPdfException) rethrow;
      throw const Alpha2StatementPdfException(
        'STATEMENT_PDF_OPEN_OR_PASSWORD_REJECTED',
      );
    } finally {
      // Disposal is best-effort cleanup. pdfrx/native cleanup must never
      // override an already-successful parse or a sanitized PDF outcome.
      try {
        await document?.dispose();
      } catch (_) {
        // Deliberately suppressed: no raw/native error crosses the boundary.
      } finally {
        workingBytes.fillRange(0, workingBytes.length, 0);
      }
    }
  }
}
