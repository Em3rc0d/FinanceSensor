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

function contentIdFor(part) {
  const header = (part.headers ?? []).find(item => String(item.name).toLowerCase() === 'content-id');
  if (!header?.value) return null;
  return String(header.value).replace(/^<|>$/g, '') || null;
}

function collectAttachmentDescriptors(payload, output = []) {
  if (!payload) return output;
  const parts = Array.isArray(payload.parts) ? payload.parts : [];
  for (const part of parts) {
    const attachmentId = part.body?.attachmentId;
    if (attachmentId) {
      const contentId = contentIdFor(part);
      output.push({
        filename: part.filename || null,
        mimeType: part.mimeType || 'application/octet-stream',
        attachmentId,
        size: Number(part.body?.size ?? 0),
        inline: Boolean(contentId),
        contentId
      });
    }
    collectAttachmentDescriptors(part, output);
  }
  return output;
}

function sanitizedApiError(status) {
  const safeStatus = Number.isInteger(Number(status)) ? Number(status) : 0;
  const error = new Error(`Gmail API request failed with status ${safeStatus || 'unknown'}`);
  error.code = safeStatus === 401 ? 'REAUTH_REQUIRED' : `GMAIL_API_HTTP_${safeStatus || 'UNKNOWN'}`;
  error.status = safeStatus || null;
  error.retryable = [429, 500, 502, 503, 504].includes(safeStatus);
  return error;
}

function safeCount(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export class GmailRestProvider {
  constructor({ accessToken, credentialProvider, fetchImpl = globalThis.fetch, userId = 'me' }) {
    if (!accessToken && !credentialProvider) throw new Error('Gmail access token or credential provider required');
    if (credentialProvider && typeof credentialProvider.getAccessToken !== 'function') {
      throw new Error('credentialProvider.getAccessToken required');
    }
    if (typeof fetchImpl !== 'function') throw new Error('fetch implementation required');
    this.accessToken = accessToken ? String(accessToken) : null;
    this.credentialProvider = credentialProvider ?? null;
    this.fetch = fetchImpl;
    this.userId = userId;
    this.base = `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(userId)}`;
    this.calls = [];
  }

  async _token() {
    const token = this.credentialProvider
      ? await this.credentialProvider.getAccessToken()
      : this.accessToken;
    if (!token) {
      const error = new Error('Gmail source authorization unavailable');
      error.code = 'REAUTH_REQUIRED';
      throw error;
    }
    return String(token);
  }

  async _request(path, query = {}) {
    const url = new URL(`${this.base}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) value.forEach(v => url.searchParams.append(key, v));
      else url.searchParams.set(key, String(value));
    }
    this.calls.push({ path, query: structuredClone(query) });
    const token = await this._token();
    const response = await this.fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      if (response.status === 404 && path === '/history') throw new HistoryExpiredError('Gmail historyId expired');
      if (response.status === 401 && this.credentialProvider?.onUnauthorized) {
        await this.credentialProvider.onUnauthorized({ status: 401 });
      }
      throw sanitizedApiError(response.status);
    }
    return response.json();
  }

  async listMessagePage({ query, labelIds = [], maxResults = 100, pageToken, includeSpamTrash = false }) {
    const boundedMax = Math.max(1, Math.min(500, Number(maxResults) || 100));
    const labels = Array.isArray(labelIds) ? labelIds.filter(Boolean).map(String) : [];
    const page = await this._request('/messages', {
      q: query ? String(query) : undefined,
      labelIds: labels,
      maxResults: boundedMax,
      pageToken: pageToken ? String(pageToken) : undefined,
      includeSpamTrash: Boolean(includeSpamTrash)
    });
    return {
      messages: Array.isArray(page.messages) ? page.messages.map(item => ({ id: item.id, threadId: item.threadId })) : [],
      nextPageToken: page.nextPageToken ?? null,
      resultSizeEstimate: safeCount(page.resultSizeEstimate)
    };
  }

  async listMessages({ after, query, labelIds = [], maxResults = 500 }) {
    const explicitQuery = typeof query === 'string' && query.trim() ? query.trim() : undefined;
    const date = new Date(after);
    const dateQuery = Number.isNaN(date.getTime()) ? undefined : `after:${date.toISOString().slice(0, 10).replaceAll('-', '/')}`;
    const q = explicitQuery ?? dateQuery;
    const labels = Array.isArray(labelIds) && labelIds.length ? labelIds.map(String) : undefined;
    const found = [];
    let pageToken;
    do {
      const page = await this._request('/messages', {
        q,
        labelIds: labels,
        maxResults: Math.min(500, maxResults - found.length),
        pageToken
      });
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
      attachments: collectAttachmentDescriptors(message.payload)
    };
  }

  async listHistory({ startHistoryId, maxResults = 500, historyTypes = ['messageAdded'] }) {
    const changes = [];
    const changed = [];
    const diagnostics = {
      historyRecordCount: 0,
      messageChangedCount: 0,
      messageAddedCount: 0,
      messageDeletedCount: 0,
      labelAddedCount: 0,
      labelRemovedCount: 0
    };
    let pageToken;
    let finalHistoryId = String(startHistoryId);
    const historyTypesQuery = Array.isArray(historyTypes) && historyTypes.length ? historyTypes : undefined;

    do {
      const page = await this._request('/history', {
        startHistoryId,
        historyTypes: historyTypesQuery,
        maxResults: Math.min(500, maxResults),
        pageToken
      });
      for (const history of page.history ?? []) {
        diagnostics.historyRecordCount += 1;
        const genericMessages = history.messages ?? [];
        const addedMessages = history.messagesAdded ?? [];
        const deletedMessages = history.messagesDeleted ?? [];
        const labelsAdded = history.labelsAdded ?? [];
        const labelsRemoved = history.labelsRemoved ?? [];
        diagnostics.messageChangedCount += genericMessages.length;
        diagnostics.messageAddedCount += addedMessages.length;
        diagnostics.messageDeletedCount += deletedMessages.length;
        diagnostics.labelAddedCount += labelsAdded.length;
        diagnostics.labelRemovedCount += labelsRemoved.length;
        for (const message of genericMessages) {
          if (message?.id) changed.push({ historyId: history.id, messageId: message.id });
        }
        for (const added of addedMessages) {
          if (added?.message?.id) changes.push({ historyId: history.id, messageId: added.message.id });
        }
      }
      finalHistoryId = page.historyId ?? finalHistoryId;
      pageToken = page.nextPageToken;
    } while (pageToken && changes.length < maxResults && diagnostics.historyRecordCount < maxResults);

    return {
      history: changes.slice(0, maxResults),
      changed: changed.slice(0, maxResults),
      historyId: String(finalHistoryId),
      diagnostics
    };
  }

  async getProfile() {
    const profile = await this._request('/profile');
    return {
      emailAddress: profile.emailAddress ? String(profile.emailAddress) : '',
      messagesTotal: safeCount(profile.messagesTotal),
      threadsTotal: safeCount(profile.threadsTotal),
      historyId: String(profile.historyId)
    };
  }

  async getCurrentHistoryId() {
    return (await this.getProfile()).historyId;
  }
}
