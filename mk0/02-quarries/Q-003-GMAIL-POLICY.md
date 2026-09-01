# Q-003 — Gmail OAuth / API / Policy Feasibility

**Priority:** P0  
**Status:** ACTIVE  
**Last policy review:** 2026-09-01

## Question

Can a public FinanceSensor app obtain and retain the Gmail access required for its intended user-benefit flow while complying with Google OAuth, restricted-scope, Limited Use, security-assessment, deletion and production-verification requirements?

## Current answer

**Technically plausible; provider contract and real-provider reachability are proven, while FinanceSensor-owned OAuth transport is still awaiting controlled authorization.**

FinanceSensor separates three evidence levels:

```text
LEVEL A — CONTRACTUAL HARNESS                 PASS
LEVEL B — REAL PROVIDER REACHABILITY          PASS
LEVEL C — FINANCESENSOR-OWNED OAUTH TRANSPORT NOT EXECUTED
```

Level A proves the internal ingestion/privacy contract. Level B proves that an already-authorized Gmail connection can return real transactional message structure to the engineering environment. Neither substitutes for Level C, which must exercise FinanceSensor's own OAuth client, scope grant and REST adapter.

## Authoritative findings

### F-003-01 — IMAP does not escape restricted-scope policy

Google currently classifies `https://mail.google.com/`, `gmail.readonly`, `gmail.metadata`, `gmail.modify` and related Gmail permissions as restricted scopes. `mail.google.com` includes IMAP/SMTP/POP3 use.

**Implication:** IMAP remains useful as a generic non-Gmail adapter, not as a Gmail policy bypass.

Sources:
- https://support.google.com/cloud/answer/13464325
- https://developers.google.com/identity/protocols/oauth2/scopes

### F-003-02 — `gmail.metadata` is insufficient for MK0

FinanceSensor must sometimes inspect selected financial message bodies to derive amount, merchant, semantic meaning and references. `gmail.metadata` cannot retrieve full/raw body data and also restricts query behavior.

Sources:
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/Format
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
- https://developers.google.com/workspace/gmail/api/guides/list-messages

### F-003-03 — Minimum-scope candidate remains `gmail.readonly`

```text
https://www.googleapis.com/auth/gmail.readonly
```

FinanceSensor MK0 reads but does not modify, send or delete Gmail messages.

### F-003-04 — Metadata-first retrieval is compatible with `gmail.readonly`

```text
messages.list
      ↓ IDs
messages.get(METADATA)
      ↓ local relevance filter
messages.get(FULL) only for candidates
      ↓ local extraction
raw content discarded
```

### F-003-05 — Incremental synchronization is supported

Google documents initial/full sync followed by `history.list` incremental sync. Expired/invalid history IDs can require a bounded recovery full sync.

Sources:
- https://developers.google.com/workspace/gmail/api/guides/sync
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list

### F-003-06 — Pub/Sub push is not required for MK0

Standard Gmail push introduces Google Cloud Pub/Sub and mailbox identity/history metadata at the cloud boundary. FinanceSensor therefore keeps push outside the MK0 critical path and favors device-driven eventual freshness first.

Source:
- https://developers.google.com/workspace/gmail/api/guides/push

### F-003-07 — Public production requires restricted-scope verification

Development/testing can use controlled exceptions, but a commercial public app cannot treat the unverified-app path/user cap as a launch strategy.

Sources:
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://support.google.com/googleapi/answer/7454865
- https://support.google.com/cloud/answer/13464323

### F-003-08 — Security-assessment applicability remains architecture-dependent

Third-party-server access to restricted data can trigger Google-approved security assessment requirements. Keeping Gmail content on the authorized device narrows the server attack surface, but FinanceSensor does **not** claim this guarantees an exemption.

Sources:
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://support.google.com/cloud/answer/13465431
- https://support.google.com/cloud/answer/13463816

### F-003-09 — Intended use appears plausibly within user-benefit monitoring/reporting

FinanceSensor's use appears adjacent to Google's approved Gmail user-benefiting monitoring/reporting family, but actual acceptance must come from Google's verification process.

Source:
- https://developers.google.com/workspace/workspace-api-user-data-developer-policy

### F-003-10 — Limited Use constrains future monetization/AI

```text
NO Gmail-derived ad targeting
NO sale to data brokers
NO Gmail-derived creditworthiness/lending decisions
NO pooled Gmail corpus for generalized model training
```

