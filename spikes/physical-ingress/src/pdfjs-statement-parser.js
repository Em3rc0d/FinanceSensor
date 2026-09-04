function asUint8Array(bytes) {
  if (bytes instanceof Uint8Array) return new Uint8Array(bytes);
  if (Buffer.isBuffer(bytes)) return new Uint8Array(bytes);
  throw new TypeError('PDF_BYTES_REQUIRED');
}

export async function extractPasswordProtectedPdfText({ pdfBytes, password, pdfjs = null }) {
  if (typeof password !== 'string' || password.length === 0) throw new Error('STATEMENT_PASSWORD_REQUIRED');
  const library = pdfjs ?? await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof library.getDocument !== 'function') throw new Error('PDFJS_GET_DOCUMENT_UNAVAILABLE');

  const data = asUint8Array(pdfBytes);
  const loadingTask = library.getDocument({
    data,
    password,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: false
  });

  let document = null;
  try {
    document = await loadingTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = (content.items ?? [])
        .map(item => typeof item?.str === 'string' ? item.str : '')
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      pages.push(text);
      page.cleanup?.();
    }
    // Form-feed is an in-memory structural delimiter only. It preserves page identity so
    // downstream page-role classification can exclude summaries and educational examples.
    return pages.join('\f');
  } catch (error) {
    const safe = new Error(
      Number(error?.code) === 1 || /password/i.test(String(error?.name ?? ''))
        ? 'PDF_PASSWORD_REJECTED'
        : 'PDF_PARSE_FAILED'
    );
    safe.code = safe.message;
    throw safe;
  } finally {
    try { await document?.destroy?.(); } catch {}
    try { await loadingTask?.destroy?.(); } catch {}
    data.fill(0);
  }
}
