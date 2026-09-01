# MK0 / 09 — Test Strategy

## Test philosophy

FinanceSensor is a financial-truth system. Testing must prioritize semantic correctness, idempotency, tenant isolation, privacy and explainability above screenshot polish.

## Test layers

### 1. Domain unit tests

Cover:

- transaction semantic classification;
- metric inclusion/exclusion;
- refund/reversal behavior;
- internal transfers;
- card settlement;
- recurrence calculations;
- opportunity calculations.

### 2. Property/invariant tests

Examples:

```text
replay same evidence N times
=> same canonical totals

internal transfer amount X
=> income_delta = 0 && expense_delta = 0

purchase X + card settlement X
=> expense_total = X

encrypted sync event delivered twice
=> state unchanged after second delivery
```

Every invariant in [`../05-data-model/INVARIANTS.md`](../05-data-model/INVARIANTS.md) should map to tests when in release scope.

### 3. Resolver benchmark

Labeled corpus with:

- exact duplicates;
- overlapping bank + merchant evidence;
- pending→posted;
- same merchant/amount genuine repeats;
- refund;
- reversal;
- own-account transfer;
- card payment;
- multi-device replay;
- incomplete/ambiguous evidence.

Metrics:

```text
precision
recall
false merge rate
false split rate
duplicate canonical event count
manual review rate
```

A target threshold must be frozen before release; do not invent one before benchmark data exists.

### 4. Connector contract tests

Gmail adapter:

- OAuth success/failure;
- token expiration;
- permission denial;
- revocation;
- pagination;
- incremental cursor;
- message changes;
- malformed MIME;
- rate limiting;
- offline retry;
- duplicate ingestion.

### 5. Multi-device sync tests

Scenarios:

- A creates → B receives;
- A and B ingest overlapping evidence;
- B corrects category → A converges;
- offline B rejoins;
- duplicate envelope delivery;
- out-of-order envelope delivery;
- device revoked;
- schema-version skew;
- processing lease expires mid-job.

### 6. Tenant-isolation tests

No query, event, cache, push or sync route may cross tenant boundaries.

Attempt:

- ID substitution;
- stale authorization;
- device from Tenant A requesting Tenant B envelope;
- cross-tenant source artifact collision;
- cache key collision.

### 7. Security/privacy tests

Verify:

- secure token storage;
- local DB encryption;
- logs contain no prohibited plaintext;
- crash artifacts redacted;
- cloud envelope is ciphertext;
- device revocation;
- logout;
- tenant deletion;
- source disconnect;
- notifications obey privacy mode.

### 8. Device-performance tests

On representative low/mid Android:

Measure:

```text
cold start
warm start
RAM peak
CPU duration
battery delta
thermal state
initial scan time
incremental scan time
DB size
background completion rate
```

Test realistic and stress data volumes.

### 9. UX viewport tests

For Home and Sensor:

- no vertical overflow at supported minimum viewport;
- system insets accounted for;
- text scaling/accessibility;
- tap target sizes;
- loading/empty/partial/stale/offline/error states;
- meaningful information not clipped.

### 10. Human comprehension tests

Ask non-finance users to interpret screens without coaching.

Questions:

- How much money entered?
- How much was spent?
- Is a transfer counted as spending?
- What changed?
- What does this opportunity mean?
- What is fact vs prediction?
- What does FinanceSensor need you to review?

Measure misunderstanding, not only preference.

## Regression packs

### FINANCIAL-TRUTH
Every release.

### CONNECTOR
Every adapter/source change.

### SYNC
Every schema/event/crypto transport change.

### PRIVACY
Every logging, analytics, source or cloud change.

### VIEWPORT
Every primary screen/layout change.

## Failure routing

```text
TEST FAILURE
   ├── implementation defect → BUILD
   ├── wrong test assumption → TEST REVIEW
   ├── domain ambiguity → DATA MODEL / Q-001
   ├── duplicate identity ambiguity → Q-002
   ├── UX contract problem → WIREFRAMES / DESIGN
   ├── security boundary problem → ARCH / ADR
   └── platform uncertainty → QUARRY / SPIKE
```

Testing is not a final gate only; it is a routing mechanism back to the actual defect layer.