Source:
- https://developers.google.com/workspace/workspace-api-user-data-developer-policy

### F-003-11 — Real provider shape is compatible with the staged contract

A controlled 2026-09-01 probe through an already-authorized Gmail engineering connector returned real transactional message identifiers, metadata, body text and MIME descriptors. No real content or credential was copied into the repository.

The observed shape exposed defects in amount localization, merchant provenance and operation-reference extraction. Those defects were converted into a sanitized contract fixture and repaired before this finding was promoted.

Evidence:
`mk0/10-evidence/EV-Q003-REAL-GMAIL-REACHABILITY-2026-09-01.md`

This proves provider reachability and source-shape compatibility, **not** FinanceSensor-owned OAuth transport.

### F-003-12 — OAuth/token/MIME adapter boundary is executable

ADR-017 freezes the current candidate mobile boundary:

```text
system browser / supported platform Google authorization
        ↓
device-local credential broker
        ↓ short-lived access token
GmailRestProvider
        ↓
metadata-first ingestion
```

The normal cloud control plane is not the ordinary custodian of Gmail refresh authority.

The adapter now proves at spike level:

```text
dynamic access-token provider        PASS
401 → REAUTH_REQUIRED                 PASS
no blind infinite 401 retry          PASS
bearer token not reflected in error  PASS
MIME attachment descriptors          PASS
automatic attachment-byte download   0
```

Evidence:
- `../11-decisions/ADR-017-GMAIL-MOBILE-OAUTH-BOUNDARY.md`
- `../10-evidence/EV-Q003-GMAIL-OAUTH-ADAPTER-CONTRACT-2026-09-01.md`

This remains a transport contract, not proof of a FinanceSensor-owned Google consent grant.

## Endpoint/scope matrix

| MK0 need | Endpoint / mode | Candidate scope | Decision |
|---|---|---|---|
| Enumerate bounded candidates | `messages.list` | `gmail.readonly` | REQUIRED candidate |
| Retrieve selected headers | `messages.get?format=METADATA` | `gmail.readonly` | REQUIRED candidate |
| Retrieve selected body | `messages.get?format=FULL` | `gmail.readonly` | REQUIRED candidate |
| Incremental changes | `history.list` | `gmail.readonly` | REQUIRED candidate |
| Current history cursor | `users.getProfile` | `gmail.readonly` | REQUIRED candidate |
| Push trigger | `users.watch` + Pub/Sub | restricted access + cloud | DEFER |
| Modify messages | modify endpoints | `gmail.modify` | NOT REQUIRED |
| Send mail | send endpoints | send/compose | NOT REQUIRED |
| Delete mail | delete endpoints | broad scope | FORBIDDEN BY MK0 |

## Level A — contractual ingress proof

Implemented under `spikes/physical-ingress/`.

Evidence:
- `mk0/10-evidence/EV-Q003-Q004-INGRESS-HARNESS-2026-09-01.md`
- `mk0/10-evidence/EV-Q003-GMAIL-OAUTH-ADAPTER-CONTRACT-2026-09-01.md`

Current executable suite:

```text
31 / 31 PASS
bounded 30/90-day listing              PASS
metadata-first                         PASS
FULL only for candidates               PASS
incremental history model              PASS
history 404 recovery                   PASS
restart/replay                         PASS
idempotent reprocessing                PASS
canonical resolver reuse               PASS
localized thousands/decimals           PASS
provider operation provenance          PASS
sender != invented merchant            PASS
external-transfer preservation         PASS
dynamic short-lived token contract     PASS
401 explicit reauthorization           PASS
secret-safe API error boundary         PASS
MIME descriptor-only discovery         PASS
raw body durable retention             0
raw attachment retention               0
plaintext financial cloud              0 in harness
token in tested logs/state             0
```

The ingress engine uses one async provider contract so synthetic and real Gmail adapters traverse the same downstream code path.

## Level B — real provider reachability

Executed 2026-09-01 through an already-authorized Gmail engineering connector.

Observed:

```text
REAL_PROVIDER_CONNECTION       PASS
REAL_MESSAGE_IDS               RECEIVED
REAL_TRANSACTIONAL_METADATA    RECEIVED
REAL_TRANSACTIONAL_BODY        RECEIVED
REAL_MIME_DESCRIPTORS          RECEIVED IN SAMPLE
REAL_RAW_CONTENT IN REPO       0
REAL_FINANCIAL LITERALS IN CI  0
```

