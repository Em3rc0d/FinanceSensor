# ADR-015 — Trusted Checkpoint / Anti-Rollback Model

**Owner node:** `Q-005` / `ACTIVE`  
**Decision maturity:** `SPIKE-ACCEPTED / PRODUCTION WITNESS DECISION REQUIRED`  
**Date:** 2026-09-01

## Context

The Q-005 knee-stress campaign proved that FinanceSensor can reject tampering, stale-epoch extension, replay-identity forks, origin-sequence forks and cross-tenant materialization in the bounded model.

It also exposed a stronger distributed-systems question:

> After all previous devices are lost, how can a fresh recovery device detect that a relay is presenting an older but still validly signed state?

Signatures prove authenticity. They do not prove newest-state freshness.

A dedicated red→green anti-rollback spike now demonstrates anchor-relative rollback/fork/gap detection while preserving the stronger freshness limitation honestly.

## Decision drivers

- financial truth must not silently roll backward;
- the cloud relay must not become decryption or sole freshness authority;
- a malicious/stale relay must not be able to turn an older valid state into an implicitly trusted `LATEST` state;
- all-devices-lost recovery must state uncertainty honestly;
- exact duplicate transport must remain harmless;
- checkpoint metadata leakage must remain bounded and explicit.

## Options considered

### A. Trust the relay's highest advertised sequence

Rejected.

A malicious/stale relay controls that value and can simply advertise an older head.

### B. Signed checkpoint chain only

Insufficient by itself.

A signed hash-chain detects tampering/forks relative to a previously known head, but a fresh client can still be shown an older intact chain.

### C. Independent trusted anchor + signed append-only checkpoint chain

**Accepted at bounded spike level.**

A client retains a trusted checkpoint identity outside the relay-only trust domain. Presented state must cryptographically extend that anchor.

### D. Claim globally latest state from cryptography alone after every independent anchor is lost

Rejected as an invalid claim.

Without an independent remembered/witnessed head, a fresh client cannot distinguish a legitimately final old head from a withheld newer tail.

## Accepted bounded decision

FinanceSensor models three distinct concepts:

```text
SignedCheckpoint
TrustedCheckpointAnchor
CheckpointVerificationResult
```

A signed checkpoint authenticates tenant state continuity. An anchor establishes the minimum independently trusted point from which rollback/fork verification begins. The verification result preserves uncertainty rather than collapsing it into a boolean.

The accepted spike-level guarantee is:

> A presented state can be accepted as an authenticated append-only extension of an independently trusted anchor, while rollback, fork, cross-tenant advance and continuity gaps fail closed.

It is **not**:

> The presented state is proven to be globally latest.

## Required semantics

```text
presented head < anchor sequence
→ ROLLBACK_DETECTED / fail closed

same sequence + different authentic hash
→ FORK_DETECTED / fail closed

anchor sequence + different authentic hash
→ ANCHOR FORK / fail closed

missing intermediate sequence
→ GAP_DETECTED / fail closed

previous hash mismatch
→ CONTINUITY FAILURE / fail closed

invalid/cross-tenant/unauthorized signer
→ INVALID AUTHORITY / fail closed

no independent anchor
→ INDETERMINATE_FRESHNESS

valid chain from anchor
→ CONSISTENT_FROM_ANCHOR
  + latestGlobalFreshness = UNPROVEN
```

Exact duplicate delivery of the same checkpoint remains idempotent.

## Recovery consequence

The logical Recovery Kit gains a checkpoint-anchor role:

```text
Recovery Kit
  ├─ Recovery Private Key
  └─ TrustedCheckpointAnchor
```

The checkpoint anchor does not need to reveal financial plaintext. Its freshness and physical protection remain product/security obligations.

A Recovery Kit anchor at checkpoint N protects against silent rollback/fork before N. It cannot prove that a relay has not withheld a later valid tail N+1..M.

## Red→green evidence

Evidence artifact:

`../10-evidence/EV-Q005-ANTI-ROLLBACK-2026-09-01.md`

Red authenticity-only head:

`c8dec1d43e76c779cfdccd2f078a0e9698ff8f64`

Observed red result:

```text
98 total distributed tests
90 pass
8 fail
```

The eight failures were the intended anti-rollback gaps: rollback behind anchor, checkpoint-sequence fork, parent-hash mismatch, sequence gap, cross-tenant chain, fast-forward, no-anchor false confidence and anchor equivocation.

Green head:

`dbfd21c01be7352087ce4bf2a06a8922b68c8c8c`

Observed green result:

```text
ARB-001..014        14 / 14 PASS
full E2EE suite     98 / 98 PASS
MK0 Foundation       3 / 3 PASS
Heartbeat                 SUCCESS
```

## Consequences

Positive:

- old but valid relay state can be rejected when it falls behind an independently known anchor;
- checkpoint fork/gap semantics are explicit;
- recovery uncertainty is represented instead of hidden;
- the relay remains storage/transport rather than sole truth authority;
- the API never calls a merely consistent relay view globally latest.

Costs:

- checkpoint state and anchors must be persisted atomically;
- recovery material gains another security-sensitive component;
- metadata leakage increases;
- strong all-devices-lost latest-state freshness still requires an independently fresh anchor/witness mechanism or a deliberate product limitation.

## Security/privacy impact

Checkpoint metadata is security-sensitive even when opaque financially. Production design must minimize and classify tenant ID, checkpoint sequence, epoch, origin heads, timing and commitments.

Privacy class:

`TRUSTED-CHECKPOINT-METADATA`

The authoritative anchor must exist outside the relay-only trust domain.

## Data-model impact

Logical addendum:

`../05-data-model/TRUSTED-CHECKPOINT-MODEL.md`

Candidate entities:

```text
SignedCheckpoint
TrustedCheckpointAnchor
CheckpointVerificationResult
```

## Invariants

The bounded decision is represented by:

```text
INV-SYNC-016
INV-SYNC-017
```

Both may be `PROVEN_AT_SPIKE` once the final reconciled graph/CI head passes. They are not release-grade `PROVEN` while Q-005/SEC-001/DM-001 remain open.

## Production decision still open

ADR-015 does **not** yet freeze:

- Merkle tree vs hash chain vs another reviewed append-only structure;
- independent witness/transparency service, if any;
- Recovery Kit anchor refresh UX/cadence;
- Android/iOS protected anchor storage;
- atomic crash-safe anchor advancement;
- globally latest Byzantine freshness semantics;
- checkpoint retention/deletion policy;
- production metadata leakage budget.

## Revalidation trigger

Reopen this decision if production evidence shows that:

- the chosen anchor can be silently rolled back by the platform/cloud path;
- checkpoint advancement is not atomic with durable state;
- cross-device implementations disagree on canonical checkpoint bytes/hash;
- the proposed witness/freshness mechanism changes the trust boundary;
- privacy leakage is materially larger than the current model.

## Decision

```text
ANCHOR-RELATIVE ANTI-ROLLBACK      SPIKE-ACCEPTED
SIGNED CHECKPOINT CONTINUITY       SPIKE-ACCEPTED
NO-ANCHOR FRESHNESS                INDETERMINATE
GLOBAL-LATEST FRESHNESS            NOT PROVEN
RELAY AS SOLE TRUST ANCHOR         REJECTED
PRODUCTION WITNESS/FRESHNESS       OPEN DECISION
Q-005                              ACTIVE
BUILD_READY                        false
```
