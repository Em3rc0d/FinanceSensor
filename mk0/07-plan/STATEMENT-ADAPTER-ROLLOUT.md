# MK0 / 07 — Statement adapter rollout plan

## Objective

Turn statement ingestion from a generic architecture into a controlled set of supported bank/product profiles without allowing one bank layout to become the core model.

## Rule

```text
FORMAT DISCOVERY BEFORE PARSER PROMOTION
PAGE/REGION SCOPE BEFORE ROW PARSING
PARSER PROMOTION BEFORE PHYSICAL CLAIM
PHYSICAL CLAIM BEFORE PRODUCT SUPPORT CLAIM
```

## Phase S0 — Architecture

Status: **DONE FOR DESIGN**

Deliverables:

- ADR-033 source asymmetry;
- ADR-034 mobile PDF runtime;
- ADR-035 ETL + monthly reconciliation;
- statement/reconciliation data model;
- monthly close UX;
- machine-readable registry;
- test matrix.

## Phase S1 — Real format corpus

Status: **DONE FOR PRIVATE STRUCTURAL DISCOVERY / ROW PARSE STILL OPEN**

Reviewed privately on 2026-09-03:

```text
4 user-owned statement PDFs
3 institutions
4 observed profile families
0 raw PDFs committed
0 raw statement text committed
0 PII committed
0 real financial values committed
```

Observed profiles:

1. BCP savings/debit requested statement — `FORMAT_OBSERVED`;
2. BCP credit-card monthly statement — `FORMAT_OBSERVED`;
3. Banco Ripley credit-card monthly statement — `FORMAT_OBSERVED`;
4. Interbank savings/debit statement — `FORMAT_OBSERVED`.

Still missing:

5. Interbank credit statement — `UNPROVEN`.

The corpus proved two important hazards:

- a valid statement can contain educational/reference pages with transaction-looking examples;
- a ledger page can share space with summary/formula/reward sections whose numbers are not movement rows.

Therefore all future profile specs must include page-role and region/section rules before row grammar.

Preferred artifact for repository work remains:

```text
SANITIZED STRUCTURAL COPY
```

Redact/remove names, email addresses, account/card numbers, identity-document values, PDF password, real references and sensitive notes. Replace real financial values with synthetic values while preserving layout grammar.

## Phase S2 — Profile specification

Status: **ACTIVE NEXT**

For each observed corpus family produce:

```text
profileId
institution
productType
statementFamily
signature markers
period markers
account/instrument markers
page-role rules
region/section rules
header/footer rules
transaction-section rules
row-boundary rules
continuation-line rules
date grammar
amount grammar
debit/credit semantics
reference grammar
merchant/counterparty grammar
balance grammar
native-text quality expectations
OCR fallback expectations
negative document signatures
embedded-example exclusion rules
```

Output target:

```text
FORMAT_OBSERVED → FIXTURE_READY
```

No profile is promoted merely because its private document was visually inspected.

## Phase S3 — Synthetic structural fixtures

Create fixtures that reproduce structure without real private values.

Each fixture set contains:

```text
positive/native-text
positive/multi-page-ledger
positive/ocr-like-flattened
negative/not-statement
negative/other-product
negative/educational-reference-page
negative/summary-only-page
edge/wrapped-description
edge/page-break
edge/locale-amounts
edge/date-ambiguity
edge/summary-not-transaction
edge/running-balance-not-amount
```

Required profile-specific fixtures now include:

### BCP savings

- multi-page continuation;
- process/value date pair;
- separate debit/credit columns;
- opening/closing/total lines excluded;
- abbreviated-month date grammar.

### Interbank savings

- transaction ledger page;
- security/informational page;
- educational/reference page with transaction-looking sample rows;
- distinct income/expense/running-balance columns.

### BCP credit

- transaction table;
- debt-summary page;
- educational/reference sample page;
- trailing-sign payment representation;
- soles/dollars columns.

### Ripley credit

- movement table sharing page with formula/summary blocks;
- ticket/reference column;
- rate/installment columns excluded from movement amount;
- points/rewards and informational page excluded.

## Phase S4 — Adapter implementation

Implement one isolated adapter per profile.

Updated order after real-format discovery:

```text
1. BCP savings requested
2. Interbank savings requested
3. BCP credit
4. Ripley credit
5. Interbank credit when a format is observed
```

Reason: savings/debit adapters close the inflow gap first. Two different institutions in the first two adapters also prove that the normalized core is not secretly BCP-shaped.

Each adapter must operate only on profile-confirmed `TRANSACTION_LEDGER` regions.

## Phase S5 — Reconciliation fixtures

For every adapter create paired source scenarios:

```text
Gmail expense + same statement row
Gmail transfer + same statement row
statement-only income
statement-only expense
email-only pending movement
ambiguous same-amount candidates
conflicting references
card payment + card statement payment
refund/reversal
```

Expected canonical event count is asserted.

## Phase S6 — OCR fallback

Only after native-text path is structurally stable.

Steps:

1. select on-device OCR implementation for Android spike;
2. define page rendering boundary;
3. produce synthetic scanned statement;
4. preserve page identity through OCR;
5. measure recognition errors around money/dates;
6. add low-confidence rejection/review policy;
7. prove no OCR text persistence.

OCR must not become a dependency for digital PDFs that already contain usable text.

## Phase S7 — Android real proof

On owned Android device:

- import one owned real statement per highest-priority profile;
- local password prompt if required;
- passive PDF extraction only;
- page/region classification;
- row parse and normalization;
- inspect only sanitized movement counts/statuses;
- reconcile against existing Gmail evidence;
- generate sanitized receipt;
- confirm no raw statement/password in normal durable storage.

Promotion:

```text
STATIC_READY → ANDROID_PHYSICAL_PROVEN
```

only per profile actually exercised.

## Phase S8 — Monthly close physical proof

Minimum scenario:

- one savings/debit account statement with at least one inflow;
- one credit or transactional outflow source;
- Gmail evidence present for some outflows;
- statement-only movements present;
- at least one reconciliation match;
- month transitions to `RECONCILED` only when expected source scope is satisfied.

Receipt records only sanitized counters/states.

## Phase S9 — iOS

Deferred now under existing project debt and untouched by this workstream.

Required later:

- compile/runtime compatibility;
- PDF password path;
- native/OCR text acquisition;
- real owned statement;
- privacy/storage inspection;
- monthly close interoperability.

Android evidence cannot promote iOS.

## Format drift operations

After a profile is supported:

```text
new statement fails document/page/region signature
    ↓
PROFILE_DRIFT suspected
    ↓
no blind fallback to another bank parser
    ↓
collect sanitized structural evidence
    ↓
new profile version
    ↓
fixtures + tests + physical evidence
```

## Completion criteria for this workstream

The workstream is not complete until:

```text
≥2 institutions physically proven
≥1 savings/debit profile physically proven
≥1 credit profile physically proven
statement-only inflow physically proven
Gmail + statement dedup physically proven
monthly close physically proven on Android
privacy receipt clean
```

Cross-platform production still additionally requires iOS and global release gates.
