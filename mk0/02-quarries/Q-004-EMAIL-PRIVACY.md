# Q-004 — Email Privacy and Data Minimization

**Priority:** P0  
**Status:** ACTIVE  
**Last policy review:** 2026-09-01

## Question

How can FinanceSensor extract financial value from email without becoming a cloud inbox-copying system, creating a secondary commercial dataset, or retaining source content beyond its justified processing stage?

## Current answer

FinanceSensor uses **stage-by-stage minimization**:

```text
provider
   ↓ selected retrieval
transient raw content on authorized device
   ↓ derive meaning
minimal encrypted FinancialEvidence
   ↓ resolve
canonical financial state
   ↓ optional E2EE synchronization
```

Level A synthetic evidence now proves the internal contract. Q-004 remains ACTIVE because the same boundary must still be observed against real Gmail, mobile credential storage, real transport and eventual cloud deletion/backup behavior.

## Anti-pattern

FinanceSensor intentionally rejects the inbox-copying / secondary-dataset pattern associated historically with Unroll.Me / Slice allegations and settlement.

```text
NO hidden secondary commercial dataset
NO raw inbox mirror in FinanceSensor cloud
NO resale of purchase intelligence
NO advertising profile from Gmail-derived data
NO generalized training corpus from Gmail-derived data
```

Sources:
- https://www.ftc.gov/news-events/news/press-releases/2019/08/operator-email-management-service-settles-ftc-allegations-it-deceived-consumers-about-how-it
- https://www.ftc.gov/system/files/documents/cases/172_3139_unrollme_complaint_8-8-19.pdf
- https://www.ftc.gov/news-events/news/press-releases/2019/12/ftc-finalizes-settlement-company-misled-consumers-about-how-it-accesses-uses-their-email

## Google-derived policy invariants

```text
PRIV-GGL-001 user-facing feature only
PRIV-GGL-002 no sale to advertisers/data brokers
PRIV-GGL-003 no personalized advertising
PRIV-GGL-004 no creditworthiness/lending use
PRIV-GGL-005 no pooled generalized model training
PRIV-GGL-006 no routine human access
PRIV-GGL-007 secure credential/derived-data handling
PRIV-GGL-008 deterministic deletion/revocation semantics
```

Source:
- https://developers.google.com/workspace/workspace-api-user-data-developer-policy

## Privacy boundary

```text
Gmail
  │ direct authenticated transport
  ▼
AUTHORIZED DEVICE
  ├─ opaque provider IDs / cursor
  ├─ selected metadata
  ├─ transient raw body when justified
  ├─ local extraction
  ├─ derived semantic type
  ├─ minimal FinancialEvidence
  └─ encrypted local financial state
           │
           │ E2EE domain state only
           ▼
CLOUD CONTROL PLANE
  ├─ minimized routing/control metadata
  └─ opaque ciphertext envelopes
```

Normal cloud path forbids:

```text
email body
attachment bytes
subject text
merchant plaintext
amount plaintext
category plaintext
financial insight plaintext
OAuth credential plaintext
```

## Stage contract

### OAuth credential
- protected device credential facility in production;
- never ordinary app-table plaintext;
- never normal ledger sync payload;
- removed/revoked on disconnect according to tested semantics.

### Mailbox enumeration
Persist only what is required for idempotency/incremental operation:
- opaque source identity/derived key;
- history cursor;
- processing/extraction version;
- minimal timing/provenance.

### Metadata filter
Selected headers may be inspected transiently. Subject text is not durable merely because it was retrieved.

### Raw extraction

```text
selected candidate
   ↓
body/attachment in bounded processing scope
   ↓
derive FinancialEvidence + semanticType
   ↓
discard raw content
```

### FinancialEvidence
Derived financial evidence persists encrypted because provenance/reconciliation/restart require it. The implementation discovery from S-003 is now explicit: **semantic meaning must be derived before raw content is discarded**. Restart cannot depend on re-reading a deleted subject/body.

### Canonical state
Canonical events/relationships/corrections/insights remain encrypted local user state and may later synchronize only through the Q-005 E2EE model.

## Level A executable evidence

Harness:
`spikes/physical-ingress/`

Evidence:
`mk0/10-evidence/EV-Q003-Q004-INGRESS-HARNESS-2026-09-01.md`

Observed:

