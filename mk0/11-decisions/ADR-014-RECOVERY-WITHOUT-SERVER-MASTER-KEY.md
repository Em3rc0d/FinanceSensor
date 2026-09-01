# ADR-014 — All-Devices-Lost Recovery Without a Server Master Key

**Owner node:** Q-005 (`ACTIVE`)  
**Decision maturity:** SPIKE-ACCEPTED / PHYSICAL VALIDATION REQUIRED  
**Date:** 2026-09-01

## Context

FinanceSensor needs an explicit answer to:

> What happens when every authorized device is lost, destroyed or unavailable?

A convenient answer would be for FinanceSensor cloud to retain a master decryption key. That answer is rejected because it would give the control plane a standing capability to decrypt tenant financial truth and would materially weaken the privacy thesis.

A human password alone is also rejected for MK0 because an encrypted cloud recovery envelope creates an offline guessing target if the server dataset is stolen.

## Decision

Use an **asymmetric Recovery Key** independent from device keys.

```text
Tenant setup
    ↓
generate Recovery Keypair locally
    ↓
Recovery Public Key  ───────────────► minimized tenant metadata
Recovery Private Key ───────────────► user Recovery Kit only
    ↓
device confirms Recovery Kit saved
    ↓
private recovery material removed from ordinary app state
```

For every tenant key epoch declared recoverable:

```text
Tenant Epoch Key N
   ├─ production wrap → Device A public key
   ├─ production wrap → Device B public key
   └─ production wrap → Recovery Public Key
```

The cloud may store ciphertext wraps and minimum routing/version metadata. It never possesses the Recovery Private Key.

## Normal operation

Devices need only the recovery **public** key to create a recovery wrap for every new recoverable epoch. Therefore ordinary devices do not need to retain the Recovery Private Key, and a revoked device cannot use public recovery material to decrypt future epochs.

Creation of a recovery-wrap ciphertext does not itself make an epoch recoverable. Coverage is granted only after validation against tenant-scoped, epoch-scoped authorization evidence.

## Recovery coverage rule

A tenant epoch is not considered recoverable merely because a Recovery Public Key or recovery-wrap ciphertext exists.

```text
recoverable epoch N
        ↓
matching tenant_id
matching recovery_key_id
matching key_epoch
        +
header.authorizing_device_id = authorization-record device_id
        +
authorizer authorized for same tenant + epoch
        +
framing/signature authentic
        +
exactly one DISTINCT authentic authority for that epoch
        ↓
RECOVERY-COVERED
```

A missing, tampered, incorrectly signed, cross-tenant or unauthorized-authorizer wrap cannot count as coverage.

Exact duplicate delivery of the **same authenticated package** is idempotent. Multiple **distinct authentic** recovery packages for the same declared tenant/Recovery-Key/epoch are treated as ambiguous and fail closed until an explicit reconciliation model exists. The system must not arbitrarily select one by relay arrival order.

## All-devices-lost sequence

```text
user authenticates account
        ↓
new device requests opaque recovery wraps
        ↓
user imports Recovery Kit locally
        ↓
new device validates authenticated/non-ambiguous recovery coverage
        ↓
new device unwraps required tenant epochs locally
        ↓
financial history becomes decryptable locally
        ↓
new hardware-backed device identity generated
        ↓
lost device authorizations revoked from N+1
        ↓
new device authorization activated from N+1
        ↓
new tenant epoch N+1 generated/applied
        ↓
new Recovery Keypair generated/applied
        ↓
new Recovery Kit confirmed
        ↓
RecoveryEpochWrap N+1 authenticated under new Recovery Key
        ↓
old Recovery Key retired for future epochs
        ↓
post-recovery readiness gate passes
        ↓
normal future sync resumes
```

Recovery is not permission to silently reactivate lost devices or continue indefinitely on historical key material.

## Post-recovery readiness rule

A recovery **plan** is not permission to resume future sync.

Before normal future synchronization can resume, the executable state must verify all of:

```text
current tenant key epoch = N+1
new Recovery Key is active
new device is ACTIVE from N+1 for the same tenant
all declared lost devices are REVOKED from N+1
N+1 has authenticated/non-ambiguous RecoveryCoverage under the new Recovery Key
```

Any missing condition fails closed. This distinction is intentional:

```text
PLANNED HARDENING ≠ APPLIED HARDENING ≠ VERIFIED READY STATE
```

## Server capability

Server stores only the minimum required recovery-plane material, conceptually:

```text
recovery_key_id
recovery_public_key
key_epoch
opaque recovery-wrap ciphertext
minimum suite/version/routing metadata
tenant-scoped authorization metadata needed for verification
```

Server cannot decrypt a tenant epoch from those values alone.

## Failure semantics

### All devices lost + Recovery Kit available

```text
CRYPTOGRAPHIC RECOVERY POSSIBLE
```

subject to account authentication, compatible client version, valid authenticated/non-ambiguous recovery coverage and intact historical authorization records needed to authenticate wraps.

### All devices lost + required coverage missing/invalid/ambiguous

```text
CRYPTOGRAPHIC RECOVERY BLOCKED FOR AFFECTED EPOCH
```

The application must not silently downgrade the guarantee or choose an ambiguous wrap by arrival order.

### All devices lost + Recovery Kit also lost

```text
CRYPTOGRAPHIC RECOVERY IMPOSSIBLE
```

FinanceSensor must say this plainly. The application may rebuild whatever is still obtainable from source providers after reconnecting them, but local-only corrections, historical source data no longer available upstream, annotations or other unrecoverable state may be lost.

