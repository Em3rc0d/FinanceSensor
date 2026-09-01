# Q-004 — Email Privacy and Data Minimization

**Priority:** P0  
**Status:** ACTIVE  
**Last policy review:** 2026-09-01

## Question

How can FinanceSensor extract financial value from email without becoming a cloud inbox-copying system, creating an unnecessary secondary dataset, or repeating historical privacy failures in adjacent products?

## Current answer

FinanceSensor should adopt **stage-by-stage data minimization** as an architectural invariant:

```text
provider data
   ↓ retrieve only what stage needs
transient raw content on authorized device
   ↓ extract
minimal structured financial evidence
   ↓ resolve
canonical financial state
   ↓ E2EE only when synchronization is required
```

The system must be able to identify where every sensitive class lives, why it exists, how long it survives, whether it leaves the device and how the user deletes it.

## Historical anti-pattern: Unroll.Me / Slice

The FTC alleged that Unroll.Me represented its inbox access in a way that did not accurately disclose the collection/use of e-receipts. The FTC complaint states that Slice's crawler copied entire e-receipt bodies and stored them, then extracted purchase data for market-research products. The settlement required deletion of certain collected e-receipts absent affirmative consent and barred misrepresentation of collection/use practices.

FinanceSensor adopts the opposite product contract:

```text
NO hidden secondary commercial dataset
NO raw inbox mirror in our cloud
NO resale of purchase intelligence
NO advertising profile from Gmail-derived data
NO generalized model-training corpus from Gmail-derived data
```

Sources:

- https://www.ftc.gov/news-events/news/press-releases/2019/08/operator-email-management-service-settles-ftc-allegations-it-deceived-consumers-about-how-it
- https://www.ftc.gov/system/files/documents/cases/172_3139_unrollme_complaint_8-8-19.pdf
- https://www.ftc.gov/news-events/news/press-releases/2019/12/ftc-finalizes-settlement-company-misled-consumers-about-how-it-accesses-uses-their-email

## Google policy constraints that become product invariants

Google's current Workspace user-data policy requires transparency, minimum necessary access, secure handling, deletion compliance and Limited Use. It sharply restricts data transfer, human access, advertising use, creditworthiness/lending use and generalized AI/ML training from Workspace-derived user data.

Source:

- https://developers.google.com/workspace/workspace-api-user-data-developer-policy

Therefore the following are architectural requirements, not optional copy:

```text
PRIV-GGL-001 Gmail-derived data serves a prominent user-facing feature only.
PRIV-GGL-002 Gmail-derived data is never sold to advertisers/data brokers.
PRIV-GGL-003 Gmail-derived data is never used for personalized advertising.
PRIV-GGL-004 Gmail-derived data is never used to determine creditworthiness/lending.
PRIV-GGL-005 Gmail-derived data is not pooled into generalized model training.
PRIV-GGL-006 Human access is denied by default and follows explicit exceptional rules.
PRIV-GGL-007 Tokens and sensitive derived data are encrypted at rest and in transit.
PRIV-GGL-008 User deletion/revocation must have deterministic semantics.
```

## Target privacy boundary

```text
Gmail
  │ TLS
  ▼
AUTHORIZED DEVICE
  │
  ├─ message IDs / selected metadata
  ├─ transient raw body only when needed
  ├─ local parser / classifier
  ├─ minimal FinancialEvidence
  ├─ canonical resolver
  └─ encrypted local ledger
           │
           │ E2EE canonical/domain state only
           ▼
CLOUD CONTROL PLANE
  ├─ tenant/device/connection routing metadata
  ├─ health + schema/version metadata
  ├─ processing leases
  └─ opaque ciphertext envelopes

NO normal cloud path for:
  email body
  attachment bytes
  subject text
  merchant plaintext
  amount plaintext
  category plaintext
  financial insight plaintext
```

The exact cloud metadata is still subject to Q-005 and threat-model review because ciphertext sizes/timing and connection metadata can still leak information.

## Stage minimization contract

### Stage 0 — OAuth credential

Purpose: authorize direct device → Gmail API requests.

Candidate rule:

- access/refresh token stored in OS protected credential/key facility on the authorized device;
- never an ordinary application-table plaintext field;
- not synchronized through the normal ledger sync channel;
- revoked/removed on disconnect according to tested semantics.

### Stage 1 — Mailbox enumeration

Persist only what is necessary for incremental processing and idempotency.

Candidate retained fields:

```text
provider message opaque ID / derived key
history cursor
processed/extraction version
minimal source timing
```

Do **not** persist full mailbox listings as a secondary searchable inbox database.

### Stage 2 — Metadata relevance filter

Use selected headers/metadata only as needed to decide whether full retrieval is justified.

Default candidates for transient processing:

```text
From
Date
selected provider identifiers
selected subject signals if necessary
```

Subject text is sensitive and should not be persisted by default merely because it was retrieved.

### Stage 3 — Raw content extraction

Email bodies/attachments are the most sensitive source material.

MK0 candidate rule:

```text
retrieve selected financial candidate
        ↓
parse in device memory / bounded temporary storage
        ↓
extract minimal evidence + provenance
        ↓
discard raw body/attachment
```

Raw retention is **not** a default MK0 capability.

If future review UX genuinely requires source retention, it must reopen Q-004 and introduce a separate explicit encrypted-retention policy with user-visible disclosure.

### Stage 4 — FinancialEvidence

Derived evidence can persist because it is the minimum data required to explain and reconcile the financial event, but it remains highly sensitive.

