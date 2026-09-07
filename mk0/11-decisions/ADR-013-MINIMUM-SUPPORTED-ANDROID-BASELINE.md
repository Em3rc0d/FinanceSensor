# ADR-013 — Minimum supported Android baseline

**Status:** ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL DEVICE MATRIX REQUIRED  
**Date:** 2026-09-02

## Context

FinanceSensor is Android-first, but the framework's minimum supported Android version is not the product's security baseline.

ADR-021 requires protected P-256 key agreement/signing behavior. Android Keystore exposes the dedicated `PURPOSE_AGREE_KEY` for ECDH beginning at API level 31. Supporting older Android versions as full-authority FinanceSensor devices would therefore require a separate compatibility/fallback authority model.

FinanceSensor explicitly forbids silent exportable-key fallback.

## Current platform facts

Reviewed on 2026-09-02:

- Flutter 3.44.7 supports Android API levels 24–37 and CI-tests 24–36.
- Android Keystore `KeyProperties.PURPOSE_AGREE_KEY` was added in API level 31.
- Android 17 is API level 37.
- From 2026-08-31, new Google Play apps and updates must target Android 16 / API level 36 or higher.

Framework capability therefore exceeds the security-compatible minimum we require.

## Options considered

### minSdk 24 with feature-gated authority

Would maximize device reach, but creates two product modes:

- broad UI/local shell;
- narrower authority-capable devices.

Rejected for MK0 because FinanceSensor's primary mobile experience depends on encrypted tenant authority, Gmail credential custody and multi-device cryptography. A device that can install the app but cannot participate safely creates confusing product/security semantics before product-market behavior is validated.

### minSdk 28

StrongBox appears on modern hardware generations, but protected ECDH's dedicated key-agreement purpose is still not available until API 31. Rejected for the same reason.

### minSdk 31

Selected.

It aligns the minimum OS level with the first Android Keystore API level that directly expresses the protected ECDH purpose required by ADR-021.

## Decision

```text
ANDROID MIN SDK                  31
MINIMUM OS                       Android 12
2026 RELEASE TARGET SDK FLOOR    36
COMPILE SDK                      current supported SDK >= target SDK
ANDROID 17 / API 37              compatibility-test target, not minimum OS
STRONGBOX                        preferred when available/compatible
TEE-BACKED KEYSTORE              accepted fallback security class
SOFTWARE/EXPORTABLE AUTHORITY    forbidden as silent production fallback
```

The implementation may compile against API 37 once the Flutter/Android toolchain used by the repository is validated, but publication MUST at minimum satisfy the current Google Play target requirement (`targetSdk >= 36`).

## Capability rule

On API 31+ a device still must prove the required key capabilities at runtime.

```text
OS VERSION >= 31
      +
KEYSTORE REQUIRED OPERATION AVAILABLE
      +
ACCEPTABLE KEY PROTECTION CLASS
      ↓
AUTHORITY_CAPABLE
```

OS version alone does not prove StrongBox or a specific hardware implementation.

If the protected operation cannot be established:

```text
DEVICE_CAPABILITY_UNSUPPORTED
```

not:

```text
EXPORTABLE_PRIVATE_KEY_FALLBACK
```

## Initial physical Android matrix

Before Q-003/Q-005 physical closure, test at least:

1. **API 31 / Android 12** — minimum supported baseline, representative compact/low-end hardware where obtainable;
2. **API 34 or 35** — mature mid-generation physical device;
3. **API 36** — current Google Play target generation;
4. **API 37** — Android 17 compatibility coverage when stable physical/emulator tooling is available.

At least one physical test device must represent the lower performance envelope intended for the product.

Emulators may validate UI/API compatibility but cannot replace physical protected-key evidence.

## Measurements required

For representative physical devices record sanitized aggregates for:

- cold start;
- encrypted database open;
- dashboard first meaningful render;
- local query latency;
- protected signing latency;
- protected key-agreement/unwrap latency;
- Gmail incremental processing sample;
- memory envelope;
- encrypted local-store size;
- background-work behavior.

No real Gmail/financial payload is committed with these measurements.

## Product consequence

FinanceSensor deliberately accepts a smaller Android compatibility surface in exchange for a simpler and stronger authority model.

This is not a claim that Android 11 and older are insecure in general. It is a FinanceSensor architecture decision driven by the specific protected-key contract selected for MK0.

## Release review

Before public release, re-evaluate:

- active-device coverage/business impact;
- Google Play target API requirement;
- Flutter supported-platform matrix;
- Android Keystore behavior and deprecations;
- physical low-end performance.

Changing `minSdk` below 31 requires a new ADR and a separately reviewed cryptographic authority profile. It cannot be treated as a Gradle-only compatibility tweak.

## Governing laws

```text
FLUTTER_MINIMUM != FINANCESENSOR_SECURITY_MINIMUM
MIN_SDK = 31
TARGET_SDK >= CURRENT_PLAY_REQUIREMENT
API_LEVEL != HARDWARE_PROTECTION_PROOF
STRONGBOX_PREFERRED != STRONGBOX_ASSUMED
UNSUPPORTED_PROTECTED_AUTHORITY => DEVICE_UNSUPPORTED
UNSUPPORTED_PROTECTED_AUTHORITY != EXPORTABLE_FALLBACK
EMULATOR_PASS != PHYSICAL_KEY_PROOF
```

## External anchors reviewed

Reviewed 2026-09-02:

- Android Developers `KeyProperties`: `PURPOSE_AGREE_KEY` added in API 31.
- Flutter supported deployment platforms: Flutter 3.44.7 supports Android API 24–37.
- Android 17 documentation: Android 17 is API level 37.
- Google Play target API requirements: new apps/updates from 2026-08-31 target API 36 or higher.

## Supersedes / superseded by

Resolves ADR-013 tracked in `ADR-INDEX.md`. Physical Android capability remains open evidence under Q-003/Q-005 and ADR-021.
