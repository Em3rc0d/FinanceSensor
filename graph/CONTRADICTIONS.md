# FinanceSensor — Contradiction Register

A contradiction is not a failure of the process. It is evidence that an upstream claim needs revalidation before downstream closure.

## C-001 — External transfer is not an economic category

**Detected while revalidating:** Q-001 → DM-001 → FinancialState  
**Status:** CLOSED  
**Owner:** Q-001

### Original contradiction

A transfer to or from an external party is a **movement mechanism / ownership relationship**, not enough information to establish economic meaning.

```text
EXTERNAL_TRANSFER != automatically NEUTRAL
EXTERNAL_TRANSFER != automatically EXPENSE
EXTERNAL_TRANSFER != automatically INCOME
```

### Resolved rule

FinanceSensor now separates:

```text
movement semantics
+ flow direction
+ ownership / relationship
+ explicit evidence or auditable correction
→ economic effect
```

An unresolved external transfer remains `REQUIRES_REVIEW` and contributes zero to authoritative income/expense totals until its economic effect is established.

Explicit effect must be direction-compatible:

```text
OUT + EXPENSE  → resolved expense
IN  + INCOME   → resolved income
ANY + NEUTRAL  → resolved neutral when explicitly established
OUT + INCOME   → review
IN  + EXPENSE  → review
```

### Canonical invariants

- `FIN-009` — movement mechanism is not economic meaning.
- `INV-FIN-010` — unresolved external movement cannot invent economic effect.

### Evidence

- `spikes/canonical-resolver/test/economic-effect.test.js`
- `mk0/10-evidence/EV-Q001-Q002-CLOSURE-CANDIDATE-2026-09-01.md`
- `mk0/11-decisions/closure-receipts/C-001.md`

### Revalidation trigger

Reopen C-001 if a supported source or correction path can mutate authoritative totals from movement direction/mechanism alone or introduces a transfer family that cannot be represented safely by the current axes.

---

## C-002 — Refund/reversal cannot remain zero-effect forever

**Detected while revalidating:** Q-001 → FinancialState  
**Status:** CLOSED  
**Owner:** Q-001

### Original contradiction

A refund is not ordinary income, but once linked to a prior expense it also cannot remain economically inert forever. Likewise, a reversal must affect the event it reverses according to explicit semantics.

### Resolved rule

Projection is relationship-aware and bounded:

```text
unlinked refund/reversal
→ no automatic mutation

linked partial refund
→ offsets original expense up to remaining contribution

linked full refund
→ may reduce net expense to zero

cumulative offset > remaining original contribution
→ REQUIRES_REVIEW

exact compatible reversal
→ negates original contribution

incompatible amount / prior partial offset / ambiguous link
→ REQUIRES_REVIEW
```

The materialized financial state is projected from the event graph; the original source event is not destructively rewritten.

### Canonical invariants

- `FIN-010` — offsets cannot erase more economic value than exists.
- `INV-FIN-003` — refund is not blindly ordinary income.
- `INV-FIN-004` — reversal follows explicit semantic rules.
- `INV-FIN-011` — cumulative offsets are bounded by original contribution.

### Evidence

- `spikes/canonical-resolver/test/economic-effect.test.js`
- `mk0/10-evidence/EV-Q001-Q002-CLOSURE-CANDIDATE-2026-09-01.md`
- `mk0/11-decisions/closure-receipts/C-002.md`

### Revalidation trigger

Reopen C-002 if automatic projection can over-offset an original contribution, count a linked refund as ordinary income, reverse an incompatible event/amount, or a new chargeback/refund family cannot be represented safely.

## Current contradiction state

```text
C-001 CLOSED
C-002 CLOSED
OPEN CONTRADICTIONS = 0
```

## Rule

No contradiction is closed by wording changes alone. Closure requires model reconciliation, executable evidence and a closure receipt. Later contradictory evidence can reopen a closed contradiction and block downstream nodes.
