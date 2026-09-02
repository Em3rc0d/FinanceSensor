# Q-003 — Gmail OAuth / API / Policy Feasibility

**Priority:** P0  
**Status:** ACTIVE  
**Last policy review:** 2026-09-01  
**Last physical execution:** 2026-09-02

## Question

Can a public FinanceSensor app obtain and retain the Gmail access required for its intended user-benefit flow while complying with Google OAuth, restricted-scope, Limited Use, security-assessment, deletion and production-verification requirements?

## Current answer

**Technical feasibility is physically demonstrated through a FinanceSensor-owned DEV OAuth identity. Public-production feasibility is not yet closed.**

```text
LEVEL A — CONTRACTUAL INGRESS + OAUTH BOUNDARY       PASS AT SPIKE LEVEL
LEVEL B — REAL PROVIDER REACHABILITY / DATA SHAPE    PASS
LEVEL C — FINANCESENSOR-OWNED DEV OAUTH IDENTITY     PHYSICAL PASS
Q-003 — GMAIL PRODUCTION FEASIBILITY                 ACTIVE / NOT CLOSED
```

Level C v7 completed the real FinanceSensor-owned OAuth + Gmail path with exact `gmail.readonly`, a message-derived history anchor, incremental `messageAdded`, metadata gating, exactly one FULL retrieval, extraction, replay, provider revocation and denial of old refresh authority.

`LEVEL_C_PASS != Q-003_CLOSED` because production policy, protected credential handling, successful physical refresh/reauthorization and byte/timing evidence remain open.

## Authoritative findings

### F-003-01 — IMAP does not escape restricted-scope policy

Google classifies `https://mail.google.com/`, `gmail.readonly`, `gmail.metadata`, `gmail.modify` and related Gmail permissions as restricted scopes. `mail.google.com` includes IMAP/SMTP/POP3 use.

**Implication:** IMAP remains useful as a generic non-Gmail adapter, not as a Gmail policy bypass.

Sources:
- https://support.google.com/cloud/answer/13464325
- https://developers.google.com/identity/protocols/oauth2/scopes

### F-003-02 — `gmail.metadata` is insufficient for MK0

FinanceSensor must sometimes inspect selected financial message bodies to derive amount, merchant, semantic meaning and references. `gmail.metadata` cannot provide the selected full-body path required for extraction.

Sources:
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/Format
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
- https://developers.google.com/workspace/gmail/api/guides/list-messages

### F-003-03 — Minimum-scope candidate remains exactly `gmail.readonly`

```text
https://www.googleapis.com/auth/gmail.readonly
```

FinanceSensor MK0 reads but does not modify, send or delete Gmail messages. Broader Gmail scopes fail the OAuth contract suite.

### F-003-04 — Metadata-first retrieval remains the selected pattern

```text
bounded message IDs
      ↓
messages.get(METADATA)
      ↓ local relevance filter
messages.get(FULL) only for candidates
      ↓ local extraction
raw content discarded
```

### F-003-05 — Incremental synchronization is supported, but anchor provenance matters

Google documents initial/full synchronization followed by `history.list` incremental synchronization. Expired/invalid history IDs can require bounded recovery.

The physical campaign exposed an important distinction:

```text
CURRENT MAILBOX HISTORY POSITION
        !=
DOCUMENTED PARTIAL-SYNC ANCHOR PROVENANCE
```

v5 showed that using `/profile.historyId` as the bootstrap anchor was not a sufficient contract. ADR-018 therefore requires a recent message/thread/history-derived `historyId` for partial-sync anchoring.

Sources:
- https://developers.google.com/workspace/gmail/api/guides/sync
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list

### F-003-06 — Pub/Sub push is not required for MK0

Gmail push introduces Google Cloud Pub/Sub and additional mailbox identity/history metadata at the cloud boundary. FinanceSensor keeps push outside the MK0 critical path and favors device-driven eventual freshness first.

