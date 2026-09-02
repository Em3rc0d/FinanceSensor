# ADR-009 — Mobile implementation stack

**Status:** ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL MOBILE VALIDATION REQUIRED  
**Date:** 2026-09-02

## Context

ADR-025 freezes FinanceSensor as a mobile-first product with Android as the first physical target and iOS as a required production target. The implementation stack remained open because the client must satisfy more than cross-platform UI delivery:

- mobile BI-grade visualization;
- local-first SQLite persistence;
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

Technically viable. Current Kotlin Multiplatform supports sharing business logic while keeping native UI, or sharing UI through Compose Multiplatform, and retains platform-specific source sets for Android/iOS APIs.

Not selected for MK0 because FinanceSensor currently benefits more from one fast product/UI surface plus deliberately small native security adapters than from making Kotlin the cross-platform application language. This can be revisited if the shared protocol core becomes the dominant implementation cost.

### React Native

Technically viable. React Native provides native modules/components for Kotlin/Swift integration.

Not selected for MK0 because FinanceSensor does not currently gain enough from the JavaScript/React ecosystem to offset another runtime/package surface around a security-sensitive local-first product. This is not a statement that React Native cannot satisfy the requirements.

### Flutter

Selected for MK0.

Current Flutter provides:

- one mobile UI codebase for Android/iOS;
- direct platform-specific integration through Kotlin/Swift platform channels;
- supported mobile SQLite workflows;
- strong control over custom visual composition needed for mobile BI;
- supported Android/iOS deployment baselines broad enough for the product shell while allowing FinanceSensor to impose stricter feature/security gates.

## Decision

FinanceSensor selects:

```text
PRODUCT UI / NAVIGATION / VIEW STATE
Flutter / Dart

LOCAL FINANCIAL APPLICATION LAYER
Dart modules with deterministic contracts

LOCAL SQL PERSISTENCE
SQLite behind a repository boundary

PLATFORM SECURITY BRIDGE
Android → Kotlin
Apple   → Swift

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
- Recovery Kit private material.

Those objects remain behind platform-owned/native facilities according to ADR-017, ADR-021 and ADR-024.

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
EXPORT PRIVATE KEY TO DART
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

### SQLite boundary

SQLite is selected as the initial local persistence family, but ADR-006 still owns the exact encrypted-persistence technology and keying mechanism.

```text
SQLITE FAMILY ACCEPTED
EXACT ENCRYPTED DRIVER / KEY MANAGEMENT OPEN UNDER ADR-006
```

No plaintext production ledger is permitted merely because ordinary SQLite is convenient during development.

## Android baseline nuance

Flutter framework support does not define FinanceSensor's security baseline.

Current Android documentation exposes Keystore EC primitives broadly, but the dedicated key-agreement purpose used for protected ECDH is available from API 31. Therefore:

```text
FLUTTER MINIMUM != FINANCESENSOR AUTHORITY MINIMUM
```

ADR-013 remains open until the physical device matrix determines whether FinanceSensor:

1. sets the whole production app minimum at a sufficiently modern Android level; or
2. supports a broader read/local-only shell while gating multi-device authority to devices that satisfy the protected-key contract.

No compatibility decision is made here.

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
- product lab concepts can migrate into a real mobile shell without redefining the architecture.

Costs:

- Kotlin and Swift bridge code must be maintained and tested;
- plugin convenience cannot override the trust boundary;
- mobile CI/build tooling becomes more complex;
- iOS physical builds require Apple tooling/macOS even though most shared development can occur elsewhere.

## Evidence required before implementation gate closure

Static/engineering:

- Flutter project skeleton with zero real credentials;
- typed native bridge contract;
- synthetic Android/iOS bridge tests;
- SQLite repository contract;
- mobile viewport regression harness;
- dependency/SBOM capture.

Physical:

- Android Gmail authorization and protected refresh-token custody;
- iOS Gmail authorization and protected refresh-token custody;
- Android protected P-256 signing/key-agreement path;
- iOS Secure Enclave/Keychain protected P-256 path;
- Android↔iOS crypto interoperability;
- credential/key deletion on disconnect/revocation;
- compact Android performance and storage measurements.

## Governing laws

```text
FLUTTER_UI != SECURITY_BOUNDARY
PLUGIN_CONVENIENCE < PLATFORM_TRUST_BOUNDARY
EXPORTABLE_PRIVATE_KEY_FALLBACK = FORBIDDEN
FLUTTER_SUPPORT_MATRIX != FINANCESENSOR_SECURITY_BASELINE
SHARED_UI != SHARED_SECRET_CUSTODY
STACK_ACCEPTED != MOBILE_PHYSICAL_PROVEN
```

## External anchors reviewed

Current official documentation reviewed on 2026-09-02:

- Flutter platform channels / platform-specific Kotlin and Swift integration;
- Flutter SQLite persistence guidance;
- Flutter supported deployment platforms;
- Kotlin Multiplatform shared/native architecture documentation;
- React Native native-platform module documentation;
- Android Keystore key-purpose documentation;
- Apple CryptoKit Secure Enclave P-256 signing/key-agreement documentation.

Release-time versions and security behavior must be revalidated.

## Supersedes / superseded by

This resolves the implementation-stack choice tracked as ADR-009 in the ADR index. It does not resolve ADR-006 (encrypted local persistence) or ADR-013 (minimum supported Android baseline).