function asUint8Array(bytes) {
  if (bytes instanceof Uint8Array) return new Uint8Array(bytes);
  if (Buffer.isBuffer(bytes)) return new Uint8Array(bytes);
  throw new TypeError('PDF_BYTES_REQUIRED');
}

function wipeIfAttached(bytes) {
  if (!(bytes instanceof Uint8Array)) return;
  try {
    if (bytes.byteLength === 0 || bytes.buffer.byteLength === 0) return;
    bytes.fill(0);
  } catch (error) {
    // pdf.js may transfer its input ArrayBuffer to its worker/runtime, which detaches the
    // sender-side TypedArray. A detached view no longer exposes bytes for us to wipe.
    // Any other failure remains exceptional and must not be hidden.
    if (error instanceof TypeError && /detached ArrayBuffer/i.test(String(error.message))) return;
    throw error;
  }
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

async function loadLayout({ pdfBytes, password = '', pdfjs = null, allowEmptyPassword = false }) {
  if (typeof password !== 'string') throw new Error('STATEMENT_PASSWORD_REQUIRED');
  if (!allowEmptyPassword && password.length === 0) throw new Error('STATEMENT_PASSWORD_REQUIRED');
  const library = pdfjs ?? await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof library.getDocument !== 'function') throw new Error('PDFJS_GET_DOCUMENT_UNAVAILABLE');

  // Keep one parser-owned wipeable copy and give pdf.js a second disposable copy.
  // pdf.js is allowed to transfer/detach its copy without invalidating our cleanup path.
  const ownedData = asUint8Array(pdfBytes);
  const pdfjsData = new Uint8Array(ownedData);
  let loadingTask = null;
  let document = null;

  try {
    const documentOptions = {
      data: pdfjsData,
      disableWorker: true,
      isEvalSupported: false,
      useSystemFonts: false
    };
    if (password.length > 0) documentOptions.password = password;
    loadingTask = library.getDocument(documentOptions);

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
    wipeIfAttached(pdfjsData);
    ownedData.fill(0);
  }
}

export async function extractPasswordProtectedPdfLayout(options) {
  return loadLayout(options);
}

export async function extractLocalPdfLayout(options) {
  return loadLayout({ ...options, allowEmptyPassword: true });
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
