# EV — Alpha.2 R1 Trusted-Edge Signing Handoff — 2026-09-07

Status: **TRUSTED_EDGE_SIGNING_PASS · R2_READY**

This evidence binds the exact canonical Alpha.2 `+2003` APK, deterministic v5 handoff bundle, stable R2 signing identity, and the sanitized trusted-edge physical signing receipt accepted on 2026-09-08.

## Canonical +2003 authority

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
EXPECTED_SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
```

The earlier owned-device observation proved install + launch for the canonical CI-debug input only. Its Google authorization failure was never promoted because that APK used the ephemeral CI signer.

## v5 audited authority

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

Exact-head and post-merge certification for PR #100:

```text
CERTIFIED_HEAD=a076c399e13a22863935d443748c0b3affe150d7
EXACT_HEAD_R1_RUN=34168480789
EXACT_HEAD_R1_JOB=101884144830
EXACT_HEAD_R2_RUN=34168480790
EXACT_HEAD_R2_JOB=101884114083
MERGE_SHA=0e62deb139fc423f0be19aa139c95648c55379fd
POST_MERGE_R1_RUN=34168640111
POST_MERGE_R1_JOB=101884576393
POST_MERGE_R2_RUN=34168640052
POST_MERGE_R2_JOB=101884576316
POST_MERGE_R1_ARTIFACT=10034986460
POST_MERGE_ACTIONS_WRAPPER_SHA256=898dd22850dce2def9382acf7afb42d729f0eca5e3fd2cabaf7d8e8813c60ea3
INNER_V5_REPRODUCED=PASS
```

## Physical trusted-edge receipt — accepted 2026-09-08

Only the sanitized receipt body was retained. The interactive password prompt, keystore, password, private key and all other private signing material were excluded.

```text
FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING=PASS
FINANCESENSOR_ALPHA2_CANDIDATE=0.2.0-alpha.2+2003
SOURCE_COMMIT=c29a68e5326a187a7c82e6d66254ae05b6a4178a
CANONICAL_RUN_ID=34166127407
CANONICAL_ARTIFACT_ID=10034303033
INPUT_APK_SHA256=93d176b9f59b75a44ffcb9634d2a5620b2f0d63bbc75d80e2e1600a7d2cc5ad6
INPUT_APK_BYTES=182090843
SIGNED_APK_SHA256=7b30ff7d88d92b82729d1eac72c654884eafa4bcd0f9cbaef13a98d6fb18bbc6
SIGNED_APK_BYTES=182116902
SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
PRIVATE_SIGNING_MATERIAL_IN_GITHUB=0
PHYSICAL_ALPHA2_PASS=NO
BUILD_READY=NO
RELEASE_READY=NO
```

Receipt authorities:

- sanitized source: `graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2026-09-08.txt`
- reduced receipt: `graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2026-09-08.json`
- reducer: `tools/reduce-alpha2-r1-signing-receipt.mjs`
- physical receipt validator: `tools/validate-alpha2-r1-physical-signing-receipt.mjs`

The reducer must accept the exact sanitized source and reproduce the reduced receipt. Public CI validates this evidence but did not perform the physical signing and cannot originate a physical PASS.

## Resulting state

```text
R1_TRUSTED_EDGE_SIGNING=PASS
R2_OWNED_DEVICE_CAMPAIGN=READY
R2_NEXT_GATE=OD0_SIGNED_APK_INSTALL_AND_LAUNCH
REAL_OAUTH=OPEN
REAL_GMAIL=OPEN
PHYSICAL_SQLCIPHER=OPEN
PHYSICAL_ALPHA2_PASS=NO
Q003_Q004_Q005=ACTIVE
G_MK0=OPEN
BUILD_READY=NO
RELEASE_READY=NO
```

R1 closes only trusted-edge signing. It does not inherit install/launch from the differently signed CI-debug APK, does not prove OAuth/Gmail, and does not close R2, Q-003, Q-004, Q-005, G-MK0, BUILD_READY or RELEASE_READY.

## Superseded / forbidden handoffs

v1, v2, v3 and v4 remain rejected/superseded. Only the audited v5 authority above is valid for `+2003`.
