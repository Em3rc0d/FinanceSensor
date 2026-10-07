# ADR-039 — Alpha.2 installability incident and Android baseline retention

**Status:** ACCEPTED FOR ALPHA.2 REPAIR / PHYSICAL REVALIDATION REQUIRED  
**Date:** 2026-09-07

## Context

The frozen Alpha.2 `+2001` APK produced an Android package-parser failure during an owned-device install attempt. The first diagnostic repair lowered the generated Android `minSdk` from API 31 to API 24, added explicit `apksigner` and `aapt2` gates, and emitted diagnostic candidate `+2002`.

`+2002` installed and launched on the owned device. That observation closed the immediate question of whether the repaired packaging/build surface could produce an Android-installable APK, but it did **not** establish that API 31 caused the original parser failure.

During post-merge governance review, Heartbeat correctly exposed a contradiction: the integrated runtime now advertised API 24 while ADR-013, ADR-009 and the MK0 implementation baseline require API 31.

ADR-013 deliberately selected API 31 because Android Keystore `KeyProperties.PURPOSE_AGREE_KEY`, used by the protected ECDH authority profile in ADR-021, begins at API 31. Lowering the installation floor below 31 without a separately reviewed feature-gated authority model would create two product/security modes and would violate the no-exportable-fallback invariant.

## Decision drivers

1. Preserve the cryptographic authority model already accepted for MK0.
2. Treat real-device feedback as evidence without allowing a diagnostic workaround to silently rewrite architecture.
3. Add package parser/signature verification to CI permanently.
4. Distinguish **installability diagnostics** from **canonical candidate authority**.
5. Keep OAuth registration tied only to the stable R2 signing identity, never an ephemeral CI debug signer.

## Decision

```text
ALPHA2 +2002                         DIAGNOSTIC ONLY
+2002 minSdk                         24 / NOT CANONICAL
ANDROID PRODUCT minSdk               31 / RETAINED
ANDROID MINIMUM OS                   Android 12 / RETAINED
TARGET SDK                           36 / RETAINED
COMPILE SDK                          37 / RETAINED
APK PARSE GATE                       aapt2 / REQUIRED
APK SIGNATURE GATE                   apksigner / REQUIRED
PUBLIC CI DEBUG SIGNER               NON-AUTHORITY
STABLE OAUTH SIGNER                  FINANCESENSOR_R2_LAB ONLY
NEXT INSTALLABILITY CANDIDATE        0.2.0-alpha.2+2003
```

The integrated Android runtime is returned to `minSdk=31`. Candidate `+2003` retains the new package-verification gates and must be physically re-tested before any trusted-edge signing chain is re-frozen.

## Why +2002 is not promoted

`+2002` demonstrated:

```text
APK_INSTALL        PASS OBSERVED
APP_LAUNCH         PASS OBSERVED
INITIAL_UI_RENDER  PASS OBSERVED
```

It did not demonstrate:

```text
API_31_CAUSED_OLD_PARSE_FAILURE      NO
R1_STABLE_SIGNING                    NO
GMAIL_OAUTH_WITH_STABLE_SIGNER       NO
PROTECTED_ECDH_ON_DEVICE             NO
R2_OD0                               NO
PHYSICAL_ALPHA2_PASS                 NO
```

Therefore its result is retained as incident evidence, not product authority.

## OAuth consequence

The diagnostic APK is signed by an ephemeral GitHub Actions debug certificate. The registered Android OAuth identity remains package `com.financesensor.lab.gmailconnection.r2` plus the stable R2 signing certificate.

Registering the CI debug certificate in Google merely to make a diagnostic build authorize is rejected because it would:

- couple provider authority to a non-stable signing identity;
- increase the accepted OAuth identity surface;
- make repeatability depend on GitHub's generated debug keystore;
- bypass the trusted-edge signing boundary already frozen under R1.

A safe authorization failure from a debug-signed APK is therefore expected non-authority behavior, not evidence that Gmail scope or provider configuration should be widened.

## CI consequence

Every Alpha.2 integrated Android APK candidate must now pass all of:

```text
FLUTTER_ANALYZE                 PASS
DART_TESTS                      PASS
ANDROID_BUILD                   PASS
APK_SIGNATURE_VERIFY            PASS
APK_AAPT2_PARSE                 PASS
PACKAGE                         com.financesensor.lab.gmailconnection.r2
MIN_SDK                         31
TARGET_SDK                      36
VERSION_CODE                    exact candidate build number
```

The integrated workflow must also execute the existing mobile-stack contract so a future Gradle compatibility tweak cannot silently contradict ADR-013 again.

## Physical sequence

Before rebuilding R1 signing authority:

1. build `+2003` from an exact repository SHA;
2. pass package/signature/static gates in public CI;
3. install and launch the public-CI APK on the owned device as a **diagnostic pre-R1 observation only**;
4. if `+2003` installs, freeze that exact artifact as the next canonical signing input;
5. trusted-edge re-sign the exact canonical input using `FINANCESENSOR_R2_LAB`;
6. only the stable-signed hash may begin R2 OD0→OD11.

If `+2003` again produces a package parser failure, R1 must remain open and the failure must be diagnosed without lowering the API 31 authority floor.

## Security/privacy impact

No weakening of the authority baseline is accepted.

```text
PURPOSE_AGREE_KEY API FLOOR       31
EXPORTABLE KEY FALLBACK           FORBIDDEN
SOFTWARE AUTHORITY FALLBACK       FORBIDDEN AS SILENT PRODUCT PATH
GMAIL SCOPE                        gmail.readonly ONLY
DEBUG SIGNER AS OAUTH AUTHORITY    FORBIDDEN
PRIVATE R2 KEY IN GITHUB           FORBIDDEN
```

## Evidence required

- `EV-ALPHA2-2002-PHYSICAL-INSTALLABILITY-OBSERVATION-2026-09-07.md`
- exact-SHA CI receipt for `+2003` with `apksigner` + `aapt2` PASS;
- owned-device install/launch observation for `+2003`;
- subsequent stable-signing receipt only after canonical re-freeze.

## Reopen triggers

Reopen this decision if any of the following changes:

- Android protected key-agreement API availability;
- ADR-021 cryptographic authority profile;
- product decision to support feature-gated non-authority devices below API 31;
- Android package or stable signing identity;
- target/compile SDK policy;
- physical evidence demonstrating API 31 incompatibility requiring a new architecture path.

## Supersedes / superseded by

This ADR does **not** supersede ADR-013. It explicitly retains ADR-013 and classifies the temporary API-24 `+2002` build as diagnostic-only.