Evidence:
`mk0/10-evidence/EV-Q003-REAL-GMAIL-REACHABILITY-2026-09-01.md`

The connector's bearer credential was not and cannot be repurposed as FinanceSensor's product credential. This boundary is intentional.

## Level C — FinanceSensor-owned real Gmail path prepared

Implemented but **not yet authorized/executed**:

```text
spikes/physical-ingress/src/gmail-rest-provider.js
spikes/physical-ingress/live/run-gmail.mjs
.github/workflows/gmail-live-spike.yml
```

Prepared capabilities:

```text
real Gmail REST Bearer auth
short-lived credential-provider adapter contract
bounded messages.list
METADATA / FULL messages.get
history.list
profile historyId
MIME descriptors without automatic attachment fetch
aggregate privacy-safe result output
optional remote token revoke
```

The controlled workflow is isolated behind environment `gmail-controlled-spike` and expects an ephemeral credential boundary. No real credential belongs in the repository, CI logs or chat transcript.

## Remaining external gate

Q-003 cannot close until a **controlled Google Cloud DEV project + controlled Gmail test account** grants the candidate `gmail.readonly` access to FinanceSensor's own OAuth client and the Level-C path executes.

That evidence must establish at least:

```text
REAL_OAUTH_CONSENT             PASS / FAIL
REAL_MESSAGES_LIST             PASS / FAIL
REAL_METADATA_GET              PASS / FAIL
REAL_SELECTED_FULL_GET         PASS / FAIL
REAL_HISTORY_CURSOR            PASS / FAIL
REAL_INCREMENTAL_SYNC          PASS / FAIL
REAL_REAUTH_LIFECYCLE          PASS / FAIL
REAL_REMOTE_REVOCATION         PASS / FAIL
NO_SECRET_LOGGING              PASS / FAIL
BOUNDED_REQUESTS               measured
BYTES / TIMING                 measured
```

No Google Cloud administration connector is available in the current engineering environment, so creation/ownership of that external OAuth DEV project cannot be automated from this repository session. This is an external authorization boundary, not an implementation gap in the Gmail adapter.

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
GMAIL_TECHNICAL_PRIMITIVES         PASS
MINIMUM_SCOPE_CANDIDATE            gmail.readonly
METADATA_FIRST_PIPELINE            PROVEN_AT_SPIKE
INCREMENTAL_SYNC_MODEL             PROVEN_AT_SPIKE
REAL_PROVIDER_REACHABILITY         PASS
REAL_TRANSACTIONAL_DATA_RECEPTION  PASS
PHYSICAL INGRESS SUITE             31 / 31 PASS
SANITIZED_REAL_SHAPE               PASS
DYNAMIC TOKEN ADAPTER              PROVEN_AT_SPIKE
MIME DESCRIPTOR BOUNDARY           PROVEN_AT_SPIKE
FINANCESENSOR_GMAIL_ADAPTER        READY
FINANCESENSOR_OAUTH_TRANSPORT      READY / NOT AUTHORIZED
MOBILE OAUTH BOUNDARY              ADR-017 PROPOSED / CONTRACT TESTED
PUSH_REQUIRED_FOR_MK0              NO
PRODUCTION_OAUTH_VERIFICATION      REQUIRED
PERMITTED_USE_FIT                  PLAUSIBLE / NOT YET VERIFIED
SECURITY_ASSESSMENT_APPLICABILITY  OPEN
LEVEL_C_LIVE_SPIKE                 BLOCKED ON CONTROLLED AUTHORIZATION

GMAIL_FEASIBILITY                  ACTIVE / NOT CLOSED
```

## Closure criteria

Q-003 closes only when:

- exact endpoint/scope mapping is frozen;
- policy path is refreshed before production verification;
- security-assessment applicability is documented for actual architecture;
- appropriate-use fit has no unresolved policy contradiction;
- consent/disclosure requirements are captured;
- controlled FinanceSensor OAuth + list/metadata/full/history path executes;
- reauthorization and remote revoke behavior are observed;
- request/byte/timing evidence is recorded;
- Android protected credential handling is reconciled or explicitly scoped to Q-004/Q-005;
- evidence artifact is stored under `mk0/10-evidence/`;
- closure receipt is issued;
- explicit `GMAIL_FEASIBILITY PASS/FAIL` is recorded.
