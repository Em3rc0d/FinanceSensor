# Q-005 — Local-first E2EE Multi-device Synchronization

**Priority:** P0  
**Status:** ACTIVE

## Question

How can several authorized phones share one tenant's financial truth while the cloud remains unable to interpret plaintext financial content — and while synchronization stays recoverable, conflict-safe, rollback-resistant, battery-aware and honest about freshness?

## Current finding

Q-005 is now a coupled system of six load-bearing concerns:

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
  explicit resolution meta-conflicts
  tenant-isolated materialization

TRUSTED CHECKPOINT SYSTEM
  signed tenant checkpoints
  independent minimum trusted anchor
  rollback/fork/gap detection
  explicit no-anchor uncertainty
  no false global-latest claim

OPAQUE WITNESS SYSTEM
  independent monotonic checkpoint memory
  per-witness pseudonymous log identity
  rollback/fork/gap/parent enforcement
  relay-behind detection
  witness-divergence detection
  explicit unavailable/unconfirmed state
```

A secure protocol that corrupts state under replay is unacceptable. A recovery path that silently preserves a lost device's authority is unacceptable. A signed checkpoint chain that calls an old server view `LATEST` is unacceptable. A witness that needs financial plaintext or a stable real tenant identifier is also unacceptable.

Detailed contracts:

- `../04-architecture/PERIPHERAL-NERVOUS-SYSTEM.md`
- `../04-architecture/PARASYMPATHETIC-SYNC.md`
- `../04-architecture/REVOCATION-CUTOVER.md`
- `../04-architecture/TRUSTED-CHECKPOINT.md`
- `../04-architecture/WITNESS-FRESHNESS.md`
- `../04-architecture/Q005-ANTI-ROLLBACK-SECURITY-REVALIDATION.md`
- `../11-decisions/ADR-014-RECOVERY-WITHOUT-SERVER-MASTER-KEY.md`
- `../11-decisions/ADR-015-TRUSTED-CHECKPOINT-ANTI-ROLLBACK.md`
- `../11-decisions/ADR-016-OPAQUE-WITNESS-FRESHNESS.md`

## Ownership and authority

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

A valid signature or matching `device_id` is not authority by itself. The identity must be authorized for the same tenant and key epoch.

## Cloud / edge contract

The cloud is an opaque relay/control plane, not the holder of financial truth.

Normal encrypted sync does not require cloud plaintext for:

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

Security metadata such as device IDs, epochs, checkpoint cadence and ciphertext sizes remains part of the privacy threat model.

## Device-key authority

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

## Immutable sync identity

```text
same event_id
+ same immutable header/action
→ exact retry / idempotent

same event_id
+ different immutable header/action
→ FAIL CLOSED
```

A second identity axis is also fixed:

```text
(tenant_id, origin_device_id, origin_device_sequence)
→ exactly one event identity
```

This is `INV-SYNC-013`.

## Tenant-isolated materialization

One materialization pass belongs to exactly one tenant. Mixed-tenant decoded input fails closed before canonical/correction state is projected.

This is `INV-SYNC-014`.

## Conflict semantics

FinanceSensor rejects global last-write-wins for user financial truth.

```text
incompatible concurrent corrections
→ explicit correction conflict

incompatible concurrent resolutions
→ explicit meta-conflict

resolution outside known candidate set
→ invalid resolution / no mutation

concurrent same-choice resolutions
→ retry-equivalent / converge
```

This is `INV-SYNC-015`.

## Device revocation and historical admissibility

Future-key rotation is necessary but insufficient. A lost device may retain epoch N material and its signing private key.

```text
VALID OLD SIGNATURE + OLD KEY
        ≠
POST-CUTOVER HISTORICAL AUTHORITY
```

The Revocation Barrier freezes the accepted historical origin stream and rejects post-cutover old-epoch extension, historical substitution, event-ID reuse, sequence forks, known gaps, cross-tenant authority and revoked-device self-cutover.

This is `INV-SYNC-012`.

## All-devices-lost recovery — ADR-014

```text
SERVER MASTER KEY         REJECTED
PASSWORD-ONLY RECOVERY    REJECTED FOR MK0
ASYMMETRIC RECOVERY KEY   SPIKE-ACCEPTED
Recovery Private Key      USER-HELD / OFFLINE
PER-EPOCH RECOVERY WRAP   REQUIRED
```

RecoveryCoverage requires authenticated tenant/epoch/Recovery-Key/authorizer binding and exactly one non-ambiguous distinct authority for each declared recoverable epoch.

Before future sync resumes:

```text
new device ACTIVE from N+1
all devices active at recovered epoch accounted for
all lost devices REVOKED from N+1
no undeclared old device authorized at N+1
Tenant Root Key rotated
Recovery Key rotated
N+1 RecoveryCoverage valid
recovered history evidence present per lost device
Revocation Barrier valid per lost device
barrier commitment matches recovered history
        ↓
