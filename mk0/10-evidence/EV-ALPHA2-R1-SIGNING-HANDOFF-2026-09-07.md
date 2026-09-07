# EV — Alpha.2 R1 Trusted-Edge Signing Handoff — 2026-09-07

Status: **HANDOFF_READY_PHYSICAL_OPEN**

This evidence binds the exact canonical Alpha.2 APK, the exact certified R2 signer Git blobs, and the one currently authorized trusted-edge handoff bundle. It does **not** claim that physical signing has happened.

## Current authority — v3 only

```text
FINANCESENSOR_R1_TRUSTED_EDGE_HANDOFF=READY
CANDIDATE=0.2.0-alpha.2+2001
DESIGN_GOVERNANCE_SHA=416b8e3a1632d549d7d7d0d3026d18f969c57dd2
SOURCE_COMMIT=f658363772b8d3652a81a8a4275a571f2f409ed8
CANONICAL_RUN_ID=34082101187
CANONICAL_ARTIFACT_ID=10004110513
CANONICAL_ARTIFACT_ZIP_SHA256=812c60b563248c5a86ac053a59c64f9f9b6c01e4d55225c426596d418813d736
INPUT_APK_SHA256=7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f
INPUT_APK_BYTES=182053563
SIGNER_PS1_GIT_BLOB=d2aadb1bda90bbbcc3d7aa0e10a5835ef068a297
SIGNER_CMD_GIT_BLOB=3d01373b69051d30f88a57f26fa815e52d952d6d
WINDOWS_NATIVE_STDIN=PROCESS_START_INFO_REDIRECTED
DIRECT_PASSWORD_PIPE=FORBIDDEN
EXPECTED_SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
APKSIGNER_SHA256=2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180
BUNDLE_NAME=FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v3.zip
BUNDLE_SHA256=dbb310bf1efddda91793b996543568b8fff57c4379561fdfeec98eedbe70c90d
BUNDLE_BYTES=86191424
BUNDLE_FILES=8
PRIVATE_KEY_FILES=0
SECRET_LIKE_VALUE_MATCHES=0
ZIP_STRUCTURE=PASS
ZIP_INTEGRITY=PASS
MANIFEST_INTEGRITY=PASS
```

## Rejected / superseded handoffs

The original handoff and v2 are not valid alternatives to v3.

```text
BUNDLE_V1_SHA256=b421274c669b97dd18a3c81ef278a245e646fb1a106f4023f006966a72a269a8
BUNDLE_V1_STATUS=REJECTED_SUPERSEDED
BUNDLE_V1_REASON=WINDOWS_POWERSHELL_NATIVE_STDERR_PIPE_FAILURE

BUNDLE_V2_SHA256=c4b59ce33a9fc7755a14a9a320507492544b9981bdbf2fc5086b78675bc54ae5
BUNDLE_V2_STATUS=REJECTED_SUPERSEDED
BUNDLE_V2_REASON=PACKAGED_PS1_GIT_BLOB_MISMATCH
BUNDLE_V2_OBSERVED_PS1_GIT_BLOB=7ddce7fe22ef8a65cad5edf5c9f42cb87dbd4010
BUNDLE_V2_EXPECTED_PS1_GIT_BLOB=d2aadb1bda90bbbcc3d7aa0e10a5835ef068a297
```

v1 reached the owned Windows edge and exposed the direct native-command stderr/pipe incompatibility. v2 fixed that execution pattern but its packaged PowerShell script was later found not to be byte-identical to the Git blob certified by CI. v3 was rebuilt from the exact certified PS1 blob and re-audited from the final ZIP.

## v3 audit

The final v3 ZIP was extracted and audited independently from its build directory. All seven payload entries matched `BUNDLE-MANIFEST-SHA256.txt`. The canonical APK, public `apksigner.jar`, PS1 Git blob and CMD Git blob all matched their frozen authorities.

The scan found zero private signing-key files and zero values matching the narrow secret-material patterns used by the audit. Local container PowerShell was unavailable, so no new local parser claim is made; the exact PS1 Git blob packaged in v3 is the same blob already parsed successfully by the dedicated public CI gate.

## Trust boundary

The handoff bundle contains the canonical CI-signed input APK, exact repository signer scripts, public `apksigner.jar`, sanitized CI evidence, manifest and local instructions only.

It contains **no** private `.jks`, `.keystore`, `.p12`, `.pfx`, private PEM key, password, OAuth token, Gmail content, or financial plaintext.

The private `FINANCESENSOR_R2_LAB` signing identity and passwords remain only on the owned trusted-edge computer. They must never be uploaded to GitHub or returned to ChatGPT.

## Physical closure condition

R1 may move from `HANDOFF_READY_PHYSICAL_OPEN` to PASS only after the v3 local signer produces a sanitized receipt proving all of:

```text
FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING=PASS
FINANCESENSOR_ALPHA2_CANDIDATE=0.2.0-alpha.2+2001
SOURCE_COMMIT=f658363772b8d3652a81a8a4275a571f2f409ed8
INPUT_APK_SHA256=7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f
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
