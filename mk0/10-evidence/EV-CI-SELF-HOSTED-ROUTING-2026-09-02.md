# EV-CI — FinanceSensor self-hosted routing pulse — 2026-09-02

**Scope:** repository CI routing / physical runner assignment boundary  
**Result:** ROUTING PASS / PHYSICAL RUNNER EXECUTION NOT YET PROVEN

## Purpose

Prove that FinanceSensor no longer has an active GitHub-hosted execution path merely because the account's included hosted Actions minutes are exhausted.

This evidence does not claim that the dedicated WSL runner is registered, online or healthy.

## Configuration under test

Active workflow jobs require exactly:

```text
self-hosted
linux
x64
financesensor
```

The active workflows are:

```text
MK0 Foundation
FinanceSensor Heartbeat
Package Gmail Level C Helper     manual only
```

The historical Gmail Bearer Reachability workflow remains hard-disabled and must never receive real Gmail/OAuth authority.

## Executable routing guard

`tools/validate-ci-runner-policy.mjs` freezes these invariants:

```text
ACTIVE WORKFLOWS REQUIRE EXACT LABEL SET
ACTIVE ubuntu-latest REFERENCES                  0
ACTIVE secrets.* REFERENCES                      0
ACTIVE CRON DEPENDENCIES                         0
UNKNOWN WORKFLOW WITHOUT POLICY REGISTRATION     FAIL
RETIRED Gmail WORKFLOW if:false                  REQUIRED
```

The guard is wired into `.github/workflows/heartbeat.yml`.

## Observed GitHub scheduling pulse

Commit:

```text
c801015e5507d61e765f40fe2bddb3fe4fb03e07
ci: enforce self-hosted runner routing policy
```

GitHub created three workflow runs for the commit. The Heartbeat job exposed:

```text
job id       100257685575
status       queued
steps        []
labels       self-hosted, linux, x64, financesensor
runner_id    null
runner_name  null
```

A later pulse after wiring the Gmail production-policy ECG also remained queued:

```text
commit       e9c13a8651eda1b30a8922fbcd91b86fb5d24226
workflow     FinanceSensor Heartbeat
run id       33633956633
job id       100260003934
status       queued
steps        null
```

## Interpretation

The observations prove:

```text
GITHUB SCHEDULER ACCEPTS WORKFLOW              PASS
REQUIRED FINANCESENSOR LABEL SET PRESENT       PASS
SILENT FALLBACK TO GitHub-hosted RUNNER        NOT OBSERVED
JOB EXECUTION ON PHYSICAL WSL                  NOT PROVEN
```

Because the observed job has no assigned runner, the physical runner is not serving the job at observation time.

The available project connector cannot read the repository runner-registration endpoint. Therefore this evidence does not distinguish:

```text
REGISTERED BUT OFFLINE
        vs
NOT REGISTERED
```

That distinction remains a physical infrastructure fact to prove.

## Billing interpretation boundary

```text
SELF-HOSTED ROUTING PASS
        !=
RUNNER ONLINE
        !=
CI GREEN
```

No product test result is inferred from a job that never received a runner.

## Trust boundary

The dedicated runner is CI compute only.

```text
SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
```

It must not receive:

- Google OAuth Desktop credential JSON;
- Gmail access or refresh tokens;
- OAuth authorization codes;
- real Gmail content;
- real financial plaintext;
- personal SSH/private signing keys unrelated to CI.

## Current state

```text
CI ROUTING POLICY                 FROZEN
CI ROUTING GUARD                  WIRED
GITHUB-HOSTED ACTIVE PATH         0 BY CONFIGURATION
FINANCESENSOR JOB QUEUED          OBSERVED
PHYSICAL RUNNER ASSIGNED          NO AT OBSERVATION
CI GREEN                          NO CLAIM
BUILD_READY                       UNCHANGED / false
```

## Governing laws

```text
RUNNER OFFLINE/MISSING -> JOB QUEUES
NO COMPATIBLE RUNNER != PRODUCT TEST FAILURE
SKIPPED CI != GREEN CI
QUEUED CI != GREEN CI
SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
```
