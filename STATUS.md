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

Current physical-ingress contract family is green. The latest locally executed ingress suite after the bounded-INBOX bootstrap contract is:

```text
PHYSICAL INGRESS / OAUTH CONTRACTS     53 / 53 PASS
CANONICAL RESOLVER                      98 / 98 PASS
```

Validated areas include:

```text
ASYNC PROVIDER CONTRACT                     PASS
METADATA-FIRST                              PASS
FULL ONLY FOR CANDIDATES                    PASS
CASE-INSENSITIVE MAIL HEADER LOOKUP         PASS
INCREMENTAL HISTORY MODEL                   PASS
HISTORY 404 RECOVERY                        PASS
GMAIL PROFILE CONTRACT                      PASS
messageAdded HISTORY QUERY                  PASS
MESSAGE-DERIVED historyId ANCHOR            PASS
BOUNDED RECENT-INBOX BOOTSTRAP              PASS
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

`DESKTOP DEV CREDENTIAL != MOBILE CONFIDENTIAL SECRET`.

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

### Level C — FinanceSensor-owned OAuth — PHYSICAL PASS

The v1-v6 campaign exposed and repaired real assumptions instead of being discarded:

```text
v1/v2  Desktop token exchange contract mismatch
v3     header casing + EXECUTION_COMPLETE/PASS ambiguity
v4     history selection gap
v5     /profile.historyId bootstrap mismatch
v6     delivered-to-Inbox != immediately searchable by Gmail q
v7     bounded recent-INBOX bootstrap → PASS
```

v7 sanitized physical result:

```text
REAL CONSENT                         PASS
EXACT SCOPE                          gmail.readonly
STATE BINDING                        PASS
PKCE S256                            PASS
TOKEN EXCHANGE                       HTTP 200
PROFILE IDENTITY                     PASS
SYNC ANCHOR SOURCE                   MESSAGE_HISTORY_ID
RECENT INBOX ANCHOR WINDOW           PASS
RECENT INBOX IDS                     5 / max 5
ANCHOR METADATA INSPECTED            5
ANCHOR SUBJECT MATCH                 PASS
ANCHOR ESTABLISHED                   PASS
INCREMENTAL HISTORY                  PASS
FILTERED HISTORY RECORDS             1
FILTERED messageAdded                1
HISTORY SELECTION PATH               SUPPORTED_MESSAGE_ANCHOR_MESSAGE_ADDED
PURCHASE METADATA                    PASS
SYNTHETIC MARKER                     PASS
PRODUCTION METADATA GATE             PASS
SELECTED FULL                        PASS
EXTRACTION                           PASS
REPLAY                               PASS
PROVIDER REVOKE                      PASS
OLD REFRESH AUTHORITY                DENIED
EXECUTION COMPLETE                   true
LEVEL C                              PASS
```

Provider request accounting:

```text
anchor attempts            1 / max 2
probe attempts             1 / max 2
profile                    1
messages.list              1
METADATA                   6
FULL                       1 / max 1
history.list               2
token exchange             1
post-revoke refresh check  1
revoke                     1
historical mailbox sweep   0
Gmail Search q             0
/profile.historyId anchor  0
```

Privacy counters reported by the sanitized result:

```text
raw Gmail content in evidence        0
financial plaintext in evidence      0
auth secret in evidence              0
credential path in evidence          0
anchor/purchase marker in evidence   0
unrelated recent Subject in evidence 0
authorized mailbox in evidence       0
message ID in evidence               0
pre-authorization mailbox sweep      0
```

Evidence:
`mk0/10-evidence/EV-Q003-OWNED-OAUTH-LEVEL-C-V7-PASS-2026-09-02.md`

The whole interactive execution took approximately 323.548 seconds, but this is not per-endpoint latency evidence.

### Q-003 after Level C PASS

Q-003 remains `ACTIVE`, not because Gmail technical feasibility is still doubtful, but because its production closure contract is intentionally larger than the DEV proof.

```text
LEVEL C PHYSICAL EXECUTION                 PASS
SUCCESSFUL PHYSICAL REFRESH BEFORE REVOKE  OPEN
REQUEST PAYLOAD BYTE ACCOUNTING            OPEN
PER-ENDPOINT LATENCY EVIDENCE              OPEN
ANDROID/IOS PROTECTED CREDENTIAL HANDLING  OPEN / may delegate to proven security gate
PUBLIC RESTRICTED-SCOPE VERIFICATION       OPEN
SECURITY-ASSESSMENT APPLICABILITY          OPEN
PRODUCTION CONSENT/DISCLOSURE PACKAGE      OPEN
Q-003                                      ACTIVE
```

Important: the observed `tokenRefresh=1` in v7 is the deliberate post-revoke denial check. It does not prove a successful physical refresh after access-token expiry.

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
Q-003 Gmail feasibility              ACTIVE  ← Level C PASS, production closure open
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

`graph/closure-ledger.json` remains authoritative for node states. Q-003 state is unchanged (`ACTIVE`), therefore no graph-state mutation is justified solely by the v7 Level C PASS.

## Current Q-003 critical path

```text
LEVEL C v7 PHYSICAL PASS
        ↓
