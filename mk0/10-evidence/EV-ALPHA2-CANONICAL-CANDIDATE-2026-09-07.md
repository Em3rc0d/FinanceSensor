# EV-ALPHA2-CANONICAL-CANDIDATE-2026-09-07

## Status

`CANONICAL_CANDIDATE_RECEIPT=PASS`

This evidence freezes the single Alpha.2 APK allowed to advance from public CI into trusted-edge signing.

## Current candidate identity

- Candidate: `0.2.0-alpha.2+2003`
- Certified PR head: `25f0f79c3b21b78e8ca52c8a02cdf696d6d17b8c`
- Merge/source SHA: `c29a68e5326a187a7c82e6d66254ae05b6a4178a`
- Canonical workflow: `Alpha.2 Integrated Runtime`
- Run ID: `34166127407`
- Job ID: `101877387416`
- Artifact ID: `10034303033`
- Artifact ZIP SHA256: `17489354c2b3da1a3389c2fa991ac9d444f8eb58d031c030d05e0d20fbed481f`
- APK path: `build/app/outputs/flutter-apk/app-debug.apk`
- APK bytes: `182090843`
- APK SHA256: `93d176b9f59b75a44ffcb9634d2a5620b2f0d63bbc75d80e2e1600a7d2cc5ad6`
- Android minSdk: `31`
- Android targetSdk: `36`
- Android compileSdk: `37`
- `apksigner`: PASS
- `aapt2`: PASS

The APK hash above was independently recomputed from the downloaded post-merge artifact.

## Physical installability observation

The owned-device observation for this exact APK is recorded in `EV-ALPHA2-2003-PHYSICAL-INSTALLABILITY-OBSERVATION-2026-09-07.md`.

```text
OWNED_DEVICE_INSTALL_PASS       YES
OWNED_DEVICE_LAUNCH_PASS        YES
STABLE_SIGNER_OAUTH_PASS        NO
REAL_GMAIL_PASS                 NO
```

The visible Google authorization failure is not promoted to a product OAuth failure because the canonical CI artifact remains signed by the ephemeral public-CI debug signer. Stable R2 trusted-edge signing is still required before real OAuth is evaluated.

## Superseded candidates

`0.2.0-alpha.2+2002` is diagnostic-only. It proved the packaging/installability path, but its temporary `minSdk=24` conflicted with ADR-013's protected ECDH Android Keystore baseline. PR #98 retained API 31 and issued `+2003`.

`0.2.0-alpha.2+2001` is also superseded for R1 signing.

## Trusted-edge boundary

Expected stable signer SHA1:

`63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`

Package: `com.financesensor.lab.gmailconnection.r2`

Scope: `gmail.readonly`

Public GitHub CI contains no private signer and executes no real OAuth, Gmail, or financial data.

## Closure state

```text
CANONICAL_ALPHA2_CANDIDATE      PASS
OWNED_DEVICE_INSTALL            PASS
OWNED_DEVICE_LAUNCH             PASS
TRUSTED_EDGE_SIGNING            OPEN
REAL_OAUTH                      OPEN
REAL_GMAIL                      OPEN
PHYSICAL_SQLCIPHER              OPEN
PHYSICAL_EECC_BCP_SAVINGS       OPEN
PHYSICAL_ALPHA2_A_G             OPEN
BUILD_READY                     NO
RELEASE_READY                   NO
```

No downstream physical PASS may be inherited from `+2001`, `+2002`, the legacy Human Test APK, or any other non-canonical artifact.
