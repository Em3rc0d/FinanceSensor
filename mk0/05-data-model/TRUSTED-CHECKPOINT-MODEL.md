# DM-001 Addendum — Trusted Checkpoint / Anti-Rollback Logical Model

**Owner:** `DM-001`, `Q-005`  
**Status authority:** `graph/closure-ledger.json`  
**Physical schema:** NOT FROZEN  
**Decision:** ADR-015

This addendum defines the logical records introduced by the Q-005 Anti-Rollback / Trusted Checkpoint spike. It must be reconciled into the final physical data model before DM-001 can close.

## 1. SignedCheckpoint

Authenticated summary of one tenant state boundary.

```text
id
tenant_id
checkpoint_sequence        monotonic positive integer
key_epoch
previous_checkpoint_hash?  null only at protocol genesis/bounded bootstrap
state_commitment
origin_heads[]             { origin_device_id, highest_sequence }
authorizing_device_id
created_at
checkpoint_hash
authorizer_signature
status                     ACTIVE | SUPERSEDED | INVALID
```

The checkpoint does not contain required plaintext amount, merchant, category, email content or financial event type.

### Identity

Within one tenant:

```text
(tenant_id, checkpoint_sequence)
```

is one logical checkpoint slot.

Two different authentic `checkpoint_hash` values for the same slot are an explicit fork/equivocation, not last-write-wins.

Exact repeated delivery of the same checkpoint is idempotent.

## 2. TrustedCheckpointAnchor

Independent minimum accepted checkpoint identity.

```text
tenant_id
checkpoint_sequence
checkpoint_hash
anchor_domain             DEVICE_PROTECTED | RECOVERY_KIT | FUTURE_WITNESS
recorded_at
```

The critical property is not the record shape but its trust domain:

```text
authoritative anchor
MUST NOT exist only in the relay-controlled copy
```

A cloud copy may assist transport/recovery, but relay-only storage cannot establish anti-rollback freshness against that relay.

Candidate recovery relationship:

```text
Recovery Kit
  ├─ Recovery Private Key
  └─ TrustedCheckpointAnchor
```

The Recovery Kit anchor is a floor, not proof of globally latest state.

## 3. CheckpointVerificationResult

Local derived result. This must not collapse uncertainty into boolean `valid`.

```text
tenant_id
anchor_sequence?
anchor_hash?
latest_seen_sequence
latest_seen_hash?
consistency_status
latest_global_freshness
verified_at
failure_code?
```

Candidate enums:

```text
consistency_status
  CONSISTENT_FROM_ANCHOR
  INDETERMINATE_FRESHNESS
  ROLLBACK_DETECTED
  FORK_DETECTED
  GAP_DETECTED
  INVALID_AUTHORITY

latest_global_freshness
  UNPROVEN
```

MK0 must not introduce `PROVEN_LATEST` unless a later reviewed independent witness protocol genuinely supports that claim.

## 4. Continuity contract

Given independent anchor `A` at sequence N:

```text
checkpoint N+1.previous_hash = A.hash
checkpoint N+2.previous_hash = checkpoint N+1.hash
...
```

Every accepted extension requires:

```text
same tenant
+
checkpoint sequence exactly previous + 1
+
previous_checkpoint_hash exactly previous accepted hash
+
checkpoint body/hash integrity
+
authorized signer for checkpoint tenant + key epoch
```

Failure modes:

```text
presented head < anchor               → ROLLBACK
same sequence / different hash        → FORK
anchor sequence / different hash      → ANCHOR FORK
sequence jump                         → GAP
wrong parent hash                     → FORK/CONTINUITY FAILURE
cross-tenant checkpoint               → INVALID / FAIL CLOSED
unauthorized signer                   → INVALID AUTHORITY
```

## 5. Freshness contract

Authentication and continuity do not prove that the relay supplied every later checkpoint.

```text
anchor 9
relay returns valid 10
real state once reached 12
```

The client can prove:

```text
10 extends 9
```

It cannot prove from that view alone:

```text
11 and 12 do not exist
```

Therefore:

```text
CONSISTENT_FROM_ANCHOR
+
latest_global_freshness = UNPROVEN
```

is a valid stable state.

Without an independent anchor:

```text
INDETERMINATE_FRESHNESS
```

is mandatory even when every presented signature verifies.

## 6. Recovery relationship

All-devices-lost recovery now has two distinct security dimensions:

```text
RECOVERY KEY AUTHORITY
  can the user decrypt retained tenant epochs?

CHECKPOINT ANCHOR
  what minimum tenant state can the recovered client independently insist on?
```

Having the Recovery Private Key does not itself establish checkpoint freshness.

A Recovery Kit with an anchor at N protects against rollback before N, but an unseen tail after N may still be withheld. Stronger latest-state freshness requires an independent anchor refresh/witness decision.

## 7. Privacy mapping

Logical data maps to:

```text
TRUSTED-CHECKPOINT-METADATA
```

Cloud-visible minimized signed fields may include:

```text
tenant opaque identifier
checkpoint sequence
key epoch
previous checkpoint hash
state commitment
origin device identifiers / highest sequences
authorizer device identifier
created_at
signature
```

The authoritative anchor must exist outside the relay-only trust domain.

## 8. Invariants

This addendum is governed by:

```text
INV-SYNC-016
INV-SYNC-017
```

and reuses tenant/authority protections from:

```text
INV-TEN-005
INV-SYNC-003
INV-SYNC-013
INV-SYNC-014
```

## 9. Executable evidence

```text
spikes/e2ee-sync/src/checkpoint.js
spikes/e2ee-sync/test/checkpoint.test.js
mk0/10-evidence/EV-Q005-ANTI-ROLLBACK-2026-09-01.md
```

Observed bounded green result:

```text
ARB-001..014       14 / 14 PASS
full E2EE suite    98 / 98 PASS
```

## 10. Physical blockers

Do not freeze checkpoint tables/storage until these remain decided and evidenced:

```text
production append-only structure / commitment
atomic checkpoint + anchor persistence
Android protected anchor storage
Apple protected anchor storage
Recovery Kit anchor export/import
anchor refresh cadence
crash/restart semantics
retention/deletion semantics
metadata leakage budget
independent witness strategy, if required for stronger freshness
```

This addendum proves a bounded logical anti-rollback property. It is not a production transparency system.
