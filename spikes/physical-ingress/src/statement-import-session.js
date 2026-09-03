import crypto from 'node:crypto';

function ensureBuffer(bytes) {
  if (Buffer.isBuffer(bytes)) return bytes;
  if (bytes instanceof Uint8Array) return Buffer.from(bytes);
  throw new TypeError('STATEMENT_BYTES_REQUIRED');
}

function sourceArtifactId({ sourceMessageId, attachmentIdentity }) {
  const payload = `${String(sourceMessageId ?? '')}|${String(attachmentIdentity ?? '')}`;
  return `stmt_${crypto.createHash('sha256').update(payload).digest('hex')}`;
}

export async function importStatementSession({
  encryptedPdfBytes,
  password,
  sourceMessageId,
  attachmentIdentity,
  statementClassification,
  decryptAndExtractText,
  parseStatementText
}) {
  if (typeof password !== 'string' || password.length === 0) throw new Error('STATEMENT_PASSWORD_REQUIRED');
  if (typeof decryptAndExtractText !== 'function') throw new TypeError('STATEMENT_DECRYPTOR_REQUIRED');
  if (typeof parseStatementText !== 'function') throw new TypeError('STATEMENT_PARSER_REQUIRED');

  const encrypted = ensureBuffer(encryptedPdfBytes);
  let plaintext = null;

  try {
    plaintext = await decryptAndExtractText({
      pdfBytes: encrypted,
      password
    });

    if (typeof plaintext !== 'string' || plaintext.length === 0) {
      throw new Error('STATEMENT_TEXT_EMPTY');
    }

    const rows = await parseStatementText({
      text: plaintext,
      classification: statementClassification
    });

    if (!Array.isArray(rows)) throw new Error('STATEMENT_ROWS_INVALID');

    const artifactId = sourceArtifactId({ sourceMessageId, attachmentIdentity });
    return rows.map((row, index) => ({
      ...row,
      sourceType: row.sourceType ?? 'BANK_STATEMENT',
      evidenceClass: row.evidenceClass ?? 'BANK_STATEMENT',
      sourceArtifactId: `${artifactId}:${index}`,
      statementSourceClass: statementClassification?.sourceClass ?? null,
      statementProviderProfile: statementClassification?.providerProfile ?? null
    }));
  } finally {
    // The password is intentionally never copied to returned state, logs, vaults or errors.
    // JavaScript strings cannot be reliably zeroed; caller scope must drop the only reference
    // immediately after this function returns. Raw PDF/text are not written by this module.
    if (Buffer.isBuffer(encrypted)) encrypted.fill(0);
    plaintext = null;
  }
}

export function statementSessionPublicSummary({ classification, evidence = [] } = {}) {
  return {
    sourceClass: classification?.sourceClass ?? 'NOT_STATEMENT',
    providerProfile: classification?.providerProfile ?? 'UNKNOWN',
    evidenceCount: Array.isArray(evidence) ? evidence.length : 0,
    passwordPersisted: false,
    rawPdfPersisted: false,
    plaintextPersisted: false
  };
}