SAFE_TO_RESUME_FUTURE_SYNC
```

## Knee stress campaign

Evidence:

`../10-evidence/EV-Q005-KNEE-STRESS-2026-09-01.md`

The campaign deliberately introduced adversarial assertions before fixes and exposed 12 weaknesses that previous green suites did not protect.

Final pre-checkpoint result:

```text
84 / 84 PASS
```

It established bounded executable support for:

```text
INV-SYNC-013 immutable replay + origin sequence identity
INV-SYNC-014 tenant-isolated materialization
INV-SYNC-015 conflict-resolution conflict safety
```

## Trusted Checkpoint / Anti-Rollback — ADR-015

The knee campaign exposed a stronger limitation:

```text
VALID SIGNED STATE
        ≠
PROOF THAT THE RELAY RETURNED THE NEWEST VALID STATE
```

The first checkpoint baseline intentionally verified authenticity only. The adversarial suite produced eight red assertions. After repair:

```text
ARB-001..014             14 / 14 PASS
checkpoint-era suite      98 / 98 PASS
```

Evidence:

`../10-evidence/EV-Q005-ANTI-ROLLBACK-2026-09-01.md`

FinanceSensor now distinguishes:

```text
SignedCheckpoint
TrustedCheckpointAnchor
CheckpointVerificationResult
```

An independently retained anchor establishes a minimum accepted tenant state. Relative to it, rollback, same-sequence equivocation, anchor equivocation, gap/fast-forward, parent mismatch, cross-tenant advance and invalid authority fail closed. Exact duplicate delivery is retry-equivalent.

This is `INV-SYNC-016`.

### Freshness honesty

```text
no independent anchor
→ INDETERMINATE_FRESHNESS

valid chain extending anchor
→ CONSISTENT_FROM_ANCHOR
→ latestGlobalFreshness = UNPROVEN
```

This is `INV-SYNC-017`.

Therefore:

```text
AUTHENTICITY
        ≠
AUTHORIZATION
        ≠
APPEND-ONLY CONSISTENCY
        ≠
GLOBAL FRESHNESS
```

## Opaque independent witness — ADR-016

ADR-015 answers rollback relative to a trusted anchor. ADR-016 adds independent memory of checkpoint progress without turning the witness into a holder of financial truth.

The first witness implementation intentionally authenticated submissions but did not enforce monotonicity/contradiction rules. The adversarial campaign produced:

```text
weak witness baseline    109 / 116 PASS
red assertions             7
```

The seven failures were:

```text
rollback submission
same-sequence different-hash fork
sequence gap / fast-forward
wrong previous checkpoint hash
valid witness ahead of relay
same-sequence valid witness divergence
configured witness/log binding confusion
```

After repair:

```text
WIT-001..018             18 / 18 PASS
full distributed suite 116 / 116 PASS
```

Evidence:

`../10-evidence/EV-Q005-WITNESS-FRESHNESS-2026-09-01.md`

### Witness privacy contract

Each witness receives a different opaque log identifier. The candidate protocol does not require:

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

Timing, checkpoint sequence and cadence remain metadata leakage and must be quantified before production.

### Witness continuity

```text
first checkpoint = sequence 1 + null parent
next checkpoint = N+1 + exact remembered parent hash
lower sequence = rollback reject
same sequence + different hash = fork reject
gap = reject
parent mismatch = reject
exact same semantic checkpoint = retry-equivalent
```

This is `INV-SYNC-018`.

### Witness evidence honesty

The executable spike uses three witnesses and a two-witness threshold only as a bounded test configuration.

```text
2 agreeing current witnesses + no contradictory valid evidence
→ WITNESS_CONFIRMED_THROUGH_N

valid witness ahead of relay
→ RELAY_BEHIND_WITNESS

valid same-sequence divergence
→ WITNESS_DIVERGENCE

