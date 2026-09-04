# MK0 / 09 — Statement ETL and reconciliation test matrix

## Purpose

Define what must be proven before any bank statement profile, OCR fallback or monthly close can be promoted.

## Evidence discipline

```text
PARSER_UNIT_PASS != REAL_FORMAT_PASS
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
- month close states remain distinct;
- `BUILD_READY=false` remains unchanged;
- no iOS physical debt is silently promoted.

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
- corrupted/truncated PDF.

Acceptance:

```text
KNOWN STATEMENT → expected profile
UNKNOWN/AMBIGUOUS → REVIEW/UNKNOWN
NON-STATEMENT → reject
```

## T2 — Password boundary

- correct synthetic password opens fixture;
- wrong password fails closed;
- empty password when required fails closed;
- password does not appear in logs;
- password does not appear in returned result object;
- password does not persist in app state;
- raw decrypted document does not persist;
- no claim of deterministic Dart string zeroization.

## T3 — Text acquisition

### Native PDF text

- all required pages enumerated;
- date/amount tokens survive extraction;
- statement headings detected;
- page order stable;
- text quality gate accepts valid text.

### OCR fallback

- native-text quality gate rejects scanned/flattened fixture;
- OCR activated only for required page/document;
- OCR result passes adapter validation before normalization;
- low-confidence OCR does not create authoritative events;
- numeric ambiguity (`1/7`, `0/O`, decimal separators) produces review/failure instead of silent mutation.

## T4 — Locale normalization

Per profile test:

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

## T5 — Account-type semantics

### Savings/checking

- explicit credit → `INFLOW`;
- explicit debit → `OUTFLOW`;
- salary/received transfer can produce `INCOME` candidate;
- outgoing transfer produces transfer/outflow candidate;
- fee produces `FEE`.

### Credit card

- purchase → `EXPENSE` candidate;
- payment → `CARD_PAYMENT`, never `INCOME`;
- refund → `REFUND`;
- fee → `FEE`;
- statement balance changes never map to income by sign alone.

## T6 — Row continuity

- wrapped merchant descriptions;
- continuation lines;
- page-break continuation;
- repeating page headers;
- footers/subtotals;
- summary sections;
- opening/closing balances;
- duplicated headings;
- blank rows.

No summary line may become a transaction row unless profile explicitly defines it.

## T7 — Idempotency

For same source artifact + adapter version:

```text
RUN 1 == RUN 2
```

Expected:

- same deterministic row keys;
- no duplicate evidence;
- no duplicate canonical events;
- same reconciliation projection.

## T8 — Adapter versioning

When adapter version changes:

- new ExtractionRun recorded;
- evidence lineage references new adapter version;
- old evidence remains auditable;
- canonical projection can be rebuilt;
- old evidence is superseded/rejected explicitly rather than mutated invisibly.

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
- inflow/outflow coverage tracked separately.

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
- real transaction amount/merchant/reference.

Allowed sanitized metrics:

- pages count;
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
4. normalized evidence generated;
5. raw bytes/plaintext not durably retained by normal flow;
6. reconciliation against local Gmail-derived evidence;
7. sanitized receipt only;
8. no promotion to production-ready.

## T15 — iOS physical

Required before cross-platform production promotion.

Deferred today does not mean waived.

## Profile promotion levels

```text
DISCOVERY
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

`PRODUCTION_CANDIDATE` still depends on global FinanceSensor production gates.
