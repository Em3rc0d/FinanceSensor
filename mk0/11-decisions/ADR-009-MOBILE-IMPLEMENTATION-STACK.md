# ADR-009 — Mobile implementation stack

**Status:** ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL MOBILE VALIDATION REQUIRED  
**Date:** 2026-09-02

## Context

ADR-025 freezes FinanceSensor as a mobile-first product with Android as the first physical target and iOS as a required production target. The implementation stack remained open because the client must satisfy more than cross-platform UI delivery:

- mobile BI-grade visualization;
- local-first encrypted SQLite persistence;
- Gmail OAuth with device-local credential authority;
- Android Keystore / StrongBox integration;
- iOS Keychain / Secure Enclave integration;
- protected P-256 signing/key-agreement operations;
- background-safe local ingestion;
- deterministic financial logic and explainability;
- compact Android performance and viewport behavior.

A framework choice that makes security-sensitive platform behavior opaque or plugin-dependent without an escape hatch is unacceptable.

## Options considered

### Native Kotlin + Swift

Strongest direct platform control and the simplest conceptual security boundary.

Rejected as the MK0 default because it duplicates product UI, navigation, BI visualization and much application-state code across two clients before product-market behavior is validated.

Native code remains mandatory where the operating system owns the security primitive.

### Kotlin Multiplatform / Compose Multiplatform

Technically viable. Kotlin Multiplatform supports sharing business logic while retaining platform-specific source sets for Android/iOS APIs.

Not selected for MK0 because FinanceSensor currently benefits more from one fast product/UI surface plus deliberately small native security adapters than from making Kotlin the cross-platform application language. This can be revisited if the shared protocol core becomes the dominant implementation cost.

### React Native

Technically viable through native modules/components for Kotlin/Swift integration.

Not selected for MK0 because FinanceSensor does not currently gain enough from the JavaScript/React ecosystem to offset another runtime/package surface around a security-sensitive local-first product. This is not a statement that React Native cannot satisfy the requirements.

### Flutter

Selected for MK0.

Flutter provides:

- one mobile UI codebase for Android/iOS;
- direct platform-specific integration through Kotlin/Swift platform channels;
- mobile SQLite workflows;
- strong control over custom visual composition needed for mobile BI;
- deployment support broad enough for FinanceSensor to impose its stricter security baseline.

## Decision

FinanceSensor selects:

```text
PRODUCT UI / NAVIGATION / VIEW STATE
Flutter / Dart

LOCAL FINANCIAL APPLICATION LAYER
Dart modules with deterministic contracts

LOCAL SQL PERSISTENCE
SQLite + SQLCipher under ADR-006

PLATFORM SECURITY BRIDGE
Android → Kotlin
Apple   → Swift

ANDROID AUTHORITY BASELINE
minSdk 31 under ADR-013

PROTECTED PRIVATE KEY OPERATIONS
Android Keystore / StrongBox where compatible
Apple Secure Enclave / Keychain-protected CryptoKit

OAUTH LONG-LIVED CREDENTIAL CUSTODY
platform-native protected storage only

GMAIL DATA PLANE
local device only
```

### Hard boundary: Flutter is not the credential vault

The Flutter layer MUST NOT become durable custody for:

- Gmail refresh tokens;
- Google OAuth client credentials that are confidential on a given platform;
- long-lived device private keys;
- Database Encryption Keys (DEKs);
- Recovery Kit private material.

Those objects remain behind platform-owned/native facilities according to ADR-006, ADR-017, ADR-021 and ADR-024.

### Native security bridge

The mobile client MUST expose a small, typed security interface conceptually equivalent to:

```text
PlatformCredentialBroker
  authorizeGmail()
  getShortLivedAccessToken()
  refreshAuthorization()
  revokeAuthorization()
  authorizationState()

PlatformDeviceKeyStore
  generateSigningKey()
  signCanonicalTranscript()
  generateAgreementKey()
  deriveOrUnwrapAuthorizedMaterial()
  keyProtectionClass()
  deleteDeviceAuthority()

PlatformDatabaseKeyStore
  createAndWrapDatabaseKey()
  unwrapDatabaseKeyForOpen()
  deleteDatabaseKeyAuthority()
```

The bridge contract is shared; implementations are platform-specific.

The exact transport should prefer generated/type-safe bindings over ad-hoc stringly-typed messages where practical.

### No silent security fallback

```text
NATIVE SECURITY OPERATION UNSUPPORTED
        ↓
EXPLICIT CAPABILITY STATE
        ↓
FEATURE DISABLED / DEVICE UNSUPPORTED
```

Never:

```text
NATIVE SECURITY OPERATION UNSUPPORTED
        ↓
EXPORT PRIVATE KEY OR DATABASE KEY TO DART STORAGE
        ↓
CONTINUE SILENTLY
```

### Local financial engine

Deterministic financial semantics may live in Dart when they do not depend on protected platform facilities.

This includes candidates such as:

- canonical event mapping;
- merchant normalization;
- category resolution;
- recurring-pattern analysis;
- Financial Sensor calculations;
- explainability assembly;
- local view projections.

