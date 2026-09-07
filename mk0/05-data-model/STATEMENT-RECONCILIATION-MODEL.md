# DM-002 — Statement and monthly reconciliation model

**Status:** ALPHA.2 DESIGN FROZEN / implementation and physical evidence open
**Scope:** local encrypted domain model; raw financial plaintext remains transient.

## 1. Goals

The model must support three distinct concerns without collapsing them:

1. raw source processing (`correo raw`, PDF, OCR output) as a transient execution concern;
2. durable normalized evidence with provenance;
3. canonical monthly reconciliation and close state.

It must also support multiple bank statement formats without encoding bank-specific columns into the core ledger.

## 2. Core principle

```text
RAW SOURCE
    ↓
NORMALIZED EVIDENCE
    ↓
CANONICAL EVENT
    ↓
RECONCILIATION STATE
```

Each layer has a different truth level.

```text
RAW_TEXT != NORMALIZED_FACT
NORMALIZED_FACT != CANONICAL_EVENT
CANONICAL_EVENT != PERIOD_COMPLETE
PERIOD_COMPLETE != PRODUCTION_READY
```

## 3. Transient raw contracts

These objects may exist in process memory but are not normal durable domain entities.

### RawMailMessage

```text
provider_message_id
thread_id?
headers
subject?
body?
received_at
history_id?
attachment_descriptors[]
```

Durable raw body persistence is forbidden. `provider_message_id` may survive encrypted as source lineage.

### RawStatementDocument

```text
source_kind               GMAIL_ATTACHMENT | LOCAL_FILE
bytes
mime_type
filename_hint?
page_count?
password_required?
```

The bytes are transient.

### RawTextPage

```text
page_number
strategy                  NATIVE_TEXT | OCR
text
quality_metrics
```

Text is transient.

### RawStatementRow

```text
page_number
row_sequence
raw_tokens
raw_text
section_hint?
```

This representation exists only inside an adapter pipeline.

### StatementDiscoveryProfile

Versioned configuration, not user financial data:

```text
id
version
institution_code
known_sender_rules
subject_marker_rules
filename_marker_rules
product_hints
bounded_query_templates
candidate_score_version
status                     ACTIVE | DISABLED | SUPERSEDED
```

It contains no token, password, real message content or user identifier.

### StatementCandidate

The runtime candidate is computed from metadata/MIME descriptors before attachment download:

```text
parent_source_key
attachment_native_id
discovery_profile_id
discovery_profile_version
institution_confidence
product_hint
sender_confidence
subject_confidence
filename_confidence
mime_confidence
attachment_size_bucket
message_age_bucket
decision                   REJECTED | WEAK | PROBABLE | STRONG | CONFLICT
reason_codes[]
```

Only a unique `STRONG` decision is eligible for automatic fetch. Durable storage, if required for idempotency, excludes raw sender, subject and filename values.

## 4. Durable source lineage

The existing `SourceArtifact` remains the durable source identity.

Required additions/interpretation for statement ingestion:

```text
id
tenant_id
connection_id?
origin_device_id
source_type                GMAIL_MESSAGE | GMAIL_ATTACHMENT | LOCAL_IMPORT | OTHER
source_native_id?
source_native_version?
parent_source_artifact_id? // attachment → parent message
content_hash               local encrypted/index-safe policy
observed_at
source_created_at?
retention_state
parser_eligibility_state
artifact_kind              TRANSACTION_EMAIL | BANK_STATEMENT | RECEIPT | OTHER
```

`parent_source_artifact_id` allows a statement attachment to remain linked to the Gmail message that delivered it without persisting the message body.

## 5. ExtractionRun

Represents one deterministic attempt to extract structured evidence from one source artifact.

```text
id
tenant_id
source_artifact_id
extractor_family           EMAIL_TRANSACTION | STATEMENT_DOCUMENT
extractor_id
extractor_version
text_strategy              NONE | NATIVE_TEXT | OCR | HYBRID
started_at
finished_at?
status                     RUNNING | PASS | PARTIAL | REVIEW | FAILED_SAFE
failure_code?
pages_total?
pages_native_text?
pages_ocr?
rows_detected?
rows_normalized?
rows_rejected?
```

No raw text belongs in this entity.

## 6. StatementFormatProfile

Registry definition, not user financial data.

```text
id
institution_code
product_type               SAVINGS | CHECKING | CREDIT_CARD | OTHER
statement_family
profile_version
status                     DISCOVERY | FIXTURE_READY | STATIC_READY | PHYSICAL_PROVEN | DEPRECATED
text_policy                NATIVE_FIRST_OCR_FALLBACK
classifier_version
adapter_id
adapter_version
valid_from?
valid_to?
```

The profile describes *how to parse*, not the user's account.

## 7. StatementPeriod

A statement-oriented coverage object.

```text
id
tenant_id
source_artifact_id
financial_account_id?
payment_instrument_id?
institution_id?
profile_id
period_start
period_end
statement_date?
opening_balance?
closing_balance?
balance_currency?
period_confidence
account_mapping_state      MAPPED | PROBABLE | REQUIRED
created_at
```

