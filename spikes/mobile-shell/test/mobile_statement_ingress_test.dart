import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:financesensor_mobile_shell/statement_ingress/mobile_statement_import_session.dart';
import 'package:financesensor_mobile_shell/statement_ingress/pdfrx_statement_pdf_reader.dart';
import 'package:financesensor_mobile_shell/statement_ingress/statement_models.dart';

class _FakeReader implements MobileStatementPdfReader {
  const _FakeReader(this.text, {this.fail = false});

  final String text;
  final bool fail;

  @override
  Future<MobileStatementPdfText> extractText({
    required Uint8List encryptedPdfBytes,
    required String password,
  }) async {
    if (fail) {
      throw const MobileStatementPdfException('STATEMENT_PDF_OPEN_OR_PASSWORD_REJECTED');
    }
    return MobileStatementPdfText(text: text, pageCount: 1);
  }
}

void main() {
  test('requested savings statement can create explicit income and transfer evidence', () async {
    final bytes = Uint8List.fromList([1, 2, 3, 4]);
    const password = 'local-secret-only';
    final session = MobileStatementImportSession(
      reader: const _FakeReader(
        '01/09/2026 ABONO TRANSFERENCIA RECIBIDA S/ 1,250.00\n'
        '02/09/2026 TRANSFERENCIA ENVIADA S/ 100.00',
      ),
    );

    final result = await session.import(
      ownedEncryptedPdfBytes: bytes,
      password: password,
      profile: StatementProfile.bcpSavingsRequested,
    );

    expect(result.evidence, hasLength(2));
    expect(result.evidence[0].semanticType, StatementSemanticType.income);
    expect(result.evidence[0].direction, StatementDirection.incoming);
    expect(result.evidence[1].semanticType, StatementSemanticType.externalTransfer);
    expect(result.evidence[1].direction, StatementDirection.outgoing);
    expect(bytes.every((value) => value == 0), isTrue);

    final serialized = jsonEncode(result.toSafeSummary());
    expect(serialized, isNot(contains(password)));
    expect(serialized, isNot(contains('ABONO TRANSFERENCIA RECIBIDA')));
    expect(result.toSafeSummary()['passwordPersisted'], isFalse);
    expect(result.toSafeSummary()['rawPdfPersisted'], isFalse);
    expect(result.toSafeSummary()['plaintextPersisted'], isFalse);
  });

  test('credit card payment is never promoted to personal income', () async {
    final bytes = Uint8List.fromList([9, 8, 7]);
    final session = MobileStatementImportSession(
      reader: const _FakeReader('04/09/2026 PAGO DE TARJETA S/ 300.00'),
    );

    final result = await session.import(
      ownedEncryptedPdfBytes: bytes,
      password: 'ephemeral',
      profile: StatementProfile.bcpCredit,
    );

    expect(result.evidence.single.semanticType, StatementSemanticType.cardPayment);
    expect(result.evidence.single.semanticType, isNot(StatementSemanticType.income));
    expect(bytes.every((value) => value == 0), isTrue);
  });

  test('ambiguous statement row remains unknown', () async {
    final bytes = Uint8List.fromList([5, 4, 3]);
    final session = MobileStatementImportSession(
      reader: const _FakeReader('03/09/2026 OPERACION ESPECIAL S/ 88.00'),
    );

    final result = await session.import(
      ownedEncryptedPdfBytes: bytes,
      password: 'ephemeral',
      profile: StatementProfile.bcpSavingsRequested,
    );

    expect(result.evidence.single.semanticType, StatementSemanticType.unknown);
    expect(result.evidence.single.direction, StatementDirection.unknown);
    expect(result.evidence.single.confidence, 0.65);
  });

  test('failed PDF open still zeros owned source bytes and returns only stable code', () async {
    final bytes = Uint8List.fromList([6, 6, 6]);
    final session = MobileStatementImportSession(
      reader: const _FakeReader('', fail: true),
    );

    await expectLater(
      session.import(
        ownedEncryptedPdfBytes: bytes,
        password: 'do-not-leak-me',
        profile: StatementProfile.ripleyCredit,
      ),
      throwsA(
        isA<MobileStatementPdfException>().having(
          (error) => error.code,
          'code',
          'STATEMENT_PDF_OPEN_OR_PASSWORD_REJECTED',
        ),
      ),
    );

    expect(bytes.every((value) => value == 0), isTrue);
  });
}
