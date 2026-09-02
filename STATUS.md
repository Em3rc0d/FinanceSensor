# FinanceSensor — Current Status

Last reconciled baseline: **2026-09-02**.

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

Closed nodes remain reopenable if downstream provider/device evidence contradicts them.

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

Bounded executable contracts include tenant/epoch device authority, recovery coverage, revocation cutover, post-recovery resume gating, immutable sync identity, tenant-isolated materialization, conflict-safe correction, trusted-checkpoint anti-rollback, opaque witness freshness and parasympathetic background behavior.

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

Q-005 remains `ACTIVE`: these are spike-level properties, not production witness/crypto/mobile proof.

## Gmail / financial ingress

### Level A — contractual ingress + OAuth boundary

Latest validated contract family:

```text
PHYSICAL INGRESS / OAUTH         45 / 45 PASS
ASYNC PROVIDER CONTRACT          PASS
METADATA-FIRST                   PASS
FULL ONLY FOR CANDIDATES         PASS
INCREMENTAL HISTORY MODEL        PASS
HISTORY 404 RECOVERY             PASS
RESTART / REPLAY                 PASS
REAL-SHAPE SANITIZED PARSER      PASS
MIME DESCRIPTORS                 PASS
RAW ATTACHMENT AUTO-FETCH        0
RAW BODY DURABLE RETENTION       0
PLAINTEXT FINANCIAL CLOUD        0 in harness
AUTH SECRET IN TESTED LOGS       0
T-003                            PASS
S-003                            ACTIVE
```

OAuth contract now distinguishes the controlled Google Desktop DEV proof client from the future production Android/iOS client:

```text
PKCE S256                                      PASS
STATE BINDING                                  PASS
EXACT gmail.readonly SCOPE                     PASS
BROADER GMAIL SCOPE SET                        REJECTED
DESKTOP CREDENTIAL JSON EXACT-CLIENT CHECK     PASS
DESKTOP CLIENT SECRET AT GOOGLE TOKEN ENDPOINT PASS AT CONTRACT LEVEL
DESKTOP CLIENT SECRET → GMAIL                  0
DESKTOP CLIENT SECRET → CI/CLOUD/EVIDENCE      0
LOCAL LONG-LIVED AUTHORITY                     PASS AT CONTRACT LEVEL
SHORT-TOKEN CACHE                              PASS
CONCURRENT REFRESH COALESCING                  PASS
401 CACHE INVALIDATION                         PASS
401 HIDDEN SAME-CALL RETRY                     0
REFRESH AUTHORITY → GMAIL                      0
CI AS LONG-LIVED OAUTH AUTHORITY               REJECTED / GUARDED
```

Evidence:

- `mk0/10-evidence/EV-Q003-Q004-INGRESS-HARNESS-2026-09-01.md`
- `mk0/10-evidence/EV-Q003-OAUTH-CLIENT-CONTRACT-2026-09-01.md`
- `mk0/10-evidence/EV-Q003-DESKTOP-OAUTH-CLIENT-CREDENTIAL-2026-09-02.md`

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

External setup is now physically present:

```text
FINANCESENSOR GOOGLE CLOUD DEV PROJECT      READY / OBSERVED
GMAIL API                                   ENABLED
AUDIENCE                                    EXTERNAL / TESTING
CONTROLLED TEST USER                        CONFIGURED
REQUESTED SCOPE                             gmail.readonly ONLY
DESKTOP OAUTH CLIENT                        FinanceSensor DEV Level-C
```

Two controlled FinanceSensor-owned authorization attempts have executed and failed closed **before any Gmail API read**.

#### Attempt 1 — v1

```text
STATE CALLBACK                    PASS
TOKEN EXCHANGE                    HTTP 400
REAL GMAIL API REQUESTS           0
RESULT                            FAIL / TOKEN_EXCHANGE_HTTP_400
```

#### Attempt 2 — v2

v2 tightened privacy before retrying: root loopback redirect, no `messages.list`, history-only after authorization, max 5 changed messages/attempt, max 1 FULL and max 2 attempts.

```text
STATE CALLBACK                    PASS
LOOPBACK ROOT REDIRECT            true
TOKEN EXCHANGE                    HTTP 400 / INVALID_REQUEST
PROFILE / LIST / METADATA / FULL  0 / 0 / 0 / 0
HISTORY                           0
PRE-AUTH MAILBOX SWEEP            0
RESULT                            FAIL / TOKEN_EXCHANGE_INVALID_REQUEST
```

#### Root-cause isolation

A temporary synthetic negative OAuth diagnostic used only the public Client ID, a deliberately fake authorization code and a valid-form verifier. It used no real Gmail grant, no real secret and made no Gmail request.

It reproduced `invalid_request`. A second diagnostic safely captured Google's provider description:

```text
client_secret is missing.
```

This physically invalidated the earlier assumption that the controlled Desktop DEV exchange could operate with the Client ID alone.

The conclusion is deliberately narrow:

