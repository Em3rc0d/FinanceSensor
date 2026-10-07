import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchGmailStatementAttachment } from '../src/gmail-statement-attachment.js';

test('fetches attachment bytes through existing local Gmail provider boundary', async () => {
  const seen = [];
  const provider = {
    async _request(path) {
      seen.push(path);
      return { data: Buffer.from('encrypted-statement').toString('base64url'), size: 19 };
    }
  };
  const bytes = await fetchGmailStatementAttachment({
    provider,
    messageId: 'message-synthetic',
    attachmentId: 'attachment-synthetic'
  });
  assert.equal(bytes.toString(), 'encrypted-statement');
  assert.deepEqual(seen, ['/messages/message-synthetic/attachments/attachment-synthetic']);
});

test('fails closed when Gmail attachment data is absent', async () => {
  await assert.rejects(
    fetchGmailStatementAttachment({
      provider: { async _request() { return {}; } },
      messageId: 'message',
      attachmentId: 'attachment'
    }),
    /STATEMENT_ATTACHMENT_DATA_MISSING/
  );
});
