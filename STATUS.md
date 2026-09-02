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

```text
E2EE / KEY / RECOVERY / REVOCATION /
KNEE / CHECKPOINT / WITNESS / PNS      116 / 116 PASS
```

Q-005 remains `ACTIVE`: bounded spike evidence is not release-grade production/mobile/crypto/witness proof.

```text
AUTHENTICITY
        !=
AUTHORIZATION
        !=
APPEND-ONLY CONSISTENCY
        !=
GLOBAL FRESHNESS
```

## Gmail / financial ingress

### Level A — contractual ingress + OAuth boundary

Current contract family is green, including:

```text
ASYNC PROVIDER CONTRACT                     PASS
METADATA-FIRST                              PASS
FULL ONLY FOR CANDIDATES                    PASS
CASE-INSENSITIVE MAIL HEADER LOOKUP         PASS
INCREMENTAL HISTORY MODEL                   PASS
HISTORY 404 RECOVERY                        PASS
GMAIL PROFILE CONTRACT                      PASS
OFFICIAL messageAdded HISTORY QUERY         PASS
UNFILTERED HISTORY DIAGNOSTIC CONTRACT      PASS
EMPTY HISTORY ZERO-CHANGE CONTRACT          PASS
RESTART / REPLAY                            PASS
REAL-SHAPE SANITIZED PARSER                 PASS
MIME DESCRIPTORS                            PASS
RAW ATTACHMENT AUTO-FETCH                   0
RAW BODY DURABLE RETENTION                  0
PLAINTEXT FINANCIAL CLOUD                   0 in harness
AUTH SECRET IN TESTED LOGS                  0
T-003                                       PASS
S-003                                       ACTIVE
```

OAuth boundary:

```text
PKCE S256                                      PASS
STATE BINDING                                  PASS
EXACT gmail.readonly SCOPE                     PASS
BROADER GMAIL SCOPE SET                        REJECTED
DESKTOP CREDENTIAL JSON EXACT-CLIENT CHECK     PASS
DESKTOP CLIENT SECRET AT GOOGLE TOKEN ENDPOINT PHYSICALLY REQUIRED/OBSERVED
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

`DESKTOP DEV CREDENTIAL ≠ MOBILE CONFIDENTIAL SECRET`.

### Level B — real Gmail provider

```text
REAL PROVIDER CONNECTION       PASS
REAL MESSAGE IDS               RECEIVED
REAL TRANSACTIONAL METADATA    RECEIVED
REAL TRANSACTIONAL BODY        RECEIVED
REAL MIME STRUCTURE            RECEIVED
REAL RAW GMAIL CONTENT IN REPO 0
REAL FINANCIAL LITERALS IN CI  0
```

Evidence:

`mk0/10-evidence/EV-Q003-REAL-GMAIL-REACHABILITY-2026-09-01.md`

The engineering connector authority is not product OAuth authority.

### Level C — FinanceSensor-owned OAuth

External DEV setup is physically present:

```text
FINANCESENSOR GOOGLE CLOUD DEV PROJECT      READY / OBSERVED
GMAIL API                                   ENABLED
AUDIENCE                                    EXTERNAL / TESTING
CONTROLLED TEST USER                        CONFIGURED
REQUESTED SCOPE                             gmail.readonly ONLY
DESKTOP OAUTH CLIENT                        FinanceSensor DEV Level-C
```

#### v1 / v2 — fail-closed token exchange

```text
v1  state callback PASS → token HTTP 400             → Gmail calls 0
v2  state callback PASS → INVALID_REQUEST HTTP 400   → Gmail calls 0
```

Synthetic negative provider diagnostics isolated Google's observed response:

```text
client_secret is missing.
```

That physically invalidated the earlier Client-ID-only Desktop DEV assumption. ADR-017 and the runner were corrected so the Google-issued Desktop installed-client credential is selected locally and never enters repo/CI/cloud/evidence.

Evidence:

`mk0/10-evidence/EV-Q003-DESKTOP-OAUTH-CLIENT-CREDENTIAL-2026-09-02.md`

#### v3 — OAuth/Gmail path physically crossed; candidate gap

v3 proved real consent, token exchange, Gmail profile/history access and revocation, but did not fetch a FULL synthetic message. It also exposed two harness defects that were repaired:

```text
mail headers must be case-insensitive
EXECUTION_COMPLETE != LEVEL_C_PASS
```

Evidence:

`mk0/10-evidence/EV-Q003-LEVEL-C-V3-PARTIAL-2026-09-02.md`

#### v4 — strict PASS law; history gap isolated

Sanitized physical result:

```text
REAL CONSENT                         PASS
STATE BINDING                        PASS
TOKEN EXCHANGE                       HTTP 200
PROFILE HISTORY CURSOR               PASS
messages.list                        0 / SKIPPED BY DESIGN
history.list                         2
METADATA                             0
FULL                                 0
SYNTHETIC MARKER                     NOT FOUND
PROVIDER REVOKE                      PASS
REFRESH AUTHORITY AFTER REVOKE       DENIED
EXECUTION COMPLETE                   true
LEVEL C PASS                         FAIL
RESULT                               LEVEL_C_EXECUTION_COMPLETE_WITH_GAPS
```

Privacy counters remained zero for Gmail content, financial plaintext, secrets, credential path, proof marker and pre-authorization mailbox sweep.

Because `metadata = 0`, v4 failed **before** metadata classification. The run cannot distinguish mailbox propagation, wrong mailbox/recipient or a different history observation. Those possibilities are not guessed.

Evidence:

`mk0/10-evidence/EV-Q003-LEVEL-C-V4-HISTORY-GAP-2026-09-02.md`

#### v5 — prepared / CI-validated diagnostic boundary

v5 adds diagnosis without broadening Gmail scope or scanning the mailbox:

```text
Google Desktop credential JSON
        ↓ local-only selection
