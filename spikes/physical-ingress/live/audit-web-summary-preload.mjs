import http from 'node:http';

const PREFIX = 'FINANCESENSOR_STMT_AUDIT_SHAPE;';
const DETAIL_PREFIX = 'FINANCESENSOR_STMT_AUDIT_DETAIL;';
const ALLOWED_RANGES = new Set([
  'NONE',
  'BEFORE_PERIOD',
  'AFTER_PERIOD',
  'PROCESS_BEFORE_VALUE_IN_PERIOD',
  'PROCESS_BEFORE_VALUE_BEFORE_PERIOD',
  'PROCESS_BEFORE_VALUE_AFTER_PERIOD',
  'PROCESS_BEFORE_VALUE_INVALID',
  'PROCESS_BEFORE_VALUE_MIXED',
  'PROCESS_AFTER_VALUE_IN_PERIOD',
  'PROCESS_AFTER_VALUE_BEFORE_PERIOD',
  'PROCESS_AFTER_VALUE_AFTER_PERIOD',
  'PROCESS_AFTER_VALUE_INVALID',
  'PROCESS_AFTER_VALUE_MIXED',
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
  'closing',
  'openinglabel',
  'closinglabel',
  'totallabel',
  'totaldebit',
  'totalcredit',
  'debitmatch',
  'creditmatch',
  'pagedebitcoverage',
  'pagecreditcoverage',
  'pagedebitmatch',
  'pagecreditmatch',
  'closingvalue'
]);
const CATEGORY_KEYS = Object.freeze([
  'debitrelation',
  'creditrelation',
  'debitbinding',
  'creditbinding',
  'closingbinding'
]);
const DETAIL_BOOLEAN_KEYS = Object.freeze([
  'rawdebitabs',
  'rawcreditabs',
  'debitnegative',
  'creditnegative',
  'debitsingle',
  'creditsingle',
  'signeddebitmatch',
  'signedcreditmatch'
]);

let pendingShapes = [];
let pendingDetails = [];
const responseContentTypes = new WeakMap();

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

function keyValues(line, prefix) {
  if (typeof line !== 'string' || !line.startsWith(prefix)) return null;
  const values = Object.create(null);
  for (const part of line.slice(prefix.length).split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    values[part.slice(0, index)] = part.slice(index + 1);
  }
  return values;
}

function parseShape(line) {
  const values = keyValues(line, PREFIX);
  if (!values) return null;

  const shape = {
    status: safeToken(values.status),
    code: safeToken(values.code),
    range: ALLOWED_RANGES.has(values.range) ? values.range : 'UNKNOWN'
  };
  for (const key of CHECK_KEYS) shape[key] = values[key] === '1';
  for (const key of CATEGORY_KEYS) shape[key] = safeToken(values[key]);
  return shape;
}

function parseDetail(line) {
  const values = keyValues(line, DETAIL_PREFIX);
  if (!values) return null;
  const detail = {
    layout: safeToken(values.layout),
    closingalternate: safeToken(values.closingalternate)
  };
  for (const key of DETAIL_BOOLEAN_KEYS) detail[key] = values[key] === '1';
  return detail;
}

function countTrue(values, key) {
  return values.reduce((count, value) => count + Number(value[key] === true), 0);
}

