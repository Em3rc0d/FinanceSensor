# ADR-037 — Dual-source authority and web projection

**Status:** ACCEPTED FOR ALPHA.2 DESIGN  
**Date:** 2026-09-06

## Context

FinanceSensor now has physically demonstrated Gmail acquisition and statically certified statement/reconciliation components. A single product contract is required before mobile integration proceeds.

The tempting simplification is:

```text
statement = income
Gmail = expense
```

That is useful as a product-level acquisition heuristic but false as an invariant because statements also contain debits/fees/transfers/refunds and Gmail can contain credits or transfers.

## Decision

1. **Gmail is the primary low-latency event source for observed spending/events.**
2. **Bank statements are the primary periodic posted source for income and account truth, and an independent reconciliation authority for expenses.**
3. **Source role does not constrain economic semantics.**
4. **Canonical reconciliation, not source preference alone, determines the final movement.**
5. **The web renders only canonical minimized ledger projections; raw Gmail and raw statement documents remain trusted-edge data by default.**
6. **User-facing evidence uses discrete truth states, not pseudo-probability percentages.**
7. **The next physical APK is a milestone candidate only after integrated synthetic/CI gates pass.**

## Truth states

```text
UNKNOWN
PARTIAL
OBSERVED
POSTED
RECONCILED
```

An internal match score may decide a deterministic reconciliation threshold. It is not a probability and is not exposed as `% evidencia`.

## Consequences

### Positive

- prevents statement/Gmail double counting;
- preserves near-real-time UX while allowing later posted correction;
- supports bank fees/refunds/transfers correctly;
- makes coverage honesty explicit;
- keeps the web simple without discarding provenance;
- reduces raw restricted-data server exposure.

### Costs

- the canonical model must retain multi-source bindings;
- a month can remain partial even when many Gmail events were observed;
- sync and web projection must preserve truth/coverage state;
- Google restricted-scope production verification remains a separate gate.

## Rejected alternatives

### Treat Gmail as full financial truth

Rejected: absence of an email is not proof that a transaction did not occur.

### Treat statements only as income feeds

Rejected: discards useful posted debit/reconciliation evidence and creates avoidable semantic inconsistencies.

### Show match confidence as a public percentage

Rejected: deterministic match scores are not calibrated probabilities.

### Upload raw Gmail/statements for server-side processing

Rejected for Alpha.2: violates the chosen minimization boundary and expands policy/security exposure.

## Governing laws

```text
PRIMARY_SOURCE_ROLE != EXCLUSIVE_SEMANTICS
MATCH_SCORE != PROBABILITY
OBSERVED != POSTED
POSTED + INDEPENDENT_MATCH -> RECONCILED
MONEY_LEFT_ACCOUNT != EXPENSE
RAW_EVIDENCE != WEB_PROJECTION
CI_GREEN != PHYSICAL_PASS
```
