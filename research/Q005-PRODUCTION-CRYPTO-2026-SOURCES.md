# Q-005 Production Crypto Sources — 2026 Snapshot

**Reviewed:** 2026-09-01  
**Purpose:** provenance for production-suite and recovery decisions. Revalidate before implementation/release.

## HPKE standard

RFC 9180 — Hybrid Public Key Encryption

https://www.rfc-editor.org/info/rfc9180/

HPKE standardizes KEM + KDF + AEAD suites and authenticated variants. FinanceSensor must use a reviewed implementation instead of promoting the hand-composed Node spike to production.

## Google Tink

Supported key types:

https://developers.google.com/tink/supported-key-types

Observed 2026-09-01:

- Java supports HPKE.
- Tink supports `DHKEM_P256_HKDF_SHA256_HKDF_SHA256_AES_128_GCM`.
- Tink also supports X25519 HPKE suites.

Hybrid encryption guidance:

https://developers.google.com/tink/exchange-data

Observed:

- Tink recommends HPKE for public-key hybrid encryption.
- `context_info` can cryptographically bind public context.
- Hybrid encryption provides confidentiality but sender authenticity needs an additional mechanism when required.

Known issues:

https://developers.google.com/tink/known-issues

Rule for FinanceSensor: use current library/provider versions, avoid unrelated Envelope AEAD design shortcuts, and retain independent device-origin signatures for event authenticity.

## Android Keystore / StrongBox

Android KeyGenParameterSpec:

https://developer.android.com/reference/android/security/keystore/KeyGenParameterSpec

Observed:

- Android Keystore supports `PURPOSE_AGREE_KEY`.
- Official examples show P-256 (`secp256r1`) ECDH key agreement through Android Keystore.

Android Keystore / StrongBox:

https://developer.android.com/privacy-and-security/keystore

Observed:

- hardware-backed key storage is available when supported;
- StrongBox supports ECDH P-256;
- StrongBox availability varies and must degrade securely rather than becoming a device requirement.

## Apple CryptoKit / Secure Enclave

CryptoKit HPKE:

https://developer.apple.com/documentation/cryptokit/hpke

P-256 suite/components:

https://developer.apple.com/documentation/cryptokit/hpke/kem/p256_hkdf_sha256
https://developer.apple.com/documentation/cryptokit/hpke/aead

Observed:

- CryptoKit supports RFC 9180 HPKE;
- P-256 + HKDF-SHA256 is available;
- AES-GCM-128 and AES-GCM-256 are available;
- custom HPKE ciphersuites can be constructed from KEM/KDF/AEAD components.

Secure Enclave P-256 key agreement:

https://developer.apple.com/documentation/cryptokit/secureenclave/p256/keyagreement/privatekey

Observed:

- Secure Enclave supports P-256 key agreement;
- its private key conforms to `HPKEDiffieHellmanPrivateKey`, allowing HPKE use while keeping the key hardware-backed on supported devices.

## Cross-platform candidate suite

The strongest current interoperability candidate for **device key wrapping** is:

```text
KEM   DHKEM(P-256, HKDF-SHA256)
KDF   HKDF-SHA256
AEAD  AES-128-GCM
```

Why this candidate instead of blindly taking Tink's default X25519/AES-256 suite:

```text
Android hardware/StrongBox   P-256 ECDH
Apple Secure Enclave         P-256 ECDH + HPKE private-key conformance
Tink Java HPKE               P-256 + AES-128-GCM supported
CryptoKit HPKE               P-256 + AES-GCM-128 supported
```

This is a **candidate**, not a frozen production decision. Physical Android/iOS interoperability and hardware-backed execution must pass before closure.

## Authenticity

Base hybrid encryption alone must not replace the existing device-origin signature model. FinanceSensor currently needs both:

```text
HPKE wrap/encryption → confidentiality + integrity for recipient context
Device signature     → explicit origin authorization/authenticity
```

Whether RFC 9180 authenticated modes can simplify this later is a security-review question; do not silently remove signatures.

## Password-based recovery

RFC 9106 — Argon2:

https://www.rfc-editor.org/info/rfc9106/

Argon2id is the relevant memory-hard password KDF if FinanceSensor ever introduces passphrase-derived recovery. **MK0 should not rely on a human password as the only recovery secret** because an encrypted recovery envelope in cloud storage creates an offline guessing target.

## Revalidation triggers

Re-mine this snapshot if:

```text
mobile stack is chosen
Android minimum API changes
Apple minimum OS changes
Tink/CryptoKit support changes
HPKE suite changes
post-quantum migration is proposed
recovery becomes password-based
security review identifies a new constraint
release train reaches physical-device crypto implementation
```
