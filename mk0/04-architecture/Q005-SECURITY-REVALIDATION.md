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

CLOUD RELAY / CONTROL PLANE
  sees minimized routing metadata
  stores opaque sync envelopes
  stores public device-key metadata
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
serve stale device wraps
serve stale/incomplete recovery wraps
substitute recovery public metadata
withhold recovery coverage
```

Candidate controls demonstrated structurally or at spike level:

```text
AEAD integrity
signed device-origin envelopes
stable event identity
per-device monotonic sequence
key epoch authorization
local checkpoint/gap detection
explicit device public-key trust records
recovery-wrap context binding
historical authorizer signature verification
recovery coverage checks
```

A malicious relay can still withhold data. Q-005 does not claim Byzantine availability.

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
```

Exact recovery authentication policy remains open.

## 3. Cryptographic construction status

The feasibility spike demonstrates bounded properties using Node primitives:

```text
X25519-style ephemeral key agreement
HKDF-SHA256 domain separation
AES-256-GCM AEAD
Ed25519 origin signatures
```

The same warning applies to recovery.js: this is **not** a production-suite approval.

Production rule:

- use a reviewed/audited HPKE implementation or equivalently reviewed construction for tenant-key distribution/recovery wrapping;
- select final AEAD/signature suite through security ADR/review;
- preserve tenant/epoch/recipient/recovery-key context binding;
- preserve origin/authorizer authentication properties;
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
  authorization state auditable

DeviceKeyWrap
  recipient-bound
  tenant/epoch/context-bound
  signed/authenticated

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
replay identity
key epoch binding
schema binding
```

Financial semantics should remain inside ciphertext unless a later requirement demonstrates a compelling need for particular plaintext metadata.

## 6. Recovery security requirements

ADR-005 is accepted at the logical/spike level:

```text
SERVER MASTER KEY          REJECTED
PASSWORD-ONLY RECOVERY     REJECTED FOR MK0
ASYMMETRIC RECOVERY KEY    ACCEPTED AT SPIKE LEVEL
PRIVATE RECOVERY KEY       USER-HELD / OFFLINE
PER-EPOCH RECOVERY WRAP    REQUIRED
```

A key epoch cannot be described as recoverable unless coverage is explicit.

```text
recoverable epoch N
        ↓
matching tenant_id
matching recovery_key_id
matching key_epoch
        ↓
recovery wrap exists
        ↓
RECOVERY-COVERED
```

The recovery spike demonstrates 12/12 bounded properties including cloud non-authority, wrong-key failure, multi-epoch restore, tamper rejection, no-kit/no-backdoor state, coverage completeness and post-recovery hardening.

Evidence:

`../10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`

## 7. Post-recovery hardening

Recovery itself increases exposure because Recovery Private Key material must be imported into a device. Therefore successful disaster recovery must immediately transition away from the recovered historical trust state:

```text
restore through epoch N
        ↓
new device authorized from N+1
lost devices revoked from N+1
new tenant epoch N+1 required
new Recovery Key required
retire old Recovery Key for future epochs
        ↓
normal future sync
```

This is `PROVEN_AT_SPIKE` only as a deterministic transition plan. Real platform authorization, key generation and revocation remain physical evidence requirements.

## 8. Metadata leakage

E2EE does not mean zero metadata.

Potential leakage now includes:

```text
when a device was active
how many events were synchronized
relative ciphertext sizes
which devices belong to one tenant
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
authenticate/decrypt/validate
  ↓
durable domain commit
  ↓
durable checkpoint
```

If the OS terminates work, a unit may replay but must remain idempotent.

Low battery/resource constraints may defer work; they may not disable encryption, signature validation, provenance, deduplication or recovery-coverage checks.

## 11. Privacy matrix revalidation

Q-005 recovery adds explicit classes:

```text
RECOVERY-PRIVATE-KEY   CRITICAL
RECOVERY-PUBLIC-KEY    MEDIUM
RECOVERY-EPOCH-WRAP    HIGH
```

`tools/validate-privacy-matrix.mjs` now merges and validates both:

- `PRIVACY-DATA-MATRIX.json`
- `PRIVACY-RECOVERY-MATRIX.json`

The matrix remains a design-level policy until physical storage/transport/deletion evidence exists.

## 12. Spike evidence level

The Q-005 synthetic suite currently establishes `PROVEN_AT_SPIKE` for bounded properties including:

- encrypted opaque relay payload;
- tamper detection;
- signed origin;
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
- recovery-wrap context/tamper checks;
- complete recovery coverage requirement;
- post-recovery hardening transition plan.

Observed suite:

```text
Q-005 E2EE/PNS/RECOVERY  40 / 40 PASS
RECOVERY                 12 / 12 PASS
```

It does **not** establish:

```text
mobile secure-keystore correctness
production HPKE implementation correctness
Android ↔ iOS crypto interoperability
side-channel resistance
real cloud authorization enforcement
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
Q-005 recovery ownership model is SPIKE-ACCEPTED
Q-004 privacy model includes recovery classes
DM-001 must include recovery records/relationships
production crypto decision remains OPEN
physical mobile evidence remains OPEN
```

No security closure is claimed from the synthetic spike alone.
