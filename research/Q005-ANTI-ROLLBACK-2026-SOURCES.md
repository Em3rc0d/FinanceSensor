# Q-005 Anti-Rollback / Trusted Checkpoint — Source Snapshot

**Date:** 2026-09-01  
**Purpose:** provenance for the bounded anti-rollback/trusted-checkpoint design. This file records external design inputs; it does not itself prove FinanceSensor properties.

## 1. The Update Framework — rollback/freeze threat terminology

Source: https://theupdateframework.io/docs/security/

Relevant design input:

- a **rollback attack** presents metadata/state older than a client has already seen;
- an **indefinite freeze attack** keeps presenting an already-seen valid state so the client remains unaware of later state;
- authenticity alone is therefore insufficient for freshness.

FinanceSensor mapping:

```text
signed/encrypted financial state
        !=
proof that the state is newest
```

A local client that remembers a newer trusted checkpoint can reject rollback. A fresh recovery client with no independent remembered head cannot infer freshness merely because all signatures verify.

## 2. RFC 9162 — Certificate Transparency v2

Source: https://www.rfc-editor.org/rfc/rfc9162.html

Relevant design input:

- append-only Merkle structures can prove consistency between a previously known tree head and a later tree head;
- clients/monitors can compare signed heads and consistency proofs;
- a misbehaving log can still attempt to show inconsistent views, which is why independent observation/monitoring matters.

FinanceSensor mapping:

```text
known trusted head A
        +
cryptographic consistency proof A → B
        ↓
B is an append-only extension of A
```

This does **not** by itself prove that B is the globally latest possible head.

## 3. RFC 6962 — earlier Certificate Transparency model

Source: https://www.rfc-editor.org/info/rfc6962/

Relevant design input:

- Merkle consistency proofs efficiently demonstrate that one log state extends another;
- comparing roots/heads helps expose equivocation;
- monitoring is a separate role from signature verification.

FinanceSensor does not copy Certificate Transparency's certificate/log product model. The useful property is the separation of:

```text
AUTHENTICITY
APPEND-ONLY CONSISTENCY
FRESHNESS / INDEPENDENT OBSERVATION
```

## 4. Design conclusion for MK0 spike

The bounded spike will test a deliberately weaker and truthful property:

> A client possessing an independent trusted checkpoint anchor can detect a cloud view that rolls back before, forks at, or breaks append-only continuity after that anchor.

The spike will **not** claim:

> A fresh all-devices-lost recovery client with no independent freshness anchor can prove that a valid server-provided head is the newest head that ever existed.

That stronger claim requires an independently retained/witnessed freshness anchor and is treated as a separate production decision.
