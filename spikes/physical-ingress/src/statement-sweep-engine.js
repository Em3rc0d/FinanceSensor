import { StatementProviderProfile } from './statement-source-adapters.js';
import { reconcileStatementProfileLayout } from './statement-layout-reconciliation.js';

export const SWEEP_PROFILE_ORDER = Object.freeze([
  StatementProviderProfile.BCP_SAVINGS_REQUESTED,
  StatementProviderProfile.INTERBANK_SAVINGS_REQUESTED,
  StatementProviderProfile.BCP_CREDIT,
  StatementProviderProfile.RIPLEY_CREDIT
]);

export const SWEEP_SUPPORTED_PROFILES = new Set(SWEEP_PROFILE_ORDER);

function validRows(rows = []) {
  return Array.isArray(rows)
    && rows.length > 0
    && rows.every(row => Number.isFinite(Number(row?.amount))
      && Number(row.amount) > 0
      && Number.isFinite(Date.parse(String(row?.occurredAt ?? '')))
      && ['IN', 'OUT'].includes(row?.direction)
      && ['PEN', 'USD'].includes(row?.currency));
}

function structuralAudit(profile, parsed = {}) {
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
  const review = Array.isArray(parsed?.review) ? parsed.review : [];
  const payments = rows.filter(row => row?.semanticType === 'CARD_PAYMENT').length;
  const fees = rows.filter(row => row?.semanticType === 'FEE').length;
  const purchases = rows.filter(row => row?.semanticType === 'PURCHASE').length;
  const inflows = rows.filter(row => row?.direction === 'IN').length;
  const outflows = rows.filter(row => row?.direction === 'OUT').length;

  if (review.length > 0) {
    return {
      status: 'FAIL',
      code: String(review[0]?.code || 'STATEMENT_PROFILE_REVIEW_REQUIRED'),
      movements: rows.length,
      payments,
      fees,
      purchases,
      inflows,
      outflows
    };
  }
  if (!validRows(rows)) {
    return {
      status: 'FAIL',
      code: rows.length === 0 ? 'STATEMENT_LAYOUT_NO_MOVEMENTS' : 'STATEMENT_ROW_INTEGRITY',
      movements: rows.length,
      payments,
      fees,
      purchases,
      inflows,
      outflows
    };
  }
  return {
    profileId: profile,
    status: 'PASS',
    code: 'STATEMENT_PROFILE_PARSE_PASS',
    movements: rows.length,
    payments,
    fees,
    purchases,
    inflows,
    outflows
  };
}

export function auditSweepProfile({ providerProfile, pages = [], parsed = {} } = {}) {
  if (providerProfile === StatementProviderProfile.BCP_SAVINGS_REQUESTED) {
    const result = reconcileStatementProfileLayout({
      providerProfile,
      pages,
      rows: parsed?.rows ?? []
    });
    return {
      profileId: providerProfile,
      status: result.status,
      code: result.code,
      movements: Number(result.movementRows ?? parsed?.rows?.length ?? 0),
      payments: 0,
      fees: (parsed?.rows ?? []).filter(row => row?.semanticType === 'FEE').length,
      purchases: 0,
      inflows: Number(result.inflowRows ?? 0),
      outflows: Number(result.outflowRows ?? 0)
    };
  }
  return structuralAudit(providerProfile, parsed);
}

export function summarizeSweep(entries = []) {
  const profileMap = new Map();
  for (const profile of SWEEP_PROFILE_ORDER) {
    profileMap.set(profile, {
      profile,
      selected: 0,
      audited: 0,
      pass: 0,
      open: 0,
      fail: 0,
      parserFailures: 0,
      pages: 0,
      movements: 0,
      payments: 0,
      fees: 0,
      purchases: 0,
      inflows: 0,
      outflows: 0,
      codes: {}
    });
  }

  for (const entry of entries) {
    const group = profileMap.get(entry.profile) ?? {
      profile: entry.profile,
      selected: 0, audited: 0, pass: 0, open: 0, fail: 0, parserFailures: 0,
      pages: 0, movements: 0, payments: 0, fees: 0, purchases: 0, inflows: 0, outflows: 0, codes: {}
    };
    group.selected += 1;
    group.pages += Number(entry.pages ?? 0);
    if (entry.parserFailure) group.parserFailures += 1;
    else group.audited += 1;
    if (entry.status === 'PASS') group.pass += 1;
    else if (entry.status === 'OPEN') group.open += 1;
    else group.fail += 1;
    group.movements += Number(entry.movements ?? 0);
    group.payments += Number(entry.payments ?? 0);
    group.fees += Number(entry.fees ?? 0);
    group.purchases += Number(entry.purchases ?? 0);
    group.inflows += Number(entry.inflows ?? 0);
    group.outflows += Number(entry.outflows ?? 0);
    const code = String(entry.code ?? 'UNKNOWN');
    group.codes[code] = (group.codes[code] ?? 0) + 1;
    profileMap.set(entry.profile, group);
  }

  const profiles = [...profileMap.values()].filter(group => group.selected > 0);
  return {
    selected: profiles.reduce((sum, group) => sum + group.selected, 0),
    audited: profiles.reduce((sum, group) => sum + group.audited, 0),
    pass: profiles.reduce((sum, group) => sum + group.pass, 0),
    open: profiles.reduce((sum, group) => sum + group.open, 0),
    fail: profiles.reduce((sum, group) => sum + group.fail, 0),
    parserFailures: profiles.reduce((sum, group) => sum + group.parserFailures, 0),
    pages: profiles.reduce((sum, group) => sum + group.pages, 0),
    movements: profiles.reduce((sum, group) => sum + group.movements, 0),
    profiles
  };
}
