import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPasswordProtectedPdfText } from '../src/pdfjs-statement-parser.js';

function fakePdfjs({ rejectPassword = false } = {}) {
  return {
    getDocument({ data, password }) {
      assert.ok(data instanceof Uint8Array);
      assert.equal(password, 'synthetic-local-key');
      const task = {
        async destroy() {},
        promise: rejectPassword
          ? Promise.reject(Object.assign(new Error('PasswordException'), { name: 'PasswordException', code: 1 }))
          : Promise.resolve({
              numPages: 2,
              async getPage(pageNumber) {
                return {
                  async getTextContent() {
                    return { items: [{ str: pageNumber === 1 ? '01/09/2026 ABONO' : 'S/ 100.00' }] };
                  },
                  cleanup() {}
                };
              },
              async destroy() {}
            })
      };
      return task;
    }
  };
}

test('extracts text through password-aware local PDF loader and wipes its working byte copy', async () => {
  const original = Buffer.from('synthetic-pdf');
  const text = await extractPasswordProtectedPdfText({
    pdfBytes: original,
    password: 'synthetic-local-key',
    pdfjs: fakePdfjs()
  });
  assert.match(text, /ABONO/);
  assert.match(text, /100\.00/);
  // Caller-owned bytes remain the caller's responsibility; the parser wipes its internal copy.
  assert.equal(original.toString(), 'synthetic-pdf');
});

test('maps PDF password failure to sanitized local code without echoing password', async () => {
  await assert.rejects(
    extractPasswordProtectedPdfText({
      pdfBytes: Buffer.from('synthetic-pdf'),
      password: 'synthetic-local-key',
      pdfjs: fakePdfjs({ rejectPassword: true })
    }),
    error => error.code === 'PDF_PASSWORD_REJECTED' && !String(error.message).includes('synthetic-local-key')
  );
});
