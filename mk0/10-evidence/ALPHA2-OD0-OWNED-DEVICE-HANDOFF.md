# Alpha.2 +2012 — OD0 owned-device handoff boundary

**Status:** READY FOR OD0 / PHYSICAL PASS NOT YET CLAIMED

The canonical product candidate is `0.2.0-alpha.2+2012`. Trusted-edge signing has passed and the exact stable-signed APK identity is frozen from a sanitized receipt. OD0 may now execute, but only against that identity and only with a data-preserving replacement install.

Frozen identity:
- product source: `e46eef4f406dec3220d3f1a2bda51bf7a4fd7202`
- canonical source: `b75cc39318ee749a1123971f19d895d71e35bd91`
- unsigned APK SHA-256: `74e690e9858fd0ef72d0e39f0863371fa1f1f9cfa726a5078e237d33439c587e`
- stable-signed APK SHA-256: `05ee3efd70bb07fe11bde6a21140c03de3ffa872b5f90e7a1014b5106b4b3000`
- stable-signed APK bytes: `182563366`
- package: `com.financesensor.lab.gmailconnection.r2`
- versionCode: `2012`
- scope: `gmail.readonly`
- stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- sanitized signing receipt: `graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2012-2026-09-15.json`

`SIGNING_REQUEST_ALLOWED=NO`
`TRUSTED_EDGE_SIGNING_PASS=YES`
`OD0_EXECUTION_ALLOWED=YES`
`OWNED_DEVICE_UAT_REQUEST_ALLOWED=YES`
`OLD_2009_OD0_HANDOFF = SUPERSEDED / FORBIDDEN`

The OD0 harness verifies the signed APK hash, byte length, signing receipt, stable signer, exactly one authorized Android device, minSdk compatibility and installed version before it records PASS. The only permitted install operation is `adb install -r`; uninstall and `pm clear` are forbidden so the existing Gmail/local application state is preserved.

The generated receipt is sanitized: no device serial, raw ADB output, OAuth material, Gmail content, PDF data, statement key or financial plaintext may be persisted.

`OD0_PASS != R2_PASS`
`OD0_PASS != PHYSICAL_ALPHA2_PASS`
`OD0_PASS != BUILD_READY`
`OD0_PASS != RELEASE_READY`
