# SEC-001 — Q-005 Security Revalidation

**Status authority:** `graph/closure-ledger.json`  
**Scope:** security consequences introduced by multi-device E2EE synchronization.

## 1. New trust boundaries

Q-005 introduces explicit boundaries that SEC-001 must model:

```text
AUTHORIZED DEVICE
  holds private device keys
  may hold usable tenant key epochs
  sees decrypted financial state

CLOUD RELAY / CONTROL PLANE
  sees routing metadata
  stores opaque sync envelopes
  stores public device-key metadata
  stores device-specific wrapped tenant-key packages
  must not need financial plaintext

REVOKED DEVICE
  may retain historical data/key material already obtained
  must lose future authorization/key epochs
```

## 2. Threat actors

### Honest-but-curious relay

Can observe:

```text
tenant opaque identity
device identities
key epoch numbers
message timing
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
serve stale key wraps
```

Candidate controls:

```text
AEAD integrity
signed device-origin envelopes
stable event identity
per-device monotonic sequence
key epoch authorization
local checkpoint/gap detection
explicit device public-key trust records
```

A malicious relay can still withhold data. Q-005 does not claim Byzantine availability.

### Revoked device

A revoked device may possess old tenant keys and previously decrypted data.

Security objective:

```text
NO FUTURE KEY EPOCH
NO FUTURE AUTHORIZED ENVELOPE ACCESS
NO NEW AUTHORIZED ORIGIN AFTER REVOCATION EPOCH
```

Non-objective:

```text
REMOTE ERASURE OF HISTORICAL PLAINTEXT ALREADY SEEN
```

### Compromised currently authorized device

This remains a severe threat: an authorized compromised device can read data/key material it is legitimately allowed to receive.

Q-005 key rotation/revocation limits future exposure after detection but cannot protect plaintext while the compromised device remains authorized.

## 3. Cryptographic construction status

The spike currently demonstrates bounded properties using Node primitives:

```text
X25519-style ephemeral key agreement
HKDF-SHA256 domain separation
AES-256-GCM AEAD
Ed25519 origin signatures
```

This is **not** a production-suite approval.

Candidate production rule:

- use audited/reviewed HPKE implementation for tenant-key distribution;
- choose the final AEAD/signature suite through security ADR/review;
- preserve AAD/context binding and origin authentication properties;
- do not port the spike's hand-composed key-wrap code directly into the app.

Research provenance: `research/SYNC-CRYPTO-2026-SOURCES.md`.

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

## 6. Metadata leakage

E2EE does not mean zero metadata.

Potential leakage:

```text
when a device was active
how many events were synchronized
relative ciphertext sizes
which devices belong to one tenant
key rotation/revocation timing
```

Open question: define an acceptable metadata leakage budget and determine whether padding/batching is worth battery/latency cost.

MK0 must not claim "cloud knows nothing". A defensible claim is narrower: **normal cloud sync does not require financial payload plaintext**.

## 7. Conflict safety

A relay arrival order is not user intent.

Concurrent incompatible corrections must produce deterministic local `SyncConflict` state instead of silent last-write-wins financial mutation.

The spike currently demonstrates this for category corrections only. Other non-commutative domain actions remain to be enumerated before Q-005 closure.

## 8. Background / parasympathetic security

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

Low battery/resource constraints may defer work; they may not disable encryption, signature validation, provenance or deduplication.

## 9. Recovery risk

All-devices-lost recovery remains **OPEN**.

Do not add a server-held universal master key as an undocumented convenience path.

Any recovery design must state:

```text
who can recover
what secret proves recovery authority
what the server can learn
what happens after attacker account takeover
how recovery is revoked/rotated
how deletion affects recovery material
```

## 10. Spike evidence level

The Q-005 synthetic suite can establish only `PROVEN_AT_SPIKE` for bounded properties such as:

- encrypted opaque relay payload;
- tamper detection;
- signed origin;
- per-device sequence model;
- duplicate replay idempotency;
- deterministic two-device convergence;
- future-access revocation model;
- lease failure not being sole correctness mechanism;
- deterministic conflict creation/resolution;
- bounded parasympathetic scheduling rules.

It does **not** establish:

```text
mobile secure-keystore correctness
production HPKE implementation correctness
side-channel resistance
real cloud authorization enforcement
real network partition behavior
real app crash/restart persistence
all-devices-lost recovery
Android/iOS physical background behavior
penetration-test results
```

## 11. SEC-001 impact

```text
SEC-001 remains DRAFTED
Q-005 adds concrete candidate controls
Q-004 privacy matrix expanded
DM-001 sync/key model expanded
production crypto ADR still OPEN
physical mobile evidence still OPEN
```

No security closure is claimed from the synthetic spike alone.
