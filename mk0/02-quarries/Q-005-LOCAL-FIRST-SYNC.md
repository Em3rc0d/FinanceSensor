# Q-005 — Local-first E2EE Multi-device Synchronization

**Priority:** P0  
**Status:** ACTIVE

## Question

How can several authorized phones share one tenant's financial truth while the cloud remains unable to interpret plaintext financial content — and while mobile background behavior remains calm, battery-aware, offline-tolerant and recoverable?

## Current finding

Q-005 is three coupled systems that must agree:

```text
PERIPHERAL NERVOUS SYSTEM
  tenant-scoped device authorization
  tenant keys
  authenticated device-key wrapping
  encrypted envelopes
  signatures
  replay
  convergence
  revocation
  authenticated revocation cutover
  conflict semantics

PARASYMPATHETIC SYSTEM
  rest
  background scheduling
  backoff
  offline tolerance
  battery/resource constraints
  safe interruption
  checkpointing

RECOVERY SYSTEM
  all-devices-lost recovery
  user-held Recovery Kit
  authenticated/non-ambiguous recovery coverage
  post-recovery revocation
  tenant epoch rotation
  Recovery Key rotation
  revoked-origin history freeze
  fail-closed future-sync resume gate
```

None can be postponed to unrestricted implementation. A secure protocol that constantly wakes the phone is unhealthy; a battery-friendly sync that silently corrupts financial state is unacceptable; a convenient recovery path that gives the server a decryption master key violates the product thesis.

Detailed contracts:

- `../04-architecture/PERIPHERAL-NERVOUS-SYSTEM.md`
- `../04-architecture/PARASYMPATHETIC-SYNC.md`
- `../04-architecture/REVOCATION-CUTOVER.md`
- `../11-decisions/ADR-014-RECOVERY-WITHOUT-SERVER-MASTER-KEY.md`

## Target model

```text
Device A
  ↓ canonical/domain action
  ↓ encrypt + sign locally
Cloud opaque envelope relay
  ↓
Device B
  ↓ verify tenant + origin authorization + epoch
  ↓ decrypt locally
  ↓ replay/materialize
Equivalent financial state
```

Recovery adds a separate authority path:

```text
Tenant Key Epoch N
   ├─ wrap → authorized Device A in Tenant T / Epoch N
   ├─ wrap → authorized Device B in Tenant T / Epoch N
   └─ wrap → Recovery Public Key

Recovery Private Key
   └─ user-held Recovery Kit only
```

The cloud may store public recovery metadata and ciphertext wraps but not recovery decryption authority.

## Core ownership model

- `Tenant` owns financial truth.
- `Device` is an execution identity, not a tenant.
- `DeviceAuthorization` is tenant-scoped and epoch-scoped.
- Matching `device_id` alone does not grant authority in another tenant.
- `Connection` belongs to Tenant.
- A device may temporarily execute a Connection through a `ProcessingLease`.
- A lease reduces duplicate work but is never a correctness mechanism.
- Recovery authority is independent from normal device authority.

## Cryptographic model

```text
Tenant Root Key epoch N
├─ domain-separated Sync key
├─ domain-separated Ledger key
├─ domain-separated Evidence key
├─ device-specific wrapped packages
└─ recovery wrap to active Recovery Public Key

Device
├─ encryption keypair
└─ signing keypair

Recovery
├─ Recovery Public Key   cloud-visible minimized metadata
└─ Recovery Private Key  user-held offline Recovery Kit
```

The Node spike uses hand-composed primitives only to prove protocol properties. Production key wrapping/recovery must use a reviewed construction/library such as HPKE; the spike is **not** production cryptography.

Standards/research inputs:

- RFC 9180 — HPKE: https://www.rfc-editor.org/info/rfc9180/
- NIST SP 800-38D — GCM/GMAC: https://csrc.nist.gov/pubs/800/38/d/final
- `research/Q005-PRODUCTION-CRYPTO-2026-SOURCES.md`

The final production suite remains security-review work.

## Device-key authority contract

The load-bearing key path rejects authority by coincidence.

```text
DeviceKeyWrap(Tenant T, Epoch N)
        ↓
recipient identity matches header
recipient authorization belongs to T and covers N
        +
authorizer identity matches header
authorizer authorization belongs to T and covers N
        +
signature/context integrity passes
        ↓
key may be consumed
```

The spike explicitly rejects:

```text
wrong authorizer identity
revoked authorizer at target epoch
revoked recipient at unwrap time
cross-tenant origin authorization
cross-tenant key recipient authorization
```

This is exercised by `KEY-001..KEY-005`.

## Sync envelope

