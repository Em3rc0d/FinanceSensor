# EV-Q005 — Opaque Witness Freshness

**Date:** 2026-09-01  
**Owner:** Q-005 / S-002 / T-002  
**Evidence class:** bounded adversarial distributed-systems spike

## Purpose

Test whether an independent service can remember monotonic FinanceSensor checkpoint progress and help detect rollback/relay staleness without receiving financial plaintext, tenant decryption keys or stable cross-witness tenant identity.

## Frozen contract

Architecture:

- `mk0/04-architecture/WITNESS-FRESHNESS.md`
- `mk0/11-decisions/ADR-016-OPAQUE-WITNESS-FRESHNESS.md`

Executable implementation:

- `spikes/e2ee-sync/src/witness.js`
- `spikes/e2ee-sync/test/witness.test.js`

## Red campaign

The initial witness intentionally authenticated submissions but did not enforce monotonic append-only continuity or contradiction-aware freshness evaluation.

Observed:

```text
DISTRIBUTED SUITE       109 / 116 PASS
FAIL                     7
```

The seven failures were intentionally frozen before repair:

```text
WIT-004 rollback submission
WIT-005 same-sequence different-hash fork
WIT-006 sequence gap / fast-forward
WIT-007 wrong previous checkpoint hash
WIT-014 valid witness ahead of relay
WIT-015 same-sequence witness divergence
WIT-017 configured witness/log binding confusion
```

This demonstrated that signature validity alone was insufficient.

## Repair

Repair head:

`f86ebb789d55ed2f5fd31e0817794c09a9b99986`

The witness now enforces:

```text
bootstrap sequence = 1 and parent = null
next sequence = previous + 1
parent hash = remembered checkpoint hash
lower sequence = rollback reject
same sequence / same head = retry equivalent
same sequence / different head = fork reject
sequence jump = gap reject
configured witness/log mismatch = invalid evidence
```

Freshness evaluation enforces:

```text
valid witness ahead of relay   -> RELAY_BEHIND_WITNESS
same-sequence valid divergence -> WITNESS_DIVERGENCE
insufficient evidence          -> FRESHNESS_UNCONFIRMED / QUORUM_UNAVAILABLE
2 agreeing witnesses in spike  -> WITNESS_CONFIRMED_THROUGH_N
```

## Green result

Observed distributed suite:

```text
TESTS   116
PASS    116
FAIL      0
```

`WIT-001..018` all pass.

## Privacy boundary

The witness model requires no:

```text
real tenant id
email content
bank/account identifiers
amount
merchant
category
financial event type
origin-device identity
financial payload ciphertext
Tenant Root Key
Recovery Private Key
```

Each witness receives an independently generated opaque log identifier. Timing/sequence/cadence remain metadata and are not claimed to be zero-leakage.

## Non-claims

This spike does not prove:

- production witness quorum/count;
- witness operator independence;
- availability under broad network partition;
- resistance to a colluding witness quorum;
- zero timing/cadence metadata leakage;
- globally latest state forever;
- physical Android/iOS anchor persistence;
- production witness retention/deletion policy.

## Decision

```text
OPAQUE WITNESS MODEL              PROVEN_AT_SPIKE
MONOTONIC WITNESS CONTINUITY      PROVEN_AT_SPIKE
CONTRADICTION-AWARE EVALUATION    PROVEN_AT_SPIKE
RELAY AS SOLE FRESHNESS ORACLE    REJECTED
SILENT FALLBACK ON OUTAGE         REJECTED
PRODUCTION WITNESS POLICY         OPEN
Q-005                             ACTIVE
BUILD_READY                       false
```
