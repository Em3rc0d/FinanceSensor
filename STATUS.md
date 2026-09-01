# FinanceSensor — Current Status

Last reconciled baseline: **2026-09-01**.

## Project state

```text
PRODUCT THESIS             DRAFTED
PRODUCT INVARIANTS         DRAFTED
DOMAIN GLOSSARY            DRAFTED
ROADMAP                    DRAFTED
COMPETITIVE MINING         INITIAL PASS
SOURCE CONCEPT MINING      PASS

MK0 BRAINSTORMING          PASS
MK0 MINING SITE            ACTIVE
MK0 QUARRIES               ACTIVE
MK0 DESIGN                 DRAFTED
MK0 ARCHITECTURE           DRAFTED
MK0 DATA MODEL             DRAFTED
MK0 SIGNATURE WIREFRAMES   DRAFTED
MK0 PLAN                   DRAFTED
MK0 BUILD                  BLOCKED
MK0 TEST STRATEGY          DRAFTED
MK0 EVIDENCE               ACTIVE
MK0 ADR SET                OPEN
MK0 RELEASE GATES          DRAFTED
REPOSITORY GOVERNANCE      OPEN

BUILD_READY                NO
```

## Operational vital signs

Latest Q-005 evidence was physically recorded against commit `c619d0f93920d7d2f2936aff45cb7dfd978cae73` before the evidence/status bookkeeping commits that followed it.

```text
CANONICAL RESOLVER           PASS — 88/88 tests
PERIPHERAL + PARASYMPATHETIC PASS — 28/28 tests
CLOSURE GRAPH                PASS — 19 nodes, buildReady=false
ARTIFACT STATUS AUTHORITY    PASS — 10 declarations checked
QUARRY ↔ LEDGER              PASS — 5/5 quarries coherent
TRACEABILITY NETWORK         PASS — 68/68 invariants wired
PRIVACY DATA MATRIX          PASS — 18 classes, model still DRAFT
RECOVERY EQUIPMENT           PASS
T-001                        PASS
T-002                        PASS
BUILD_READY                  false
```

Evidence:

- `mk0/10-evidence/EV-MK0-ECG-2026-09-01.md`
- `mk0/10-evidence/EV-MK0-NERVOUS-SYSTEM-2026-09-01.md`
- `mk0/10-evidence/EV-Q005-PERIPHERAL-PARASYMPATHETIC-2026-09-01.md`

A green structural/test certificate does not automatically close the quarry or release invariant that owns it.

## Invariant nervous system

After promotion of only those bounded properties demonstrated by the Q-005 synthetic certificate:

```text
PRODUCT INVARIANTS          32
DATA-MODEL INVARIANTS       36
TOTAL WIRED                  68

SPECIFIED                    29
PARTIAL                      18
PROVEN_AT_SPIKE              21
PROVEN                        0

OPEN CONTRADICTIONS           2
```

`PROVEN_AT_SPIKE` means bounded feasibility evidence exists. It is intentionally weaker than release-level `PROVEN`.

`G-MK0` cannot close while release-scope invariants remain below `PROVEN` or while an interrupting contradiction is still open.

Machine-readable wiring:

- `graph/traceability-matrix.json`
- `tools/validate-traceability.mjs`
- `graph/NERVOUS-SYSTEM.md`

## Closure graph

```text
Q-001 Canonical semantics             ACTIVE
Q-002 Fingerprinting/dedup            ACTIVE
Q-003 Gmail feasibility               ACTIVE
Q-004 Email privacy                   ACTIVE
Q-005 E2EE multi-device sync          ACTIVE

C-001 External-transfer semantics     OPEN
C-002 Refund/reversal projection      OPEN

A-001 Core architecture               DRAFTED
SEC-001 Security/privacy arch         DRAFTED
DM-001 Core data model                DRAFTED
WF-001 Signature wireframes           DRAFTED
S-002 Peripheral convergence spike    ACTIVE
T-002 Peripheral/parasympathetic test PASS
OPS-001 Repository merge governance  OPEN

G-MK0 BUILD_READY                     BLOCKED
```

## Peripheral nervous system position

Q-005 now has a bounded executable model for the following candidate properties:

```text
per-device encryption/signing identity       PASS_AT_SPIKE
per-device wrapped tenant key                PASS_AT_SPIKE
wrong-device unwrap rejection                PASS_AT_SPIKE
ciphertext / signature tamper detection      PASS_AT_SPIKE
opaque financial payload at relay boundary   PASS_AT_SPIKE
per-device monotonic sequence                 PASS_AT_SPIKE
sequence-gap detection                       PASS_AT_SPIKE
duplicate replay idempotency                 PASS_AT_SPIKE
reverse-delivery convergence                 PASS_AT_SPIKE
future-access revocation via key epoch        PASS_AT_SPIKE
lease failure not sole correctness mechanism PASS_AT_SPIKE
deterministic correction conflict            PASS_AT_SPIKE
explicit conflict resolution                 PASS_AT_SPIKE
```

The logical sync/key model now includes:

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

