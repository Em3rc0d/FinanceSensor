import { HistoryExpiredError } from './provider.js';

const DEFAULT_QUOTA_BUDGET_PER_MINUTE = 4800;
const DEFAULT_QUOTA_WINDOW_MS = 60_000;
const DEFAULT_MAX_RETRIES = 5;
const SAFE_GMAIL_REASONS = new Map([
  ['rateLimitExceeded', 'RATE_LIMIT_EXCEEDED'],
  ['userRateLimitExceeded', 'USER_RATE_LIMIT_EXCEEDED'],
  ['dailyLimitExceeded', 'DAILY_LIMIT_EXCEEDED'],
  ['domainPolicy', 'DOMAIN_POLICY']
]);
const RETRYABLE_403_REASONS = new Set(['RATE_LIMIT_EXCEEDED', 'USER_RATE_LIMIT_EXCEEDED']);

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

function quotaUnitsFor(path) {
  if (path === '/profile') return 1;
  if (path === '/history') return 2;
  if (path === '/messages') return 5;
  if (/^\/messages\/[^/]+$/.test(path)) return 20;
  return 20;
}

function safeReasonFromPayload(payload) {
  const errors = Array.isArray(payload?.error?.errors) ? payload.error.errors : [];
  const rawReason = errors.map(item => item?.reason).find(Boolean);
  return SAFE_GMAIL_REASONS.get(String(rawReason ?? '')) ?? 'UNKNOWN';
}

async function sanitizedApiError(response) {
  const safeStatus = Number.isInteger(Number(response?.status)) ? Number(response.status) : 0;
  let reason = 'UNKNOWN';
  try {
    const raw = await response.text();
    if (raw) reason = safeReasonFromPayload(JSON.parse(raw));
  } catch {
    reason = 'UNKNOWN';
  }

  const error = new Error(`Gmail API request failed with status ${safeStatus || 'unknown'}`);
  error.code = safeStatus === 401
    ? 'REAUTH_REQUIRED'
    : safeStatus === 403 && reason !== 'UNKNOWN'
      ? `GMAIL_API_HTTP_403_${reason}`
      : `GMAIL_API_HTTP_${safeStatus || 'UNKNOWN'}`;
  error.status = safeStatus || null;
  error.reason = reason;
  error.retryable = [429, 500, 502, 503, 504].includes(safeStatus)
    || (safeStatus === 403 && RETRYABLE_403_REASONS.has(reason));
  return error;
}

function sanitizedNetworkError() {
  const error = new Error('Gmail network request failed');
  error.code = 'GMAIL_NETWORK_ERROR';
  error.status = null;
  error.reason = 'NETWORK';
  error.retryable = true;
  return error;
}

function safeCount(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

const defaultSleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export class GmailRestProvider {
  constructor({
    accessToken,
    credentialProvider,
    fetchImpl = globalThis.fetch,
    userId = 'me',
    quotaBudgetPerMinute = DEFAULT_QUOTA_BUDGET_PER_MINUTE,
    quotaWindowMs = DEFAULT_QUOTA_WINDOW_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    sleepImpl = defaultSleep,
    nowImpl = Date.now,
    randomImpl = Math.random
  }) {
    if (!accessToken && !credentialProvider) throw new Error('Gmail access token or credential provider required');
    if (credentialProvider && typeof credentialProvider.getAccessToken !== 'function') {
      throw new Error('credentialProvider.getAccessToken required');
    }
    if (typeof fetchImpl !== 'function') throw new Error('fetch implementation required');
    if (!Number.isFinite(quotaBudgetPerMinute) || quotaBudgetPerMinute <= 0) throw new Error('quotaBudgetPerMinute must be positive');
    if (!Number.isFinite(quotaWindowMs) || quotaWindowMs <= 0) throw new Error('quotaWindowMs must be positive');
    if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 8) throw new Error('maxRetries must be 0..8');
    if (typeof sleepImpl !== 'function' || typeof nowImpl !== 'function' || typeof randomImpl !== 'function') {
      throw new Error('quota/retry clock dependencies must be functions');
    }
    this.accessToken = accessToken ? String(accessToken) : null;
    this.credentialProvider = credentialProvider ?? null;
    this.fetch = fetchImpl;
    this.userId = userId;
    this.base = `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(userId)}`;
    this.calls = [];
    this.quotaBudgetPerMinute = Number(quotaBudgetPerMinute);
    this.quotaWindowMs = Number(quotaWindowMs);
    this.maxRetries = maxRetries;
    this.sleep = sleepImpl;
    this.now = nowImpl;
    this.random = randomImpl;
    this.nextQuotaAt = 0;
    this.quotaGate = Promise.resolve();
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

  async _acquireQuota(cost) {
    let release;
    const previous = this.quotaGate;
    this.quotaGate = new Promise(resolve => { release = resolve; });
    await previous;
    try {
      const now = Number(this.now());
      const scheduledAt = Math.max(now, this.nextQuotaAt);
      const waitMs = Math.max(0, scheduledAt - now);
      const spacingMs = (Math.max(1, Number(cost)) / this.quotaBudgetPerMinute) * this.quotaWindowMs;
      this.nextQuotaAt = scheduledAt + spacingMs;
      if (waitMs > 0) await this.sleep(waitMs);
    } finally {
      release();
    }
  }

  _backoffMs(attempt) {
    const base = Math.min(30_000, 2_000 * (2 ** attempt));
    const jitter = Math.floor(Math.max(0, Math.min(1, Number(this.random()) || 0)) * 250);
    return base + jitter;
  }

  async _request(path, query = {}) {
    const url = new URL(`${this.base}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) value.forEach(v => url.searchParams.append(key, v));
      else url.searchParams.set(key, String(value));
    }
    this.calls.push({ path, query: structuredClone(query) });
    const quotaCost = quotaUnitsFor(path);

    for (let attempt = 0; ; attempt += 1) {
      await this._acquireQuota(quotaCost);
      const token = await this._token();
      let response;
      try {
        response = await this.fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {
        const error = sanitizedNetworkError();
        if (attempt < this.maxRetries) {
          await this.sleep(this._backoffMs(attempt));
          continue;
        }
        error.retryAttempts = attempt;
        throw error;
      }

      if (response.ok) return response.json();
      if (response.status === 404 && path === '/history') throw new HistoryExpiredError('Gmail historyId expired');

      const error = await sanitizedApiError(response);
      if (response.status === 401 && this.credentialProvider?.onUnauthorized) {
        await this.credentialProvider.onUnauthorized({ status: 401 });
      }
      if (error.retryable && attempt < this.maxRetries) {
        await this.sleep(this._backoffMs(attempt));
        continue;
      }
      error.retryAttempts = attempt;
      throw error;
    }
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