function groupedCounts(values, key) {
  const counts = new Map();
  for (const value of values) {
    const token = safeToken(value[key]);
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function groupedHtml(values, key) {
  return groupedCounts(values, key)
    .map(([token, count]) => `<code>${escapeHtml(token)}</code>: <strong>${count}</strong>`)
    .join(' · ');
}

function auditSummaryHtml(shapes, details = []) {
  const total = shapes.length;
  if (total === 0) return '';

  const checks = [
    ['Periodo único', 'period'],
    ['Fechas dentro del periodo', 'date'],
    ['Dirección IN/OUT coherente', 'direction'],
    ['Importes positivos', 'amount'],
    ['Filas resumen excluidas', 'summary'],
    ['SALDO ANTERIOR único', 'opening'],
    ['SALDO final único', 'closing'],
    ['Etiqueta SALDO ANTERIOR en primera página', 'openinglabel'],
    ['Etiqueta SALDO final en última página', 'closinglabel'],
    ['TOTAL MOVIMIENTO en última página', 'totallabel'],
    ['Total impreso de cargos disponible', 'totaldebit'],
    ['Total impreso de abonos disponible', 'totalcredit'],
    ['Cargos parseados = total impreso final', 'debitmatch'],
    ['Abonos parseados = total impreso final', 'creditmatch'],
    ['Cobertura de subtotal CARGOS por página', 'pagedebitcoverage'],
    ['Cobertura de subtotal ABONOS por página', 'pagecreditcoverage'],
    ['Suma subtotales CARGOS por página = parseado', 'pagedebitmatch'],
    ['Suma subtotales ABONOS por página = parseado', 'pagecreditmatch'],
    ['Valor SALDO final enlazable', 'closingvalue']
  ];
  const checkHtml = checks
    .map(([label, key]) => `${escapeHtml(label)}: <strong>${countTrue(shapes, key)}/${total}</strong>`)
    .join('<br>');

  const rangeHtml = groupedHtml(shapes, 'range');
  const codeHtml = groupedCounts(shapes, 'code')
    .map(([token, count]) => `<code>${escapeHtml(token)}</code>: <strong>${count}</strong>`)
    .join('<br>');
  const diagnosticHtml = [
    ['Relación CARGOS parseado/impreso final', 'debitrelation'],
    ['Binding CARGOS impreso final', 'debitbinding'],
    ['Relación ABONOS parseado/impreso final', 'creditrelation'],
    ['Binding ABONOS impreso final', 'creditbinding'],
    ['Binding valor SALDO final', 'closingbinding']
  ].map(([label, key]) => `${escapeHtml(label)}: ${groupedHtml(shapes, key)}`).join('<br>');

  let detailHtml = '';
  if (details.length > 0) {
    const detailTotal = details.length;
    const detailChecks = [
      ['Reconstrucción CARGOS raw absoluta = parser', 'rawdebitabs'],
      ['Reconstrucción ABONOS raw absoluta = parser', 'rawcreditabs'],
      ['EECC con signo negativo en CARGOS', 'debitnegative'],
      ['EECC con signo negativo en ABONOS', 'creditnegative'],
      ['Celdas CARGOS con un único fragmento numérico', 'debitsingle'],
      ['Celdas ABONOS con un único fragmento numérico', 'creditsingle'],
      ['CARGOS respetando signo = total impreso', 'signeddebitmatch'],
      ['ABONOS respetando signo = total impreso', 'signedcreditmatch']
    ].map(([label, key]) => `${escapeHtml(label)}: <strong>${countTrue(details, key)}/${detailTotal}</strong>`).join('<br>');
    detailHtml = `<p><strong>Diagnóstico de signo/layout</strong><br>Layout ledger: ${groupedHtml(details, 'layout')}<br>${detailChecks}<br>Alternativa estructural SALDO final: ${groupedHtml(details, 'closingalternate')}</p>`;
  }

  return `<div class="wrap"><div class="panel"><h3>Diagnóstico estructural seguro</h3><p>${checkHtml}</p><p>${diagnosticHtml}</p>${detailHtml}<p>Rango de fechas: ${rangeHtml}</p><p>Códigos por EECC:<br>${codeHtml}</p><p class="muted">Solo se muestran contadores, categorías y coincidencias booleanas contra controles impresos. No incluye fechas, importes, descripciones, IDs, texto PDF ni coordenadas.</p></div></div>`;
}

function suppliedHeader(headers, wanted) {
  if (!headers) return null;
  const target = String(wanted).toLowerCase();
  if (Array.isArray(headers)) {
    for (let i = 0; i + 1 < headers.length; i += 2) {
      if (String(headers[i]).toLowerCase() === target) return headers[i + 1];
    }
    return null;
  }
  if (typeof headers !== 'object') return null;
  const key = Object.keys(headers).find(name => name.toLowerCase() === target);
  return key ? headers[key] : null;
}

const originalLog = console.log.bind(console);
console.log = (...args) => {
  const shape = parseShape(args[0]);
  if (shape) pendingShapes.push(shape);
  const detail = parseDetail(args[0]);
  if (detail) pendingDetails.push(detail);
  if (args[0] === 'CREDIT_STATEMENT_PHYSICAL_IMPORT=OPEN') {
    args[0] = 'CREDIT_STATEMENT_PHYSICAL_IMPORT=BLOCKED';
  }
  return originalLog(...args);
};

const originalWriteHead = http.ServerResponse.prototype.writeHead;
http.ServerResponse.prototype.writeHead = function patchedWriteHead(statusCode, statusMessage, headers) {
  try {
    const supplied = headers ?? ((statusMessage && typeof statusMessage === 'object') ? statusMessage : null);
    const contentType = suppliedHeader(supplied, 'content-type') ?? this.getHeader('content-type') ?? '';
    responseContentTypes.set(this, String(contentType));
  } catch {
    responseContentTypes.set(this, '');
  }
  return originalWriteHead.apply(this, arguments);
};

const originalEnd = http.ServerResponse.prototype.end;
http.ServerResponse.prototype.end = function patchedEnd(chunk, encoding, callback) {
  try {
    const contentType = responseContentTypes.get(this) ?? String(this.getHeader('content-type') ?? '');
    if (pendingShapes.length > 0 && contentType.includes('text/html') && chunk !== undefined && chunk !== null) {
      const wasBuffer = Buffer.isBuffer(chunk);
      const text = wasBuffer ? chunk.toString('utf8') : typeof chunk === 'string' ? chunk : null;
      if (text && text.includes('</body>')) {
        const summary = auditSummaryHtml(pendingShapes, pendingDetails);
        pendingShapes = [];
        pendingDetails = [];
        const next = text.replace('</body>', `${summary}</body>`);
        if (!this.headersSent) this.removeHeader('content-length');
        chunk = wasBuffer ? Buffer.from(next, 'utf8') : next;
      }
    }
  } catch {
    pendingShapes = [];
    pendingDetails = [];
  }
  return originalEnd.call(this, chunk, encoding, callback);
};
