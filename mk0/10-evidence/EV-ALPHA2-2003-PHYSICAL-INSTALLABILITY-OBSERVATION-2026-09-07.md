# EV — Alpha.2 +2003 physical installability observation — 2026-09-07

Status: **PASS_INSTALL_AND_LAUNCH_ONLY**

A user-provided owned-device screenshot confirms that candidate `0.2.0-alpha.2+2003` installed successfully and reached the FinanceSensor / PocketFinances Gmail connection screen on the device.

## Exact candidate binding

```text
CANDIDATE=0.2.0-alpha.2+2003
SOURCE_COMMIT=c29a68e5326a187a7c82e6d66254ae05b6a4178a
CANONICAL_RUN_ID=34166127407
CANONICAL_JOB_ID=101877387416
CANONICAL_ARTIFACT_ID=10034303033
CANONICAL_ARTIFACT_ZIP_SHA256=17489354c2b3da1a3389c2fa991ac9d444f8eb58d031c030d05e0d20fbed481f
INPUT_APK_SHA256=93d176b9f59b75a44ffcb9634d2a5620b2f0d63bbc75d80e2e1600a7d2cc5ad6
INPUT_APK_BYTES=182090843
ANDROID_MIN_SDK=31
ANDROID_TARGET_SDK=36
ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
```

## Physical observation

```text
OWNED_DEVICE_INSTALL_PASS=YES
OWNED_DEVICE_LAUNCH_PASS=YES
GOOGLE_AUTHORIZATION_PASS=NO
REAL_GMAIL_PASS=NO
PHYSICAL_SQLCIPHER_PASS=NO
PHYSICAL_ALPHA2_PASS=NO
```

The visible Google authorization failure is **not promoted into an OAuth product failure claim** because this APK is still the public-CI artifact signed with an ephemeral debug signer. The stable R2 signing identity has not yet been applied to `+2003`.

The screenshot itself is not committed to GitHub. Only this sanitized observation is retained.

## Security baseline

`+2003` intentionally keeps `minSdk=31` per ADR-013 / ADR-039. The prior `+2002` candidate proved the packaging/installability path but is diagnostic-only because its temporary API 24 baseline conflicted with the protected ECDH Android Keystore profile.

## Downstream effect

This observation satisfies the prerequisite stated by PR #98 for refreezing the exact `+2003` artifact into R1 trusted-edge signing. It does **not** close R1, OD0, R2, Q-003, Q-004, Q-005, G-MK0, BUILD_READY, or RELEASE_READY.

```text
R1_TRUSTED_EDGE_SIGNING=OPEN
R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_ON_R1
BUILD_READY=NO
RELEASE_READY=NO
```
