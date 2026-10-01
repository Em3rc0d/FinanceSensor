# ADR-036 — Alpha.2 financial memory and Gmail statement discovery

**Status:** ACCEPTED FOR BOUNDED DESIGN FREEZE / IMPLEMENTATION AND PHYSICAL PROOF OPEN  
**Date:** 2026-09-05

## Context

Alpha.1 proves a bounded, session-only Gmail transaction surface. FinanceSensor must next preserve derived financial history, discover eligible statement attachments in the same authorized Gmail account and reconcile notification evidence with posted bank-ledger evidence.

Existing decisions already establish the required foundations:

- exact `gmail.readonly` and device-held short bearer custody;
- metadata-first Gmail inspection;
- transient PDF/password handling;
- profile-specific statement adapters;
- SQLCipher 4.x with platform-protected DEK custody;
- evidence lineage, canonical resolution and per-source period coverage.

The remaining decision is how those capabilities compose into one bounded product milestone without turning Gmail into an indiscriminate PDF crawler or turning statements into a second copy of each transaction.

## Decision

Alpha.2 is the **REMEMBER + VERIFY** milestone. Its product contract is:

```text
Gmail notification evidence ─┐
                             ├─ reconciliation ─ canonical event log ─ SQLCipher
Gmail statement evidence ────┘
```

The primary statement path is targeted Gmail discovery. Manual share/open and local file selection remain explicit fallbacks for missing or unsupported delivery paths.

```text
PRIMARY    known-bank query → metadata → MIME descriptor → strong gate → attachment.get
FALLBACK   user share/open or explicit local file selection
FORBIDDEN  indiscriminate PDF download or generic-parser fallback
```

Alpha.2 is split into independently gated slices:

```text
A  Statement discovery
B  Fetch + transient parse
C  Encrypted financial vault
D  Reconciliation
E  Account graph
F  Monthly coverage
G  Sensor V1
```

No later slice can weaken an earlier privacy or financial-truth gate.

## Gmail discovery contract

Transaction notifications and statements are separate engines over the same authorized Gmail connection.

```text
GmailConnection
├─ Transaction Signal Engine
└─ Statement Discovery Engine
```

Each `StatementDiscoveryProfile` is versioned and contains allowlisted sender identities/domains, subject markers, PDF filename markers, product hints, bounded query templates and candidate scoring weights. It must not contain secrets or real user data.

Discovery proceeds in four stages:

1. execute profile-specific, bounded Gmail queries;
2. retrieve message metadata and MIME descriptors;
3. calculate a content-free `StatementCandidate` decision;
4. fetch attachment bytes only for a uniquely `STRONG` candidate.

Candidate states are `REJECTED`, `WEAK`, `PROBABLE`, `STRONG`, and `CONFLICT`. `PROBABLE` never downloads by default. Conflicting profile matches fail closed.

Download also requires:

- `mimeType == application/pdf` or a profile-approved equivalent verified as PDF bytes;
- size greater than zero and below the configured hard cap;
- known parent message and attachment identity;
- active user session and non-revoked Gmail authority;
- no duplicate artifact already terminal for the same immutable source key and profile version.

The scanner must not persist subject, filename or sender strings merely to explain its decision. Durable candidate receipts contain only normalized profile/version, decision code, reason codes, source lineage key and safe size/time buckets.

## Fetch and ephemeral PDF boundary

Attachment bytes move directly into a bounded in-memory statement session. Product runtime must not write the PDF, decrypted text, OCR page, layout geometry or raw row tokens to durable storage, caches, analytics, logs, crash reports or backups.

```text
attachment bytes
→ passive PDF runtime
→ document/page/region classifiers
→ profile adapter
→ derived evidence transaction
→ dispose + release/zero owned mutable buffers
```

Active PDF behavior is never executed. Unknown profile, page role, region or layout drift stops parsing. There is no generic row-parser fallback.

Password handling is session-scoped:

- user enters the password only after a candidate reports `PASSWORD_REQUIRED`;
- the same password may be reused for same-institution candidates only after an explicit session-only choice;
- persistence, logs, analytics, clipboard capture, autofill persistence and cloud transmission are forbidden;
- deterministic Dart-string zeroization is not claimed;
- native custody is required later only if the threat model demands deterministic password-memory erasure.

Cancellation, app backgrounding, session expiration, successful completion or terminal failure releases password references and disposes the statement runtime.

## Profile and parser registry

The registry lifecycle is:

```text
DISCOVERY → FIXTURE_READY → STATIC_READY → PHYSICAL_PROVEN → SUPPORTED
```

`PHYSICAL_PROVEN` is profile-version and platform specific. `SUPPORTED` requires the declared production platform matrix and regression corpus. A parser version is immutable after it produces durable evidence; semantic changes require a new version and explicit reprocessing.

