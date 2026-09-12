# SEC-001 — Q-005 Security Revalidation

**Status authority:** `graph/closure-ledger.json`  
**Scope:** multi-device E2EE synchronization, revocation, all-devices-lost recovery, replay identity and conflict safety.

## 1. Trust boundaries

```text
AUTHORIZED DEVICE
  holds private device keys
  may hold usable tenant key epochs
  sees decrypted financial state
  receives tenant + epoch scoped authority

CLOUD RELAY / CONTROL PLANE
  sees minimized routing/security metadata
  stores opaque sync envelopes
  stores public device-key metadata
  stores DeviceAuthorization metadata
  stores wrapped tenant-key packages
  stores Recovery Public Key + recovery-wrap ciphertext
  may store signed Revocation Barrier metadata
  must not need financial plaintext
  must not hold Recovery Private Key authority

RECOVERY KIT / USER-HELD AUTHORITY
  holds Recovery Private Key material
  lives outside ordinary cloud/app state after export
  may restore retained tenant epochs locally

REVOKED / LOST DEVICE
  may retain historical plaintext
  may retain historical tenant keys
  may retain its signing private key
  must lose future key/authorization
  must not gain newly admissible stale-epoch history after cutover
```

## 2. Load-bearing authority rule

```text
VALID CRYPTOGRAPHY
        ≠
VALID AUTHORITY
        ≠
VALID HISTORICAL ADMISSIBILITY
        ≠
SAFE RECOVERY RESUME
```

A signature is usable authority only when device identity, tenant, key epoch and authorization window all agree.

A valid old signature from a revoked device is not automatically admissible history after cutover.

## 3. Replay identity security

The knee stress campaign found two hidden last-write-wins surfaces.

### Event identity

```text
same event_id + exact same immutable header/action
→ idempotent replay

same event_id + different immutable header/action
→ sync-event-id-content-conflict
→ FAIL CLOSED
```

`event_id` is an immutable replay identity, not a mutable storage slot.

### Origin sequence identity

```text
(tenant_id, origin_device_id, origin_device_sequence)
→ one event identity
```

Two distinct event IDs cannot occupy the same sequence position for one tenant/device. Equal sequence numbers on different devices are independent.

This is captured by `INV-SYNC-013`.

## 4. Tenant isolation

Materialization is tenant-scoped.

Decoded actions from different tenants cannot be projected into one materialized financial state. Mixed-tenant input fails before canonical/correction projection.

This closes a cross-tenant state-confusion path discovered by the stress suite and is captured by `INV-SYNC-014`.

## 5. Conflict-resolution safety

A domain conflict cannot be “resolved” by reintroducing last-write-wins at the resolution layer.

```text
incompatible concurrent corrections
→ CATEGORY_CORRECTION_CONFLICT

incompatible concurrent resolutions
→ CATEGORY_RESOLUTION_CONFLICT

resolution selecting outside candidate set
→ CATEGORY_RESOLUTION_INVALID

multiple resolutions selecting same candidate
→ retry-equivalent / converge
```

This is captured by `INV-SYNC-015`.

## 6. Revocation threat

A lost device can retain:

```text
Tenant Root Key N
+
its signing private key
```

Rotating to epoch `N+1` blocks future key access but does not tell a receiver whether a valid epoch-N envelope was actually created before or after revocation.

Therefore:

```text
VALID OLD SIGNATURE + OLD KEY
        ≠
POST-CUTOVER HISTORICAL AUTHORITY
```

## 7. Revocation Barrier

A still-authorized authority freezes the accepted historical origin stream.

Candidate signed context:

```text
tenant_id
revoked_device_id
revoked_from_epoch
last_accepted_origin_sequence
history_commitment
authorizing_device_id
```

The bounded model rejects:

```text
post-cutover stale-epoch extension
historical substitution
sequence forks
event_id reuse
known origin gaps
cross-tenant authority
revoked-device self-cutover
barrier tampering
barrier/history mismatch
```

Exact duplicates and transport reordering of the already committed historical set remain harmless.

This supports `INV-SYNC-012`.

## 8. All-devices-lost inventory safety

All-devices-lost recovery must account for **every tenant device that was authorized at the last recovered epoch**.

A record edited to `REVOKED from N+1` does not make the historical device disappear from the lost-device set. It still requires explicit inventory, recovered-history handling and a cutover barrier.

Before the lower-level recovery gate passes:

```text
new device ACTIVE from N+1
all devices active at recovered epoch accounted for
all declared lost devices REVOKED from N+1
no undeclared device authorized at N+1
Tenant Root Key rotated
Recovery Key rotated
N+1 RecoveryCoverage valid
```

Before the **final** resume gate passes:

```text
lower-level hardening
+
recovered history evidence for each lost device
+
valid matching Revocation Barrier for each lost device
→ SAFE_TO_RESUME_FUTURE_SYNC
```

## 9. Barrier retry / ambiguity safety

Package identity is not the same as semantic cutover authority.

Equivalent re-signed barriers with the same:

