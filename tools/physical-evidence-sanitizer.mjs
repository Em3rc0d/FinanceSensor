import fs from 'node:fs';

const RECEIPT_TYPES = new Set([
  'P0_HARNESS_SANITIZATION',
  'Q003_PRODUCTION_LIFECYCLE',
  'Q003_Q004_ANDROID_CREDENTIAL_CUSTODY',
  'Q003_Q004_IOS_CREDENTIAL_CUSTODY',
  'Q004_REAL_PRIVACY_DELETION',
  'Q005_MOBILE_CRYPTO_INTEROP',
  'Q005_WITNESS_CRASH_PARTITION',
  'Q005_ALL_DEVICES_LOST_RECOVERY',
  'Q003_GOOGLE_PRODUCTION_VERIFICATION'
]);

const PHASES = new Set(['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
const RESULTS = new Set(['PASS', 'FAIL', 'INCOMPLETE']);
const PLATFORM_CLASSES = new Set(['LOCAL_EDGE', 'ANDROID', 'IOS', 'CROSS_PLATFORM', 'PROVIDER_PROCESS', 'MULTI_DEVICE']);
const ENDPOINT_CLASSES = new Set([
  'OAUTH_TOKEN',
  'OAUTH_REVOKE',
  'GMAIL_PROFILE',
  'GMAIL_HISTORY',
  'GMAIL_MESSAGE_METADATA',
  'GMAIL_MESSAGE_FULL'
]);

const TOKEN = /^[A-Z][A-Z0-9_]{1,79}$/;
const BUILD = /^[A-Za-z0-9._+-]{1,40}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function finiteNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number`);
  return value;
}

function enumValue(value, allowed, label) {
  if (!allowed.has(value)) throw new Error(`${label} is not an allowed value`);
  return value;
}

function tokenList(values, label) {
  if (!Array.isArray(values)) throw new Error(`${label} must be an array`);
  return values.map((value, index) => {
    if (typeof value !== 'string' || !TOKEN.test(value)) throw new Error(`${label}[${index}] must be an enum-style token`);
    return value;
  });
}

function sanitizeCounters(counters = {}) {
  if (counters === null || typeof counters !== 'object' || Array.isArray(counters)) throw new Error('counters must be an object');
  const out = {};
  for (const [key, value] of Object.entries(counters)) {
    if (!TOKEN.test(key)) throw new Error('counter key must be an enum-style token');
    out[key] = finiteNonNegative(value, `counter ${key}`);
  }
  return out;
}

function sanitizeEndpointMetrics(metrics = []) {
  if (!Array.isArray(metrics)) throw new Error('endpointMetrics must be an array');
  return metrics.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`endpointMetrics[${index}] must be an object`);
    return {
      endpointClass: enumValue(item.endpointClass, ENDPOINT_CLASSES, `endpointMetrics[${index}].endpointClass`),
      requestBodyBytes: finiteNonNegative(item.requestBodyBytes, `endpointMetrics[${index}].requestBodyBytes`),
      responseBytes: finiteNonNegative(item.responseBytes, `endpointMetrics[${index}].responseBytes`),
      elapsedMs: finiteNonNegative(item.elapsedMs, `endpointMetrics[${index}].elapsedMs`)
    };
  });
}

export function assertSanitizedPhysicalEvidence(value) {
  const text = JSON.stringify(value);
  const forbiddenPatterns = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\bBearer\s+[A-Za-z0-9._~+\/-]+/i,
    /\bghp_[A-Za-z0-9]{20,}/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}/,
    /\bAIza[0-9A-Za-z_-]{20,}/,
    /\b1\/\/[0-9A-Za-z._-]{20,}/,
    /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /"(?:access_token|refresh_token|client_secret|authorization_code|code_verifier|message_id|subject|body|snippet|email)"\s*:/i
  ];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) throw new Error('sanitized evidence contains a forbidden secret/content pattern');
  }
  return value;
}

export function sanitizePhysicalEvidence(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('raw evidence must be an object');
  if (!DAY.test(raw.observedAtDay ?? '')) throw new Error('observedAtDay must be YYYY-MM-DD');
  if (!BUILD.test(raw.appBuild ?? '')) throw new Error('appBuild contains unsupported characters');
  if (!BUILD.test(raw.harnessVersion ?? '')) throw new Error('harnessVersion contains unsupported characters');

  const sanitized = {
    schemaVersion: 1,
    campaignPhase: enumValue(raw.campaignPhase, PHASES, 'campaignPhase'),
    receiptType: enumValue(raw.receiptType, RECEIPT_TYPES, 'receiptType'),
    observedAtDay: raw.observedAtDay,
    platformClass: enumValue(raw.platformClass, PLATFORM_CLASSES, 'platformClass'),
    appBuild: raw.appBuild,
    harnessVersion: raw.harnessVersion,
    result: enumValue(raw.result, RESULTS, 'result'),
    counters: sanitizeCounters(raw.counters ?? {}),
    endpointMetrics: sanitizeEndpointMetrics(raw.endpointMetrics ?? []),
    passFacts: tokenList(raw.passFacts ?? [], 'passFacts'),
    residualRiskCodes: tokenList(raw.residualRiskCodes ?? [], 'residualRiskCodes')
  };

  return assertSanitizedPhysicalEvidence(sanitized);
}

function main(argv) {
  const inputPath = argv[2];
  if (!inputPath) throw new Error('input JSON path is required');
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const sanitized = sanitizePhysicalEvidence(raw);
  process.stdout.write(`${JSON.stringify(sanitized, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main(process.argv);
  } catch (error) {
    console.error(`PHYSICAL_EVIDENCE_SANITIZER=FAIL: ${error.message}`);
    process.exit(1);
  }
}
