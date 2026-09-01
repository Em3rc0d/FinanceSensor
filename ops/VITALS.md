# FinanceSensor Vital Signs

This file defines the project's operational pulse. Green status is earned by evidence, not optimism.

## Primary vital signs

```text
REPOSITORY_HEALTH        GREEN when branch/PR state is valid and no required checks are failing
CI_HEARTBEAT             GREEN when scheduled/push validation passes
CLOSURE_GRAPH            GREEN when the dependency/revalidation ledger is structurally consistent
TRACEABILITY_NETWORK     GREEN when every declared invariant is wired to owners/proof/gates without orphan edges
FINANCIAL_TRUTH          GREEN when canonical financial invariants pass at their declared proof level
PRIVACY_BOUNDARY         GREEN only after privacy tests/evidence pass at their declared proof level
MULTI_DEVICE_CONVERGENCE GREEN only after E2EE convergence evidence exists
GMAIL_FEASIBILITY        GREEN only after production-policy feasibility is closed
BUILD_READY              GREEN only when all required MK0 gates are CLOSED and release-scope invariants are PROVEN
```

## Current MK0 pulse

The canonical resolver is under active validation. `FINANCIAL_TRUTH` must never be inferred from UI behavior; it is measured through invariant tests, replay/idempotency tests, deduplication tests and semantic edge cases.

The project has two linked machine-readable systems:

```text
graph/closure-ledger.json
        ↓ node/dependency/revalidation truth

graph/traceability-matrix.json
        ↓ invariant/owner/test/evidence truth
```

`BUILD_READY` cannot be promoted manually while upstream nodes remain open, contradictions remain unresolved, or release-scope invariants are not `PROVEN`.

## Traceability proof levels

```text
SPECIFIED       contract exists, executable proof absent
PARTIAL         some structural/executable evidence exists, scope not fully proven
PROVEN_AT_SPIKE bounded feasibility evidence passes; not release proof
PROVEN          release-scope physical proof + compatible closure state
```

`PROVEN_AT_SPIKE` is intentionally weaker than `PROVEN`. A successful feasibility spike must never be silently promoted into production readiness.

## ECG contract

The project keeps an automated heartbeat through GitHub Actions. Every meaningful change to the resolver, graph, invariants, privacy matrix, MK0 artifacts or operational guardrails triggers validation.

Each heartbeat checks at least:

```text
canonical resolver invariants
        +
closure graph consistency
        +
quarry ↔ ledger state coherence
        +
invariant nervous-system traceability
        +
privacy data-handling structure
        +
status/recovery guardrails
        ↓
FINANCESENSOR_HEARTBEAT
```

A failed heartbeat means:

1. stop promotion/merge of affected work;
2. inspect the exact failed invariant, traceability edge or graph edge;
3. identify the owning node;
4. classify the root cause as implementation, domain model, architecture, privacy/security, data, infrastructure or test defect;
5. mark affected graph nodes `OPEN`, `REOPENED` or `BLOCKED` as appropriate;
6. downgrade invariant proof state when existing evidence is no longer sufficient;
7. repair at the correct layer;
8. rerun validation;
9. record fresh evidence before declaring recovery.

## Contradiction reflex

Contradictions are interrupt signals, not documentation notes.

```text
contradiction detected
        ↓
affected invariants identified
        ↓
owning nodes revalidated
        ↓
downstream gates blocked if needed
        ↓
model/code repaired
        ↓
new executable evidence
        ↓
formal contradiction closure
```

A release-level `PROVEN` invariant cannot remain interrupted by an open contradiction.

## Pulse colors

- **GREEN** — the exact declared gate/proof level is supported by current evidence.
- **YELLOW** — active work, partial/spike proof, incomplete evidence, or understood degradation.
- **RED** — invariant failure, privacy/security regression, financial corruption risk, graph contradiction, traceability break or unrecoverable test failure.

`RED` is not hidden. It is a signal to isolate and repair.

## Take-the-Hummer condition

No unrestricted implementation until:

```text
P0 closure graph CLOSED
        +
all release-scope invariants PROVEN
        +
contradictions CLOSED
        +
physical feasibility evidence PASS
        +
architecture/data/security/UX reconciliation PASS
        ↓
BUILD_READY = YES
```

## Non-negotiable vital

```text
FINANCIAL_TRUTH > FEATURE_COUNT
```

A beautiful FinanceSensor that misstates money is clinically dead.
