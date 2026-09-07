# FinanceSensor — Peripheral Nervous System

**Scope:** Q-005 candidate architecture  
**Status authority:** `graph/closure-ledger.json`  
**Purpose:** connect tenant keys, authorized devices, encrypted synchronization, replay, convergence, revocation and recovery cutover without giving the cloud financial plaintext.

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
equivalent financial state
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

TENANT + EPOCH AUTHORITY
  a valid key/signature outside the correct tenant/epoch does not grant authority

REPLAY IDEMPOTENCY
  duplicate delivery changes state zero additional times

CONVERGENCE
  complete equivalent event sets materialize to equivalent state

REVOCATION
  a revoked device loses future key/payload authorization

HISTORICAL CUTOVER
  a revoked device cannot fabricate newly admissible old-epoch history after cutover

KEY EPOCHS
  revocation or key compromise can move the tenant to fresh key material

RECOVERY
  all-devices-lost restoration does not give cloud a standing master key

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
- use a reviewed append-only/history-commitment structure for revocation cutover;
- conduct a dedicated cryptographic review before freezing algorithms.

HPKE is standardized in RFC 9180 and explicitly composes a KEM, KDF and AEAD. It includes interoperable suites based on ECDH/X25519, HKDF and authenticated encryption.

Source: https://www.rfc-editor.org/info/rfc9180/

AES-GCM is a standardized authenticated-encryption mode documented by NIST SP 800-38D. NIST has announced a revision of that publication, therefore FinanceSensor must refresh the algorithm decision at security freeze rather than treating today's selection as permanent.

Source: https://csrc.nist.gov/pubs/sp/800/38/d/final

### Spike non-claim

The Node feasibility spike may compose platform primitives to **test protocol properties only**. Its wrapping and history-commitment constructions are not automatically production-approved merely because tests pass.

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

Recovery
  public key → cloud-visible minimized metadata
  private key → user-held offline Recovery Kit
```

Rules:

1. `Tenant Root Key` never exists as cloud plaintext.
2. A key epoch is explicit and monotonic.
3. Domain keys are derived with domain separation; one key is not reused indiscriminately for every purpose.
4. Cloud may store a tenant key **wrapped to a specific authorized device**, never usable plaintext.
5. Device private key material never becomes an application-table/cloud field.
6. `DeviceAuthorization` is tenant-scoped and epoch-scoped.
7. Historical keys have an explicit retention policy; revocation guarantees loss of **future** authority, not magical erasure of plaintext a device already saw.
8. Retained historical keys do not grant permission to create newly admissible history after an authenticated revocation cutover.

## 5. Device enrollment

Candidate sequence:

```text
New Device B generates local keypairs
        ↓
B registers public-key metadata + pairing request
        ↓
Trusted Device A displays/verifies B fingerprint
        ↓ explicit user approval
A verifies A and B authorization for same tenant + current epoch
        ↓
A wraps current Tenant Root Key epoch to B
        ↓
A signs authorization/key-wrap context
        ↓
cloud stores opaque wrapped-key package
        ↓
B downloads package
        ↓
B rechecks its tenant + epoch authorization
        ↓
B verifies authorizing device identity/signature
        ↓
B unwraps locally
        ↓
B joins sync from checkpoint
```

No silent device enrollment and no device-global authorization shortcut.

## 6. Device revocation

### Future key cutover

```text
user revokes Device B from N+1
        ↓
control plane marks B REVOKED for N+1+
        ↓
new uploads/download authorizations for B denied
        ↓
remaining trusted device creates Tenant Root Key epoch N+1
        ↓
N+1 wrapped only for still-authorized devices
        ↓
new envelopes use epoch N+1
```

### Why this is not enough

B may still possess:

```text
Tenant Root Key N
+
B signing private key
```

So B could fabricate a new envelope after revocation while labeling it as historical epoch N. A receiver retaining epoch N cannot infer creation time from a valid old signature.

Therefore:

```text
VALID OLD SIGNATURE + OLD KEY
        ≠
POST-CUTOVER HISTORICAL AUTHORITY
```

### Revocation Barrier

The accepted historical origin stream must be frozen by a still-authorized authority:

```text
accepted historical B envelopes
        ↓
validate tenant + historical epoch authorization + signatures
        ↓
require contiguous origin sequence through chosen cutoff
        ↓
