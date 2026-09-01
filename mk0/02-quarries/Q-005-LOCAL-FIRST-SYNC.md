# Q-005 — Local-first E2EE Multi-device Synchronization

**Priority:** P0  
**Status:** ACTIVE

## Question

How can several authorized phones share one tenant's financial truth while the cloud remains unable to interpret plaintext financial content — and while mobile background behavior remains calm, battery-aware, offline-tolerant and recoverable?

## Current finding

Q-005 is a coupled system of four load-bearing concerns:

```text
PERIPHERAL NERVOUS SYSTEM
  tenant-scoped + epoch-scoped device authority
  tenant keys
  authenticated key wrapping
  encrypted envelopes
  immutable replay identity
  convergence
  revocation
  authenticated cutover

PARASYMPATHETIC SYSTEM
  rest
  OS-cooperative background execution
  backoff
  offline tolerance
  battery/resource limits
  crash-safe checkpointing

RECOVERY SYSTEM
  all-devices-lost recovery
  user-held Recovery Kit
  authenticated RecoveryCoverage
  tenant/recovery-key rotation
  complete lost-device inventory
  revoked-origin history freeze
  final safe-to-resume gate

DISTRIBUTED CONFLICT SYSTEM
  no global last-write-wins
  explicit correction conflicts
  explicit resolution conflicts
  tenant-isolated materialization
```

A secure protocol that corrupts state under replay is unacceptable. A convergent protocol that exposes financial plaintext is unacceptable. A recovery path that silently preserves a lost device's authority is unacceptable. A battery-friendly scheduler that relaxes correctness is unacceptable.

Detailed contracts:

- `../04-architecture/PERIPHERAL-NERVOUS-SYSTEM.md`
- `../04-architecture/PARASYMPATHETIC-SYNC.md`
- `../04-architecture/REVOCATION-CUTOVER.md`
- `../11-decisions/ADR-014-RECOVERY-WITHOUT-SERVER-MASTER-KEY.md`

## Ownership model

```text
Tenant owns financial truth
        ↓
Device is an execution identity
        ↓
DeviceAuthorization is tenant + epoch scoped
        ↓
Connection belongs to Tenant
        ↓
ProcessingLease only coordinates work
```

`Device != Tenant` remains non-negotiable.

A valid device signature or matching `device_id` is not sufficient authority. The identity must be authorized for the same tenant and key epoch.

## Cloud / edge contract

The cloud is an opaque relay/control plane, not the holder of financial truth.

Cloud-visible routing metadata may include minimized fields such as:

```text
event_id
tenant_id opaque identifier
origin_device_id
origin_device_sequence
key_epoch
schema_version
created_at / relay order
ciphertext framing + size
signature
```

The normal sync path does not require plaintext:

```text
amount
merchant
category
financial event type
email subject/body
insight/opportunity
Tenant Root Key
Recovery Private Key
```

E2EE does not mean zero metadata. Timing, device membership, epoch rotation and ciphertext sizes remain part of the privacy threat model.

## Key authority

The bounded spike enforces:

```text
VALID KEY AUTHORITY =
  exact authorizer identity
+ exact recipient identity
+ same tenant
+ authorized key epoch
+ valid authorization window
+ authenticated context/signature
```

`KEY-001..005` cover identity binding, revoked-authorizer rejection, recipient re-check, cross-tenant origin rejection and cross-tenant key-recipient rejection.

Production key wrapping remains subject to a reviewed implementation/library. The Node composition is feasibility evidence, not production cryptography.

## Immutable sync identity

The knee stress campaign demonstrated that replay identity must not behave like a mutable map slot.

The current spike rule is:

```text
same event_id
+ same immutable header/action
→ exact retry / idempotent

same event_id
+ different immutable header/action
→ FAIL CLOSED
```

A second identity axis is also frozen:

```text
(tenant_id, origin_device_id, origin_device_sequence)
→ exactly one event identity
```

Two distinct event IDs cannot occupy the same origin sequence for one tenant/device, even when their economic payloads happen to be identical.

Equal sequence numbers on **different** origin devices remain independent.

This is `INV-SYNC-013`.

## Tenant-isolated materialization

One materialization pass belongs to one tenant.

```text
Tenant A decoded actions
        +
Tenant B decoded actions
        ↓
MIXED TENANT INPUT
        ↓
FAIL CLOSED
```

A caller cannot accidentally or maliciously combine two tenants into one canonical/correction projection.

This is `INV-SYNC-014`.

## Conflict semantics

FinanceSensor rejects global last-write-wins for user financial truth.

### Concurrent corrections

```text
same target
+ same base revision
+ incompatible values
        ↓
CATEGORY_CORRECTION_CONFLICT
        ↓
no hidden winner
```

### Concurrent resolutions

The stress campaign found that conflict **resolution** must itself be conflict-safe.

