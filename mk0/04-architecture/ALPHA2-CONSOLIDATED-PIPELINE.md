# Alpha.2 — Consolidated Pipeline Architecture

**Status:** ARCHITECTURE CONTRACT / PRE-BUILD  
**Date:** 2026-09-06

## Objective

Produce one canonical financial ledger from Gmail event evidence and bank-statement posted evidence, then expose a minimized encrypted view to the web without moving raw Gmail or raw statement content into the presentation backend.

## Logical pipeline

```text
ANDROID TRUSTED EDGE

Gmail OAuth
   ↓
A. Gmail/statement discovery adapters
   ↓
B. Fetch + parser family
   ↓
normalized source observations
   ↓
C. SQLCipher Financial Vault
   ↓
D. deterministic reconciliation
   ↓
E. account / instrument graph
   ↓
F. monthly source coverage
   ↓
G. deterministic Sensor V1
   ↓
canonical ledger projection
   ↓
E2EE sync envelope
   ↓
OPAQUE RELAY / CONTROL PLANE
   ↓
WEB CLIENT
   ↓
user-authorized decrypt + presentation
```

## Data planes

### Raw-evidence plane — trusted edge only

May contain transient:

- selected Gmail headers/body fragments;
- statement PDF bytes;
- parser-specific geometric/text extraction artifacts.

Raw-evidence rules:

```text
RAW_GMAIL_SERVER_STORAGE=FORBIDDEN
RAW_STATEMENT_SERVER_STORAGE=FORBIDDEN
RAW_GMAIL_WEB_RENDERING=FORBIDDEN
RAW_STATEMENT_WEB_RENDERING=FORBIDDEN_BY_DEFAULT
```

### Observation plane — local encrypted vault

Normalized but not yet canonical source facts:

```text
sourceObservationId
sourceKind
institution
accountHint
currency
amount
economicDirection
merchant/reference hints
occurredAt / postedAt
sourceEvidenceState
provenance pointers
```

Two observations may describe the same economic event.

### Canonical ledger plane

One canonical transaction may bind zero, one or many source observations.

Canonical state includes:

```text
canonicalTransactionId
economicEffect
currency
amount
occurredAt
postedAt?
account/instrument
merchant/category
truthState
sourceBindings[]
reconciliationDecision
coverageScope
version
```

`sourceBindings` keeps provenance; the UI does not infer truth from a naked numeric score.

## Source authority policy

### Gmail

Purpose: low-latency observation of likely outflows and transaction events.

Default truth produced by Gmail alone:

```text
OBSERVED
```

Gmail alone does not make monthly coverage complete.

### Statement

Purpose: periodic posted account truth and reconciliation authority.

Default truth for supported parser output:

```text
POSTED
```

When it matches an independent Gmail observation under deterministic reconciliation rules:

```text
RECONCILED
```

## Economic-effect guardrail

Movement direction is not economic meaning.

```text
MONEY_LEFT_ACCOUNT != EXPENSE
MONEY_ENTERED_ACCOUNT != INCOME
```

Examples:

- inter-account transfer: not expense/income;
- credit-card payment: not a second expense;
- refund/reversal: relationship-aware offset;
- bank fee: expense even without Gmail evidence;
- cash withdrawal: movement requiring distinct semantics.

## Reconciliation

Reconciliation consumes source observations and emits a canonical transaction plus a deterministic decision receipt.

Internal matching scores remain algorithmic thresholds, not calibrated probabilities.

Public UX only receives truth state and concise provenance labels.

## Web boundary

The web never calls Gmail directly and never owns the Gmail refresh authority.

The web receives a canonical ledger projection after local normalization/reconciliation. The relay is designed to be unable to decrypt user ledger contents.

This architecture reduces server capability but does **not** claim a Google restricted-scope security-assessment exemption. Q-003 remains authoritative for production policy closure.

## Sync model

Canonical ledger operations are append/update facts with versioned provenance. Sync is local-first and E2EE:

```text
device ledger mutation
  → encrypted envelope
  → opaque relay
  → browser/device fetch
  → decrypt on authorized client
  → materialized web projection
```

Conflicts are resolved through existing Q-005 sequencing/checkpoint rules; the server must not become a master-key authority.

## Offline behavior

Mobile ingestion, parsing, vault access, reconciliation and local dashboard remain possible without the web.

Web availability does not determine financial truth.

```text
WEB_DOWN != LEDGER_LOST
CLOUD_UNAVAILABLE != LOCAL_INGESTION_DISABLED
```

## Failure isolation

- unsupported statement parser → quarantine source, no generic import;
- Gmail failure → preserve last canonical ledger, coverage degrades visibly;
- statement missing → expenses may remain OBSERVED, month remains incomplete;
- reconciliation conflict → REVIEW_REQUIRED, never silent merge;
- relay unavailable → queue encrypted deltas locally;
- browser key unavailable → no plaintext fallback.

## Build boundary

No Android physical candidate is promoted until this architecture is represented by executable synthetic contracts across A-G and the web projection.
