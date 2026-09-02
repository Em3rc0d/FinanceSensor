# Q-004 — Email Privacy and Data Minimization

**Priority:** P0  
**Status:** ACTIVE  
**Last policy review:** 2026-09-02

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

The privacy architecture is now materially less ambiguous than the original Q-004 draft:

- Gmail OAuth/data-plane authority stays on the trusted edge (ADR-017/020);
- raw Gmail content is transient by default;
- cloud plaintext financial/Gmail content is forbidden;
- provider disconnect, Gmail-derived erase, tenant deletion and backup semantics are separated and frozen by ADR-023;
- Q-005 production crypto/witness/recovery decisions are now narrowed by ADR-021/022/024.

Q-004 remains `ACTIVE` because real mobile storage, real network traffic, cloud deletion, backup restoration and production telemetry behavior still require physical evidence.

## Anti-pattern

FinanceSensor intentionally rejects the inbox-copying / secondary-dataset pattern historically associated with Unroll.Me / Slice allegations and settlement.

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
  ├─ protected OAuth authority
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
Tenant Root Key
Recovery Private Key
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

Semantic meaning must be derived before raw content is discarded. Restart cannot depend on re-reading a deleted subject/body.

### FinancialEvidence

Derived financial evidence persists encrypted because provenance, reconciliation and restart require it.

### Canonical state

Canonical events/relationships/corrections/insights remain encrypted local user state and may synchronize only through the Q-005 E2EE model.

## Executable Level-A evidence

Harness: `spikes/physical-ingress/`

Evidence: `mk0/10-evidence/EV-Q003-Q004-INGRESS-HARNESS-2026-09-01.md`

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

The local vault remains a **spike encryption model**, not Android/iOS production keystore evidence.

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
- canonical financial payload;
- Tenant Root Key / Recovery Private Key.

S-003 includes an allowlist sink that rejects content-bearing fields. Production-path crash/telemetry evidence remains required.

## Human access

Routine developer/support access to Gmail-derived content or plaintext financial state is forbidden. Debugging should prefer synthetic fixtures and redacted operational diagnostics.

## Deletion semantics — ADR-023

The previous ambiguity around provider disconnect is resolved.

### Disconnect Gmail

Default:

```text
credential/provider authority    DELETE / REVOKE
history cursor                   DELETE
execution identity               RESET
future Gmail retrieval           STOP
existing derived financial state RETAIN
```

Derived state is user-owned financial history; disconnecting a provider does not silently delete it.

### Disconnect Gmail + erase Gmail-derived history

This is a separate explicit destructive operation. It must erase Gmail-derived state using provenance-aware deletion semantics without corrupting unrelated/mixed-provenance canonical state.

### Delete FinanceSensor tenant

Contract:

```text
provider authorities                REVOKE
local protected credentials         DELETE
local encrypted stores              DESTROY
Tenant Root Key authority           DESTROY / INVALIDATE
Recovery authority                  INVALIDATE
cloud ciphertext envelopes          DELETE
cloud tenant/control metadata       DELETE except bounded deletion receipt/tombstone
witness log namespaces              DELETE / RETIRE
account-linked diagnostics          DELETE
future sync/recovery authorization  DENY
```

Backup restoration must not resurrect tenant authority.

The infrastructure selection inherits this architecture ceiling:

```text
BACKUP_MAX_PHYSICAL_RETENTION <= 35 days
```

Physical backup expiry and restore behavior are not yet proven.

## Privacy Inspector measurable claims

Candidate counters with executable foundations:

```text
Emails checked
FULL messages fetched
Financial candidates
Canonical movements
Raw bodies retained
Raw attachments retained
Plaintext financial cloud bytes
Request counts
Deletion phase/status
```

A production UI may claim a zero only when the real runtime/network/storage evidence supports the same scope of claim.

## Machine-readable inventory

The deny-by-default inventory is now split by concern:

- `mk0/04-architecture/PRIVACY-DATA-MATRIX.json` — **19 base data classes**;
- `mk0/04-architecture/PRIVACY-RECOVERY-MATRIX.json` — **5 recovery/checkpoint classes**;
- `mk0/04-architecture/PRIVACY-DELETION-MATRIX.json` — **1 deletion resurrection-barrier class**;
- combined validator scope: **25 classes** at this snapshot.

The ADR-023 deletion tombstone is now classified rather than becoming an untracked persistence exception. `tools/validate-privacy-matrix.mjs` requires it to remain minimized, bounded, non-E2EE-dependent and explicitly tied to the backup/restoration safety window.

All three matrices remain `DRAFT` because classification completeness and physical behavior are separate properties. `deny-unclassified-persistence` remains the default law.

## Physical closure campaign

Authoritative execution plan:

`mk0/07-plan/Q003-Q004-Q005-PHYSICAL-CLOSURE-CAMPAIGN.md`

Q-004 physical evidence still requires:

```text
Android/iOS protected OAuth credential custody
real network inspection
real filesystem/database/cache/temp inspection
production telemetry/crash redaction
cloud envelope/control-metadata deletion
witness namespace deletion/retirement
backup retention evidence
restore-from-pre-deletion-backup resurrection test
metadata leakage budget
Privacy Inspector measured-claim mapping
```

## Current decision

```text
RAW_EMAIL_CLOUD_STORAGE          FORBIDDEN
RAW_EMAIL_LOCAL_RETENTION        TRANSIENT BY DEFAULT
DERIVED_SEMANTIC_TYPE            ENCRYPTED DURABLE EVIDENCE
GMAIL_TOKEN_CLOUD_PLAINTEXT      FORBIDDEN
DERIVED_EVIDENCE_LOCAL           ENCRYPTED
CANONICAL_LEDGER_LOCAL           ENCRYPTED
CANONICAL_SYNC                   E2EE ONLY
ROUTINE_HUMAN_ACCESS             FORBIDDEN
CONTENT_ANALYTICS                FORBIDDEN
GENERALIZED_AI_TRAINING          FORBIDDEN FOR GMAIL-DERIVED DATA
DISCONNECT_DEFAULT               RETAIN DERIVED USER HISTORY
EXPLICIT GMAIL-DERIVED ERASE     REQUIRED UX PATH
TENANT_DELETE                    CRYPTO-SHRED + CLOUD/WITNESS DELETE
DELETION_TOMBSTONE               MINIMIZED + BOUNDED RESURRECTION BARRIER
BACKUP_RETENTION_CEILING         35 DAYS
MACHINE_READABLE_DATA_CLASSES    25 VALIDATED BY CONTRACT
LEVEL_A_PRIVACY_HARNESS          PASS
LEVEL_B/PRODUCTION LIFECYCLE     PHYSICAL EVIDENCE OPEN

PRIVACY_MODEL                    ACTIVE / NOT CLOSED
```

## Closure criteria

Q-004 closes only when:

- machine-readable data inventory is complete and validated;
- Q-005 key/sync model is reconciled with this boundary;
- threat model covers raw mail, tokens, evidence, ledger, metadata, logs and backups;
- telemetry/crash redaction has executable production-path tests;
- real Gmail consent/revoke lifecycle is observed;
- Android/iOS protected credential storage is physically tested;
- real network/storage inspection supports the stated privacy boundary;
- ADR-023 cloud deletion/backup semantics are physically tested;
- Privacy Inspector claims map to measured evidence;
- closure receipt lists residual metadata/backup risks;
- `PRIVACY_MODEL PASS/FAIL` is recorded.

```text
DOCUMENTED PRIVACY CONTRACT != PHYSICALLY VERIFIED PRIVACY CONTRACT
```
