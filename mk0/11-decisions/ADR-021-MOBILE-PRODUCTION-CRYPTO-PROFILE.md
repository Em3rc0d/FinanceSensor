# ADR-021 — Mobile Production Crypto Profile

**Status:** ACCEPTED FOR PHYSICAL VALIDATION / NOT YET PRODUCTION-PROVEN  
**Date:** 2026-09-02

## Context

Q-005 already proves protocol properties with a hand-composed Node feasibility spike. That spike deliberately uses X25519, Ed25519, HKDF and AES-GCM primitives to test authority, replay, revocation, recovery, checkpoint and witness semantics. It is not a production cryptographic implementation.

The remaining architecture problem is to stop carrying an ambiguous “pick crypto later” branch into mobile implementation while still refusing to promote untested mobile behavior to `PROVEN`.

## Decision drivers

- RFC 9180 interoperability;
- reviewed library implementations instead of bespoke HPKE;
- Android Keystore / StrongBox compatibility;
- Apple CryptoKit / Secure Enclave compatibility;
- hardware-backed P-256 support on both mobile platforms;
- explicit sender authorization independent of encryption mode;
- stable domain separation and wire contracts;
- no silent downgrade from protected hardware to exportable long-lived private keys.

## Decision

FinanceSensor freezes the following **first production interoperability profile** for the physical mobile campaign.

### Device key wrapping

```text
construction  RFC 9180 HPKE
mode          Base mode
KEM           DHKEM(P-256, HKDF-SHA256)
KDF           HKDF-SHA256
AEAD          AES-128-GCM
```

The HPKE `info` / context MUST be domain-separated and bind, at minimum:

```text
protocol version
purpose = TENANT_ROOT_KEY_WRAP
opaque tenant scope
key epoch
recipient device key id
authorizing device id
```

No financial plaintext, Gmail content or OAuth authority may appear in public HPKE context.

Base mode is intentional. FinanceSensor keeps **sender authorization/authenticity as a separate signed protocol property** instead of making correctness depend on HPKE authenticated-mode support differences across platform libraries.

### Device-origin signatures

The first physical interoperability profile uses:

```text
curve/hash    ECDSA P-256 + SHA-256
private key   protected platform facility when supported
transcript    canonical FinanceSensor protocol transcript
```

The physical campaign MUST freeze and test one cross-platform signature encoding and reject ambiguous/non-canonical encodings before this moves to production implementation. Signature bytes MUST NOT become event identity; immutable event/origin identity remains the Q-005 protocol identity.

### Symmetric encrypted envelopes

For domain-state envelopes the first production profile is:

```text
root secret        256-bit Tenant Root Key
subkey derivation  HKDF-SHA256 with explicit domain + epoch separation
AEAD               AES-256-GCM
nonce               96-bit unique random nonce per subkey
AAD                 canonical non-secret protocol header
```

The Tenant Root Key MUST NOT be used directly as an AEAD key for multiple protocol domains. Derived subkeys are required.

### Platform custody

```text
Android
  P-256 private device keys → Android Keystore
  StrongBox                 → preferred when available and compatible
  TEE-backed Keystore       → acceptable fallback when StrongBox unavailable
  exportable long-lived private key fallback → forbidden for production authority

iOS
  P-256 private device keys → Secure Enclave when supported for the required operation
  Keychain-protected representation/access control → required
  exportable long-lived private key fallback → forbidden for production authority
```

A device that cannot satisfy the minimum protected-key contract is **unsupported for production multi-device authority**; FinanceSensor must not silently downgrade security merely to remain compatible.

### Libraries

Production code MUST use reviewed platform/library implementations. The Node spike is test evidence for protocol semantics only.

Candidate implementation families currently supported by evidence:

- Google Tink HPKE on Android/JVM;
- Apple CryptoKit HPKE / P-256 on Apple platforms;
- platform-native protected key facilities for long-lived private keys.

Exact library versions are a release-time dependency and must be revalidated.

## Options considered

### Keep X25519 + Ed25519 from the Node spike

Rejected as the first mobile profile because the spike primitives are not the architecture decision and the current cross-platform protected-hardware story is stronger and more uniform around P-256.

### Use Tink’s general X25519/AES-256 recommendation blindly

Rejected for the first mobile profile. Tink’s general recommendation does not override FinanceSensor’s hardware-backed cross-platform constraint.

### Use HPKE authenticated mode and remove device signatures

Rejected for MK0. Encryption confidentiality and device authorization remain separate invariants. Existing signed-event/revocation semantics must not disappear as an implementation shortcut.

### Bespoke ECDH + HKDF + AEAD

Rejected for production. It remains acceptable only as a bounded spike technique.

## Consequences

- Q-005 no longer carries an unconstrained production primitive-selection branch.
- Android/iOS physical interoperability becomes a testable yes/no gate against one profile.
- Existing Node spike vectors are not wire compatibility promises.
- A future post-quantum or hybrid profile requires a new ADR/versioned protocol, not silent replacement.

## Security / privacy impact

```text
PROTECTED PRIVATE KEY > EXPORTABLE PRIVATE KEY
REVIEWED HPKE > HAND-COMPOSED PRODUCTION ECDH
EXPLICIT DOMAIN SEPARATION > CONTEXT REUSE
SEPARATE AUTHORIZATION SIGNATURE > IMPLICIT SENDER TRUST
CRYPTO PROFILE FROZEN != MOBILE CRYPTO PROVEN
```

Metadata in HPKE/AAD remains observable by the holder of the envelope and stays inside the Q-004/Q-005 metadata leakage budget.

## Test / evidence required before `PROVEN`

- RFC 9180 known-answer/interoperability vectors for the chosen suite;
- Android → iOS and iOS → Android wrap/unwrap;
- Android → iOS and iOS → Android signature verification;
- protected-key generation/use on representative Android devices;
- StrongBox preferred path plus secure TEE fallback evidence;
- Secure Enclave / Keychain protected-key evidence on representative iPhones;
- canonical signature encoding tests;
- wrong tenant/epoch/recipient/authorizer/context fail-closed tests;
- nonce uniqueness and crash/restart tests for envelope AEAD;
- library-version/SBOM capture and security review.

Until these exist:

```text
ADR-021 = ACCEPTED FOR PHYSICAL VALIDATION
Q-005   = ACTIVE
PRODUCTION_CRYPTO_PROVEN = NO
```

## Provenance

Primary sources are tracked in `research/Q005-PRODUCTION-CRYPTO-2026-SOURCES.md` and must be revalidated before implementation/release.

Current external anchors include RFC 9180, Google Tink HPKE guidance, Android Keystore/StrongBox documentation and Apple CryptoKit/Secure Enclave documentation.

## Supersedes / superseded by

This ADR narrows the production-crypto portion previously left open by ADR-008/Q-005. It does not supersede ADR-014, ADR-015 or ADR-016.