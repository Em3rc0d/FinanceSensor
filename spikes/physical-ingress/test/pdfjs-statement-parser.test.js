import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPasswordProtectedPdfLayout,
  extractPasswordProtectedPdfText
} from '../src/pdfjs-statement-parser.js';

function fakePdfjs({ rejectPassword = false, detachInput = false } = {}) {
  return {
    getDocument({ data, password, isEvalSupported }) {
      assert.ok(data instanceof Uint8Array);
      assert.equal(password, 'synthetic-local-key');
      assert.equal(isEvalSupported, false);
      if (detachInput) {
        structuredClone(data.buffer, { transfer: [data.buffer] });
        assert.equal(data.byteLength, 0);
      }
      const task = {
        async destroy() {},
        promise: rejectPassword
          ? Promise.reject(Object.assign(new Error('PasswordException'), { name: 'PasswordException', code: 1 }))
          : Promise.resolve({
              numPages: 2,
              async getPage(pageNumber) {
                return {
                  getViewport() {
                    return { width: 600, height: 800 };
                  },
                  async getTextContent() {
                    return {
                      items: [{
                        str: pageNumber === 1 ? '01/09/2026 ABONO' : 'S/ 100.00',
                        transform: [1, 0, 0, 1, pageNumber === 1 ? 40 : 410, 700],
                        width: 80,
                        height: 10
                      }]
                    };
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

test('extracts text through password-aware local PDF loader and preserves page boundary', async () => {
  const original = Buffer.from('synthetic-pdf');
  const text = await extractPasswordProtectedPdfText({
    pdfBytes: original,
    password: 'synthetic-local-key',
    pdfjs: fakePdfjs()
  });
  assert.match(text, /ABONO/);
  assert.match(text, /100\.00/);
  assert.equal(text.split('\f').length, 2);
  // Caller-owned bytes remain the caller's responsibility; the parser works on copies.
  assert.equal(original.toString(), 'synthetic-pdf');
});

test('survives pdf.js transferring and detaching its disposable input buffer', async () => {
  const original = Buffer.from('synthetic-pdf');
  const layout = await extractPasswordProtectedPdfLayout({
    pdfBytes: original,
    password: 'synthetic-local-key',
    pdfjs: fakePdfjs({ detachInput: true })
  });

  assert.equal(layout.pages.length, 2);
  assert.equal(layout.pages[0].items[0].text, '01/09/2026 ABONO');
  assert.equal(original.toString(), 'synthetic-pdf');
});

test('exposes transient item geometry for header-anchored bank adapters', async () => {
  const layout = await extractPasswordProtectedPdfLayout({
    pdfBytes: Buffer.from('synthetic-pdf'),
    password: 'synthetic-local-key',
    pdfjs: fakePdfjs()
  });
  assert.equal(layout.pages.length, 2);
  assert.equal(layout.pages[0].width, 600);
  assert.equal(layout.pages[0].height, 800);
  assert.deepEqual(layout.pages[0].items[0], {
    sequence: 0,
    text: '01/09/2026 ABONO',
    x: 40,
    y: 700,
    width: 80,
    height: 10
  });
  assert.equal(layout.pages[1].items[0].x, 410);
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
