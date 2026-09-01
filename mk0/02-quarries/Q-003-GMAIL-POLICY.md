# Q-003 — Gmail OAuth / API / Policy Feasibility

**Priority:** P0  
**Status:** ACTIVE  
**Last policy review:** 2026-09-01

## Question

Can a public FinanceSensor app obtain and retain the Gmail access required for its intended user-benefit flow while complying with Google OAuth, restricted-scope, Limited Use, security-assessment, deletion and production-verification requirements?

## Current answer

**Technically plausible. The ingress contract, real-provider reachability, real transactional reception and FinanceSensor-owned OAuth client contract are now demonstrated. The remaining product-specific gate is physical authorization/execution with a controlled FinanceSensor Google OAuth identity.**

```text
LEVEL A — CONTRACTUAL INGRESS + OAUTH BOUNDARY       PASS AT SPIKE LEVEL
LEVEL B — REAL PROVIDER REACHABILITY / DATA SHAPE    PASS
LEVEL C — FINANCESENSOR-OWNED OAUTH IDENTITY         READY / NOT EXECUTED
```

Level A proves the internal privacy/ingress/OAuth authority contract. Level B proves Gmail can return real transactional structure to the engineering environment. Neither substitutes for Level C, which must exercise FinanceSensor's own Google OAuth identity, exact scope grant, supported client callback and REST adapter.

## Authoritative findings

### F-003-01 — IMAP does not escape restricted-scope policy

Google currently classifies `https://mail.google.com/`, `gmail.readonly`, `gmail.metadata`, `gmail.modify` and related Gmail permissions as restricted scopes. `mail.google.com` includes IMAP/SMTP/POP3 use.

**Implication:** IMAP remains useful as a generic non-Gmail adapter, not as a Gmail policy bypass.

Sources:
- https://support.google.com/cloud/answer/13464325
- https://developers.google.com/identity/protocols/oauth2/scopes

### F-003-02 — `gmail.metadata` is insufficient for MK0

FinanceSensor must sometimes inspect selected financial message bodies to derive amount, merchant, semantic meaning and references. `gmail.metadata` cannot provide the selected full body path required for that extraction.

Sources:
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/Format
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
- https://developers.google.com/workspace/gmail/api/guides/list-messages

### F-003-03 — Minimum-scope candidate remains exactly `gmail.readonly`

```text
https://www.googleapis.com/auth/gmail.readonly
```

FinanceSensor MK0 reads but does not modify, send or delete Gmail messages. `OAUTH-003` now makes broader Gmail scope sets fail the contract suite.

### F-003-04 — Metadata-first retrieval is compatible with the candidate scope

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

Google documents initial/full synchronization followed by `history.list` incremental synchronization. Expired/invalid history IDs can require a bounded recovery full sync.

Sources:
- https://developers.google.com/workspace/gmail/api/guides/sync
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list

### F-003-06 — Pub/Sub push is not required for MK0

Standard Gmail push introduces Google Cloud Pub/Sub and mailbox identity/history metadata at the cloud boundary. FinanceSensor keeps push outside the MK0 critical path and favors device-driven eventual freshness first.

Source:
- https://developers.google.com/workspace/gmail/api/guides/push

### F-003-07 — Public production requires restricted-scope verification

Development/testing does not replace the public production verification path for restricted Gmail access.

Sources:
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://support.google.com/googleapi/answer/7454865
- https://support.google.com/cloud/answer/13464323

### F-003-08 — Security-assessment applicability remains architecture-dependent

Third-party-server handling of restricted data can trigger additional Google security requirements. Keeping Gmail content on the authorized device narrows the server attack surface, but FinanceSensor does **not** claim that this guarantees an exemption.

Sources:
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://support.google.com/cloud/answer/13465431
- https://support.google.com/cloud/answer/13463816

### F-003-09 — Intended use appears plausibly user-benefiting

FinanceSensor's use appears adjacent to permitted user-benefiting monitoring/reporting behavior, but actual acceptance belongs to Google's verification process.

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

A controlled 2026-09-01 probe through an already-authorized Gmail engineering connector returned real transactional message identifiers, metadata, body text and MIME structure. No real content or credential was copied into the repository.