```text
two resolutions
+ same target/base revision
+ different selected corrections
        ↓
CATEGORY_RESOLUTION_CONFLICT
        ↓
no hidden winner
```

A resolution pointing outside the known candidate set becomes `CATEGORY_RESOLUTION_INVALID` and does not mutate authoritative category state.

Multiple concurrent resolutions selecting the same correction are retry-equivalent and converge.

This is `INV-SYNC-015`.

## Device revocation

Basic future-key revocation is necessary but insufficient:

```text
revoke B from N+1
        ↓
rotate Tenant Root Key to N+1
        ↓
B cannot receive N+1
```

A lost device may still possess epoch N material and its signing private key. Without a cutover, it could create a cryptographically valid envelope later while labeling it as historical epoch N.

Therefore:

```text
VALID OLD SIGNATURE + OLD KEY
        ≠
POST-CUTOVER HISTORICAL AUTHORITY
```

## Revocation Barrier

Before old-epoch envelopes from a revoked origin are accepted as immutable history, a still-authorized authority freezes the accepted historical stream.

Candidate barrier binds:

```text
tenant_id
revoked_device_id
revoked_from_epoch
last_accepted_origin_sequence
history_commitment
authorizing_device_id
signature
```

The bounded model requires:

```text
contiguous origin sequence
unique event_id semantics
unique origin sequence semantics
valid historical signatures
epoch < revocation epoch
exact history commitment
```

It rejects:

```text
post-cutover old-epoch extension
historical substitution
sequence forks
event_id reuse
known sequence gaps
cross-tenant authority
revoked-device self-cutover
barrier tampering
```

Exact duplicate delivery and transport reordering of the already committed set remain harmless.

This is `INV-SYNC-012`.

## All-devices-lost recovery

ADR-014 remains the logical decision:

```text
SERVER MASTER KEY         REJECTED
PASSWORD-ONLY RECOVERY    REJECTED FOR MK0
ASYMMETRIC RECOVERY KEY   SPIKE-ACCEPTED
Recovery Private Key      USER-HELD / OFFLINE
PER-EPOCH RECOVERY WRAP   REQUIRED
```

RecoveryCoverage is not inferred merely because ciphertext exists. It requires authenticated tenant/epoch/Recovery-Key/authorizer binding and one non-ambiguous distinct authority for the declared epoch.

## Complete lost-device inventory

The knee campaign added a stronger recovery rule:

> Every tenant device that still had authority at the **last recovered epoch** must be explicitly accounted for in the all-devices-lost plan.

A device cannot disappear from the lost set merely because its authorization record was already edited to `REVOKED` from `N+1`.

Before resuming future sync:

```text
new device ACTIVE from N+1
all devices active at recovered epoch accounted for
all declared lost devices REVOKED from N+1
no undeclared tenant device authorized at N+1
Tenant Root Key rotated to N+1
Recovery Key rotated
N+1 RecoveryCoverage valid
recovered history evidence present per lost device
Revocation Barrier valid per lost device
barrier commitment matches recovered history
        ↓
SAFE_TO_RESUME_FUTURE_SYNC
```

A hardening plan is not the same thing as applied/verified hardening.

## Recovery barrier retries and ambiguity

A barrier signature contains non-semantic framing such as creation time/signature randomness. The gate therefore distinguishes package identity from **semantic cutover authority**.

```text
same tenant/device/epoch/sequence/history/authorizer
+ re-signed/retried packages
→ one semantic authority

multiple distinct authentic semantic commitments
→ AMBIGUOUS
→ FAIL CLOSED
```

The stress suite exercised 32 equivalent re-signed barriers without creating false ambiguity.

## Parasympathetic model

The sync engine does not permanently poll.

Candidate runtime states remain:

```text
RESTING
WAKING
SYNCING_LIGHT
PROCESSING_HEAVY
COOLING_DOWN
WAITING_FOR_OS
WAITING_FOR_CONNECTIVITY
BACKOFF
LOW_RESOURCE
PAUSED
UPGRADE_REQUIRED
```

Primary rule:

```text
EVENTUAL FRESHNESS > FAKE REAL-TIME
```

Android WorkManager and Apple BackgroundTasks remain the intended OS-cooperative direction. Low battery or unavailable network may defer work; they may not disable encryption, authorization, provenance, idempotency or conflict safety.

## Knee stress campaign

Dedicated evidence:

`../10-evidence/EV-Q005-KNEE-STRESS-2026-09-01.md`

The campaign deliberately introduced adversarial assertions before fixes.

Observed red → green progression:

```text
Wave 1   62 / 67 PASS  → 67 / 67 PASS
Wave 2   72 / 74 PASS  → weaknesses repaired
Wave 3   75 / 77 PASS  → 77 / 77 PASS
Wave 4   78 / 80 PASS  → 80 / 80 PASS
Wave 5   83 / 84 PASS  → 84 / 84 PASS
```

The five waves exposed **12 red assertions** that earlier green suites did not protect.

Load cases included:

