# ADR-035 — Statement ETL and monthly reconciliation

**Status:** ACCEPTED FOR MK0 DESIGN / REAL FORMAT CORPUS REQUIRED  
**Date:** 2026-09-03

## Context

FinanceSensor observes useful transaction evidence during the month from Gmail, especially outflows. Owned-mailbox evidence also shows that incoming-money coverage is materially weaker: banks may notify purchases, transfers out, withdrawals, card payments and other debits while not notifying equivalent credits into savings/debit accounts.

ADR-033 therefore introduced an asymmetric source model and a statement lane. ADR-034 selected the mobile PDF runtime for the static spike. The remaining architectural question is how FinanceSensor should ingest heterogeneous bank statements, normalize them without embedding one bank's layout into the core model, reconcile them against already-observed Gmail evidence, and close a financial month without claiming more completeness than the evidence supports.

Bank statements are not a single format. Institutions can differ in:

- document layout;
- section ordering;
- date formats;
- debit/credit column semantics;
- sign conventions;
- decimal and thousands separators;
- account vs card terminology;
- statement cycle boundaries;
- page headers and footers;
- whether text is embedded or pages require OCR;
- whether the PDF is password protected;
- whether authorization date and posting date are both exposed;
- how references, merchants and counterparties are represented.

A parser that assumes one universal bank layout is therefore rejected.

## Decision

FinanceSensor adopts a **versioned adapter ETL architecture** for statement ingestion and a **separate reconciliation engine** for monthly close.

```text
SOURCE ARTIFACT
    ↓
CLASSIFY DOCUMENT
    ↓
TEXT ACQUISITION
    ├─ native PDF text
    └─ OCR fallback when text is absent/unusable
    ↓
BANK + PRODUCT ADAPTER
    ↓
NORMALIZED STATEMENT MOVEMENT EVIDENCE
    ↓
CANONICAL RESOLVER / RECONCILIATION
    ↓
PER-ACCOUNT PERIOD COVERAGE
    ↓
MONTHLY CLOSE STATE
```

The following laws are frozen:

```text
BANK_FORMAT_A != BANK_FORMAT_B
BANK_ADAPTER != CORE_FINANCIAL_MODEL
RAW_LAYOUT != CANONICAL_SEMANTICS
OCR_OUTPUT != FINANCIAL_EVENT
STATEMENT_ROW != CANONICAL_EVENT
GMAIL_EVIDENCE != BANK_LEDGER_EVIDENCE
GMAIL_MATCH + STATEMENT_MATCH != TWO_EXPENSES
NO_GMAIL_INFLOW != ZERO_INFLOW
MONTH_RECONCILED != PRODUCTION_READY
APK_COMPILED != REAL_EECC_PROVEN != PRODUCTION_READY
```

## ETL stages

### 1. Extract

Extract is responsible only for acquiring a bounded source artifact and obtaining machine-readable text.

Inputs may be:

```text
GMAIL_MESSAGE
GMAIL_ATTACHMENT
USER_SELECTED_LOCAL_FILE
FUTURE_IMPORT_SOURCE
```

Raw material is transient. The persistent lineage object is `SourceArtifact`, not the raw content itself.

Text acquisition strategy:

```text
NATIVE_PDF_TEXT  → preferred
OCR_FALLBACK     → only when native text is absent or unusable
```

OCR is therefore a fallback parser stage, not the primary representation of every statement.

Extract must preserve:

- immutable source identity;
- content hash where safe and local;
- statement source/provenance;
- page count;
- extraction strategy;
- parser/runtime version;
- extraction diagnostics without raw financial plaintext.

### 2. Transform

Transform is bank/product specific.

A `StatementFormatProfile` chooses exactly one adapter version based on deterministic evidence such as institution, product family, statement classifier and document structure.

The adapter converts bank-specific rows into `StatementMovementEvidence`.

The normalized contract separates factual ledger effects from semantic interpretation:

```text
source_period
source_row_key
financial_account_hint
payment_instrument_hint
occurred_at?
authorized_at?
posted_at?
source_description
amount_absolute
currency
balance_effect        INCREASE | DECREASE | NONE | UNKNOWN
cashflow_direction    INFLOW | OUTFLOW | NEUTRAL | UNKNOWN
movement_kind
external_reference?
merchant_or_counterparty_raw?
normalization_confidence
adapter_id
adapter_version
text_strategy         NATIVE_TEXT | OCR
```

`balance_effect` is interpreted relative to the source account/instrument, not globally.

Examples:

```text
Savings account credit      → balance INCREASE / cashflow INFLOW
Savings account debit       → balance DECREASE / cashflow OUTFLOW
Credit-card purchase        → liability INCREASE / cashflow OUTFLOW
Credit-card payment         → liability DECREASE / CARD_PAYMENT, not INCOME
Credit-card refund          → liability DECREASE / REFUND
```

The adapter must not infer a canonical event merely because a row has a positive or negative sign.

### 3. Load

Load does not write raw PDF text or OCR text into durable canonical state.

It persists encrypted derived entities:

```text
SourceArtifact
ExtractionRun metadata
StatementPeriod
FinancialEvidence / StatementMovementEvidence
CandidateEvidence
ReconciliationLink
PeriodCoverage
MonthlyClose
```

A replay of the same source artifact + adapter version must be idempotent.

## Raw-zone rule

FinanceSensor supports `raw` inputs operationally without making raw content a durable product database requirement.

