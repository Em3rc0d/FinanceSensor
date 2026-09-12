# Q-005 — Local-first E2EE Multi-device Synchronization

**Priority:** P0  
**Status:** ACTIVE

## Question

How can several authorized phones share one tenant's financial truth while the cloud remains unable to interpret plaintext financial content — and while synchronization stays recoverable, conflict-safe, rollback-resistant, battery-aware and honest about freshness?

## Current finding

Q-005 is a coupled system of six load-bearing concerns:

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

A secure protocol that corrupts state under replay is unacceptable. A recovery path that silently preserves a lost device's authority is unacceptable. A signed checkpoint chain that calls an old server view `LATEST` is unacceptable. A witness that needs financial plaintext or a stable real tenant identifier is unacceptable.

## Governing architecture

- `../04-architecture/PERIPHERAL-NERVOUS-SYSTEM.md`
- `../04-architecture/PARASYMPATHETIC-SYNC.md`
- `../04-architecture/REVOCATION-CUTOVER.md`
- `../04-architecture/TRUSTED-CHECKPOINT.md`
- `../04-architecture/WITNESS-FRESHNESS.md`
- `../04-architecture/Q005-ANTI-ROLLBACK-SECURITY-REVALIDATION.md`

Decisions:

- `../11-decisions/ADR-014-RECOVERY-WITHOUT-SERVER-MASTER-KEY.md`
- `../11-decisions/ADR-015-TRUSTED-CHECKPOINT-ANTI-ROLLBACK.md`
- `../11-decisions/ADR-016-OPAQUE-WITNESS-FRESHNESS.md`
- `../11-decisions/ADR-021-MOBILE-PRODUCTION-CRYPTO-PROFILE.md`
- `../11-decisions/ADR-022-PRODUCTION-WITNESS-QUORUM.md`
- `../11-decisions/ADR-023-DISCONNECT-DELETION-BACKUP-SEMANTICS.md`
- `../11-decisions/ADR-024-RECOVERY-KIT-ANCHOR-REFRESH.md`

Physical execution plan:

- `../07-plan/Q003-Q004-Q005-PHYSICAL-CLOSURE-CAMPAIGN.md`

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

A second identity axis is fixed:

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

## All-devices-lost recovery — ADR-014 + ADR-024

```text
SERVER MASTER KEY         REJECTED
PASSWORD-ONLY RECOVERY    REJECTED FOR MK0
ASYMMETRIC RECOVERY KEY   SPIKE-ACCEPTED
Recovery Private Key      USER-HELD / OFFLINE
PER-EPOCH RECOVERY WRAP   REQUIRED
RECOVERY KIT ANCHOR       MINIMUM TRUSTED ANCHOR, NOT GLOBAL LATEST
```

RecoveryCoverage requires authenticated tenant/epoch/Recovery-Key/authorizer binding and exactly one non-ambiguous distinct authority for each declared recoverable epoch.

Before future sync resumes after all-devices-lost recovery:

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
NEW N+1 RECOVERY KIT EXPORTED
NEW KIT INTEGRITY CHECK PASSED
USER CONFIRMED RECOVERY KIT CUSTODY
        ↓
SAFE_TO_RESUME_FUTURE_SYNC
```

Normal Recovery Kit refresh is event-driven, not checkpoint-driven. Recovery Key rotation or successful disaster cutover requires a new kit. An old valid kit is a historical minimum anchor, never proof of latest global state.

## Production crypto profile — ADR-021

The hand-composed Node spike remains feasibility evidence only. The first mobile physical interoperability profile is now frozen:

```text
KEY WRAP
  RFC 9180 HPKE Base mode
  DHKEM(P-256, HKDF-SHA256)
  HKDF-SHA256
  AES-128-GCM

DEVICE ORIGIN SIGNING
  ECDSA P-256 + SHA-256 profile
  canonical protocol transcript
  protected platform private-key facility

DOMAIN ENVELOPES
  256-bit Tenant Root Key
  HKDF-SHA256 domain/epoch subkeys
  AES-256-GCM
  96-bit unique nonce
```

Android Keystore/StrongBox and Apple Secure Enclave/Keychain are the intended protected-key facilities. Silent fallback to exportable long-lived production private keys is forbidden.

This is a **frozen physical-test profile**, not production proof. Android↔iOS interoperability, protected-key execution, canonical signature encoding and reviewed library versions still must pass.

## Knee stress campaign

Evidence: `../10-evidence/EV-Q005-KNEE-STRESS-2026-09-01.md`

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

```text
VALID SIGNED STATE
        ≠