Artifacts:

- `mk0/04-architecture/PERIPHERAL-NERVOUS-SYSTEM.md`
- `mk0/05-data-model/SYNC-KEY-MODEL.md`
- `mk0/04-architecture/Q005-SECURITY-REVALIDATION.md`

## Parasympathetic position

The autonomic scheduler model now treats **rest as correct behavior**.

```text
nothing pending                  → RESTING
offline                          → WAITING_FOR_CONNECTIVITY, no busy polling
OS background window absent      → WAITING_FOR_OS
battery/resource pressure        → defer noncritical heavy work
transient remote failure         → bounded full-jitter BACKOFF
success                          → reset retry pressure
newer unknown schema             → UPGRADE_REQUIRED
OS expiration/interruption       → checkpoint + COOLING_DOWN / safe replay
security-critical light action   → bounded fast path when OS/network allow
```

`INV-SYNC-006` and `INV-SYNC-007` formalize these properties in the data/runtime invariant model.

Artifact: `mk0/04-architecture/PARASYMPATHETIC-SYNC.md`.

## Q-005 non-claims / blockers

Q-005 is **not closed**. The synthetic certificate does not prove:

```text
production cryptographic construction correctness
production HPKE/library implementation
Android Keystore behavior on physical devices
iOS Keychain/Secure Enclave behavior on physical devices
real cloud authorization enforcement
real network partition / long-offline recovery
real app crash/restart persistence
real Android WorkManager behavior
real iOS BackgroundTasks expiration behavior
side-channel / penetration-test resistance
all-devices-lost recovery
remote erasure of old plaintext from revoked devices
zero metadata leakage
```

The production crypto suite remains an explicit security-review/ADR decision. All-devices-lost recovery remains OPEN.

Research provenance: `research/SYNC-CRYPTO-2026-SOURCES.md`.

## What reverse validation discovered

The resolver and downstream financial-state reasoning exposed two upstream contradictions instead of hiding them:

1. `EXTERNAL_TRANSFER` is a movement mechanism, not enough information to call something income, expense or neutral.
2. A linked refund/reversal must offset the original economic contribution; treating it as permanently zero-effect would overstate historical totals.

The candidate reconciliation is documented in:

- `graph/CONTRADICTIONS.md`
- `mk0/05-data-model/ECONOMIC-EFFECT-MODEL.md`

Executable tests cover the candidate projection, but both contradictions remain formally `OPEN` until closure audit/receipts are produced.

## Gmail position

Q-003 research currently supports this candidate direction:

```text
minimum Gmail scope candidate      gmail.readonly
metadata-first retrieval           feasible
historyId incremental sync         feasible
Pub/Sub push required for MK0      no
production OAuth verification      required
security assessment applicability  still open for actual architecture
physical Android OAuth spike       not executed yet
```

Research provenance: `research/GMAIL-2026-SOURCES.md`.

## Privacy position

Q-004 now tracks 18 machine-readable data classes, including the Q-005 peripheral key/sync material.

```text
raw email cloud storage        forbidden by default
raw body/attachment retention  transient in MK0
OAuth token cloud plaintext    forbidden
device private-key plaintext   forbidden in cloud
tenant root-key plaintext      forbidden in cloud
wrapped tenant key             ciphertext + minimum context only
device sync checkpoint         encrypted local / cloud plaintext forbidden MK0
derived evidence local         encrypted candidate
canonical ledger local         encrypted candidate
canonical multi-device sync    E2EE candidate
routine human content access   forbidden
content-bearing analytics      forbidden
Gmail-derived generalized AI   forbidden
```

Machine-readable contract: `mk0/04-architecture/PRIVACY-DATA-MATRIX.json`.

## Repository governance position

Repository inspection on 2026-09-01 found:

```text
main protected                  NO
required status checks          NONE
branch protection enforcement   OFF
PR #1                           DRAFT / DO NOT MERGE
```

This remains tracked as `OPS-001` and is a physical dependency of `G-MK0`.

The connected GitHub tooling available in this session can read branch protection but does not expose a write-capable protection/ruleset action. Therefore we do not claim the repository is enforced when it is not.

## Critical path

```text
Q-001 / Q-002 closure audit
        +
C-001 / C-002 reconciliation
        ↓
Q-003 physical Gmail spike
        +
Q-004 deletion/privacy evidence
        +
Q-005 production-crypto decision
        +
Q-005 physical Android/iOS key + background evidence
        +
Q-005 all-devices-lost recovery decision
        ↓
architecture/security reconciliation
        ↓
data-model reconciliation
        ↓
signature UX reconciliation
        +
OPS-001 repository enforcement
        ↓
closure audit
        ↓
all release-scope invariants PROVEN
        ↓
BUILD_READY = YES
```

## Take-the-Hummer rule

**Do not begin unrestricted product implementation yet.**

Bounded spikes are allowed only when they exist to close a graph node or produce evidence. No feature work bypasses the graph.

## North-star invariant

```text
FINANCIAL_TRUTH > FEATURE_COUNT
```
