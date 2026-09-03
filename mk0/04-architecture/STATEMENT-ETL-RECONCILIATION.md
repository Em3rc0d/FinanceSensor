# MK0 / 04 — Statement ETL and reconciliation architecture

## Purpose

Define the end-to-end architecture that turns heterogeneous bank-statement documents and Gmail transaction evidence into one explainable, reconciled monthly financial model without treating raw source layouts as canonical truth.

## Product role

FinanceSensor operates in two time scales:

```text
DURING THE MONTH
Gmail transactional evidence
→ low-latency observation
→ mainly outflows and transaction signals

MONTH CLOSE
Bank statements
→ ledger evidence
→ inflows + outflows + reconciliation
```

The two lanes complement each other.

```text
REALTIME_SENSOR != BANK_LEDGER
BANK_LEDGER != REALTIME_SENSOR
```

## Layered architecture

```text
┌──────────────────────────────────────────────────────────────┐
│ SOURCE LAYER                                                 │
│ Gmail message | Gmail attachment | local statement import   │
└───────────────────────────────┬──────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────┐
│ RAW / TRANSIENT ZONE                                         │
│ email body | PDF bytes | decrypted text | OCR image/text    │
│ NOT durable in normal product storage                        │
└───────────────────────────────┬──────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────┐
│ EXTRACTION LAYER                                             │
│ source classifier → PDF text → OCR fallback                 │
└───────────────────────────────┬──────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────┐
│ ADAPTER ETL LAYER                                            │
│ BCP profile | Interbank profile | Ripley profile | future   │
│ bank/product-specific → normalized evidence                  │
└───────────────────────────────┬──────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────┐
│ EVIDENCE LAYER                                               │
│ SourceArtifact | FinancialEvidence | StatementPeriod         │
└───────────────────────────────┬──────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────┐
│ RECONCILIATION / RESOLUTION                                  │
│ Gmail evidence ↔ statement evidence                         │
│ match | statement-only | pending | conflict | review        │
└───────────────────────────────┬──────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────┐
│ CANONICAL LEDGER                                             │
│ CanonicalFinancialEvent + evidence lineage                  │
└───────────────────────────────┬──────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────┐
│ PERIOD / MONTHLY CLOSE                                       │
│ AccountPeriodCoverage | MonthlyClose | summaries            │
└──────────────────────────────────────────────────────────────┘
```

## 1. Source layer

### Transaction email

Email transaction notifications are an observation source. They may provide:

- amount;
- currency;
- merchant/counterparty;
- transaction timestamp;
- card/account hint;
- bank reference;
- movement kind.

A raw Gmail message is never the canonical financial event.

### Statement document

A statement is a period-oriented ledger artifact associated with an account or payment instrument.

It can arrive through:

```text
AUTO_GMAIL_ATTACHMENT
REQUESTED_GMAIL_ATTACHMENT
LOCAL_FILE_SELECTED_BY_USER
```

The delivery mechanism does not determine accounting semantics.

## 2. Raw/transient zone

FinanceSensor needs to **process raw** without normalizing raw retention into product architecture.

Transient objects can include:

```text
RawMailMessage
RawAttachmentBytes
RawStatementPdf
DecryptedStatementView
RenderedStatementPage
OcrTextPage
RawStatementRow
```

These are process contracts, not durable database entities.

The durable lineage is:

```text
SourceArtifact
+ immutable local source key
+ source type
+ content fingerprint/hash where policy permits
+ source timestamps
+ extractor/adapter version
```

## 3. Extraction strategy

### Native text first

A statement parser attempts native PDF text before OCR.

Reasons:

- more deterministic;
- faster;
- less recognition noise;
- better numeric fidelity;
- better preservation of references and dates.

### OCR fallback

OCR is activated only when a document-level or page-level text-quality gate fails.

Candidate quality checks:

```text
non_whitespace_character_count
numeric_token_density
date_token_presence
known_statement_header_presence
column_header_presence
replacement_character_rate
page_text_coverage
```

No single heuristic is a completeness oracle.

OCR output remains untrusted source text.

## 4. Document classification

Before selecting a row parser, FinanceSensor classifies the statement family.