canonical history commitment
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
signature
```

After cutover, an old-epoch envelope from B is admissible only if it belongs to the authenticated committed historical set (or a reviewed production-equivalent commitment).

Exact duplicate relay delivery and transport reorder remain harmless. Extension, substitution, sequence forks and unresolved gaps fail closed.

Detailed contract:

`REVOCATION-CUTOVER.md`

### Revocation truth

Revocation can prevent future authority. It cannot make a previously compromised device forget financial data or old keys it already possessed.

Therefore FinanceSensor must never claim remote erasure of already-decrypted historical data.

A malicious relay can still withhold data; the barrier protects integrity, not Byzantine availability.

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

Timing, device identifiers, sequence/cutover values and ciphertext sizes are still metadata leakage and remain part of the threat model.

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
- aid diagnostics without reading financial content;
- define a contiguous historical prefix for authenticated revocation cutover.

A sequence is not global economic ordering.

At cutover, a history such as `1,2,4` cannot be certified as complete through `4` while `3` remains unresolved.

## 9. Server sequence

The relay may assign an opaque `server_sequence` for pagination/checkpointing.

It is **transport order**, not necessarily user-intent order.

FinanceSensor must not solve financial conflicts by blindly applying "last server write wins".

A server sequence is also not sufficient proof that an old-epoch envelope predated revocation. Historical admissibility is governed by the authenticated revoked-origin commitment.

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

A long-offline device that returns after another device was revoked must obtain the current authorization/cutover metadata before admitting newly delivered historical envelopes from the revoked origin.

## 13. Checkpoints

Each device stores local sync checkpoints such as:

```text
last_server_sequence_seen
per-origin highest contiguous sequence
missing sequence ranges
key epochs held
known Revocation Barriers
schema versions understood
pending local envelope IDs
```

Checkpoints are local encrypted operational state. They must be crash-safe.

A Revocation Barrier and the local accepted-history checkpoint must not be persisted in a way that allows restart to forget the cutover and reopen stale history as admissible.

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

Surviving trusted device can authorize a replacement device, rotate future tenant key epoch and certify the revoked device's accepted historical cutoff.

### All devices lost

ADR-014 selects an asymmetric Recovery Key with a user-held offline Recovery Private Key and no standing server master key.

```text
recover retained epochs with Recovery Kit
        ↓
new device identity
        ↓
lost devices REVOKED from N+1
new device ACTIVE from N+1
        ↓
new Tenant Root Key epoch N+1
new Recovery Key
new authenticated RecoveryCoverage(N+1)
        ↓
lower-level post-recovery readiness
        ↓
new device signs Revocation Barrier
for every lost origin after validating accepted history
        ↓
final SAFE_TO_RESUME_FUTURE_SYNC gate
```

If every device and the Recovery Kit are lost, cryptographic recovery is intentionally impossible. No hidden server bypass is permitted.

Detailed decision:

`../11-decisions/ADR-014-RECOVERY-WITHOUT-SERVER-MASTER-KEY.md`

## 16. Q-005 executable proof state

The bounded Node suite currently demonstrates:

```text
key-wrap tenant/epoch/identity authority
wrong-device unwrap failure
ciphertext tamper failure
envelope origin signature verification
cloud-visible payload contains no selected financial plaintext
duplicate replay idempotency
reverse delivery convergence
per-device sequence gap detection
future key-epoch revocation
stale-epoch post-cutover injection rejection
historical substitution/fork/gap rejection
revoked-device self-cutover rejection
concurrent correction deterministic conflict
explicit conflict resolution convergence
all-devices-lost recovery ownership
recovery coverage/authentication/ambiguity rules
lower-level post-recovery readiness
final lost-origin cutover resume gate
parasympathetic scheduling/backoff rules
```

Observed executable cutover baseline:

```text
E2EE / KEY / RECOVERY / REVOCATION / PNS   62 / 62 PASS
REVOCATION CUTOVER                           7 / 7 PASS
POST-RECOVERY CUTOVER                        4 / 4 PASS
```

Passing this spike moves selected invariants only to `PROVEN_AT_SPIKE`, never release-level `PROVEN`.

Relevant evidence:

- `../10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`
- `../10-evidence/EV-Q005-REVOCATION-CUTOVER-2026-09-01.md`

Q-005 remains `ACTIVE` pending reviewed production constructions and physical Android/iOS/control-plane evidence.
