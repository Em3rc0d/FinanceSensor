# Q-003 — Gmail OAuth / API / Policy Feasibility

**Priority:** P0  
**Status:** ACTIVE  
**Last policy review:** 2026-09-01

## Question

Can a public FinanceSensor app obtain and retain the Gmail access required for its intended user-benefit flow while complying with Google OAuth, restricted-scope, Limited Use, security-assessment, deletion and production-verification requirements?

## Current answer

**Technically plausible, but not yet CLOSED for production.**

The Gmail API provides every primitive needed for the MK0 ingestion model: bounded message listing, staged metadata/full retrieval, incremental `historyId` synchronization and optional push notification. However, the access required for useful financial extraction is a **restricted Gmail scope**, which makes verification and privacy architecture part of the product feasibility—not paperwork to postpone until release.

## Authoritative findings

### F-003-01 — IMAP does not escape restricted-scope policy

Google currently classifies all of the following as restricted Gmail scopes:

```text
https://mail.google.com/
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.metadata
https://www.googleapis.com/auth/gmail.modify
...
```

Google explicitly states that `https://mail.google.com/` includes IMAP, SMTP and POP3 usage.

**Implication:** generic IMAP can remain an adapter for non-Gmail providers, but using IMAP for Gmail is not a policy bypass and must not be selected for that reason.

Sources:

- https://support.google.com/cloud/answer/13464325
- https://developers.google.com/identity/protocols/oauth2/scopes

### F-003-02 — `gmail.metadata` is not enough for FinanceSensor MK0

`gmail.metadata` can retrieve IDs, labels and headers, but cannot retrieve full or raw message bodies. More importantly, Gmail's `messages.list` documentation states that the `q` search parameter cannot be used when the API is accessed with `gmail.metadata`.

FinanceSensor eventually needs to inspect financial message bodies and/or receipt content for amounts, merchants, card hints, order references and semantic evidence. Therefore `gmail.metadata` alone cannot establish the MK0 sensing objective.

Sources:

- https://developers.google.com/workspace/gmail/api/reference/rest/v1/Format
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
- https://developers.google.com/workspace/gmail/api/guides/list-messages

### F-003-03 — Candidate minimum MK0 scope is `gmail.readonly`

Candidate scope:

```text
https://www.googleapis.com/auth/gmail.readonly
```

Rationale:

- FinanceSensor MK0 reads but does not modify, compose, delete or send Gmail messages.
- `gmail.modify` and `https://mail.google.com/` provide unnecessary write/destructive capability.
- `gmail.metadata` does not expose enough content for financial extraction.

This remains a **candidate decision** until the physical OAuth/ingestion spike verifies the endpoint set and verification submission narrative.

### F-003-04 — Retrieval can still be metadata-first even with `gmail.readonly`

The permission scope and the amount of data retrieved per request are separate concerns.

Candidate staged pipeline:

```text
messages.list
      ↓ IDs only
messages.get(format=METADATA, selected headers)
      ↓
local cheap relevance filter
      ↓ only financial candidates
messages.get(format=FULL)
      ↓
local extraction
      ↓
discard unnecessary raw content
```

`messages.get` supports `format=METADATA` and `metadataHeaders[]`, while `format=FULL` exposes parsed body data. Therefore FinanceSensor can request a read-only restricted permission while still minimizing bytes/content actually retrieved.

Source:

- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get

### F-003-05 — Gmail supports incremental synchronization

Google documents two sync modes:

```text
initial / recovery → full sync
normal operation   → history.list partial sync
```

A recent `historyId` can be stored and used with `users.history.list` to fetch subsequent mailbox changes. Google notes that an invalid or expired history ID typically yields HTTP 404 and the client must perform a full sync again.

**Implication:** FinanceSensor does not need to repeatedly rescan the entire mailbox.

Sources:

- https://developers.google.com/workspace/gmail/api/guides/sync
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list

### F-003-06 — Gmail push introduces cloud-visible mailbox metadata

Gmail push notifications require a Google Cloud Pub/Sub topic. The developer project must own/match the topic, and the decoded notification contains at least:

```json
{
  "emailAddress": "user@example.com",
  "historyId": "..."
}
```

A watch must be renewed at least every seven days; Google recommends daily renewal.

This matters because a strict “our cloud knows nothing about the mailbox” claim would be false if FinanceSensor uses the standard server-delivered Gmail push path.

**Candidate MK0 decision:** do not make Pub/Sub push a prerequisite for MK0. Prove device-driven bounded/partial sync first. Re-evaluate push later as a latency/battery optimization with explicit metadata privacy accounting.

Source:

- https://developers.google.com/workspace/gmail/api/guides/push

### F-003-07 — Public consumer production requires restricted-scope verification

Google requires additional OAuth verification for public apps requesting restricted scopes unless an exception applies. Development/testing/staging apps are exempt from mandatory verification, and personal-use apps under the stated limit can continue with unverified warnings, but this is not a commercial production strategy.

Google also applies an unverified-app warning/user cap to unverified apps using risky scopes; current documentation describes a 100-user limit in relevant cases.

Sources:

- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://support.google.com/googleapi/answer/7454865
- https://support.google.com/cloud/answer/13464323

### F-003-08 — Third-party server access can trigger annual security assessment

Google's current restricted-scope verification documentation states that an app requesting restricted data and having the ability to access that data **from or through a third-party server** must undergo a security assessment using Google's approved assessment process. Separate help documentation describes annual assessment/recertification requirements for affected apps.

**Architecture implication:** keeping Gmail bodies and financial extraction on the authorized device is not merely a privacy preference; it may materially reduce the server-side restricted-data attack surface and compliance burden.

