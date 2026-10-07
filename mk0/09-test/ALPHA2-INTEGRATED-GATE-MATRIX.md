# Alpha.2 — Integrated Gate Matrix

**Status:** TEST CONTRACT  
**Date:** 2026-09-06

## Purpose

Prevent physical APK churn by requiring executable evidence before a milestone candidate reaches an owned device.

## Gate matrix

| Gate | Required proof | Physical user action |
|---|---|---|
| Evidence semantics | no public pseudo-probability; truth-state contract tests | none |
| A Discovery | bounded Gmail + statement source fixtures | none |
| B Fetch/Parse | parser corpus, quarantine, metadata-first Gmail tests | none |
| C Vault | encrypted lifecycle/reopen/migration/recovery synthetic tests | none |
| D Reconciliation | deterministic match, margin, conflict and replay tests | none |
| E Account Graph | identity-strength and confirmation-state invariants | none |
| F Coverage | state machine, expected-source and reopen tests | none |
| G Sensor | deterministic category/recurrence tests | none |
| Web | unit + browser journeys using synthetic canonical ledger | none |
| Sync | E2EE envelope, replay, conflict, offline queue tests | none |
| Android | analyze + unit/widget + build | none |
| Privacy | raw-content and credential leakage validators | none |
| Milestone receipt | exact SHA + CI job/artifact binding | none |
| Integrated physical gate | all above green on same SHA | **one bounded campaign** |

## Mandatory regression cases

### Double-count prevention

One Gmail purchase plus the matching statement posting must yield exactly one canonical expense.

### Transfer exclusion

External/inter-account transfers do not enter expense totals solely because they are debits.

### Card-payment exclusion

Credit-card payment does not create a second purchase expense.

### Refund offset

A refund/reversal is related to the original effect instead of being treated as ordinary income.

### Missing statement

Gmail expenses may be OBSERVED, but month coverage remains partial and net movement cannot be presented as complete.

### Statement-only fee

A posted fee without Gmail notification still appears as a canonical expense.

### Unsupported parser

Detected unsupported statement formats remain quarantined; no generic fallback is allowed.

### Evidence score boundary

Internal reconciliation scores may change without altering public truth labels unless a deterministic state threshold is crossed.

The UI must not serialize or render a fixed `96% evidencia` confidence.

### Replay

Given identical source observations and model/version inputs, canonical ledger output and reconciliation decisions must be byte-stable or semantically equivalent under the frozen serialization contract.

### Web minimization

Web fixtures/API projections must reject fields representing raw Gmail body, raw MIME content, OAuth refresh/access token, PDF bytes or PDF password.

### Coverage honesty

A global percentage is forbidden unless the denominator and scope are explicit. Preferred state output is categorical coverage plus source counts.

## Physical-candidate rule

```text
ANY_INTERNAL_GATE_FAILS
    => NO NEW APK REQUEST

ALL_INTERNAL_GATES_PASS_ON_EXACT_SHA
    => HUMAN_MILESTONE_CANDIDATE
```

A physical failure returns only the affected contract to engineering; it does not trigger repeated ad-hoc APK attempts.
