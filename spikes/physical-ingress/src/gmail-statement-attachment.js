function decodeBase64UrlBytes(data = '') {
  const normalized = String(data).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
}

export async function fetchGmailStatementAttachment({ provider, messageId, attachmentId }) {
  if (!provider || typeof provider._request !== 'function') throw new TypeError('GMAIL_PROVIDER_REQUEST_REQUIRED');
  if (!messageId || !attachmentId) throw new Error('STATEMENT_ATTACHMENT_IDENTITY_REQUIRED');

  const body = await provider._request(
    `/messages/${encodeURIComponent(String(messageId))}/attachments/${encodeURIComponent(String(attachmentId))}`
  );
  if (!body?.data) throw new Error('STATEMENT_ATTACHMENT_DATA_MISSING');

  const bytes = decodeBase64UrlBytes(body.data);
  if (bytes.length === 0) throw new Error('STATEMENT_ATTACHMENT_EMPTY');
  return bytes;
}
