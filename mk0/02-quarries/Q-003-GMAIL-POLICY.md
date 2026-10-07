# Q-003 — Gmail OAuth / API / Policy Feasibility

**Priority:** P0  
**Status:** ACTIVE  
**Last policy review:** 2026-09-02  
**Last physical execution:** 2026-09-02

## Question

Can a public FinanceSensor app obtain and retain the Gmail access required for its intended user-benefit flow while complying with Google OAuth, restricted-scope, Limited Use, security-assessment, deletion and production-verification requirements?

## Current answer

**Technical feasibility is physically demonstrated through a FinanceSensor-owned DEV OAuth identity. Public-production feasibility is not yet closed.**

```text
LEVEL A — CONTRACTUAL INGRESS + OAUTH BOUNDARY       PASS AT SPIKE LEVEL
LEVEL B — REAL PROVIDER REACHABILITY / DATA SHAPE    PASS
LEVEL C v7 — FINANCESENSOR-OWNED DEV OAUTH IDENTITY  PHYSICAL PASS
LEVEL C v8 — REFRESH + NETWORK EVIDENCE HARNESS      READY / NOT PHYSICALLY EXECUTED
Q-003 — GMAIL PRODUCTION FEASIBILITY                  ACTIVE / NOT CLOSED
```

Level C v7 completed the real FinanceSensor-owned OAuth + Gmail path with exact `gmail.readonly`, a message-derived history anchor, incremental `messageAdded`, metadata gating, exactly one FULL retrieval, extraction, replay, provider revocation and denial of old refresh authority.

Level C v8 is now prepared to close the remaining refresh/byte/timing evidence gap by requiring a successful real refresh before revoke, proving the refreshed bearer against Gmail, recording sanitized endpoint-class body-byte/timing aggregates, then revoking and proving old refresh authority is denied.

`LEVEL_C_PASS != Q-003_CLOSED` because production verification, provider security-assessment determination, protected production credential handling and public disclosure/deletion evidence remain open.

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

### F-003-08 — Security-assessment applicability remains architecture-dependent and provider-controlled

Third-party-server handling of restricted data can trigger additional Google security requirements. Keeping Gmail authority/content on the authorized device narrows the server attack surface, but FinanceSensor does not claim that this guarantees an exemption.

ADR-020 freezes the server boundary and requires Google/provider determination for the actual production topology, including the opaque E2EE relay case.

```text
E2EE OPAQUE RELAY => MINIMIZED SERVER CAPABILITY
E2EE OPAQUE RELAY => AUTOMATIC ASSESSMENT EXEMPTION   NOT PROVEN
GOOGLE APPLICABILITY DETERMINATION                    REQUIRED
```

Sources:
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://support.google.com/cloud/answer/13465431
- https://support.google.com/cloud/answer/13463817

Evidence/decision:
- `../11-decisions/ADR-020-GMAIL-RESTRICTED-DATA-SERVER-BOUNDARY.md`
- `../10-evidence/EV-Q003-PRODUCTION-POLICY-REFRESH-2026-09-02.md`

### F-003-09 — Intended use appears plausibly user-benefiting

FinanceSensor's use appears adjacent to permitted user-benefiting monitoring/reporting behavior, but actual acceptance belongs to Google's production verification process.

Source:
- https://developers.google.com/workspace/workspace-api-user-data-developer-policy

### F-003-10 — Limited Use constrains monetization/AI

```text
NO Gmail-derived ad targeting
NO sale to data brokers
NO Gmail-derived creditworthiness/lending decisions
NO raw/derived Workspace API data for generalized/foundation model training or improvement
```

A future personalized/user-specific AI feature requires separate review against then-current Limited Use requirements.

Sources:
- https://developers.google.com/workspace/workspace-api-user-data-developer-policy
- https://support.google.com/cloud/answer/13805798
- https://support.google.com/cloud/answer/13463817

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

```text
SELF_HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
```

The self-hosted CI runner may syntax-check/package the helper using synthetic/static evidence only. Real Gmail/OAuth execution remains outside CI.

### F-003-14 — Immediate Gmail Search visibility is not an acceptable bootstrap dependency

v6 observed a synthetic anchor visibly present in Inbox while two bounded exact-subject Gmail Search queries returned zero results.

The evidence does **not** claim a universal Gmail indexing delay. It proves only that the Level-C bootstrap cannot require immediate Search-index visibility.

ADR-019 therefore separates:

```text
MESSAGE DELIVERED TO INBOX
        !=
MESSAGE IMMEDIATELY SEARCHABLE BY q
```

