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

## Heart closure state

```text
C-001 External-transfer semantics     CLOSED
C-002 Refund/reversal projection      CLOSED
Q-001 Canonical semantics             CLOSED
Q-002 Fingerprinting/dedup            CLOSED
```

Closed nodes remain reopenable if later provider/device evidence contradicts their claims.

## Financial heart evidence

```text
CANONICAL RESOLVER           PASS — 98/98 tests
SEMANTIC CORPUS              PASS — 54 bounded cases
Q-002 ADVERSARIAL SCENARIOS  PASS — 28/28 decisions
UNSAFE FALSE MERGES          0
AUTO-MERGE PRECISION         100%
HARD-LINK FALSE SPLITS       0
REPLAY DUPLICATE COUNT       0
BENCHMARK DECISION ACCURACY  100%
```

## Q-005 load-bearing evidence

Validated knee-stress evidence: `mk0/10-evidence/EV-Q005-KNEE-STRESS-2026-09-01.md`.
Validated whole-organism head: `0898a60eb08244072d6e60b3b0932d215d82cbd6`.

```text
E2EE / KEY / RECOVERY / REVOCATION / KNEE / PNS  PASS — 84/84 tests
RECOVERY OWNERSHIP + LOWER GATE                    PASS — REC-001..018
POST-RECOVERY CUTOVER                              PASS — REC-019..022
REVOCATION CUTOVER                                 PASS — REV-001..007
KEY AUTHORITY LOAD                                 PASS — KEY-001..005
KNEE ADVERSARIAL CAMPAIGN                          PASS — 12 red assertions exposed then repaired
SYNC REPLAY IDENTITY                               PASS IN TESTED MODEL
ORIGIN SEQUENCE IDENTITY                           PASS IN TESTED MODEL
TENANT-ISOLATED MATERIALIZATION                    PASS IN TESTED MODEL
CONFLICT / META-CONFLICT SEMANTICS                 PASS IN TESTED MODEL
T-002                                              PASS
Q-005                                              ACTIVE
ADR-014 RECOVERY OWNERSHIP                         SPIKE-ACCEPTED
INV-SYNC-008..015                                  PROVEN_AT_SPIKE where wired
```

Evidence:

- `mk0/10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`
- `mk0/10-evidence/EV-Q005-REVOCATION-CUTOVER-2026-09-01.md`
- `mk0/10-evidence/EV-Q005-KNEE-STRESS-2026-09-01.md`

The load-bearing audits now protect:

```text
RECOVERY COVERAGE
  existence alone is insufficient
  signature + identity + tenant + epoch authority required
  tampered wrap cannot count
  exact duplicate delivery is idempotent
  distinct authentic ambiguity fails closed

DEVICE KEY AUTHORITY
  DeviceAuthorization is tenant-scoped + epoch-scoped
  authorizer identity must match
  recipient identity must match
  both sides rechecked for tenant + epoch authorization
  cross-tenant authority is rejected

REVOCATION CUTOVER
  key rotation alone is insufficient while old keys remain replayable
  accepted historical origin stream is authenticated and frozen
  post-cutover stale-epoch extension/substitution is rejected
  unresolved origin gaps fail closed
  revoked device cannot certify its own cutoff

POST-RECOVERY FINAL RESUME
  lower-level hardening is necessary but not final authority
  every lost device requires recovered-history evidence and an authenticated cutover barrier
  active-at-recovery-epoch devices cannot disappear from the disaster inventory
  missing/tampered/ambiguous cutover state keeps future sync blocked

SYNC IDENTITY
  event_id is immutable
  (tenant, origin_device, sequence) is an immutable slot
  exact duplicates are idempotent
  divergent identity reuse fails closed
  one materialization belongs to one tenant

CONFLICT RESOLUTION
  incompatible corrections become explicit conflict
  incompatible resolutions become explicit meta-conflict
  invalid resolution targets fail closed
  equivalent same-choice resolutions converge
```

### Explicit Q-005 anti-rollback limit

The knee campaign proved integrity of history that the recovering device can observe. It did **not** prove Byzantine availability/freshness.

```text
FIRST-SEEN COMPLETE-LOOKING PREFIX
        !=
PROOF THAT A RELAY DID NOT WITHHOLD A LATER PREFIX
```

A fresh recovery device with no independent trusted checkpoint cannot distinguish an older valid signed history from the latest valid history merely from signatures/hash commitments. `Q-005` therefore remains `ACTIVE`; Anti-Rollback / Trusted Checkpoint is the next bounded subproblem.

## Financial ingress / Gmail evidence

### Level A — contractual harness

```text
PHYSICAL INGRESS HARNESS       PASS — 21/21 tests
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

### Level B — real Gmail provider

Prepared but not executed:

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

No Gmail token/client secret/user mail is committed to the repository.

## Invariant nervous system

Validated against head `0898a60eb08244072d6e60b3b0932d215d82cbd6`:

```text
PRODUCT INVARIANTS          34
DATA-MODEL INVARIANTS       46
TOTAL WIRED                  80

