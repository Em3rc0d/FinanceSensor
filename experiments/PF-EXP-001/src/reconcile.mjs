/**
 * PF-EXP-001 — pure, fail-closed, statement reconciliation PRECHECK.
 * No provider parser; no filesystem, network, secrets, AI, or bank integrations.
 * All amounts: signed integer minor currency units, summed with BigInt.
 * Returns sanitized aggregate diagnostics only, NEVER the rows or balances.
 * Precheck does not validate source document authenticity or reviewer independence.
 */

const SOURCE_CLASSES = new Set(['BCP_SAVINGS', 'RIPLEY_CREDIT']);
const CURRENCIES = new Set(['PEN', 'USD']);
const validMoney = value => typeof value === 'number' && Number.isSafeInteger(value);
const validDay = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const safeObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

const blank = () => ({
  schema: 'PF_EXP_001_RECONCILIATION_PRECHECK_V1',
  status: 'BLOCKED',
  errors: [],
  counts: { expected: 0, observed: 0, matched: 0, missing: 0, unexpected: 0, disputed: 0 },
  balanceEquationMatches: false,
  rowIdentityMatches: false,
  sourceCompletenessClaimed: false,
  gates: { C0: 'BLOCKED', G0: 'NOT_RUN', G1: 'NOT_RUN', G2: 'NOT_RUN', G3: 'NOT_RUN', G4: 'NOT_RUN' },
  disclaimer: 'Precheck only; no source authentication, independent human oracle or financial gate certification.'
});

