export const ALPHA2_PUBLIC_SCHEMA = 'ALPHA2_PUBLIC_DASHBOARD_V1';

export const FORBIDDEN_WEB_KEYS = Object.freeze([
  'confidence',
  'matchScore',
  'evidencePercent',
  'evidencePercentage',
  'messageId',
  'attachmentId',
  'gmailMessageId',
  'rawGmailBody',
  'rawMime',
  'rawPdf',
  'pdfPassword',
  'externalReference',
  'accessToken',
  'refreshToken',
  'rawDek'
]);

const forbidden = new Set(FORBIDDEN_WEB_KEYS);

function walk(value, path = '$') {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) throw new Error(`WEB_PROJECTION_FORBIDDEN_KEY:${path}.${key}`);
    walk(child, `${path}.${key}`);
  }
}

export function validateProjection(projection) {
  if (!projection || typeof projection !== 'object' || Array.isArray(projection)) {
    throw new Error('WEB_PROJECTION_OBJECT_REQUIRED');
  }
  if (projection.schema !== ALPHA2_PUBLIC_SCHEMA) throw new Error('WEB_PROJECTION_SCHEMA_MISMATCH');
  for (const key of ['transactions', 'cashflow', 'recurringCandidates', 'knowledgeGaps']) {
    if (!Array.isArray(projection[key])) throw new Error(`WEB_PROJECTION_ARRAY_REQUIRED:${key}`);
  }
  walk(projection);
  for (const row of projection.transactions) {
    if (!row.id || !row.occurredAt || !Number.isFinite(Number(row.amount)) || !/^[A-Z]{3}$/.test(row.currency ?? '')) {
      throw new Error('WEB_TRANSACTION_INVALID');
    }
    if (!['OBSERVED', 'POSTED', 'RECONCILED', 'PARTIAL', 'UNKNOWN'].includes(row.truthState)) {
      throw new Error('WEB_TRANSACTION_TRUTH_INVALID');
    }
  }
  return projection;
}

export function summarizeProjection(projection) {
  validateProjection(projection);
  const byCurrency = new Map();
  for (const bucket of projection.cashflow) {
    const currency = String(bucket.currency ?? '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) continue;
    byCurrency.set(currency, {
      currency,
      income: Number(bucket.income ?? 0),
      expense: Number(bucket.expense ?? 0),
      net: Number(bucket.net ?? 0),
      truthState: bucket.truthState ?? 'UNKNOWN'
    });
  }
  return {
    byCurrency: [...byCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
    transactionCount: projection.transactions.length,
    recurringCount: projection.recurringCandidates.length,
    gapCount: projection.knowledgeGaps.length,
    monthlyState: projection.monthlyState ?? null
  };
}

export function truthLabel(value) {
  return switchTruth(value);
}

function switchTruth(value) {
  switch (value) {
    case 'RECONCILED': return 'Reconciliado';
    case 'POSTED': return 'Contabilizado';
    case 'OBSERVED': return 'Observado';
    case 'PARTIAL': return 'Parcial';
    default: return 'Por confirmar';
  }
}

export function money(amount, currency) {
  const number = Number(amount ?? 0);
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(Number.isFinite(number) ? number : 0);
}
