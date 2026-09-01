# SEC-001 — Q-005 Security Revalidation

**Status authority:** `graph/closure-ledger.json`  
**Scope:** security consequences introduced by multi-device E2EE synchronization and all-devices-lost recovery.

## 1. Trust boundaries

Q-005 introduces four explicit boundaries that SEC-001 must model:

```text
AUTHORIZED DEVICE
  holds private device keys
  may hold usable tenant key epochs
  sees decrypted financial state
  receives authority only through tenant-scoped + epoch-scoped DeviceAuthorization

CLOUD RELAY / CONTROL PLANE
  sees minimized routing metadata
  stores opaque sync envelopes
  stores public device-key metadata
  stores tenant-scoped device authorization metadata
  stores device-specific wrapped tenant-key packages
  stores Recovery Public Key metadata + recovery-wrap ciphertext
  must not need financial plaintext
  must not hold Recovery Private Key authority

RECOVERY KIT / USER-HELD AUTHORITY
  holds Recovery Private Key material
  exists outside ordinary app/cloud state after setup/export
  may restore retained tenant epochs after all devices are lost
  must be re-imported locally during disaster recovery

REVOKED / LOST DEVICE
  may retain historical data/key material already obtained
  must lose future authorization/key epochs
  must not obtain Recovery Private Key from normal operation
```

## 2. Threat actors

### Honest-but-curious relay

Can observe minimized metadata such as:

```text
tenant opaque identity
device identities
key epoch numbers
recovery key id/public key
message/recovery-wrap timing
ciphertext sizes
server ordering / activity patterns
```

Must not obtain:

```text
financial event payload
amount/merchant/category meaning
email content
tenant root key
device private key
Recovery Private Key
```

### Malicious/compromised relay

May attempt:

```text
replay
drop
reorder
duplicate
substitute ciphertext
substitute device metadata
substitute tenant authorization metadata
serve stale device wraps
serve stale/incomplete/tampered recovery wraps
serve multiple conflicting authentic recovery wraps
substitute recovery public metadata
withhold recovery coverage
```

Candidate controls demonstrated structurally or at spike level:

```text
AEAD integrity
signed device-origin envelopes
stable event identity
per-device monotonic sequence
tenant + key-epoch authorization
recipient authorization re-check when a tenant key is consumed
authorizer identity binding
local checkpoint/gap detection
explicit device public-key trust records
recovery-wrap context binding
historical authorizer signature verification
authenticated recovery coverage checks
ambiguous recovery coverage fails closed
exact duplicate recovery-wrap delivery is idempotent
post-recovery future-sync readiness gate
```

A malicious relay can still withhold data. Q-005 does not claim Byzantine availability.

### Cross-tenant identity confusion

A device identifier or public key may exist in more than one context over the lifetime of the system. Therefore a matching `device_id` or valid signature is insufficient by itself.

Security rule:

```text
VALID SIGNATURE
    +
MATCHING DEVICE ID
    +
AUTHORIZED FOR SAME TENANT
    +
AUTHORIZED FOR SAME KEY EPOCH
    ↓
USABLE AUTHORITY
```

The spike explicitly rejects a cross-tenant authorization record for both sync-envelope origin and tenant-key recipient paths.

### Revoked/lost device

A revoked device may possess old tenant keys and previously decrypted data.

Security objective:

```text
NO FUTURE KEY EPOCH
NO FUTURE AUTHORIZED ENVELOPE ACCESS
NO NEW AUTHORIZED ORIGIN AFTER REVOCATION EPOCH
NO RECOVERY PRIVATE AUTHORITY FROM NORMAL DEVICE STATE
```

Non-objective:

```text
REMOTE ERASURE OF HISTORICAL PLAINTEXT ALREADY SEEN
```

### Compromised currently authorized device

This remains a severe threat: an authorized compromised device can read data/key material it is legitimately allowed to receive and can create legitimate wraps while authorized.

Q-005 key rotation/revocation limits future exposure after detection but cannot protect plaintext while the compromised device remains authorized.

### Stolen Recovery Kit

A stolen Recovery Kit is a high-severity recovery-authority compromise.

Consequences depend on what ciphertext/recovery wraps the attacker can obtain and on account/control-plane authorization. Therefore production recovery must not rely solely on possession of the Recovery Private Key to gain arbitrary server access.

Required defense-in-depth direction:

```text
account authentication / re-authentication
        +
recovery-wrap retrieval authorization
        +
Recovery Private Key possession
        ↓
local recovery
        ↓
mandatory device + tenant epoch + Recovery Key rotation
        ↓
verified next-epoch recovery coverage
        ↓
future sync gate opens
```

