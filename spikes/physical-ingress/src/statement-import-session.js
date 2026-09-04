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

function decorateRows({ rows, sourceMessageId, attachmentIdentity, statementClassification }) {
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

    return decorateRows({
      rows,
      sourceMessageId,
      attachmentIdentity,
      statementClassification
    });
  } finally {
    // Password/plaintext are intentionally never copied to returned state, logs, vaults or errors.
    // JavaScript strings cannot be reliably zeroed; caller scope must drop the only password reference.
    // Raw PDF/text are not written by this module.
    if (Buffer.isBuffer(encrypted)) encrypted.fill(0);
    plaintext = null;
  }
}

export async function importStatementLayoutSession({
  encryptedPdfBytes,
  password,
  sourceMessageId,
  attachmentIdentity,
  statementClassification,
  decryptAndExtractLayout,
  parseStatementLayout
}) {
  if (typeof password !== 'string' || password.length === 0) throw new Error('STATEMENT_PASSWORD_REQUIRED');
  if (typeof decryptAndExtractLayout !== 'function') throw new TypeError('STATEMENT_LAYOUT_DECRYPTOR_REQUIRED');
  if (typeof parseStatementLayout !== 'function') throw new TypeError('STATEMENT_LAYOUT_PARSER_REQUIRED');

  const encrypted = ensureBuffer(encryptedPdfBytes);
  let layout = null;
  let parsed = null;

  try {
    layout = await decryptAndExtractLayout({
      pdfBytes: encrypted,
      password
    });
    if (!layout || !Array.isArray(layout.pages) || layout.pages.length === 0) {
      throw new Error('STATEMENT_LAYOUT_EMPTY');
    }

    parsed = await parseStatementLayout({
      layout,
      pages: layout.pages,
      classification: statementClassification
    });

    const rows = Array.isArray(parsed) ? parsed : parsed?.rows;
    const review = Array.isArray(parsed?.review) ? parsed.review : [];
    if (!Array.isArray(rows)) throw new Error('STATEMENT_ROWS_INVALID');
    if (review.length > 0) {
      const error = new Error('STATEMENT_LAYOUT_REVIEW_REQUIRED');
      error.code = error.message;
      throw error;
    }
    if (rows.length === 0) {
      const error = new Error('STATEMENT_LAYOUT_NO_MOVEMENTS');
      error.code = error.message;
      throw error;
    }

    return {
      evidence: decorateRows({
        rows,
        sourceMessageId,
        attachmentIdentity,
        statementClassification
      }),
      reviewCount: 0,
      pageCount: layout.pages.length
    };
  } finally {
    // Layout item text is transient source plaintext. JS strings cannot be deterministically zeroed,
    // so no references are returned or persisted and local scope is dropped immediately after parsing.
    if (Buffer.isBuffer(encrypted)) encrypted.fill(0);
    layout = null;
    parsed = null;
  }
}

export function statementSessionPublicSummary({ classification, evidence = [], pageCount = null } = {}) {
  return {
    sourceClass: classification?.sourceClass ?? 'NOT_STATEMENT',
    providerProfile: classification?.providerProfile ?? 'UNKNOWN',
    evidenceCount: Array.isArray(evidence) ? evidence.length : 0,
    pageCount: Number.isInteger(pageCount) && pageCount >= 0 ? pageCount : null,
    passwordPersisted: false,
    rawPdfPersisted: false,
    plaintextPersisted: false,
    layoutPlaintextPersisted: false
  };
}
