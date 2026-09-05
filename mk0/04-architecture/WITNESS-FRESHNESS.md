# Q-005 — Opaque Witness / Freshness Contract

**Owner node:** `Q-005` / `ACTIVE`  
**Decision maturity:** `PROPOSED / SPIKE REQUIRED`  
**Extends:** ADR-015 Trusted Checkpoint / Anti-Rollback

## Problem

ADR-015 proves rollback/fork/gap detection relative to an independently retained checkpoint anchor. It deliberately cannot prove that the relay supplied the newest checkpoint ever created.

A recovered client may know:

```text
anchor N
relay presents valid N
```

while a valid checkpoint N+1 existed but was withheld.

A stronger freshness signal requires an independent party that remembers checkpoint observations outside the relay's trust domain.

## Candidate role: Opaque Witness

A witness is **not**:

```text
financial truth authority
financial data processor
decryption service
recovery-key holder
user identity provider
```

It is a monotonic external memory for a pseudonymous checkpoint stream.

Candidate input:

```text
witness_log_id
checkpoint_sequence
checkpoint_hash
previous_checkpoint_hash
protocol_version
submission_authentication
```

Candidate output:

```text
WitnessReceipt
  witness_id
  witness_log_id
  checkpoint_sequence
  checkpoint_hash
  previous_checkpoint_hash
  observed_at
  signature
```

## Per-witness pseudonymity

FinanceSensor must not reuse the real tenant ID as witness log identity.

Candidate setup:

```text
Tenant T
  ├─ random witness_log_id_A → Witness A
  ├─ random witness_log_id_B → Witness B
  └─ random witness_log_id_C → Witness C
```

The identifiers are independently random so two witnesses cannot trivially correlate the same FinanceSensor tenant by log ID.

The witness must not require:

```text
FinanceSensor tenant_id
email address
bank/account identity
amount
merchant
category
financial event type
origin-device list
origin-head list
ciphertext financial payload
Tenant Root Key
Recovery Private Key
```

## Witness continuity

For one `witness_log_id`, the witness remembers its latest accepted head.

```text
first accepted head      → bootstrap rule / authenticated binding required
next sequence            → exactly previous + 1
previous hash            → exactly remembered hash
same sequence/same hash  → retry-equivalent
same sequence/diff hash  → witness fork rejection
sequence jump            → witness gap rejection
rollback sequence        → witness rollback rejection
```

The witness signs only state it accepted under this monotonic contract.

## Submission authentication

The witness needs a tenant-private **submission authority** without receiving financial decryption authority.

Bounded spike candidate:

```text
per-witness submission keypair
  private key → tenant-side trusted devices / recovery policy
  public key  → witness binding
```

The key is used only to authenticate checkpoint observation requests. It does not decrypt tenant data.

Production key lifecycle, rotation and recovery remain open until the spike exposes the consequences.

## Candidate witness policy

For the bounded spike only:

```text
configured witnesses = 3
confirmation threshold = 2
```

This is an evaluation parameter, not a production decision.

Client reads latest signed receipt from every reachable configured witness.

### Confirmation

```text
at least threshold witnesses
confirm same checkpoint_sequence + checkpoint_hash
and no valid configured witness presents contradictory evidence
        ↓
WITNESS_CONFIRMED_THROUGH_N
```

This means:

> enough configured independent witnesses observed checkpoint N.

It does **not** mean:

> N is cryptographically proven to be the latest checkpoint that could possibly exist.

### Witness behind presented checkpoint

A witness behind N does not prove N false; it simply does not confirm N yet.

If enough other witnesses confirm N and no contradictory evidence exists, candidate policy may confirm through N.

### Witness ahead of relay

```text
relay presents N
valid witness receipt says N+1 or later
        ↓
relay view cannot be declared fresh
        ↓
FRESHNESS_UNCONFIRMED / RELAY_BEHIND_WITNESS
```

The client should request the missing checkpoint chain. Until reconciled, it must not silently call N latest.

### Same sequence / different hash

```text
relay or one witness: sequence N / hash A
another valid witness: sequence N / hash B
        ↓
WITNESS_DIVERGENCE
        ↓
FRESHNESS_UNCONFIRMED
```

A quorum must not hide explicit contradictory valid evidence.

## Required result states

```text
WITNESS_CONFIRMED_THROUGH_N
FRESHNESS_UNCONFIRMED
RELAY_BEHIND_WITNESS
WITNESS_DIVERGENCE
WITNESS_QUORUM_UNAVAILABLE
INVALID_WITNESS_RECEIPT
```

No result state is named `PROVEN_GLOBALLY_LATEST`.

## Availability vs truth

Witness unavailability must not cause fallback to trusting the relay.

```text
witness quorum unavailable
        ↓
FRESHNESS_UNCONFIRMED
```

The user may still have locally usable previously verified financial state, but the system must distinguish that from witness-confirmed freshness.

## Recovery relationship

Candidate Recovery Kit extension:

```text
Recovery Kit
  ├─ Recovery Private Key
  ├─ TrustedCheckpointAnchor
  └─ witness policy/bindings required to query independent receipts
```

The Recovery Kit does not need witness private signing keys.

A fresh recovered device can compare relay state against:

```text
local Recovery Kit anchor
+
latest independently signed witness receipts
```

This can detect a relay view older than a head previously observed by enough configured witnesses.

## Security boundary

A witness can improve evidence only under explicit trust assumptions.

Candidate 2-of-3 assumption:

```text
at least threshold configured witnesses
are independently operated and do not collude with the relay
```

The spike must not turn that assumption into an absolute theorem.

## Privacy boundary

Witness metadata can reveal:

```text
checkpoint cadence
time of activity
sequence growth
stable pseudonymous log activity
```

Per-witness random IDs reduce cross-witness correlation but do not eliminate timing correlation.

A dedicated privacy class is required before this candidate can advance.

## Frozen spike acceptance criteria

The initial spike must prove at least:

```text
WIT-001 first authenticated witness binding
WIT-002 monotonic accepted advance
WIT-003 exact duplicate retry
WIT-004 rollback submission rejected by witness
WIT-005 same-sequence fork rejected by witness
WIT-006 sequence gap rejected by witness
WIT-007 wrong parent hash rejected by witness
WIT-008 invalid submission authority rejected
WIT-009 witness receipt signature tamper rejected
WIT-010 per-witness log IDs are distinct
WIT-011 2-of-3 same-head confirmation
WIT-012 one unavailable witness still allows 2-of-3 confirmation
WIT-013 only one confirming witness => no quorum
WIT-014 one witness ahead of relay => relay not confirmed fresh
WIT-015 same-sequence witness divergence => no freshness confirmation
WIT-016 stale witness behind head does not override two agreeing current witnesses
WIT-017 cross-binding/witness-log confusion rejected
WIT-018 zero reachable witnesses => no fallback to relay trust
```

Tests must be introduced against a deliberately weaker baseline so real missing protections appear red before repair.

## Non-claims

The spike will not prove:

```text
production independent operators
network-level independence
witness service availability SLO
witness key HSM protection
absence of traffic-analysis correlation
absolute globally latest state
production quorum number
```

It tests protocol semantics only.