v7/v8 use a bounded recent-INBOX ID window and Subject-only metadata in local memory to identify the synthetic anchor without Search `q`.

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

### F-003-16 — Production policy/server boundary is now frozen, but Google review remains open

The 2026-09-02 policy refresh converted a generic policy uncertainty into an explicit fail-closed architecture and verification package.

Server-side production laws:

```text
GMAIL OAUTH AUTHORITY ON SERVER              FORBIDDEN
SERVER-SIDE Gmail API CALLS                  FORBIDDEN
RAW Gmail SERVER PROCESSING                  FORBIDDEN
SERVER-DECRYPTABLE Gmail-DERIVED DATA        FORBIDDEN
GENERALIZED Gmail-DERIVED MODEL TRAINING     FORBIDDEN
```

This does not constitute provider approval or a security-assessment exemption.

Evidence:
- `../11-decisions/ADR-020-GMAIL-RESTRICTED-DATA-SERVER-BOUNDARY.md`
- `../07-plan/GMAIL-PRODUCTION-VERIFICATION-PACKAGE.md`
- `../10-evidence/EV-Q003-PRODUCTION-POLICY-REFRESH-2026-09-02.md`

### F-003-17 — Level C v8 harness closes the instrumentation gap, not the physical gate

v8 preserves the v7 bounded Gmail path and adds:

```text
real refresh_token grant BEFORE revoke
        ↓
new bearer replaces old bearer in local memory
        ↓
Gmail /profile using refreshed bearer
        ↓
sanitized endpoint-class byte/timing evidence
        ↓
provider revoke
        ↓
post-revoke refresh must be denied
```

Persisted network evidence is aggregate-only by endpoint class:

```text
tokenExchange
tokenRefresh
revoke
profile
list
metadata
full
history
```

For each class the result may contain counts, request-body bytes, response-body bytes, elapsed timing aggregates and HTTP status aggregates. It must not contain concrete URL query values or raw HTTP payload content.

The harness also fails closed: any post-authorization failure/interrupt attempts best-effort provider revocation before clearing local OAuth authority and cannot claim PASS.

Current proof boundary:

```text
V8 HARNESS READY                 YES
V8 STATIC GUARD WIRED            YES
V8 REAL Gmail EXECUTION          NO
V8 SUCCESSFUL REAL REFRESH       NO
V8 NETWORK NUMBERS OBSERVED      NO
V8 PHYSICAL PASS                 NO
```

Evidence:
`../10-evidence/EV-Q003-LEVEL-C-V8-HARNESS-READY-2026-09-02.md`

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

### v7 — PHYSICAL PASS at controlled Desktop DEV level

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

### v8 — HARNESS READY / PHYSICAL EXECUTION OPEN

v8 is intentionally a delta proof over v7:

```text
v7 bounded core
  +
successful pre-revoke refresh
  +
refreshed bearer accepted by Gmail
  +
request-body / response-body byte accounting
  +
per-endpoint-class latency aggregates
  +
provider revoke
  +
post-revoke refresh denial
```

The v8 successful-refresh proof does not require waiting for the original access token's wall-clock expiry. It proves the real refresh authority is accepted, a new bearer is returned and Gmail accepts that refreshed bearer before revocation.

## Remaining Q-003 gates

The former external Level-C execution blocker is closed at v7. The three v7 instrumentation gaps now have a prepared v8 harness but remain physically open until a controlled v8 run completes.

```text
SUCCESSFUL PHYSICAL REFRESH BEFORE REVOKE      HARNESS READY / PHYSICAL OPEN
REQUEST/RESPONSE PAYLOAD BYTE ACCOUNTING        HARNESS READY / PHYSICAL OPEN
PER-ENDPOINT LATENCY EVIDENCE                  HARNESS READY / PHYSICAL OPEN
ANDROID/IOS PROTECTED CREDENTIAL HANDLING      OPEN OR DELEGATE TO PROVEN SECURITY GATE
PUBLIC RESTRICTED-SCOPE VERIFICATION            OPEN / PROVIDER EXECUTION REQUIRED
SECURITY-ASSESSMENT ARCHITECTURE BOUNDARY       FROZEN
SECURITY-ASSESSMENT PROVIDER DETERMINATION      OPEN
PRODUCTION VERIFICATION PACKAGE                 DRAFTED
PUBLICATION + PRODUCTION DEMO                    OPEN
DELETION/DISCONNECT PRODUCTION EVIDENCE          OPEN / Q-004 + Q-005 RECONCILIATION
```

