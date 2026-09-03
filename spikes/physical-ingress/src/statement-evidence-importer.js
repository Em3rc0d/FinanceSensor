import {
  evidenceToCandidate,
  resolveCandidates,
  stableEvidenceKey
} from '../../canonical-resolver/src/resolver.js';
import { evidenceAuthorityRank } from './transaction-evidence-adapters.js';

function defaultStatementCoverage() {
  return {
    status: 'NOT_STARTED',
    statementsParsed: 0,
    statementEvidenceCreated: 0,
    creditStatementsParsed: 0,
    debitStatementsParsed: 0,
    inflowEvidenceCreated: 0,
    outflowEvidenceCreated: 0,
    ambiguousEvidenceCreated: 0,
    lastImportAt: null
  };
}

function statementRank(evidence) {
  if (evidence?.evidenceClass === 'BANK_STATEMENT') return 350;
  return evidenceAuthorityRank(evidence);
}

function ensureState(value) {
  const state = value && typeof value === 'object' ? structuredClone(value) : {};
  state.evidence = Array.isArray(state.evidence) ? state.evidence : [];
  state.canonical = Array.isArray(state.canonical) ? state.canonical : [];
  state.review = Array.isArray(state.review) ? state.review : [];
  state.statementCoverage = { ...defaultStatementCoverage(), ...(state.statementCoverage ?? {}) };
  return state;
}

export class StatementEvidenceImporter {
  constructor({ vault, now = () => new Date().toISOString() }) {
    if (!vault?.read || !vault?.write) throw new Error('statement importer requires encrypted local vault');
    this.vault = vault;
    this.now = now;
  }

  _rebuild(state) {
    const ordered = [...state.evidence].sort((a, b) => {
      const rank = statementRank(b) - statementRank(a);
      if (rank !== 0) return rank;
      const time = String(a.occurredAt ?? '').localeCompare(String(b.occurredAt ?? ''));
      if (time !== 0) return time;
      return stableEvidenceKey(a).localeCompare(stableEvidenceKey(b));
    });
    const result = resolveCandidates(ordered.map(evidenceToCandidate));
    state.canonical = result.canonical;
    state.review = result.review;
  }

  importEvidence({ evidence, sourceClass }) {
    if (!Array.isArray(evidence)) throw new Error('STATEMENT_EVIDENCE_ARRAY_REQUIRED');
    const state = ensureState(this.vault.read());
    const existing = new Set(state.evidence.map(stableEvidenceKey));
    let added = 0;

    for (const item of evidence) {
      const key = stableEvidenceKey(item);
      if (existing.has(key)) continue;
      state.evidence.push(item);
      existing.add(key);
      added += 1;
      if (item.direction === 'IN') state.statementCoverage.inflowEvidenceCreated += 1;
      else if (item.direction === 'OUT') state.statementCoverage.outflowEvidenceCreated += 1;
      else state.statementCoverage.ambiguousEvidenceCreated += 1;
    }

    state.statementCoverage.status = 'PARTIAL_PERIOD_COVERAGE';
    state.statementCoverage.statementsParsed += 1;
    state.statementCoverage.statementEvidenceCreated += added;
    if (sourceClass === 'CREDIT_STATEMENT_AUTO') state.statementCoverage.creditStatementsParsed += 1;
    if (sourceClass === 'DEBIT_STATEMENT_MANUAL_REQUEST') state.statementCoverage.debitStatementsParsed += 1;
    state.statementCoverage.lastImportAt = this.now();
    this._rebuild(state);
    this.vault.write(state);

    return {
      addedEvidence: added,
      canonicalCount: state.canonical.length,
      reviewCount: state.review.length,
      statementCoverage: structuredClone(state.statementCoverage)
    };
  }
}
