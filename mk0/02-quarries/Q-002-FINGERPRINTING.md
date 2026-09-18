# Q-002 — Transaction Fingerprinting, Deduplication and Idempotency

**Priority:** P0  
**Status:** CLOSED

## Question

How do we recognize the same economic event when different sources, devices or provider states expose different identifiers without accidentally merging two genuine purchases?

## Closed rule

```text
provider_source_id != canonical_transaction_id
```

Source-native IDs are provenance/matching signals, not canonical economic identity.

## Resolver identity policy

```text
exact stable evidence replay
→ IDEMPOTENT

strong cross-artifact reference
+ no hard contradiction
→ AUTO-MERGE

strong weak-signal similarity
+ independent sources
+ no hard reference
→ REVIEW

same-source same-value nearby events
+ distinct evidence identity
→ KEEP SEPARATE
```

The system intentionally prefers a visible/recoverable false split or review over a silent false merge.

## Hard contradiction gates

Known mismatch on any of these blocks automatic identity:

```text
tenant
currency
amount at cent precision
flow direction
financial account when both known
payment instrument when both known
incompatible semantic type
```

Strong references cannot override those contradictions.

## Benchmark contract

Thresholds were frozen before benchmark acceptance in:

`spikes/canonical-resolver/BENCHMARK-CONTRACT.md`

```text
UNSAFE_FALSE_MERGES          = 0
AUTO_MERGE_PRECISION         = 100%
HARD_LINK_FALSE_SPLITS       = 0
REPLAY_DUPLICATE_COUNT       = 0
DECISION_ACCURACY            >= 95%
```

## Observed benchmark

The 28-scenario adversarial benchmark produced:

```text
unsafeFalseMerges       0
autoMergePrecision      100%
hardLinkFalseSplits     0
replayDuplicateCount    0
decisionAccuracy        100%
```

The full canonical resolver suite passed **98/98** at the closure-candidate baseline.

## Multi-device correctness link

Processing leases remain an optimization, not a correctness primitive. `spikes/e2ee-sync/test/lease-failure.test.js` demonstrates duplicate work can occur without duplicating canonical financial truth.

## Evidence

- `spikes/canonical-resolver/BENCHMARK-CONTRACT.md`
- `spikes/canonical-resolver/src/resolver.js`
- `spikes/canonical-resolver/test/fingerprinting.test.js`
- `spikes/canonical-resolver/test/fingerprinting-benchmark.test.js`
- `spikes/canonical-resolver/test/resolver.test.js`
- `spikes/e2ee-sync/test/lease-failure.test.js`
- `mk0/10-evidence/EV-Q001-Q002-CLOSURE-CANDIDATE-2026-09-01.md`

## Non-claims

Q-002 closure does not prove:

- production precision/recall for every provider;
- final provider-specific score calibration;
- every future pending→posted pattern;
- every future bank-API identity rule.

A supported real-data benchmark that exposes a false merge or missing identity signal reopens Q-002.

## Closure receipt

`mk0/11-decisions/closure-receipts/Q-002.md`

```text
Q-002 = CLOSED
```
