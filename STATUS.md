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

## Peripheral/autonomic evidence

```text
PERIPHERAL + PARASYMPATHETIC PASS — 28/28 tests
T-002                        PASS
Q-005                        ACTIVE
```

Q-005 remains deliberately open because production cryptography, physical Android/iOS key/background behavior and recovery still need physical evidence.

## Financial ingress / Gmail evidence

The source pipeline now has two explicitly separated evidence levels.

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

The implementation discovered and fixed an important privacy/correctness interaction: raw mail can be discarded only **after** its derived semantic meaning is captured in encrypted FinancialEvidence. Restart/replay therefore does not require keeping the original email body.

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

```text
PRODUCT INVARIANTS          34
DATA-MODEL INVARIANTS       38
TOTAL WIRED                  72

SPECIFIED                    29
PARTIAL                      18
PROVEN_AT_SPIKE              10
PROVEN                       15

REGISTERED CONTRADICTIONS     2
OPEN CONTRADICTIONS           0
```

`G-MK0` cannot close while release-scope invariants remain below `PROVEN`.

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
S-002 Peripheral convergence spike   ACTIVE
T-002 Peripheral/parasympathetic     PASS
S-003 Physical ingress spike         ACTIVE
T-003 Ingress/privacy suite          PASS
OPS-001 Repository governance        OPEN

G-MK0 BUILD_READY                    BLOCKED
```

## Gmail position

Current source-feasibility position:

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

Research provenance: `research/GMAIL-2026-SOURCES.md`.

Q-003 remains `ACTIVE`; synthetic/provider-contract evidence cannot substitute for a controlled real Gmail execution.

## Privacy position

Q-004 has executable Level A evidence for:

```text
raw-content non-persistence
local encrypted durable state
content-free telemetry allowlist
credential deletion on disconnect
optional derived-state reset
local tenant deletion
request accounting
restart/replay without raw mail
```

Still required before Q-004 closure:

```text
real Gmail lifecycle evidence
real OAuth revocation evidence
Android protected credential-store evidence
real transport/storage inspection
cloud deletion/backup semantics
metadata leakage analysis
```

The machine-readable privacy matrix tracks 18 data classes and remains a DRAFT model.

## Q-005 remaining blockers

```text
production cryptographic construction/library decision
Android Keystore physical evidence
iOS Keychain/Secure Enclave physical evidence
real cloud authorization enforcement
real network partition / long-offline recovery
real crash/restart persistence
real WorkManager / BackgroundTasks behavior
all-devices-lost recovery
side-channel / penetration-test review
metadata leakage analysis
```

## Repository governance position

```text
main protected                  NO
required status checks          NONE
branch protection enforcement   OFF
PR #1                           DRAFT / DO NOT MERGE
```

`OPS-001` remains an explicit dependency of `G-MK0`.

## Critical path

```text
Q-003 Level B controlled Gmail execution
        +
Q-004 real deletion/revocation/privacy inspection
        +
Q-005 production crypto/recovery/mobile evidence
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
