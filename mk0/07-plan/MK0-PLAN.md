# MK0 / 07 — Execution Plan

## Objective

Prove the Financial Sensing Foundation with physical evidence before expanding product scope.

## Definition of MK0

```text
Connect Gmail
      ↓
Ingest bounded history
      ↓
Identify financial evidence
      ↓
Extract structured evidence locally
      ↓
Resolve canonical financial events
      ↓
Classify core semantics
      ↓
Detect basic recurring patterns
      ↓
Persist encrypted local state
      ↓
Synchronize E2EE between devices
      ↓
Present signature no-scroll UI
```

## Phase 0 — Research closure

Blockers:

- Q-001 canonical financial semantics;
- Q-002 fingerprinting/dedup/idempotency;
- Q-003 Gmail policy/production feasibility;
- Q-004 email privacy/data minimization;
- Q-005 local-first E2EE sync.

Outputs:

```text
P0_QUARRIES_CLOSED = YES
```

## Phase 1 — Feasibility spikes

### SPIKE-A — Gmail ingestion

Goal: prove permitted source access and bounded local ingestion.

Measure:

- auth flow;
- required scopes;
- number of API calls;
- incremental cursor behavior;
- 30/90-day ingestion time;
- bytes downloaded;
- logout/revocation behavior;
- raw-content retention.

### SPIKE-B — Low-end Android

Target: representative lower-mid Android hardware, not only flagship/dev phone.

Measure:

```text
RAM peak
CPU time
battery delta
thermal behavior
processing throughput
local DB growth
background success rate
startup time
```

Run workloads:

- 100 emails;
- 500 emails;
- 2,000 candidate messages if realistic;
- repeated incremental sync.

### SPIKE-C — Canonical resolver

Build a labeled corpus of financial evidence.

Required edge cases:

- one email → one purchase;
- 3 emails → one purchase;
- same merchant/amount twice genuinely;
- pending → posted;
- card purchase + card settlement;
- own-account transfer;
- refund;
- reversal;
- fee;
- duplicate replay;
- evidence from two devices.

Measure:

```text
precision
recall
false merge rate
false split rate
duplicate canonical events
manual review rate
```

### SPIKE-D — E2EE convergence

Two devices:

```text
A creates/resolves events
B syncs
B corrects category
A syncs
A and B converge
revoke B
B cannot receive future authorized state
```

### SPIKE-E — Signature viewport

Render S-01, S-04, S-05 and S-06 on small/regular/large classes.

Evidence:

- screenshots;
- dimensions;
- overflow checks;
- accessibility/touch target audit.

## Phase 2 — Architecture freeze candidate

After spikes:

- finalize platform/framework decision;
- finalize local persistence approach;
- finalize control-plane interface;
- finalize event/sync protocol;
- finalize key/recovery model;
- update DM-001 physical schema;
- create ADR set.

Gate:

```text
ARCHITECTURE_READY = PASS
DATA_MODEL_READY   = PASS
```

## Phase 3 — MK0 vertical slices

Suggested build sequence:

### BUILD-001 — Local tenant/device shell

- local app shell;
- tenant identity model;
- encrypted local store skeleton;
- signature navigation shell.

### BUILD-002 — Gmail source adapter

- OAuth;
- source connection;
- incremental ingestion;
- source artifact identity;
- revocation.

### BUILD-003 — Evidence extraction

- metadata filter;
- deterministic parsers;
- evidence persistence;
- provenance viewer debug surface.

### BUILD-004 — Canonical resolver

- event candidates;
- fingerprints;
- deterministic matching;
- ambiguity;
- core semantic taxonomy.

### BUILD-005 — Financial read models

- period summary;
- movement timeline;
- category summary;
- basic merchant normalization;
- recurring foundation.

### BUILD-006 — Signature UI

- Home;
- Movements;
- Transaction Detail;
- Sensor;
- Opportunity shell;
- Needs Review.

### BUILD-007 — Cloud control plane

- auth;
- tenant/device registry;
- connection metadata;
- health;
- processing lease API.

### BUILD-008 — E2EE sync

- device enrollment;
- encrypted envelopes;
- event replay;
- convergence;
- revocation.

### BUILD-009 — Privacy Inspector + hardening

- measurable processing counters;
- raw-retention audit;
- log redaction;
- delete/logout/revoke flows;
- stale/offline/error states.

### BUILD-010 — Release candidate evidence

- clean install;
- representative Gmail corpus;
- multi-device test;
- low-end device test;
- invariant suite;
- privacy/security evidence;
- UX viewport evidence.

## Phase 4 — Release gates

See [`../12-release/RELEASE-GATES.md`](../12-release/RELEASE-GATES.md).

## Scope-control rule

A feature discovered during MK0 is handled as:

```text
required to prove MK0 invariant?
  YES → evaluate/change scope explicitly
  NO  → backlog for MK1+
```

No “small feature” bypasses the graph.

## Current plan status

```text
PRODUCT THESIS        DRAFTED
COMPETITIVE MINING    INITIAL PASS
P0 QUARRIES           OPEN
DATA MODEL            DRAFTED
SIGNATURE WIREFRAMES  DRAFTED
ARCHITECTURE           DRAFTED
IMPLEMENTATION         BLOCKED
```

**Do not start full product build yet.** Execute and close the P0 quarries/spikes first.
