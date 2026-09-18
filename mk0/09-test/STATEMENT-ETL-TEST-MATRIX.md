# MK0 / 09 — Statement ETL and reconciliation test matrix

## Purpose

Define what must be proven before any bank statement profile, OCR fallback or monthly close can be promoted.

## Evidence discipline

```text
PARSER_UNIT_PASS != REAL_FORMAT_PASS
FORMAT_OBSERVED != REAL_ROW_PARSE_PASS
ONE_REAL_PDF_PASS != PROFILE_SUPPORTED
APK_BUILD_PASS != REAL_EECC_PASS
REAL_EECC_PASS != MULTI_BANK_RECONCILIATION_PASS
MULTI_BANK_RECONCILIATION_PASS != PRODUCTION_READY
```

## T0 — Contract/static

- machine-readable ETL graph parses;
- bank format registry parses;
- ADR-035 truth laws present;
- raw durable retention remains forbidden;
- OCR remains fallback, not mandatory primary;
- page boundaries remain structurally available before row parsing;
- active PDF content execution remains forbidden;
- only `TRANSACTION_LEDGER` pages are row-parser eligible by default;
- month close states remain distinct;
- `BUILD_READY=false` remains unchanged;
- no deferred iOS physical debt is silently promoted.

## T1 — Document classification

For every profile:

Positive fixtures:

- expected statement family;
- known period headings;
- masked account/instrument shape;
- valid page/section structure.

Negative fixtures:

- marketing PDF;
- insurance policy/contract;
- product brochure;
- payment receipt;
- unrelated attachment;
- another bank/product profile;
- corrupted/truncated PDF;
- **embedded educational/reference page containing transaction-looking dates and amounts**;
- debt/summary page with monetary values but no movement ledger.

Acceptance:

```text
KNOWN STATEMENT → expected profile
UNKNOWN/AMBIGUOUS → REVIEW/UNKNOWN
NON-STATEMENT → reject
```

Document identity must be coherent before row parsing. A filename or logo alone cannot select a financial adapter.

## T2 — Password and passive-PDF boundary

- correct synthetic password opens fixture;
- wrong password fails closed;
- empty password when required fails closed;
- password does not appear in logs;
- password does not appear in returned result object;
- password does not persist in app state;
- raw decrypted document does not persist;
- no claim of deterministic Dart string zeroization;
- PDF JavaScript/actions are never executed by the statement path;
- embedded executable/file actions are never followed;
- AcroForm/form values do not become transaction authority merely because they exist;
- active-content presence does not change financial semantics.

```text
PDF_ACTIVE_CONTENT != FINANCIAL_AUTHORITY
```

## T3 — Text acquisition and page identity

### Native PDF text

- all required pages enumerated;
- date/amount tokens survive extraction;
- statement headings detected;
- page order stable;
- **page boundaries preserved through extraction**;
- text quality gate accepts valid text.

### Page-role classification

Every extracted page is classified before any row regex/grammar is allowed to create movement candidates.

Roles:

```text
TRANSACTION_LEDGER
SUMMARY
INFORMATIONAL
EDUCATIONAL_REFERENCE
UNKNOWN
```

Required tests:

- ledger page can proceed;
- summary page produces zero ordinary movement rows by default;
- informational page produces zero movement rows;
- educational/reference sample page produces zero movement rows even when it contains dates and monetary-looking values;
- `UNKNOWN` page role fails closed rather than falling through to generic row parsing;
- multi-page ledger continuation remains eligible when the profile signature proves it is a continuation.

### OCR fallback

- native-text quality gate rejects scanned/flattened fixture;
- OCR activated only for required page/document;
- page identity is preserved through OCR fallback;
- OCR result passes page-role and adapter validation before normalization;
- low-confidence OCR does not create authoritative events;
- numeric ambiguity (`1/7`, `0/O`, decimal separators) produces review/failure instead of silent mutation.

## T4 — Locale and bank-specific token normalization

Generic cases:

- `1,234.56`;
- `1.234,56`;
- `S/ 1,234.56`;
- `USD 10.00`;
- negative signs;
- debit/credit columns;
- blank amount cells;
- trailing punctuation;
- dates with day/month ambiguity;
- month names;
- statement cycle crossing calendar month when applicable.

Real-format-derived synthetic cases:

### BCP savings

- day + month-abbreviation transaction dates;
- process date and value date retained distinctly;
- `CARGOS / DEBE` maps to balance decrease/outflow candidate as appropriate;
- `ABONOS / HABER` maps to balance increase/inflow candidate as appropriate;
- a page break does not terminate the ledger;
- opening balance, total movement and closing balance are not ordinary transaction rows.

### Interbank savings

- `Ingresos`, `Gastos` and `Saldo Contable` remain three distinct numeric roles;
- running balance is never selected as movement amount;
- positive/negative presentation does not override column semantics;
- educational sample rows are excluded.

### BCP credit

- process date and consumption date remain distinct;
- a trailing-sign payment representation normalizes as a card payment, not personal income;
- soles and dollars columns remain independent;
- debt summary/total billed amounts do not become ordinary purchases.

### Ripley credit

- ticket/reference column can be captured independently from description;
- optional TEA/TNA values are not movement amounts;
- installment count and installment capital/interest/total values are not mistaken for the current movement amount;
- points/rewards and formula-section values are excluded.

## T5 — Account-type semantics

### Savings/checking