```text
RAW EMAIL BODY          transient
RAW EMAIL ATTACHMENT    transient
RAW PDF BYTES           transient
DECRYPTED PDF           memory only
OCR PAGE IMAGE          transient
OCR TEXT                transient
BANK ROW TOKENS         transient

SOURCE IDENTITY         durable encrypted lineage
DERIVED EVIDENCE        durable encrypted
CANONICAL EVENT         durable encrypted
RECONCILIATION STATE    durable encrypted
```

A requirement to debug a parser does not authorize persistent raw banking plaintext in normal product storage.

## Adapter architecture

Each supported statement profile is independent and versioned:

```text
institution
product_type
statement_family
profile_version
delivery_mode
document_classifier
text_strategy_policy
header_footer_rules
section_rules
date_rules
amount_rules
debit_credit_semantics
reference_rules
row_identity_rules
negative_examples
fixture_set
status
```

A parser change that alters normalized evidence increments `adapter_version`.

Old evidence retains the adapter version that produced it. Reprocessing is explicit and auditable.

## Reconciliation engine

Reconciliation is source-agnostic. It receives normalized evidence, never bank-specific layout structures.

Candidate match dimensions include:

```text
same tenant
same account/instrument when known
same currency
amount compatibility
time compatibility
merchant/counterparty compatibility
external reference compatibility
movement-kind compatibility
source independence
```

Match outcome:

```text
CONFIRMED_MATCH
PROBABLE_MATCH
STATEMENT_ONLY
EMAIL_ONLY_PENDING
CONFLICT
REVIEW_REQUIRED
NON_TRANSACTION
```

A statement row that corroborates an existing Gmail transaction strengthens the canonical event and does not create a duplicate economic event.

Weak matches cannot silently merge merely because amount and date are similar.

## Monthly-close model

FinanceSensor treats the month as a reconciliation cycle.

```text
OPEN_LIVE
    ↓
WAITING_FOR_STATEMENTS
    ↓
IMPORTING
    ↓
RECONCILING
    ↓
REVIEW_REQUIRED? ── yes ──┐
    │ no                   │
    ↓                      │
RECONCILED <───────────────┘
```

A reconciled month can later become `REOPENED` when the user adds a missing statement, corrects an account mapping, or a late-posted item changes the covered period.

`RECONCILED` means:

- all expected statement sources for the selected close scope are accounted for or explicitly waived by the user with visible reduced coverage;
- statement periods cover the target month/cycle sufficiently for the declared scope;
- unresolved conflicts are below the allowed close policy;
- inflow and outflow coverage are measured independently;
- FinanceSensor can explain which sources support the month.

It does **not** mean production readiness, legal/accounting certification, or that every institution in the user's financial life has been connected.

## Coverage dimensions

Do not expose one ambiguous `completenessPercent`.

At minimum track:

```text
outflow_observation_coverage
inflow_ledger_coverage
statement_period_coverage
account_scope_coverage
reconciliation_coverage
review_resolution_coverage
```

A user-visible monthly close may summarize these dimensions, but the underlying model remains separate.

## Product UX consequence

During the month FinanceSensor may say:

```text
Septiembre · En curso
Egresos observados: S/ X
Ingresos: todavía incompletos
```

At the end of the month:

```text
Es hora de cerrar septiembre.
Solicita tus estados de cuenta para completar ingresos,
validar egresos y cerrar tu balance mensual.
```

After reconciliation:

```text
Septiembre cerrado
Ingresos reconciliados
Egresos reconciliados
N movimientos por revisar, si aplica
```

The product must distinguish `observed`, `reconciled` and `bank balance` values.

## OCR boundary

OCR implementation is behind a mobile platform/runtime adapter. ADR-035 freezes the need and interface, not a vendor-specific implementation.

```text
PDF_TEXT_AVAILABLE → OCR NOT REQUIRED
PDF_TEXT_UNUSABLE  → OCR MAY RUN LOCALLY
OCR_CONFIDENCE_LOW → REVIEW / FAIL CLOSED
```

OCR output is untrusted extraction evidence and must pass the same bank adapter validations as native PDF text.

## Test/evidence required

Before promotion beyond design/static-ready:

1. real-format corpus for at least two institution/product profiles, sanitized for repository use;
2. native-text statement fixture per supported profile;
3. OCR-fallback fixture for at least one scanned/flattened statement;
4. wrong-password and unreadable-document fail-closed tests;
5. locale/date/amount normalization tests;
6. duplicate Gmail + statement reconciliation tests;
7. statement-only inflow tests;
8. credit-card payment never promoted to income;
9. period-coverage and monthly-close state-machine tests;
10. idempotent replay across adapter versions;
11. Android-owned-device real statement proof;
12. later iOS proof before cross-platform production promotion.

## Evidence level

```text
DOCUMENTED_ETL_ARCHITECTURE       ACCEPTED_FOR_MK0_DESIGN
REAL_BANK_FORMAT_MATRIX           OPEN
REAL_EECC_PARSE                   OPEN
OCR_FALLBACK_PHYSICAL             OPEN
MONTHLY_RECONCILIATION_PHYSICAL   OPEN
ANDROID_PRODUCT_FLOW              OPEN
IOS_PRODUCT_FLOW                  DEFERRED / REQUIRED
BUILD_READY                       false
```

This ADR does not touch iOS code and does not close Q-003, Q-004 or Q-005.