Cloud-visible routing metadata should remain minimal:

```text
event_id
tenant_id opaque identifier
origin_device_id
origin_device_sequence
key_epoch
schema_version
created_at / relay sequence
ciphertext framing + byte length
signature
```

Financial semantics live inside ciphertext.

Cloud does not need plaintext:

```text
amount
merchant
category
currency tied to event
email subject/body
financial event kind
insight/opportunity
```

Metadata leakage such as timing, ciphertext size and device identity still belongs in the threat model.

Envelope origin authority is checked against the same tenant and epoch as the envelope. A public-key/device record associated with another tenant cannot authorize it.

## Device enrollment

```text
B generates device keypairs locally
        ↓
B registers public keys/pairing request
        ↓
A verifies B through explicit user gesture/fingerprint
        ↓
Tenant-scoped DeviceAuthorization(B) created
        ↓
A wraps current tenant root-key epoch to B
only while A and B are both authorized for Tenant T / Epoch N
        ↓
A signs authorization/wrap context
        ↓
B rechecks its own Tenant T / Epoch N authorization
        ↓
B verifies + unwraps locally
        ↓
B replays encrypted history from checkpoint
```

No silent enrollment and no device-global authorization shortcut.

## Device revocation

Basic future-key revocation remains:

```text
revoke B from N+1
   ↓
control plane denies future B authorization
   ↓
remaining trusted device creates epoch N+1
   ↓
N+1 wrapped only for remaining authorized devices
   ↓
recovery wrap created for N+1
   ↓
future envelopes use N+1
```

But this is **not sufficient by itself** while B still possesses epoch N material.

### Stale-epoch injection problem

A revoked/lost device may still possess:

```text
Tenant Root Key N
+
its device signing private key
```

Without an authenticated cutover it could fabricate a new envelope *after* revocation while labeling it as old epoch N. A receiver that retains N for historical replay cannot safely infer that a cryptographically valid old-epoch envelope was actually created before revocation.

Therefore:

```text
VALID OLD SIGNATURE + OLD KEY
        ≠
POST-CUTOVER AUTHORITY
```

### Revocation Barrier

The accepted historical origin stream must be frozen by a still-authorized authority:

```text
validate accepted historical envelopes for B
        ↓
require contiguous origin sequence through cutoff
        ↓
canonical envelope digests
        ↓
history commitment
        ↓
signed Revocation Barrier
```

The barrier binds:

```text
tenant_id
revoked_device_id
revoked_from_epoch
last_accepted_origin_sequence
history_commitment
authorizing_device_id
```

After cutover, an old-epoch envelope from B remains admissible only as part of that exact committed historical set (or a reviewed production-equivalent commitment).

The spike proves:

```text
REV-001 reorder + exact duplicate delivery is harmless
REV-002 post-cutover old-epoch extension is rejected
REV-003 historical sequence substitution is rejected
REV-004 cutoff/history tampering invalidates the barrier
REV-005 revoked device cannot authorize its own barrier
REV-006 cross-tenant cutover authority is rejected
REV-007 unresolved origin gaps fail closed
```

Architecture contract:

`../04-architecture/REVOCATION-CUTOVER.md`

Evidence:

`../10-evidence/EV-Q005-REVOCATION-CUTOVER-2026-09-01.md`

### Explicit non-claim

Revocation cannot make a device forget old plaintext/key material it already possessed. The MK0 property is **future-access revocation plus frozen accepted history**, not remote historical erasure.

A malicious relay can still withhold historical envelopes. The barrier protects integrity, not Byzantine availability.

## Replay / ordering

Every origin device owns a monotonic sequence.

```text
Device A: 1, 2, 3...
Device B: 1, 2, 3...
```

Duplicate `event_id` is idempotent.

Relay/server order can be used for pagination, but **must not become financial conflict truth** merely because one packet arrived later.

At revocation cutover, a supposedly complete historical prefix cannot be certified across a known sequence gap.

## Conflict model

FinanceSensor uses domain-specific conflict semantics.

```text
same target + same base revision + incompatible values
        ↓
CONFLICT
        ↓
no hidden winner
        ↓
explicit resolution action
```

The conflict object itself is deterministic, so devices still converge while waiting for resolution.

## Processing leases

If two phones can execute the same source connection:

```text
connection
    ↓
one device claims short lease
    ↓
bounded source processing
    ↓
lease released/expires
```

If the lease fails, idempotency/fingerprinting must still protect economic truth.

## Parasympathetic model

The sync engine is not an infinite polling service.

Candidate states:

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

Android WorkManager and Apple's BackgroundTasks APIs are the target OS-cooperative mechanisms rather than permanent wake/poll loops.