The real shape exposed parser defects in localized amounts, merchant provenance and operation-reference extraction. Those defects became sanitized synthetic tests before repair.

Evidence:
`../10-evidence/EV-Q003-REAL-GMAIL-REACHABILITY-2026-09-01.md`

This proves provider reachability and source-shape compatibility, **not** FinanceSensor-owned OAuth authorization.

### F-003-12 — FinanceSensor-owned OAuth authority contract is executable

ADR-017 now freezes:

```text
supported browser/platform authorization
        ↓
state + PKCE S256 binding
        ↓
device-local long-lived credential authority
        ↓
short-lived access-token broker
        ↓
GmailRestProvider
```

Contract properties:

```text
exact gmail.readonly scope                  PASS
broader Gmail scopes rejected               PASS
state mismatch fail-closed                  PASS
PKCE S256                                   PASS
client secret absent from public exchange   PASS
short-token cache                           PASS
concurrent refresh coalescing               PASS
401 cache invalidation                      PASS
401 hidden same-call retry                  0
refresh authority crossing to Gmail         0
CI long-lived OAuth authority custody       FORBIDDEN / TESTED
```

Evidence:
- `../11-decisions/ADR-017-GMAIL-MOBILE-OAUTH-BOUNDARY.md`
- `../10-evidence/EV-Q003-OAUTH-CLIENT-CONTRACT-2026-09-01.md`
- `../../spikes/physical-ingress/OWNED-OAUTH-EXECUTION.md`

### F-003-13 — GitHub Actions is not Level C

`.github/workflows/gmail-live-spike.yml` is now explicitly a **Gmail Bearer Reachability Spike**. It may accept one ephemeral access token for a controlled provider probe, but it is not the selected location for long-lived OAuth authority.

`OAUTH-013` guards this boundary.

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

## Level A — contractual ingress + OAuth proof

Implemented under `spikes/physical-ingress/`.

Evidence:
- `../10-evidence/EV-Q003-Q004-INGRESS-HARNESS-2026-09-01.md`
- `../10-evidence/EV-Q003-OAUTH-CLIENT-CONTRACT-2026-09-01.md`

Observed reconciled suite at evidence head `5035906dbe6cd652c6b9e5f5b530d7e45fc3187c`:

```text
44 / 44 PASS

bounded listing / metadata-first / selected FULL        PASS
incremental history / cursor recovery / replay          PASS
idempotent reprocessing / restart                       PASS
localized amount + real-shape parser guards             PASS
MIME descriptor-only discovery                          PASS
PKCE / state / exact-scope OAuth contract                PASS
local refresh authority / short-token cache              PASS
concurrent refresh coalescing                            PASS
401 invalidation / no hidden retry                       PASS
CI long-lived-authority guard                            PASS
raw body durable retention                               0
raw attachment durable retention                         0
plaintext financial cloud                                0 in harness
real auth secret in repository evidence                  0
```

The ingress engine uses one async provider contract so synthetic and real Gmail adapters traverse the same downstream path.

## Level B — real provider reachability

Executed 2026-09-01 through an already-authorized Gmail engineering connector.

```text
REAL_PROVIDER_CONNECTION       PASS
REAL_MESSAGE_IDS               RECEIVED
REAL_TRANSACTIONAL_METADATA    RECEIVED
REAL_TRANSACTIONAL_BODY        RECEIVED
REAL_MIME_STRUCTURE            RECEIVED
REAL_RAW_CONTENT IN REPO       0
REAL_FINANCIAL LITERALS IN CI  0
```

The engineering connector's authority is not FinanceSensor's product authority and is not repurposed as such.

## Level C — FinanceSensor-owned real Gmail path

**Prepared, not yet authorized/executed.**

Runtime components:

```text
spikes/physical-ingress/src/oauth-native-contract.js
spikes/physical-ingress/src/gmail-rest-provider.js
spikes/physical-ingress/OWNED-OAUTH-EXECUTION.md
```

Required physical chain:

