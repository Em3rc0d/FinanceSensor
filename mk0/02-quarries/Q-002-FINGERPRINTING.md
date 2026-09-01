# Q-002 — Transaction Fingerprinting, Deduplication and Idempotency

**Priority:** P0  
**Status:** OPEN

## Question

How do we recognize the same economic event when different sources, devices or provider states expose different identifiers?

## Problem

The same purchase may appear as:

- bank authorization email;
- bank posted-transaction email;
- merchant receipt;
- invoice PDF;
- bank API transaction later;
- duplicate ingestion from another authorized device.

A naive implementation creates duplicate expenses.

## Central rule

```text
provider_source_id != canonical_transaction_id
```

External IDs remain provenance signals, not economic identity.

## Candidate fingerprint dimensions

A fingerprint/resolver may consider:

```text
tenant
financial account / payment instrument
amount
currency
merchant canonical identity
merchant raw identity
time window
event semantic type
authorization/posted state
source family
receipt/order/invoice references
provider IDs
evidence hashes
```

No single field is sufficient in all cases.

## Resolution levels

### Deterministic match

Examples:

- identical immutable source artifact reprocessed;
- exact receipt/order reference with compatible amount;
- known authorization→posting linkage.

### Strong probabilistic/composite match

Example:

```text
same tenant
same card
same amount/currency
merchant normalized equal
within temporal tolerance
compatible source types
```

### Ambiguous

Do not force the match. Create/reuse a `ReviewTask`.

## Device idempotency

Each evidence event should have enough source identity to guarantee:

```text
process(E) once == process(E) N times
```

Multi-device execution must also converge when Device A and Device B observe overlapping evidence.

## False-positive cost

Incorrectly merging two genuine equal-value purchases is also financial corruption. Deduplication therefore optimizes correctness, not merely reducing duplicates.

## Finding

Transaction resolution is an identity problem, not a database UNIQUE constraint problem.

## Implication

FinanceSensor needs a dedicated resolver with deterministic rules, composite fingerprints, confidence and explicit ambiguity.

## Candidate decision

Create separate identities for:

1. `SourceArtifact`;
2. `FinancialEvidence`;
3. `FinancialEventCandidate`;
4. `CanonicalFinancialEvent`.

Keep resolver lineage linking all layers.

## Closure criteria

- benchmark dataset includes duplicates, same-amount real purchases, pending→posted, refund/reversal and multi-device replay;
- precision/recall targets defined;
- no duplicate canonical event under exact replay;
- ambiguous cases never silently force-merge;
- property-based/idempotency test design completed.
