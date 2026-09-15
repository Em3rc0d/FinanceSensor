# Alpha.2 +2012 — OD0 owned-device handoff boundary

**Status:** BLOCKED BY R1 TRUSTED-EDGE SIGNING

The canonical product candidate is `0.2.0-alpha.2+2012`. Its post-merge APK is frozen, but OD0 is not executable until the exact APK is signed with the stable trusted-edge identity and that signed APK identity is frozen from a sanitized receipt.

Frozen unsigned identity:
- source: `b75cc39318ee749a1123971f19d895d71e35bd91`
- APK SHA-256: `74e690e9858fd0ef72d0e39f0863371fa1f1f9cfa726a5078e237d33439c587e`
- APK bytes: `182538547`
- package: `com.financesensor.lab.gmailconnection.r2`
- scope: `gmail.readonly`
- stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`

`SIGNING_REQUEST_ALLOWED=YES`
`TRUSTED_EDGE_SIGNING_PASS=NO`
`OD0_EXECUTION_ALLOWED=NO`
`OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO`
`OLD_2009_OD0_HANDOFF = SUPERSEDED / FORBIDDEN`

The blocked harness writes only a sanitized status file and contains no ADB execution path. Prior +2009/+2011 evidence is historical and non-inheritable.

`OD0_PASS != R2_PASS`
`OD0_PASS != BUILD_READY`
`OD0_PASS != RELEASE_READY`
