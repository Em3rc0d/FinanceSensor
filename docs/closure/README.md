# FinanceSensor / PocketFinances — Closure Authority

This directory is the consolidation layer for project closure. It does not replace machine-readable gates, certification receipts or validators; it makes their meaning and dependency order readable without reconstructing the project from the full PR history.

## Documents

| Document | Purpose |
|---|---|
| [`PROJECT_STATUS_2026-09-15.md`](./PROJECT_STATUS_2026-09-15.md) | Evidence-based snapshot of the current Alpha.2 `+2012` frontier |
| [`AUDIT_RECONCILIATION.md`](./AUDIT_RECONCILIATION.md) | Separates the external audit's useful checklist from its generic/sample assumptions |
| [`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md) | Ordered action/execution/implementation path from the current frontier to release |
| [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md) | Mechanical contract for `PHYSICAL_ALPHA2_PASS`, `BUILD_READY`, `RELEASE_READY` and project completion |

## Current frontier

```text
candidate=0.2.0-alpha.2+2012
PR_144=OPEN
PHYSICAL_ALPHA2_PASS=NO
BUILD_READY=NO
RELEASE_READY=NO
```

The current controlling chain is:

```text
PR #144 stable-signed freeze
  -> post-merge consensus
  -> OD0 exact signed install/launch
  -> R2 consolidated owned-device campaign
  -> PHYSICAL_ALPHA2_PASS
  -> Q-003/Q-004/Q-005
  -> A-001/SEC-001/DM-001
  -> G-MK0
  -> BUILD_READY
  -> frozen release candidate
  -> RELEASE_READY
  -> release complete
```

## Evidence precedence

When documentation and implementation evidence disagree, use this order:

```text
immutable source/artifact identity
> machine-readable gate/validator
> exact-SHA CI run
> sanitized trusted-edge/physical receipt
> repository documentation
> PR narrative
> generic planning assumption
```

## Update rule

Update these documents when a controlling gate changes, but never edit historical receipts to make the current state look greener. A changed candidate identity invalidates non-inheritable physical evidence according to the existing project law.
