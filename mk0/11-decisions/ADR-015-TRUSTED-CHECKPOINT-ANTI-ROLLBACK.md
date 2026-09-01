# ADR-015 — Trusted Checkpoint / Anti-Rollback Model

**Owner node:** `Q-005` / `ACTIVE`  
**Decision maturity:** `PROPOSED / SPIKE REQUIRED`  
**Date:** 2026-09-01

## Context

The Q-005 knee-stress campaign proved that FinanceSensor can reject tampering, stale-epoch extension, replay-identity forks, origin-sequence forks and cross-tenant materialization in the bounded model.

It also exposed a stronger unsolved question:

> After all previous devices are lost, how can a fresh recovery device detect that a relay is presenting an older but still validly signed state?

Signatures prove authenticity. They do not prove newest-state freshness.

## Decision drivers

- financial truth must not silently roll backward;
- the cloud relay must not become decryption authority;
- a malicious/stale relay must not be able to turn an older valid state into an implicitly trusted `LATEST` state;
- all-devices-lost recovery must state uncertainty honestly;
- exact duplicate/reordered transport must remain harmless;
- checkpoint metadata leakage must remain bounded and explicit.

## Options considered

### A. Trust the relay's highest advertised sequence

Rejected.

A malicious/stale relay controls that value and can simply advertise an older head.

### B. Signed checkpoint chain only

Insufficient by itself.

A signed hash-chain detects tampering/forks relative to a previously known head, but a fresh client can still be shown an older intact chain.

### C. Independent trusted anchor + signed append-only checkpoint chain

**Selected for bounded spike.**

A client retains a trusted checkpoint identity outside the relay-only trust domain. Presented state must cryptographically extend that anchor.

### D. Claim globally latest state from cryptography alone after every independent anchor is lost

Rejected as an invalid claim.

Without an independent remembered/witnessed head, a fresh client cannot distinguish a legitimately final old head from a withheld newer tail.

## Candidate decision

FinanceSensor will model two separate objects:

```text
SignedCheckpoint
TrustedCheckpointAnchor
```

A signed checkpoint authenticates tenant state continuity. An anchor establishes the minimum independently trusted point from which rollback/fork verification begins.

The candidate verification guarantee is:

> A presented state can be accepted as an append-only extension of an independently trusted anchor.

It is **not**:

> The presented state is proven to be globally latest.

## Required semantics

```text
checkpoint.sequence < anchor.sequence
→ ROLLBACK_DETECTED

same sequence + different hash
→ FORK_DETECTED

missing intermediate sequence
→ GAP_DETECTED

previous hash mismatch
→ FORK_DETECTED

invalid/cross-tenant/unauthorized signer
→ INVALID_AUTHORITY

no independent anchor
→ INDETERMINATE_FRESHNESS

valid chain from anchor
→ CONSISTENT_FROM_ANCHOR
  + latestGlobalFreshness = UNPROVEN
```

## Recovery consequence

The logical Recovery Kit gains a candidate checkpoint-anchor role:

```text
Recovery Kit
  ├─ Recovery Private Key
  └─ TrustedCheckpointAnchor
```

The checkpoint anchor does not need to reveal financial plaintext. Its freshness and physical protection remain product/security obligations.

## Consequences

Positive:

- old but valid relay state can be rejected when it falls behind an independently known anchor;
- fork/gap semantics become explicit;
- recovery uncertainty is represented rather than hidden;
- the relay remains storage/transport, not truth authority.

Costs:

- checkpoint state must be persisted atomically;
- recovery material gains another security-sensitive component;
- metadata leakage increases;
- strong all-devices-lost latest-state freshness still requires an independently fresh anchor/witness.

## Security/privacy impact

Checkpoint metadata is security-sensitive even when opaque financially. Production design must minimize and classify tenant ID, checkpoint sequence, epoch, origin heads, timing and commitments.

## Data-model impact

Candidate entities:

```text
SignedCheckpoint
TrustedCheckpointAnchor
CheckpointVerificationResult
```

## Test/evidence required

- adversarial red-before-green checkpoint suite;
- independent-anchor rollback detection;
- fork/gap/authority/tenant isolation tests;
- explicit no-anchor indeterminate-freshness test;
- evidence artifact under `mk0/10-evidence/`;
- traceability wiring before `SPIKE-ACCEPTED`.

## Production decision still open

This ADR does not yet choose:

- Merkle tree vs hash chain vs another reviewed append-only structure;
- independent witness service;
- Recovery Kit refresh UX/cadence;
- platform secure-storage implementation;
- globally latest Byzantine freshness semantics.

Those require the spike plus threat-model/cost/privacy review.
