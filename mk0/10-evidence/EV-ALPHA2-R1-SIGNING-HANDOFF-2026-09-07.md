# EV — Alpha.2 R1 Trusted-Edge Signing Handoff — 2026-09-07

Status: **BUNDLE_GENERATION_OPEN / PHYSICAL_OPEN**

The owned-device installability failure on `+2001` reopened R1. This evidence binds the repaired `+2002` canonical APK and the exact repository signer that will be packaged into v4. It does **not** claim that trusted-edge physical signing has happened.

## Current authority

```text
CANDIDATE=0.2.0-alpha.2+2002
SOURCE_COMMIT=3e83fbaa74c31b11fb46cccfa3a5c31d882d4093
CANONICAL_RUN_ID=34163911830
CANONICAL_JOB_ID=101871077983
CANONICAL_ARTIFACT_ID=10033624133
CANONICAL_ARTIFACT_ZIP_SHA256=3f1d463fee5292ccfa1d0ec2b2b316b83183158459fee48af3afd2eca861db6c
INPUT_APK_SHA256=a0351e615a7c57b142029422351d1fd384ee42430f2e06a10ceb8bd126d081cf
INPUT_APK_BYTES=176012379
ANDROID_MIN_SDK=24
ANDROID_TARGET_SDK=36
APK_SIGNATURE_VERIFY=PASS
APK_AAPT2_PARSE=PASS
SIGNER_PS1_GIT_BLOB=b082238e111381d2689626037e5ac795dbd210c7
SIGNER_CMD_GIT_BLOB=3d01373b69051d30f88a57f26fa815e52d952d6d
WINDOWS_NATIVE_STDIN=PROCESS_START_INFO_REDIRECTED
DIRECT_PASSWORD_PIPE=FORBIDDEN
EXPECTED_SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
BUNDLE_NAME=FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v4.zip
BUNDLE_STATUS=GENERATION_PENDING
```

## Superseded handoffs

```text
BUNDLE_V3_SHA256=dbb310bf1efddda91793b996543568b8fff57c4379561fdfeec98eedbe70c90d
BUNDLE_V3_STATUS=REJECTED_SUPERSEDED
BUNDLE_V3_REASON=PINNED_TO_SUPERSEDED_ALPHA2_2001_INPUT

BUNDLE_V2_SHA256=c4b59ce33a9fc7755a14a9a320507492544b9981bdbf2fc5086b78675bc54ae5
BUNDLE_V2_STATUS=REJECTED_SUPERSEDED

BUNDLE_V1_SHA256=b421274c669b97dd18a3c81ef278a245e646fb1a106f4023f006966a72a269a8
BUNDLE_V1_STATUS=REJECTED_SUPERSEDED
```

v3 was internally valid for `+2001`, but it is now unusable because its fail-closed input pin targets the superseded APK. v1/v2 remain rejected for their earlier tooling defects.

## v4 generation law

Public CI may only assemble public-safe handoff material. It may download the immutable canonical artifact, package the exact Git PS1/CMD blobs, package a public `apksigner.jar`, generate a manifest/audit receipt and upload the bundle. It may not possess or use the private `FINANCESENSOR_R2_LAB` keystore or password and may not claim physical signing.

The v4 ZIP is built deterministically with fixed ZIP timestamps. After the first successful generation, its final ZIP digest, bytes and `apksigner.jar` digest must be frozen back into `graph/alpha2-r1-signing-handoff.json` and revalidated before authorization.

## Trust boundary

Private `.jks`, `.keystore`, `.p12`, `.pfx`, private PEM material, passwords, OAuth tokens, Gmail content and financial plaintext are forbidden from the bundle and GitHub evidence.

## Physical closure condition

Once v4 becomes `HANDOFF_READY_PHYSICAL_OPEN`, R1 may close only after the locally executed signer emits a sanitized receipt proving:

```text
FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING=PASS
FINANCESENSOR_ALPHA2_CANDIDATE=0.2.0-alpha.2+2002
SOURCE_COMMIT=3e83fbaa74c31b11fb46cccfa3a5c31d882d4093
CANONICAL_RUN_ID=34163911830
CANONICAL_ARTIFACT_ID=10033624133
INPUT_APK_SHA256=a0351e615a7c57b142029422351d1fd384ee42430f2e06a10ceb8bd126d081cf
INPUT_APK_BYTES=176012379
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
