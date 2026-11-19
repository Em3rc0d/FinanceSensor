# EV-Q005 — Peripheral + Parasympathetic Spike — 2026-09-01

**Evidence type:** bounded synthetic feasibility certificate  
**Branch:** `jett/mk0-foundation`  
**Validated commit:** `c619d0f93920d7d2f2936aff45cb7dfd978cae73`  
**MK0 Foundation run:** `33514066791`  
**E2EE job:** `99876529695`  
**Canonical resolver job:** `99876530263`  
**Heartbeat run:** `33514066653`  
**Heartbeat job:** `99876529049`

## Purpose

Record physical evidence that the Q-005 synthetic peripheral nervous system and parasympathetic scheduler model executed successfully **together with** the existing FinanceSensor foundation on one exact commit.

This artifact is **not** a Q-005 closure receipt and is **not** a production cryptography/security certificate.

## Observed simultaneous results

```text
CANONICAL FINANCIAL RESOLVER
  tests       88
  pass        88
  fail         0

PERIPHERAL + PARASYMPATHETIC SPIKE
  tests       28
  pass        28
  fail         0

CLOSURE GRAPH
  GRAPH_PASS
  nodes        19
  buildReady   false
  DRAFTED       6
  ACTIVE        8
  OPEN          3
  PASS          1
  BLOCKED       1

STATUS AUTHORITY
  ARTIFACT_STATUS_PASS
  declarations checked 10
  authority graph/closure-ledger.json

QUARRY STATUS
  QUARRY_STATUS_PASS
  quarries 5

TRACEABILITY
  TRACEABILITY_PASS
  product invariants      32
  data-model invariants   36
  wired invariants        68
  contradictions           2
  release gate       BLOCKED
  buildReady          false
  PARTIAL                 28
  PROVEN_AT_SPIKE         11
  SPECIFIED               29

PRIVACY BOUNDARY
  PRIVACY_MATRIX_PASS
  classes                 18
  status               DRAFT
```

## Peripheral properties demonstrated by the bounded spike

The executable model demonstrates, within its synthetic Node environment:

- one tenant root-key epoch can be independently wrapped to two authorized device identities;
- a wrapped tenant key cannot be opened by the wrong device identity;
- tampering with a wrapped key package is detected;
- signed encrypted envelopes can be authenticated/decrypted by an authorized peer;
- ciphertext/signature tampering is rejected;
- selected financial plaintext sentinels are absent from the cloud-visible envelope representation;
- duplicate envelope delivery is idempotent at materialization;
- the same complete event set converges to the same materialized state even when delivered in reverse order;
- missing per-origin sequence ranges can be detected without decrypting the financial payload;
- per-device sequence allocation is monotonic across synthetic checkpoint restore;
- a revoked device is excluded from future key epoch authorization in the model;
- a key from another tenant cannot decrypt an envelope;
- incompatible concurrent corrections create deterministic conflict state rather than a hidden last-write-wins winner;
- explicit conflict resolution converges deterministically;
- simulated processing-lease failure can duplicate processing/envelopes without duplicating canonical economic identity.

## Parasympathetic properties demonstrated by the bounded spike

The scheduler model demonstrates:

- no pending work returns to `RESTING` without a retry timer;
- offline work enters `WAITING_FOR_CONNECTIVITY` without busy polling;
- low battery defers heavy background work;
- user-initiated light sync can take the bounded foreground fast path;
- security-critical light sync can outrank ordinary retry cooldown while still respecting network availability;
- transient retry uses bounded exponential full-jitter behavior;
- successful work resets transient failure pressure;
- unavailable background execution enters `WAITING_FOR_OS` rather than inventing a permanent loop;
- maintenance can wait for favorable charging conditions;
- an unknown newer schema enters `UPGRADE_REQUIRED` instead of destructive best-effort parsing;
- OS expiration maps to a checkpointed `COOLING_DOWN`/safe-replay plan.

## Privacy/data-model revalidation performed

Q-005 caused the privacy model to classify explicit peripheral data classes including:

```text
DEVICE-PRIVATE-KEY
DEVICE-PUBLIC-KEY
TENANT-ROOT-KEY
TENANT-KEY-WRAP
SYNC-CHECKPOINT
KEY-EPOCH-METADATA
```

The logical data model now includes candidate records for:

```text
DeviceAuthorization
DevicePublicKey
TenantKeyEpoch
DeviceKeyWrap
SyncEnvelope
DeviceSyncCheckpoint
OriginSequenceState
SyncConflict
```

These are logical contracts only. No physical migrations are authorized by this evidence.

## What this evidence does NOT prove

This certificate does **not** establish:

```text
production cryptographic construction correctness
production HPKE implementation correctness
Android Keystore behavior on physical devices
iOS Keychain/Secure Enclave behavior on physical devices
real cloud authorization enforcement
real network partition / long-offline recovery behavior
real app crash/restart persistence
real Android WorkManager timing/battery behavior
real iOS BackgroundTasks expiration behavior
side-channel resistance
penetration-test results
all-devices-lost recovery
remote erasure of historical data already seen by a revoked device
zero metadata leakage
Q-005 closure
SEC-001 closure
BUILD_READY
```

The spike deliberately composes Node cryptographic primitives to test protocol properties. Production key distribution must use an audited/reviewed construction/library and receive dedicated security review.

## Explicit revocation boundary

```text
REVOCATION PROVED AT SPIKE = future-access model only
REMOTE HISTORICAL ERASURE = NOT CLAIMED
```

A device that possessed an old key/plaintext may retain that historical material. Rotation to a new key epoch protects future authorization in the candidate model.

## Revalidation triggers

This evidence becomes historical rather than current when any of the following changes:

- key hierarchy or epoch semantics;
- envelope authenticated header/payload model;
- device authorization/revocation semantics;
- conflict-resolution semantics;
- replay/idempotency materialization;
- per-device sequence logic;
- processing-lease assumptions;
- parasympathetic scheduler/backoff rules;
- privacy data classes;
- sync/key logical model;
- cryptographic primitive or production library decision;
- relevant mobile background execution model.

## Evidence decision

```text
T-002_SYNTHETIC_SUITE             PASS_AT_COMMIT_c619d0f
PERIPHERAL_PROTOCOL_PROPERTIES    PROVEN_AT_SPIKE_ONLY
PARASYMPATHETIC_PROPERTIES        PROVEN_AT_SPIKE_ONLY
Q-005                             ACTIVE / NOT CLOSED
SEC-001                           DRAFTED / NOT CLOSED
BUILD_READY                       NO
```
