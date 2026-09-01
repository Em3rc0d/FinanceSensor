# MK0 / 08 — Build

## Status

```text
BUILD_READY = NO
```

Full implementation remains blocked until the P0 quarries and feasibility spikes close.

## Build rule

Every build slice must reference:

- requirements / product invariant;
- architecture decision;
- data-model entities/invariants;
- signature screen(s), when user-facing;
- test cases;
- evidence artifact expected at completion.

## Planned slices

| Build | Purpose | Blocked by |
|---|---|---|
| BUILD-001 | Local tenant/device shell | tenancy model, storage ADR |
| BUILD-002 | Gmail source adapter | Q-003, Q-004 |
| BUILD-003 | Evidence extraction | source contract, privacy model |
| BUILD-004 | Canonical resolver | Q-001, Q-002 |
| BUILD-005 | Financial read models | canonical event model |
| BUILD-006 | Signature UI | wireframe/viewport validation |
| BUILD-007 | Cloud control plane | tenancy/security ADRs |
| BUILD-008 | E2EE synchronization | Q-005 |
| BUILD-009 | Privacy/hardening | threat model, telemetry policy |
| BUILD-010 | RC evidence | all prior slices |

## Build manifest template

Each `BUILD-###` should eventually contain or link:

```text
ID
objective
input commit
requirements
ADRs
schema version
implementation notes
migration(s)
tests executed
evidence produced
known limitations
result PASS/FAIL
output commit/artifact hash
```

## No hidden architecture

If implementation reveals a missing architectural decision:

```text
STOP
 ↓
record issue
 ↓
route to quarry/design/data-model/ADR
 ↓
close decision
 ↓
resume build
```

Do not silently freeze architecture inside code.