- explicit credit → `INFLOW`;
- explicit debit → `OUTFLOW`;
- salary/received transfer can produce `INCOME` candidate;
- outgoing transfer produces transfer/outflow candidate;
- fee produces `FEE`;
- running balance never creates an event.

### Credit card

- purchase → `EXPENSE` candidate;
- payment → `CARD_PAYMENT`, never `INCOME`;
- refund → `REFUND`;
- fee/insurance/interest → correct non-income semantic family;
- statement balance changes never map to income by sign alone;
- installment metadata never creates an extra purchase unless the profile proves a separate movement row.

## T6 — Row and section continuity

- wrapped merchant descriptions;
- continuation lines;
- page-break continuation;
- repeating page headers;
- footers/subtotals;
- summary sections;
- opening/closing balances;
- duplicated headings;
- blank rows;
- ledger + formula boxes on same page;
- ledger + points/rewards section on same page;
- transaction table followed by informational body copy.

No summary line may become a transaction row unless the profile explicitly defines it.

No numeric value outside a profile-confirmed transaction region may become a movement amount merely because it resembles money.

## T7 — Idempotency

For same source artifact + adapter version:

```text
RUN 1 == RUN 2
```

Expected:

- same deterministic row keys;
- no duplicate evidence;
- no duplicate canonical events;
- same reconciliation projection;
- same page-role projection.

## T8 — Adapter versioning and format drift

When adapter version changes:

- new ExtractionRun recorded;
- evidence lineage references new adapter version;
- old evidence remains auditable;
- canonical projection can be rebuilt;
- old evidence is superseded/rejected explicitly rather than mutated invisibly.

Unknown/drifted document or page signature:

```text
STOP / REVIEW
```

never blind fallback to another bank/product parser.

## T9 — Gmail ↔ statement reconciliation

### Exact/strong match

Same account/instrument + amount + currency + strong reference/time compatibility:

```text
1 Gmail evidence + 1 statement evidence
→ 1 canonical event
```

### Statement only

Statement movement absent from Gmail:

- can create a canonical candidate;
- incoming savings credit can create `INCOME`;
- provenance remains statement-only.

### Email only pending

Gmail movement absent from current statement:

- not automatically deleted;
- may remain pending/next-cycle/review.

### Ambiguous duplicate

Two Gmail candidates same amount/date:

- no arbitrary merge;
- `REVIEW_REQUIRED`.

### Conflict

Amount/reference/account mismatch:

- `CONFLICT`;
- no silent overwrite.

## T10 — Period coverage

- one expected account without statement prevents full scope close;
- user exclusion is recorded as reduced coverage;
- statement period gap detected;
- duplicate statement for same cycle does not double coverage;
- wrong account mapping prevents close;
- inflow/outflow coverage tracked separately;
- a correctly recognized statement with zero eligible ledger pages does not count as reconciled period coverage.

## T11 — Monthly close state machine

Valid transitions:

```text
OPEN_LIVE → WAITING_FOR_STATEMENTS
WAITING_FOR_STATEMENTS → IMPORTING
IMPORTING → RECONCILING
RECONCILING → REVIEW_REQUIRED | RECONCILED
REVIEW_REQUIRED → RECONCILING | RECONCILED
RECONCILED → REOPENED
REOPENED → RECONCILING
```

Invalid transitions fail closed.

Tests:

- month cannot become reconciled solely from Gmail;
- close with missing required account remains waiting/review;
- all included accounts reconciled allows close;
- late new statement reopens month;
- parser upgrade explicit reprocessing can reopen/reconcile;
- zero observed income does not mean zero income before ledger coverage.

## T12 — Balance claims

- observed expenses cannot derive exact available bank balance;
- closing balance from statement creates explicit `AccountBalanceEvidence`;
- running balance columns are evidence attributes, not movement amount sources;
- net monthly cashflow is distinguished from bank balance;
- cross-currency totals remain separated until FX evidence/policy exists.

## T13 — Privacy/logging

Forbidden in CI/public receipt:

- statement password;
- identity-document value;
- account/card number;
- email address;
- raw PDF filename if identifying;
- raw statement text;
- real transaction amount/merchant/reference;
- user-owned real PDF bytes.

Allowed sanitized metrics:

- pages count;
- page-role counts;
- rows count;
- normalized/rejected counts;
- adapter/profile ID;
- OCR/native page counts;
- match/review/conflict counts;
- duration bucket;
- PASS/OPEN state.

## T14 — Android physical

Required on owned Android device:

1. select/import real owned statement;
2. enter password locally if required;
3. native text or OCR path executes;
4. page roles and sections are resolved;
5. normalized evidence generated;
6. raw bytes/plaintext not durably retained by normal flow;
7. reconciliation against local Gmail-derived evidence;
8. sanitized receipt only;
9. no promotion to production-ready.

## T15 — iOS physical

Required before cross-platform production promotion.

Deferred today does not mean waived.

## Profile promotion levels

```text
DISCOVERY
  ↓
FORMAT_OBSERVED
  ↓
FIXTURE_READY
  ↓
STATIC_READY
  ↓
ANDROID_PHYSICAL_PROVEN
  ↓
CROSS_PLATFORM_PHYSICAL_PROVEN
  ↓
PRODUCTION_CANDIDATE
```

`FORMAT_OBSERVED` means private structural evidence exists. It does not assert that a row adapter can parse the real document.

`PRODUCTION_CANDIDATE` still depends on global FinanceSensor production gates.