## Backoff

Transient failures:

```text
ceiling = min(cap, base * 2^attempt)
delay   = random(0, ceiling)
```

No busy retries while offline. Authentication failure transitions to reconnect/`NEEDS_AUTH`, not infinite retry.

## All-devices-lost recovery decision

The logical ownership model is decided at spike level through ADR-014:

```text
SERVER MASTER KEY         REJECTED
PASSWORD-ONLY RECOVERY    REJECTED FOR MK0
ASYMMETRIC RECOVERY KEY   ACCEPTED AT SPIKE LEVEL
PRIVATE RECOVERY KEY      USER-HELD / OFFLINE
PER-EPOCH RECOVERY WRAP   REQUIRED
```

Recovery coverage is stronger than “a wrap exists”:

```text
recoverable epoch
  ↓
matching tenant + Recovery Key id + epoch
  ↓
exact authorizer identity
  ↓
authorizer authorized for same tenant + epoch
  ↓
framing/signature authentic
  ↓
exactly one distinct authentic authority
  ↓
RECOVERY-COVERED
```

Exact relay duplicates of the same package remain idempotent. A tampered package cannot count as coverage. Multiple **distinct authentic** packages for the same declared epoch are treated as ambiguous and fail closed until explicitly reconciled.

## Post-recovery future-sync gate

The lower-level hardening state proves:

```text
restore through epoch N
        ↓
new device authorized from N+1
lost devices revoked from N+1
new tenant epoch N+1 applied
new Recovery Key applied
N+1 recovery coverage authenticated
```

`REC-018` proves this lower-level predicate.

However, this audit demonstrated that this state is still not sufficient to resume normal sync because lost devices may retain historical keys/signing keys.

The load-bearing final gate is:

```text
LOWER-LEVEL POST-RECOVERY HARDENING
        +
AUTHENTICATED REVOCATION BARRIER FOR EVERY LOST DEVICE
        ↓
SAFE_TO_RESUME_FUTURE_SYNC
```

This is exercised by:

```text
REC-019 lower-level hardening is not final resume authority
REC-020 every lost-device barrier verified → safe resume
REC-021 one missing barrier → blocked
REC-022 tampered barrier → blocked
```

The newly recovered device may authorize the barriers from N+1 because it is a fresh identity that has locally recovered and validated the accepted historical state. It does not inherit a lost device identity.

If all devices and the Recovery Kit are lost, cryptographic recovery is intentionally impossible. No hidden server bypass is permitted.

Evidence:

- `../10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`
- `../10-evidence/EV-Q005-REVOCATION-CUTOVER-2026-09-01.md`

## Current executable evidence

Validated bounded suite on executable commit `0d4f3b2cbf57dee811480268bab19d2ee3a5a101`:

```text
E2EE / KEY / RECOVERY / REVOCATION / PNS   62 / 62 PASS
REVOCATION CUTOVER                           7 / 7 PASS
POST-RECOVERY CUTOVER                        4 / 4 PASS
MK0 FOUNDATION                               3 / 3 PASS
```

Recovery/key/revocation cases now include:

```text
KEY-001..005 tenant/epoch/identity key authority
REC-001..018 recovery ownership, coverage and lower-level hardening
REV-001..007 stale-epoch cutover integrity
REC-019..022 final post-recovery cutover safety gate
```

The following data-model invariants are `PROVEN_AT_SPIKE` for their bounded claims:

```text
INV-SYNC-008
INV-SYNC-009
INV-SYNC-010
INV-SYNC-011
INV-SYNC-012
```

The strengthened tenant/key-authority behavior also gives additional executable support to `INV-TEN-005` and `INV-SYNC-003`; release-grade `PROVEN` is not claimed.

## Remaining recovery/crypto questions

The conceptual all-devices-lost ownership and stale-epoch cutover questions are no longer open at logical/spike level. Remaining questions are physical/production questions:

1. Which reviewed HPKE/AEAD/signature implementation and exact suite will be frozen for Android/iOS?
2. Which reviewed append-only/history-commitment representation will replace the spike digest-set commitment?
3. How long are historical tenant key epochs, recovery wraps and revocation barriers retained?
4. How do encrypted backups interact with app deletion/account deletion?
5. How are schema migrations replayed across long-offline devices and revocation cutovers?
6. How is Recovery Kit export/import protected from clipboard, screenshot, backup and accidental cloud-sync leakage?
7. What account-authentication/re-authentication gate is required before serving recovery wraps and cutover metadata?
8. How are physical post-recovery revocation, barrier creation and rotation demonstrated on Android/iOS?
9. How is the tenant-scoped authorization state enforced by the real control plane rather than only by the local spike registry?
10. How does a real client freeze a secure contiguous historical prefix when the relay is unavailable or withholding data?