insufficient/unavailable witnesses
→ explicit unconfirmed state
→ NEVER silently trust relay freshness
```

This is `INV-SYNC-019`.

`2-of-3` is **not** frozen as the production policy.

## Parasympathetic model

The sync engine does not permanently poll.

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

Resource constraints may defer work. They may not disable encryption, authorization, provenance, idempotency, conflict safety, checkpoint verification or witness-evidence honesty.

## Current bounded `PROVEN_AT_SPIKE` Q-005 invariants

```text
INV-SYNC-008  cloud lacks recovery decryption authority
INV-SYNC-009  authenticated/non-ambiguous recovery coverage
INV-SYNC-010  post-recovery hardening before future sync
INV-SYNC-011  Recovery Key rotation isolates future epochs
INV-SYNC-012  frozen revoked-origin historical admissibility
INV-SYNC-013  immutable replay + origin sequence identity
INV-SYNC-014  tenant-isolated materialization
INV-SYNC-015  conflict-resolution conflict safety
INV-SYNC-016  independent-anchor rollback/fork/gap protection
INV-SYNC-017  no false global-freshness claim
INV-SYNC-018  opaque witness monotonic continuity
INV-SYNC-019  contradiction-aware witness evidence honesty
```

These are bounded spike properties, not release-grade `PROVEN`.

## Current executable baseline

Validated head before this documentation reconciliation:

`fbc11506f37998e5a059bd6dc349f70f40b10c4b`

```text
DISTRIBUTED / WITNESS                    116 / 116 PASS
CANONICAL RESOLVER                        98 / 98 PASS
PHYSICAL INGRESS                          31 / 31 PASS
TRACEABILITY                              84 / 84 WIRED
PROVEN_AT_SPIKE                           22
PRIVACY                                   24 classes PASS
HEARTBEAT                                 SUCCESS
MK0 FOUNDATION                            SUCCESS
BUILD_READY                               false
```

## Remaining blockers

Q-005 stays `ACTIVE`:

```text
production witness operator/topology/quorum policy
Recovery Kit checkpoint-anchor refresh semantics
reviewed production append-only checkpoint construction
atomic crash-safe checkpoint + anchor advancement
reviewed production HPKE/AEAD/signature implementation
Android ↔ iOS cryptographic interoperability
Android Keystore / StrongBox evidence
Apple Keychain / Secure Enclave evidence
protected mobile checkpoint-anchor storage
real control-plane tenant authorization
real recovery-wrap/checkpoint/barrier authorization
crash/restart atomicity
long-offline / network-partition behavior
Recovery Kit export/import leakage controls
physical all-devices-lost recovery
physical post-recovery revocation/rotation/cutover
witness/checkpoint retention and deletion semantics
metadata leakage analysis
penetration / side-channel review
```

## Current decision

```text
TENANT_KEY_EPOCHS                  ACCEPTED LOGICAL MODEL
TENANT-SCOPED DEVICE AUTH          REQUIRED / SPIKE-TESTED
PER_DEVICE_KEY_WRAPPING            REQUIRED
OPAQUE CLOUD ENVELOPES             REQUIRED
EVENT_ID MUTABLE SLOT              REJECTED
ORIGIN SEQUENCE REUSE              REJECTED
MIXED-TENANT MATERIALIZATION       REJECTED
GLOBAL LWW FINANCIAL STATE         REJECTED
RESOLUTION LWW                     REJECTED
EXPLICIT RESOLUTION META-CONFLICT  REQUIRED / SPIKE-TESTED
REVOCATION MEANING                 FUTURE ACCESS + FROZEN HISTORY
REVOCATION BARRIER                 REQUIRED / SPIKE-TESTED
ALL-DEVICES-LOST RECOVERY          SPIKE-ACCEPTED / ADR-014
TRUSTED CHECKPOINT                 SPIKE-ACCEPTED / ADR-015
OPAQUE WITNESS MODEL               SPIKE-ACCEPTED / ADR-016
RELAY AS SOLE TRUST/FRESHNESS      REJECTED
NO-ANCHOR FRESHNESS                INDETERMINATE
GLOBAL-LATEST FRESHNESS            NOT CLAIMED
PRODUCTION WITNESS POLICY          OPEN
PRODUCTION CRYPTO                  OPEN
PHYSICAL MOBILE RECOVERY           OPEN

MULTI_DEVICE_DESIGN                ACTIVE / NOT CLOSED
```

## Closure criteria

Q-005 closes only when bounded logical evidence is supplemented by release-grade proof for production crypto, tenant authorization, real mobile key/anchor storage, cross-platform interoperability, background/crash behavior, physical recovery/revocation, deletion/retention, and the selected production freshness/witness contract.

`PROVEN_AT_SPIKE ≠ PROVEN`.
