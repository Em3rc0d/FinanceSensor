# ADR-005 — All-Devices-Lost Recovery Without a Server Master Key

**Status:** CANDIDATE / SPIKE REQUIRED  
**Owner:** Q-005  
**Date:** 2026-09-01

## Context

FinanceSensor needs an explicit answer to:

> What happens when every authorized device is lost, destroyed or unavailable?

A convenient answer would be for FinanceSensor cloud to retain a master decryption key. That answer is rejected because it would give the control plane a standing capability to decrypt tenant financial truth and would materially weaken the privacy thesis.

A human password alone is also rejected for MK0 because an encrypted cloud recovery envelope creates an offline guessing target if the server dataset is stolen.

## Decision candidate

Use an **asymmetric Recovery Key** independent from device keys.

```text
Tenant setup
    ↓
generate Recovery Keypair locally
    ↓
Recovery Public Key  ───────────────► tenant metadata
Recovery Private Key ───────────────► user Recovery Kit only
    ↓
device confirms Recovery Kit saved
    ↓
private recovery material removed from ordinary app state
```

For every tenant key epoch:

```text
Tenant Epoch Key N
   ├─ HPKE wrap → Device A public key
   ├─ HPKE wrap → Device B public key
   └─ HPKE wrap → Recovery public key
```

The cloud can store all ciphertext wraps. It never possesses the Recovery Private Key.

## Normal operation

Devices need only the recovery **public** key to create a recovery wrap for every new epoch. Therefore normal devices do not need to retain the Recovery Private Key, and a revoked device cannot use the public key to decrypt future epochs.

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
new hardware-backed device keypair generated
        ↓
old device authorizations revoked
        ↓
new tenant epoch generated
        ↓
new recovery keypair generated
        ↓
new Recovery Kit confirmed
        ↓
old Recovery Key retired for future epochs
```

Rotating the recovery key after successful recovery limits future exposure of the key material that had to be imported during recovery.

## Server capability

Server stores only:

```text
recovery_key_id
recovery_public_key
key_epoch
opaque recovery wrap ciphertext
minimum suite/version metadata
```

Server cannot decrypt a tenant epoch from those values alone.

## Failure semantics

### All devices lost + Recovery Kit available

```text
RECOVERY POSSIBLE
```

subject to account authentication, compatible client version and valid recovery wraps.

### All devices lost + Recovery Kit also lost

```text
CRYPTOGRAPHIC RECOVERY IMPOSSIBLE
```

FinanceSensor must say this plainly. The application may rebuild whatever is still obtainable from source providers after reconnecting them, but local-only corrections, historical source data no longer available upstream, annotations or other unsynchronized/unrecoverable state may be lost.

No hidden server bypass is permitted.

## Why asymmetric recovery instead of a symmetric recovery secret stored on devices

If ordinary devices held a reusable symmetric recovery key so they could update recovery envelopes, a revoked device possessing that key could potentially decrypt future recovery material. A public recovery key solves the update problem without giving devices the recovery decryption capability.

## Why not password-only recovery in MK0

A user-chosen password has uncertain entropy. If cloud recovery ciphertext is stolen, an attacker may perform offline guesses. A future password-protected Recovery Kit may use a reviewed memory-hard KDF such as Argon2id, but the underlying recovery authority must remain high-entropy cryptographic material.

## Recovery Kit UX is not frozen here

Possible representations include a QR/file and a human-transcribable high-entropy encoding with checksum. This ADR freezes the cryptographic ownership model, not the final UX representation.

Do not copy cryptocurrency wallet vocabulary/mechanics unnecessarily into the consumer UI.

## Security properties required

```text
REC-001 cloud alone cannot recover tenant epoch keys
REC-002 wrong recovery private key fails
REC-003 recovery can cover every retained historical epoch
REC-004 revoked device cannot use recovery public material to decrypt
REC-005 recovery wrap is bound to tenant + epoch + recovery-key id
REC-006 tampered recovery wrap fails
REC-007 successful recovery rotates device authorization + tenant epoch
REC-008 successful recovery can rotate recovery key for future epochs
REC-009 old recovery key cannot decrypt epochs wrapped only to the new recovery key
REC-010 losing devices + Recovery Kit means explicit unrecoverable state, not silent server bypass
```

## Non-goals for MK0

- social/trusted-contact recovery;
- Shamir secret sharing;
- server-held escrow master key;
- password-only recovery;
- silent platform-cloud backup of recovery private material;
- pretending a revoked device can be forced to forget historical plaintext it already possessed.

## Production suite interaction

Recovery wraps should use a reviewed HPKE implementation. The device-wrap interoperability candidate is P-256/HKDF-SHA256/AES-GCM-128 because current Android hardware-backed P-256 and Apple Secure Enclave/CryptoKit capabilities can align around that suite. Recovery key material itself is not required to be device-bound because it is specifically the off-device recovery authority.

See:

`research/Q005-PRODUCTION-CRYPTO-2026-SOURCES.md`

## Decision state

```text
SERVER_MASTER_KEY            REJECTED
PASSWORD_ONLY_RECOVERY       REJECTED FOR MK0
RECOVERY_PUBLIC_KEY          CANDIDATE
RECOVERY_PRIVATE_KEY         USER-HELD / OFFLINE
PER_EPOCH_RECOVERY_WRAP      REQUIRED CANDIDATE
POST-RECOVERY EPOCH ROTATION REQUIRED
POST-RECOVERY KEY ROTATION   REQUIRED CANDIDATE
```

This ADR remains candidate until the recovery spike and security revalidation pass.
