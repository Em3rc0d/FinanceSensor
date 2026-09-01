# FinanceSensor — Current Status

Last reconciled baseline: **2026-09-01**.

## Project state

```text
PRODUCT THESIS             PASS
PRODUCT INVARIANTS         PASS
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

## Closed financial-heart nodes

```text
C-001 External-transfer semantics     CLOSED
C-002 Refund/reversal projection      CLOSED
Q-001 Canonical semantics             CLOSED
Q-002 Fingerprinting/dedup            CLOSED
```

These remain reopenable if downstream provider/device evidence contradicts them.

## Financial heart

```text
CANONICAL RESOLVER           98 / 98 PASS
SEMANTIC CORPUS              54 bounded cases PASS
Q-002 ADVERSARIAL DECISIONS  28 / 28 PASS
UNSAFE FALSE MERGES          0
AUTO-MERGE PRECISION         100%
HARD-LINK FALSE SPLITS       0
REPLAY DUPLICATE COUNT       0
BENCHMARK DECISION ACCURACY  100%
```

## Q-005 peripheral / recovery / knee / checkpoint state

Validated executable anti-rollback head:

`dbfd21c01be7352087ce4bf2a06a8922b68c8c8c`

Validated reconciled architecture/ADR pre-status head:

`ba1d3058f9f3ac8e754ac8add7c1cb426513a263`

```text
E2EE / KEY / RECOVERY / REVOCATION /
KNEE / CHECKPOINT / PNS              98 / 98 PASS

RECOVERY OWNERSHIP + LOWER GATE       REC-001..018 PASS
POST-RECOVERY CUTOVER                 REC-019..022 PASS
REVOCATION CUTOVER                    REV-001..007 PASS
KEY AUTHORITY                         KEY-001..005 PASS
KNEE ADVERSARIAL CAMPAIGN             12 red assertions exposed/repaired
ANTI-ROLLBACK CAMPAIGN                ARB-001..014 PASS
ANTI-ROLLBACK RED ASSERTIONS           8 exposed/repaired

T-002                                 PASS
Q-005                                 ACTIVE
ADR-014 RECOVERY                      SPIKE-ACCEPTED
ADR-015 TRUSTED CHECKPOINT            SPIKE-ACCEPTED
```

Evidence:

- `mk0/10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`
- `mk0/10-evidence/EV-Q005-REVOCATION-CUTOVER-2026-09-01.md`
- `mk0/10-evidence/EV-Q005-KNEE-STRESS-2026-09-01.md`
- `mk0/10-evidence/EV-Q005-ANTI-ROLLBACK-2026-09-01.md`

### Load-bearing contracts now demonstrated at bounded spike level

```text
DEVICE KEY AUTHORITY
  tenant + epoch + identity scoped
  cross-tenant/revoked authority rejected

RECOVERY COVERAGE
  signed + tenant/epoch/key-bound
  tampered wrap cannot count
  ambiguity fails closed
  exact duplicate is idempotent

REVOCATION CUTOVER
  future key revocation + frozen accepted history
  stale-epoch extension/substitution rejected
  gaps/forks fail closed

POST-RECOVERY RESUME
  new device + tenant rotation + Recovery Key rotation
  next-epoch recovery coverage
  every lost device explicitly inventoried
  authenticated cutover barrier per lost device

SYNC IDENTITY
  event_id immutable
  (tenant, origin_device, sequence) immutable
  divergent identity reuse fails closed

TENANT MATERIALIZATION
  one materialization belongs to one tenant
  mixed-tenant input fails closed

CONFLICT RESOLUTION
  incompatible corrections → CONFLICT
  incompatible resolutions → META-CONFLICT
  invalid resolution target → fail closed

TRUSTED CHECKPOINT
  independent anchor is minimum accepted state
  rollback behind anchor → fail closed
  same-sequence equivocation → fail closed
  sequence gap / signed fast-forward → fail closed
  previous-hash mismatch → fail closed
  cross-tenant checkpoint advance → fail closed
  exact checkpoint duplicate → idempotent
```

### Q-005 freshness boundary

FinanceSensor now explicitly separates:

```text
AUTHENTICITY
        !=
AUTHORIZATION
        !=
