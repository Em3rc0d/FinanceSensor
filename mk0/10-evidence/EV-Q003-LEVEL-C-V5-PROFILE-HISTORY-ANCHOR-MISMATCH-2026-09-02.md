# EV-Q003 — Level C v5 profile-history anchor mismatch

Date: 2026-09-02  
Scope: FinanceSensor-owned Gmail OAuth Level C controlled DEV proof  
Node: Q-003 Gmail feasibility  
Status: PARTIAL PHYSICAL PROOF / LEVEL C NOT PASSED

## Purpose

Freeze the sanitized aggregate result of the Level-C v5 physical execution and the provider-contract contradiction it exposed.

No Gmail body, subject literal, message ID, OAuth token, authorization code, PKCE verifier, client secret, credential path, authorized mailbox address, proof marker or financial literal is stored in this evidence file.

## Physical observations

```text
REAL CONSENT                         PASS
STATE BINDING                        PASS
TOKEN EXCHANGE                       HTTP 200
AUTHORIZED MAILBOX SHOWN LOCALLY     PASS
POST-SEND PROFILE CHECK              PASS
MAILBOX HISTORY ADVANCED             PASS
MESSAGES.LIST                        0
FILTERED HISTORY RECORDS             0
FILTERED MESSAGE_ADDED               0
UNFILTERED DIAGNOSTIC HISTORY        USED
UNFILTERED HISTORY RECORDS           0
METADATA                             0
FULL                                 0
PROVIDER REVOKE                      PASS
OLD REFRESH AUTHORITY                DENIED
EXECUTION COMPLETE                   true
LEVEL C PASS                         FAIL
```

Request counts from the sanitized result:

```text
profile          2
list             0
metadata         0
full             0
history          2
token exchange   1
token refresh    1
revoke           1
probe attempts   1
```

Privacy counters remained zero for raw Gmail content, financial plaintext, auth secrets, credential path, proof marker, authorized mailbox and message IDs in result evidence.

## Contradiction exposed

v5 used the Gmail `/profile` response's current `historyId` as the `startHistoryId` for `users.history.list`.

The physical execution showed:

```text
/profile historyId changed after the controlled inbound message
        +
history.list returned zero records from that baseline
```

Current Gmail API documentation defines `startHistoryId` provenance more narrowly: the supplied value should be obtained from the `historyId` of a **message**, **thread**, or **previous history.list response**. Gmail partial-sync guidance likewise starts from a stored history ID associated with previously retrieved mailbox state rather than treating `/profile.historyId` as an interchangeable bootstrap anchor.

Therefore the earlier harness assumption is rejected.

## New governing distinction

```text
CURRENT MAILBOX HISTORY POSITION
        !=
DOCUMENTED PARTIAL-SYNC ANCHOR PROVENANCE
```

More concretely:

```text
/profile.historyId
        != assumed valid bootstrap startHistoryId
```

until provider documentation explicitly grants that provenance.

## Repair

Level-C v6 no longer uses `/profile.historyId` as `startHistoryId`.

The controlled proof now establishes a bounded, provider-conformant synthetic message anchor:

```text
OAuth
  ↓
/profile → identify authorized mailbox only
  ↓
controlled harmless anchor email
  ↓
targeted messages.list query, maxResults=1
  ↓
messages.get(METADATA, Subject only)
  ↓
anchor MESSAGE.historyId
  ↓
controlled synthetic purchase email
  ↓
history.list(startHistoryId = anchor MESSAGE.historyId)
  ↓
messageAdded → METADATA → ≤1 FULL → extraction → replay
  ↓
revoke → old refresh denied
```

The targeted `messages.list` call is a **Level-C harness bootstrap**, not a historical mailbox sweep. It is limited to a random synthetic anchor marker and one result.

## Important non-equivalence

```text
LEVEL-C SYNTHETIC ANCHOR HARNESS
        !=
PRODUCTION INITIAL-SYNC UX
```

Production initial-sync behavior must be designed separately using Gmail's documented sync model, bounded privacy requirements and FinanceSensor's own data-minimization rules. The harness exists only to produce controlled physical evidence.

## Red → green contract evidence

A new `GMAIL-ANCHOR-001` test first forced the provider to support an exact targeted anchor query with `maxResults=1`. The test commit made the physical-ingress Foundation job fail while canonical and distributed jobs stayed green. The provider was then repaired to forward an explicit Gmail query while preserving the previous date-based behavior when no explicit query is supplied.

## Gate conclusion

```text
Q-003        ACTIVE
LEVEL C      NOT PASSED
BUILD_READY  false
```

v5 is retained as causal evidence. It must not be relabeled PASS merely because OAuth, profile access and revocation succeeded.
