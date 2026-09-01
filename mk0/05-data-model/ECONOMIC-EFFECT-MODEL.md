# DM-001 Addendum — Movement Semantics vs Economic Effect

**Status:** DRAFT / produced by Q-001 contradiction audit.  
**Blocks:** DM-001 freeze until executable evidence reconciles C-001 and C-002.

## Problem

A raw financial movement does not always tell us how it should affect the user's financial story.

The initial taxonomy mixed two dimensions:

1. **what kind of movement happened**;
2. **what economic effect that movement has for this tenant**.

Those dimensions must be separated.

## Axis A — movement semantics

Candidate values:

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

This describes the observed financial mechanism/event family.

## Axis B — ownership / relationship

```text
OWN_ACCOUNT
EXTERNAL_PARTY
MERCHANT
EMPLOYER
FINANCIAL_INSTITUTION
UNKNOWN
```

This helps distinguish an internal transfer from an economically meaningful external movement.

## Axis C — economic effect

```text
EXPENSE
INCOME
NEUTRAL
OFFSET_EXPENSE
OFFSET_INCOME
UNKNOWN
```

This is the dimension that financial summaries consume.

## Projection state

Economic effect can be unresolved even when the movement is known.

```text
RESOLVED
NEUTRAL
REQUIRES_REVIEW
REQUIRES_LINK
OFFSET
```

Examples:

| Observed movement | Relationship | Additional evidence | Economic effect |
|---|---|---|---|
| Card purchase | Merchant | — | EXPENSE |
| Salary deposit | Employer | — | INCOME |
| Account A → owned Account B | OWN_ACCOUNT | ownership confirmed | NEUTRAL |
| Credit-card settlement | FINANCIAL_INSTITUTION | settles owned card | NEUTRAL |
| Bank fee | FINANCIAL_INSTITUTION | — | EXPENSE |
| Refund | Merchant | linked original expense | OFFSET_EXPENSE |
| Reversal | — | linked original event | inverse of original effect |
| External transfer | EXTERNAL_PARTY | purpose unknown | UNKNOWN |
| External transfer | EXTERNAL_PARTY | rent/payment evidence | EXPENSE |
| External transfer received | EXTERNAL_PARTY | salary/client evidence | INCOME |

## Canonical event implication

`CanonicalFinancialEvent` should not rely on one enum to encode all semantics.

Candidate direction:

```text
id
movement_type
flow_direction
amount
currency
ownership_relation
economic_effect
economic_effect_state
...
```

The exact physical fields remain unfrozen.

## Relationship-aware projection

Refunds and reversals require relationships:

```text
CanonicalFinancialEvent
        ↓
FinancialEventRelation
        ↓
original event
        ↓
original economic contribution
        ↓
current contribution delta
```

Example:

```text
PURCHASE S/100
  economic_effect = EXPENSE
  expense_delta   = +100

REFUND S/40
  relation        = REFUNDS purchase
  economic_effect = OFFSET_EXPENSE
  expense_delta   = -40
```

The original event is not destructively rewritten. The materialized financial state is projected from the event graph.

## Invariants introduced

### INV-ECO-001
Movement mechanism does not by itself determine economic effect when ownership/purpose is unresolved.

### INV-ECO-002
External transfers default to `economic_effect = UNKNOWN`, not silently to expense/income/neutral.

### INV-ECO-003
Internal transfers between tenant-owned accounts contribute zero to income and expense.

### INV-ECO-004
Card settlement contributes zero to expense when it settles purchases already represented as expenses.

### INV-ECO-005
A linked refund offsets the related expense rather than becoming ordinary income.

### INV-ECO-006
A linked reversal negates the economic contribution of the event it reverses.

### INV-ECO-007
Unlinked refund/reversal events remain unresolved and cannot silently alter totals until relationship confidence is sufficient.

### INV-ECO-008
Forecast/predicted occurrences never project as observed economic effect.

## Closure condition

This addendum can be merged into DM-001 only after:

```text
semantic matrix
    +
relationship-aware projection tests
    +
external-transfer unresolved tests
    +
refund/reversal offset tests
        ↓
Q-001 closure audit
```