```text
FINANCESENSOR-OWNED GOOGLE CLOUD DEV OAUTH IDENTITY
        ↓
CONTROLLED TEST USER
        ↓ exact gmail.readonly consent
SUPPORTED CLIENT CALLBACK + STATE + PKCE
        ↓
PROTECTED EDGE LONG-LIVED CREDENTIAL AUTHORITY
        ↓ short bearer only
GmailRestProvider
        ↓
list → METADATA → selected FULL → profile/history → incremental
        ↓
401 / reauthorization lifecycle
        ↓
revoke/disconnect
        ↓
old authority denied
```

The exact required observations and fail conditions are frozen in `OWNED-OAUTH-EXECUTION.md`.

## Remaining external gate

Q-003 cannot close until the controlled FinanceSensor DEV OAuth identity exists and interactive Level-C execution succeeds.

Required observations include:

```text
REAL_OAUTH_CONSENT                 PASS / FAIL
EXACT_SCOPE                        gmail.readonly / FAIL
PKCE / STATE PLATFORM PATH         PASS / FAIL
REAL_MESSAGES_LIST                 PASS / FAIL
REAL_METADATA_GET                  PASS / FAIL
REAL_SELECTED_FULL_GET             PASS / FAIL
REAL_HISTORY_CURSOR                PASS / FAIL
REAL_INCREMENTAL_SYNC              PASS / FAIL
REPLAY_IDEMPOTENT                  PASS / FAIL
REAL_REAUTH_LIFECYCLE              PASS / FAIL
REAL_REVOCATION                    PASS / FAIL
OLD_AUTHORITY_AFTER_REVOCATION     DENIED / FAIL
NO_SECRET_LOGGING                  PASS / FAIL
BOUNDED_REQUESTS                   measured
BYTES / TIMING                     measured
```

No Google Cloud administration connector/plugin is available in the current engineering environment. Therefore the external DEV project/client ownership and interactive user consent cannot be fabricated or automated from this repository session. This is now the principal Q-003 physical boundary rather than missing adapter/OAuth design.

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
METADATA_FIRST_PIPELINE              PROVEN_AT_SPIKE
INCREMENTAL_SYNC_MODEL               PROVEN_AT_SPIKE
REAL_PROVIDER_REACHABILITY           PASS
REAL_TRANSACTIONAL_DATA_RECEPTION    PASS
PHYSICAL INGRESS SUITE               44 / 44 PASS @ evidence head
FINANCESENSOR_GMAIL_ADAPTER          READY
PKCE / STATE CONTRACT                PASS AT SPIKE
EXACT-SCOPE GUARD                    PASS AT SPIKE
LOCAL CREDENTIAL BROKER              PASS AT SPIKE
SHORT-TOKEN CACHE                    PASS AT SPIKE
CONCURRENT REFRESH COALESCING        PASS AT SPIKE
401 / NO-HIDDEN-RETRY                PASS AT SPIKE
CI AS LEVEL-C AUTHORITY              REJECTED / GUARDED
FINANCESENSOR OAUTH TRANSPORT        READY / NOT AUTHORIZED
PUSH_REQUIRED_FOR_MK0                NO
PRODUCTION_OAUTH_VERIFICATION        REQUIRED
PERMITTED_USE_FIT                    PLAUSIBLE / NOT YET VERIFIED
SECURITY_ASSESSMENT_APPLICABILITY    OPEN
LEVEL_C                              BLOCKED ON CONTROLLED EXTERNAL AUTHORIZATION

GMAIL_FEASIBILITY                    ACTIVE / NOT CLOSED
```

## Closure criteria

Q-003 closes only when:

- exact endpoint/scope mapping remains frozen;
- policy path is refreshed before production verification;
- security-assessment applicability is documented for actual architecture;
- appropriate-use fit has no unresolved policy contradiction;
- consent/disclosure requirements are captured;
- controlled FinanceSensor OAuth + list/metadata/full/history path executes;
- platform-protected credential handling is physically observed or explicitly delegated to a separately proven security gate;
- reauthorization and revoke/disconnect behavior are observed;
- request/byte/timing evidence is recorded;
- evidence artifact is stored under `mk0/10-evidence/`;
- closure receipt is issued;
- explicit `GMAIL_FEASIBILITY PASS/FAIL` is recorded.

`READY FOR AUTHORIZATION ≠ LEVEL C PASS ≠ Q-003 CLOSED`.