```text
16 signed historical sequence-fork positions
64-envelope history
reverse-order history replay
triple exact delivery replay
32 equivalent re-signed Revocation Barriers
epochs 1..7 historical vs epoch 8 cutover
same event_id divergent content
same sequence divergent event identities
mixed-tenant materialization
concurrent incompatible conflict resolutions
invalid resolution target
concurrent same-choice resolution retries
```

Final validated executable head:

`d09a420532d0f02ba904fec401932919065e66cc`

```text
E2EE / KEY / RECOVERY / REVOCATION / KNEE / PNS   84 / 84 PASS
CANONICAL RESOLVER                                  PASS
PHYSICAL INGRESS                                    PASS
MK0 FOUNDATION                                     3 / 3 PASS
```

## Current `PROVEN_AT_SPIKE` Q-005 invariants

```text
INV-SYNC-008  cloud lacks recovery decryption authority
INV-SYNC-009  authenticated/non-ambiguous recovery coverage
INV-SYNC-010  post-recovery hardening before future sync
INV-SYNC-011  Recovery Key rotation isolates future epochs
INV-SYNC-012  frozen revoked-origin historical admissibility
INV-SYNC-013  immutable replay + origin sequence identity
INV-SYNC-014  tenant-isolated materialization
INV-SYNC-015  conflict-resolution conflict safety
```

These are bounded synthetic properties, not release-grade `PROVEN`.

## Critical non-claim: malicious relay withholding

Signatures and history commitments protect integrity of **observed** state. They do not prove Byzantine availability.

A malicious relay that withholds an envelope a fresh recovery device has never seen, while also withholding the evidence that would reveal the later prefix, may make an older complete-looking prefix appear to be all that exists.

```text
FIRST-SEEN COMPLETE-LOOKING PREFIX
        ≠
PROOF OF NO WITHHELD LATER PREFIX
```

Closing that stronger property requires a separately reviewed anti-rollback/transparency/trusted-checkpoint design. Candidate directions include a locally protected monotonic checkpoint that survives recovery, a user-held recovery commitment, or another independently authenticated transparency mechanism.

No candidate is frozen yet.

## Remaining blockers

Q-005 stays `ACTIVE` until physical/production evidence closes at least:

```text
reviewed production HPKE/AEAD/signature implementation
reviewed production append-only history commitment
anti-rollback / relay-withholding trust-anchor decision
Android ↔ iOS cryptographic interoperability
Android Keystore / StrongBox evidence
Apple Keychain / Secure Enclave evidence
real control-plane tenant authorization
real recovery-wrap/barrier retrieval authorization
real barrier persistence + retention/deletion
crash/restart atomicity at cutover
long-offline / network-partition behavior
Recovery Kit export/import leakage controls
physical all-devices-lost recovery
physical post-recovery revocation/rotation/cutover
metadata leakage analysis
penetration / side-channel review
```

A malicious relay may still withhold data. Q-005 does not claim Byzantine availability.

## Current decision

```text
TENANT_KEY_EPOCHS                 ACCEPTED LOGICAL MODEL
TENANT-SCOPED DEVICE AUTH         REQUIRED / SPIKE-TESTED
PER_DEVICE_KEY_WRAPPING           REQUIRED
KEY-WRAP AUTHORITY RECHECK        REQUIRED / SPIKE-TESTED
OPAQUE CLOUD ENVELOPES            REQUIRED
EVENT_ID MUTABLE SLOT             REJECTED
ORIGIN SEQUENCE REUSE             REJECTED
MIXED-TENANT MATERIALIZATION      REJECTED
GLOBAL LWW FINANCIAL STATE        REJECTED
RESOLUTION LWW                    REJECTED
EXPLICIT RESOLUTION META-CONFLICT REQUIRED / SPIKE-TESTED
REVOCATION MEANING                FUTURE ACCESS + FROZEN ACCEPTED HISTORY
REVOCATION BARRIER                REQUIRED / SPIKE-TESTED
UNRESOLVED CUTOVER GAP            FAIL CLOSED
ALL-DEVICES-LOST RECOVERY         SPIKE-ACCEPTED / ADR-014
POST-RECOVERY FINAL GATE          REQUIRED / SPIKE-TESTED
BYZANTINE RELAY AVAILABILITY      NOT CLAIMED
ANTI-ROLLBACK TRUST ANCHOR        OPEN
PRODUCTION CRYPTO                 OPEN
PHYSICAL MOBILE RECOVERY          OPEN

MULTI_DEVICE_DESIGN               ACTIVE / NOT CLOSED
```

## Closure criteria

Q-005 closes only when the logical spike evidence is replaced/supplemented by release-grade proof for production cryptography, tenant authorization, real mobile key storage, cross-platform interoperability, background/crash behavior, physical recovery/revocation, deletion/retention, and the selected anti-rollback/relay-withholding contract.

`PROVEN_AT_SPIKE ≠ PROVEN`.
