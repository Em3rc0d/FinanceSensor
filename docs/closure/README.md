# FinanceSensor / PocketFinances — Closure Authority

This directory is the consolidation layer for project closure. It does not replace machine-readable gates, certification receipts or validators. It explains their dependency order without requiring reconstruction from the full PR history.

## Documents

| Document | Purpose |
|---|---|
| [`PROJECT_STATUS_2026-09-17.md`](./PROJECT_STATUS_2026-09-17.md) | Current evidence-based +2014 certification frontier |
| [`PROJECT_STATUS_2026-09-15.md`](./PROJECT_STATUS_2026-09-15.md) | Historical +2012 snapshot; retained as history |
| [`AUDIT_RECONCILIATION.md`](./AUDIT_RECONCILIATION.md) | Separates external-audit checklist value from generic/sample assumptions |
| [`EXECUTION_PLAN.md`](./EXECUTION_PLAN.md) | Ordered path from the current frontier to release |
| [`DEFINITION_OF_DONE.md`](./DEFINITION_OF_DONE.md) | Mechanical contract for `PHYSICAL_ALPHA2_PASS`, `BUILD_READY`, `RELEASE_READY` and completion |
| [`CLOSURE_CHECKLIST.md`](./CLOSURE_CHECKLIST.md) | Fail-closed living checklist |

## Current frontier

```text
candidate=0.2.0-alpha.2+2014
canonical_unsigned_apk_sha256=72f3e6a8a850abb76cbf6dcd5c472a9a12d5ea058c30c9d929676d5e03bdada3
r1_bundle_v14_sha256=eb959aca58b8c9a2b9ce75e4f059a87f1f40b0032fb667a8f092a98c5a04b6be
R1_TRUSTED_EDGE_SIGNING=REQUIRED
OD0_EXECUTION_ALLOWED=NO
PHYSICAL_ALPHA2_PASS=NO
BUILD_READY=NO
RELEASE_READY=NO
```

Current controlling chain:

```text
+2014 canonical unsigned freeze
  -> deterministic R1 v14 bundle freeze
  -> trusted-edge signing                 ← current gate
  -> stable-signed identity freeze
  -> OD0 exact signed install/launch
  -> R2 consolidated owned-device campaign
  -> safe strict-review cause evidence
  -> PHYSICAL_ALPHA2_PASS
  -> Q-003/Q-004/Q-005
  -> A-001/SEC-001/DM-001
  -> G-MK0
  -> BUILD_READY
  -> frozen release candidate
  -> RELEASE_READY
  -> release complete
```

The `+2013` physical observation is historical and non-inheritable. It justified the safe diagnostic successor but does not certify `+2014`.

## Evidence precedence

When documentation and implementation evidence disagree, use:

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

Update living closure documents when a controlling gate changes. Do not rewrite historical receipts or historical snapshots to look greener. A changed source/APK identity invalidates non-inheritable physical evidence according to the candidate-invalidation law.
