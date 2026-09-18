# EV-Q001/Q002 — Canonical Semantics + Fingerprinting Closure Candidate

**Evidence type:** bounded executable closure-candidate evidence  
**Validated commit:** `7f8f4896c900d2b81201aa2785b18393b2f175c9`  
**Workflow:** `MK0 Foundation` run `33517007407`  
**Canonical resolver job:** `99886445589`  
**Date:** 2026-09-01

## Purpose

Record the executable evidence used to audit:

- `C-001` external-transfer economic semantics;
- `C-002` refund/reversal bounded relationship-aware projection;
- `Q-001` canonical financial semantics;
- `Q-002` fingerprinting, deduplication and idempotency.

This artifact is not itself a closure receipt. Each node still requires an explicit closure audit and receipt.

## Test result

```text
canonical-resolver tests     98
pass                         98
fail                          0
cancelled                     0
skipped                       0
```

The suite includes the pre-existing 54-case semantic corpus plus targeted economic-effect, fingerprinting, replay and adversarial benchmark tests.

## C-001 evidence

The suite proves the bounded candidate rules:

```text
EXTERNAL_TRANSFER + no explicit economic effect
→ REQUIRES_REVIEW
→ income 0 / expense 0

OUT + explicitly resolved EXPENSE
→ expense contribution

IN + explicitly resolved INCOME
→ income contribution

explicit NEUTRAL
→ income 0 / expense 0

direction/effect contradiction
→ REQUIRES_REVIEW
```

This separates movement mechanism/direction from economic meaning.

## C-002 evidence

The suite proves bounded relationship-aware offset rules:

```text
unlinked refund/reversal
→ no automatic economic mutation

linked partial refund
→ offsets original expense

linked full refund
→ can reduce net expense to zero

multiple partial refunds
→ bounded by remaining original contribution

cumulative over-refund
→ REQUIRES_REVIEW

reversal after existing partial offset
→ REQUIRES_REVIEW

exact linked reversal
→ negates original economic contribution
```

## Q-002 benchmark contract

Acceptance thresholds were frozen before benchmark execution in:

`spikes/canonical-resolver/BENCHMARK-CONTRACT.md`

Thresholds:

```text
UNSAFE_FALSE_MERGES          = 0
AUTO_MERGE_PRECISION         = 100%
HARD_LINK_FALSE_SPLITS       = 0
REPLAY_DUPLICATE_COUNT       = 0
DECISION_ACCURACY            >= 95%
```

## Q-002 observed benchmark metrics

The 28-scenario adversarial benchmark produced:

```json
{
  "unsafeFalseMerges": 0,
  "autoMergePrecision": 1,
  "hardLinkFalseSplits": 0,
  "replayDuplicateCount": 0,
  "decisionAccuracy": 1
}
```

Covered traps include:

- exact replay;
- hard cross-artifact order/receipt/authorization/provider references;
- weak cross-source similarity routed to review;
- same-source equal purchases kept separate;
- merchant conflicts;
- tenant conflicts;
- currency conflicts;
- amount conflicts;
- flow-direction conflicts;
- financial-account conflicts;
- payment-instrument conflicts;
- semantic purchase/reversal conflicts;
- missing merchant/account hints;
- far-apart matching with and without hard linkage;
- provider/native ID reuse constraints.

## Additional resolver hardening introduced

The candidate fingerprint/matcher now treats these known contradictions as hard identity blockers:

```text
tenant mismatch
currency mismatch
amount mismatch at cent precision
flow-direction mismatch
known account mismatch
known instrument mismatch
incompatible semantic type
```

`flowDirection` is retained on the candidate and participates in fingerprinting/provenance fallback identity.

## What this evidence proves

Within the bounded synthetic MK0 resolver spike:

- movement semantics and economic effect are separable;
- unresolved external transfers do not silently mutate totals;
- explicit resolved effects must be direction-compatible;
- linked offsets are bounded by original economic contribution;
- replay is idempotent;
- weak similarity does not silently force identity;
- strong references cannot override hard contradictions;
- the frozen Q-002 adversarial acceptance thresholds are met.

## What this evidence does NOT prove

It does not establish:

- production classification accuracy across real banks/merchants/locales;
- completeness of every future financial movement family;
- final physical database schema;
- production pending→posted behavior for every provider;
- provider-specific calibration on real user mail;
- final bank-API reconciliation;
- production UI behavior for review tasks.

Those observations can reopen Q-001/Q-002 if new contradiction classes appear.

## Candidate decision

```text
C-001 closure candidate   PASS
C-002 closure candidate   PASS
Q-001 closure audit       READY
Q-002 closure audit       READY AFTER Q-001
BUILD_READY               NO
```