```text
tenant
device
revocation epoch
last accepted sequence
history commitment
authorizer
```

are retry-equivalent.

Distinct authentic semantic cutovers for one lost device are ambiguous and fail closed.

The stress suite exercised 32 equivalent re-signed barriers successfully.

## 10. Recovery authority

ADR-014 remains the accepted logical model:

```text
SERVER MASTER KEY          REJECTED
PASSWORD-ONLY RECOVERY     REJECTED FOR MK0
ASYMMETRIC RECOVERY KEY    SPIKE-ACCEPTED
Recovery Private Key       USER-HELD / OFFLINE
PER-EPOCH RECOVERY WRAP    REQUIRED
AUTHENTICATED COVERAGE     REQUIRED
```

The cloud can store public recovery metadata and ciphertext wraps but not recovery decryption authority.

The Recovery Private Key is never ordinary tenant sync state.

## 11. Production cryptography status

The Node spike composes platform primitives only to prove bounded protocol properties.

Production still requires a reviewed implementation/construction for:

```text
HPKE / tenant-key distribution
AEAD payload protection
signature suite
key derivation/domain separation
append-only historical commitment
platform key storage
```

The spike's hand-composed construction is not production approval.

## 12. Knee stress evidence

Evidence:

`../10-evidence/EV-Q005-KNEE-STRESS-2026-09-01.md`

Observed campaign:

```text
Wave 1   62 / 67 PASS  → 67 / 67 PASS
Wave 2   72 / 74 PASS  → repaired
Wave 3   75 / 77 PASS  → 77 / 77 PASS
Wave 4   78 / 80 PASS  → 80 / 80 PASS
Wave 5   83 / 84 PASS  → 84 / 84 PASS
```

The five red waves exposed 12 assertions not protected by the previous suite.

Final bounded executable head:

`d09a420532d0f02ba904fec401932919065e66cc`

```text
E2EE / KEY / RECOVERY / REVOCATION / KNEE / PNS  84 / 84 PASS
MK0 FOUNDATION                                    3 / 3 PASS
```

## 13. Security properties now `PROVEN_AT_SPIKE`

Q-005 bounded support now includes:

```text
INV-SYNC-008  cloud lacks recovery decryption authority
INV-SYNC-009  authenticated/non-ambiguous RecoveryCoverage
INV-SYNC-010  applied recovery hardening before future sync
INV-SYNC-011  Recovery Key rotation isolates future epochs
INV-SYNC-012  frozen revoked-origin historical admissibility
INV-SYNC-013  immutable event/sequence replay identity
INV-SYNC-014  tenant-isolated materialization
INV-SYNC-015  conflict-resolution conflict safety
```

No release-grade `PROVEN` promotion is inferred.

## 14. Critical non-claim — relay withholding / rollback

Cryptographic integrity does not imply Byzantine availability.

The current model can detect a wrong prefix **when it has independent evidence of the expected history**. It cannot prove that a malicious relay did not hide a later prefix that a fresh recovery device has never observed.

```text
FIRST-SEEN COMPLETE-LOOKING PREFIX
        ≠
PROOF OF NO WITHHELD LATER PREFIX
```

A stronger anti-rollback guarantee requires an independently trusted checkpoint/anchor that survives device loss or a reviewed transparency mechanism.

Candidate directions may include:

```text
platform-protected monotonic checkpoint surviving recovery
user-held recovery commitment
independently authenticated transparency/checkpoint service
```

No candidate is frozen. Q-005 therefore does **not** claim Byzantine availability or first-seen anti-rollback protection.

## 15. Metadata leakage

E2EE/recovery/cutover metadata may reveal:

```text
tenant pseudonymous identity
device membership
origin sequence counts
key/recovery epoch numbers
revocation timing
last accepted origin sequence
history commitment
ciphertext sizes/timing
```

The cloud still does not require plaintext amount, merchant, category, email content, Tenant Root Key or Recovery Private Key for the normal path.

## 16. Physical proof still required

The synthetic campaign does not prove:

```text
Android Keystore / StrongBox correctness
Apple Keychain / Secure Enclave correctness
Android ↔ iOS interoperability
real control-plane tenant authorization
real recovery/barrier retrieval authorization
real crash/restart atomicity
long-offline / partition behavior
physical Recovery Kit handling
physical all-devices-lost recovery
physical post-recovery cutover
barrier/recovery retention + deletion
anti-rollback trust anchor
side-channel resistance
penetration-test results
```

## 17. SEC-001 impact

```text
SEC-001                         DRAFTED
Q-005                           ACTIVE
KNEE STRESS                     PASS AT SPIKE LEVEL
INV-SYNC-008..015               PROVEN_AT_SPIKE
PRODUCTION CRYPTO               OPEN
ANTI-ROLLBACK TRUST ANCHOR      OPEN
PHYSICAL MOBILE EVIDENCE        OPEN
BUILD_READY                     false
```

The result is a materially stronger logical knee, not permission to merge or begin unrestricted implementation.
