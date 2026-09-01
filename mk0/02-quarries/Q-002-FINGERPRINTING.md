# Q-002 — Transaction Fingerprinting, Deduplication and Idempotency

**Priority:** P0  
**Status:** ACTIVE

## Question

How do we recognize the same economic event when different sources, devices or provider states expose different identifiers without accidentally merging two genuine purchases?

## Central rule

```text
provider_source_id != canonical_transaction_id
```

External IDs are provenance and matching signals, not economic identity.

## Current resolver safety posture

The current feasibility spike is deliberately conservative:

```text
exact same evidence replay
        ↓
IDEMPOTENT / ignore duplicate

shared hard cross-artifact reference
(order / receipt / invoice / authorization / provider transaction id)
        ↓
AUTO-MERGE if all hard compatibility checks pass

independent sources + compatible merchant + high similarity
but no hard reference
        ↓
REVIEW, not silent merge

same source family + same amount + same merchant + nearby time
but distinct evidence identities
        ↓
KEEP SEPARATE
```

The design currently prefers a temporary false split over a silent false merge because a false merge corrupts financial truth and is difficult for a user to detect.

## Hard compatibility gates

Current spike rejects matching when any of these contradict:

```text
tenant
currency
amount at cent precision
semantic compatibility
```

A shared reference cannot override a different amount or incompatible semantic type.

## Candidate matching signals

```text
tenant
financial account / payment instrument
amount
currency
merchant canonical identity
merchant raw identity
time window
event semantic type
source family
receipt/order/invoice references
authorization reference
provider transaction reference
evidence identity
```

No one weak field is sufficient.

## Evidence already produced

The safety matrix currently verifies at least:

- exact replay convergence;
- bank email + merchant receipt correlation;
- genuine same-value purchases remain separate;
- same-source same-value purchases minutes apart remain separate;
- cross-source similarity without hard reference routes to review;
- different known merchants stay separate;
- shared order ID can merge;
- shared authorization ID can connect pending/posting evidence;
- tenant isolation;
- currency isolation;
- amount mismatch blocks merge even with shared reference;
- purchase vs reversal remain distinct;
- compatible refund/income evidence can converge only with hard linkage;
- missing merchant remains reviewable, not auto-merged.

See:

- `../../spikes/canonical-resolver/test/fingerprinting.test.js`
- `../../spikes/canonical-resolver/test/resolver.test.js`
- `../10-evidence/EV-MK0-ECG-2026-09-01.md`

## Device idempotency

Each source artifact/evidence needs a stable identity such that:

```text
process(E) once == process(E) N times
```

Processing leases can reduce duplicate work across devices, but they are never the correctness mechanism. Duplicate delivery/replay must remain safe.

## False-positive cost

Incorrectly merging two genuine equal-value purchases is financial corruption.

Example:

```text
09:00 Coffee S/20
09:02 Coffee S/20
```

Two source artifacts may represent two real purchases. Similarity alone cannot prove identity.

## Finding

Transaction resolution is an evidence-identity problem, not a database `UNIQUE` constraint and not merely a similarity score.

## Implication

FinanceSensor needs separate identities for:

1. `SourceArtifact`;
2. `FinancialEvidence`;
3. `FinancialEventCandidate`;
4. `CanonicalFinancialEvent`.

Resolver lineage must preserve why evidence was merged, reviewed, rejected or kept separate.

## Non-claims

Current tests do not establish:

- production precision/recall against real heterogeneous mail/provider data;
- final score weights/thresholds;
- behavior across every pending→posted provider pattern;
- complete multi-device convergence;
- bank-API reconciliation behavior.

## Benchmark still required

Before Q-002 can close, create a labeled adversarial benchmark with intentional:

```text
true duplicates
true same-value separate purchases
pending → posted transitions
cross-source receipts
partial refunds
reversals
merchant-name variations
missing merchant/account identifiers
multi-device replay
contradictory references
```

Measure at minimum:

```text
false merge rate
false split rate
auto-merge precision
review rate
replay duplicate count
```

The acceptable thresholds must be frozen before closure rather than chosen after seeing results.

## Closure criteria

- adversarial benchmark exists and is versioned;
- precision/false-merge/false-split targets are declared before benchmark acceptance;
- exact replay never increases canonical event count/totals;
- weak similarity never silently forces a merge;
- ambiguous cross-source cases route to review;
- hard-reference contradictions block merge;
- behavior reconciles with DM-001 and Q-001 economic semantics;
- multi-device replay is tested before final closure;
- closure audit passes;
- Q-002 closure receipt is issued.