**Important non-claim:** FinanceSensor does **not** yet claim that on-device-only handling guarantees exemption from a security assessment. The production design must be presented to Google and assessed against the rules in force when verification is submitted.

Sources:

- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://support.google.com/cloud/answer/13465431
- https://support.google.com/cloud/answer/13463816

### F-003-09 — FinanceSensor appears plausibly within an approved Gmail use family

Google's Workspace developer policy currently lists as an approved Gmail category applications that use email information to provide **reporting or monitoring services for the benefit of users**, with examples such as itinerary automation and package/flight monitoring.

FinanceSensor's intended use—extracting user-visible financial evidence from the user's own email to provide personal financial monitoring—appears conceptually adjacent to this approved family.

**Important non-claim:** adjacency is not approval. Only Google's verification process can establish acceptance of the exact FinanceSensor product use case.

Source:

- https://developers.google.com/workspace/workspace-api-user-data-developer-policy

### F-003-10 — Limited Use constrains future monetization and AI choices

The current Workspace user-data policy requires Google-derived data to be used only for the appropriate user-facing feature and places strong limits on transfer and secondary use. It explicitly prohibits transferring, selling or using that data to determine creditworthiness or for lending, and restricts using Workspace user data to create/train/improve generalized AI/ML models beyond user-specific models for the appropriate feature.

This is strategically important for FinanceSensor.

**Implications:**

```text
NO ad targeting from Gmail-derived finance data
NO sale to data brokers
NO Gmail-derived credit scoring/lending decision engine
NO pooled Gmail corpus for generalized model training
```

A future recommendation marketplace or financial-product monetization model must never silently repurpose Gmail-derived data.

Source:

- https://developers.google.com/workspace/workspace-api-user-data-developer-policy

## Candidate endpoint/scope matrix

| MK0 need | Endpoint / mode | Candidate scope | Decision |
|---|---|---|---|
| Enumerate bounded candidates | `messages.list` | `gmail.readonly` | REQUIRED candidate |
| Retrieve selected headers | `messages.get?format=METADATA` | `gmail.readonly` | REQUIRED candidate |
| Retrieve body for selected candidate | `messages.get?format=FULL` | `gmail.readonly` | REQUIRED candidate |
| Incremental mailbox changes | `history.list` | `gmail.readonly` | REQUIRED candidate |
| Push trigger | `users.watch` + Pub/Sub | restricted Gmail access + cloud infra | DEFER from MK0 critical path |
| Modify labels/messages | `messages.modify` | `gmail.modify` | NOT REQUIRED |
| Send mail | send endpoints | send/compose scope | NOT REQUIRED |
| Delete mail | delete endpoints | broad scope | FORBIDDEN by MK0 product scope |

## Candidate ingestion architecture

```text
Gmail API
   │ direct TLS from authorized device
   ↓
messages.list / history.list
   ↓
METADATA retrieval
   ↓
local relevance filter
   ↓
FULL only for likely financial messages
   ↓
local parser / classifier
   ↓
minimal FinancialEvidence
   ↓
canonical resolver
   ↓
encrypted local ledger
```

The control plane receives connection health/routing metadata only as explicitly approved by the privacy model. Raw Gmail body/attachments are not part of normal cloud synchronization.

## Verification package FinanceSensor must eventually possess

Before a public Gmail launch, prepare at minimum:

```text
public product home page
privacy policy on verified domain
clear Gmail-data disclosure
OAuth consent screen matching real functionality
minimum-scope justification
demo/video of exact OAuth flow and user-facing feature
terms/support contact
Google Limited Use disclosure
account deletion / data deletion behavior
credential revocation behavior
security architecture description
restricted-data data-flow diagram
```

Exact submission requirements can change and must be refreshed immediately before production verification.

## Physical spike required

Policy research is not sufficient to close this quarry.

```text
Google Cloud DEV project
        ↓
Android OAuth client
        ↓
gmail.readonly
        ↓
connect controlled test account
        ↓
list bounded 30/90 day history
        ↓
METADATA-first selection
        ↓
FULL candidate retrieval on device
        ↓
historyId incremental sync
        ↓
revoke authorization
        ↓
verify token/local-data cleanup
        ↓
measure requests, bytes, timings, retained content
```

No production credentials or user data should be committed to this repository.

## Current decision

```text
GMAIL_TECHNICAL_PRIMITIVES       PASS
MINIMUM_SCOPE_CANDIDATE          gmail.readonly
METADATA_FIRST_PIPELINE          FEASIBLE
INCREMENTAL_SYNC                 FEASIBLE
PUSH_REQUIRED_FOR_MK0            NO
PRODUCTION_OAUTH_VERIFICATION    REQUIRED
PERMITTED_USE_FIT                PLAUSIBLE / NOT YET VERIFIED
SECURITY_ASSESSMENT_APPLICABILITY OPEN
PHYSICAL_ANDROID_OAUTH_SPIKE      NOT YET EXECUTED

GMAIL_FEASIBILITY                ACTIVE / NOT CLOSED
```

## Closure criteria

Q-003 closes only when all are true:

- feature → exact Gmail endpoint/scope mapping is frozen;
- production verification path is refreshed from authoritative sources;
- security-assessment applicability is documented for the actual architecture;
- appropriate-use fit has no unresolved policy contradiction;
- user consent/disclosure requirements are captured;
- revocation/deletion flow is specified and physically tested;
- metadata/full/history behavior is measured on a controlled Gmail account;
- architecture is updated to avoid unnecessary access;
- evidence artifact is stored under `mk0/10-evidence/`;
- a closure receipt is issued;
- explicit `GMAIL_FEASIBILITY PASS/FAIL` decision is recorded.
