# FinanceSensor Vital Signs

This file defines the project's operational pulse. Green status is earned by evidence, not optimism.

## Primary vital signs

```text
REPOSITORY_HEALTH        GREEN when branch/PR state is valid and no required checks are failing
CI_HEARTBEAT             GREEN when scheduled/push validation passes
FINANCIAL_TRUTH          GREEN when canonical financial invariants pass
PRIVACY_BOUNDARY         GREEN only after privacy tests/evidence pass
MULTI_DEVICE_CONVERGENCE GREEN only after E2EE convergence evidence exists
GMAIL_FEASIBILITY        GREEN only after production-policy feasibility is closed
BUILD_READY              GREEN only when all required MK0 gates pass
```

## Current MK0 pulse

The canonical resolver is under active validation. `FINANCIAL_TRUTH` must never be inferred from UI behavior; it is measured through invariant tests, replay/idempotency tests, deduplication tests and semantic edge cases.

## ECG contract

The project keeps an automated heartbeat through GitHub Actions. Every meaningful change to the resolver or operational guardrails triggers validation. A scheduled heartbeat exists for the default branch after integration.

A failed heartbeat means:

1. stop promotion/merge of affected work;
2. inspect exact failed invariant;
3. classify the root cause as implementation, domain model, architecture, data, infrastructure or test defect;
4. repair at the correct layer;
5. rerun validation;
6. record evidence before declaring recovery.

## Pulse colors

- **GREEN** — evidence proves the gate.
- **YELLOW** — active work, incomplete evidence, or degraded but understood behavior.
- **RED** — invariant failure, security/privacy regression, financial corruption risk, or unrecoverable test failure.

`RED` is not hidden. It is a signal to isolate and repair.

## Non-negotiable vital

```text
FINANCIAL_TRUTH > FEATURE_COUNT
```

A beautiful FinanceSensor that misstates money is clinically dead.