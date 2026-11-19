# ADR-019 — Gmail bootstrap without Search-index dependency

Date: 2026-09-02  
Status: ACCEPTED FOR LEVEL-C HARNESS / PRODUCTION INITIAL-SYNC STILL OPEN  
Owner: Q-003

## Context

FinanceSensor needs a provider-conformant recent Gmail `historyId` before exercising partial synchronization with `users.history.list`.

ADR-018 already rejected `/profile.historyId` as an interchangeable bootstrap anchor. Gmail documents `startHistoryId` as originating from a message, thread, or previous history-list response; its sync guide describes using a recent message `historyId`.

Level C v6 attempted to obtain that message-derived anchor through an exact synthetic Subject query:

```text
messages.list(q = exact random synthetic marker, maxResults = 1)
```

The physical v6 run observed the synthetic message visibly present in Inbox but received zero results from two bounded query attempts. The run failed before metadata/history/FULL.

The observation does not establish the provider-side cause. It is therefore unsafe to claim a specific search-index timing defect. What is established is that immediate Search-query discovery is not proven reliable enough to be a synchronization bootstrap dependency.

Evidence:

`mk0/10-evidence/EV-Q003-LEVEL-C-V6-SEARCH-BOOTSTRAP-GAP-2026-09-02.md`

## Decision

For the Level-C proof harness, FinanceSensor will bootstrap the recent message anchor without Gmail Search `q`:

```text
user confirms synthetic anchor visible in INBOX
        ↓
messages.list(
  labelIds = INBOX,
  maxResults <= 5,
  q = omitted
)
        ↓
IDs only
        ↓
messages.get(METADATA, Subject) for <=5 recent IDs
        ↓
exact synthetic marker match
        ↓
MESSAGE.historyId
        ↓
history.list(startHistoryId = MESSAGE.historyId)
```

The provider contract must pass `labelIds=INBOX` explicitly and must omit `q` for this path.

## Bounds

```text
anchor attempts                       <= 2
messages.list per anchor attempt       1
recent INBOX IDs per attempt          <= 5
Subject METADATA reads per attempt    <= 5
FULL during anchor acquisition          0
Gmail Search q during anchor path       0
historical mailbox sweep                0
/profile.historyId as startHistoryId    0
```

## Privacy consequence

Compared with the exact-query design, the bounded recent-INBOX window may cause the local process to inspect Subject metadata for unrelated recent messages.

This is accepted only under all of the following conditions:

- no more than five recent IDs per attempt;
- Subject-only metadata for anchor identification;
- data remains local process memory;
- unrelated Subjects are not written to evidence, telemetry, repository or cloud;
- no body/FULL retrieval for unrelated messages;
- no automatic expansion beyond the bounded window.

If the exact anchor is not found within the bounded window after the allowed attempts, the harness fails closed.

## Why not broaden the Search query

Broadening or repeatedly retrying `q` would preserve the unproven dependency and could drift into an uncontrolled mailbox scan. The purpose of Level C is to prove a deterministic provider boundary, not to tune search heuristics until one happens to work.

## Production boundary

```text
LEVEL-C BOUNDED RECENT-INBOX BOOTSTRAP
        !=
PRODUCTION INITIAL-SYNC UX
```

This ADR authorizes only the controlled proof harness. Production initial synchronization remains a separate architecture/product decision and must independently satisfy privacy, request-budget, recovery and user-experience requirements.

## Consequences

Positive:

- message-derived `historyId` remains provider-conformant;
- immediate Gmail Search indexing is removed from the proof dependency;
- request and metadata exposure stay explicit and bounded;
- failure remains fail-closed.

Trade-off:

- up to five unrelated recent Subject headers may be inspected locally per attempt;
- a busy Inbox can still push the synthetic anchor outside the bounded window, in which case the proof fails rather than expanding scope.

## Governing law

```text
VISIBLE IN INBOX != PROVEN IMMEDIATELY SEARCHABLE BY q
MESSAGE-DERIVED HISTORY ID = REQUIRED LEVEL-C ANCHOR SOURCE
BOUNDED LOCAL METADATA WINDOW != HISTORICAL MAILBOX SWEEP
LEVEL-C HARNESS != PRODUCTION ONBOARDING
```
