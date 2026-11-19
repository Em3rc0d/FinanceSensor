const FORBIDDEN_KEYS = new Set([
  'body', 'subject', 'attachment', 'attachments', 'token', 'accessToken', 'refreshToken',
  'merchant', 'counterparty', 'amount', 'currency', 'accountId', 'instrumentId',
  'messageId', 'sourceMessageId', 'canonicalEvent', 'financialEvidence'
]);

function walk(value, path = '') {
  const findings = [];
  if (Array.isArray(value)) {
    value.forEach((item, i) => findings.push(...walk(item, `${path}[${i}]`)));
    return findings;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (FORBIDDEN_KEYS.has(key)) findings.push(nextPath);
      findings.push(...walk(child, nextPath));
    }
  }
  return findings;
}

export function forbiddenTelemetryPaths(payload) {
  return [...new Set(walk(payload))];
}

export class PrivacyTelemetrySink {
  constructor() {
    this.events = [];
    this.plaintextFinancialBytes = 0;
  }

  emit(name, payload = {}) {
    const findings = forbiddenTelemetryPaths(payload);
    if (findings.length) throw new Error(`privacy boundary violation: ${findings.join(', ')}`);
    const serialized = JSON.stringify({ name, payload });
    this.events.push({ name, payload: structuredClone(payload), bytes: Buffer.byteLength(serialized) });
    return true;
  }

  serialized() {
    return JSON.stringify(this.events);
  }
}

export function assertNoSensitiveLiterals(serialized, literals) {
  const hits = literals.filter(v => v && serialized.includes(String(v)));
  return hits;
}