Source:
- https://developers.google.com/workspace/gmail/api/guides/push

### F-003-07 — Public production still requires restricted-scope verification

Development/testing does not replace the public production verification path for restricted Gmail access.

Sources:
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://support.google.com/googleapi/answer/7454865
- https://support.google.com/cloud/answer/13464323

### F-003-08 — Security-assessment applicability remains architecture-dependent

Third-party-server handling of restricted data can trigger additional Google security requirements. Keeping Gmail content on the authorized device narrows the server attack surface, but FinanceSensor does not claim that this guarantees an exemption.

Sources:
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://support.google.com/cloud/answer/13465431
- https://support.google.com/cloud/answer/13463816

### F-003-09 — Intended use appears plausibly user-benefiting

FinanceSensor's use appears adjacent to permitted user-benefiting monitoring/reporting behavior, but actual acceptance belongs to Google's production verification process.

Source:
- https://developers.google.com/workspace/workspace-api-user-data-developer-policy

### F-003-10 — Limited Use constrains monetization/AI

```text
NO Gmail-derived ad targeting
NO sale to data brokers
NO Gmail-derived creditworthiness/lending decisions
NO pooled Gmail corpus for generalized model training
```

Source:
- https://developers.google.com/workspace/workspace-api-user-data-developer-policy

### F-003-11 — Real provider shape is compatible with staged ingress

A controlled real-provider probe returned real transactional message identifiers, metadata, body text and MIME structure. No real content or credential was copied into repository evidence.

The real shape exposed parser defects in localized amounts, merchant provenance and operation-reference extraction. Those defects became sanitized synthetic tests before repair.

Evidence:
`../10-evidence/EV-Q003-REAL-GMAIL-REACHABILITY-2026-09-01.md`

### F-003-12 — FinanceSensor-owned OAuth authority contract is executable

ADR-017 freezes the Desktop DEV boundary separately from production mobile credentials:

```text
system browser / supported authorization
        ↓
state + PKCE S256
        ↓
local installed-client credential where Google requires it
        ↓
device-local refresh authority
        ↓
short-lived bearer only
        ↓
GmailRestProvider
```

Governing law:

```text
PROVIDER ASSUMPTION != PROVIDER EVIDENCE
DESKTOP DEV CREDENTIAL != MOBILE CONFIDENTIAL SECRET
```

Evidence:
- `../11-decisions/ADR-017-GMAIL-MOBILE-OAUTH-BOUNDARY.md`
- `../10-evidence/EV-Q003-DESKTOP-OAUTH-CLIENT-CREDENTIAL-2026-09-02.md`

### F-003-13 — CI is not Level C authority

GitHub Actions is forbidden from becoming custodian of the long-lived OAuth/Desktop credential. The product-owned Level-C proof executes locally on the controlled edge runtime.

### F-003-14 — Immediate Gmail Search visibility is not an acceptable bootstrap dependency

v6 observed a synthetic anchor visibly present in Inbox while two bounded exact-subject Gmail Search queries returned zero results.

The evidence does **not** claim a universal Gmail indexing delay. It proves only that the Level-C bootstrap cannot require immediate Search-index visibility.

ADR-019 therefore separates:

```text
MESSAGE DELIVERED TO INBOX
        !=
MESSAGE IMMEDIATELY SEARCHABLE BY q
```

v7 uses a bounded recent-INBOX ID window and Subject-only metadata in local memory to identify the synthetic anchor without Search `q`.

### F-003-15 — FinanceSensor-owned Level C v7 physically passes

Sanitized physical execution on 2026-09-02:

```text
REAL CONSENT                         PASS
EXACT SCOPE                          gmail.readonly
STATE BINDING                        PASS
PKCE S256                            PASS
TOKEN EXCHANGE                       HTTP 200
PROFILE IDENTITY                     PASS
SYNC ANCHOR SOURCE                   MESSAGE_HISTORY_ID
RECENT INBOX ANCHOR WINDOW           PASS
ANCHOR METADATA                      PASS
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
LEVEL C                              PASS
```

