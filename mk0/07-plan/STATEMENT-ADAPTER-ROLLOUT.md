# MK0 / 07 — Statement adapter rollout plan

## Objective

Turn statement ingestion from a generic architecture into a controlled set of supported bank/product profiles without allowing one bank layout to become the core model.

## Rule

```text
FORMAT DISCOVERY BEFORE PARSER PROMOTION
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

Input needed from owned/sanitized examples.

Priority corpus:

1. BCP savings/debit requested monthly statement;
2. BCP credit-card monthly statement;
3. Banco Ripley credit-card monthly statement;
4. Interbank savings/debit requested statement;
5. Interbank credit statement if available.

Preferred artifact for repository work:

```text
SANITIZED STRUCTURAL COPY
```

Redact/remove:

- names;
- email addresses;
- account/card numbers;
- identity-document values;
- PDF password;
- real references;
- sensitive notes.

Preserve only what is necessary to understand layout:

- headings;
- column names/order;
- date formatting;
- debit/credit placement;
- page/section layout;
- generic synthetic row shapes.

No real financial values need to enter GitHub.

## Phase S2 — Profile specification

For each corpus document produce:

```text
profileId
institution
productType
statementFamily
signature markers
period markers
account/instrument markers
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
```

Output:

```text
statement-format-registry.json status = FIXTURE_READY
```

## Phase S3 — Synthetic structural fixtures

Create fixtures that reproduce structure without real private values.

Each fixture set contains:

```text
positive/native-text
positive/ocr-like-flattened
negative/not-statement
negative/other-product
edge/wrapped-description
edge/page-break
edge/locale-amounts
edge/date-ambiguity
edge/summary-not-transaction
```

## Phase S4 — Adapter implementation

Implement one isolated adapter per profile.

Suggested order:

```text
1. BCP savings requested
2. BCP credit
3. Ripley credit
4. Interbank savings requested
5. Interbank credit
```

Reason: BCP savings closes the inflow gap first; credit profiles then strengthen outflow/card reconciliation.

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
4. measure recognition errors around money/dates;
5. add low-confidence rejection/review policy;
6. prove no OCR text persistence.

OCR must not become a dependency for digital PDFs that already contain usable text.

## Phase S7 — Android real proof

On owned Android device:

- import one owned real statement per highest-priority profile;
- local password prompt if required;
- parse;
- inspect normalized movement counts;
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

Deferred now under existing project debt.

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
new statement fails signature
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
