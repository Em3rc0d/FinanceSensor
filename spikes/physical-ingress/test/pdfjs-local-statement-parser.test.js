import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLocalPdfLayout } from '../src/pdfjs-statement-parser.js';

function fakePdfjs() {
  return {
    getDocument(options) {
      assert.ok(options.data instanceof Uint8Array);
      assert.equal(Object.prototype.hasOwnProperty.call(options, 'password'), false);
      assert.equal(options.isEvalSupported, false);
      return {
        async destroy() {},
        promise: Promise.resolve({
          numPages: 1,
          async getPage() {
            return {
              getViewport() { return { width: 600, height: 800 }; },
              async getTextContent() {
                return { items: [{ str: 'ESTADO DE CUENTA', transform: [1, 0, 0, 1, 40, 700], width: 100, height: 10 }] };
              },
              cleanup() {}
            };
          },
          async destroy() {}
        })
      };
    }
  };
}

test('explicit local-file lane may parse an unprotected PDF without weakening password-protected callers', async () => {
  const layout = await extractLocalPdfLayout({
    pdfBytes: Buffer.from('synthetic-local-pdf'),
    password: '',
    pdfjs: fakePdfjs()
  });
  assert.equal(layout.pages.length, 1);
  assert.equal(layout.pages[0].items[0].text, 'ESTADO DE CUENTA');
});