The existing Node spikes are specification/evidence inputs, not code to embed in the mobile app.

### Encrypted SQLite boundary

ADR-006 resolves the earlier persistence gap:

```text
SQLITE FAMILY                   ACCEPTED
PRODUCTION ENCRYPTION           SQLCipher 4.x family
DATABASE KEY                    random 256-bit DEK
DURABLE DEK IN DART             FORBIDDEN
PLAINTEXT SQLITE FALLBACK       FORBIDDEN
PLATFORM-PROTECTED DEK WRAP     REQUIRED
```

The exact SQLCipher patch/library package is pinned and supply-chain reviewed at implementation time. Failure to initialize encrypted storage is a fail-closed storage error, not permission to open ordinary SQLite.

## Android baseline

ADR-013 resolves the mobile authority baseline:

```text
FINANCESENSOR minSdk            31
MINIMUM OS                      Android 12
2026 targetSdk floor            36
API 37                          compatibility target, not minimum
```

The reason is architectural rather than cosmetic: Android Keystore's dedicated protected ECDH `PURPOSE_AGREE_KEY` begins at API 31, matching the P-256 agreement profile selected by ADR-021.

```text
FLUTTER MINIMUM != FINANCESENSOR AUTHORITY MINIMUM
```

API level alone still does not prove a device's hardware protection class. Runtime capability inspection and physical Keystore/StrongBox/TEE evidence remain mandatory.

### No broad-shell split in MK0

MK0 rejects shipping a broader installable Android shell whose key product/security features silently disappear below API 31. That compatibility mode can be reconsidered only through a new ADR after product validation.

## iOS boundary

Apple CryptoKit exposes Secure Enclave P-256 signing and key agreement. The physical campaign must prove the exact key representation/access-control behavior FinanceSensor needs on representative iPhones before Q-005 closes.

## Web and desktop

Flutter's multi-platform capability does not create product scope.

```text
FRAMEWORK_CAN_TARGET_WEB_DESKTOP != FINANCESENSOR_WILL_SHIP_WEB_DESKTOP
```

ADR-025 remains authoritative: web is a possible future companion; desktop is not a first-class product commitment.

## Consequences

Positive:

- fast single-codebase mobile product iteration;
- Android/iOS UI parity without duplicating the BI product surface;
- explicit escape hatch into native security facilities;
- security-critical authority remains platform-owned;
- encrypted local storage and Android compatibility are no longer architecture unknowns;
- product lab concepts can migrate into a real mobile shell without redefining architecture.

Costs:

- Kotlin and Swift bridge code must be maintained and tested;
- plugin convenience cannot override the trust boundary;
- SQLCipher introduces a native dependency and review obligation;
- minSdk 31 intentionally excludes older Android devices;
- mobile CI/build tooling becomes more complex;
- iOS physical builds require Apple tooling/macOS even though most shared development can occur elsewhere.

## Evidence required before implementation gate closure

Static/engineering:

- Flutter project skeleton with zero real credentials;
- typed native bridge contract;
- synthetic Android/iOS bridge tests;
- SQLCipher repository/key-boundary contract;
- minSdk 31 / targetSdk policy guard;
- mobile viewport regression harness;
- dependency/SBOM capture.

Physical:

- Android Gmail authorization and protected refresh-token custody;
- iOS Gmail authorization and protected refresh-token custody;
- Android protected P-256 signing/key-agreement path;
- iOS Secure Enclave/Keychain protected P-256 path;
- Android↔iOS crypto interoperability;
- SQLCipher database/sidecar inspection and protected DEK lifecycle;
- credential/key deletion on disconnect/revocation;
- compact API-31 Android performance and storage measurements.

## Governing laws

```text
FLUTTER_UI != SECURITY_BOUNDARY
PLUGIN_CONVENIENCE < PLATFORM_TRUST_BOUNDARY
EXPORTABLE_PRIVATE_KEY_FALLBACK = FORBIDDEN
PLAINTEXT_SQLITE_FALLBACK = FORBIDDEN
FLUTTER_SUPPORT_MATRIX != FINANCESENSOR_SECURITY_BASELINE
SHARED_UI != SHARED_SECRET_CUSTODY
STACK_ACCEPTED != MOBILE_PHYSICAL_PROVEN
```

## External anchors reviewed

Current official/vendor documentation reviewed on 2026-09-02:

- Flutter platform-specific Kotlin/Swift integration and supported deployment platforms;
- Android Keystore key-purpose documentation;
- Apple CryptoKit Secure Enclave P-256 signing/key-agreement documentation;
- Zetetic SQLCipher documentation/release surface;
- ADR-006 and ADR-013.

Release-time versions and security behavior must be revalidated.

## Supersedes / superseded by

This resolves the implementation-stack choice tracked as ADR-009. ADR-006 now resolves encrypted local persistence and ADR-013 resolves the Android minimum baseline. Physical mobile behavior remains open under Q-003/Q-004/Q-005.