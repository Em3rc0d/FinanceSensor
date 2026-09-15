# Alpha.2 +2009 — OD0 owned-device handoff boundary

**Status:** BLOCKED BY R1 TRUSTED-EDGE SIGNING

The current canonical product candidate is `0.2.0-alpha.2+2009`, but OD0 is **not executable yet**. The exact canonical APK is frozen and all reproducible pre-signing gates are green; however, the stable trusted-edge signature has not yet been produced for this candidate.

## Current frozen identity

- Candidate: `0.2.0-alpha.2+2009`
- Product source commit: `9391f8cfbafcf89d5e3fbd7c0bfc995247df9c6f`
- Canonical source commit: `e19bcccee13e326bbc08012533ddaeba026c633a`
- Canonical unsigned APK SHA-256: `1603ebdb5bd47bf732a1ea3cced705ac67ec57b690b1bf6795f543230e3d0717`
- Canonical unsigned APK bytes: `182514883`
- Expected stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- Android package: `com.financesensor.lab.gmailconnection.r2`
- Gmail scope: `gmail.readonly`

## Why OD0 is blocked

The previous +2008 owned-device observation found the deterministic post-password statement-import failure. +2009 contains the remediation and has a different product/APK identity. Under the mutation law, +2008 signing and physical evidence are historical and non-inheritable.

Therefore the only allowed human boundary now is R1 trusted-edge signing of the exact +2009 canonical APK. Until a sanitized R1 signing receipt freezes the resulting stable-signed APK identity:

```text
SIGNING_REQUEST_ALLOWED=YES
TRUSTED_EDGE_SIGNING_PASS=NO
OD0_EXECUTION_ALLOWED=NO
OWNED_DEVICE_UAT_REQUEST_ALLOWED=NO
HUMAN_UAT_ELIGIBLE=NO
```

## Fail-closed operational tooling

`RUN-FINANCESENSOR-ALPHA2-OD0.ps1` and `.cmd` are intentionally inert in this state. Normal execution writes only a sanitized `FinanceSensor-ALPHA2-R2-OD0-BLOCKED.txt` status and exits before ADB or any device operation.

The harness will be rebound to the exact stable-signed +2009 APK only after R1 trusted-edge signing is certified. At that point the consolidated owned-device campaign may open; until then no OD0 handoff package is valid.

`OLD_2008_OD0_HANDOFF = SUPERSEDED / FORBIDDEN`

`OD0_PASS != R2_PASS`

`OD0_PASS != BUILD_READY`

`OD0_PASS != RELEASE_READY`
