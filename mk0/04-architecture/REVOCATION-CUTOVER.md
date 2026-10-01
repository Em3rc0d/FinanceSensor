# Q-005 — Authenticated Revocation Cutover

**Scope:** Q-005 load-bearing revocation contract  
**Status:** `PROVEN_AT_SPIKE` for bounded Node properties only  
**Production schema/crypto:** NOT FROZEN

## 1. Problem

Moving a tenant from key epoch `N` to `N+1` prevents a revoked device from receiving **new** tenant key material, but that alone does not make the device cryptographically silent.

A lost or compromised device may still possess:

```text
old Tenant Root Key epoch N
old device signing private key
old decrypted financial state
```

Without an explicit cutover commitment, that device could fabricate a new envelope after revocation while labeling it as historical epoch `N`. A receiver that still retains epoch `N` for legitimate historical replay could otherwise be unable to distinguish:

```text
legitimate delayed historical envelope
vs
newly fabricated stale-epoch envelope
```

Therefore:

> **Key rotation alone is not a complete future-access revocation model while historical keys remain replayable.**

## 2. Decision at spike level

FinanceSensor introduces an authenticated **Revocation Barrier**.

The barrier is signed by a still-authorized authority and commits the exact historical origin stream accepted for the revoked device at cutover.

```text
accepted historical envelopes from Device B
        ↓
validate tenant + origin + historical authorization + signatures
        ↓
require contiguous per-origin sequence through cutoff
        ↓
canonical ordered envelope digests
        ↓
history commitment
        ↓
Revocation Barrier signed by authorized Device A
```

Candidate barrier metadata:

```text
protocol_version
tenant_id
revoked_device_id
revoked_from_key_epoch
last_accepted_origin_sequence
history_commitment
authorizing_device_id
created_at
authorizer_signature
```

The barrier contains no financial payload plaintext.

## 3. Authority rules

A valid barrier requires all of:

```text
revoked DeviceAuthorization belongs to same tenant
revoked_from_epoch is explicit
barrier.revoked_device_id matches revoked record
barrier.revoked_from_epoch matches revoked record
authorizer belongs to same tenant
authorizer identity matches signing record
authorizer is authorized at the cutover epoch
authorizer != revoked device
barrier signature validates
```

A revoked device cannot certify its own historical cutoff.

## 4. Historical commitment rules

The bounded spike commits the ordered digest set:

```text
sequence 1 → digest(envelope 1)
sequence 2 → digest(envelope 2)
...
sequence K → digest(envelope K)
```

and hashes that canonical list together with:

```text
tenant_id
revoked_device_id
revoked_from_epoch
```

Properties:

- relay reordering does not change the commitment;
- exact duplicate delivery does not change the commitment;
- two different envelopes claiming the same origin sequence fail as a fork;
- a missing sequence before the cutoff fails as a gap;
- replacing an accepted historical envelope changes the commitment;
- appending a newly fabricated old-epoch envelope changes the cutoff/commitment;
- modifying the barrier cutoff/commitment invalidates the authorizer signature.

The production representation may use a reviewed hash chain, Merkle commitment, append-only checkpoint or equivalent structure. The Node digest-set construction is a property proof, not a frozen storage algorithm.

## 5. Cutover semantics

After the barrier is accepted:

```text
old-epoch envelope from revoked origin
        ↓
part of committed accepted history?
        ├─ YES → historical replay may remain admissible
        └─ NO  → FAIL CLOSED
```

A valid old device signature is no longer sufficient.

```text
OLD KEY + VALID SIGNATURE ≠ POST-CUTOVER AUTHORITY
```

## 6. Gap semantics

FinanceSensor must not claim a complete cutoff across an unresolved origin gap.

```text
known sequences: 1, 2, 4
missing: 3
        ↓
NO COMPLETE CUTOVER THROUGH 4
```

The system must either:

1. recover/validate the missing historical envelope before the barrier is finalized; or
2. explicitly freeze only a lower contiguous accepted prefix and accept that later omitted history will not become silently admissible after cutover.

Integrity wins over silently accepting late stale-epoch mutations.

## 7. Recovery interaction

All-devices-lost recovery adds a stronger final gate.

The existing lower-level recovery state proves:

```text
new tenant epoch
new Recovery Key
new device authorization
lost-device revocation
new-epoch RecoveryCoverage
```

That state is necessary but not sufficient for normal future sync.

The **load-bearing resume gate** additionally requires an authenticated Revocation Barrier for every lost device:

```text
POST-RECOVERY HARDENING
        +
REVOCATION BARRIER FOR EACH LOST DEVICE
        ↓
SAFE_TO_RESUME_FUTURE_SYNC
```

The newly recovered device may sign the barriers because it is a new identity authorized from `N+1` after locally recovering and validating the accepted historical state. It does not inherit a lost device identity.

## 8. Malicious relay model

The relay may:

```text
reorder
duplicate
drop
serve a substituted historical envelope
serve an old-epoch extension after revocation
tamper with cutoff metadata
```

The barrier protects integrity against substitution/extension/tampering. It does **not** solve Byzantine availability: a malicious relay can still withhold historical data.

FinanceSensor must not claim otherwise.

## 9. Privacy classification

`REVOCATION-CUTOVER-BARRIER` is cloud-visible signed authorization metadata.

It may reveal:

```text
revoked device identity
cutover epoch
last accepted origin sequence
cutover timing
history commitment
new authorizer identity
```

It does not require:

```text
amount
merchant
category
email content
financial event type
Tenant Root Key
Recovery Private Key
```

This metadata is now explicitly classified in `PRIVACY-RECOVERY-MATRIX.json`.

## 10. Executable bounded evidence

```text
REV-001 committed history tolerates reorder + exact duplicates
REV-002 revoked device cannot append a fabricated old-epoch envelope
REV-003 historical sequence substitution fails commitment
REV-004 cutoff/history tampering invalidates barrier signature
REV-005 revoked device cannot authorize its own cutover
REV-006 cross-tenant authorizer cannot validate barrier
REV-007 unresolved origin gap prevents complete cutover

REC-019 lower-level recovery hardening is not final resume authority
REC-020 all lost-device barriers permit safe resume
REC-021 missing one barrier blocks safe resume
REC-022 tampered barrier blocks safe resume
```

Evidence artifact:

`../10-evidence/EV-Q005-REVOCATION-CUTOVER-2026-09-01.md`

## 11. Invariant

This contract binds:

`INV-SYNC-012`

> Future-access revocation must prevent newly fabricated stale-epoch history from becoming admissible after cutover while preserving harmless replay/reordering of the already committed accepted history.

## 12. Non-claims

This spike does not prove:

- production append-only commitment implementation;
- real cloud authorization enforcement;
- secure server persistence of barrier metadata;
- physical Android/iOS revocation behavior;
- Byzantine availability;
- real long-offline reconciliation around cutover;
- penetration/side-channel resistance;
- release-grade recovery.

`Q-005` therefore remains `ACTIVE`.
