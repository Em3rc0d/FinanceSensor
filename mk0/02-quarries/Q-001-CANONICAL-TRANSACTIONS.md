# Q-001 — Canonical Transaction Semantics

**Priority:** P0  
**Status:** OPEN

## Question

What financial event taxonomy and accounting semantics are required so FinanceSensor does not misstate a user's money?

## Evidence

Reviewed product patterns from Copilot Money, PocketGuard, Fintonic and the original financial-department concept all distinguish economic activity from account movement. See [`../../research/SOURCES.md`](../../research/SOURCES.md).

## Required distinctions

At minimum MK0 must distinguish:

```text
MONEY_IN
MONEY_OUT
TRANSFER
REFUND
REVERSAL
CARD_PAYMENT
FEE
RECURRING_OCCURRENCE
```

`RECURRING_OCCURRENCE` is a behavioral tag/relationship, not necessarily a separate economic direction.

## Critical cases

### Credit card

```text
Purchase with card       S/100 → EXPENSE
Pay card statement       S/100 → CARD_PAYMENT
Total consumption        S/100
```

### Own-account transfer

```text
BCP account              -S/500
Interbank account        +S/500

Income                    S/0
Expense                   S/0
Internal transfer        S/500
```

### Refund

A refund should be linked to an earlier purchase where evidence supports the relationship. It is not blindly treated as ordinary income.

### Reversal

An authorization followed by reversal must not become a permanent expense.

## Required fields for semantic resolution

Candidate events should support:

- direction;
- amount and currency;
- occurred/observed/posted timestamps;
- source account/instrument hint;
- counterparty/merchant;
- source evidence links;
- candidate semantic type;
- confidence;
- resolution state;
- relation to prior canonical event where applicable.

## Finding

A debit/credit model alone is insufficient for trustworthy user-facing analytics.

## Implication

The canonical ledger must represent **economic semantics**, not just source signs.

## Candidate decision

Adopt a canonical-event taxonomy that distinguishes purchase/expense, genuine income, internal transfer, external transfer, card settlement, refund, reversal and fee. Derive summary metrics from semantic types rather than raw source directions.

## Closure criteria

- taxonomy reviewed against at least 50 synthetic edge cases;
- explicit metric rules for each event type;
- refund/reversal/card-payment relationships specified;
- tests map directly to product invariants FIN-004 to FIN-007.