Exact recovery authentication policy remains open.

## 3. Cryptographic construction status

The feasibility spike demonstrates bounded properties using Node primitives:

```text
X25519-style ephemeral key agreement
HKDF-SHA256 domain separation
AES-256-GCM AEAD
Ed25519 origin/authorizer signatures
```

The same warning applies to recovery.js: this is **not** a production-suite approval.

Production rule:

- use a reviewed/audited HPKE implementation or equivalently reviewed construction for tenant-key distribution/recovery wrapping;
- select final AEAD/signature suite through security ADR/review;
- preserve tenant/epoch/recipient/recovery-key context binding;
- preserve origin/authorizer authentication properties;
- preserve tenant-scoped authorization checks at both key-wrap creation and consumption;
- do not port the spike's hand-composed key-wrap code directly into the app.

Research provenance:

- `research/SYNC-CRYPTO-2026-SOURCES.md`
- `research/Q005-PRODUCTION-CRYPTO-2026-SOURCES.md`

## 4. Key hierarchy security requirements

```text
Tenant Root Key
  never cloud plaintext
  explicit key epoch
  domain-separated derivation

Device private keys
  generated/stored locally
  platform-protected where supported
  never synchronized as ordinary payload

Device public keys
  cloud-visible minimized metadata
  do not themselves grant tenant authority

DeviceAuthorization
  tenant-scoped
  epoch-scoped
  identity-bound
  auditable

DeviceKeyWrap
  recipient-bound
  authorizer-bound
  tenant/epoch/context-bound
  signed/authenticated
  authorizer authorization checked on creation + consumption
  recipient authorization checked on creation + consumption

Recovery Public Key
  cloud-visible minimized metadata
  cannot decrypt

Recovery Private Key
  user-held offline authority
  not ordinary app persistence
  never cloud plaintext
  never E2EE-synchronized as tenant state
  never logged

RecoveryEpochWrap
  tenant/epoch/recovery-key bound
  authorizer identity-bound
  authorizer tenant/epoch authorization-bound
  authenticated
  cloud stores ciphertext + minimum context only
```

## 5. Envelope security requirements

Every production sync envelope must provide:

```text
confidentiality
payload integrity
routing-header integrity
origin authentication
tenant-scoped origin authorization
key-epoch-scoped origin authorization
replay identity
key epoch binding
schema binding
```

Financial semantics should remain inside ciphertext unless a later requirement demonstrates a compelling need for particular plaintext metadata.

A valid signature from a device record associated with another tenant is not sufficient authority.

## 6. Recovery security requirements

ADR-014 is accepted at the logical/spike level:

```text
SERVER MASTER KEY          REJECTED
PASSWORD-ONLY RECOVERY     REJECTED FOR MK0
ASYMMETRIC RECOVERY KEY    ACCEPTED AT SPIKE LEVEL
PRIVATE RECOVERY KEY       USER-HELD / OFFLINE
PER-EPOCH RECOVERY WRAP    REQUIRED
```

A key epoch cannot be described as recoverable unless coverage is explicit and authenticated.

```text
recoverable epoch N
        ↓
matching tenant_id
matching recovery_key_id
matching key_epoch
        +
header authorizer identity = authorization-record identity
        +
authorizer authorized for same tenant + epoch
        +
framing/signature valid
        +
exactly one DISTINCT authentic authority
        ↓
RECOVERY-COVERED
```

Exact duplicate delivery of the same authenticated wrap is idempotent. A tampered package cannot count as coverage. Multiple distinct authentic packages for the same declared epoch fail closed as ambiguous until an explicit reconciliation model exists.

The recovery spike now demonstrates **18/18** bounded Recovery properties, including cloud non-authority, wrong-key failure, multi-epoch restore, tamper rejection, no-kit/no-backdoor state, authenticated coverage, ambiguity handling and a fail-closed post-recovery future-sync gate.

Evidence:

`../10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`

## 7. Post-recovery hardening

Recovery itself increases exposure because Recovery Private Key material must be imported into a device. Therefore successful disaster recovery must immediately transition away from the recovered historical trust state:

```text
restore through epoch N
        ↓
new device authorization ACTIVE from N+1
lost devices REVOKED from N+1
new tenant epoch N+1 applied
new Recovery Key applied
old Recovery Key retired for future epochs
new RecoveryEpochWrap N+1 authenticated
        ↓
POST-RECOVERY READINESS CHECK
        ↓ PASS
normal future sync
```

