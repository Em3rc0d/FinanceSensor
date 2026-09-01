export class HistoryExpiredError extends Error {
  constructor(message = 'history cursor expired') {
    super(message);
    this.name = 'HistoryExpiredError';
    this.code = 404;
  }
}

export class SyntheticMailProvider {
  constructor(messages = []) {
    this.messages = new Map(messages.map(m => [m.id, structuredClone(m)]));
    this.history = [];
    this.calls = [];
    this.currentHistoryId = 1;
    this.minimumHistoryId = 1;
  }

  _record(op, payload = {}) {
    this.calls.push({ op, ...payload });
  }

  listMessages({ after }) {
    this._record('messages.list', { after });
    return [...this.messages.values()]
      .filter(m => !after || new Date(m.internalDate) >= new Date(after))
      .map(m => ({ id: m.id, threadId: m.threadId ?? m.id }));
  }

  getMessage({ id, format, metadataHeaders = [] }) {
    const msg = this.messages.get(id);
    if (!msg) throw new Error(`unknown message ${id}`);
    this._record('messages.get', { id, format, metadataHeaders });
    if (format === 'METADATA') {
      const headers = {};
      for (const key of metadataHeaders) {
        const normalized = key.toLowerCase();
        if (normalized === 'from') headers.From = msg.from;
        if (normalized === 'date') headers.Date = msg.internalDate;
        if (normalized === 'subject') headers.Subject = msg.subject;
      }
      return { id: msg.id, historyId: String(msg.historyId ?? this.currentHistoryId), headers };
    }
    if (format === 'FULL') {
      return {
        id: msg.id,
        historyId: String(msg.historyId ?? this.currentHistoryId),
        headers: { From: msg.from, Date: msg.internalDate, Subject: msg.subject },
        body: msg.body,
        attachments: msg.attachments ?? []
      };
    }
    throw new Error(`unsupported format ${format}`);
  }

  addMessage(message) {
    this.currentHistoryId += 1;
    const msg = { ...structuredClone(message), historyId: this.currentHistoryId };
    this.messages.set(msg.id, msg);
    this.history.push({ historyId: this.currentHistoryId, messageId: msg.id });
    return this.currentHistoryId;
  }

  listHistory({ startHistoryId }) {
    const start = Number(startHistoryId);
    this._record('history.list', { startHistoryId: String(startHistoryId) });
    if (!Number.isFinite(start) || start < this.minimumHistoryId) throw new HistoryExpiredError();
    return {
      history: this.history.filter(h => h.historyId > start),
      historyId: String(this.currentHistoryId)
    };
  }

  expireHistoryBefore(historyId) {
    this.minimumHistoryId = Number(historyId);
  }

  resetCalls() {
    this.calls = [];
  }
}
