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

### Q-003 after Level C PASS + production-policy refresh

Q-003 remains `ACTIVE`, not because Gmail technical feasibility is still doubtful, but because its production closure contract is intentionally larger than the DEV proof.

The 2026-09-02 provider-policy refresh froze a stricter server boundary and converted the production-verification work into an explicit package:

```text
LEVEL C PHYSICAL EXECUTION                    PASS
SUCCESSFUL PHYSICAL REFRESH BEFORE REVOKE     OPEN
REQUEST PAYLOAD BYTE ACCOUNTING               OPEN
PER-ENDPOINT LATENCY EVIDENCE                 OPEN
ANDROID/IOS PROTECTED CREDENTIAL HANDLING     OPEN / may delegate to proven security gate
PUBLIC RESTRICTED-SCOPE VERIFICATION          OPEN / provider execution required
SECURITY-ASSESSMENT ARCHITECTURE BOUNDARY     FROZEN
SECURITY-ASSESSMENT PROVIDER DETERMINATION    OPEN
PRODUCTION VERIFICATION PACKAGE               DRAFTED
PUBLICATION + PRODUCTION DEMO                  OPEN
Q-003                                         ACTIVE
```

Important: the observed `tokenRefresh=1` in v7 is the deliberate post-revoke denial check. It does not prove a successful physical refresh after access-token expiry.

New policy artifacts:

- `mk0/11-decisions/ADR-020-GMAIL-RESTRICTED-DATA-SERVER-BOUNDARY.md`
- `mk0/07-plan/GMAIL-PRODUCTION-VERIFICATION-PACKAGE.md`
- `mk0/10-evidence/EV-Q003-PRODUCTION-POLICY-REFRESH-2026-09-02.md`
- `tools/validate-gmail-production-policy.mjs`

The accepted production-policy boundary is intentionally fail-closed:

```text
GMAIL OAUTH AUTHORITY ON SERVER              FORBIDDEN
SERVER-SIDE Gmail API CALLS                  FORBIDDEN
RAW Gmail SERVER PROCESSING                  FORBIDDEN
GENERALIZED Gmail-DERIVED MODEL TRAINING     FORBIDDEN
E2EE OPAQUE RELAY                            ALLOWED BY ARCHITECTURE
E2EE RELAY => ASSESSMENT EXEMPT              NOT PROVEN
GOOGLE ASSESSMENT APPLICABILITY              PROVIDER DETERMINATION REQUIRED
```

`PACKAGE DRAFTED != GOOGLE APPROVED`.

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
Q-003 Gmail feasibility              ACTIVE  ← Level C PASS; production/provider gates open
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

`graph/closure-ledger.json` remains authoritative for node states. Q-003 state is unchanged (`ACTIVE`), therefore no graph-state mutation is justified by Level C or the production-policy package alone.

## Current Q-003 critical path

```text
LEVEL C v7 PHYSICAL PASS
        ↓
freeze sanitized evidence                      DONE
        ↓
production policy/server boundary              FROZEN
        ↓
production verification package structure      DRAFTED
        ↓
successful real refresh before revoke          OPEN
        ↓
bytes + per-endpoint latency                   OPEN
        ↓
protected production credential boundary       OPEN / Q-004/SEC linkage
        ↓
publish disclosures + production demo          OPEN
        ↓
Google restricted-scope verification           OPEN
        ↓
Google assessment applicability determination  OPEN
        ↓
Q-003 closure receipt
```

Q-004 and Q-005 remain independent blockers.

## GitHub Actions / self-hosted CI operating mode

User billing state observed 2026-09-02:

```text
GitHub plan                    Free
Actions included minutes      2000 / 2000 used
Actions billable usage        $0 after current discounts
next included-minute reset    ~29 days
```

The active FinanceSensor CI path no longer relies on GitHub-hosted compute:

```text
ACTIVE RUNNER LABELS          self-hosted + linux + x64 + financesensor
ACTIVE ubuntu-latest PATHS    0
WORKFLOW SECRET REFERENCES    forbidden by CI policy guard
REAL Gmail/OAuth IN CI        forbidden
```

A live routing pulse on 2026-09-02 created jobs with the exact required labels, but GitHub reported:

```text
JOB STATUS       queued
RUNNER ID        null
RUNNER NAME      null
STEPS            []
```

Therefore:

```text
SELF-HOSTED WORKFLOW ROUTING        PASS
NO HOSTED FALLBACK                  PASS BY CONFIGURATION
PHYSICAL FINANCESENSOR RUNNER       NOT SERVING THE OBSERVED JOB
CI GREEN                            NOT CLAIMED
```

The connector available to this project cannot read the repository runner-registration endpoint, so the observed state does not distinguish `registered but offline` from `not registered`. That distinction remains a physical infrastructure fact to prove.

Operating law:

```text
RUNNER OFFLINE/MISSING -> JOB QUEUES
DO NOT FALL BACK TO ubuntu-latest
SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
SKIPPED CI != GREEN CI
LOCAL VALIDATION PASS != GITHUB CI PASS
```

Documentation/evidence-only reconciliation may continue using `[skip ci]` while the physical runner is unavailable, but executable changes are not called CI-green until the dedicated runner actually completes the heartbeat.

Self-hosted CI invariants:

- `ops/SELF-HOSTED-RUNNER.md`
- `tools/validate-ci-runner-policy.mjs`
- `.github/workflows/heartbeat.yml`

## Repository governance

```text
main protected                  NO
required status checks          NONE
branch protection enforcement   OFF
PR #1                           DRAFT / DO NOT MERGE
active CI routing               DEDICATED SELF-HOSTED LABELS
physical runner execution       NOT YET PROVEN
```

`OPS-001` remains a dependency of `G-MK0`.

## Take-the-Hummer rule

**Do not begin unrestricted product implementation yet.** Level C passing and the production-policy refresh remove major Q-003 uncertainty, but Q-003/Q-004/Q-005 and G-MK0 remain open.

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
PACKAGE_DRAFTED != GOOGLE_APPROVED
CURRENT MAILBOX HISTORY != DOCUMENTED PARTIAL-SYNC ANCHOR PROVENANCE
DELIVERED TO INBOX != IMMEDIATELY SEARCHABLE BY Gmail q
LEVEL-C HARNESS != PRODUCTION ONBOARDING
PROVIDER ASSUMPTION != PROVIDER EVIDENCE
PROVIDER DETERMINATION > SELF-DECLARED EXEMPTION
DESKTOP DEV CREDENTIAL != MOBILE CONFIDENTIAL SECRET
SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
```
