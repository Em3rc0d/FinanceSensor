# EV-Q003-Q004 — Physical Financial Ingress Harness

**Date:** 2026-09-01  
**Evidence level:** CONTRACTUAL / SYNTHETIC PROVIDER  
**Validated commit:** `7628156bb392cd597ec7cd26c7468a8984623487`  
**MK0 Foundation run:** `33520615184`  
**Physical ingress job:** `99898616829`  
**Heartbeat run:** `33520615206`

## Result

```text
PHYSICAL_INGRESS_HARNESS     PASS
TESTS                        21 / 21 PASS
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
- request accounting matches provider operations.

## Important semantic correction discovered during implementation

Discarding raw mail means the system cannot later re-run semantic classification from subject/body. Therefore FinanceSensor must persist the **derived semantic type** inside encrypted local financial evidence before raw content is discarded.

This preserves:

```text
raw content minimization
        +
restart/replay correctness
```

without retaining an inbox mirror.

## What this evidence does NOT prove

This artifact does not prove:

- Google OAuth succeeds for FinanceSensor;
- `gmail.readonly` is approved for the production app;
- real `messages.list`, `messages.get`, or `history.list` behavior on a controlled Gmail account;
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
gmail.readonly
        ↓
real bounded list / metadata / full / history
        ↓
Android protected credential storage
        ↓
revoke + restart + delete
        ↓
network / local-storage inspection
        ↓
EV-Q003-Q004-REAL-GMAIL-<date>
```

Until Level B exists, Q-003 and Q-004 remain `ACTIVE`.
