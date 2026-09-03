import {
  candidateFingerprint,
  normalizeMerchant,
  resolveCandidates,
  stableEvidenceKey
} from '../../canonical-resolver/src/resolver.js';
import {
  classifyTransactionMetadata,
  evidenceAuthorityRank,
  extractAdaptedFinancialEvidence
} from './transaction-evidence-adapters.js';

function defaultBootstrap() {
  return {
    mode: 'ALL_AVAILABLE_ACTIVE_MAILBOX',
    status: 'NOT_STARTED',
    nextPageToken: null,
    pagesCompleted: 0,
    messagesEnumerated: 0,
    metadataInspected: 0,
    fullMessagesFetched: 0,
    financialEvidenceCreated: 0,
    nonCandidates: 0,
    adapterMatches: 0,
    reviewCandidates: 0,
    highestMessageHistoryId: null,
    restartedFromInvalidCursor: 0,
    includeSpamTrash: false
  };
}

function defaultState() {
  return {
    historyCursor: null,
    historyCursorSource: null,
    evidence: [],
    processedSourceIds: [],
    canonical: [],
    review: [],
    historicalBootstrap: defaultBootstrap(),
    metrics: {
      rawBodiesRetained: 0,
      rawAttachmentsRetained: 0,
      plaintextFinancialCloudBytes: 0
    }
  };
}

function ensureState(value) {
  const base = defaultState();
  const input = value ?? {};
  return {
    ...base,
    ...input,
    evidence: Array.isArray(input.evidence) ? input.evidence : [],
    processedSourceIds: Array.isArray(input.processedSourceIds) ? input.processedSourceIds : [],
    canonical: Array.isArray(input.canonical) ? input.canonical : [],
    review: Array.isArray(input.review) ? input.review : [],
    historicalBootstrap: { ...base.historicalBootstrap, ...(input.historicalBootstrap ?? {}) },
    metrics: { ...base.metrics, ...(input.metrics ?? {}) }
  };
}

function maxHistoryId(a, b) {
  if (!b || !/^\d+$/.test(String(b))) return a ?? null;
  if (!a || !/^\d+$/.test(String(a))) return String(b);
  try {
    return BigInt(String(b)) > BigInt(String(a)) ? String(b) : String(a);
  } catch {
    return a;
  }
}