A transition **plan** alone is not sufficient. The bounded implementation now has a fail-closed readiness predicate that refuses future sync if the tenant epoch was not rotated, the Recovery Key was not rotated, the new device is not properly authorized, any declared lost device remains authorized, or the new epoch lacks matching recovery coverage.

This remains `PROVEN_AT_SPIKE`. Real platform authorization, key generation, control-plane enforcement and physical revocation remain evidence requirements.

## 8. Metadata leakage

E2EE does not mean zero metadata.

Potential leakage now includes:

```text
when a device was active
how many events were synchronized
relative ciphertext sizes
which devices belong to one tenant
tenant-scoped authorization membership
key rotation/revocation timing
presence/count of recovery wraps
Recovery Key rotation timing
recovery activity timing
```

Open question: define an acceptable metadata leakage budget and determine whether padding/batching is worth battery/latency cost.

MK0 must not claim "cloud knows nothing". A defensible claim is narrower: **normal cloud sync/recovery storage does not require financial payload plaintext or Recovery Private Key authority**.

## 9. Conflict safety

Relay arrival order is not user intent.

Concurrent incompatible corrections must produce deterministic local `SyncConflict` state instead of silent last-write-wins financial mutation.

The spike demonstrates this for category corrections only. Other non-commutative domain actions remain to be enumerated before Q-005 closure.

## 10. Background / parasympathetic security

Background interruption must not create a partial-security state.

Candidate rule:

```text
bounded unit
  ↓
authenticate tenant + identity + epoch
  ↓
decrypt/validate
  ↓
durable domain commit
  ↓
durable checkpoint
```

If the OS terminates work, a unit may replay but must remain idempotent.

Low battery/resource constraints may defer work; they may not disable encryption, authorization, signature validation, provenance, deduplication or recovery-coverage checks.

## 11. Privacy matrix revalidation

Q-005 recovery adds explicit classes:

```text
RECOVERY-PRIVATE-KEY   CRITICAL
RECOVERY-PUBLIC-KEY    MEDIUM
RECOVERY-EPOCH-WRAP    HIGH
```

`tools/validate-privacy-matrix.mjs` merges and validates both:

- `PRIVACY-DATA-MATRIX.json`
- `PRIVACY-RECOVERY-MATRIX.json`

The matrix remains a design-level policy until physical storage/transport/deletion evidence exists.

## 12. Spike evidence level

The Q-005 synthetic suite currently establishes `PROVEN_AT_SPIKE` support for bounded properties including:

- encrypted opaque relay payload;
- tamper detection;
- signed origin;
- tenant-scoped + epoch-scoped origin authorization;
- tenant-scoped + epoch-scoped key-wrap authorizer/recipient authorization;
- recipient authorization re-check when unwrapping a tenant key;
- cross-tenant key/origin rejection;
- per-device sequence model;
- duplicate replay idempotency;
- deterministic two-device convergence;
- future-access revocation model;
- lease failure not being sole correctness mechanism;
- deterministic conflict creation/resolution;
- bounded parasympathetic scheduling rules;
- cloud lacking Recovery Private Key/root-key authority in the modeled recovery view;
- Recovery Public Key non-decryptability;
- multi-epoch recovery with correct Recovery Kit;
- recovery-wrap context/tamper/authorizer checks;
- authenticated, non-ambiguous recovery coverage;
- exact recovery-wrap replay idempotency;
- post-recovery future-sync readiness gate.

Observed suite on commit `404f7f1a0f6010d583e72010876785eef00b7254`:

```text
Q-005 E2EE/KEY/RECOVERY/PNS  51 / 51 PASS
RECOVERY                    18 / 18 PASS
KEY AUTHORITY                 5 / 5 PASS
HEARTBEAT                         PASS
MK0 FOUNDATION                3 / 3 PASS
```

It does **not** establish:

```text
mobile secure-keystore correctness
production HPKE implementation correctness
Android ↔ iOS crypto interoperability
side-channel resistance
real control-plane tenant authorization enforcement
real recovery-wrap retrieval authorization
real network partition behavior
real app crash/restart persistence
physical Recovery Kit export/import safety
physical all-devices-lost recovery
physical post-recovery revocation/rotation
Android/iOS physical background behavior
penetration-test results
```

## 13. SEC-001 impact

```text
SEC-001 remains DRAFTED
Q-005 recovery ownership model is SPIKE-ACCEPTED under ADR-014
tenant/epoch key authority is strengthened at spike level
Q-004 privacy model includes recovery classes
DM-001 includes recovery records/relationships and fail-closed readiness semantics
production crypto decision remains OPEN
physical mobile/control-plane evidence remains OPEN
```

No security closure is claimed from the synthetic spike alone.
