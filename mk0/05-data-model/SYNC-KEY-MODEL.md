# DM-001 — Sync / Key Logical Model

**Scope:** Q-005 logical model  
**Physical schema:** NOT FROZEN

This document reconciles the Q-005 peripheral/parasympathetic/recovery architecture into explicit domain records without selecting a database engine.

## 1. DeviceAuthorization

Represents authorization of one device for one tenant.

```text
id
tenant_id
device_id
status              PENDING | ACTIVE | REVOKED
authorized_at
authorized_by_device_id?
revoked_at?
revoked_by_device_id?
authorized_from_key_epoch
revoked_from_key_epoch?
reason?
```

A device can theoretically participate in more than one tenant; authorization is **tenant-scoped and epoch-scoped**. Matching `device_id` alone never grants authority in another tenant or another epoch.

Executable spike rule:

```text
AUTHORIZED(device, tenant, epoch)
=
record.device_id matches expected identity
AND record.tenant_id = tenant
AND epoch >= authorized_from_key_epoch
AND (revoked_from_key_epoch is null OR epoch < revoked_from_key_epoch)
AND status permits that historical/current authorization window
```

## 2. DevicePublicKey

Only public-key metadata belongs in ordinary cloud/control-plane persistence.

```text
id
device_id
purpose             ENCRYPTION | SIGNING
algorithm_id
public_key
created_at
status
revoked_at?
```

Private key material is intentionally absent from this logical cloud record. A public key record does **not** itself confer tenant authority; authorization comes from the corresponding tenant-scoped `DeviceAuthorization` relationship.

## 3. TenantKeyEpoch

Logical metadata describing a tenant root-key generation.

```text
tenant_id
key_epoch            monotonic positive integer
status               CURRENT | HISTORICAL | RETIRED
created_at
rotated_reason?      DEVICE_REVOKED | COMPROMISE | RECOVERY | SCHEDULED | OTHER
created_by_device_id
retired_at?
recovery_coverage_state  REQUIRED | COVERED | MISSING | INVALID | AMBIGUOUS | NOT_RECOVERABLE
```

The usable root key itself is **not** a cloud database field.

`COVERED` is not inferred from the existence of a Recovery Public Key or from the mere presence of ciphertext. It requires an authenticated, tenant/epoch/key-bound and non-ambiguous recovery wrap.

## 4. DeviceKeyWrap

Opaque package containing a tenant key epoch encrypted/wrapped to one authorized device.

```text
id
tenant_id
key_epoch
recipient_device_id
authorizing_device_id
algorithm_suite_id
encapsulation_or_ephemeral_public_data
nonce_or_framing
wrapped_key_ciphertext
authentication_tag?
authorizer_signature
created_at
status               ACTIVE | SUPERSEDED | REVOKED
```

The final field set depends on the reviewed production HPKE/library API selected at security freeze.

### Load-bearing authorization contract

A device key wrap is valid only when all of the following agree:

```text
header.tenant_id
header.key_epoch
header.recipient_device_id
header.authorizing_device_id
        ↓
recipient DeviceAuthorization for same tenant + epoch
        +
authorizer DeviceAuthorization for same tenant + epoch
        +
recipient private identity matches recipient_device_id when consuming
        +
authorizer signing key verifies the signed header/ciphertext
        ↓
VALID DEVICE KEY WRAP
```

Both creation and consumption re-check authorization. A cross-tenant record, revoked authorizer, revoked recipient, identity mismatch or signature failure is fail-closed.

## 5. RecoveryKeyRecord

Public/control-plane representation of one tenant Recovery Key generation.

```text
id
tenant_id
recovery_key_id
public_key
algorithm_suite_id
status               ACTIVE | HISTORICAL | RETIRED
created_at
activated_at
retired_at?
rotation_reason?     RECOVERY | COMPROMISE | USER_ROTATION | OTHER
```

This record contains **public** recovery material only.

There is deliberately no `recovery_private_key` cloud field.

The Recovery Private Key belongs to the user's offline Recovery Kit and may be transiently imported into a local recovery session.

## 6. RecoveryEpochWrap

Opaque package containing one tenant root-key epoch wrapped to one Recovery Public Key.

