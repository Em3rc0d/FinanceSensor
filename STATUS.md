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

Current ingress/OAuth contract family is green. The exact historical `45/45` count is no longer used as the current authority because additional sync-anchor regressions were added after that measurement.

Validated contract areas include:

```text
ASYNC PROVIDER CONTRACT                     PASS
METADATA-FIRST                              PASS
FULL ONLY FOR CANDIDATES                    PASS
CASE-INSENSITIVE MAIL HEADER LOOKUP         PASS
INCREMENTAL HISTORY MODEL                   PASS
HISTORY 404 RECOVERY                        PASS
GMAIL PROFILE CONTRACT                      PASS
messageAdded HISTORY QUERY                  PASS
HISTORY DIAGNOSTIC COUNTS                   PASS
TARGETED SYNC-ANCHOR QUERY                  PASS
MESSAGE-DERIVED historyId ANCHOR            PASS AT CONTRACT LEVEL
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

v3 proved real consent, token exchange, Gmail profile/history access and revocation, but did not fetch a FULL synthetic message. It exposed two harness defects that were repaired:

```text
mail headers must be case-insensitive
EXECUTION_COMPLETE != LEVEL_C_PASS
```

Evidence:

`mk0/10-evidence/EV-Q003-LEVEL-C-V3-PARTIAL-2026-09-02.md`

#### v4 — strict PASS law; history gap isolated

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
```

Evidence:

`mk0/10-evidence/EV-Q003-LEVEL-C-V4-HISTORY-GAP-2026-09-02.md`

#### v5 — physical mailbox/history diagnosis

The v5 execution removed the remaining recipient/propagation ambiguity.

Sanitized aggregate result:

```text
REAL CONSENT                         PASS
STATE BINDING                        PASS
TOKEN EXCHANGE                       HTTP 200
AUTHORIZED MAILBOX SHOWN LOCALLY     PASS
POST-SEND PROFILE CHECK              PASS
MAILBOX HISTORY ADVANCED             PASS
messages.list                        0
FILTERED HISTORY RECORDS             0
FILTERED messageAdded                0
UNFILTERED DIAGNOSTIC USED           true
UNFILTERED HISTORY RECORDS           0
METADATA                             0
FULL                                 0
PROVIDER REVOKE                      PASS
OLD REFRESH AUTHORITY                DENIED
EXECUTION COMPLETE                   true
LEVEL C PASS                         FAIL
```

The message was visibly present in the exact mailbox that `/profile` reported, and the mailbox's current history position advanced. Therefore the unresolved variable was no longer destination or propagation.

The contradiction was architectural: the harness had been using `/profile.historyId` as the bootstrap `history.list.startHistoryId`.

Current Gmail API documentation defines the required provenance more narrowly: `startHistoryId` should be obtained from the `historyId` of a message, thread, or previous history-list response.

New law:

```text
CURRENT MAILBOX HISTORY POSITION
        !=
DOCUMENTED PARTIAL-SYNC ANCHOR PROVENANCE
```

Evidence:

`mk0/10-evidence/EV-Q003-LEVEL-C-V5-PROFILE-HISTORY-ANCHOR-MISMATCH-2026-09-02.md`

Decision:

`mk0/11-decisions/ADR-018-GMAIL-PARTIAL-SYNC-ANCHOR.md`

#### v6 — message-derived partial-sync anchor / READY FOR PHYSICAL RUN

v6 no longer uses `/profile.historyId` as `startHistoryId`.

```text
OAuth
  ↓
/profile → identify exact authorized mailbox only
  ↓
FIRST harmless synthetic anchor email
  ↓
targeted messages.list by random anchor marker
  maxResults = 1
  ↓
messages.get(METADATA, Subject only)
  ↓
anchor MESSAGE.historyId
  ↓
SECOND synthetic purchase email
  ↓
history.list(startHistoryId = anchor MESSAGE.historyId,
             historyTypes = messageAdded)
  ↓
≤ 5 changed IDs
  ↓
METADATA → exact purchase marker → production metadata gate
  ↓
≤ 1 FULL
  ↓
financial extraction
  ↓
replay
  ↓
revoke → old refresh denied
```

The single targeted `messages.list` capability is deliberately reintroduced **only for the synthetic anchor**. It is not a historical mailbox scan and does not change the product's privacy direction.

v6 runner hard caps:

```text
ANCHOR LOOKUP ATTEMPTS              <= 2
ANCHOR list maxResults               = 1 per attempt
HISTORY PROBE ATTEMPTS              <= 2
CHANGED IDS INSPECTED               <= 5 per probe attempt
FULL FETCHES                        <= 1
HISTORICAL MAILBOX SWEEP              0
/profile.historyId AS startHistoryId  0
```

Privacy result exclusions remain:

```text
authorized Gmail address    0
anchor marker               0
purchase marker             0
message IDs                 0
Gmail raw content           0
financial plaintext         0
credential path/content     0
OAuth/token secrets         0
```

Important boundary:

```text
LEVEL-C SYNTHETIC ANCHOR HARNESS
        !=
PRODUCTION INITIAL-SYNC UX
```

Production onboarding/sync remains a separate design decision.

Validated v6 runner head:

```text
878c61734f79d9a6b3f676ae2d55bfbb7f5b756a
Heartbeat          SUCCESS — 33590311958
Foundation push    SUCCESS — 33590312015
Foundation PR      SUCCESS — 33590314688
Package helper     SUCCESS — 33590311989
```

Q-003 remains **ACTIVE** until the v6 normal path completes physically and its sanitized result is audited.

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
LEVEL C v6
        ↓
exact authorized mailbox identity
        ↓
message-derived supported sync anchor
        ↓
filtered messageAdded
        ↓
METADATA
        ↓
exact synthetic purchase marker + production gate
        ↓
1 FULL
        ↓
financial extraction
        ↓
replay
        ↓
revoke + denied old refresh
        ↓
LEVEL_C_PASS candidate
        ↓
audit sanitized evidence
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
PROVIDER FIELD NAME SIMILARITY ≠ SEMANTIC INTERCHANGEABILITY
CURRENT MAILBOX HISTORY ≠ DOCUMENTED PARTIAL-SYNC ANCHOR PROVENANCE
LEVEL-C HARNESS ≠ PRODUCTION ONBOARDING
PROVIDER ASSUMPTION ≠ PROVIDER EVIDENCE
DESKTOP DEV CREDENTIAL ≠ MOBILE CONFIDENTIAL SECRET
```