Opening/closing balances are optional and only stored when extracted with acceptable confidence and allowed by local privacy policy.

## 8. StatementMovementEvidence

A normalized ledger fact derived from one statement row.

```text
id
tenant_id
source_artifact_id
extraction_run_id
statement_period_id
profile_id
adapter_id
adapter_version
source_row_key
source_page?
source_sequence?

occurred_at?
authorized_at?
posted_at?

amount_absolute
currency
balance_effect             INCREASE | DECREASE | NONE | UNKNOWN
cashflow_direction         INFLOW | OUTFLOW | NEUTRAL | UNKNOWN
movement_kind

merchant_raw?
counterparty_raw?
external_reference?
account_hint?
instrument_hint?

extraction_strategy        NATIVE_TEXT | OCR
extraction_confidence
normalization_confidence
review_state               NONE | REQUIRED | RESOLVED
created_at
```

### Source row identity

`source_row_key` must be deterministic for the same artifact + adapter version.

Candidate construction:

```text
H(
  source_artifact_id,
  profile_id,
  adapter_version,
  page/section identity,
  normalized row ordinal,
  stable normalized row facts
)
```

Do not depend on raw plaintext retention for replay identity.

## 9. EmailTransactionEvidence

Email-derived financial evidence uses the same `FinancialEvidence` family but should preserve its observation semantics.

Candidate fields:

```text
id
tenant_id
source_artifact_id
extractor_id
extractor_version
occurred_at?
observed_at
amount?
currency?
movement_kind?
merchant_raw?
counterparty_raw?
external_reference?
account_hint?
instrument_hint?
confidence
```

An email notification is observational evidence, not a bank-ledger posting.

## 10. FinancialEvidence unification

`StatementMovementEvidence` and `EmailTransactionEvidence` may be implemented as typed projections/subtypes around the existing `FinancialEvidence` entity.

The core requires these common properties:

```text
id
tenant_id
source_artifact_id
evidence_channel           GMAIL_TRANSACTION | STATEMENT_LEDGER | MERCHANT_RECEIPT | USER_CONFIRMATION | OTHER
source_type
occurred_at?
amount?
currency?
movement_kind?
account_hint?
instrument_hint?
external_reference?
confidence
extractor/adapter version
```

`evidence_channel` is important because two independent financial sources can originate from the same Gmail connection while remaining independent evidence channels, e.g. transaction email vs attached bank statement.

## 11. ReconciliationLink

Represents a proposed or accepted relationship between evidence records.

```text
id
tenant_id
left_evidence_id
right_evidence_id
relation_type              SAME_ECONOMIC_EVENT | POSSIBLE_MATCH | CONFLICT | SETTLEMENT_RELATION | NO_MATCH
match_state                PROPOSED | CONFIRMED | REJECTED | REVIEW | CONFLICT
match_score?
resolver_version
match_features_version
created_at
resolved_at?
resolved_by                SYSTEM | USER?
```

### MatchFeatureSnapshot

Optional encrypted explanation payload:

```text
amount_match
currency_match
time_distance
account_match
instrument_match
merchant_similarity
reference_match
movement_compatibility
source_independence
ambiguity_count
```

Do not store raw source text in the snapshot.

Alpha.2 automatic confirmation additionally requires a unique candidate, independent evidence channels, compatible amount/currency/economic semantics, a stable reference or account/instrument+merchant anchor and a configured score margin over the second candidate. Amount equality alone is insufficient. The immutable scoring contract is versioned in `graph/alpha2-design-freeze.json`.

## 12. CanonicalFinancialEvent extension

Existing canonical event remains economic-event authority.

Recommended additions:

```text
reconciliation_state       OBSERVED | PARTIALLY_RECONCILED | RECONCILED | CONFLICT
ledger_posting_state       UNKNOWN | STATEMENT_POSTED | EMAIL_ONLY_PENDING
period_id?
```

These fields must not erase the existing canonical status (`ACTIVE`, `REVERSED`, `SUPERSEDED`).

## 13. AccountPeriodCoverage

Coverage is not one tenant-wide boolean.

```text
id
tenant_id
financial_account_id?
payment_instrument_id?
period_start
period_end

expected_source_state      EXPECTED | NOT_AVAILABLE | USER_EXCLUDED | UNKNOWN
transactional_signal_state NONE | PARTIAL | CURRENT
statement_state            NONE | RECEIVED | PARSED_PARTIAL | PARSED | REVIEW_REQUIRED
inflow_coverage_state      UNKNOWN | PARTIAL | COVERED
outflow_coverage_state     UNKNOWN | OBSERVED | PARTIAL | COVERED
reconciliation_state       NOT_STARTED | PARTIAL | REVIEW_REQUIRED | RECONCILED

statement_period_id?
unresolved_count
last_reconciled_at?
created_at
updated_at
```

## 14. MonthlyClose

Tenant-level close cycle.

