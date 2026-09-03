# ADR-031 — Gmail historical onboarding and evidence-coverage semantics

**Status:** ACCEPTED FOR CONTROLLED IMPLEMENTATION / REAL GMAIL EXECUTION REQUIRED  
**Date:** 2026-09-03  
**Owner:** Q-003 / Gmail production onboarding

## Context

FinanceSensor already proved bounded Gmail reachability and a narrow Level-C lifecycle path, but the current ingestion spike is not sufficient for the product goal of showing the user's transaction history from Gmail:

```text
initialSync(days = 90)
messages.list max aggregate = 500
broad keyword metadata classifier
first generic amount regex
```

Those bounds were useful for feasibility. They are not an honest production historical-onboarding contract.

ADR-019 also states explicitly:

```text
LEVEL-C BOUNDED RECENT-INBOX BOOTSTRAP
!=
PRODUCTION INITIAL-SYNC UX
```

The connected private validation corpus additionally showed that transactional and promotional messages from financial institutions can share words such as `compra`, `pago`, `tarjeta`, `sueldo` and currency values. A keyword-only classifier is therefore not safe enough to construct financial truth.

## Product claim

FinanceSensor may claim:

> All transaction evidence detected from the Gmail mailbox coverage that FinanceSensor actually completed.

It MUST NOT claim:

> All transactions that exist at the user's banks.

Gmail can only provide evidence that exists in Gmail. A bank movement for which no detectable email exists is outside Gmail-source completeness.

## Coverage modes

### ALL_AVAILABLE_ACTIVE_MAILBOX

The production historical bootstrap enumerates all messages available through `users.messages.list` with:

```text
q                 OMITTED
labelIds          OMITTED
includeSpamTrash  false
page traversal    UNTIL nextPageToken ABSENT
```

This covers the active mailbox exposed by Gmail while excluding Spam and Trash by default.

### EXPLICIT_SPAM_TRASH_EXTENSION

Spam/Trash are not silently included. A future user-visible explicit extension may scan them with `includeSpamTrash=true` because those locations have different privacy/deletion expectations.

Therefore:

```text
ALL_AVAILABLE_ACTIVE_MAILBOX
!=
ALL_MESSAGES_INCLUDING_SPAM_TRASH
```

## Why no search query is the completeness authority

Gmail `q` is useful for acceleration and targeted adapters, and `gmail.readonly` permits it. However, an earlier physical Level-C run already observed an immediately visible synthetic message that was not immediately discoverable by a bounded Search query.

For historical onboarding:

```text
SEARCH QUERY = OPTIONAL ACCELERATOR
SEARCH QUERY != COMPLETENESS ORACLE
```

The coverage authority is complete page traversal without `q`.

## Two-stage privacy ladder

Every enumerated message is considered, but FinanceSensor does not fetch every body.

```text
messages.list
  -> opaque IDs only

for each ID
  -> messages.get METADATA
     From / Subject / Date

metadata classifier
  -> NON_CANDIDATE
       no FULL body retrieval

  -> CANDIDATE
       messages.get FULL locally
       issuer/receipt adapter
       durable FinancialEvidence only
       raw body discarded
```

This gives complete metadata coverage without turning complete history into complete raw-body collection.

## Classifier hierarchy

The classifier order is:

```text
1. exact/strong transactional issuer adapter
2. strong merchant-receipt signature
3. conservative generic fallback
4. non-candidate
```

Marketing/news/security/account-management messages from a known institution are not financial movements merely because the sender is a bank.

```text
BANK SENDER != TRANSACTION
FINANCIAL WORD != TRANSACTION
CURRENCY VALUE != TRANSACTION
```

## Evidence authority classes

Each extracted evidence record carries an evidence class:

```text
BANK_NOTIFICATION
PAYMENT_NOTIFICATION
MERCHANT_RECEIPT
GENERIC_FINANCIAL_RECEIPT
```

`sourceType` remains `GMAIL`; evidence class describes the authority/provenance inside that source.

Bank/account notifications are evaluated before merchant receipts during canonical rebuild so a merchant confirmation does not become the authoritative canonical event merely because it was encountered first.

Independent evidence classes may support duplicate/reconciliation review, but weak similarity never silently merges two distinct transactions.