/** Inputs must be private and local. Only sanitized result can leave the owner device. */
export function reconcilePrecheck({ scope, oracle, observedRows, runMode } = {}) {
  const out = blank();
  const issues = new Set();
  const fail = code => issues.add(code);
  const isSynthetic = runMode === 'SYNTHETIC';
  if (!isSynthetic && runMode !== 'PRIVATE_DEV' && runMode !== 'PRIVATE_ACCEPTANCE') fail('UNSUPPORTED_RUN_MODE');
  if (!safeObject(scope) || !safeObject(oracle)) {
    fail('SCOPE_OR_ORACLE_MISSING');
    out.errors = [...issues];
    return out;
  }
  if (!SOURCE_CLASSES.has(scope.sourceClass)) fail('SOURCE_CLASS_INVALID');
  if (!CURRENCIES.has(scope.currency)) fail('CURRENCY_INVALID');
  if (typeof scope.accountAlias !== 'string' || !scope.accountAlias.trim()) fail('ACCOUNT_ALIAS_MISSING');
  const period = scope.period;
  if (!safeObject(period) || !validDay(period.start) || !validDay(period.end) || period.start > period.end) fail('PERIOD_INVALID');
  if (scope.documentComplete !== true) fail('SOURCE_INCOMPLETE_OR_UNVERIFIED');
  if (scope.sourceRowsIndependentlyEnumerated !== true) fail('ROW_UNIVERSE_UNVERIFIED');
  const convention = scope.balanceConvention;
  const expectedModel = scope.sourceClass === 'BCP_SAVINGS' ? 'DEPOSIT_DELTA' : 'CREDIT_DEBT_DELTA';
  if (!safeObject(convention) || convention.kind !== expectedModel || convention.verifiedAgainstSource !== true) {
    fail('BALANCE_CONVENTION_UNVERIFIED');
  }
  if (oracle.origin !== 'INDEPENDENT_MANUAL' || oracle.copiedFromParser !== false ||
      typeof oracle.reviewerAlias !== 'string' || !oracle.reviewerAlias.trim()) fail('ORACLE_INDEPENDENCE_UNVERIFIED');
  if (oracle.accountAlias !== scope.accountAlias || oracle.currency !== scope.currency) fail('ORACLE_SCOPE_MISMATCH');
  if (!validMoney(oracle.openingMinorUnits) || !validMoney(oracle.closingMinorUnits) ||
      !validMoney(oracle.adjustmentsMinorUnits)) fail('ORACLE_BALANCE_INVALID');

  if (!Array.isArray(oracle.rows)) fail('ORACLE_ROWS_MISSING');
  if (!Array.isArray(observedRows)) fail('OBSERVED_ROWS_MISSING');
  const rows = Array.isArray(oracle.rows) ? oracle.rows : [];
  const observed = Array.isArray(observedRows) ? observedRows : [];
  out.counts.expected = rows.length;
  out.counts.observed = observed.length;
  if (rows.length === 0 && scope.zeroActivityIndependentlyConfirmed !== true) fail('EMPTY_ORACLE_UNCONFIRMED');

  const checkRow = (row, kind, seen) => {
    if (!safeObject(row) || typeof row.rowRef !== 'string' || !row.rowRef.trim()) {
      fail(kind + '_ROW_INVALID'); return null;
    }
    if (seen.has(row.rowRef)) fail(kind + '_DUPLICATE_ROW');
    seen.add(row.rowRef);
    if (!validMoney(row.signedMinorUnits)) fail(kind + '_AMOUNT_INVALID');
    if (row.currency !== scope.currency || row.accountAlias !== scope.accountAlias) fail(kind + '_SCOPE_MISMATCH');
    if (!validDay(row.postingDate) || !safeObject(period) || row.postingDate < period.start || row.postingDate > period.end) {
      fail(kind + '_DATE_OUT_OF_SCOPE');
    }
    if (kind === 'OBSERVED' && row.state !== 'RESOLVED') fail('UNRESOLVED_OBSERVATION');
    return row;
  };
  const referenceById = new Map();
  const obsById = new Map();
  const sourceIds = new Set();
  for (const r of rows) {
    const x = checkRow(r, 'ORACLE', sourceIds);
    if (x) referenceById.set(x.rowRef, x);
  }
  sourceIds.clear();
  for (const r of observed) {
    const x = checkRow(r, 'OBSERVED', sourceIds);
    if (x) obsById.set(x.rowRef, x);
  }
  for (const [id, expected] of referenceById) {
    const got = obsById.get(id);
    if (!got) { out.counts.missing++; continue; }
    if (expected.signedMinorUnits !== got.signedMinorUnits || expected.currency !== got.currency ||
        expected.accountAlias !== got.accountAlias || expected.postingDate !== got.postingDate) {
      out.counts.disputed++;
    } else {
      out.counts.matched++;
    }
  }
  for (const id of obsById.keys()) {
    if (!referenceById.has(id)) out.counts.unexpected++;
  }
  if (out.counts.missing) fail('ORACLE_ROWS_MISSING_IN_OUTPUT');
  if (out.counts.unexpected) fail('OUTPUT_ROWS_NOT_IN_ORACLE');
  if (out.counts.disputed) fail('ROW_DETAILS_DISAGREE');
  out.rowIdentityMatches = out.counts.expected === out.counts.observed &&
    out.counts.missing === 0 && out.counts.unexpected === 0 && out.counts.disputed === 0 &&
    !issues.has('ORACLE_DUPLICATE_ROW') && !issues.has('OBSERVED_DUPLICATE_ROW');
  if (rows.every(x => safeObject(x) && validMoney(x.signedMinorUnits)) &&
      validMoney(oracle.openingMinorUnits) && validMoney(oracle.closingMinorUnits) &&
      validMoney(oracle.adjustmentsMinorUnits)) {
    const total = rows.reduce((x, row) => x + BigInt(row.signedMinorUnits), 0n);
    out.balanceEquationMatches = BigInt(oracle.openingMinorUnits) + total +
      BigInt(oracle.adjustmentsMinorUnits) === BigInt(oracle.closingMinorUnits);
    if (!out.balanceEquationMatches) fail('ORACLE_BALANCE_EQUATION_MISMATCH');
  }
  if (!out.rowIdentityMatches) fail('ROW_SET_NOT_IDENTICAL');
  out.sourceCompletenessClaimed = scope.documentComplete === true &&
    scope.sourceRowsIndependentlyEnumerated === true &&
    (!(!rows.length) || scope.zeroActivityIndependentlyConfirmed === true);
  out.errors = [...issues].sort();
  // This is strictly a technical precheck. A JSON flag cannot approve a gate.
  if (!out.errors.length) {
    out.status = isSynthetic ? 'SYNTHETIC_PRECHECK_PASS' : 'PRECHECK_OK_HUMAN_ATTESTATION_REQUIRED';
  }
  return out;
}