state + PKCE + root loopback
        ↓
Google token endpoint
        ↓
/profile
        ↓
show exact authorized Gmail address LOCALLY ONLY
        ↓
user sends fresh synthetic inbound message to exact address
        ↓
/profile again BEFORE history.list
        ↓
current historyId == baseline?
    YES → stop; no history.list spent
    NO  → filtered messageAdded history
        ↓
messageAdded IDs?
    YES → METADATA → exact marker → production gate → ≤1 FULL
    NO  → one unfiltered diagnostic history request
          aggregate event-family counts only
          diagnostic path CANNOT produce LEVEL_C_PASS
        ↓
replay
        ↓
revoke
        ↓
old refresh authority denied
```

v5 privacy/request boundaries:

```text
messages.list                          0
pre-authorization mailbox sweep       0
max changed IDs / attempt             5
max FULL                              1
max attempts                          2
authorized mailbox in result          0
message IDs in result                 0
proof marker in result                0
Gmail content in result               0
credential path/content in result     0
OAuth/token secrets in result         0
```

`LEVEL_C_PASS` requires the **normal filtered `messageAdded` path**. Diagnostic fallback can explain a mismatch but cannot upgrade the gate.

Validated lineage:

```text
v5 runner/launcher head    ac4d8630da92aa576371b84330d1d209cc48a69d
Heartbeat                  SUCCESS — run 33589139375
Foundation push            SUCCESS — run 33589139359
Foundation PR              SUCCESS — run 33589142240

v5 packaging head          26092596708465399799b6c6f4a3fccfa91f0aef
Package helper             SUCCESS — run 33589158915
Foundation push            SUCCESS — run 33589158925
Foundation PR              SUCCESS — run 33589162143
```

The intermediate packaging run on `ac4d…` failed because the still-v4 packaging guard rejected the newly switched v5 launcher. That red was corrected by updating the packaging workflow; the final v5 package run is green.

Q-003 remains **ACTIVE**.

## Privacy nervous system

```text
BASE DATA CLASSES                19
RECOVERY/REVOCATION/CHECKPOINT    5
TOTAL PRIVACY CLASSES            24
PRIVACY MATRIX ECG               PASS
```

Gmail OAuth authority remains local-sensitive material. Desktop credential, refresh authority and bearer tokens are forbidden from normal cloud custody, GitHub evidence and financial telemetry. Privacy matrices remain design-level DRAFT until physical platform storage/transport/deletion evidence exists.

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

## Current Q-003 critical path

```text
LEVEL C v5
        ↓
exact authorized mailbox proven locally
        ↓
mailbox history advancement observed
        ↓
FILTERED messageAdded
        ↓
METADATA
        ↓
exact synthetic marker + production gate
        ↓
1 FULL
        ↓
financial extraction
        ↓
replay
        ↓
revoke + denied old refresh
        ↓
LEVEL_C_PASS
        ↓
audit evidence
        ↓
Q-003 closure decision
```

Q-004 and Q-005 remain independent blockers even if Level C passes.

## Repository governance

```text
main protected                  NO
required status checks          NONE
branch protection enforcement   OFF
PR #1                           DRAFT / DO NOT MERGE
```

`OPS-001` remains a dependency of `G-MK0`.

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
EXECUTION_COMPLETE ≠ LEVEL_C_PASS
HTTP history.list success ≠ observed messageAdded event
PROVIDER ASSUMPTION ≠ PROVIDER EVIDENCE
DESKTOP DEV CREDENTIAL ≠ MOBILE CONFIDENTIAL SECRET
```
