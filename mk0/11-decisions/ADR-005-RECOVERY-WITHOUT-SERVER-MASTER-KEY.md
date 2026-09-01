# ADR-005 — All-Devices-Lost Recovery Without a Server Master Key

**Status:** SPIKE-ACCEPTED / PHYSICAL VALIDATION REQUIRED  
**Owner:** Q-005  
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

## Recovery coverage rule

A tenant epoch is not considered recoverable merely because a Recovery Public Key exists.

```text
recoverable epoch N
        ↓
matching tenant_id
matching recovery_key_id
matching key_epoch
        ↓
authenticated recovery wrap exists
        ↓
RECOVERY-COVERED
```

A missing wrap is an explicit integrity/configuration failure, not a silent downgrade.

## All-devices-lost sequence

```text
user authenticates account
        ↓
new device requests opaque recovery wraps
        ↓
user imports Recovery Kit locally
        ↓
new device unwraps required tenant epochs locally
        ↓
financial history becomes decryptable locally
        ↓
new hardware-backed device identity generated
        ↓
lost device authorizations revoked
        ↓
new tenant epoch N+1 generated
        ↓
new Recovery Keypair generated
        ↓
new Recovery Kit confirmed
        ↓
old Recovery Key retired for future epochs
        ↓
normal future sync resumes
```

Recovery is not permission to silently reactivate lost devices or continue indefinitely on historical key material.

## Server capability

Server stores only the minimum required recovery-plane material, conceptually:

```text
recovery_key_id
recovery_public_key
key_epoch
opaque recovery-wrap ciphertext
minimum suite/version/routing metadata
```

Server cannot decrypt a tenant epoch from those values alone.

## Failure semantics

### All devices lost + Recovery Kit available

```text
CRYPTOGRAPHIC RECOVERY POSSIBLE
```

subject to account authentication, compatible client version, valid recovery-wrap coverage and intact historical authorization records needed to authenticate wraps.

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

Possible representations include a file/QR and a human-transcribable high-entropy encoding with checksum. This ADR freezes the cryptographic ownership model, not the final UX representation.

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
REC-011 declared recoverable epochs require complete wrap coverage
REC-012 post-recovery hardening revokes lost devices and requires tenant/recovery rotation
```

Evidence:

`mk0/10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`

Observed bounded suite:

```text
RECOVERY TESTS   12 / 12 PASS
E2EE TOTAL       40 / 40 PASS
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

See:

`research/Q005-PRODUCTION-CRYPTO-2026-SOURCES.md`

## Decision state

```text
SERVER_MASTER_KEY             REJECTED
PASSWORD_ONLY_RECOVERY        REJECTED FOR MK0
RECOVERY_PUBLIC_KEY           ACCEPTED AT LOGICAL/SPIKE LEVEL
RECOVERY_PRIVATE_KEY          USER-HELD / OFFLINE
PER_EPOCH_RECOVERY_WRAP       REQUIRED
RECOVERY_COVERAGE_CHECK       REQUIRED
POST-RECOVERY DEVICE HARDEN   REQUIRED
POST-RECOVERY EPOCH ROTATION  REQUIRED
POST-RECOVERY KEY ROTATION    REQUIRED
PHYSICAL MOBILE RECOVERY      OPEN
PRODUCTION CRYPTO SUITE       OPEN
```

## Why this ADR is not release-grade `PROVEN`

The spike proves the ownership and state-transition model only. Q-005 still requires reviewed production crypto, physical Android/iOS key behavior, real cloud authorization, recovery-kit handling and physical disaster-recovery evidence before release closure.
