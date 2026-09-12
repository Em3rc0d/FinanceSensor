# Source Authority and Canonical Bindings

**Status:** DATA MODEL CONTRACT  
**Date:** 2026-09-06

## Principle

A source observation is evidence, not automatically a canonical financial transaction.

```text
SOURCE_OBSERVATION != CANONICAL_TRANSACTION
```

## Source observation

Minimum logical shape:

```text
sourceObservationId
sourceKind              GMAIL | STATEMENT
sourceProfileId
institution
accountOrInstrumentHint
currency
amount
directionHint
semanticHint
merchantOrCounterparty?
externalReference?
occurredAt?
postedAt?
truthState              OBSERVED | POSTED
provenanceVersion
parserVersion?
rawEvidenceLocator      local-only opaque locator
```

The raw locator cannot be synchronized to the web as a retrievable Gmail/PDF payload reference.

## Canonical transaction

```text
canonicalTransactionId
economicEffect
currency
amount
occurredAt
postedAt?
accountOrInstrumentId?
merchantOrCounterparty?
category?
truthState              UNKNOWN | PARTIAL | OBSERVED | POSTED | RECONCILED
sourceBindings[]
reconciliationReceipt?
coverageScopes[]
canonicalModelVersion
```

## Source binding

```text
sourceObservationId
sourceKind
role                     PRIMARY | SUPPORTING | OFFSET | CONFLICT
independentChannel        boolean
```

A Gmail observation and statement posting can both bind to one canonical transaction.

## Truth promotion

Allowed transitions:

```text
UNKNOWN -> PARTIAL
UNKNOWN -> OBSERVED
UNKNOWN -> POSTED
PARTIAL -> OBSERVED
PARTIAL -> POSTED
OBSERVED -> RECONCILED
POSTED -> RECONCILED
RECONCILED -> REOPENED/REVIEW via coverage/reconciliation state, not silent downgrade
```

A deterministic independent match can promote to `RECONCILED`; the internal numeric match score is retained only in the reconciliation receipt.

## Economic effect

At minimum the model distinguishes:

```text
EXPENSE
INCOME
TRANSFER
CARD_PAYMENT
REFUND
REVERSAL
FEE
CASH_WITHDRAWAL
UNKNOWN
```

Direction is a feature, never the final economic category.

## Public projection

The web projection may include:

```text
canonicalTransactionId
amount/currency
economicEffect
merchant/counterparty
category
truthState
account display alias
occurredAt / postedAt
source labels
coverage state
```

It must exclude:

```text
Gmail raw body
MIME parts
message token/refresh authority
PDF bytes
PDF password
local raw-evidence path
private device key material
```

## Idempotency

Canonical identity remains governed by Q-002 fingerprinting. A second source binding to an existing economic event must not create a second canonical movement.

## Web totals

Expense totals include economic effects defined as spending effects, not all debits. Income totals include genuine inflow effects, not transfers or refunds by default.

Monthly net movement is only labeled complete when F coverage permits it.
