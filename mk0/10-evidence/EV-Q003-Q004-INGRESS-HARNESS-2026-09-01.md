# EV-Q003-Q004 — Physical Financial Ingress Harness

**Date:** 2026-09-01  
**Evidence level:** CONTRACTUAL / SYNTHETIC PROVIDER  
**Validated commit:** `ec2fadbafa2186ac8e791354c649ab30ca4d4538`  
**MK0 Foundation run:** `33521224879`  
**Physical ingress job:** `99900688076`

## Result

```text
PHYSICAL_INGRESS_HARNESS     PASS
TESTS                        21 / 21 PASS
ASYNC_PROVIDER_CONTRACT      PASS
REAL_GMAIL_ADAPTER           IMPLEMENTED / NOT EXECUTED
REAL_GMAIL_PROVIDER          NOT EXECUTED
Q-003                        ACTIVE
Q-004                        ACTIVE
BUILD_READY                  NO
```

## What passed

- authorization is required before source access;
- 30/90-day bounded initial listing behavior;
- METADATA-first retrieval;
- FULL retrieval only for likely financial candidates;
- raw subject/body/attachments are not part of durable state;
- financial semantic meaning is derived before raw content disposal;
- derived state survives encrypted snapshot/restart;
- incremental `historyId`-style synchronization;
- expired-history 404 recovery falls back to bounded rescan;
- replay/reprocessing remains idempotent;
- canonical resolver is reused rather than reimplemented;
- serialized at-rest state contains no tested raw financial literals;
- attachment bytes are not copied into durable state;
- telemetry rejects content-bearing financial fields;
- plaintext financial cloud counter remains zero in the harness;
- token literals do not appear in provider call logs, telemetry or encrypted vault serialization;
- disconnect removes credential/cursor;
- disconnect can either retain derived history or explicitly erase Gmail-derived state;
- tenant deletion destroys credential and local encrypted state;
- request accounting matches provider operations;
- one async provider contract is used for synthetic and real-provider paths.

## Important semantic correction discovered during implementation

Discarding raw mail means the system cannot later re-run semantic classification from subject/body. Therefore FinanceSensor persists the **derived semantic type** inside encrypted local financial evidence before raw content is discarded.

This preserves:

```text
raw content minimization
        +
restart/replay correctness
```

without retaining an inbox mirror.

## Real adapter prepared

The repository now contains:

```text
spikes/physical-ingress/src/gmail-rest-provider.js
spikes/physical-ingress/live/run-gmail.mjs
.github/workflows/gmail-live-spike.yml
```

The live path:

- uses Gmail REST directly;
- supports bounded `messages.list`;
- supports `messages.get` METADATA/FULL;
- supports `history.list`;
- reads the mailbox `historyId` from profile;
- prints aggregate operational evidence only;
- can revoke the controlled OAuth token after the run;
- never requires a client secret or token to be committed.

## What this evidence does NOT prove

This artifact does not prove:

- Google OAuth consent succeeds for the actual FinanceSensor project;
- `gmail.readonly` is approved for the production app;
- real Gmail endpoint behavior against a controlled mailbox;
- Google verification/security-assessment acceptance;
- Android Credential Manager / Keystore token behavior;
- physical-device RAM/battery/network behavior;
- remote OAuth revocation behavior;
- real transport packet inspection;
- deletion of any future cloud backup/control-plane records;
- zero metadata leakage.

## Next required Level B evidence

```text
controlled Google Cloud DEV project
        ↓
controlled Gmail test account
        ↓
real OAuth user consent
        ↓
gmail.readonly access token outside repository
        ↓
Gmail Live Ingress Spike workflow
        ↓
real bounded list / metadata / full / history
        ↓
remote token revoke
        ↓
Android protected credential storage follow-up
        ↓
network / local-storage inspection
        ↓
EV-Q003-Q004-REAL-GMAIL-<date>
```

Until Level B exists, Q-003 and Q-004 remain `ACTIVE`.
