# EV-Q003 — FinanceSensor-owned Gmail Level C v4 history-gap execution

Date: 2026-09-02

Status: **PARTIAL PHYSICAL PROOF / LEVEL C FAIL**

This evidence freezes the sanitized aggregate result returned by the controlled FinanceSensor-owned OAuth v4 execution. No Gmail body, message ID, proof marker, OAuth token, authorization code, PKCE verifier, client secret, credential path or financial literal is recorded here.

## Observed execution

```text
OAuth Desktop credential selected       PASS
Desktop client_id matched               PASS
Real Google consent                     PASS
PKCE S256                               PASS
State binding                           PASS
Loopback root redirect                  PASS
Token exchange HTTP                     200
Profile history cursor                  PASS
messages.list                           SKIPPED BY DESIGN / 0
history.list                            2 requests / PASS at HTTP-provider boundary
METADATA                                0
FULL                                    0
Synthetic marker                       NOT FOUND
Production metadata gate               NOT EXERCISED
Extraction                             NOT EXERCISED
Replay                                 NOT EXERCISED
Provider revoke                         PASS
Refresh authority after revoke          DENIED
Execution complete                      true
Level C pass                            FAIL
```

Sanitized request accounting:

```text
profile         1
tokenExchange   1
list            0
history         2
metadata        0
full            0
tokenRefresh    1
revoke          1
probeAttempts   2
```

Privacy counters remained zero for:

```text
raw Gmail content in result
financial plaintext in result
auth secrets in result
credential path in result
synthetic marker in result
pre-authorization mailbox sweep
```

## What this proves

The v4 run physically proves that the FinanceSensor-owned Desktop DEV OAuth path can complete consent, authorization-code exchange, Gmail profile access, Gmail history endpoint calls, provider revocation and post-revocation refresh denial while keeping the evidence aggregate-only.

## What this does NOT prove

It does not prove the required incremental ingress chain:

```text
post-authorization mailbox change
        ↓
messageAdded ID
        ↓
METADATA
        ↓
exact synthetic marker
        ↓
production metadata gate
        ↓
1 FULL
        ↓
financial extraction
        ↓
replay observation
```

Because `metadata = 0`, the failure occurred before metadata classification. The v4 result cannot identify whether the synthetic message had not become visible in the authorized mailbox history, whether a different mailbox was used, or whether a different Gmail history event shape was returned. Those possibilities must not be guessed.

## Provider-documentation reconciliation

Google's `users.history.list` contract states that `startHistoryId` returns records after the supplied cursor, and that an empty result is valid when there are no observed mailbox changes after that point. `messageAdded` is the specific history type for messages added to the mailbox.

Therefore the next probe must distinguish mailbox-history advancement from history-record parsing instead of treating both as `marker not found`.

## v5 corrective boundary

v5 introduces:

```text
exact authorized Gmail address shown locally from /profile
        ↓
address NOT serialized to evidence
        ↓
post-send /profile historyId comparison
        ↓
if unchanged: stop before history.list
        ↓
if advanced: filtered messageAdded history
        ↓
if filtered unexpectedly empty:
  one unfiltered diagnostic history request
  aggregate event-family counts only
        ↓
normal FILTERED_MESSAGE_ADDED path required for LEVEL_C_PASS
```

The unfiltered diagnostic path cannot independently upgrade Level C to PASS.

## Authority

```text
EXECUTION_COMPLETE != LEVEL_C_PASS
HTTP history.list success != observed messageAdded event
PROVIDER ASSUMPTION != PROVIDER EVIDENCE
```

Q-003 remains **ACTIVE**.
