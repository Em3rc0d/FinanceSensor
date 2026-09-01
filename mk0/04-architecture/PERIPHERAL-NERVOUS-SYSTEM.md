# FinanceSensor — Peripheral Nervous System

**Scope:** Q-005 candidate architecture  
**Status authority:** `graph/closure-ledger.json`  
**Purpose:** connect tenant keys, authorized devices, encrypted synchronization, replay, convergence and revocation without giving the cloud financial plaintext.

## 1. Thesis

The cloud is a **relay/control plane**, not the holder of financial truth.

```text
Tenant owns truth
      ↓
authorized devices hold usable key material
      ↓
devices create signed + encrypted domain envelopes
      ↓
cloud stores/routes opaque envelopes
      ↓
other authorized devices verify + decrypt + replay locally
      ↓
equivalent materialized financial state
```

A device is a peripheral execution node. It is never the tenant itself.

## 2. Security properties required

The Q-005 protocol must eventually prove all of the following:

```text
CONFIDENTIALITY
  cloud cannot read financial payloads

INTEGRITY
  payload tampering is detected

AUTHENTIC ORIGIN
  a receiving device can verify which authorized device produced an envelope

REPLAY IDEMPOTENCY
  duplicate delivery changes state zero additional times

CONVERGENCE
  complete equivalent event sets materialize to equivalent state

REVOCATION
  a revoked device loses future key/payload authorization

KEY EPOCHS
  revocation or key compromise can move the tenant to fresh key material

DOMAIN CONFLICT SAFETY
  concurrent non-commutative user actions do not silently overwrite one another
```

## 3. Production cryptography rule

FinanceSensor must **not invent a custom production key-wrapping protocol**.

Candidate production direction:

- use an audited HPKE implementation / reviewed platform library for encrypting tenant key material to an authorized device public key;
- use authenticated encryption (AEAD) for sync payloads;
- bind routing metadata as authenticated additional data (AAD);
- use domain-separated key derivation;
- keep device private keys in platform-protected key storage where supported;
- conduct a dedicated cryptographic review before freezing algorithms.

HPKE is standardized in RFC 9180 and explicitly composes a KEM, KDF and AEAD. It includes interoperable suites based on ECDH/X25519, HKDF and authenticated encryption.

Source: https://www.rfc-editor.org/info/rfc9180/

AES-GCM is a standardized authenticated-encryption mode documented by NIST SP 800-38D. NIST has announced a revision of that publication, therefore FinanceSensor must refresh the algorithm decision at security freeze rather than treating today's selection as permanent.

Source: https://csrc.nist.gov/pubs/sp/800/38/d/final

### Spike non-claim

The Node feasibility spike may compose platform primitives to **test protocol properties only**. Its wrapping construction is not automatically production-approved merely because tests pass.

## 4. Candidate key hierarchy

```text
Tenant Root Key — epoch N
        │
        ├─ HKDF → Sync Payload Key
        ├─ HKDF → Ledger-domain key
        ├─ HKDF → Evidence-domain key
        └─ HKDF → Backup-domain key (future / separate approval)

Device A
  encryption keypair
  signing keypair

Device B
  encryption keypair
  signing keypair
```

Rules:

1. `Tenant Root Key` never exists as cloud plaintext.
2. A key epoch is explicit and monotonic.
3. Domain keys are derived with domain separation; one key is not reused indiscriminately for every purpose.
4. Cloud may store a tenant key **wrapped to a specific authorized device**, never usable plaintext.
5. Device private key material never becomes an application-table/cloud field.
6. Historical keys have an explicit retention policy; revocation primarily guarantees loss of **future** access, not magical erasure of plaintext a device already saw.

## 5. Device enrollment

Candidate sequence:

```text
New Device B generates local keypairs
        ↓
B registers public-key metadata + pairing request
        ↓
Trusted Device A displays/verifies B fingerprint
        ↓ explicit user approval
A verifies current tenant/device authorization
        ↓
A wraps current Tenant Root Key epoch to B
        ↓
A signs authorization/key-wrap context
        ↓
cloud stores opaque wrapped-key package
        ↓
B downloads package
        ↓
B verifies authorizing device signature
        ↓
B unwraps locally
        ↓
B joins sync from checkpoint
```

No silent device enrollment.

## 6. Device revocation

Candidate sequence:

```text
user revokes Device B
        ↓
control plane marks B REVOKED
        ↓
new uploads/download authorizations for B denied
        ↓
remaining trusted device creates Tenant Root Key epoch N+1
        ↓
N+1 wrapped only for still-authorized devices
        ↓
new envelopes use epoch N+1
```

### Revocation truth

Revocation can prevent future access. It cannot make a previously compromised device forget financial data or old keys it already possessed.

Therefore FinanceSensor must never claim remote erasure of already-decrypted historical data.

## 7. Opaque sync envelope