SPECIFIED                    29
PARTIAL                      18
PROVEN_AT_SPIKE              18
PROVEN                       15

REGISTERED CONTRADICTIONS     2
OPEN CONTRADICTIONS           0
```

`INV-SYNC-008..015` are wired through `graph/traceability-recovery.json`. The knee campaign specifically adds executable evidence for immutable replay identity, origin-sequence identity, tenant-isolated materialization and conflict-safe resolution.

`G-MK0` cannot close while release-scope invariants remain below `PROVEN`.

## Privacy nervous system

```text
BASE DATA CLASSES             18
RECOVERY/REVOCATION CLASSES    4
TOTAL PRIVACY CLASSES         22
PRIVACY MATRIX ECG            PASS
```

Recovery/revocation classes:

```text
RECOVERY-PRIVATE-KEY
RECOVERY-PUBLIC-KEY
RECOVERY-EPOCH-WRAP
REVOCATION-CUTOVER-BARRIER
```

The privacy matrices remain design-level DRAFTs until physical storage/transport/deletion evidence exists.

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

The authoritative ledger deliberately preserves these owner states. `PROVEN_AT_SPIKE` evidence does not promote `Q-005/S-002` to `CLOSED`.

```text
GRAPH        PASS
NODES        21
BUILD_READY  false
```

## Gmail position

```text
minimum Gmail scope candidate      gmail.readonly
metadata-first retrieval           PROVEN IN CONTRACT HARNESS
historyId incremental sync         PROVEN IN CONTRACT HARNESS
Pub/Sub push required for MK0      no
real Gmail REST adapter            implemented
controlled live runner             prepared
production OAuth verification      required
security assessment applicability  still open for actual architecture
real Gmail OAuth/API spike         BLOCKED ON CONTROLLED CREDENTIAL
```

## Q-004 / privacy remaining proof

```text
real Gmail lifecycle evidence
real OAuth revocation evidence
Android protected credential/key-store evidence
Apple key-store evidence
real transport/storage inspection
cloud deletion/backup semantics
Recovery Kit export/import leakage testing
Revocation Barrier storage/retention/deletion inspection
checkpoint/anchor metadata leakage analysis
```

## Q-005 remaining blockers

```text
Anti-Rollback / Trusted Checkpoint semantics
all-devices-lost independent freshness anchor
reviewed production cryptographic construction/library
exact production HPKE/AEAD/signature suite freeze
reviewed production revoked-origin append-only commitment
Android ↔ iOS cryptographic interoperability
Android Keystore/StrongBox physical evidence
iOS Keychain/Secure Enclave physical evidence
real control-plane tenant authorization enforcement
real recovery-wrap retrieval authorization
real Revocation Barrier persistence/authorization
real network partition / long-offline cutover recovery
real crash/restart persistence around cutover
real WorkManager / BackgroundTasks behavior
physical all-devices-lost recovery
physical post-recovery revocation/rotation/cutover
Recovery Kit export/import leakage controls
recovery authentication / re-authentication gate
recovery + barrier retention/deletion policy
side-channel / penetration-test review
metadata leakage analysis
```

The logical recovery ownership, authenticated coverage, tenant-scoped key authority, stale-epoch cutover, final post-recovery resume semantics, replay identity and tenant-isolated materialization are no longer conceptual blockers at bounded spike level.

## Repository governance position

```text
main protected                  NO
required status checks          NONE
branch protection enforcement   OFF
PR #1                           DRAFT / DO NOT MERGE
```

`OPS-001` remains an explicit dependency of `G-MK0`.

## Whole-organism ECG baseline

Validated head `0898a60eb08244072d6e60b3b0932d215d82cbd6`:

```text
CANONICAL RESOLVER                                  98 / 98 PASS
E2EE / KEY / RECOVERY / REVOCATION / KNEE / PNS    84 / 84 PASS
PHYSICAL INGRESS                                    21 / 21 PASS
CLOSURE GRAPH                                       PASS
ARTIFACT STATUS AUTHORITY                           PASS
QUARRY STATUS                                       PASS
TRACEABILITY                                        PASS — 80 / 80 WIRED
PRIVACY MATRIX                                      PASS — 22 CLASSES
RECOVERY EQUIPMENT GUARD                            PASS
HEARTBEAT                                           PASS
MK0 FOUNDATION                                      3 / 3 JOBS PASS
BUILD_READY                                         false
```

Observed workflow evidence:

```text
Heartbeat push run       33538703822   SUCCESS
MK0 Foundation push      33538703894   SUCCESS
MK0 Foundation PR run    33538701834   SUCCESS
```

This is a bounded spike/documentation baseline, not release-grade security approval.

## Critical path

```text
Q-005 Anti-Rollback / Trusted Checkpoint
        +
Q-003 Level B controlled Gmail execution
        +
Q-004 real deletion/revocation/privacy inspection
        +
Q-005 production crypto + production cutover commitment
      + real control-plane authorization + physical mobile/recovery evidence
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
