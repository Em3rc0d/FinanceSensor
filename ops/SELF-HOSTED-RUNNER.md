# FinanceSensor — Self-Hosted Runner Contract

**Status:** ROUTING FROZEN / PHYSICAL RUNNER EXECUTION PENDING  
**Target:** dedicated WSL Linux runner for private-repository CI

## Topology

```text
Windows
│
├── WSL normal
│   ├── Vigia
│   ├── other projects
│   └── personal credentials
│
└── WSL FinanceSensor Runner
    ├── GitHub Actions runner
    ├── Node.js 22
    ├── Docker
    ├── disposable CI workspace
    └── NO Gmail/OAuth authority
```

## Required runner labels

```text
self-hosted
linux
x64
financesensor
```

All active FinanceSensor CI jobs must require the full label set:

```yaml
runs-on: [self-hosted, linux, x64, financesensor]
```

A generic `self-hosted` label alone is insufficient because it could route FinanceSensor work onto an unrelated runner.

## Current physical state

A real GitHub scheduling pulse on 2026-09-02 created FinanceSensor jobs with the exact required label set, but the observed Heartbeat job remained:

```text
status       queued
runner_id    null
runner_name  null
steps        []
```

Therefore:

```text
SELF-HOSTED ROUTING       PASS BY CONFIGURATION
PHYSICAL RUNNER ASSIGNED  NOT OBSERVED
CI GREEN                  NOT CLAIMED
```

The available GitHub connector cannot read the repository runner-registration endpoint, so this evidence does not distinguish `registered but offline` from `not registered`.

Evidence:

- `mk0/10-evidence/EV-CI-SELF-HOSTED-ROUTING-2026-09-02.md`

## Trust boundary

```text
SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
```

The runner may receive:

- repository source code;
- synthetic fixtures;
- deterministic test data;
- build/package intermediates;
- ordinary GitHub Actions job credentials with least privilege.

The runner must never receive or persist:

- Google OAuth Desktop credentials JSON;
- Gmail access tokens;
- Gmail refresh tokens;
- OAuth authorization codes;
- PKCE verifiers from real user authorization;
- real Gmail message content;
- real financial records;
- personal SSH/private signing keys unrelated to CI;
- credentials copied from the user's normal WSL environment.

Real Gmail Level-C execution remains on the controlled local edge runtime, outside CI.

The existing Vigia repo-scoped runner is not a substitute for the FinanceSensor runner. FinanceSensor must not exploit ambient `gh`, SSH or personal credentials from the normal/Vigia WSL to bootstrap itself through CI.

## Workflow policy

### Automatic ECG

- `FinanceSensor Heartbeat` — the single automatic project ECG on repository activity.

It runs:

```text
canonical resolver
E2EE / recovery / witness
physical ingress / privacy
Level C v8 syntax + static safety
closure graph
artifact/quarry status authority
traceability
privacy matrices
CI routing policy
Gmail production-policy guard
recovery/status equipment guards
```

### Manual diagnostics/package

- `MK0 Foundation` — manual diagnostic suite only;
- `Package Gmail Level C Helper` — manual packaging only.

This avoids duplicating the same three test suites through simultaneous push + PR workflows on a single workstation runner.

### Retired / forbidden

- historical `Gmail Bearer Reachability Spike` is hard-disabled;
- any workflow requiring real Gmail bearer or refresh authority is forbidden;
- interactive OAuth authorization is forbidden in CI;
- production financial-data processing is forbidden in CI.

## Executable routing guard

`tools/validate-ci-runner-policy.mjs` fails if:

- an active workflow does not use exactly `[self-hosted, linux, x64, financesensor]`;
- an active workflow references `ubuntu-latest`;
- an active workflow references `${{ secrets.* }}`;
- an active workflow introduces cron scheduling;
- an unknown workflow appears without being registered in the CI policy;
- the retired Gmail workflow loses its hard-disable guard.

## Workstation scheduling law

The FinanceSensor runner is a workstation runner, not an always-on server.

Therefore:

- Heartbeat has no cron schedule;
- jobs are triggered by repository activity or explicit manual dispatch;
- an offline runner may leave jobs queued until the WSL runner becomes available;
- no job should rely on wall-clock execution at a particular hour;
- Heartbeat uses concurrency cancellation so stale pulses do not accumulate indefinitely.

## Workspace isolation

The runner workspace is treated as disposable build state.

Required properties:

```text
repo checkout is clean per job
no financial secrets in workspace
no cross-project source mounts
no normal-WSL home directory mounted as CI workspace
no personal credential directories exposed
build artifacts are disposable unless explicitly uploaded
```

Future runner provisioning should add job-start/job-completion cleanup hooks so `_work` does not become long-lived application state.

## Permissions

Workflow permissions remain least-privilege by default:

```yaml
permissions:
  contents: read
```

Any future write permission must be justified per workflow and must not be granted globally to the runner.

## Docker boundary

Docker may be installed for deterministic builds and integration tests. CI containers inherit the same trust boundary as the runner:

```text
DOCKER_IN_CI != TRUSTED_FINANCIAL_RUNTIME
```

No Docker volume should mount personal Windows/WSL credential directories.

## GitHub-hosted usage

FinanceSensor must not fall back silently to `ubuntu-latest` while the private-repository included-minute allowance is exhausted.

The active CI workflows therefore require the custom `financesensor` self-hosted label.

```text
RUNNER OFFLINE -> JOB QUEUES
RUNNER LABEL MISSING -> JOB DOES NOT FALL BACK
```

This is intentional.

## Physical activation gate

The runner boundary becomes physically proven only when a current Heartbeat completes on an assigned runner and the job evidence identifies a compatible self-hosted execution.

Until then:

```text
ROUTING_READY != RUNNER_ONLINE
QUEUED != GREEN
```

## Governing rules

```text
SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
CI FIXTURES != REAL FINANCIAL DATA
RUNNER LABEL MATCH != AUTHORIZATION TO HOLD SECRETS
PRIVATE REPO != SAFE RUNNER BY DEFAULT
CLEAN WORKSPACE != CLEAN HOST
VIGIA RUNNER != FINANCESENSOR RUNNER
AMBIENT PERSONAL CREDENTIALS != BOOTSTRAP MECHANISM
SKIPPED CI != GREEN CI
QUEUED CI != GREEN CI
```