Candidate cloud-visible routing header:

```text
event_id
tenant_id (opaque/pseudonymous identifier)
origin_device_id
origin_device_sequence
key_epoch
schema_version
created_at / server_received_at
ciphertext byte length
```

Encrypted payload contains the domain action and financial meaning.

Candidate envelope:

```text
header
nonce / algorithm framing
ciphertext
authentication tag
device signature
```

The stable header is authenticated as AAD and included in the signed material.

### Cloud must not require

```text
amount plaintext
currency tied to movement plaintext
merchant plaintext
category plaintext
email subject/body plaintext
financial event type plaintext
insight plaintext
```

Timing, device identifiers and ciphertext sizes are still metadata leakage and remain part of the threat model.

## 8. Per-device sequence

Each producing device owns a monotonic sequence:

```text
A: 1, 2, 3, 4...
B: 1, 2, 3...
```

Uses:

- detect duplicate/replayed envelopes;
- detect missing ranges/gaps;
- provide stable origin ordering;
- aid diagnostics without reading financial content.

A sequence is not global economic ordering.

## 9. Server sequence

The relay may assign an opaque `server_sequence` for pagination/checkpointing.

It is **transport order**, not necessarily user-intent order.

FinanceSensor must not solve financial conflicts by blindly applying "last server write wins".

## 10. Domain conflict model

Different mutations need different semantics.

### Naturally idempotent/set-like

```text
canonical event with stable ID
review task creation with stable ID
source evidence identity
acknowledgement of already-known event
```

These can converge by set identity.

### Safe derived/materialized state

Period summaries, category summaries and sensor summaries are rebuilt from canonical actions and do not sync as independent truth.

### Potentially conflicting user corrections

Example:

```text
Device A offline: event X → category FOOD
Device B offline: event X → category TRANSPORT
```

FinanceSensor must not silently let packet arrival order choose the user's truth.

Candidate contract:

```text
correction includes base_revision
        ↓
multiple incompatible corrections from same base revision
        ↓
CONFLICT record
        ↓
no hidden winner
        ↓
explicit resolution action
```

A conflict itself is deterministic state, therefore devices can still converge while waiting for user resolution.

## 11. Processing leases

`ProcessingLease` decides which device should actively poll/process a tenant Connection at a moment in time.

It optimizes duplicate work but never supplies correctness.

```text
lease works         → less duplicate source processing
lease disappears    → duplicate processing can happen
canonical identity  → still prevents double economic truth
```

This preserves `INV-SYNC-005`.

## 12. Offline model

An authorized device can create local domain actions while disconnected.

```text
local action
   ↓
local encrypted queue
   ↓
network unavailable
   ↓
REST / WAIT_FOR_CONNECTIVITY
   ↓
network later available
   ↓
upload opaque envelopes
   ↓
download missing envelopes
   ↓
verify/decrypt/replay
```

Offline is not an exceptional error state.

## 13. Checkpoints

Each device stores local sync checkpoints such as:

```text
last_server_sequence_seen
per-origin highest contiguous sequence
missing sequence ranges
key epochs held
schema versions understood
pending local envelope IDs
```

Checkpoints are local encrypted operational state. They must be crash-safe.

## 14. Schema evolution

Envelope header exposes only enough `schema_version` information to determine whether a device can process a payload.

Candidate rule:

```text
unknown newer schema
      ↓
do not discard
      ↓
retain opaque envelope
      ↓
mark local sync UPGRADE_REQUIRED
      ↓
resume after compatible app/schema available
```

No destructive "best effort" parsing of unknown financial state.

## 15. Recovery

### One device lost, another survives

Surviving trusted device can authorize a replacement device and wrap the current tenant key epoch.

### All devices lost

This is intentionally unresolved for MK0 closure until the recovery product contract is selected.

Options to evaluate separately:

```text
NO_RECOVERY
  strongest simplicity/privacy, highest user-loss risk

USER_RECOVERY_SECRET
  zero-knowledge style recovery with usability risk

RECOVERY_DEVICE / trusted contact
  additional trust/onboarding complexity

ENCRYPTED_RECOVERY_SERVICE
  requires a rigorously specified server-blind recovery construction
```

We do not smuggle a cloud master key into the design just to make recovery convenient.

## 16. Q-005 physical proof requirements

The bounded spike must demonstrate at minimum:

```text
2 device identities
per-device wrapped tenant key
wrong-device unwrap failure
ciphertext tamper failure
envelope origin signature verification
cloud-visible payload contains no selected financial plaintext
duplicate replay idempotency
reverse delivery convergence
per-device sequence gap detection
revocation + key-epoch rotation blocks future access
concurrent correction becomes deterministic conflict
explicit conflict resolution converges
```

Passing this spike moves selected invariants only to `PROVEN_AT_SPIKE`, never release-level `PROVEN`.
