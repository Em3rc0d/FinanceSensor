# Q-001 — Canonical Transaction Semantics

**Priority:** P0  
**Status:** CLOSED

## Question

What financial semantics are required so FinanceSensor does not misstate a user's money?

## Closed finding

A single event-type enum is insufficient. MK0 now separates:

```text
observed movement
+ flow direction
+ ownership / counterparty relation
+ semantic relationship to other events
→ economic effect
→ projection state
```

The reconciled model is in `mk0/05-data-model/ECONOMIC-EFFECT-MODEL.md`.

## Closed rules

- Internal transfers between tenant-owned accounts contribute zero income and zero expense.
- Card settlement does not count underlying purchases again.
- External transfer mechanism/direction alone does not determine economic effect.
- Unresolved external transfers remain `REQUIRES_REVIEW` and do not silently mutate totals.
- Explicit external-transfer economic effects must be direction-compatible.
- Refunds are not ordinary income when linked to a prior expense.
- Partial/full refunds offset the original expense.
- Cumulative automatic offsets cannot exceed the original economic contribution.
- Exact compatible reversals negate the original contribution.
- Unlinked, amount-incompatible or already-partially-offset reversals route to review.
- Unknown movements never fabricate an economic effect.

## Canonical invariants introduced/reconciled

Product:

```text
FIN-004
FIN-005
FIN-009
FIN-010
```

Data model:

```text
INV-FIN-001
INV-FIN-002
INV-FIN-003
INV-FIN-004
INV-FIN-010
INV-FIN-011
```

## Contradictions resolved

- `C-001` — external transfer is not an economic category → **CLOSED**.
- `C-002` — refund/reversal require relationship-aware bounded offsets → **CLOSED**.

Closure receipts:

- `mk0/11-decisions/closure-receipts/C-001.md`
- `mk0/11-decisions/closure-receipts/C-002.md`

## Evidence

The bounded resolver suite passed **98/98** tests at the closure-candidate baseline and includes:

- 54-case semantic corpus;
- external-transfer unresolved/resolved/direction-conflict cases;
- internal-transfer and card-settlement neutrality;
- partial/full/cumulative refund behavior;
- reversal/link/mismatch behavior;
- unknown/review behavior;
- existing resolver regressions.

Primary evidence:

- `spikes/canonical-resolver/src/resolver.js`
- `spikes/canonical-resolver/fixtures/classification-cases.json`
- `spikes/canonical-resolver/test/corpus.test.js`
- `spikes/canonical-resolver/test/economic-effect.test.js`
- `spikes/canonical-resolver/test/resolver.test.js`
- `mk0/10-evidence/EV-Q001-Q002-CLOSURE-CANDIDATE-2026-09-01.md`

## Non-claims

Q-001 closure does not claim:

- production extraction/classification accuracy for every bank/provider;
- final physical database schema;
- final UX for review states;
- every future financial movement family;
- complete forecast/recurring implementation.

Any later evidence that violates the closed semantic rules reopens Q-001.

## Closure receipt

`mk0/11-decisions/closure-receipts/Q-001.md`

```text
Q-001 = CLOSED
```
