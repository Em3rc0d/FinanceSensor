# Q-005 — Local-first E2EE Multi-device Synchronization

**Priority:** P0  
**Status:** ACTIVE

## Question

How can several authorized phones share one tenant's financial truth while the cloud remains unable to interpret plaintext financial content — and while synchronization stays recoverable, conflict-safe, rollback-resistant, battery-aware and honest about freshness?

## Current finding

Q-005 is now a coupled system of five load-bearing concerns:

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
```

A secure protocol that corrupts state under replay is unacceptable. A recovery path that silently preserves a lost device's authority is unacceptable. A signed checkpoint chain that calls an old server view `LATEST` is also unacceptable.

Detailed contracts:

- `../04-architecture/PERIPHERAL-NERVOUS-SYSTEM.md`
- `../04-architecture/PARASYMPATHETIC-SYNC.md`
- `../04-architecture/REVOCATION-CUTOVER.md`
- `../04-architecture/TRUSTED-CHECKPOINT.md`
- `../04-architecture/Q005-ANTI-ROLLBACK-SECURITY-REVALIDATION.md`
- `../11-decisions/ADR-014-RECOVERY-WITHOUT-SERVER-MASTER-KEY.md`
- `../11-decisions/ADR-015-TRUSTED-CHECKPOINT-ANTI-ROLLBACK.md`

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

The first checkpoint baseline intentionally verified authenticity only. The adversarial suite then produced:

```text
RED HEAD
98 total distributed tests
90 PASS
8 FAIL
```

The failures proved missing protection for:

```text
rollback behind an independent anchor
same-sequence checkpoint equivocation
wrong previous-checkpoint hash
checkpoint sequence gap
cross-tenant checkpoint advance
signed fast-forward over unknown checkpoints
no-anchor false confidence
anchor-sequence equivocation
```

After repair:

```text
ARB-001..014            14 / 14 PASS
full distributed suite  98 / 98 PASS
```

Evidence:

`../10-evidence/EV-Q005-ANTI-ROLLBACK-2026-09-01.md`

### Accepted bounded checkpoint semantics

FinanceSensor now distinguishes:

```text
SignedCheckpoint
TrustedCheckpointAnchor
CheckpointVerificationResult
```

An independently retained anchor establishes a minimum accepted tenant state.

Relative to it:

```text
presented state behind anchor      → FAIL CLOSED
same sequence / different hash     → FAIL CLOSED
anchor sequence / different hash   → FAIL CLOSED
sequence gap / fast-forward        → FAIL CLOSED
wrong previous checkpoint hash     → FAIL CLOSED
cross-tenant checkpoint advance    → FAIL CLOSED
unauthorized/revoked signer         → FAIL CLOSED
exact duplicate checkpoint         → IDEMPOTENT
```

This is `INV-SYNC-016`.

### Freshness honesty

The checkpoint system deliberately refuses to claim more than it knows.

```text
no independent anchor
→ INDETERMINATE_FRESHNESS

valid chain extending anchor
→ CONSISTENT_FROM_ANCHOR
→ latestGlobalFreshness = UNPROVEN
```

This is `INV-SYNC-017`.

A valid anchored chain proves append-only consistency relative to the anchor. It does **not** prove that the relay supplied every later checkpoint that ever existed.

Example:

```text
independent anchor = 9
real tenant once reached = 12
relay presents exactly = 9
```

The client can prove it was not silently rolled back before/forked at checkpoint 9. It cannot infer from relay-only evidence that checkpoints 10..12 never existed.

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

ADR-015 is `SPIKE-ACCEPTED / PRODUCTION WITNESS DECISION REQUIRED`.

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

Resource constraints may defer work. They may not disable encryption, authorization, provenance, idempotency, conflict safety or checkpoint verification.

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
```

These are bounded synthetic properties, not release-grade `PROVEN`.

## Current executable baseline

Reconciled head:

`13a6d738ea394171ebf39badf447134d251c6327`

```text
E2EE / KEY / RECOVERY / REVOCATION /
KNEE / CHECKPOINT / PNS                    98 / 98 PASS
CANONICAL RESOLVER                          98 / 98 PASS
PHYSICAL INGRESS                            21 / 21 PASS
TRACEABILITY                                82 / 82 WIRED
PRIVACY                                     23 classes PASS
HEARTBEAT                                   SUCCESS
MK0 FOUNDATION                              3 / 3 PASS
BUILD_READY                                 false
```

## Remaining blockers

Q-005 stays `ACTIVE`. The major remaining questions are now primarily production/physical plus the stronger freshness policy:

```text
production independent witness/freshness strategy
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
retention/deletion semantics
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
RELAY AS SOLE TRUST ANCHOR         REJECTED
NO-ANCHOR FRESHNESS                INDETERMINATE
GLOBAL-LATEST FRESHNESS            UNPROVEN
PRODUCTION WITNESS STRATEGY        OPEN
PRODUCTION CRYPTO                  OPEN
PHYSICAL MOBILE RECOVERY           OPEN

MULTI_DEVICE_DESIGN                ACTIVE / NOT CLOSED
```

## Closure criteria

Q-005 closes only when bounded logical evidence is supplemented by release-grade proof for production crypto, tenant authorization, real mobile key/anchor storage, cross-platform interoperability, background/crash behavior, physical recovery/revocation, deletion/retention, and the selected freshness/witness contract.

`PROVEN_AT_SPIKE ≠ PROVEN`.
