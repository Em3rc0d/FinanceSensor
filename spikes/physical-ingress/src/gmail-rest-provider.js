import { HistoryExpiredError } from './provider.js';

function decodeBase64Url(data = '') {
  const normalized = String(data).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function flattenBody(payload) {
  if (!payload) return '';
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  const parts = Array.isArray(payload.parts) ? payload.parts : [];
  const preferred = parts.find(p => p.mimeType === 'text/plain') ?? parts.find(p => p.mimeType === 'text/html');
  if (preferred) return flattenBody(preferred);
  return parts.map(flattenBody).filter(Boolean).join('\n');
}

function headersToObject(headers = []) {
  const out = {};
  for (const header of headers) out[header.name] = header.value;
  return out;
}

export class GmailRestProvider {
  constructor({ accessToken, fetchImpl = globalThis.fetch, userId = 'me' }) {
    if (!accessToken) throw new Error('Gmail access token required');
    if (typeof fetchImpl !== 'function') throw new Error('fetch implementation required');
    this.accessToken = accessToken;
    this.fetch = fetchImpl;
    this.userId = userId;
    this.base = `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(userId)}`;
    this.calls = [];
  }

  async _request(path, query = {}) {
    const url = new URL(`${this.base}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) value.forEach(v => url.searchParams.append(key, v));
      else url.searchParams.set(key, String(value));
    }
    this.calls.push({ path, query: structuredClone(query) });
    const response = await this.fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    if (!response.ok) {
      if (response.status === 404 && path === '/history') throw new HistoryExpiredError('Gmail historyId expired');
      const text = await response.text();
      throw new Error(`Gmail API ${response.status}: ${text.slice(0, 300)}`);
    }
    return response.json();
  }

  async listMessages({ after, maxResults = 500 }) {
    const date = new Date(after);
    const q = Number.isNaN(date.getTime()) ? undefined : `after:${date.toISOString().slice(0, 10).replaceAll('-', '/')}`;
    const found = [];
    let pageToken;
    do {
      const page = await this._request('/messages', { q, maxResults: Math.min(500, maxResults - found.length), pageToken });
      found.push(...(page.messages ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken && found.length < maxResults);
    return found.slice(0, maxResults);
  }

  async getMessage({ id, format, metadataHeaders = [] }) {
    const message = await this._request(`/messages/${encodeURIComponent(id)}`, {
      format,
      metadataHeaders: format === 'METADATA' ? metadataHeaders : undefined
    });
    const headers = headersToObject(message.payload?.headers ?? []);
    if (format === 'METADATA') return { id: message.id, historyId: message.historyId, headers };
    return {
      id: message.id,
      historyId: message.historyId,
      headers,
      body: flattenBody(message.payload),
      attachments: []
    };
  }

  async listHistory({ startHistoryId, maxResults = 500 }) {
    const changes = [];
    let pageToken;
    let finalHistoryId = String(startHistoryId);
    do {
      const page = await this._request('/history', { startHistoryId, historyTypes: 'messageAdded', maxResults: Math.min(500, maxResults), pageToken });
      for (const history of page.history ?? []) {
        for (const added of history.messagesAdded ?? []) changes.push({ historyId: history.id, messageId: added.message.id });
      }
      finalHistoryId = page.historyId ?? finalHistoryId;
      pageToken = page.nextPageToken;
    } while (pageToken && changes.length < maxResults);
    return { history: changes.slice(0, maxResults), historyId: String(finalHistoryId) };
  }

  async getCurrentHistoryId() {
    const profile = await this._request('/profile');
    return String(profile.historyId);
  }
}
