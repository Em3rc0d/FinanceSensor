# Q-004 — Email Privacy and Data Minimization

**Priority:** P0  
**Status:** OPEN

## Question

How can FinanceSensor extract financial value from email without becoming a cloud inbox-copying system or repeating historical privacy failures in adjacent products?

## Anti-pattern

The FTC action involving Unroll.Me/Slice demonstrates the trust and regulatory risk created when an email utility uses receipt content in ways users do not reasonably expect.

References:

- https://search.ftc.gov/news-events/news/press-releases/2019/08/operator-email-management-service-settles-ftc-allegations-it-deceived-consumers-about-how-it
- https://www.ftc.gov/system/files/documents/cases/172_3139_unrollme_complaint_8-8-19.pdf

## Target privacy boundary

```text
Mail provider
     ↓ direct TLS
Authorized device
     ↓
metadata filter
     ↓
local parser / classifier
     ↓
minimal FinancialEvidence
     ↓
canonical events / local ledger
     ↓ E2EE
opaque synchronization service
```

## Data classes

### Raw sensitive source content

- email body;
- attachments;
- full headers not required for provenance;
- unrelated personal messages.

Default objective: process transiently on-device and avoid cloud upload.

### Minimal derived evidence

Potential fields:

- source artifact opaque ID/hash;
- sender/domain;
- occurred/observed time;
- amount/currency;
- merchant/counterparty candidate;
- event candidate type;
- parser/version;
- confidence;
- cryptographic evidence lineage.

Even derived financial evidence remains sensitive and should be encrypted at rest/in sync.

## Privacy Inspector hypothesis

A user-facing surface could report:

```text
Emails scanned                 43
Financial candidates            7
Canonical movements             5
Raw email bodies retained       0
Plaintext financial data sent   0 B
```

The exact metrics require implementation verification; they must never become misleading marketing counters.

## Questions to close

1. Which source fields must persist for provenance?
2. Can raw artifacts be discarded immediately after successful extraction?
3. When is retaining an attachment necessary for user review?
4. How does the user delete derived state and source credentials?
5. What diagnostic telemetry can be collected without financial content?
6. How is crash reporting scrubbed?
7. What is the policy for backups and screenshots?
8. What should the cloud know about a connection without knowing its financial contents?

## Candidate decision

Adopt **data minimization by pipeline stage** and explicitly classify every persisted field by sensitivity, retention and sync policy.

## Closure criteria

- data inventory complete;
- retention matrix complete;
- threat model covers raw email, derived evidence, ledger and logs;
- telemetry/crash-report redaction policy defined;
- deletion/revocation semantics defined;
- Privacy Inspector claims mapped to measurable facts;
- `PRIVACY_MODEL PASS` evidence produced.