```text
GOOGLE DESKTOP DEV CLIENT
→ provider requires its Google-issued installed-client credential at token exchange

PRODUCTION ANDROID / IOS
→ must NOT treat an embedded client_secret as a meaningful confidential boundary
```

`DESKTOP DEV CREDENTIAL ≠ MOBILE CONFIDENTIAL SECRET`.

The one-off intentionally failing diagnostic workflow was removed after its run IDs and result were frozen into evidence.

#### Level-C v3 — ready for next controlled execution

Runner:

`spikes/physical-ingress/live/owned-oauth-level-c-v3.mjs`

Execution packet:

`spikes/physical-ingress/OWNED-OAUTH-EXECUTION.md`

ADR:

`mk0/11-decisions/ADR-017-GMAIL-MOBILE-OAUTH-BOUNDARY.md`

v3 boundary:

```text
Google-downloaded Desktop credentials JSON
        ↓ local Windows file picker
exact installed.client_id validation
        ↓
client_id + client_secret held in process memory only
        ↓ state + PKCE S256
Google token endpoint
        ↓ short bearer only
GmailRestProvider
        ↓
profile historyId
        ↓
post-authorization history.list only
        ↓
≤ 5 changed messages / attempt
        ↓
METADATA
        ↓
≤ 1 selected FULL
        ↓
replay observation
        ↓
revoke
        ↓
old refresh authority must be denied
```

v3 explicitly records:

```text
MESSAGES_LIST_USED                    false
PRE-AUTHORIZATION_MAILBOX_SWEEP       0
CLIENT_SECRET_PERSISTED_BY_RUNNER     0
CLIENT_SECRET_WRITTEN_TO_EVIDENCE     0
CLIENT_SECRET_CLOUD_COPIES            0
CREDENTIAL_PATH_WRITTEN_TO_RESULT     0
```

Level C is **not passed yet**. The product-owned Gmail data plane has not yet completed profile/history/METADATA/FULL/replay/revocation on the corrected v3 boundary.

## Invariant nervous system

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

`G-MK0` cannot close while release-scope invariants remain below `PROVEN`.

## Privacy nervous system

```text
BASE DATA CLASSES                19
RECOVERY/REVOCATION/CHECKPOINT    5
TOTAL PRIVACY CLASSES            24
PRIVACY MATRIX ECG               PASS
```

Gmail OAuth authority remains local-sensitive material. Desktop DEV client credential, refresh authority and bearer tokens are forbidden from normal cloud custody, GitHub evidence and financial telemetry. Privacy matrices remain design-level DRAFT until physical platform storage/transport/deletion evidence exists.

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

## Whole-organism ECG

Latest validated code/runner family:

```text
CANONICAL RESOLVER                                  98 / 98 PASS
E2EE / KEY / RECOVERY / REVOCATION /
KNEE / CHECKPOINT / WITNESS / PNS                  116 / 116 PASS
PHYSICAL INGRESS / OAUTH                            45 / 45 PASS
CLOSURE GRAPH                                       PASS — 21 nodes
ARTIFACT STATUS AUTHORITY                           PASS
QUARRY STATUS                                       PASS — 5
TRACEABILITY                                        PASS — 84 / 84 WIRED
PRIVACY MATRIX                                      PASS — 24 CLASSES
RECOVERY EQUIPMENT GUARD                            PASS
HEARTBEAT                                           SUCCESS
BUILD_READY                                         false
```

Heartbeat run on v3 code head `b30f2872f8829af749c7dfb195651e9b1af55e75`: `33579244640` — SUCCESS.

The final reconciliation head after freezing evidence and retiring the temporary diagnostic workflow is `0d2e724d4e449f917ec318eede504debe68ae54a`; MK0 Foundation passed on both push and PR before this STATUS update.

## Q-003 remaining blocker

```text
LOCAL SELECTION OF GOOGLE DESKTOP CREDENTIAL JSON
        ↓
CONTROLLED TEST USER
        ↓ exact gmail.readonly consent
STATE + PKCE + ROOT LOOPBACK CALLBACK
        ↓
LOCAL DESKTOP CREDENTIAL + REFRESH AUTHORITY
        ↓ short bearer only
GmailRestProvider
        ↓
profile historyId
        ↓
history → METADATA → selected FULL → replay
        ↓
revoke
        ↓
old refresh authority denied
        ↓
LEVEL C PASS / FAIL
```

Until the corrected v3 path executes successfully, Q-003 remains `ACTIVE`.

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
Q-003 FINANCESENSOR-OWNED OAUTH LEVEL C v3
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

**Do not begin unrestricted product implementation yet.** Bounded spikes remain allowed only when they close graph nodes or produce evidence.

## Governing rules

```text
FINANCIAL_TRUTH > FEATURE_COUNT
PASS ≠ CLOSED
CLOSED ≠ IMMUTABLE
PROVEN_AT_SPIKE ≠ PROVEN
DOCUMENTED ≠ VERIFIED
GREEN CI ≠ BUILD_READY
PROVIDER ASSUMPTION ≠ PROVIDER EVIDENCE
DESKTOP DEV CREDENTIAL ≠ MOBILE CONFIDENTIAL SECRET
```