No hidden server bypass is permitted.

## Why asymmetric recovery instead of a symmetric recovery secret stored on devices

If ordinary devices held a reusable symmetric recovery secret so they could update recovery envelopes, a revoked device possessing that secret could potentially decrypt future recovery material. A public Recovery Key solves the update problem without giving ordinary devices recovery decryption authority.

## Why not password-only recovery in MK0

A user-chosen password has uncertain entropy. If cloud recovery ciphertext is stolen, an attacker may perform offline guesses. A future password-protected Recovery Kit may use a reviewed memory-hard KDF, but the underlying recovery authority must remain high-entropy cryptographic material.

## Recovery Kit UX is not frozen here

Possible representations include a file/QR and a human-transcribable high-entropy encoding with checksum. This ADR freezes the cryptographic ownership model, authenticated coverage semantics and post-recovery readiness semantics, not the final UX representation.

Do not import cryptocurrency wallet language/mechanics into consumer UX unless it improves comprehension and is directly justified.

## Security properties demonstrated at spike level

```text
REC-001 cloud view excludes Recovery Private Key and tenant root key
REC-002 wrong Recovery Private Key fails
REC-003 one Recovery identity restores all epochs wrapped to it
REC-004 Recovery Public Key alone cannot decrypt
REC-005 wrap is context-bound to tenant + epoch + recovery-key id
REC-006 tampered recovery ciphertext fails
REC-007 Recovery Kit restores after all device private keys are gone
REC-008 old Recovery Key cannot decrypt future-only new-key wraps
REC-009 wrong historical authorizer record cannot validate the wrap
REC-010 no Recovery Kit means no hidden recovery path
REC-011 declared recoverable epochs require complete authenticated wrap coverage
REC-012 post-recovery hardening plan requires lost-device revocation + tenant/recovery rotation
REC-013 signed recovery authorizer identity must match supplied authorization record
REC-014 authorizer revoked for target epoch cannot authorize recovery wrap
REC-015 tampered wrap cannot satisfy RecoveryCoverage merely by existing
REC-016 distinct authentic wraps for one epoch are ambiguous and fail closed
REC-017 exact duplicate delivery of one authenticated wrap is idempotent
REC-018 future sync remains blocked until the full post-recovery hardening state is applied and verified
```

Adjacent load-bearing key-authority cases also pass:

```text
KEY-001 key-wrap authorizer identity binding
KEY-002 revoked key-wrap authorizer rejection
KEY-003 recipient authorization re-check at key consumption
KEY-004 cross-tenant envelope origin rejection
KEY-005 cross-tenant tenant-key recipient rejection
```

Evidence:

`mk0/10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`

Observed bounded suite on commit `404f7f1a0f6010d583e72010876785eef00b7254`:

```text
RECOVERY TESTS        18 / 18 PASS
KEY AUTHORITY          5 / 5 PASS
E2EE/KEY/RECOVERY/PNS 51 / 51 PASS
HEARTBEAT                  PASS
MK0 FOUNDATION         3 / 3 PASS
```

## Non-goals for MK0

- social/trusted-contact recovery;
- Shamir secret sharing;
- server-held escrow master key;
- password-only recovery;
- silent platform-cloud backup of Recovery Private Key material;
- pretending a revoked device can be forced to forget historical plaintext it already possessed.

## Production suite interaction

Recovery wraps must use a reviewed production construction/library. HPKE remains the leading direction, but the spike implementation is deliberately **not** the production cryptographic suite.

The cross-platform device-wrap candidate remains aligned around a suite that can be implemented safely on both Android and Apple platforms; final algorithm/library choice is still security-review work.

The production implementation must preserve the spike's **authorization semantics**, not only its cryptographic primitive choices: tenant binding, epoch binding, exact authorizer identity, recipient checks where applicable, authenticated coverage, ambiguity failure and the post-recovery future-sync gate are part of the decision.

See:

`research/Q005-PRODUCTION-CRYPTO-2026-SOURCES.md`

## Decision state

```text
SERVER_MASTER_KEY                REJECTED
PASSWORD_ONLY_RECOVERY           REJECTED FOR MK0
RECOVERY_PUBLIC_KEY              ACCEPTED AT LOGICAL/SPIKE LEVEL
RECOVERY_PRIVATE_KEY             USER-HELD / OFFLINE
PER_EPOCH_RECOVERY_WRAP          REQUIRED
AUTHENTICATED_RECOVERY_COVERAGE  REQUIRED
AMBIGUOUS_RECOVERY_COVERAGE      FAIL CLOSED
EXACT_WRAP_REPLAY                IDEMPOTENT
POST-RECOVERY DEVICE HARDEN      REQUIRED
POST-RECOVERY EPOCH ROTATION     REQUIRED
POST-RECOVERY KEY ROTATION       REQUIRED
POST-RECOVERY COVERAGE N+1       REQUIRED
FUTURE_SYNC_READINESS_GATE       REQUIRED
PHYSICAL MOBILE RECOVERY         OPEN
PRODUCTION CRYPTO SUITE          OPEN
```

## Why this ADR is not release-grade `PROVEN`

The spike proves the ownership, authorization and state-transition model only. Q-005 remains `ACTIVE` and still requires reviewed production crypto, physical Android/iOS key behavior, Android↔iOS interoperability, real control-plane authorization, recovery-kit handling and physical disaster-recovery evidence before release closure.