```text
21 / 21 PASS
raw body in durable evidence          NO
raw attachment in durable evidence    NO
raw tested literals in at-rest blob   NO
plaintext financial telemetry         NO
token literal in tested logs/state    NO
history/restart without raw mail       PASS
source disconnect credential delete   PASS
optional Gmail-derived reset          PASS
local tenant deletion                 PASS
request accounting                    PASS
```

The local vault is a **spike encryption model**, not Android/iOS production keystore evidence.

## Telemetry contract

Allowed candidate classes:
- app/build/parser versions;
- capability class;
- duration/resource classes;
- success/failure codes;
- aggregate counts.

Forbidden in ordinary telemetry:
- source body/subject/attachment;
- OAuth token;
- merchant/counterparty plaintext;
- amount/currency tied to event;
- account/card/provider IDs;
- canonical financial payload.

S-003 includes an allowlist sink that rejects content-bearing fields.

## Human access

Routine developer/support access to Gmail-derived content or plaintext financial state remains forbidden. Debugging should prefer synthetic fixtures and redacted operational diagnostics.

## Deletion semantics currently demonstrated at Level A

### Disconnect source

Harness proves:

```text
credential removed locally
history cursor cleared
execution identity reset
```

Derived state has an explicit policy choice in the model:
- retain user-owned derived financial history; or
- explicitly erase Gmail-derived local state.

This distinction must later become a clear UX decision, not an implicit side effect.

### Delete tenant

Harness proves local model behavior:

```text
credential deleted
local encrypted vault destroyed
```

It does **not** yet prove production cloud envelope/control metadata/backup deletion.

## Privacy Inspector measurable claims

Candidate counters now have an executable foundation:

```text
Emails checked
FULL messages fetched
Financial candidates
Canonical movements
Raw bodies retained
Raw attachments retained
Plaintext financial cloud bytes
Request counts
```

A production UI may only claim a zero when the real runtime/network evidence supports the same scope of claim.

## Machine-readable data matrix

`mk0/04-architecture/PRIVACY-DATA-MATRIX.json`

Current matrix tracks 18 classes and remains DRAFT until real transport, mobile storage, E2EE and deletion semantics are reconciled.

## Level B privacy evidence prepared but not executed

Real adapter / runner:

```text
spikes/physical-ingress/src/gmail-rest-provider.js
spikes/physical-ingress/live/run-gmail.mjs
.github/workflows/gmail-live-spike.yml
```

The live runner intentionally prints **aggregate operational evidence only** and can revoke its controlled OAuth token after execution.

Still required:

```text
controlled real Gmail OAuth
real endpoint lifecycle
real remote revoke
Android protected token storage
real network inspection
real filesystem/storage inspection
cloud metadata/envelope deletion semantics
backup retention/deletion semantics
metadata leakage budget
```

## Current decision

```text
RAW_EMAIL_CLOUD_STORAGE       FORBIDDEN
RAW_EMAIL_LOCAL_RETENTION     TRANSIENT BY DEFAULT
DERIVED_SEMANTIC_TYPE         ENCRYPTED DURABLE EVIDENCE
GMAIL_TOKEN_CLOUD_PLAINTEXT   FORBIDDEN
DERIVED_EVIDENCE_LOCAL        ENCRYPTED
CANONICAL_LEDGER_LOCAL        ENCRYPTED
CANONICAL_SYNC                E2EE CANDIDATE
ROUTINE_HUMAN_ACCESS          FORBIDDEN
CONTENT_ANALYTICS             FORBIDDEN
GENERALIZED_AI_TRAINING       FORBIDDEN FOR GMAIL-DERIVED DATA
LEVEL_A_PRIVACY_HARNESS       PASS
LEVEL_B_REAL_LIFECYCLE        NOT EXECUTED

PRIVACY_MODEL                 ACTIVE / NOT CLOSED
```

## Closure criteria

Q-004 closes only when:
- machine-readable data inventory is complete and validated;
- Q-005 key/sync model reconciles with this boundary;
- threat model covers raw mail, tokens, evidence, ledger, metadata, logs and backups;
- telemetry/crash redaction has executable production-path tests;
- real Gmail consent/revoke lifecycle is observed;
- Android protected credential storage is physically tested;
- real network/storage inspection supports the stated privacy boundary;
- cloud deletion/backup semantics are specified and tested;
- Privacy Inspector claims map to measured evidence;
- closure receipt lists residual metadata/backup risks;
- `PRIVACY_MODEL PASS/FAIL` is recorded.
