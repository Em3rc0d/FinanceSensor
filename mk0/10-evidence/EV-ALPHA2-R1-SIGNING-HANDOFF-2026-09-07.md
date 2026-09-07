# EV — Alpha.2 R1 Trusted-Edge Signing Handoff — 2026-09-07

Status: **HANDOFF_READY_PHYSICAL_OPEN**

This evidence binds the exact canonical Alpha.2 APK and the exact statically certified R2 signer to one trusted-edge handoff bundle. It does **not** claim that physical signing has happened.

The first handoff bundle was superseded after a real Windows PowerShell 5.1 attempt exposed a native stderr handling defect: `keytool.exe` wrote its password prompt to stderr and PowerShell promoted that prompt to `NativeCommandError` under `$ErrorActionPreference='Stop'`. The canonical APK, package, scope and signer identity were correct; signing did not complete. Bundle v2 fixes only the native-process transport.

```text
FINANCESENSOR_R1_TRUSTED_EDGE_HANDOFF=READY
HANDOFF_SCHEMA=A2_R1_TRUSTED_EDGE_HANDOFF_V2
DESIGN_GOVERNANCE_SHA=416b8e3a1632d549d7d7d0d3026d18f969c57dd2
CANDIDATE=0.2.0-alpha.2+2001
SOURCE_COMMIT=f658363772b8d3652a81a8a4275a571f2f409ed8
CANONICAL_RUN_ID=34082101187
CANONICAL_ARTIFACT_ID=10004110513
CANONICAL_ARTIFACT_ZIP_SHA256=812c60b563248c5a86ac053a59c64f9f9b6c01e4d55225c426596d418813d736
INPUT_APK_SHA256=7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f
INPUT_APK_BYTES=182053563
SIGNER_PS1_GIT_BLOB=f535c79b4c375fdf2dcecd7632281cd282d542b4
SIGNER_CMD_GIT_BLOB=3d01373b69051d30f88a57f26fa815e52d952d6d
WINDOWS_NATIVE_IO=PROCESS_START_INFO_REDIRECTED_STDIN_STDOUT_STDERR
DIRECT_NATIVE_PASSWORD_PIPELINE=0
EXPECTED_SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
APKSIGNER_SHA256=2defad215d7ff52968a409cde528cdaef7918b115e276b8e3378ca7a178e4180
BUNDLE_NAME=FinanceSensor-ALPHA2-R1-TRUSTED-EDGE-BUNDLE-v2.zip
BUNDLE_SHA256=6ce4ec9fcb2e42043e89387cb4f21d1dd1bbe5ef079807e62e0bdad479be50d5
BUNDLE_BYTES=86531678
BUNDLE_FILES=8
PRIVATE_KEY_FILES=0
SECRET_LIKE_VALUE_MATCHES=0
ZIP_STRUCTURE=PASS
ZIP_INTEGRITY=PASS
SUPERSEDES_BUNDLE_SHA256=b421274c669b97dd18a3c81ef278a245e646fb1a106f4023f006966a72a269a8
```

## Trust boundary

The handoff bundle contains the canonical CI-signed input APK, the repository signer scripts, public `apksigner.jar`, sanitized CI evidence, and local instructions/manifest only.

The bundle contains **no** private `.jks`, `.keystore`, `.p12`, `.pfx`, PEM private key, password, OAuth token, Gmail content, or financial plaintext.

The private `FINANCESENSOR_R2_LAB` signing identity and passwords remain on the owned trusted-edge computer. They must never be uploaded to GitHub or returned to ChatGPT.

## Windows native-process boundary

Bundle v2 routes `keytool` and `apksigner` through `System.Diagnostics.ProcessStartInfo` with redirected stdin/stdout/stderr. The password remains session-only; process exit code, not native stderr prompt text, is the failure authority. Direct PowerShell pipelines carrying keystore/key passwords are forbidden by CI.

## Physical closure condition

R1 may move from `HANDOFF_READY_PHYSICAL_OPEN` to PASS only after the local signer produces a sanitized receipt proving all of:

```text
FINANCESENSOR_ALPHA2_R2_TRUSTED_EDGE_SIGNING=PASS
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
