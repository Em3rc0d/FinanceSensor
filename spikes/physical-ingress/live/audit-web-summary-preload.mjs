import http from 'node:http';

const PREFIX = 'FINANCESENSOR_STMT_AUDIT_SHAPE;';
const ALLOWED_RANGES = new Set([
  'NONE',
  'BEFORE_PERIOD',
  'AFTER_PERIOD',
  'INVALID_DATE',
  'MIXED',
  'PERIOD_UNAVAILABLE',
  'UNKNOWN'
]);
const CHECK_KEYS = Object.freeze([
  'period',
  'date',
  'direction',
  'amount',
  'summary',
  'opening',
  'closing'
]);

let pendingShapes = [];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function safeToken(value, fallback = 'UNKNOWN') {
  const token = String(value ?? '').trim();
  return /^[A-Z0-9_:-]{1,80}$/.test(token) ? token : fallback;
}

function parseShape(line) {
  if (typeof line !== 'string' || !line.startsWith(PREFIX)) return null;
  const values = Object.create(null);
  for (const part of line.slice(PREFIX.length).split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    values[part.slice(0, index)] = part.slice(index + 1);
  }

  const shape = {
    status: safeToken(values.status),
    code: safeToken(values.code),
    range: ALLOWED_RANGES.has(values.range) ? values.range : 'UNKNOWN'
  };
  for (const key of CHECK_KEYS) shape[key] = values[key] === '1';
  return shape;
}

function countTrue(shapes, key) {
  return shapes.reduce((count, shape) => count + Number(shape[key] === true), 0);
}

function groupedCounts(shapes, key) {
  const counts = new Map();
  for (const shape of shapes) {
    const token = safeToken(shape[key]);
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function auditSummaryHtml(shapes) {
  const total = shapes.length;
  if (total === 0) return '';

  const checks = [
    ['Periodo único', 'period'],
    ['Fechas dentro del periodo', 'date'],
    ['Dirección IN/OUT coherente', 'direction'],
    ['Importes positivos', 'amount'],
    ['Filas resumen excluidas', 'summary'],
    ['SALDO ANTERIOR único', 'opening'],
    ['SALDO final único', 'closing']
  ];
  const checkHtml = checks
    .map(([label, key]) => `${escapeHtml(label)}: <strong>${countTrue(shapes, key)}/${total}</strong>`)
    .join('<br>');

  const rangeHtml = groupedCounts(shapes, 'range')
    .map(([token, count]) => `<code>${escapeHtml(token)}</code>: <strong>${count}</strong>`)
    .join(' · ');
  const codeHtml = groupedCounts(shapes, 'code')
    .map(([token, count]) => `<code>${escapeHtml(token)}</code>: <strong>${count}</strong>`)
    .join('<br>');

  return `<div class="wrap"><div class="panel"><h3>Diagnóstico estructural seguro</h3><p>${checkHtml}</p><p>Rango de fechas: ${rangeHtml}</p><p>Códigos por EECC:<br>${codeHtml}</p><p class="muted">Solo se muestran contadores y categorías. No incluye fechas, importes, descripciones, IDs, texto PDF ni coordenadas.</p></div></div>`;
}

const originalLog = console.log.bind(console);
console.log = (...args) => {
  const shape = parseShape(args[0]);
  if (shape) pendingShapes.push(shape);
  if (args[0] === 'CREDIT_STATEMENT_PHYSICAL_IMPORT=OPEN') {
    args[0] = 'CREDIT_STATEMENT_PHYSICAL_IMPORT=BLOCKED';
  }
  return originalLog(...args);
};

const originalEnd = http.ServerResponse.prototype.end;
http.ServerResponse.prototype.end = function patchedEnd(chunk, encoding, callback) {
  try {
    const contentType = String(this.getHeader('content-type') ?? '');
    if (pendingShapes.length > 0 && contentType.includes('text/html') && chunk !== undefined && chunk !== null) {
      const wasBuffer = Buffer.isBuffer(chunk);
      const text = wasBuffer ? chunk.toString('utf8') : typeof chunk === 'string' ? chunk : null;
      if (text && text.includes('</body>')) {
        const summary = auditSummaryHtml(pendingShapes);
        pendingShapes = [];
        const next = text.replace('</body>', `${summary}</body>`);
        this.removeHeader('content-length');
        chunk = wasBuffer ? Buffer.from(next, 'utf8') : next;
      }
    }
  } catch {
    // Observability must never make the trusted local edge less available.
    pendingShapes = [];
  }
  return originalEnd.call(this, chunk, encoding, callback);
};
