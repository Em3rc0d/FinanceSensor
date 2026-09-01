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

Financial semantics remain relationship-aware: transfer mechanism does not invent economic effect; refund/reversal offsets require explicit linkage and cannot silently exceed original contribution.

## Q-005 distributed nervous system

Current distributed suite:

```text
E2EE / KEY / RECOVERY / REVOCATION /
KNEE / CHECKPOINT / WITNESS / PNS      116 / 116 PASS
```

Bounded executable contracts include:

```text
TENANT + EPOCH DEVICE AUTHORITY
RECOVERY COVERAGE
REVOCATION CUTOVER
POST-RECOVERY RESUME GATE
IMMUTABLE SYNC IDENTITY
TENANT-ISOLATED MATERIALIZATION
CONFLICT-SAFE CORRECTION/RESOLUTION
TRUSTED CHECKPOINT ANTI-ROLLBACK
OPAQUE INDEPENDENT WITNESS FRESHNESS
PARASYMPATHETIC BACKGROUND BEHAVIOR
```

Key law:

```text
AUTHENTICITY
        !=
AUTHORIZATION
        !=
APPEND-ONLY CONSISTENCY
        !=
GLOBAL FRESHNESS
```

### Trusted checkpoint / opaque witness

Anchor-only semantics remain honest:

```text
no independent anchor
→ INDETERMINATE_FRESHNESS

valid chain extending anchor
→ CONSISTENT_FROM_ANCHOR
→ latestGlobalFreshness = UNPROVEN
```

The opaque witness layer adds an independent freshness signal without giving the witness financial plaintext or a stable real tenant identity.

Witness campaign:

```text
INITIAL WEAK BASELINE        109 / 116 PASS
EXPECTED FAILURES              7
FINAL DISTRIBUTED SUITE      116 / 116 PASS
```

The seven exposed protections were rollback, same-sequence fork, sequence gap, wrong previous hash, witness-ahead-of-relay, same-sequence witness divergence and cross-binding witness confusion.

```text
one valid witness ahead of relay
→ RELAY_BEHIND_WITNESS
→ freshness not confirmed

valid same-sequence witness divergence
→ explicit equivocation / fail safe

zero reachable witnesses
→ never fall back to trusting relay freshness
```

Q-005 remains `ACTIVE`: these are spike-level properties, not production witness/crypto/mobile proof.

Evidence includes:

- `mk0/10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`
- `mk0/10-evidence/EV-Q005-REVOCATION-CUTOVER-2026-09-01.md`
- `mk0/10-evidence/EV-Q005-KNEE-STRESS-2026-09-01.md`
- `mk0/10-evidence/EV-Q005-ANTI-ROLLBACK-2026-09-01.md`
- `mk0/10-evidence/EV-Q005-WITNESS-FRESHNESS-2026-09-01.md`

## Gmail / financial ingress

### Level A — contractual ingress + OAuth boundary

Observed reconciled evidence head:

`5035906dbe6cd652c6b9e5f5b530d7e45fc3187c`

```text
PHYSICAL INGRESS              44 / 44 PASS
ASYNC PROVIDER CONTRACT       PASS
METADATA-FIRST                PASS
FULL ONLY FOR CANDIDATES      PASS
INCREMENTAL HISTORY MODEL     PASS
HISTORY 404 RECOVERY          PASS
RESTART / REPLAY              PASS
REAL-SHAPE SANITIZED PARSER   PASS
MIME DESCRIPTORS              PASS
RAW ATTACHMENT AUTO-FETCH     0
RAW BODY DURABLE RETENTION    0
PLAINTEXT FINANCIAL CLOUD     0 in harness
AUTH SECRET IN TESTED LOGS    0
T-003                         PASS
S-003                         ACTIVE
```

OAuth-specific contract:

