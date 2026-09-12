# DM-001 Addendum — Movement Semantics vs Economic Effect

**Status:** DRAFTED / Q-001 semantic slice reconciled  
**Blocks:** DM-001 freeze until the broader model, architecture and security dependencies close.

## Problem

A raw financial movement does not always tell us how it should affect the user's financial story.

The initial taxonomy mixed two dimensions:

1. **what kind of movement happened**;
2. **what economic effect that movement has for this tenant**.

Those dimensions are now explicitly separated.

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

## Axis B — flow direction

```text
IN
OUT
UNKNOWN
```

Direction is an observation about movement, not an economic classification by itself.

## Axis C — ownership / relationship

```text
OWN_ACCOUNT
EXTERNAL_PARTY
MERCHANT
EMPLOYER
FINANCIAL_INSTITUTION
UNKNOWN
```

This helps distinguish an internal transfer from an economically meaningful external movement.

## Axis D — economic effect

```text
EXPENSE
INCOME
NEUTRAL
OFFSET_EXPENSE
OFFSET_INCOME
UNKNOWN
```

This is the dimension consumed by financial summaries.

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
| External transfer OUT | EXTERNAL_PARTY | purpose unknown | UNKNOWN / REVIEW |
| External transfer OUT | EXTERNAL_PARTY | rent/payment evidence | EXPENSE |
| External transfer IN | EXTERNAL_PARTY | salary/client evidence | INCOME |
| External transfer | — | explicit neutral relationship | NEUTRAL |

## Canonical event implication

`CanonicalFinancialEvent` must not rely on one enum to encode all semantics.

Candidate logical direction:

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

The exact physical columns remain unfrozen.

## External-transfer resolution

An external transfer starts unresolved unless evidence or an auditable user correction establishes its economic meaning.

```text
TRANSFER + OUT + no meaning evidence
→ REQUIRES_REVIEW
→ income 0 / expense 0

TRANSFER + OUT + resolved EXPENSE
→ expense +amount

TRANSFER + IN + resolved INCOME
→ income +amount

TRANSFER + explicit NEUTRAL
→ income 0 / expense 0
```

Direction and resolved effect must be compatible. For example, an outgoing transfer cannot silently become `INCOME`.

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
remaining offset capacity
        ↓
current contribution delta
```

Example:

```text
PURCHASE S/100
  economic_effect = EXPENSE
  expense_delta   = +100

REFUND #1 S/40
  relation        = REFUNDS purchase
  expense_delta   = -40
  remaining       = 60

REFUND #2 S/35
  relation        = REFUNDS purchase
  expense_delta   = -35
  remaining       = 25
```

A later refund of S/30 would exceed the remaining S/25 and therefore routes to review rather than producing an impossible negative net expense.

The original event is not destructively rewritten. Materialized financial state is projected from the event graph and its relationships.

## Canonical invariants

This addendum no longer maintains a second invariant namespace. The authoritative rules live in:

- `product/PRODUCT-INVARIANTS.md`
- `mk0/05-data-model/INVARIANTS.md`

Relevant product invariants:

```text
FIN-004  internal transfers do not create income/expense
FIN-005  card settlement is not the purchase again
FIN-009  movement mechanism is not economic meaning
FIN-010  offsets cannot erase more economic value than exists
```

Relevant data-model invariants:

```text
INV-FIN-001  internal-transfer neutrality
INV-FIN-002  card-settlement neutrality
INV-FIN-003  refund is not ordinary income
INV-FIN-004  reversal follows explicit semantics
INV-FIN-010  unresolved external movement has no invented effect
INV-FIN-011  cumulative offsets are bounded by original contribution
```

## Executable reconciliation evidence

Current bounded evidence:

- `spikes/canonical-resolver/test/economic-effect.test.js`
- `spikes/canonical-resolver/test/fingerprinting-benchmark.test.js`
- `mk0/10-evidence/EV-Q001-Q002-CLOSURE-CANDIDATE-2026-09-01.md`

The current suite demonstrates unresolved/resolved external transfers, direction/effect compatibility, partial/full refunds, cumulative-offset bounds, reversals, idempotency and adversarial matching behavior.

## Non-claims

This semantic reconciliation does not freeze:

- the final SQL/SQLite physical representation;
- real-provider extraction accuracy;
- UI wording for every review state;
- every future movement family beyond MK0 scope.

New evidence can reopen Q-001 if it reveals an unmodeled contradiction.