```text
id
tenant_id
key_epoch
recovery_key_id
authorizing_device_id
algorithm_suite_id
encapsulation_or_ephemeral_public_data
nonce_or_framing
wrapped_key_ciphertext
authentication_tag?
authorizer_signature
created_at
status               ACTIVE | SUPERSEDED | RETIRED
```

Required context binding:

```text
tenant_id
+
key_epoch
+
recovery_key_id
+
authorizer identity
+
authorizer tenant/epoch authorization
```

A recovery wrap is ciphertext authorization material, not a usable tenant key.

## 7. RecoveryCoverage

This can be materialized or derived, but its semantics must be explicit.

Conceptual record:

```text
tenant_id
key_epoch
recovery_key_id
state                COVERED | MISSING | INVALID | AMBIGUOUS | NOT_REQUIRED
validated_at
validated_by_version
matching_wrap_id?
```

Invariant:

```text
TenantKeyEpoch.recovery_coverage_state = COVERED
    IFF
exactly one DISTINCT authenticated RecoveryEpochWrap authority exists for
  tenant_id + key_epoch + recovery_key_id
AND
  signed authorizer identity matches its DeviceAuthorization record
AND
  authorizer was authorized for the same tenant + epoch
AND
  framing/context/signature checks pass
```

Exact relay duplicates of the **same authenticated package** are idempotent and do not create ambiguity. Two distinct authentic packages for the same declared epoch are `AMBIGUOUS` and fail closed until an explicit reconciliation model resolves them. A tampered, incorrectly signed, cross-tenant or unauthorized-authorizer package cannot satisfy coverage merely by existing.

## 8. SyncEnvelope

Cloud relay record for one encrypted domain action.

```text
event_id
tenant_id
origin_device_id
origin_device_sequence
key_epoch
schema_version
client_created_at
server_sequence
server_received_at
ciphertext
ciphertext_framing
device_signature
```

Financial payload fields do not exist as relay plaintext columns.

An origin envelope is accepted only if its origin record is authorized for `envelope.tenant_id + envelope.key_epoch`; a same-ID authorization record from another tenant is not sufficient.

For a revoked origin, cryptographic validity under a historical epoch is **not sufficient** after cutover. Historical admissibility must also be proven against the revoked origin's authenticated cutover commitment.

## 9. DeviceSyncCheckpoint

Device-local crash-safe operational state.

```text
tenant_id
device_id
last_server_sequence_seen
per_origin_contiguous_sequences
missing_origin_ranges
known_key_epochs
known_revocation_barrier_ids
pending_local_event_ids
schema_version
updated_at
```

Candidate rule: encrypted local persistence; do not sync this entire device checkpoint as cloud plaintext in MK0.

## 10. OriginSequenceState

Device-local monotonic sequence allocator.

```text
tenant_id
device_id
last_committed_sequence
updated_at
```

Sequence allocation must be durable enough that app restart does not reuse an already-committed origin sequence.

## 11. RevocationBarrier

Signed authorization metadata freezing the exact accepted historical origin stream for one revoked device.

Conceptual record:

```text
id
tenant_id
revoked_device_id
revoked_from_key_epoch
last_accepted_origin_sequence
history_commitment
commitment_algorithm_id
authorizing_device_id
authorizer_signature
created_at
status                ACTIVE | SUPERSEDED | INVALID
```

Load-bearing contract:

```text
revoked DeviceAuthorization belongs to tenant
revoked_from_key_epoch matches barrier
        +
authorizer DeviceAuthorization belongs to same tenant
        +
authorizer is authorized at revoked_from_key_epoch
        +
authorizer != revoked device
        +
historical origin stream is contiguous through cutoff
        +
barrier signature validates
        ↓
AUTHENTICATED REVOCATION CUTOVER
```

The bounded spike commits an ordered canonical digest set of accepted historical envelopes. Production may use a reviewed hash chain, Merkle/checkpoint structure or equivalent append-only commitment.

The barrier is **not financial truth** and contains no required financial plaintext. It is security-sensitive control-plane metadata governing whether historical envelopes from a revoked origin remain admissible.

Exact relay duplicates and transport reordering of the committed historical set remain harmless. Post-cutover extension, sequence substitution, sequence forks and unresolved gaps fail closed.

