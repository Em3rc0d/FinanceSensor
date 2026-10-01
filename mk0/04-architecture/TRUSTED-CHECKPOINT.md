# Q-005 — Trusted Checkpoint / Anti-Rollback Contract

**Owner node:** `Q-005` / `ACTIVE`  
**Decision maturity:** `PROPOSED / SPIKE REQUIRED`  
**Scope:** rollback/freeze detection for encrypted multi-device state and all-devices-lost recovery.

## Problem

FinanceSensor already authenticates encrypted envelopes and freezes revoked-origin history. That protects integrity of state the client actually sees.

It does not solve this attack:

```text
valid history existed through checkpoint 12
        ↓
all previous devices are lost
        ↓
relay returns only valid history through checkpoint 9
        ↓
all signatures verify
```

A fresh recovery device cannot conclude that checkpoint 9 is latest merely because it is authentic.

## Security separation

```text
AUTHENTICITY
  was this checkpoint created by an authorized signer?

APPEND-ONLY CONSISTENCY
  does this checkpoint extend a previously trusted checkpoint without fork/gap?

FRESHNESS
  is this the newest checkpoint that ever existed?
```

These are different properties.

## Candidate checkpoint certificate

A checkpoint is an authenticated summary of one tenant state boundary:

```text
protocol
tenant_id
checkpoint_sequence
key_epoch
previous_checkpoint_hash
state_commitment
origin_heads
authorizing_device_id
created_at
signature
```

`origin_heads` records the highest accepted origin sequence per device for the bounded state being certified. Financial payload remains outside cloud-visible checkpoint semantics; the checkpoint carries commitments and routing/security metadata, not amount/merchant/category plaintext.

## Candidate trusted anchor

A `TrustedCheckpointAnchor` is an independently retained minimum accepted checkpoint identity:

```text
tenant_id
checkpoint_sequence
checkpoint_hash
```

Possible storage domains:

```text
continuity device
  → protected local storage

Recovery Kit
  → user-held/offline recovery material

future independent witness
  → separately reviewed decision
```

The relay may store a copy, but a relay-only copy is not an independent anchor.

## Verification contract

Given trusted anchor `A` and presented checkpoint chain `A+1 .. B`:

```text
1. tenant must match A
2. every checkpoint signer must be authorized for its tenant/key epoch
3. sequence must advance monotonically by exactly one
4. previous_checkpoint_hash must equal the prior accepted checkpoint hash
5. same sequence cannot map to two different checkpoint hashes
6. checkpoint body/signature tampering fails closed
7. cross-tenant checkpoint material fails closed
```

Successful verification proves:

```text
B is a valid append-only extension of A
```

It does **not** prove:

```text
B is the newest checkpoint that ever existed
```

## Required result states

The API must not collapse uncertainty into boolean success.

```text
CONSISTENT_FROM_ANCHOR
ROLLBACK_DETECTED
FORK_DETECTED
GAP_DETECTED
INVALID_AUTHORITY
INDETERMINATE_FRESHNESS
```

`INDETERMINATE_FRESHNESS` is mandatory when no independent anchor exists.

A chain that is valid through the newest checkpoint *presented by the relay* may still carry:

```text
latestKnownConsistent = true
latestGlobalFreshness = UNPROVEN
```

## All-devices-lost recovery

The Recovery Kit candidate is extended conceptually with a checkpoint anchor.

```text
Recovery Kit
  ├─ Recovery Private Key
  └─ TrustedCheckpointAnchor
```

This anchor protects only through the checkpoint it records.

If the Recovery Kit anchor is checkpoint 9 and valid state later reached 12, a malicious relay may still hide 10..12 and present exactly 9. The recovered device can prove it has not been rolled back **before 9**, but cannot prove no later checkpoint existed.

Therefore:

```text
RECOVERY ANCHOR FRESHNESS
        =
A PRODUCT/OPERATIONAL SECURITY PROPERTY
```

not something signatures can manufacture after all independent state is gone.

## Freeze-attack rule

A relay repeatedly presenting the same trusted head is not automatically a rollback violation. It may be offline/stale or may be withholding newer state.

The client must represent this separately:

```text
cryptographically consistent
+
freshness unproven
```

No false `LATEST` state is allowed.

## Explicit impossibility boundary

If all of the following are true:

```text
all trusted devices lost
no user-held checkpoint newer than X
no independent witness newer than X
relay is the only source of state
```

then a fresh client cannot cryptographically distinguish:

```text
"X really was latest"
```

from:

```text
"relay hid valid X+1..N"
```

FinanceSensor must fail honestly into `INDETERMINATE_FRESHNESS` rather than claim Byzantine freshness.

## Privacy impact

Checkpoint metadata may reveal:

```text
tenant opaque identifier
checkpoint cadence/timing
key epoch
origin device identifiers
highest origin sequences
ciphertext/state activity cadence
```

It must not reveal normal financial payload plaintext.

A dedicated privacy class is required before release-grade use.

## Spike acceptance target

Before this design may become `SPIKE-ACCEPTED`, executable tests must prove at least:

```text
valid anchored advance
exact duplicate tolerance
rollback below anchor rejection
fork at same sequence rejection
broken previous-hash rejection
sequence gap rejection
signature/body tamper rejection
unauthorized signer rejection
cross-tenant rejection
fast-forward/gap rejection
no-anchor => INDETERMINATE_FRESHNESS
valid frozen head => freshness remains UNPROVEN
```

The spike is not production transparency infrastructure and is not authorization to close Q-005.
