import fs from 'node:fs';

function replaceOnce(text, oldValue, newValue, label) {
  if (text.includes(newValue)) return text;
  if (!text.includes(oldValue)) throw new Error(`wiring insertion point missing: ${label}`);
  return text.replace(oldValue, newValue);
}

const providerPath = 'spikes/physical-ingress/src/gmail-rest-provider.js';
let provider = fs.readFileSync(providerPath, 'utf8');
if (!provider.includes('async listMessagePage')) {
  const needle = '  async listMessages({ after, query, labelIds = [], maxResults = 500 }) {';
  const method = [
    '  async listMessagePage({ query, labelIds = [], maxResults = 100, pageToken, includeSpamTrash = false }) {',
    '    const boundedMax = Math.max(1, Math.min(500, Number(maxResults) || 100));',
    '    const labels = Array.isArray(labelIds) ? labelIds.filter(Boolean).map(String) : [];',
    "    const page = await this._request('/messages', {",
    '      q: query ? String(query) : undefined,',
    '      labelIds: labels,',
    '      maxResults: boundedMax,',
    '      pageToken: pageToken ? String(pageToken) : undefined,',
    '      includeSpamTrash: Boolean(includeSpamTrash)',
    '    });',
    '    return {',
    '      messages: Array.isArray(page.messages) ? page.messages.map(item => ({ id: item.id, threadId: item.threadId })) : [],',
    '      nextPageToken: page.nextPageToken ?? null,',
    '      resultSizeEstimate: safeCount(page.resultSizeEstimate)',
    '    };',
    '  }',
    '',
    ''
  ].join('\n');
  provider = replaceOnce(provider, needle, `${method}${needle}`, 'gmail-rest-provider.listMessagePage');
  fs.writeFileSync(providerPath, provider);
}

const resolverPath = 'spikes/canonical-resolver/src/resolver.js';
let resolver = fs.readFileSync(resolverPath, 'utf8');
resolver = replaceOnce(
  resolver,
  '    sourceTypes: [evidence.sourceType],\n',
  '    sourceTypes: [evidence.sourceType],\n    evidenceChannels: evidence.evidenceClass ? [evidence.evidenceClass] : [],\n',
  'resolver.evidenceChannels'
);
resolver = replaceOnce(
  resolver,
  "export function hasIndependentSources(a, b) {\n  return new Set([...(a.sourceTypes ?? []), ...(b.sourceTypes ?? [])].filter(Boolean)).size > 1;\n}",
  "export function hasIndependentSources(a, b) {\n  const sourceCount = new Set([...(a.sourceTypes ?? []), ...(b.sourceTypes ?? [])].filter(Boolean)).size;\n  const channelCount = new Set([...(a.evidenceChannels ?? []), ...(b.evidenceChannels ?? [])].filter(Boolean)).size;\n  return sourceCount > 1 || channelCount > 1;\n}",
  'resolver.hasIndependentSources'
);
resolver = replaceOnce(
  resolver,
  '        best.sourceTypes = [...new Set([...best.sourceTypes, ...candidate.sourceTypes])];\n        best.confidence',
  '        best.sourceTypes = [...new Set([...best.sourceTypes, ...candidate.sourceTypes])];\n        best.evidenceChannels = [...new Set([...(best.evidenceChannels ?? []), ...(candidate.evidenceChannels ?? [])])];\n        best.confidence',
  'resolver.mergeEvidenceChannels'
);
fs.writeFileSync(resolverPath, resolver);

const adaptersPath = 'spikes/physical-ingress/src/transaction-evidence-adapters.js';
let adapters = fs.readFileSync(adaptersPath, 'utf8');
adapters = replaceOnce(
  adapters,
  "  const token = String(raw).replace(/[\\u00A0 ]/g, '').replace(/[^0-9.,]/g, '');",
  "  const token = String(raw).replace(/[\\u00A0 ]/g, '').replace(/[^0-9.,]/g, '').replace(/[.,]+$/, '');",
  'adapter.trailingMoneyPunctuation'
);
adapters = replaceOnce(
  adapters,
  "  return { ...money, rawMerchant: field(text, ['comercio']) ?? null, direction: 'OUT', semanticType: 'EXPENSE' };",
  "  const merchant = normalize(String(text).match(/comercio\\s*:\\s*(.+?)(?=\\s+monto\\s*:|[;\\n\\r]|$)/i)?.[1] ?? '') || null;\n  return { ...money, rawMerchant: merchant, direction: 'OUT', semanticType: 'EXPENSE' };",
  'adapter.interbankMerchantBoundary'
);
fs.writeFileSync(adaptersPath, adapters);

console.log('FINANCESENSOR_GMAIL_HISTORICAL_WIRING=PASS');