Bounded request evidence:

```text
anchor attempts          1 / max 2
probe attempts           1 / max 2
messages.list            1
recent INBOX IDs         5 / max 5
METADATA                 6
FULL                     1 / max 1
history.list             2
profile                  1
token exchange           1
post-revoke refresh      1
revoke                   1
historical mailbox sweep 0
Gmail Search q           0
```

Privacy counters in the sanitized result were all zero for Gmail content, financial plaintext, credentials, markers, mailbox address, message IDs and unrelated recent Subjects.

Evidence:
`../10-evidence/EV-Q003-OWNED-OAUTH-LEVEL-C-V7-PASS-2026-09-02.md`

## Endpoint/scope matrix

| MK0 need | Endpoint / mode | Candidate scope | Decision |
|---|---|---|---|
| Bounded bootstrap IDs | `messages.list` with narrow bounds | `gmail.readonly` | REQUIRED candidate |
| Retrieve selected headers | `messages.get?format=METADATA` | `gmail.readonly` | REQUIRED candidate |
| Retrieve selected body | `messages.get?format=FULL` | `gmail.readonly` | REQUIRED candidate |
| Incremental changes | `history.list` | `gmail.readonly` | REQUIRED candidate |
| Mailbox identity/current position | `users.getProfile` | `gmail.readonly` | identity/diagnostic; not bootstrap anchor |
| Push trigger | `users.watch` + Pub/Sub | restricted access + cloud | DEFER |
| Modify messages | modify endpoints | `gmail.modify` | NOT REQUIRED |
| Send mail | send endpoints | send/compose | NOT REQUIRED |
| Delete mail | delete endpoints | broad scope | FORBIDDEN BY MK0 |

## Level A — contractual ingress + OAuth proof

Implemented under `spikes/physical-ingress/`.

Current contract family covers:

```text
bounded metadata-first retrieval
FULL only for candidates
case-insensitive RFC header lookup
incremental history + replay
history-expiry recovery model
message-derived anchor contract
bounded INBOX bootstrap support
real-shape sanitized parser guards
MIME descriptor-only discovery
PKCE / state / exact-scope OAuth contract
local refresh authority / short-token cache
concurrent refresh coalescing
401 invalidation / no hidden same-call retry
CI long-lived-authority rejection
raw body durable retention       0
raw attachment durable retention 0
plaintext financial cloud        0 in harness
```

## Level B — real provider reachability

```text
REAL_PROVIDER_CONNECTION       PASS
REAL_MESSAGE_IDS               RECEIVED
REAL_TRANSACTIONAL_METADATA    RECEIVED
REAL_TRANSACTIONAL_BODY        RECEIVED
REAL_MIME_STRUCTURE            RECEIVED
REAL_RAW_CONTENT IN REPO       0
REAL_FINANCIAL LITERALS IN CI  0
```

## Level C — FinanceSensor-owned real Gmail path

**PHYSICAL PASS at controlled Desktop DEV level.**

The v7 path was:

```text
FinanceSensor-owned Google DEV OAuth identity
  ↓ controlled tester + exact gmail.readonly
system browser + state + PKCE
  ↓
local token authority
  ↓
/profile identity only
  ↓
bounded recent INBOX IDs (max 5, no Search q)
  ↓
Subject-only anchor metadata
  ↓
anchor MESSAGE.historyId
  ↓
second synthetic purchase
  ↓
history.list(messageAdded)
  ↓
purchase METADATA + production relevance gate
  ↓
exactly one FULL
  ↓
financial extraction
  ↓
replay
  ↓
revoke
  ↓
old refresh authority denied
```

No production mobile-secret claim is derived from this Desktop DEV proof.

## Remaining Q-003 gates

The former external Level-C execution blocker is closed. Q-003 remains ACTIVE for these specific reasons:

