# Q-002 Adversarial Fingerprinting Benchmark Contract

**Frozen before benchmark acceptance:** 2026-09-01  
**Scope:** MK0 bounded synthetic resolver spike  
**Purpose:** prevent post-hoc threshold tuning from turning unsafe matching into a passing result.

## Decision classes

Every benchmark scenario has exactly one expected resolver outcome:

```text
MERGE
  Strong evidence establishes that two artifacts represent one economic event.

REVIEW
  Evidence suggests one event but is insufficient for silent mutation of financial truth.

SEPARATE
  Evidence represents distinct events or contains a hard contradiction.
```

## Acceptance thresholds

```text
UNSAFE_FALSE_MERGES          = 0
AUTO_MERGE_PRECISION         = 100%
HARD_LINK_FALSE_SPLITS       = 0
REPLAY_DUPLICATE_COUNT       = 0
DECISION_ACCURACY            >= 95%
```

### Why false merge tolerance is zero

A false split is visible and recoverable: the user can review two events and join them later.

A false merge is more dangerous because it silently deletes economic reality from the canonical ledger. Therefore:

```text
FALSE_MERGE_COST > FALSE_SPLIT_COST
```

The MK0 resolver is intentionally conservative.

## Hard contradictions

The resolver must refuse automatic identity when known values contradict on any current hard gate:

```text
tenant
currency
amount at cent precision
flow direction
financial account when both are known
payment instrument when both are known
incompatible semantic type
```

A shared provider/order/authorization reference is strong evidence, but it cannot override these contradictions.

## Weak similarity

The following may increase match confidence but must not independently prove identity:

```text
same amount
same normalized merchant
nearby time
same account/instrument
independent source families
```

Without a hard cross-artifact reference, a strong cross-source similarity may route to `REVIEW`, not `MERGE`.

## Benchmark non-claims

Passing this benchmark does not prove production precision on real providers. It proves only that the current resolver satisfies this versioned adversarial contract.

Production/provider calibration remains subject to later real-data evidence and may reopen Q-002 if new failure classes appear.
