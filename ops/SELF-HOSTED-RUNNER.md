# FinanceSensor — Self-Hosted Runner Contract

**Status:** DRAFTED / infrastructure boundary frozen  
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

## Workflow policy

### Active on the FinanceSensor runner

- `MK0 Foundation`
- `FinanceSensor Heartbeat`
- `Package Gmail Level C Helper` — manual only

### Forbidden on the FinanceSensor runner

- historical `Gmail Bearer Reachability Spike`;
- any workflow requiring real Gmail bearer or refresh authority;
- interactive OAuth authorization;
- production financial-data processing.

The Gmail bearer reachability workflow is retained only as historical evidence and is hard-disabled.

## Workstation scheduling law

The FinanceSensor runner is a workstation runner, not an always-on server.

Therefore:

- Heartbeat has no cron schedule;
- jobs are triggered by repository activity or explicit manual dispatch;
- an offline runner may leave jobs queued until the WSL runner becomes available;
- no job should rely on wall-clock execution at a particular hour.

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

FinanceSensor should not fall back silently to `ubuntu-latest` while the private-repository included-minute allowance is exhausted.

The active CI workflows therefore require the custom `financesensor` self-hosted label.

```text
RUNNER OFFLINE -> JOB QUEUES
RUNNER LABEL MISSING -> JOB DOES NOT FALL BACK
```

This is intentional.

## Governing rules

```text
SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
CI FIXTURES != REAL FINANCIAL DATA
RUNNER LABEL MATCH != AUTHORIZATION TO HOLD SECRETS
PRIVATE REPO != SAFE RUNNER BY DEFAULT
CLEAN WORKSPACE != CLEAN HOST
SKIPPED CI != GREEN CI
```
