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
│ PASSIVE PDF SAFETY + EXTRACTION                              │
│ no active-content execution → native text → OCR fallback    │
│ preserve page boundaries                                     │
└───────────────────────────────┬──────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────┐
│ STRUCTURAL SCOPE                                             │
│ document profile → page role → region/section → row         │
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

Email transaction notifications are an observation source. They may provide amount, currency, merchant/counterparty, transaction timestamp, card/account hint, bank reference and movement kind.

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

## 3. Passive PDF safety boundary

A bank PDF is treated as **data, never code or authority**.

Real owned format discovery showed that bank PDFs may report active PDF features and form structures. Therefore the statement runtime must not execute document-provided behavior.

```text
PDF_JAVASCRIPT_EXECUTION = FORBIDDEN
PDF_LAUNCH_ACTIONS       = FORBIDDEN
EMBEDDED_FILE_EXECUTION  = FORBIDDEN
FORM_FIELD_VALUE         != FINANCIAL_AUTHORITY
PDF_ACTIVE_CONTENT       != FINANCIAL_AUTHORITY
```

The parser may extract text/render pages through the chosen passive PDF engine. It must not allow PDF JavaScript, actions, launch instructions, embedded executable content, or form logic to gain application/device authority.

A form field may be observed as untrusted document data only if a future adapter explicitly requires it; it does not create financial truth by itself.

## 4. Extraction strategy

### Native text first

A statement parser attempts native PDF text before OCR.

Reasons:

- more deterministic;
- faster;
- less recognition noise;
- better numeric fidelity;
- better preservation of references and dates.

Page boundaries must remain available to the structural classifier. Flattening all pages into one undifferentiated text stream is forbidden for transaction extraction.

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

No single heuristic is a completeness oracle. OCR output remains untrusted source text.

The four owned statements reviewed in the 2026-09-03 structural corpus exposed native text, but that observation does not generalize to all copies or future bank formats.

```text
NATIVE_TEXT_PRESENT != REAL_ROW_PARSE_PASS
```

## 5. Document classification

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

```text
DOCUMENT_CLASSIFIED != ROWS_TRUSTED
```

## 6. Page-role and region scoping

Real format discovery proved that document classification is not enough. A valid statement PDF can contain educational samples, summary tables and informational pages with dates and monetary-looking values that are **not the user's ledger**.

The mandatory structural pipeline is:

```text
PDF
  ↓
DOCUMENT PROFILE
  ↓
PAGE ROLE
  ↓
REGION / SECTION
  ↓
ROW
  ↓
NORMALIZED EVIDENCE
```

Page roles:

```text
TRANSACTION_LEDGER
SUMMARY
INFORMATIONAL
EDUCATIONAL_REFERENCE
UNKNOWN
```

Default row eligibility:

```text
TRANSACTION_LEDGER → eligible for profile row reconstruction
SUMMARY            → not transaction rows by default
INFORMATIONAL      → excluded
EDUCATIONAL_REFERENCE → excluded
UNKNOWN            → fail closed / review
```

Frozen laws:

```text
PAGE_ROLE_UNKNOWN != PARSE_ANYWAY
EDUCATIONAL_REFERENCE_PAGE != TRANSACTION_LEDGER
```

A page may still contain more than one region. For example, a credit-card page may combine a real movement table with formulas, reward-points data, installment information or summary boxes. The profile therefore owns a second **region/section scope** before row reconstruction.

## 7. Bank/product adapters

Adapter scope is **bank + product family + document family**, not bank name alone.

Observed/expected examples:

```text
BCP / SAVINGS / REQUESTED_ACCOUNT_STATEMENT
BCP / CREDIT_CARD / MONTHLY_CARD_STATEMENT
RIPLEY / CREDIT_CARD / MONTHLY_CARD_STATEMENT
INTERBANK / SAVINGS / REQUESTED_ACCOUNT_STATEMENT
```

Each profile owns:

- document signature markers;
- page-role rules;
- row/region boundary detection;
- header/footer filtering;
- continuation-line joining;
- date parsing;
- amount parsing;
- debit/credit semantics;
- reference extraction;
- merchant/counterparty extraction;
- opening/closing balance extraction where supported;
- fixture corpus and negative fixtures.

The core resolver owns none of those layout rules.

## 8. Sanitized real-format observations

The private 2026-09-03 structural corpus contained four owned PDFs across three institutions. No raw document, PII, account/card identifier, real amount, merchant or reference enters the repository.

