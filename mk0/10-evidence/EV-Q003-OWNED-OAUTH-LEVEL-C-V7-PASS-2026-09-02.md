# EV-Q003 — FinanceSensor-owned Gmail OAuth Level C v7 — PHYSICAL PASS

**Date:** 2026-09-02  
**Scope:** controlled FinanceSensor DEV OAuth identity / Gmail `gmail.readonly` path  
**Evidence class:** sanitized aggregate physical execution  
**Q-003 effect:** Level C physical execution PASS; Q-003 remains ACTIVE pending production/policy/performance closure criteria.

## Result

```text
LEVEL_C                         PASS
EXECUTION_COMPLETE              true
SCHEMA_VERSION                  7
EXACT_SCOPE                     https://www.googleapis.com/auth/gmail.readonly
REAL_CONSENT                    PASS
STATE_BINDING                   PASS
PKCE_S256                       true
TOKEN_EXCHANGE                  HTTP 200
PROFILE_IDENTITY                PASS
SYNC_ANCHOR_SOURCE              MESSAGE_HISTORY_ID
RECENT_INBOX_ANCHOR_WINDOW      PASS
ANCHOR_SUBJECT_MATCHED          PASS
ANCHOR_ESTABLISHED              PASS
INCREMENTAL_HISTORY             PASS
HISTORY_SELECTION_PATH          SUPPORTED_MESSAGE_ANCHOR_MESSAGE_ADDED
METADATA                        PASS
SYNTHETIC_MARKER_MATCHED        PASS
PRODUCTION_METADATA_GATE        PASS
SELECTED_FULL                   PASS
EXTRACTION                      PASS
REPLAY_OBSERVED                 PASS
PROVIDER_REVOKE                 PASS
OLD_REFRESH_AUTHORITY           DENIED
```

The execution began at `2026-09-02T04:56:03.259Z` and finished at `2026-09-02T05:01:26.807Z`, approximately 323.548 seconds end-to-end. This wall-clock duration is contextual only; it is not endpoint latency evidence.

## Bounded provider observations

```text
anchor attempts                 1 / max 2
probe attempts                  1 / max 2
recent INBOX IDs                5 / max 5
anchor METADATA inspected       5
purchase METADATA inspected     1
messages.list requests          1
profile requests                1
history.list requests           2
METADATA requests               6
FULL requests                   1 / max 1
token exchange requests         1
post-revoke refresh check       1
revoke requests                 1
historical mailbox sweep        0
Gmail Search q used             false
/profile.historyId as anchor    false
```

The six METADATA calls are explained by five Subject-only inspections in the bounded recent-INBOX anchor window plus one selected post-anchor purchase candidate.

## Privacy observations

Sanitized evidence reported zero durable leakage for every protected field measured by the runner:

```text
raw Gmail content written to result       0
financial plaintext written to result     0
auth secret written to result             0
credential path written to result         0
anchor marker written to result            0
purchase marker written to result          0
unrelated recent Subject written to result 0
authorized mailbox written to result       0
message ID written to result               0
pre-authorization mailbox sweep            0
```

No Gmail address, message ID, subject, body, OAuth token, authorization code, PKCE verifier, client secret or credential path is stored in this evidence artifact.

## What v7 physically proves

The controlled FinanceSensor-owned Desktop DEV client can complete the following real provider path:

```text
Google consent
  -> exact gmail.readonly grant
  -> state + PKCE-bound callback
  -> token exchange
  -> exact mailbox identity
  -> bounded INBOX bootstrap
  -> Subject-only local anchor selection
  -> MESSAGE.historyId partial-sync anchor
  -> filtered messageAdded history
  -> candidate METADATA gate
  -> exactly one FULL retrieval
  -> financial extraction
  -> deterministic replay
  -> provider revoke
  -> old refresh authority denied
```

This closes the physical Level-C execution gap that remained after v1-v6.

## What this does NOT prove

`LEVEL_C_PASS != Q-003_CLOSED`.

The following Q-003 closure requirements remain open:

1. **Successful physical refresh / reauthorization lifecycle before revocation.** The observed `tokenRefresh=1` is the deliberate post-revoke denial check; it does not prove a successful real refresh path after access-token expiry.
2. **Request bytes and endpoint timing.** Request counts are measured, but payload-byte accounting and per-endpoint latency are not yet recorded. End-to-end wall-clock duration is not a substitute.
3. **Production protected credential handling.** Desktop DEV proves the provider path, not Android/iOS protected credential storage.
4. **Restricted-scope production verification / policy package.** Public verification, scope justification, Limited Use disclosures and security-assessment applicability remain external production work.

Q-004 and Q-005 remain independent blockers.

## Governing conclusions

```text
PROVIDER ASSUMPTION != PROVIDER EVIDENCE
CURRENT MAILBOX HISTORY != DOCUMENTED PARTIAL-SYNC ANCHOR PROVENANCE
SEARCHABLE IMMEDIATELY != DELIVERED TO INBOX
LEVEL-C HARNESS != PRODUCTION ONBOARDING
LEVEL_C_PASS != Q-003_CLOSED
```

## Sanitization note

The source execution result supplied to engineering contained aggregate states and counters only. User mailbox identity and per-run synthetic markers are deliberately omitted from repository evidence.
