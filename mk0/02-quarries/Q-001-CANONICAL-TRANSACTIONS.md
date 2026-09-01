# Q-001 — Canonical Transaction Semantics

**Priority:** P0  
**Status:** ACTIVE

## Question

What financial semantics are required so FinanceSensor does not misstate a user's money?

## Current finding

A single event-type enum is not enough. Reverse validation exposed that FinanceSensor must separate:

```text
observed movement
      +
ownership / counterparty relation
      +
semantic relationship to other events
      ↓
economic effect
```

The detailed candidate model is in [`../05-data-model/ECONOMIC-EFFECT-MODEL.md`](../05-data-model/ECONOMIC-EFFECT-MODEL.md).

## Evidence already produced

The current spike includes:

- 54 synthetic classification cases;
- relationship-aware economic projection tests;
- internal-transfer neutrality;
- card-settlement neutrality;
- external-transfer unresolved state;
- linked partial/full refund offsets;
- linked reversal offsets;
- mismatch/unlinked cases routed to review/link resolution.

See:

- `../../spikes/canonical-resolver/fixtures/classification-cases.json`
- `../../spikes/canonical-resolver/test/corpus.test.js`
- `../../spikes/canonical-resolver/test/economic-effect.test.js`
- `../10-evidence/EV-MK0-ECG-2026-09-01.md`

## Critical distinctions

### Expense / purchase

A merchant purchase creates an expense contribution once canonicalized.

### Income

A genuine income event creates an income contribution once its economic meaning is resolved.

### Own-account transfer

```text
BCP account              -S/500
Interbank account        +S/500

Income                    S/0
Expense                   S/0
```

Ownership confirmation is what makes the transfer neutral.

### Card settlement

```text
Purchase with card       S/100 → expense +100
Pay card statement       S/100 → neutral settlement
Total consumption        S/100
```

The card payment must not duplicate the underlying consumption.

### External transfer

An external transfer is **not itself an economic classification**.

```text
transfer to landlord        → may be EXPENSE
transfer to own broker      → may be NEUTRAL asset movement
transfer to friend          → loan / gift / reimbursement / unknown
transfer received           → income / repayment / refund / unknown
```

Therefore unresolved external transfers must not silently mutate income/expense totals.

### Refund

A refund is not ordinary income. Once linked to an original expense it offsets that expense.

```text
purchase      expense +100
refund        expense -40
net expense            60
```

### Reversal

A linked reversal negates the economic contribution of the event it reverses. An unlinked or amount-incompatible reversal requires resolution/review.

## Contradictions discovered

Reverse traversal of Q-001 → DM-001 → FinancialState opened:

- `C-001`: external transfer is a movement mechanism, not an economic category;
- `C-002`: refund/reversal require relationship-aware offsets.

See [`../../graph/CONTRADICTIONS.md`](../../graph/CONTRADICTIONS.md).

Both remain formally OPEN even though candidate executable behavior now exists. They close only through the graph closure protocol.

## Candidate semantic axes

### Movement

```text
PURCHASE
DEPOSIT
TRANSFER
CARD_SETTLEMENT
FEE
REFUND
REVERSAL
ADJUSTMENT
UNKNOWN
```

### Ownership / relationship

```text
OWN_ACCOUNT
EXTERNAL_PARTY
MERCHANT
EMPLOYER
FINANCIAL_INSTITUTION
UNKNOWN
```

### Economic effect

```text
EXPENSE
INCOME
NEUTRAL
OFFSET_EXPENSE
OFFSET_INCOME
UNKNOWN
```

### Effect state

```text
RESOLVED
NEUTRAL
REQUIRES_REVIEW
REQUIRES_LINK
OFFSET
```

The physical schema is deliberately not frozen yet.

## Finding

A debit/credit model, transaction direction, or source-provided label alone is insufficient for trustworthy user-facing analytics.

## Implication

Financial summaries must be projections from canonical events **plus their relationships and resolved economic effects**, not simple sums of raw debits/credits.

## Non-claims

Current passing synthetic tests do not prove:

- real-world financial-email classification accuracy;
- correctness across every bank/provider locale;
- final physical schema;
- external-transfer purpose inference;
- full refund/reversal relationship discovery.

## Closure criteria

Q-001 closes only when:

- >=50 semantic edge cases remain green;
- economic-effect rules are explicit for every MK0 movement family;
- C-001 and C-002 are reconciled and formally closed;
- relationship-aware refund/reversal/card-payment behavior has regression evidence;
- external transfers remain unresolved unless evidence establishes effect;
- model vocabulary is reconciled into DM-001;
- closure audit finds no upstream/downstream contradiction;
- a Q-001 closure receipt is issued.
