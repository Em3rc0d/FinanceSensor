# FinanceSensor — Contradiction Register

A contradiction is not a failure of the process. It is evidence that an upstream claim needs revalidation before downstream closure.

## C-001 — External transfer is not an economic category

**Detected while revalidating:** Q-001 → DM-001 → FinancialState  
**Status:** OPEN  
**Owner:** Q-001

### Existing assumption

The resolver currently recognizes `EXTERNAL_TRANSFER` and the initial spike gives it zero income/expense contribution.

### Contradiction

A transfer to or from an external party is a **movement mechanism / ownership relationship**, not enough information to establish economic meaning.

Examples:

```text
transfer to landlord        → likely expense
transfer to own broker      → asset movement / not ordinary expense
transfer to friend          → loan, gift, reimbursement, shared expense, unknown
transfer received           → income, repayment, reimbursement, refund, unknown
```

Therefore:

```text
EXTERNAL_TRANSFER != automatically NEUTRAL
EXTERNAL_TRANSFER != automatically EXPENSE
EXTERNAL_TRANSFER != automatically INCOME
```

### Required reconciliation

Separate at least:

```text
movement semantics
        from
economic effect
```

Until resolved, external transfers must not silently alter user-facing income/expense totals. They require additional evidence or review.

### Downstream impact

- Q-001 remains `ACTIVE`.
- DM-001 remains `DRAFTED`.
- FinancialState summary semantics cannot freeze.
- `G-MK0 BUILD_READY` remains blocked.

---

## C-002 — Refund/reversal cannot remain zero-effect forever

**Detected while revalidating:** Q-001 → FinancialState  
**Status:** OPEN  
**Owner:** Q-001

### Existing assumption

Unlinked refund/reversal events currently contribute zero to summary totals to avoid misclassifying them as normal income.

### Contradiction

Once a refund or reversal is linked to its original event, the financial state must reflect the offset. Otherwise `Gastaste` can remain overstated.

Example:

```text
purchase             expense +100
refund linked        expense -100
net expense                 0
```

A refund is not ordinary income, but it is also not permanently economically inert.

### Required reconciliation

Introduce explicit relationship-aware economic projection:

```text
observed event
   + semantic relationship
   + original contribution
        ↓
resolved economic effect
```

### Downstream impact

- Q-001 remains `ACTIVE`.
- DM-001 must represent relationship-aware projection.
- FinancialState cannot derive totals solely from raw event type and amount.

## Rule

No contradiction is closed by wording changes alone. Closure requires model reconciliation plus executable evidence.