PROOF THAT THE RELAY RETURNED THE NEWEST VALID STATE
```

After the adversarial checkpoint campaign:

```text
ARB-001..014             14 / 14 PASS
checkpoint-era suite      98 / 98 PASS
```

Evidence: `../10-evidence/EV-Q005-ANTI-ROLLBACK-2026-09-01.md`

FinanceSensor distinguishes:

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

## Opaque independent witnesses — ADR-016 + ADR-022

The bounded witness campaign repaired rollback, fork, gap, parent, relay-behind, divergence and log-binding failures.

```text
WIT-001..018             18 / 18 PASS
full distributed suite 116 / 116 PASS
```

Evidence: `../10-evidence/EV-Q005-WITNESS-FRESHNESS-2026-09-01.md`

### Frozen initial production topology

```text
configured witnesses              3
confirmation quorum               2 of 3
minimum failure domains           2
minimum relay-independent witness 1
per-witness opaque log id         REQUIRED
real tenant id                    FORBIDDEN
financial plaintext               FORBIDDEN
financial ciphertext              FORBIDDEN
```

### Evidence semantics

```text
2 agreeing current witnesses + no contradictory valid evidence
→ WITNESS_CONFIRMED_THROUGH_N

valid witness ahead of relay
→ RELAY_BEHIND_WITNESS

valid same-sequence divergence
→ WITNESS_DIVERGENCE

<2 current witnesses
→ WITNESS_UNCONFIRMED
→ NEVER silently trust relay freshness

VALID CONTRADICTION
→ CANNOT BE VOTED AWAY BY 2-OF-3
```

`2-of-3` is a freshness-evidence threshold, not a consensus layer and not global-freshness proof.

Timing, checkpoint sequence and cadence remain metadata leakage and must be measured physically.

This is `INV-SYNC-018` and `INV-SYNC-019`.

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

## Current bounded `PROVEN_AT_SPIKE` invariants

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

## Deletion / retention — ADR-023

Q-005 inherits the tenant lifecycle contract:

```text
DELETE TENANT
→ destroy/invalidate tenant + recovery authority
→ delete cloud opaque envelopes/control metadata
→ retire/delete witness namespaces
→ deny future sync/recovery authorization
→ backup restore MUST NOT resurrect tenant authority
```

Applicable backup physical retention must be finite and must not exceed the architecture ceiling of 35 days. Physical provider evidence remains open.

## Remaining blockers

Q-005 stays `ACTIVE`. The remaining work is now intentionally biased toward **implementation evidence**, not unresolved high-level primitive/quorum/recovery UX choices:

```text
reviewed production append-only checkpoint construction
atomic crash-safe checkpoint + anchor advancement
reviewed library implementation of ADR-021 profile
Android ↔ iOS cryptographic interoperability
Android Keystore / StrongBox physical evidence
Apple Keychain / Secure Enclave physical evidence
protected mobile checkpoint-anchor storage
real control-plane tenant authorization
real recovery-wrap/checkpoint/barrier authorization
crash/restart atomicity
long-offline / network-partition behavior
physical ADR-022 witness topology/failure campaign
Recovery Kit export/import leakage controls
physical all-devices-lost recovery
physical post-recovery revocation/rotation/cutover
physical ADR-024 new-kit safe-to-resume gate
witness/checkpoint deletion and backup behavior under ADR-023
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
PRODUCTION WITNESS POLICY          FROZEN / ADR-022 / PHYSICAL OPEN
PRODUCTION CRYPTO PROFILE          FROZEN / ADR-021 / PHYSICAL OPEN
RECOVERY KIT REFRESH               FROZEN / ADR-024 / PHYSICAL OPEN
DELETION/RETENTION SEMANTICS       FROZEN / ADR-023 / PHYSICAL OPEN
RELAY AS SOLE TRUST/FRESHNESS      REJECTED
NO-ANCHOR FRESHNESS                INDETERMINATE
GLOBAL-LATEST FRESHNESS            NOT CLAIMED
PHYSICAL MOBILE RECOVERY           OPEN

MULTI_DEVICE_DESIGN                ACTIVE / NOT CLOSED
```

## Closure criteria

Q-005 closes only when bounded logical evidence is supplemented by release-grade proof for:

- reviewed implementation of ADR-021 and cross-platform crypto interoperability;
- real control-plane tenant/recovery authorization;
- protected mobile key and checkpoint-anchor storage;
- ADR-022 witness topology, quorum and contradiction behavior;
- background/crash/partition/long-offline behavior;
- physical ADR-014/024 recovery, revocation, rotation, new-kit and cutover;
- ADR-023 deletion/retention/backup behavior;
- metadata leakage analysis;
- penetration/side-channel review;
- closure receipt with residual risks.

```text
PROVEN_AT_SPIKE != PROVEN
DECISION FROZEN != PHYSICAL PROPERTY PROVEN
```
