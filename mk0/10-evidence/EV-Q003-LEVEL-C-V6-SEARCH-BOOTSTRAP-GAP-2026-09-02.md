# EV-Q003 — Gmail Level C v6 search-bootstrap gap

Date: 2026-09-02  
Node: Q-003 Gmail feasibility  
Status: PHYSICAL EXECUTION COMPLETE WITH GAPS / NOT PASS

## Purpose

Freeze the sanitized physical result of the FinanceSensor-owned OAuth Level C v6 experiment without upgrading Q-003 or Level C.

## What v6 changed

v6 corrected the prior `/profile.historyId` bootstrap assumption. The intended sync anchor was the `historyId` of a synthetic Gmail message, consistent with Gmail partial-sync guidance.

To locate that synthetic anchor, v6 used a narrowly targeted `messages.list(q=...)` query with a random subject marker and `maxResults=1`, at most twice.

## Physical observation

The operator authorized the exact controlled Gmail account and sent the synthetic anchor message. The message was visibly present in that Inbox before the anchor action was invoked.

Sanitized result:

```text
schemaVersion                         6
realConsent                           PASS
stateBinding                          PASS
tokenExchangeHttpStatus               200
profileIdentity                       PASS
authorizedMailboxShownLocally         PASS
syncAnchorSource                      MESSAGE_HISTORY_ID
messagesListMode                      TARGETED_SYNTHETIC_ANCHOR_ONLY
maxAnchorAttempts                     2
anchorAttempts                        2
targetedAnchorSearch                  NOT_FOUND
anchorMetadata                        PENDING
anchorEstablished                     PENDING
history requests                      0
metadata requests                     0
FULL requests                         0
providerAcceptedRevoke                PASS
refreshAuthorityAfterRevoke           DENIED
executionComplete                     true
levelCPass                            FAIL
result                                LEVEL_C_EXECUTION_COMPLETE_WITH_GAPS
```

Provider request counts:

```text
profile       1
list          2
metadata      0
full          0
history       0
tokenExchange 1
tokenRefresh  1
revoke        1
```

Privacy counters remained zero for raw Gmail content, financial plaintext, auth secrets, credential path, anchor marker, purchase marker, authorized mailbox and message IDs in the persisted result.

## What this proves

v6 proves:

- FinanceSensor-owned OAuth consent still succeeds;
- the exact mailbox identity is available locally;
- the corrected architecture does not use `/profile.historyId` as `startHistoryId`;
- the Gmail anchor query was bounded to two list calls;
- the anchor was not returned by those two targeted query calls;
- no history, metadata or FULL request was spent after anchor acquisition failed;
- provider revocation succeeded and the old refresh authority was denied;
- the run failed closed and did not emit Level C PASS.

## What this does NOT prove

This result does **not** prove why Gmail returned zero query results. In particular, it does not distinguish among search-index timing, Gmail search-query semantics, provider-side visibility differences, or another query-path behavior.

Therefore the evidence must not be summarized as "Gmail indexing lag" without separate proof.

## Architecture consequence

A synchronization bootstrap must not require an unproven assumption that a just-delivered, visibly present message is immediately discoverable through Gmail Search `q`.

The next bounded experiment removes search-query discovery from the anchor path:

```text
visible synthetic anchor in INBOX
        ↓
messages.list(labelIds=INBOX, maxResults<=5, q omitted)
        ↓
ID-only recent window
        ↓
Subject METADATA locally, <=5
        ↓
exact synthetic anchor
        ↓
MESSAGE.historyId
        ↓
history.list for the second synthetic message
```

The process may inspect up to five recent Subject headers locally per anchor attempt. Those unrelated Subjects are forbidden from persisted evidence.

## Gate decision

```text
LEVEL C v6   FAIL
Q-003        ACTIVE
G-MK0        BLOCKED
BUILD_READY  false
```

`EXECUTION_COMPLETE != LEVEL_C_PASS`.