```text
SUCCESSFUL PHYSICAL REFRESH BEFORE REVOKE      OPEN
REQUEST PAYLOAD BYTE ACCOUNTING                 OPEN
PER-ENDPOINT LATENCY EVIDENCE                  OPEN
ANDROID/IOS PROTECTED CREDENTIAL HANDLING      OPEN OR DELEGATE TO PROVEN SECURITY GATE
PUBLIC RESTRICTED-SCOPE VERIFICATION            OPEN
SECURITY-ASSESSMENT APPLICABILITY               OPEN
PRODUCTION CONSENT/DISCLOSURE PACKAGE           OPEN
```

The v7 execution's total wall-clock duration is known, but end-to-end duration is not per-endpoint timing evidence. The observed `tokenRefresh=1` is the post-revoke denial check, not a successful real refresh after access-token expiry.

## Verification package still required before public launch

- public product home page;
- privacy policy on verified domain;
- clear Gmail-data disclosure;
- OAuth consent matching real functionality;
- minimum-scope justification;
- demo/video of exact OAuth flow and feature;
- terms/support contact;
- Limited Use disclosure;
- account/data deletion behavior;
- credential revocation behavior;
- security architecture/data-flow diagram.

## Current decision

```text
GMAIL_TECHNICAL_PRIMITIVES           PASS
MINIMUM_SCOPE_CANDIDATE              gmail.readonly
METADATA_FIRST_PIPELINE              PROVEN_AT_SPIKE + REAL SELECTED FULL
INCREMENTAL_SYNC_MODEL               PHYSICALLY PASS AT LEVEL C
REAL_PROVIDER_REACHABILITY           PASS
REAL_TRANSACTIONAL_DATA_RECEPTION    PASS
FINANCESENSOR_GMAIL_ADAPTER          PHYSICALLY EXERCISED
PKCE / STATE                         PHYSICALLY PASS
EXACT-SCOPE GUARD                    PASS
DESKTOP DEV TOKEN EXCHANGE           PHYSICALLY PASS
MESSAGE-DERIVED SYNC ANCHOR          PHYSICALLY PASS
BOUNDED INBOX BOOTSTRAP              PHYSICALLY PASS
LOCAL EXTRACTION                     PHYSICALLY PASS
REPLAY                               PHYSICALLY PASS
PROVIDER REVOCATION                  PHYSICALLY PASS
OLD AUTHORITY AFTER REVOKE           DENIED
LEVEL_C                              PASS
PUSH_REQUIRED_FOR_MK0                NO
PRODUCTION_OAUTH_VERIFICATION        REQUIRED / OPEN
PERMITTED_USE_FIT                    PLAUSIBLE / NOT YET VERIFIED
SECURITY_ASSESSMENT_APPLICABILITY    OPEN
BYTES / PER-ENDPOINT TIMING          OPEN
SUCCESSFUL PHYSICAL REFRESH          OPEN

GMAIL_FEASIBILITY                    ACTIVE / NOT CLOSED
```

## Closure criteria

Q-003 closes only when:

- exact endpoint/scope mapping remains frozen;
- policy path is refreshed before production verification;
- security-assessment applicability is documented for actual architecture;
- appropriate-use fit has no unresolved policy contradiction;
- consent/disclosure requirements are captured;
- controlled FinanceSensor OAuth + bounded list/metadata/full/history path executes — **PASS at Level C v7**;
- platform-protected credential handling is physically observed or explicitly delegated to a separately proven security gate;
- successful refresh/reauthorization and revoke/disconnect behavior are physically observed;
- request/byte/timing evidence is recorded;
- evidence artifact is stored under `mk0/10-evidence/` — **v7 PASS evidence stored**;
- closure receipt is issued;
- explicit `GMAIL_FEASIBILITY PASS/FAIL` is recorded.

```text
READY FOR AUTHORIZATION != LEVEL C PASS != Q-003 CLOSED
```
