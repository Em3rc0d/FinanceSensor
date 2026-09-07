# Alpha.2 — Consolidated Money Experience

**Status:** DESIGN CONTRACT / IMPLEMENTATION GATED  
**Date:** 2026-09-06

## Product sentence

FinanceSensor turns two imperfect financial evidence streams into one explainable monthly view:

- **Bank statements** provide periodic posted truth, especially authoritative inflows and account-level reconciliation.
- **Gmail** provides near-real-time observed outflows and transaction events.
- **Reconciliation** converts overlapping observations into one canonical movement instead of double-counting.
- **Web** presents the consolidated ledger simply, while preserving evidence state and coverage limits.

## Important correction: source role is not semantic exclusivity

The product may communicate a simple acquisition model — statements for income, Gmail for spending — but the data model must not hard-code that a statement can only contain income or that Gmail can only contain expenses.

Statements often contain debits, fees, card payments, transfers, reversals and refunds. Gmail can also contain credits or transfer notifications.

Therefore:

```text
PRIMARY ACQUISITION ROLE != EXCLUSIVE ECONOMIC SEMANTICS
```

### Source authority

| Fact | Primary source | Secondary / reconciliation source | User-facing truth |
|---|---|---|---|
| Income | statement | Gmail when present | POSTED when statement-backed |
| Expense | Gmail for immediacy | statement | OBSERVED until statement-backed, then RECONCILED/POSTED |
| Bank fee | statement | Gmail if notified | POSTED |
| Transfer | either | other source | never counted as expense by default |
| Card payment | either | other source | liability movement, not new expense |
| Refund/reversal | either | other source | relationship-aware offset |

## Canonical truth ladder

The user must not see fake probabilistic precision such as a universal `96% evidencia`.

Public UX uses discrete evidence states:

```text
UNKNOWN      no sufficient evidence
PARTIAL      evidence exists but coverage/semantics are incomplete
OBSERVED     transaction event observed from Gmail or another event source
POSTED       posted by an authoritative statement
RECONCILED   independent observations matched into one canonical movement
```

A numeric matching score may exist internally for deterministic reconciliation, but:

```text
MATCH_SCORE != PROBABILITY
MATCH_SCORE != USER-FACING EVIDENCE_PERCENT
```

The current fixed-looking `96% evidencia` label is deprecated for the consolidated product surface.

## Monthly money model

For month `M`:

```text
posted income
    -
canonical expenses
    +/-
refunds / reversals
    =
net movement
```

Transfers and card payments remain outside expense totals unless a separate economic effect proves otherwise.

A month may only be called complete when all expected included sources are covered and no blocking reconciliation conflicts remain.

No global completeness percentage is displayed without an explicit denominator and scope.

## Mobile responsibility

Mobile is the **trusted acquisition edge**, not the primary analytics dashboard.

It owns:

- Gmail OAuth authority and bounded retrieval;
- statement discovery/import;
- local parsing;
- encrypted local vault;
- deterministic reconciliation;
- account mapping confirmations;
- source coverage state;
- production of canonical encrypted ledger deltas.

It must remain useful without the web surface.

## Web responsibility

Web is the **consolidated presentation and exploration surface**.

It presents canonical financial facts, not raw Gmail messages or raw statement PDFs.

### Default dashboard

1. Month selector.
2. `Ingresos confirmados`.
3. `Gastos observados / conciliados`.
4. `Flujo neto` only when the current evidence contract permits it; otherwise explicitly `parcial`.
5. Category breakdown.
6. Recurring-expense candidates.
7. Accounts / instruments.
8. Timeline of canonical movements.
9. Compact coverage banner with missing sources or conflicts.

### Progressive disclosure

The first view answers:

> ¿Cuánto entró, cuánto salió y qué tan respaldada está esa lectura?

Evidence provenance, reconciliation details and source diagnostics live behind drill-downs.

## Evidence language

Preferred examples:

- `Observado en Gmail`
- `Registrado en estado de cuenta`
- `Conciliado`
- `Cobertura parcial`
- `Fuente pendiente`

Forbidden examples:

- `96% seguro` when the number is not a calibrated probability;
- `finanzas completas` while any expected source is missing;
- double-counted transaction + statement duplicates;
- treating transfers as expenses merely because money left an account.

## Privacy boundary

Raw Gmail content and raw statement documents remain on the authorized trusted edge unless a separately approved policy decision changes that boundary.

The web consumes canonical, minimized ledger records. Any cloud synchronization remains governed by Q-003/Q-004/Q-005 and does not claim that E2EE automatically exempts the product from Google restricted-scope requirements.

## Human-test cadence

Physical APK tests are milestone gates, not development loops.

A new physical candidate is requested only when all of the following pass on one exact source SHA:

```text
A-G mobile integration static tests
canonical resolver invariants
reconciliation replay
vault synthetic lifecycle
web contract tests
sync/envelope tests
frontend unit tests
browser journey tests
Android build/analyze/tests
privacy/build-readiness validators
```

Only then does the user receive a new APK for one bounded milestone campaign.
