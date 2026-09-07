# EV-Q003 — Android R2 stable lab signing identity

Date: 2026-09-02  
Surface: trusted local signing edge  
Package: `com.financesensor.lab.gmailconnection.r2`

## Purpose

Freeze one stable signing identity for iterative owned-device Android OAuth testing without creating a new package/client identity for each CI build.

This receipt contains only public certificate fingerprints and custody rules. The keystore, private key and password are intentionally absent from the public repository and public CI.

## Identity

```text
SIGNING_PROFILE             FINANCESENSOR_R2_LAB
PURPOSE                     PHYSICAL_ANDROID_DEV_LAB_ONLY
PACKAGE                     com.financesensor.lab.gmailconnection.r2
KEY_ALGORITHM               RSA 3072
CERTIFICATE_SIGNATURE       SHA256withRSA
CERTIFICATE_SHA1            63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
CERTIFICATE_SHA256          11:D7:B0:F4:3E:D5:4D:2F:94:32:7B:7A:BA:0A:EF:0D:C0:5A:A3:EF:76:69:4A:29:19:3D:73:E3:4D:D1:41:8C
PRODUCTION_SIGNER           NO
```

## Trusted-edge physical signing proof

A CI-produced R2 APK was downloaded after successful static/analyze/test/build guards and re-signed outside GitHub using this stable lab identity.

The resulting APK was verified with Android `apksigner`:

```text
APK_SIGNATURE_VERIFIES      PASS
APK_SIGNATURE_SCHEME        V3
NUMBER_OF_SIGNERS           1
SIGNER_SHA1_MATCH           PASS
SIGNER_SHA256_MATCH         PASS
```

Stable-signed APK SHA-256:

```text
6a13b913dd01f318845817c58b941b3bed9d6465bc985c589320e03f3ab2ed94
```

APK bytes:

```text
151746924
```

## Public CI evidence source

Branch head used for the unsigned/debug compile artifact:

```text
48ac94791c63eb9fa55951dfd6659736c85005ed
```

Android Gmail Connection run:

```text
33713271609  SUCCESS
```

Public Readiness on that head:

```text
33713271642  SUCCESS
```

Heartbeat on that head completed both `vital-signs` and `android-debug-apk` successfully.

## Custody boundary

```text
LAB_PRIVATE_KEY_IN_PUBLIC_REPO       0
LAB_PRIVATE_KEY_IN_GITHUB_CI         0
LAB_PASSWORD_IN_PUBLIC_REPO          0
LAB_PASSWORD_IN_GITHUB_CI            0
PUBLIC_CERT_FINGERPRINT              ALLOWED
PUBLIC_CI_DEBUG_SIGNER               COMPILE_ONLY
PHYSICAL_R2_SIGNER                   STABLE_LAB_IDENTITY
PRODUCTION_SIGNER                    SEPARATE / FUTURE
```

The private lab signing material must be retained privately by the project owner. Losing it would force a one-time Android OAuth signing-identity migration for future physical R2 APKs.

## OAuth migration

The previous R2 physical APK used an ephemeral GitHub-hosted debug certificate. Because its private key is unavailable by design, the existing Android OAuth registration must be migrated once from the old ephemeral SHA-1 to the stable lab SHA-1 above while keeping the package fixed.

After that migration:

```text
R2_PACKAGE_STAYS_FIXED       YES
R2_LAB_SHA1_STAYS_FIXED      YES
NEW_CLIENT_PER_BUILD         NO
NEW_PACKAGE_PER_BUILD        NO
```

## Governing laws

```text
PUBLIC_CI_SIGNER != PHYSICAL_LAB_SIGNER
LAB_SIGNER != PRODUCTION_SIGNER
PACKAGE_STABILITY + CERT_STABILITY = ITERATIVE_ANDROID_OAUTH_IDENTITY
PRIVATE_SIGNING_MATERIAL NEVER ENTERS PUBLIC_GITHUB
GREEN_CI != PHYSICAL_PROVIDER_PASS
```

Q-003 remains ACTIVE until the provider lifecycle and remaining mobile obligations are physically closed.