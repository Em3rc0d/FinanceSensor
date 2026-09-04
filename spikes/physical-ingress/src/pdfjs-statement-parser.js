function asUint8Array(bytes) {
  if (bytes instanceof Uint8Array) return new Uint8Array(bytes);
  if (Buffer.isBuffer(bytes)) return new Uint8Array(bytes);
  throw new TypeError('PDF_BYTES_REQUIRED');
}

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function itemGeometry(item, sequence) {
  const transform = Array.isArray(item?.transform) ? item.transform : [];
  return {
    sequence,
    text: typeof item?.str === 'string' ? item.str : '',
    x: safeNumber(transform[4]),
    y: safeNumber(transform[5]),
    width: safeNumber(item?.width),
    height: safeNumber(item?.height)
  };
}

async function loadLayout({ pdfBytes, password, pdfjs = null }) {
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
      const viewport = typeof page.getViewport === 'function' ? page.getViewport({ scale: 1 }) : null;
      const items = (content.items ?? [])
        .map((item, index) => itemGeometry(item, index))
        .filter(item => item.text.trim().length > 0);
      pages.push({
        pageNumber,
        width: safeNumber(viewport?.width),
        height: safeNumber(viewport?.height),
        items
      });
      page.cleanup?.();
    }
    return { pages };
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

export async function extractPasswordProtectedPdfLayout(options) {
  return loadLayout(options);
}

export async function extractPasswordProtectedPdfText(options) {
  const layout = await loadLayout(options);
  // Form-feed is an in-memory structural delimiter only. It preserves page identity so
  // downstream page-role classification can exclude summaries and educational examples.
  return layout.pages
    .map(page => page.items
      .sort((a, b) => a.sequence - b.sequence)
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim())
    .join('\f');
}
