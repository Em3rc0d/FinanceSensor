# EV — Alpha.2 R1 Trusted-Edge Signing Handoff — 2026-09-07

Status: **HANDOFF_READY_PHYSICAL_OPEN**

This evidence binds the exact canonical Alpha.2 `+2003` APK, the exact fail-closed R2 signer source, and the independently audited deterministic v5 handoff bundle. It does **not** claim that physical signing has happened.

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

## v5 audited authority

The first v5 generation ran on PR #100 and produced the deterministic inner bundle below. The GitHub Actions wrapper was downloaded and its SHA-256 matched GitHub's artifact digest exactly. The inner bundle was then extracted and independently audited.

```text
BUNDLE_NAME=FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v5.zip
BUNDLE_STATUS=READY
BUNDLE_SHA256=7f3dbb0570db5e403bb83334cc46590dcc51c1e6d2c12e78f295959ba7f83f33
BUNDLE_BYTES=86226530
BUNDLE_FILES=8
ZIP_STRUCTURE=PASS
ZIP_INTEGRITY=PASS
MANIFEST_INTEGRITY=PASS
PRIVATE_KEY_FILES=0
SECRET_LIKE_VALUE_MATCHES=0
APKSIGNER_SHA256=2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180
PS1_GIT_BLOB_VERIFIED=efe59ef464007c8af9f67fd184926f74e403ca08
CMD_GIT_BLOB_VERIFIED=3d01373b69051d30f88a57f26fa815e52d952d6d
```

Generation receipt:

```text
PR_NUMBER=100
STAGING_PR_HEAD=af43e408b4b162d9b9fe6c9f6ec5d9169cc1712e
R1_RUN_ID=34168182736
R1_JOB_ID=101883281871
R1_ARTIFACT_ID=10034846865
ACTIONS_ARTIFACT_WRAPPER_SHA256=8da5131e83e33cff1595ce00ee2d2588f13b8ab971061d679aa1df6336192861
INDEPENDENT_BUNDLE_AUDIT=PASS
```

The initial generation exposed a governance subtlety: on a `pull_request` event, default `actions/checkout` checks out the PR merge ref rather than the branch-head SHA. The deterministic bundle itself was independently verified and is byte-bound to the exact canonical APK and signer blobs, but the final certification still requires an explicit branch-head checkout and regeneration before merge. This is being enforced in the final R1/R2 workflow revision.

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

Only audited v5 is allowed to reach the trusted edge for `+2003` signing after final exact-head CI and post-merge verification.

## Trust boundary

The private `FINANCESENSOR_R2_LAB` keystore, private key and passwords remain only on the owned trusted-edge computer. They must never enter GitHub, CI, uploaded chat evidence, logs, or the public bundle.

## Physical closure condition

R1 may close only if the local signer produces a sanitized receipt containing:

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