```text
id
tenant_id
calendar_year
calendar_month
period_start
period_end
status                     OPEN_LIVE | WAITING_FOR_STATEMENTS | IMPORTING | RECONCILING | REVIEW_REQUIRED | RECONCILED | REOPENED
close_scope_version
opened_at
close_requested_at?
reconciled_at?
closed_by_user_id?
reopened_at?
reopen_reason?
```

### MonthlyCloseAccount

Many-to-many/association between close and account coverage.

```text
monthly_close_id
account_period_coverage_id
scope_state                INCLUDED | USER_EXCLUDED | NOT_AVAILABLE
required_for_close
```

## 15. MonthlyCloseSummary

Derived/materialized read model, rebuildable.

```text
monthly_close_id
observed_outflow_total?
reconciled_outflow_total?
reconciled_inflow_total?
net_cashflow?
statement_accounts_expected
statement_accounts_received
statement_accounts_reconciled
review_count
coverage_label
last_rebuilt_at
```

Totals are nullable when coverage does not authorize the claim.

## 16. Period source inventory

The user may have multiple accounts/cards from the same bank. Therefore the unit of expected statement coverage is not simply `Institution`.

```text
Institution
  ├─ FinancialAccount A
  ├─ FinancialAccount B
  └─ PaymentInstrument C
```

Monthly close asks for evidence per relevant account/instrument.

## 17. Balance evidence

Exact bank balance needs an explicit evidence source.

### AccountBalanceEvidence

```text
id
tenant_id
source_artifact_id
financial_account_id
balance_type               OPENING | CLOSING | AVAILABLE | CURRENT_REPORTED
amount
currency
as_of
confidence
created_at
```

FinanceSensor must not derive `AVAILABLE` balance from Gmail spending observations.

## 18. ReviewTask extensions

New reasons:

```text
STATEMENT_PROFILE_UNKNOWN
STATEMENT_ACCOUNT_MAPPING_REQUIRED
STATEMENT_ROW_AMBIGUOUS
OCR_LOW_CONFIDENCE
DUPLICATE_MATCH_AMBIGUOUS
EMAIL_STATEMENT_CONFLICT
PERIOD_GAP
MISSING_EXPECTED_STATEMENT
```

## 19. ETL idempotency

Durable uniqueness candidates:

```text
SourceArtifact(source_type, source_native_id/source fingerprint)
ExtractionRun(source_artifact_id, extractor_id, extractor_version)
StatementMovementEvidence(source_artifact_id, adapter_version, source_row_key)
ReconciliationLink(left_evidence_id, right_evidence_id, resolver_version)
AccountPeriodCoverage(account/instrument, period_start, period_end)
MonthlyClose(tenant_id, calendar_year, calendar_month, close_scope_version)
```

Physical constraints remain subject to schema freeze.

## 20. Adapter-version migration

When a parser changes:

```text
old adapter evidence remains auditable
new extraction run creates new derived evidence version
resolver compares/rebuilds canonical projection
old evidence can become SUPERSEDED, not silently mutated
```

No parser upgrade can rewrite financial history without lineage.

## 21. OCR confidence provenance

OCR-derived evidence adds:

```text
extraction_strategy = OCR
ocr_engine_id?
ocr_engine_version?
ocr_page_confidence?
```

These are provenance properties, not reasons to expose raw OCR text durably.

## 22. Source/account mapping

Statements may contain only masked identifiers. Mapping must be explicit:

```text
UNMAPPED
PROBABLE
USER_CONFIRMED
SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE
```

A statement cannot update the wrong account merely because institution + currency match.

## 23. Currency

Statement movement currency is source truth. Statement-level currency does not override row-level currency where both are present.

Cross-currency card statements may require:

```text
source_amount/source_currency
posted_amount/posted_currency
fx_rate?
```

Do not infer FX rates from rounded displayed values without evidence.

## 24. Dates

Preserve distinct dates where available:

```text
statement_date
period_start
period_end
occurred_at
authorized_at
posted_at
email_observed_at
```

Reconciliation uses configurable windows but never destroys original date semantics.

## 25. Deletion and privacy

Raw content follows transient retention rules.

Derived evidence/canonical history is user financial memory and remains encrypted locally under existing tenant deletion/reset semantics.

```text
DELETE RAW EARLY != DELETE DERIVED HISTORY
TENANT DELETE       => DELETE BOTH per lifecycle policy
```

## 26. Physical schema gates

Before migrations:

```text
REAL_FORMAT_CORPUS             REQUIRED
ADAPTER CONTRACT REVIEW        REQUIRED
RECONCILIATION SCORE REVIEW    REQUIRED
MONTHLY CLOSE UX REVIEW        REQUIRED
PRIVACY DATA CLASS REVIEW      REQUIRED
INDEX/QUERY REVIEW             REQUIRED
MIGRATION STRATEGY             REQUIRED
ANDROID PHYSICAL PARSE         REQUIRED FOR PRODUCT PROMOTION
IOS PHYSICAL PARSE             REQUIRED FOR CROSS-PLATFORM PROMOTION
BUILD_READY                    false
```