freeze sanitized evidence                 DONE
        ↓
successful real refresh before revoke     OPEN
        ↓
bytes + per-endpoint latency              OPEN
        ↓
protected production credential boundary  OPEN / Q-004/SEC linkage
        ↓
restricted-scope verification package     OPEN
        ↓
policy/security-assessment decision        OPEN
        ↓
Q-003 closure receipt
```

Q-004 and Q-005 remain independent blockers.

## GitHub Actions budget / CI operating mode

User billing state observed 2026-09-02:

```text
GitHub plan                    Free
Actions included minutes      2000 / 2000 used
Actions billable usage        $0 after current discounts
next included-minute reset    ~29 days
```

Operating rule until reset or an explicit budget/runner decision:

```text
DO NOT trigger GitHub Actions for routine reconciliation.
DOCUMENTATION/EVIDENCE commits use [skip ci].
DO NOT infer CI green from skipped CI.
LOCAL VALIDATION PASS != GITHUB CI PASS.
```

The earlier `runner_id=0 / steps=[]` failures are not treated as product-test failures; they occurred after the included Actions capacity was exhausted.

## Repository governance

```text
main protected                  NO
required status checks          NONE
branch protection enforcement   OFF
PR #1                           DRAFT / DO NOT MERGE
Actions routine execution       PAUSED UNTIL BUDGET DECISION/RESET
```

`OPS-001` remains a dependency of `G-MK0`.

## Take-the-Hummer rule

**Do not begin unrestricted product implementation yet.** Level C passing removes a major Q-003 uncertainty, but Q-003/Q-004/Q-005 and G-MK0 remain open.

## Governing rules

```text
FINANCIAL_TRUTH > FEATURE_COUNT
PASS != CLOSED
CLOSED != IMMUTABLE
PROVEN_AT_SPIKE != PROVEN
DOCUMENTED != VERIFIED
GREEN CI != BUILD_READY
SKIPPED CI != GREEN CI
LOCAL VALIDATION PASS != GITHUB CI PASS
EXECUTION_COMPLETE != LEVEL_C_PASS
LEVEL_C_PASS != Q-003_CLOSED
CURRENT MAILBOX HISTORY != DOCUMENTED PARTIAL-SYNC ANCHOR PROVENANCE
DELIVERED TO INBOX != IMMEDIATELY SEARCHABLE BY Gmail q
LEVEL-C HARNESS != PRODUCTION ONBOARDING
PROVIDER ASSUMPTION != PROVIDER EVIDENCE
DESKTOP DEV CREDENTIAL != MOBILE CONFIDENTIAL SECRET
```
