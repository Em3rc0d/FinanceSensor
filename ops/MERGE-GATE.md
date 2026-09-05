# OPS-001 — Repository Merge Governance

**Status:** OPEN

## Purpose

FinanceSensor's internal closure graph is only useful if repository governance prevents bypassing it during integration.

Current observation on 2026-09-01:

```text
main protected                  NO
required status checks          NONE
branch protection enforcement   OFF
PR #1                           DRAFT / DO NOT MERGE
```

## Risk

Without branch protection, a human can merge or push into `main` even when:

```text
heartbeat = RED
G-MK0 = BLOCKED
BUILD_READY = false
contradictions remain OPEN
```

That creates an external bypass around the engineering nervous system.

## Required governance before OPS-001 closure

`main` must be configured so that ordinary integration cannot bypass the foundation checks. Candidate minimum policy:

```text
require pull request before merge        YES
require status checks before merge       YES
require branch up to date                 YES
block force pushes                        YES
block branch deletion                     YES
```

Required checks should include the canonical MK0 checks that are stable at the time of closure, including at minimum:

```text
FinanceSensor Heartbeat / vital-signs
MK0 Foundation / relevant validation job
```

Exact GitHub check-context names must be verified against the repository's current Actions configuration before freezing the rule.

## Current limitation

The connected GitHub tool available during this engineering session exposes branch-protection reads but not a write-capable branch-protection/ruleset action. Therefore this node cannot be closed from automation here without pretending an enforcement change occurred.

## Interim control

PR #1 remains a GitHub draft and explicitly states:

```text
DO NOT MERGE until G-MK0 closes
```

This is a procedural control only. It is weaker than branch protection and does not satisfy OPS-001 closure.

## Evidence required

Before closure, capture:

1. `main` branch reports protected/enforced status;
2. required checks are listed and correspond to current workflow jobs;
3. a controlled failing-check test proves merge is blocked;
4. a controlled green-check test proves eligible PR behavior;
5. governance configuration is documented in evidence;
6. a closure receipt is issued.

## Closure decision

```text
REPOSITORY_MERGE_GOVERNANCE = OPEN
```