async function forEachConcurrent(items, limit, worker) {
  if (!items.length) return;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

function durableEvidence(sourceMessageId, extracted) {
  return {
    tenantId: 'tenant-ingress',
    sourceType: 'GMAIL',
    sourceMessageId: String(sourceMessageId),
    occurredAt: extracted.occurredAt,
    amount: extracted.amount,
    currency: extracted.currency,
    rawMerchant: extracted.rawMerchant ?? null,
    direction: extracted.direction ?? null,
    semanticType: extracted.semanticType ?? 'UNKNOWN',
    confidence: extracted.confidence ?? 0.7,
    references: extracted.references ?? {},
    evidenceClass: extracted.evidenceClass,
    adapterId: extracted.adapterId
  };
}

function toCandidate(item) {
  const candidate = {
    tenantId: item.tenantId,
    evidenceIds: [stableEvidenceKey(item)],
    sourceTypes: [item.sourceType],
    evidenceChannels: item.evidenceClass ? [item.evidenceClass] : [],
    accountId: item.accountId ?? null,
    instrumentId: item.instrumentId ?? null,
    amount: Math.abs(Number(item.amount)),
    currency: item.currency,
    flowDirection: item.direction ?? null,
    occurredAt: item.occurredAt,
    rawMerchant: item.rawMerchant ?? null,
    merchantCanonical: normalizeMerchant(item.rawMerchant ?? ''),
    semanticType: item.semanticType ?? 'UNKNOWN',
    state: 'CANDIDATE',
    confidence: item.confidence ?? 0.7,
    references: item.references ?? {}
  };
  candidate.fingerprint = candidateFingerprint(candidate);
  return candidate;
}

export class HistoricalGmailImporter {
  constructor({ provider, vault, credentials = null, telemetry = null }) {
    if (!provider?.listMessagePage || !provider?.getMessage) throw new Error('historical importer requires paged Gmail provider');
    if (!vault?.read || !vault?.write) throw new Error('historical importer requires encrypted local vault');
    this.provider = provider;
    this.vault = vault;
    this.credentials = credentials;
    this.telemetry = telemetry;
  }

  _requireAuth() {
    if (this.credentials?.requireToken) this.credentials.requireToken();
  }

  _load() {
    return ensureState(this.vault.read());
  }

  _save(state) {
    this.vault.write(state);
  }

  _rebuildCanonical(state) {
    const ordered = [...state.evidence].sort((a, b) => {
      const rank = evidenceAuthorityRank(b) - evidenceAuthorityRank(a);
      if (rank !== 0) return rank;
      return String(a.occurredAt ?? '').localeCompare(String(b.occurredAt ?? ''));
    });
    const result = resolveCandidates(ordered.map(toCandidate));
    state.canonical = result.canonical;
    state.review = result.review;
    state.historicalBootstrap.reviewCandidates = result.review.length;
  }

  async _processMessage(id, state, processed) {
    if (processed.has(id)) return;

    const metadata = await this.provider.getMessage({
      id,
      format: 'METADATA',
      metadataHeaders: ['From', 'Date', 'Subject']
    });
    state.historicalBootstrap.metadataInspected += 1;
    state.historicalBootstrap.highestMessageHistoryId = maxHistoryId(
      state.historicalBootstrap.highestMessageHistoryId,
      metadata.historyId
    );

    const metadataDecision = classifyTransactionMetadata(metadata.headers);
    if (!metadataDecision.candidate) {
      state.historicalBootstrap.nonCandidates += 1;
      processed.add(id);
      return;
    }

    state.historicalBootstrap.adapterMatches += 1;
    const full = await this.provider.getMessage({ id, format: 'FULL' });
    state.historicalBootstrap.fullMessagesFetched += 1;
    state.historicalBootstrap.highestMessageHistoryId = maxHistoryId(
      state.historicalBootstrap.highestMessageHistoryId,
      full.historyId
    );

    const extracted = extractAdaptedFinancialEvidence(full, metadataDecision);
    if (extracted) {
      state.evidence.push(durableEvidence(id, extracted));
      state.historicalBootstrap.financialEvidenceCreated += 1;
    }
    processed.add(id);
  }

  async runAllAvailableActiveMailbox({
    pageSize = 100,
    maxPagesPerRun = Number.POSITIVE_INFINITY,
    messageConcurrency = 6
  } = {}) {
    this._requireAuth();
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) throw new Error('pageSize must be 1..500');
    if (!Number.isInteger(messageConcurrency) || messageConcurrency < 1 || messageConcurrency > 10) {
      throw new Error('messageConcurrency must be 1..10');
    }
    if (!(Number.isFinite(maxPagesPerRun) || maxPagesPerRun === Number.POSITIVE_INFINITY) || maxPagesPerRun <= 0) {
      throw new Error('maxPagesPerRun must be positive');
    }

    const state = this._load();
    const bootstrap = state.historicalBootstrap;
    if (bootstrap.status === 'COMPLETE') return structuredClone(state);

    bootstrap.mode = 'ALL_AVAILABLE_ACTIVE_MAILBOX';
    bootstrap.includeSpamTrash = false;
    bootstrap.status = 'RUNNING';
    const processed = new Set(state.processedSourceIds);
    let pageToken = bootstrap.nextPageToken || undefined;
    let pagesThisRun = 0;
    let restartedThisRun = false;

    while (pagesThisRun < maxPagesPerRun) {
      let page;
      try {
        page = await this.provider.listMessagePage({
          maxResults: pageSize,
          pageToken,
          includeSpamTrash: false
        });
      } catch (error) {
        if (pageToken && error?.status === 400 && !restartedThisRun) {
          pageToken = undefined;
          bootstrap.nextPageToken = null;
          bootstrap.restartedFromInvalidCursor += 1;
          restartedThisRun = true;
          this._save(state);
          continue;
        }
        throw error;
      }

      const messages = Array.isArray(page.messages) ? page.messages : [];
      bootstrap.messagesEnumerated += messages.length;
      const uniqueIds = [...new Set(messages.map(item => item?.id ? String(item.id) : null).filter(Boolean))];
      await forEachConcurrent(uniqueIds, messageConcurrency, async id => {
        await this._processMessage(id, state, processed);
      });

      state.processedSourceIds = [...processed];
      bootstrap.pagesCompleted += 1;
      pagesThisRun += 1;
      pageToken = page.nextPageToken || undefined;
      bootstrap.nextPageToken = pageToken ?? null;
      this._rebuildCanonical(state);
      this._save(state);

      this.telemetry?.emit?.('ingress.historical.page.complete', {
        pagesCompleted: bootstrap.pagesCompleted,
        messagesEnumerated: bootstrap.messagesEnumerated,
        metadataInspected: bootstrap.metadataInspected,
        financialEvidenceCreated: bootstrap.financialEvidenceCreated,
        reviewCandidates: bootstrap.reviewCandidates
      });

      if (!pageToken) {
        if (!bootstrap.highestMessageHistoryId) {
          bootstrap.status = 'COMPLETE_NO_INCREMENTAL_ANCHOR';
          state.historyCursor = null;
          state.historyCursorSource = null;
        } else {
          bootstrap.status = 'COMPLETE';
          state.historyCursor = bootstrap.highestMessageHistoryId;
          state.historyCursorSource = 'MESSAGE_DERIVED_HISTORY_ID';
        }
        bootstrap.nextPageToken = null;
        this._rebuildCanonical(state);
        this._save(state);
        return structuredClone(state);
      }
    }

    bootstrap.status = 'PAUSED';
    bootstrap.nextPageToken = pageToken ?? null;
    this._rebuildCanonical(state);
    this._save(state);
    return structuredClone(state);
  }

  projection() {
    const state = this._load();
    return {
      coverage: structuredClone(state.historicalBootstrap),
      historyCursorSource: state.historyCursorSource,
      transactions: [...state.canonical]
        .sort((a, b) => String(b.occurredAt ?? '').localeCompare(String(a.occurredAt ?? '')))
        .map(item => ({
          id: item.id,
          occurredAt: item.occurredAt,
          amount: item.amount,
          currency: item.currency,
          direction: item.flowDirection,
          merchant: item.merchantCanonical || item.rawMerchant || null,
          semanticType: item.semanticType,
          confidence: item.confidence,
          evidenceCount: item.evidenceIds?.length ?? 0
        })),
      reviewCount: state.review.length
    };
  }
}