Classifier dimensions:

```text
institution
product type
statement family
period markers
masked account/instrument hints
known headings
known section structure
attachment metadata
```

Possible outcome:

```text
PROFILE_CONFIRMED
PROFILE_PROBABLE
PROFILE_UNKNOWN
NOT_A_STATEMENT
```

`PROFILE_PROBABLE` and `PROFILE_UNKNOWN` do not silently execute a destructive or lossy parser path.

## 5. Bank/product adapters

Adapter scope is **bank + product family + document family**, not bank name alone.

Examples:

```text
BCP / SAVINGS / MONTHLY_ACCOUNT_STATEMENT
BCP / CREDIT_CARD / MONTHLY_CARD_STATEMENT
RIPLEY / CREDIT_CARD / MONTHLY_CARD_STATEMENT
INTERBANK / SAVINGS / FUTURE_PROFILE
```

Each profile owns:

- row boundary detection;
- header/footer filtering;
- continuation-line joining;
- date parsing;
- amount parsing;
- debit/credit semantics;
- reference extraction;
- merchant/counterparty extraction;
- section semantics;
- opening/closing balance extraction where supported;
- fixture corpus and negative fixtures.

The core resolver owns none of those layout rules.

## 6. Normalized statement movement contract

```text
StatementMovementEvidence
  source_artifact_id
  statement_period_id
  adapter_id
  adapter_version
  source_row_key
  source_page?
  source_sequence?

  account_hint?
  payment_instrument_hint?

  occurred_at?
  authorized_at?
  posted_at?

  amount_absolute
  currency
  balance_effect
  cashflow_direction
  movement_kind

  merchant_raw?
  counterparty_raw?
  external_reference?

  extraction_strategy
  extraction_confidence
  normalization_confidence
```

### Required separation

`balance_effect` and `cashflow_direction` are not aliases.

For example:

```text
CARD PURCHASE
card liability increases
personal cashflow outflow
semantic event EXPENSE

CARD PAYMENT
card liability decreases
personal event CARD_PAYMENT
not personal income
```

## 7. Financial evidence provenance

Every normalized statement movement remains linked to:

```text
statement source artifact
statement period
adapter version
extraction run
text strategy
```

Every email-derived movement remains linked to its source message artifact and extractor version.

The canonical event therefore explains *why FinanceSensor believes the event exists*.

## 8. Reconciliation pipeline

### Phase A — exact/strong matches

Strong evidence can include:

- exact external reference;
- same known account/instrument;
- same currency and amount;
- compatible timestamp/window;
- compatible movement kind;
- compatible merchant/counterparty.

### Phase B — probabilistic matches

If no strong unique match exists, candidate matching may score:

```text
amount_score
currency_score
time_score
merchant_score
reference_score
account_score
semantic_score
```

A high score is still not sufficient when several candidates are equally plausible.

### Phase C — outcome

```text
CONFIRMED_MATCH
PROBABLE_MATCH
STATEMENT_ONLY
EMAIL_ONLY_PENDING
CONFLICT
REVIEW_REQUIRED
```

### Duplicate prevention

When Gmail and statement evidence refer to the same economic event:

```text
2 FinancialEvidence
→ 1 CanonicalFinancialEvent
```

This is a core invariant.

## 9. Statement-only events

Statement evidence can create events never observed by Gmail.

Examples:

- salary/credit;
- incoming transfer;
- deposit;
- bank fee;
- interest;
- unnotified purchase;
- unnotified debit;
- adjustment/refund.

Statement-only does not mean low trust by definition. A bank ledger row can be stronger evidence than an email notification for period reconciliation.

## 10. Period coverage

Coverage is per financial account/instrument and period.

```text
AccountPeriodCoverage
  financial_account_id / payment_instrument_id
  period_start
  period_end
  source_type
  coverage_state
  inflow_covered
  outflow_covered
  statement_received
  statement_parsed
  reconciliation_complete
  unresolved_count
```

Coverage states:

```text
NONE
OBSERVED_ONLY
STATEMENT_PARTIAL
STATEMENT_COVERED
RECONCILED
REVIEW_REQUIRED
```

## 11. Monthly close