APPEND-ONLY CONSISTENCY
        !=
GLOBAL FRESHNESS
```

A valid checkpoint chain extending an independent anchor proves only:

```text
CONSISTENT_FROM_ANCHOR
```

It does **not** prove that the relay supplied the newest checkpoint that ever existed.

```text
no independent anchor
→ INDETERMINATE_FRESHNESS

valid anchored chain
→ CONSISTENT_FROM_ANCHOR
→ latestGlobalFreshness = UNPROVEN
```

If all trusted devices are lost and the newest independent Recovery Kit/witness anchor is `N`, a relay may still withhold a valid unseen tail `N+1..M`. The client can refuse rollback before/fork at `N`; it cannot infer that `M` does not exist.

Therefore the conceptual anchor-relative anti-rollback problem is spike-accepted, while the **production independent witness/freshness strategy remains open**.

## Gmail / financial ingress

### Level A — contractual harness

```text
PHYSICAL INGRESS HARNESS       21 / 21 PASS
ASYNC PROVIDER CONTRACT        PASS
METADATA-FIRST                 PASS
FULL ONLY FOR CANDIDATES       PASS
INCREMENTAL HISTORY MODEL      PASS
HISTORY 404 RECOVERY           PASS
RESTART / REPLAY               PASS
RAW BODY DURABLE RETENTION     0
RAW ATTACHMENT RETENTION       0
PLAINTEXT FINANCIAL CLOUD      0 in harness
TOKEN IN LOGS                  0 in harness
T-003                          PASS
S-003                          ACTIVE
```

Evidence: `mk0/10-evidence/EV-Q003-Q004-INGRESS-HARNESS-2026-09-01.md`.

### Level B — real Gmail

```text
Gmail REST adapter             READY
bounded messages.list          READY
METADATA/FULL messages.get     READY
history.list                   READY
profile historyId              READY
privacy-safe aggregate output  READY
remote token revoke            READY
gmail-live-spike workflow      READY

CONTROLLED GOOGLE CREDENTIAL   MISSING
REAL GMAIL EXECUTION           NOT RUN
```

No Gmail credential or user mail is committed to the repository.

## Invariant nervous system

Observed Heartbeat on `ba1d3058f9f3ac8e754ac8add7c1cb426513a263`:

```text
PRODUCT INVARIANTS          34
DATA-MODEL INVARIANTS       48
TOTAL WIRED                  82

SPECIFIED                    29
PARTIAL                      18
PROVEN_AT_SPIKE              20
PROVEN                       15

