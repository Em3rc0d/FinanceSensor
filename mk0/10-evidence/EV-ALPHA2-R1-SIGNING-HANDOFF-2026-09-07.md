# EV — Alpha.2 R1 Trusted-Edge Signing Handoff — 2026-09-07

Status: **BUNDLE_GENERATION_OPEN_PHYSICAL_OPEN**

This evidence binds the exact canonical Alpha.2 `+2003` APK and the exact fail-closed R2 signer source. It does **not** claim that the v5 handoff bundle has been frozen yet, nor that physical signing has happened.

## Current +2003 authority

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
SIGNER_PS1_GIT_BLOB=efe59ef464007c8af9f67fd184926f74e403ca08
SIGNER_CMD_GIT_BLOB=3d01373b69051d30f88a57f26fa815e52d952d6d
WINDOWS_NATIVE_STDIN=PROCESS_START_INFO_REDIRECTED
DIRECT_PASSWORD_PIPE=FORBIDDEN
EXPECTED_SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
OWNED_DEVICE_INSTALL_PASS=YES
OWNED_DEVICE_LAUNCH_PASS=YES
```

The owned-device installation/launch observation is recorded separately as sanitized evidence. The visible Google authorization failure is not promoted because this input is still signed by the ephemeral CI debug signer.

## v5 generation state

```text
BUNDLE_NAME=FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v5.zip
BUNDLE_STATUS=GENERATION_PENDING
BUNDLE_FILES_EXPECTED=8
PRIVATE_KEY_FILES_ALLOWED=0
SECRET_LIKE_VALUE_MATCHES_ALLOWED=0
PUBLIC_CI_PHYSICAL_SIGNING=0
```

The R1 public workflow must build v5 from exactly:

- canonical artifact `10034303033`;
- exact repository PS1 blob `efe59ef464007c8af9f67fd184926f74e403ca08`;
- exact CMD blob `3d01373b69051d30f88a57f26fa815e52d952d6d`;
- public `apksigner.jar`;
- sanitized CI evidence and local instructions.

The generated ZIP must be independently audited before its SHA-256 and byte size become authority.

## Superseded / forbidden handoffs

```text
BUNDLE_V1_SHA256=b421274c669b97dd18a3c81ef278a245e646fb1a106f4023f006966a72a269a8
BUNDLE_V1_STATUS=REJECTED_SUPERSEDED

BUNDLE_V2_SHA256=c4b59ce33a9fc7755a14a9a320507492544b9981bdbf2fc5086b78675bc54ae5
BUNDLE_V2_STATUS=REJECTED_SUPERSEDED

BUNDLE_V3_SHA256=dbb310bf1efddda91793b996543568b8fff57c4379561fdfeec98eedbe70c90d
BUNDLE_V3_STATUS=REJECTED_SUPERSEDED_ALPHA2_2001

BUNDLE_V4_SHA256=a801bcff3255c0e4e9c76cea1e7de1abd0277db2757eb49699cd254b8d69321e
BUNDLE_V4_STATUS=REJECTED_ABANDONED_ALPHA2_2002_STAGING
```

Only the future audited v5 is allowed to reach the trusted edge for `+2003` signing.

## Trust boundary

The private `FINANCESENSOR_R2_LAB` keystore, private key and passwords remain only on the owned trusted-edge computer. They must never enter GitHub, CI, uploaded chat evidence, logs, or the public bundle.

## Physical closure condition

After v5 is frozen, R1 may close only if the local signer produces a sanitized receipt containing:

```text
FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING=PASS
FINANCESENSOR_ALPHA2_CANDIDATE=0.2.0-alpha.2+2003
SOURCE_COMMIT=c29a68e5326a187a7c82e6d66254ae05b6a4178a
CANONICAL_RUN_ID=34166127407
CANONICAL_ARTIFACT_ID=10034303033
INPUT_APK_SHA256=93d176b9f59b75a44ffcb9634d2a5620b2f0d63bbc75d80e2e1600a7d2cc5ad6
INPUT_APK_BYTES=182090843
SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
SIGNED_APK_SHA256=<physical output digest>
SIGNED_APK_BYTES=<physical output bytes>
```

Until that receipt exists:

```text
R1_TRUSTED_EDGE_SIGNING=OPEN
R2_OWNED_DEVICE_CAMPAIGN=BLOCKED_ON_R1
BUILD_READY=NO
RELEASE_READY=NO
```