These questions still prevent Q-005 closure.

## Evidence levels

```text
SPECIFIED
  documented only

PARTIAL
  structural validation / incomplete physical proof

PROVEN_AT_SPIKE
  synthetic executable model proves bounded property

PROVEN
  release-grade physical implementation + platform/security evidence + closed owner nodes
```

Node evidence can only promote bounded properties to `PROVEN_AT_SPIKE`.

## Finding

Multi-device support turns local privacy into a combined cryptography + distributed-state + mobile-runtime + recovery problem. "Encrypted database + cloud backup" is not a sufficient architecture.

The load-bearing lesson is now:

```text
CRYPTOGRAPHIC VALIDITY
        ≠
AUTHORIZATION VALIDITY
        ≠
HISTORICAL ADMISSIBILITY
        ≠
RECOVERY RESUME SAFETY
```

All four must agree before post-revocation state is trusted.

## Current decision

```text
TENANT_KEY_EPOCHS                 ACCEPTED LOGICAL MODEL
TENANT-SCOPED DEVICE AUTH         REQUIRED / SPIKE-TESTED
PER_DEVICE_KEY_WRAPPING           REQUIRED
KEY-WRAP AUTHORITY RECHECK        REQUIRED / SPIKE-TESTED
DEVICE_ORIGIN_SIGNATURE           REQUIRED CANDIDATE
OPAQUE_CLOUD_ENVELOPES            REQUIRED
DUPLICATE_REPLAY                  MUST BE IDEMPOTENT
GLOBAL_LWW_FINANCIAL_STATE        REJECTED
DOMAIN_CONFLICT_RECORD            CANDIDATE
REVOCATION_MEANING                FUTURE ACCESS + FROZEN ACCEPTED HISTORY
REVOCATION_BARRIER                REQUIRED / SPIKE-TESTED
UNRESOLVED CUTOVER GAP            FAIL CLOSED
PERMANENT_BACKGROUND_POLLING      REJECTED
OS_COOPERATIVE_SCHEDULING         REQUIRED
OFFLINE_IS_ERROR                  NO
ALL_DEVICES_LOST_RECOVERY         SPIKE-ACCEPTED / ADR-014
RECOVERY-COVERAGE AMBIGUITY       FAIL CLOSED
POST-RECOVERY LOWER-LEVEL GATE    REQUIRED / SPIKE-TESTED
POST-RECOVERY FINAL CUTOVER GATE  REQUIRED / SPIKE-TESTED
SERVER_MASTER_KEY                 REJECTED
PRODUCTION_CRYPTO_SUITE           OPEN / SECURITY REVIEW REQUIRED
PRODUCTION HISTORY COMMITMENT     OPEN / REVIEW REQUIRED
PHYSICAL_MOBILE_RECOVERY          OPEN

MULTI_DEVICE_DESIGN               ACTIVE / NOT CLOSED
```

## Closure criteria

Q-005 closes only when:

- key hierarchy and epoch model selected/reviewed;
- audited production key-wrap/AEAD/signature implementation chosen;
- reviewed production revoked-origin commitment representation chosen;
- tenant-scoped device authorization enforced by the real control plane;
- device enrollment/revocation/cutover sequence frozen;
- future-access revocation and stale-epoch injection resistance physically demonstrated;
- event ordering/conflict semantics frozen;
- all-devices-lost behavior remains reconciled with ADR-014;
- recovery coverage and post-recovery final cutover gate are physically demonstrated;
- encrypted sync prototype demonstrates two-device convergence;
- duplicate delivery and lease failure remain economically idempotent;
- cloud inspection confirms no required financial plaintext;
- cloud inspection confirms no Recovery Private Key/plain tenant key authority;
- Android key storage/background behavior is physically measured;
- iOS key storage/background/expiration behavior is physically measured;
- Android↔iOS cryptographic interoperability is demonstrated;
- Recovery Kit export/import leakage controls are physically tested;
- revocation-barrier metadata leakage/retention/deletion are physically tested;
- parasympathetic backoff/offline/resource rules are tested;
- Q-004 privacy matrices are reconciled with metadata leakage/key retention/deletion;
- SEC-001 and DM-001 are revalidated;
- release-grade evidence artifacts are stored under `mk0/10-evidence/`;
- closure receipt issued;
- `MULTI_DEVICE_DESIGN PASS` and `PRIVACY_MODEL PASS` evidence produced.
