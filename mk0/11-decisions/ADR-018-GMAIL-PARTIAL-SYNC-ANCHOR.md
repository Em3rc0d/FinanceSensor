# ADR-018 — Gmail partial-sync anchor provenance

Status: ACCEPTED FOR MK0 SPIKE / PRODUCTION INITIAL-SYNC UX STILL OPEN  
Date: 2026-09-02  
Decision scope: Q-003 Gmail feasibility / S-003 physical ingress spike

## Context

FinanceSensor's Level-C v4/v5 harness bootstrapped incremental Gmail history from the `historyId` returned by `users.getProfile`.

A physical v5 execution proved that the authorized mailbox's profile history position advanced after a controlled inbound message while both filtered and unfiltered `users.history.list` calls returned zero history records from the profile-derived baseline.

Google's Gmail API documentation states that `users.history.list.startHistoryId` should be obtained from the `historyId` of a message, thread, or previous history-list response.

The harness therefore treated two provider concepts as interchangeable without sufficient provider evidence.

## Decision

FinanceSensor shall distinguish:

```text
MAILBOX CURRENT HISTORY POSITION
        !=
PARTIAL-SYNC ANCHOR WITH DOCUMENTED PROVENANCE
```

For Q-003 Level-C physical proof:

1. `/profile` MAY be used to identify the exact authorized Gmail mailbox locally.
2. `/profile.historyId` MUST NOT be used as the bootstrap `startHistoryId`.
3. The controlled harness SHALL create a harmless synthetic anchor message.
4. The harness MAY perform a targeted `messages.list` search only for that random synthetic anchor, with `maxResults=1` and no historical sweep.
5. The anchor message SHALL be verified with `messages.get(format=METADATA)` requesting only `Subject`.
6. The anchor message's own `historyId` SHALL become the Level-C `startHistoryId`.
7. Only changes after that message-derived anchor are eligible for the synthetic financial probe.
8. The resulting normal path remains metadata-first and allows at most one selected FULL fetch.

## Request bounds

Level-C v6 enforces:

```text
anchor lookup attempts       <= 2
anchor list maxResults        = 1 per attempt
post-anchor changed IDs      <= 5 per probe attempt
history probe attempts       <= 2
FULL fetches                 <= 1
historical mailbox sweep      0
```

## Privacy boundary

The random anchor marker, purchase marker, authorized mailbox, message IDs, Gmail content, access/refresh tokens, authorization code, PKCE verifier, Desktop client secret and credential path MUST NOT be written to result evidence.

The synthetic anchor contains no financial data.

## Production boundary

This ADR does **not** decide production initial-sync UX.

```text
LEVEL-C SYNTHETIC ANCHOR HARNESS
        !=
PRODUCTION INITIAL-SYNC UX
```

The two-message anchor sequence exists to obtain controlled physical proof without scanning a user's historical mailbox. Production onboarding/sync must be designed separately against current Gmail sync guidance, privacy requirements, crash/restart behavior, bounded initial acquisition, recovery semantics and the canonical evidence pipeline.

## Rejected alternatives

### Continue using `/profile.historyId`

Rejected because physical evidence contradicted the assumption and provider documentation does not grant the provenance we were relying on.

### Add sleeps or aggressive polling

Rejected. Propagation was not the unresolved variable after v5: the correct mailbox was observed and its profile history position advanced.

### Re-enable broad historical mailbox listing

Rejected for the Level-C proof. It would expand data exposure to solve a harness bootstrap problem.

### Treat any history-like numeric value as interchangeable

Rejected. Provenance is part of correctness.

## Consequences

Positive:
- aligns Level-C with documented `startHistoryId` provenance;
- retains bounded data exposure;
- converts a provider ambiguity into a testable invariant;
- prevents profile/history semantic conflation from entering production architecture unnoticed.

Costs:
- Level-C requires two controlled synthetic messages instead of one;
- one targeted `messages.list` call is reintroduced solely to locate the synthetic anchor;
- production initial-sync remains an open design decision rather than inheriting the harness behavior.

## Governing laws

```text
PROVIDER FIELD NAME SIMILARITY != SEMANTIC INTERCHANGEABILITY
CURRENT MAILBOX HISTORY != DOCUMENTED PARTIAL-SYNC ANCHOR PROVENANCE
HARNESS BOOTSTRAP != PRODUCTION ONBOARDING
```