```text
PKCE S256                          PASS
STATE BINDING                      PASS
EXACT gmail.readonly SCOPE         PASS
BROADER GMAIL SCOPE SET            REJECTED
CLIENT SECRET IN PUBLIC EXCHANGE   0
LOCAL LONG-LIVED AUTHORITY         PASS AT CONTRACT LEVEL
SHORT-TOKEN CACHE                  PASS
CONCURRENT REFRESH COALESCING      PASS
401 CACHE INVALIDATION             PASS
401 HIDDEN SAME-CALL RETRY         0
REFRESH AUTHORITY → GMAIL          0
CI AS LONG-LIVED OAUTH AUTHORITY   REJECTED / GUARDED
```

Evidence:

- `mk0/10-evidence/EV-Q003-Q004-INGRESS-HARNESS-2026-09-01.md`
- `mk0/10-evidence/EV-Q003-OAUTH-CLIENT-CONTRACT-2026-09-01.md`

### Level B — real Gmail provider

Executed 2026-09-01 through an already-authorized Gmail engineering connection.

```text
REAL PROVIDER CONNECTION       PASS
REAL MESSAGE IDS               RECEIVED
REAL TRANSACTIONAL METADATA    RECEIVED
REAL TRANSACTIONAL BODY        RECEIVED
REAL MIME STRUCTURE            RECEIVED
REAL RAW GMAIL CONTENT IN REPO 0
REAL FINANCIAL LITERALS IN CI  0
```

The live sample exposed real parser weaknesses before production: localized thousands/decimal formatting, merchant provenance and operation-reference extraction. Those were converted into sanitized fixtures and repaired.

Evidence:

`mk0/10-evidence/EV-Q003-REAL-GMAIL-REACHABILITY-2026-09-01.md`

The engineering connector's authority is not repurposed as FinanceSensor product authority.

### Level C — FinanceSensor-owned OAuth identity

```text
GMAIL REST ADAPTER                 READY
OAUTH PKCE/STATE CONTRACT          READY / TESTED
DEVICE-LOCAL CREDENTIAL BROKER     READY / TESTED
LEVEL-C EXECUTION PACKET           READY
FINANCESENSOR-OWNED DEV OAUTH ID   EXTERNAL PRECONDITION
INTERACTIVE FINANCESENSOR CONSENT  NOT EXECUTED
LEVEL C                            NOT PASSED
```

Execution contract:

`spikes/physical-ingress/OWNED-OAUTH-EXECUTION.md`

ADR:

`mk0/11-decisions/ADR-017-GMAIL-MOBILE-OAUTH-BOUNDARY.md`

GitHub Actions is intentionally only a **Gmail Bearer Reachability Spike**. It is not allowed to become custodian of long-lived Gmail OAuth authority merely to automate the experiment.

No Google Cloud administration connector/plugin is available in the current engineering environment, so creation/ownership of the FinanceSensor DEV OAuth identity and interactive consent remain an external physical boundary rather than a code gap.

## Invariant nervous system

Latest observed reconciled nervous-system metrics:

```text
PRODUCT INVARIANTS          34
DATA-MODEL INVARIANTS       50
TOTAL WIRED                  84

SPECIFIED                    29
PARTIAL                      18
PROVEN_AT_SPIKE              22
PROVEN                       15

REGISTERED CONTRADICTIONS     2
OPEN CONTRADICTIONS           0
```

`INV-SYNC-008..019` are wired through the base/recovery traceability network for their bounded claims.

`G-MK0` cannot close while release-scope invariants remain below `PROVEN`.

## Privacy nervous system

```text
BASE DATA CLASSES             19
RECOVERY/REVOCATION/CHECKPOINT 5
TOTAL PRIVACY CLASSES         24
PRIVACY MATRIX ECG            PASS
```

The additional witness class is constrained to minimized pseudonymous commitment metadata; financial plaintext and stable real tenant identity are outside its accepted visibility.

Gmail OAuth credentials remain critical local authority:

```text
CLOUD PLAINTEXT       FORBIDDEN
NORMAL E2EE SYNC      FORBIDDEN_MK0
LOGGING               FORBIDDEN
LOCAL PROTECTION      OS-PROTECTED CREDENTIAL STORE TARGET
```