## Historical pagination and resumability

The historical importer processes one Gmail page at a time and commits encrypted local progress after each page.

The provider page token is treated as a local synchronization cursor under the existing Gmail cursor privacy class:

```text
LOCAL ENCRYPTED ONLY
CLOUD PLAINTEXT FORBIDDEN
LOGGING FORBIDDEN
DELETE AFTER BOOTSTRAP COMPLETION
```

If a persisted page token is rejected or cannot safely resume, FinanceSensor restarts enumeration from the beginning and relies on durable source-message idempotency to skip already processed messages.

```text
INVALID RESUME TOKEN
-> RESTART ENUMERATION
-> DO NOT SKIP UNKNOWN RANGE
```

This favors completeness over speed.

## No artificial historical ceiling

Production `ALL_AVAILABLE_ACTIVE_MAILBOX` has no fixed 90-day or 500-message aggregate ceiling.

It may apply:

- bounded page size;
- bounded concurrent message fetches;
- backoff;
- user pause/resume;
- battery/network scheduling;

but those mechanisms delay work rather than redefine completed coverage.

## Progress semantics

The local state records sanitized counters:

```text
pagesCompleted
messagesEnumerated
metadataInspected
fullMessagesFetched
financialEvidenceCreated
nonCandidates
adapterMatches
reviewCandidates
```

A partial run is displayed as partial.

```text
PAUSED / INTERRUPTED != COMPLETE
```

## History cutover after bootstrap

The incremental `users.history.list` cursor must be derived from message/history evidence accepted by the Gmail synchronization contract, not silently substituted by `/profile.historyId` as if the two were interchangeable.

During historical enumeration FinanceSensor tracks observed message `historyId` values. At successful bootstrap completion it stores the greatest valid observed message historyId as the incremental anchor.

If no message-derived anchor exists, onboarding cannot claim incremental-ready state and must remain explicit about that condition.

If a later history cursor is rejected as stale/out-of-date (typically HTTP 404), FinanceSensor performs a new complete bootstrap with source-id deduplication rather than guessing a missing range.

## Raw-content boundary

During production Gmail historical onboarding:

```text
RAW EMAIL BODY DURABLE RETENTION       0 target / physically measured later
RAW ATTACHMENT DURABLE RETENTION       0 target / physically measured later
GMAIL PLAINTEXT CLOUD BYTES            0 target / physically measured later
FINANCIAL PLAINTEXT CLOUD BYTES        0 target / physically measured later
```

These remain physical privacy claims until measured. Architecture text alone does not promote the zeros.

## Private corpus discipline

Real user Gmail may be used only on the trusted edge to validate parser coverage.

Never commit:

- real Gmail addresses;
- message/thread IDs;
- transaction amounts;
- account/card numbers or suffixes tied to a user;
- transaction codes;
- raw Subjects/bodies/snippets from a real mailbox.

Repository tests use synthetic fixtures that preserve structural format without user data.

## Completion definition

Historical Gmail onboarding is `COMPLETE` only when all are true:

```text
page traversal reached nextPageToken = absent
all enumerated IDs reached a terminal metadata state
all candidate FULL fetches reached extracted / rejected / review state
no unknown interrupted page remains
message-derived incremental history anchor recorded
raw Gmail content not durably retained by design
```

The resulting product history means:

```text
COMPLETE GMAIL EVIDENCE COVERAGE
within declared mailbox scope
```

not universal bank-ledger completeness.

## Governing laws

```text
GMAIL EVIDENCE COVERAGE != BANK LEDGER COMPLETENESS
SEARCH_Q != COMPLETENESS_ORACLE
PAGE_LIMIT != HISTORICAL_LIMIT
BANK_SENDER != TRANSACTION
KEYWORD_MATCH != FINANCIAL_TRUTH
RAW_BODY_FETCH != DURABLE_RAW_RETENTION
PARTIAL_BOOTSTRAP != COMPLETE
INVALID_CURSOR -> RESTART + IDEMPOTENT DEDUP
MESSAGE_DERIVED_HISTORY_ANCHOR > PROFILE_HISTORYID_SUBSTITUTION
REAL_PRIVATE_CORPUS != PUBLIC_TEST_FIXTURE
```