| Profile | Structural observation | Main parser risk | Status |
|---|---|---|---|
| BCP savings | multi-page ledger; process/value dates; separate debit/credit columns | page break, opening/closing balances and totals can look row-like | `FORMAT_OBSERVED` |
| Interbank savings | ledger page plus informational and educational/reference content | embedded sample statement contains transaction-looking rows; running balance is a separate column | `FORMAT_OBSERVED` |
| BCP Visa | movement table plus debt summary and educational/reference page | sample statement and debt-summary values must not become rows; payment sign semantics differ from income | `FORMAT_OBSERVED` |
| Ripley credit | movement table shares page with formulas/summary/reward information | rate/installment/points/formula numbers must not become movement amount | `FORMAT_OBSERVED` |

Interbank credit remains `UNPROVEN`.

`FORMAT_OBSERVED` records only structural evidence. It is not `FIXTURE_READY`, `STATIC_READY`, physical proof or supported-product status.

## 9. Normalized statement movement contract

```text
StatementMovementEvidence
  source_artifact_id
  statement_period_id
  adapter_id
  adapter_version
  source_row_key
  source_page?
  source_region?
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

## 10. Financial evidence provenance

Every normalized statement movement remains linked to statement source artifact, statement period, adapter version, extraction run, text strategy, page and region when available.

Every email-derived movement remains linked to its source message artifact and extractor version.

The canonical event therefore explains *why FinanceSensor believes the event exists*.

## 11. Reconciliation pipeline

### Phase A — exact/strong matches

Strong evidence can include exact external reference, same known account/instrument, same currency and amount, compatible timestamp/window, compatible movement kind and compatible merchant/counterparty.

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

## 12. Statement-only events

Statement evidence can create events never observed by Gmail, including salary/credit, incoming transfer, deposit, bank fee, interest, unnotified purchase/debit and adjustment/refund.

Statement-only does not mean low trust by definition. A bank ledger row can be stronger evidence than an email notification for period reconciliation.

## 13. Period coverage

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

## 14. Monthly close

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

## 15. Reopening a month

Reasons to reopen include late-posted transaction, newly imported missing statement, account mapping correction, parser upgrade and explicit reprocessing, user resolution of an ambiguous movement, or canonical correction.

Canonical evidence history remains auditable.

## 16. OCR architecture boundary

The ETL pipeline exposes a conceptual interface:

```text
StatementTextProvider
  extractNativeText(pdfBytes, password)
  assessTextQuality(textPages)
  extractOcrText(pageImages) // fallback
```

The product must be able to switch OCR implementation without changing bank adapters or the canonical data model. OCR implementation selection requires its own evidence and is not frozen here.

## 17. Adapter development lifecycle

```text
DISCOVER FORMAT
    ↓
FORMAT_OBSERVED
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

A profile is not supported simply because one PDF was visually reviewed or happened to parse.

## 18. Format evolution

Every adapter must expose:

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

## 19. Failure model

Safe failure codes should distinguish categories without exposing raw content:

```text
STATEMENT_PROFILE_UNKNOWN
STATEMENT_PAGE_ROLE_UNKNOWN
STATEMENT_REGION_UNKNOWN
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

## 20. Observability

Allowed diagnostics are aggregate/content-free:

```text
pages_total
pages_native_text
pages_ocr
pages_ledger
pages_summary
pages_informational
pages_educational_reference
pages_unknown
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

Forbidden diagnostic content includes PDF password, identity value, account/card number, raw statement text, raw email body, and real merchant/amount/reference data in public logs.

## 21. Product truth language

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

## 22. Evidence gates

```text
ETL_ARCHITECTURE_DOCUMENTED        YES
ADAPTER_REGISTRY                   YES
PRIVATE_REAL_FORMAT_STRUCTURE      OBSERVED: 4 DOCS / 3 INSTITUTIONS
SANITIZED_STRUCTURAL_FIXTURES      OPEN
PAGE_ROLE_STATIC_GUARD             IMPLEMENTED_SYNTHETIC
OCR_IMPLEMENTATION                 OPEN
REAL_NATIVE_ROW_PARSE              OPEN
REAL_OCR_PARSE                     OPEN
REAL_MONTHLY_RECONCILIATION        OPEN
ANDROID_PHYSICAL                   OPEN
IOS_PHYSICAL                       OPEN / DEFERRED
BUILD_READY                        false
```