Candidate fields include:

```text
source opaque identity/hash
provider/source family
occurred/observed time
amount/currency
merchant/counterparty candidate
account/instrument hint
event semantic candidate
selected transaction/order/reference IDs
parser/extractor version
confidence
lineage hashes / evidence relationships
```

### Stage 5 — Canonical financial state

Canonical events, categories, recurring patterns, corrections and insights are user-owned financial state.

Candidate rule:

- encrypted local persistence;
- synchronized only through tenant E2EE if multi-device is enabled;
- cloud receives opaque payload under the normal path.

## Privacy data matrix

The machine-readable candidate matrix lives at:

`mk0/04-architecture/PRIVACY-DATA-MATRIX.json`

Every data class must define:

```text
sensitivity
purpose
source
local retention
cloud plaintext policy
E2EE sync policy
deletion trigger
human access policy
logging policy
```

A field without a privacy classification cannot be introduced into MK0 persistence.

## Diagnostics / telemetry policy

Allowed candidate telemetry:

```text
app/build version
parser version
OS/device capability class
operation duration
success/failure/error class
aggregate counts
resource consumption
```

Forbidden in ordinary analytics/crash payloads:

```text
email body
subject
attachment contents
OAuth secret/token
merchant/counterparty plaintext
amount/currency pair tied to event
financial category
account/card identifiers
provider message ID
canonical event payload
```

Stack traces and exceptions must be scrubbed because source content can accidentally enter exception messages.

## Human-access policy

Support staff and developers should have **no routine access** to Gmail-derived user content or plaintext financial state.

Debugging must prefer:

```text
reproducible synthetic fixture
        ↓
redacted diagnostic code
        ↓
local user-visible evidence
```

Any exceptional human access path would require explicit user consent, scope limitation, auditability and policy review; it is not part of MK0.

## Deletion semantics candidate

### Disconnect Gmail

Must at minimum:

```text
stop new source access
remove/revoke local source credentials
remove source cursor/connection execution state
retain or delete derived financial state according to an explicit user choice/policy
```

Whether disconnect implies deletion of all previously derived financial state is still a product/privacy decision and must be explicit in UX.

### Delete FinanceSensor tenant/account

Target invariant:

```text
local plaintext/encrypted financial store deleted
local source credentials deleted/revoked
cloud opaque sync envelopes deleted
cloud tenant/device/connection metadata deleted according to legal/security retention policy
backup/recovery copies expire/delete through a documented process
```

No “delete account” flow is accepted until it has an executable end-to-end test.

## Privacy Inspector contract

Potential user-facing counters:

```text
Emails checked
Financial candidates
Canonical movements
Raw email bodies retained
Plaintext financial data uploaded
Connected sources
Last processing time
```

Each displayed claim must map to a measurable implementation counter or architecture fact. Marketing language cannot claim `0 B uploaded` unless network/evidence tests can support it for the stated mode.

## Platform key-storage direction

Android provides hardware-backed keystore/key-attestation capabilities on supported devices; iOS provides Keychain and Secure Enclave-backed key protection on supported hardware. FinanceSensor must degrade securely when hardware-backed capabilities differ instead of making flagship hardware mandatory.

References:

- https://developer.android.com/privacy-and-security/security-key-attestation
- https://developer.apple.com/documentation/Security/protecting-keys-with-the-secure-enclave

The exact key hierarchy remains Q-005/SEC-001 work.

## Open privacy questions

1. Exact deletion behavior on Gmail disconnect vs tenant deletion.
2. Whether any raw attachment can ever persist for Needs Review.
3. Backup/recovery semantics under E2EE.
4. Screenshot/recents-screen protection policy on mobile.
5. Cloud metadata leakage budget (timestamps, ciphertext sizes, connection provider).
6. Whether standard Gmail Pub/Sub push is compatible with the strongest privacy mode.
7. Exact OAuth token lifecycle and whether cross-device credential transfer is forbidden or optionally E2EE.

## Current decision

```text
RAW_EMAIL_CLOUD_STORAGE       FORBIDDEN BY DEFAULT
RAW_EMAIL_LOCAL_RETENTION     TRANSIENT BY DEFAULT
GMAIL_TOKEN_CLOUD_PLAINTEXT   FORBIDDEN
DERIVED_EVIDENCE_LOCAL        ENCRYPTED
CANONICAL_LEDGER_LOCAL        ENCRYPTED
CANONICAL_SYNC                E2EE CANDIDATE
ROUTINE_HUMAN_ACCESS          FORBIDDEN
CONTENT_ANALYTICS             FORBIDDEN
GENERALIZED_AI_TRAINING       FORBIDDEN FOR GMAIL-DERIVED DATA
PRIVACY_INSPECTOR             REQUIRED / CLAIMS MUST BE MEASURABLE

PRIVACY_MODEL                 ACTIVE / NOT CLOSED
```

## Closure criteria

- machine-readable data inventory complete;
- retention matrix passes automated structural validation;
- Q-005 key/sync design reconciles with this boundary;
- threat model covers raw email, tokens, derived evidence, ledger, metadata leakage, logs and backups;
- telemetry/crash redaction policy has executable tests;
- deletion/revocation semantics are frozen and end-to-end tested;
- Privacy Inspector claims map to measured evidence;
- Gmail OAuth spike proves raw-content lifecycle assumptions;
- closure receipt issued with residual risks and revalidation triggers;
- `PRIVACY_MODEL PASS` evidence produced.