A `MonthlyClose` is a tenant-level orchestration object over account/instrument period coverage.

```text
OPEN_LIVE
WAITING_FOR_STATEMENTS
IMPORTING
RECONCILING
REVIEW_REQUIRED
RECONCILED
REOPENED
```

### Expected-source inventory

Before closing, FinanceSensor must know which financial accounts/instruments are expected in the user's selected scope.

For each source:

```text
EXPECTED
RECEIVED
NOT_AVAILABLE
USER_EXCLUDED
UNKNOWN
```

`USER_EXCLUDED` is visible reduced coverage, not hidden completeness.

## 12. Reopening a month

A reconciled period is not immutable fiction.

Reasons to reopen:

- late-posted transaction;
- newly imported missing statement;
- account mapping correction;
- parser upgrade and explicit reprocessing;
- user resolves previously ambiguous movement;
- duplicated/incorrect canonical event correction.

Canonical evidence history remains auditable.

## 13. OCR architecture boundary

The ETL pipeline exposes a conceptual interface:

```text
StatementTextProvider
  extractNativeText(pdfBytes, password)
  assessTextQuality(textPages)
  extractOcrText(pageImages) // fallback
```

The product must be able to switch OCR implementation without changing bank adapters or the canonical data model.

OCR implementation selection requires its own evidence and is not frozen here.

## 14. Adapter development lifecycle

```text
DISCOVER FORMAT
    ↓
SANITIZED STRUCTURAL FIXTURE
    ↓
PROFILE SPEC
    ↓
PARSER
    ↓
NEGATIVE FIXTURES
    ↓
NORMALIZATION TESTS
    ↓
RECONCILIATION TESTS
    ↓
OWNED-DEVICE PHYSICAL PROOF
    ↓
SUPPORTED PROFILE
```

A profile is not supported simply because one PDF happened to parse.

## 15. Format evolution

Banks may change statement layouts without notice.

Therefore every adapter must expose:

```text
profile_id
profile_version
recognized_signatures
valid_from?
valid_to?
compatibility_notes
status
```

Runtime behavior on signature drift:

```text
known signature → parse
unknown/drifted signature → STOP/REVIEW, never reinterpret blindly
```

## 16. Failure model

Safe failure codes should distinguish categories without exposing raw content:

```text
STATEMENT_PROFILE_UNKNOWN
STATEMENT_PASSWORD_REQUIRED
STATEMENT_PASSWORD_REJECTED
STATEMENT_TEXT_UNUSABLE
STATEMENT_OCR_REQUIRED
STATEMENT_OCR_LOW_CONFIDENCE
STATEMENT_ROW_PARSE_PARTIAL
STATEMENT_PERIOD_AMBIGUOUS
STATEMENT_ACCOUNT_MAPPING_REQUIRED
RECONCILIATION_CONFLICT
```

## 17. Observability

Allowed diagnostics are aggregate/content-free:

```text
pages_total
pages_native_text
pages_ocr
rows_detected
rows_normalized
rows_rejected
movements_created
matches_confirmed
matches_probable
conflicts
review_count
adapter_id/version
processing_duration_bucket
```

Forbidden diagnostic content:

- PDF password;
- DNI/identity value;
- account/card number;
- raw statement text;
- raw email body;
- merchant/amount transaction details in public logs.

## 18. Product truth language

During month:

```text
OBSERVED
```

After statement reconciliation:

```text
RECONCILED
```

Only show an exact bank balance if there is specific balance evidence:

```text
BALANCE_EVIDENCE_PRESENT
```

Never infer exact available balance from observed Gmail outflows alone.

## 19. Evidence gates

```text
ETL_ARCHITECTURE_DOCUMENTED        YES
ADAPTER_REGISTRY                   YES
REAL_FORMAT_FIXTURES               OPEN
OCR_IMPLEMENTATION                 OPEN
REAL_NATIVE_TEXT_PARSE             OPEN
REAL_OCR_PARSE                     OPEN
REAL_MONTHLY_RECONCILIATION        OPEN
ANDROID_PHYSICAL                   OPEN
IOS_PHYSICAL                       OPEN / DEFERRED
BUILD_READY                        false
```