See `../04-architecture/REVOCATION-CUTOVER.md`.

## 12. SyncConflict

Deterministic record for non-commutative concurrent user actions.

```text
id
tenant_id
target_type
target_id
conflict_type
base_revision
candidate_action_ids[]
state                OPEN | RESOLVED
created_at
resolved_by_action_id?
resolved_at?
```

Conflict candidates remain encrypted domain payload/state. The cloud relay need not interpret the conflict.

## 13. DomainAction

Decrypted local representation of a sync payload.

Candidate action families:

```text
CANONICAL_EVENT_CREATED
CATEGORY_CORRECTED
MERCHANT_CORRECTED
CANDIDATE_REJECTED
REVIEW_RESOLVED
CATEGORY_CONFLICT_RESOLVED
DEVICE_AUTHORIZATION_CHANGED
KEY_EPOCH_ROTATED
RECOVERY_KEY_ROTATED
RECOVERY_COMPLETED
```

The exact action catalogue remains subject to Q-001/Q-002/Q-005 reconciliation.

Recovery-sensitive actions must not expose Recovery Private Key material.

A Revocation Barrier is modeled as signed control-plane authorization metadata rather than an ordinary encrypted financial `DomainAction` in the current spike.

## 14. ProcessingLease

Existing coordination record remains intentionally non-authoritative for correctness.

```text
id
connection_id
device_id
lease_epoch
claimed_at
expires_at
released_at?
```

Correctness chain:

```text
ProcessingLease
      ↓ optimizes
source execution
      ↓
stable evidence/canonical identity
      ↓
encrypted sync envelope
      ↓
idempotent materialization
```

A missing/expired/duplicated lease may waste work but must not duplicate economic truth.

## 15. Autonomic runtime state

`RESTING`, `BACKOFF`, `WAITING_FOR_OS`, `WAITING_FOR_CONNECTIVITY`, battery flags and similar transient scheduler states are not automatically tenant-domain truth.

Persist only what is required to resume safely:

```text
checkpoint
pending work identity
failure class / bounded retry metadata
next provider-allowed attempt where required
revocation cutover checkpoint where applicable
```

Do not event-source every ephemeral scheduler transition.

## 16. Revocation semantics

Normal device revocation is now a two-part contract.

### Part A — future key authority

```text
DeviceAuthorization B → REVOKED from epoch N+1
TenantKeyEpoch N+1 → generated by trusted device
DeviceKeyWrap N+1 → created only for remaining authorized devices
RecoveryEpochWrap N+1 → created for active Recovery Public Key
SyncEnvelope N+1 → accepted only from devices authorized for same tenant + N+1
```

### Part B — historical admissibility cutover

Because B may still own epoch N + its signing private key:

```text
accepted historical B envelopes
        ↓
resolve/fail any sequence gaps through chosen cutoff
        ↓
compute accepted-history commitment
        ↓
still-authorized device signs RevocationBarrier
        ↓
post-cutover B envelope is historical-admissible
IFF it belongs to committed accepted history
```

Creation and consumption of `DeviceKeyWrap` both enforce the authorization window. Historical device-held plaintext/key material cannot be retroactively erased by this model, but retained historical keys do not grant permission to create newly admissible history after cutover.

## 17. All-devices-lost recovery transition

ADR-014 defines the disaster path.

```text
recover epochs ≤ N locally with Recovery Kit
        ↓
new device identity generated
        ↓
lost DeviceAuthorization records → REVOKED from N+1
new DeviceAuthorization → ACTIVE from N+1
        ↓
TenantKeyEpoch N+1 generated with reason RECOVERY
        ↓
DeviceKeyWrap N+1 → new device
RecoveryKeyRecord → rotate to new key
RecoveryEpochWrap N+1 → new Recovery Public Key
        ↓
authenticated RecoveryCoverage(N+1) = COVERED
        ↓
lower-level post-recovery readiness predicate passes
        ↓
RevocationBarrier for every lost device
signed by the newly authorized recovery device
        ↓
SAFE_TO_RESUME_FUTURE_SYNC
```

The recovered device must not simply inherit the identity/private keys of a lost device.

### Lower-level hardening gate

Before even considering the final cutover, executable state must prove all of:

