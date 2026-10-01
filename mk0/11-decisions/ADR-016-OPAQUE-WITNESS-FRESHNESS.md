# ADR-016 — Opaque Witness Freshness

**Status:** SPIKE-ACCEPTED / PRODUCTION WITNESS POLICY OPEN  
**Date:** 2026-09-01

## Context

ADR-015 proved anchor-relative anti-rollback, but a fresh or recovered device cannot infer global freshness from a valid signed chain alone. A relay may present an authentic older prefix while withholding a later valid tail.

```text
AUTHENTIC + APPEND-ONLY
        !=
GLOBALLY LATEST
```

FinanceSensor therefore needs an independent memory of checkpoint progress without turning that service into a holder of financial truth.

## Decision drivers

- no financial plaintext outside the edge;
- no server-held tenant decryption authority;
- detect rollback, fork, gap and relay-behind conditions;
- avoid one cloud operator becoming the sole freshness oracle;
- preserve explicit uncertainty when independent evidence is unavailable;
- minimize cross-service tenant correlation.

## Options considered

### A. FinanceSensor relay as sole checkpoint authority

Rejected. A relay cannot independently prove that the view it serves is not stale.

### B. Recovery Kit as the only refreshed checkpoint anchor

Useful as an offline recovery anchor, but insufficient as the only routine freshness mechanism because the kit may not be refreshed frequently.

### C. Independent opaque witnesses

Accepted at spike level. Each witness remembers a pseudonymous monotonic checkpoint stream and signs receipts. It never receives financial plaintext or decryption keys.

## Decision

FinanceSensor models independent witnesses with per-witness pseudonymous log identifiers.

Candidate submission:

```text
witness_log_id
checkpoint_sequence
checkpoint_hash
previous_checkpoint_hash
protocol_version
submission_authentication
```

Candidate receipt:

```text
witness_id
witness_log_id
checkpoint_sequence
checkpoint_hash
previous_checkpoint_hash
observed_at
protocol_version
witness_signature
```

The witness does not need:

```text
real tenant id
email / bank / account identifiers
amount / merchant / category
financial event type
origin-device identities / origin heads
financial payload ciphertext
Tenant Root Key
Recovery Private Key
```

### Witness continuity

```text
first authenticated sequence = 1, parent = null
next sequence = previous + 1
parent hash = remembered checkpoint hash
same sequence + same semantic head = retry-equivalent
same sequence + different hash = fork / reject
lower sequence = rollback / reject
sequence jump = gap / reject
```

### Bounded quorum policy

The executable spike uses three witnesses with a two-witness threshold strictly as a test configuration.

```text
2 agreeing current receipts + no contradictory valid evidence
→ WITNESS_CONFIRMED_THROUGH_N

valid witness ahead of relay
→ RELAY_BEHIND_WITNESS

same-sequence valid hash divergence
→ WITNESS_DIVERGENCE

insufficient reachable evidence
→ FRESHNESS_UNCONFIRMED or WITNESS_QUORUM_UNAVAILABLE
```

The 2-of-3 value is **not** frozen as production policy.

## Security law

```text
WITNESS CONFIRMATION THROUGH N
        !=
PROOF OF GLOBAL LATEST FOREVER
```

Witness evidence can prove that independent parties observed at least a particular checkpoint. It does not prove future availability or prevent all collusion/partition scenarios.

A witness outage never permits silent fallback to trusting the relay as globally fresh.

## Privacy impact

Each witness receives a random identifier independent of the real tenant identifier and independent of identifiers used with other witnesses.

Checkpoint timing, sequence and cadence remain metadata leakage. Production design must quantify retention, access logging, correlation and deletion requirements.

## Data-model impact

Logical concepts:

- `WitnessBinding`
- `WitnessCheckpointSubmission`
- `WitnessReceipt`
- `WitnessFreshnessEvaluation`

These remain logical MK0 entities until DM-001 freeze.

## Evidence

Executable implementation:

- `spikes/e2ee-sync/src/witness.js`
- `spikes/e2ee-sync/test/witness.test.js`

Observed campaign:

```text
weak authenticity-only witness    109 / 116 PASS
new red assertions                  7
hardened distributed suite        116 / 116 PASS
```

The seven red assertions were the missing protections for rollback, same-sequence fork, sequence gap, parent mismatch, relay-behind evidence, witness divergence and configured receipt/log confusion.

## Production blockers

ADR-016 does not freeze:

- witness vendor/operator;
- witness count or quorum threshold;
- witness protocol/library;
- witness availability SLA;
- anti-correlation deployment topology;
- offline Recovery Kit checkpoint refresh cadence;
- Android/iOS protected anchor persistence;
- atomic checkpoint/witness advancement;
- retention/deletion policy;
- globally latest Byzantine availability semantics.

## Decision boundary

```text
OPAQUE INDEPENDENT WITNESS MODEL   SPIKE-ACCEPTED
RELAY AS SOLE FRESHNESS ORACLE     REJECTED
SILENT FALLBACK ON WITNESS OUTAGE  REJECTED
2-OF-3 PRODUCTION QUORUM            NOT FROZEN
GLOBAL-LATEST CLAIM                REJECTED
Q-005                              ACTIVE
BUILD_READY                        false
```