REGISTERED CONTRADICTIONS     2
OPEN CONTRADICTIONS           0
```

`INV-SYNC-008..017` are wired through `graph/traceability-recovery.json` for their bounded claims.

`G-MK0` cannot close while release-scope invariants remain below `PROVEN`.

## Privacy nervous system

```text
BASE DATA CLASSES             18
RECOVERY/REVOCATION/CHECKPOINT 5
TOTAL PRIVACY CLASSES         23
PRIVACY MATRIX ECG            PASS
```

Additional sensitive classes:

```text
RECOVERY-PRIVATE-KEY
RECOVERY-PUBLIC-KEY
RECOVERY-EPOCH-WRAP
REVOCATION-CUTOVER-BARRIER
TRUSTED-CHECKPOINT-METADATA
```

The cloud may hold minimized signed checkpoint security metadata, but **a cloud-only checkpoint copy is forbidden from being the sole trusted anti-rollback anchor**.

Privacy matrices remain design-level DRAFTs until physical storage/transport/deletion evidence exists.

## Closure graph

```text
P-001 Product thesis                 PASS
P-002 Product invariants             PASS
Q-001 Canonical semantics            CLOSED
Q-002 Fingerprinting/dedup           CLOSED
Q-003 Gmail feasibility              ACTIVE
Q-004 Email privacy                  ACTIVE
Q-005 E2EE multi-device sync         ACTIVE
C-001 External-transfer semantics    CLOSED
C-002 Refund/reversal projection     CLOSED
A-001 Core architecture              DRAFTED
SEC-001 Security/privacy arch        DRAFTED
DM-001 Core data model               DRAFTED
WF-001 Signature wireframes          DRAFTED
S-001 Canonical resolver spike       ACTIVE
T-001 Canonical resolver test        PASS
S-002 E2EE/PNS/recovery spike        ACTIVE
T-002 E2EE/PNS/recovery suite        PASS
S-003 Physical ingress spike         ACTIVE
T-003 Ingress/privacy suite          PASS
OPS-001 Repository governance        OPEN
G-MK0 BUILD_READY                    BLOCKED
```

```text
GRAPH        PASS
NODES        21
BUILD_READY  false
```

`PROVEN_AT_SPIKE` does not promote Q-005/S-002/SEC-001/DM-001 to closed states.

## Q-004 remaining physical proof

```text
real Gmail lifecycle/revocation
Android protected credential/key storage
Apple protected credential/key storage
real transport/storage inspection
cloud deletion/backup semantics
Recovery Kit leakage testing
Revocation Barrier retention/deletion
Trusted Checkpoint metadata leakage
trusted-anchor deletion/retirement semantics
```

## Q-005 remaining blockers

```text
production independent witness/freshness decision
Recovery Kit checkpoint-anchor refresh semantics
reviewed production checkpoint/append-only construction
atomic crash-safe checkpoint + anchor advancement
reviewed production HPKE/AEAD/signature suite
Android ↔ iOS cryptographic interoperability
Android Keystore/StrongBox physical evidence
iOS Keychain/Secure Enclave physical evidence
protected mobile checkpoint-anchor storage
real control-plane tenant authorization
real recovery-wrap/checkpoint retrieval authorization
real Revocation Barrier persistence
network partition / long-offline recovery
crash/restart persistence around cutover/checkpoint
real WorkManager / BackgroundTasks behavior
physical all-devices-lost recovery
physical post-recovery revocation/rotation/cutover
Recovery Kit export/import leakage controls
recovery re-authentication gate
recovery/checkpoint/barrier retention/deletion policy
side-channel / penetration-test review
metadata leakage analysis
```

The following are no longer conceptual blockers at bounded spike level:

```text
recovery ownership
authenticated recovery coverage
tenant-scoped key authority
stale-epoch revocation cutover
post-recovery final resume semantics
immutable replay/origin identity
tenant-isolated materialization
conflict-safe resolution
anchor-relative rollback/fork/gap detection
```

## Repository governance

```text
main protected                  NO
required status checks          NONE
branch protection enforcement   OFF
PR #1                           DRAFT / DO NOT MERGE
```

`OPS-001` remains a dependency of `G-MK0`.

## Whole-organism observed pre-status ECG

Head `ba1d3058f9f3ac8e754ac8add7c1cb426513a263`:

```text
CANONICAL RESOLVER                                  98 / 98 PASS
E2EE / KEY / RECOVERY / REVOCATION /
KNEE / CHECKPOINT / PNS                             98 / 98 PASS
PHYSICAL INGRESS                                    21 / 21 PASS
CLOSURE GRAPH                                       PASS
ARTIFACT STATUS AUTHORITY                           PASS — 10 declarations
QUARRY STATUS                                       PASS — 5
TRACEABILITY                                        PASS — 82 / 82 WIRED
PRIVACY MATRIX                                      PASS — 23 CLASSES
RECOVERY EQUIPMENT GUARD                            PASS
HEARTBEAT                                           SUCCESS
MK0 FOUNDATION                                      3 / 3 JOBS PASS
BUILD_READY                                         false
```

Observed runs:

```text
Heartbeat push      33542584043  SUCCESS
MK0 Foundation PR   33542590293  SUCCESS
MK0 Foundation push SUCCESS
```

The current STATUS commit must itself pass the same ECG before becoming the final reconciled baseline.

## Critical path

```text
Q-005 production witness/freshness + physical checkpoint anchor
        +
Q-003 Level B controlled Gmail execution
        +
Q-004 real deletion/revocation/privacy inspection
        +
Q-005 production crypto + mobile/recovery evidence
        ↓
A-001 + SEC-001 reconciliation
        ↓
DM-001 reconciliation/freeze
        ↓
WF-001 signature UX reconciliation
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

Bounded spikes remain allowed only when they close graph nodes or produce evidence.

## North-star invariant

```text
FINANCIAL_TRUTH > FEATURE_COUNT
```