The v7 execution's total wall-clock duration is known, but end-to-end duration is not per-endpoint timing evidence. Its observed `tokenRefresh=1` is the post-revoke denial check, not a successful real refresh before revoke.

## Verification package still required before public launch

The package structure is now explicit under `../07-plan/GMAIL-PRODUCTION-VERIFICATION-PACKAGE.md` and still requires physical/provider completion of:

- public product home page on verified domain;
- privacy policy on verified domain;
- clear Gmail-data disclosure;
- OAuth consent matching real functionality;
- frozen minimum-scope justification;
- production demo/video of exact OAuth flow and feature;
- terms/support contact;
- Limited Use disclosure;
- account/data deletion behavior;
- credential revocation behavior;
- actual production security architecture/data-flow diagram;
- Google restricted-scope review;
- Google/provider determination of security-assessment applicability;
- CASA/approved assessment if the provider determines it is required.

## Current decision

```text
GMAIL_TECHNICAL_PRIMITIVES                 PASS
MINIMUM_SCOPE_CANDIDATE                    gmail.readonly
METADATA_FIRST_PIPELINE                    PROVEN_AT_SPIKE + REAL SELECTED FULL
INCREMENTAL_SYNC_MODEL                     PHYSICALLY PASS AT LEVEL C v7
REAL_PROVIDER_REACHABILITY                 PASS
REAL_TRANSACTIONAL_DATA_RECEPTION          PASS
FINANCESENSOR_GMAIL_ADAPTER                PHYSICALLY EXERCISED
PKCE / STATE                               PHYSICALLY PASS
EXACT-SCOPE GUARD                          PASS
DESKTOP DEV TOKEN EXCHANGE                 PHYSICALLY PASS
MESSAGE-DERIVED SYNC ANCHOR                PHYSICALLY PASS
BOUNDED INBOX BOOTSTRAP                    PHYSICALLY PASS
LOCAL EXTRACTION                           PHYSICALLY PASS
REPLAY                                     PHYSICALLY PASS
PROVIDER REVOCATION                        PHYSICALLY PASS
OLD AUTHORITY AFTER REVOKE                 DENIED
LEVEL_C_v7                                 PHYSICAL PASS
LEVEL_C_v8                                 HARNESS READY / PHYSICAL OPEN
PUSH_REQUIRED_FOR_MK0                      NO
PRODUCTION_OAUTH_VERIFICATION              REQUIRED / OPEN
PERMITTED_USE_FIT                          PLAUSIBLE / NOT YET VERIFIED
SECURITY_ASSESSMENT_ARCHITECTURE_BOUNDARY  FROZEN
SECURITY_ASSESSMENT_PROVIDER_DETERMINATION OPEN
BYTES / PER-ENDPOINT TIMING                HARNESS READY / PHYSICAL OPEN
SUCCESSFUL PHYSICAL REFRESH                HARNESS READY / PHYSICAL OPEN
PRODUCTION_VERIFICATION_PACKAGE            DRAFTED / NOT APPROVED

GMAIL_FEASIBILITY                          ACTIVE / NOT CLOSED
```

## Closure criteria

Q-003 closes only when:

- exact endpoint/scope mapping remains frozen;
- policy path is refreshed before production verification — **refreshed 2026-09-02**;
- server Gmail/restricted-data architecture boundary remains consistent with ADR-020;
- Google/provider security-assessment applicability is documented for the actual production architecture;
- appropriate-use fit has no unresolved policy contradiction;
- consent/disclosure requirements are captured and published against the actual product;
- controlled FinanceSensor OAuth + bounded list/metadata/full/history path executes — **PASS at Level C v7**;
- v8 physically proves successful pre-revoke refresh + refreshed-bearer Gmail use + sanitized byte/timing evidence + revoke + post-revoke denial;
- platform-protected production credential handling is physically observed or explicitly delegated to a separately proven security gate;
- disconnect/deletion behavior is physically observed/reconciled with Q-004/Q-005;
- Google restricted-scope verification is completed as applicable;
- CASA/approved security assessment is completed if Google determines it is required;
- evidence artifacts are stored under `mk0/10-evidence/`;
- closure receipt is issued;
- explicit `GMAIL_FEASIBILITY PASS/FAIL` is recorded.

```text
READY FOR AUTHORIZATION != LEVEL C PASS != Q-003 CLOSED
HARNESS_READY != PHYSICAL_PASS
PACKAGE_DRAFTED != GOOGLE_APPROVED
PROVIDER DETERMINATION > SELF-DECLARED EXEMPTION
```