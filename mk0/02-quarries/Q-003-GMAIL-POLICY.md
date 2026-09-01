# Q-003 — Gmail OAuth / API / Policy Feasibility

**Priority:** P0  
**Status:** ACTIVE  
**Last policy review:** 2026-09-01

## Question

Can a public FinanceSensor app obtain and retain the Gmail access required for its intended user-benefit flow while complying with Google OAuth, restricted-scope, Limited Use, security-assessment, deletion and production-verification requirements?

## Current answer

**Technically plausible; provider contract proven; real Gmail execution still required before closure.**

FinanceSensor now has two intentionally separated evidence levels:

```text
LEVEL A — CONTRACTUAL HARNESS      PASS
LEVEL B — CONTROLLED REAL GMAIL    NOT EXECUTED
```

Level A proves the internal ingestion/privacy contract. It does not prove Google consent, real endpoint behavior or production approval.

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
`mk0/10-evidence/EV-Q003-Q004-INGRESS-HARNESS-2026-09-01.md`

Observed:

```text
21 / 21 PASS
bounded 30/90-day listing          PASS
metadata-first                     PASS
FULL only for candidates           PASS
incremental history model          PASS
history 404 recovery               PASS
restart/replay                     PASS
idempotent reprocessing            PASS
canonical resolver reuse           PASS
raw body durable retention         0
raw attachment retention           0
plaintext financial cloud          0 in harness
token in logs                      0 in harness
```

The ingress engine was converted to one async provider contract so synthetic and real Gmail adapters traverse the same code path.

## Level B — real Gmail path prepared

Implemented but **not executed**:

```text
spikes/physical-ingress/src/gmail-rest-provider.js
spikes/physical-ingress/live/run-gmail.mjs
.github/workflows/gmail-live-spike.yml
```

Prepared capabilities:

```text
real Gmail REST Bearer auth
bounded messages.list
METADATA / FULL messages.get
history.list
profile historyId
aggregate privacy-safe result output
optional remote token revoke
```

The manual workflow is isolated behind environment `gmail-controlled-spike` and expects an ephemeral secret named `FINANCESENSOR_GMAIL_ACCESS_TOKEN`. No real credential belongs in the repository or chat transcript.

## Remaining external gate

Q-003 cannot close until a **controlled Google Cloud DEV project + controlled Gmail test account** grants the candidate `gmail.readonly` access and the live path is executed.

That evidence must establish at least:

```text
REAL_OAUTH_CONSENT             PASS / FAIL
REAL_MESSAGES_LIST             PASS / FAIL
REAL_METADATA_GET              PASS / FAIL
REAL_SELECTED_FULL_GET         PASS / FAIL
REAL_HISTORY_CURSOR            PASS / FAIL
REAL_INCREMENTAL_SYNC          PASS / FAIL
REAL_REMOTE_REVOCATION         PASS / FAIL
NO_SECRET_LOGGING              PASS / FAIL
BOUNDED_REQUESTS               measured
BYTES / TIMING                 measured
```

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
GMAIL_TECHNICAL_PRIMITIVES       PASS
MINIMUM_SCOPE_CANDIDATE          gmail.readonly
METADATA_FIRST_PIPELINE          PROVEN_AT_SPIKE
INCREMENTAL_SYNC_MODEL           PROVEN_AT_SPIKE
REAL_GMAIL_ADAPTER               READY / NOT EXECUTED
PUSH_REQUIRED_FOR_MK0            NO
PRODUCTION_OAUTH_VERIFICATION    REQUIRED
PERMITTED_USE_FIT                PLAUSIBLE / NOT YET VERIFIED
SECURITY_ASSESSMENT_APPLICABILITY OPEN
REAL_GMAIL_LIVE_SPIKE            BLOCKED ON CONTROLLED AUTHORIZATION

GMAIL_FEASIBILITY                ACTIVE / NOT CLOSED
```

## Closure criteria

Q-003 closes only when:

- exact endpoint/scope mapping is frozen;
- policy path is refreshed before production verification;
- security-assessment applicability is documented for actual architecture;
- appropriate-use fit has no unresolved policy contradiction;
- consent/disclosure requirements are captured;
- controlled real OAuth + list/metadata/full/history path executes;
- remote revoke behavior is observed;
- request/byte/timing evidence is recorded;
- Android protected credential handling is reconciled or explicitly scoped to Q-004/Q-005;
- evidence artifact is stored under `mk0/10-evidence/`;
- closure receipt is issued;
- explicit `GMAIL_FEASIBILITY PASS/FAIL` is recorded.
