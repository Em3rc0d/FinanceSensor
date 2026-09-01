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

The closed nodes remain reopenable if later provider/device evidence contradicts their claims.

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

Validated executable baseline: `404f7f1a0f6010d583e72010876785eef00b7254`.

```text
E2EE / KEY / RECOVERY / PNS      PASS — 51/51 tests
RECOVERY ELECTROSHOCK            PASS — 18/18 tests
KEY AUTHORITY LOAD TEST          PASS — 5/5 tests
T-002                            PASS
Q-005                            ACTIVE
ADR-014 RECOVERY OWNERSHIP       SPIKE-ACCEPTED
INV-SYNC-008..011                PROVEN_AT_SPIKE
```

Evidence: `mk0/10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`.

The load-bearing audit strengthened two adjacent contracts that Recovery depends on:

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
```

The logical all-devices-lost ownership problem is no longer conceptually open:

```text
SERVER MASTER KEY               REJECTED
PASSWORD-ONLY RECOVERY          REJECTED FOR MK0
ASYMMETRIC RECOVERY KEY         ACCEPTED AT SPIKE LEVEL
RECOVERY PRIVATE KEY            USER-HELD / OFFLINE
PER-EPOCH RECOVERY WRAP         REQUIRED
AUTHENTICATED COVERAGE          REQUIRED
AMBIGUOUS COVERAGE              FAIL CLOSED
POST-RECOVERY DEVICE HARDENING  REQUIRED
POST-RECOVERY TENANT ROTATION   REQUIRED
POST-RECOVERY RECOVERY ROTATION REQUIRED
NEXT-EPOCH RECOVERY COVERAGE    REQUIRED
FUTURE-SYNC READINESS GATE      REQUIRED
```

A hardening **plan** is no longer enough in the executable model. `REC-018` requires the state to prove new epoch + new Recovery Key + new-device authorization + lost-device revocation + next-epoch recovery coverage before `readyForFutureSync` can become true.

Q-005 remains open because production cryptography, physical Android/iOS key/background behavior, real control-plane authorization, Recovery Kit handling and physical disaster recovery still require evidence.

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

Latest validated traceability baseline:

```text
PRODUCT INVARIANTS          34
DATA-MODEL INVARIANTS       42
TOTAL WIRED                  76

SPECIFIED                    29
PARTIAL                      18
PROVEN_AT_SPIKE              14
PROVEN                       15

REGISTERED CONTRADICTIONS     2
OPEN CONTRADICTIONS           0
```

`INV-SYNC-008..011` are wired through `graph/traceability-recovery.json`. The new `KEY-001..005` cases additionally strengthen executable support for already-wired `INV-TEN-005` and `INV-SYNC-003`; no release-grade state promotion is inferred from those new tests alone.

`G-MK0` cannot close while release-scope invariants remain below `PROVEN`.

## Privacy nervous system

```text
BASE DATA CLASSES            18
RECOVERY DATA CLASSES         3
TOTAL PRIVACY CLASSES        21
PRIVACY MATRIX ECG           PASS
```

Recovery classes:

```text
RECOVERY-PRIVATE-KEY
RECOVERY-PUBLIC-KEY
RECOVERY-EPOCH-WRAP
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

The authoritative ledger cites Recovery source, tests, ADR-014 and evidence under Q-005/S-002/T-002 while deliberately preserving their states.

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

Q-003 remains `ACTIVE`; provider-contract evidence cannot substitute for a controlled real Gmail execution.

## Q-004 / privacy remaining proof

```text
real Gmail lifecycle evidence
real OAuth revocation evidence
Android protected credential/key-store evidence
Apple key-store evidence
real transport/storage inspection
cloud deletion/backup semantics
Recovery Kit export/import leakage testing
metadata leakage analysis
```

## Q-005 remaining blockers

```text
reviewed production cryptographic construction/library
exact production HPKE/AEAD/signature suite freeze
Android ↔ iOS cryptographic interoperability
Android Keystore/StrongBox physical evidence
iOS Keychain/Secure Enclave physical evidence
real control-plane tenant authorization enforcement
real recovery-wrap retrieval authorization
real network partition / long-offline recovery
real crash/restart persistence
real WorkManager / BackgroundTasks behavior
physical all-devices-lost recovery
physical post-recovery revocation/rotation/readiness
Recovery Kit export/import leakage controls
recovery authentication / re-authentication gate
recovery retention/deletion policy
side-channel / penetration-test review
metadata leakage analysis
```

The logical recovery ownership, authenticated coverage, tenant-scoped key-authority and post-recovery readiness semantics are **not** on this blocker list anymore; they are decided/tested at bounded spike level.

## Repository governance position

```text
main protected                  NO
required status checks          NONE
branch protection enforcement   OFF
PR #1                           DRAFT / DO NOT MERGE
```

`OPS-001` remains an explicit dependency of `G-MK0`.

## Whole-organism ECG baseline

Validated executable load-bearing head `404f7f1a0f6010d583e72010876785eef00b7254`:

```text
CANONICAL RESOLVER              98 / 98 PASS
E2EE / KEY / RECOVERY / PNS     51 / 51 PASS
RECOVERY                        18 / 18 PASS
KEY AUTHORITY                    5 / 5 PASS
PHYSICAL INGRESS                21 / 21 PASS
CLOSURE GRAPH                   PASS
ARTIFACT STATUS AUTHORITY       PASS
QUARRY STATUS                   PASS
TRACEABILITY                    PASS — 76 / 76 WIRED
PRIVACY MATRIX                  PASS — 21 CLASSES
HEARTBEAT                       PASS
MK0 FOUNDATION                  3 / 3 JOBS PASS
BUILD_READY                     false
```

Any later documentation/graph head that claims this baseline is accepted only if it repeats the whole-organism ECG successfully; green Recovery tests alone are insufficient.

## Critical path

```text
Q-003 Level B controlled Gmail execution
        +
Q-004 real deletion/revocation/privacy inspection
        +
Q-005 production crypto + real control-plane authorization + physical mobile/recovery evidence
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