```text
current tenant key epoch = N+1
new Recovery Key is active
new device is ACTIVE from N+1 for the same tenant
all declared lost devices are REVOKED from N+1
N+1 has authenticated/non-ambiguous recovery coverage under the new Recovery Key
```

### Final load-bearing resume gate

The lower-level state is necessary but not sufficient. Final resume additionally requires:

```text
one authenticated RevocationBarrier
for every declared lost device
bound to tenant + lost device + N+1 + new recovery device authority
```

Any missing/tampered barrier fails closed.

## 18. Recovery failure semantics

```text
all devices lost + valid Recovery Kit + complete authenticated wraps
→ cryptographic recovery possible in principle

recovery complete + missing lost-device RevocationBarrier
→ future sync remains blocked by final cutover gate

all devices lost + missing/invalid/ambiguous required epoch wrap
→ recovery coverage failure

all devices lost + Recovery Kit lost
→ cryptographic recovery impossible
```

No logical `server_master_key` entity exists.

## 19. Privacy ownership

The model maps to explicit privacy classes:

```text
DEVICE-PRIVATE-KEY
TENANT-ROOT-KEY
TENANT-KEY-WRAP
RECOVERY-PRIVATE-KEY
RECOVERY-PUBLIC-KEY
RECOVERY-EPOCH-WRAP
REVOCATION-CUTOVER-BARRIER
KEY-EPOCH-METADATA
CLOUD-E2EE-ENVELOPE
SYNC-CHECKPOINT
```

`RECOVERY-PRIVATE-KEY` is intentionally absent from ordinary cloud persistence and tenant E2EE synchronization.

`REVOCATION-CUTOVER-BARRIER` is allowed as minimized signed cloud metadata but is classified explicitly because it leaks device/cutover activity information.

## 20. Deletion relationship

Tenant deletion must cover, subject to final legal/security retention rules:

```text
DeviceAuthorization
DevicePublicKey
TenantKeyEpoch metadata
DeviceKeyWrap ciphertext
RecoveryKeyRecord public metadata
RecoveryEpochWrap ciphertext
RevocationBarrier metadata/signatures
SyncEnvelope ciphertext
local DeviceSyncCheckpoint
local OriginSequenceState
local tenant keys/private device keys
transient imported Recovery Private Key material
```

FinanceSensor cannot remotely delete a Recovery Kit copy the user exported outside the application. The UX/policy must state that limitation accurately.

## 21. Executable recovery, revocation and key-authority evidence

Current spike evidence binds:

```text
INV-SYNC-003 device-key distribution is tenant/epoch/identity scoped
INV-SYNC-008 cloud lacks recovery decryption authority
INV-SYNC-009 recoverable epochs require authenticated, unique recovery coverage
INV-SYNC-010 recovery hardening must be applied before future sync
INV-SYNC-011 old Recovery Key cannot decrypt future-only epochs
INV-SYNC-012 revoked-origin accepted history is frozen at authenticated cutover
```

Load-bearing executable cases include:

```text
KEY-001..KEY-005 tenant/epoch/identity key authority
REC-001..REC-018 recovery ownership + lower-level hardening
REV-001..REV-007 revocation cutover integrity
REC-019..REC-022 final post-recovery cutover gate
```

Evidence:

- `../10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`
- `../10-evidence/EV-Q005-REVOCATION-CUTOVER-2026-09-01.md`

Current level: `PROVEN_AT_SPIKE` only.

## 22. Physical-schema blockers

Do not freeze migrations for this model until:

```text
Q-005 synthetic suite                    PASS
all-devices-lost ownership model         SPIKE-ACCEPTED / ADR-014
production crypto suite                  REVIEWED
production revoked-origin commitment     REVIEWED
recovery authentication gate             FROZEN
recovery/cutover retention policy        FROZEN
metadata leakage threat model            PASS
Android key storage                      PHYSICAL EVIDENCE
Apple key storage                        PHYSICAL EVIDENCE
physical recovery                        PHYSICAL EVIDENCE
physical revocation/rotation/cutover     PHYSICAL EVIDENCE
schema migration/replay policy           FROZEN
```

This document is a logical contract, not permission to implement unrestricted sync infrastructure.