Privacy matrices remain design-level DRAFTs until physical platform storage/transport/deletion evidence exists.

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
S-002 E2EE/PNS/recovery/witness      ACTIVE
T-002 Distributed suite              PASS
S-003 Physical ingress/OAuth spike   ACTIVE
T-003 Ingress/privacy suite          PASS
OPS-001 Repository governance        OPEN
G-MK0 BUILD_READY                    BLOCKED
```

```text
GRAPH        PASS
NODES        21
BUILD_READY  false
```

Last observed graph state distribution:

```text
PASS       5
CLOSED     4
ACTIVE     6
DRAFTED    4
OPEN       1
BLOCKED    1
```

## Whole-organism ECG

Latest fully observed evidence family before this STATUS reconciliation:

```text
CANONICAL RESOLVER                                  98 / 98 PASS
E2EE / KEY / RECOVERY / REVOCATION /
KNEE / CHECKPOINT / WITNESS / PNS                  116 / 116 PASS
PHYSICAL INGRESS / OAUTH                            44 / 44 PASS
CLOSURE GRAPH                                       PASS — 21 nodes
ARTIFACT STATUS AUTHORITY                           PASS
QUARRY STATUS                                       PASS — 5
TRACEABILITY                                        PASS — 84 / 84 WIRED
PRIVACY MATRIX                                      PASS — 24 CLASSES
RECOVERY EQUIPMENT GUARD                            PASS
HEARTBEAT                                           SUCCESS
MK0 FOUNDATION                                      3 / 3 JOBS PASS
BUILD_READY                                         false
```

The STATUS reconciliation commit itself must pass the same ECG before becoming the new authoritative observed head.

## Q-003 remaining blocker

```text
CONTROLLED FINANCESENSOR GOOGLE CLOUD DEV OAUTH IDENTITY
        ↓
CONTROLLED TEST USER
        ↓ exact gmail.readonly consent
SUPPORTED CLIENT CALLBACK + STATE + PKCE
        ↓
PROTECTED EDGE CREDENTIAL AUTHORITY
        ↓ short bearer
GmailRestProvider
        ↓
list → METADATA → selected FULL → history/incremental
        ↓
401 / reauthorization observation
        ↓
revoke/disconnect
        ↓
old authority denied
        ↓
LEVEL C PASS / FAIL
```

Until this executes, Q-003 remains `ACTIVE`.

## Q-004 remaining physical proof

```text
FinanceSensor-owned Gmail lifecycle/revocation
Android protected credential/key storage
Apple protected credential/key storage
real transport/storage inspection
cloud deletion/backup semantics
Recovery Kit leakage testing
Revocation Barrier retention/deletion
Trusted Checkpoint / witness metadata leakage
trusted-anchor deletion/retirement semantics
```

## Q-005 remaining blockers

```text
production independent witness deployment/ownership decision
Recovery Kit checkpoint/witness refresh semantics
reviewed production checkpoint/append-only construction
atomic crash-safe checkpoint + anchor advancement
reviewed production HPKE/AEAD/signature suite
Android ↔ iOS cryptographic interoperability
Android Keystore/StrongBox physical evidence
iOS Keychain/Secure Enclave physical evidence
protected mobile anchor storage
real control-plane tenant authorization
real recovery/checkpoint/witness authorization
network partition / long-offline recovery
crash/restart persistence around cutover/checkpoint
real WorkManager / BackgroundTasks behavior
physical all-devices-lost recovery
physical post-recovery revocation/rotation/cutover
Recovery Kit export/import leakage controls
recovery re-authentication gate
retention/deletion policy
side-channel / penetration-test review
metadata leakage analysis
```

## Repository governance

```text
main protected                  NO
required status checks          NONE
branch protection enforcement   OFF
PR #1                           DRAFT / DO NOT MERGE
```

`OPS-001` remains a dependency of `G-MK0`.

## Critical path

```text
Q-003 FINANCESENSOR-OWNED OAUTH LEVEL C
        +
Q-004 REAL CREDENTIAL/DELETION/PRIVACY EVIDENCE
        +
Q-005 PRODUCTION WITNESS + CRYPTO + MOBILE EVIDENCE
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