The runtime selection tuple is:

```text
institution + product_type + statement_family + profile_version + adapter_version
```

An unrecognized signature yields `PROFILE_DRIFT`, never another bank/product parser.

## Financial vault

ADR-006 remains authoritative. Alpha.2 persists only derived and lineage-safe records in SQLCipher:

- source artifacts without raw content;
- statement periods and extraction-run metadata;
- financial evidence and canonical events;
- reconciliation links and immutable feature snapshots;
- account/instrument mappings;
- per-source coverage and monthly-close state;
- deterministic intelligence outputs and knowledge gaps.

The database does not open if SQLCipher or protected DEK unwrap is unavailable. Plain SQLite fallback is forbidden. DB, WAL, journal, temp, migration and backup behavior all require physical inspection.

## Reconciliation decision

Email and statement evidence remain independent observations. They become one canonical event only through a versioned resolver decision.

Candidate features include amount, currency, time distance, institution, account/instrument, merchant/counterparty similarity, reference, movement compatibility, source independence and ambiguity count.

Outcomes are:

```text
CONFIRMED  unique hard/strong match; automatic canonical link
PROPOSED   high-scoring unique candidate; not silently confirmed
REVIEW     material ambiguity requires user decision
REJECTED   incompatible evidence
CONFLICT   mutually inconsistent evidence or canonical state
```

The exact score formula and thresholds are versioned in `graph/alpha2-design-freeze.json`. Amount equality alone can never confirm a match. Automated confirmation requires independent source channels, compatible economic semantics and a unique margin over the next candidate.

## Account graph and coverage

Statements map to an `Account` or `PaymentInstrument` through `UNMAPPED`, `PROBABLE`, `USER_CONFIRMED` or `SYSTEM_CONFIRMED_BY_STABLE_EVIDENCE`. Bank plus currency is insufficient for automatic confirmation.

Coverage is multi-dimensional and per account/instrument-period:

- expected-source disposition;
- statement receipt and parse state;
- inflow/outflow coverage;
- reconciliation completion;
- unresolved/conflict counts.

FinanceSensor must not compress those dimensions into a single authoritative percentage. A visual progress indicator is allowed only when its denominator and included sources are explicit and the detail view exposes every gap.

Monthly close states remain `OPEN_LIVE`, `WAITING_FOR_STATEMENTS`, `IMPORTING`, `RECONCILING`, `REVIEW_REQUIRED`, `RECONCILED`, `REOPENED`. `RECONCILED` requires every included expected source to be covered and no blocking ambiguity or conflict. User-excluded sources remain visibly excluded and reduce scope.

## Sensor V1

Sensor V1 is deterministic. It may report observed accounts, reconciled periods, recurring candidates, frequent income and explicit knowledge gaps. It does not provide automated financial advice or use an LLM to invent classifications.

Every claim carries a truth state such as `OBSERVED`, `POSTED`, `RECONCILED`, `PARTIAL` or `UNKNOWN`. Primary movement UI uses source-aware language rather than a generic confidence percentage.

## Synchronization boundary

Alpha.2 sync occurs on app open, explicit refresh or explicit user demand. It does not add background Gmail authority, offline access, a cloud financial database or a daemon. Gmail `historyId` is used only after a successful bootstrap; stale anchors trigger safe rediscovery with source-id idempotency.

## Consequences

Positive:

- the default user journey becomes automatic after Gmail authorization;
- posted ledger evidence can confirm or correct fast notification evidence;
- financial history survives restart without retaining raw mail or statements;
- coverage and uncertainty remain explainable.

Costs:

- profile-specific discovery and parser maintenance;
- physical storage/privacy validation before promotion;
- explicit review UX for account mapping and reconciliation ambiguity;
- format drift becomes a normal operational state.

## Non-goals

Alpha.2 excludes Gmail write/send, bank credential scraping, web-banking login, background Gmail daemon, cloud plaintext financial storage, OCR-first ingestion, LLM financial reasoning, automated financial advice, iOS production promotion and generic statement parsing.

## Promotion laws

```text
DESIGN_FREEZE_PASS != IMPLEMENTATION_PASS
STATIC_PROFILE_PASS != PHYSICAL_PROFILE_PASS
STATEMENT_DISCOVERED != STATEMENT_PARSED
STATEMENT_PARSED != MONTH_RECONCILED
MONTH_RECONCILED != PRODUCT_BUILD_READY
GMAIL_ATTACHMENT != AUTHORITY_TO_STORE_RAW
SAME_AMOUNT != SAME_ECONOMIC_EVENT
SQLCIPHER_OPEN != SIDECARS_PROVEN_SAFE
```

Alpha.2-A may begin only when `tools/validate-alpha2-design-freeze.mjs` passes on the exact source state. Global `BUILD_READY` remains graph-authoritative and unchanged.
