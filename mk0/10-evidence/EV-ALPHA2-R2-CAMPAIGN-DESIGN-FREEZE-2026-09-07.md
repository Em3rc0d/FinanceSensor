# EV-ALPHA2-R2-CAMPAIGN-DESIGN-FREEZE — 2026-09-07

Status: **DESIGN_CONTRACT_PASS / PHYSICAL_BLOCKED_ON_R1**

This receipt freezes the single owned-Android Alpha.2 campaign contract. It does not claim that the stable Alpha.2 APK has been signed, installed, executed, or physically verified.

```text
CANDIDATE=0.2.0-alpha.2+2001
SOURCE_COMMIT=f658363772b8d3652a81a8a4275a571f2f409ed8
CANONICAL_INPUT_APK_SHA256=7fe14ac1ef62def124d1d15115809308a64e8d3cafffaa619b6c7105c40c8b9f
ANDROID_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
EXPECTED_SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
R1_TRUSTED_EDGE_SIGNING=OPEN
R2_PHYSICAL_CAMPAIGN=BLOCKED_ON_R1
R2_REQUIRED_GATES=12
SAME_SIGNED_CANDIDATE_REQUIRED=YES
PER_SLICE_APK_PROMOTION=NO
PUBLIC_CI_PHYSICAL_PASS=NO
RAW_TRUSTED_EDGE_EVIDENCE_IN_GITHUB=NO
SANITIZED_RECEIPTS_ONLY=YES
Q003_Q004_Q005=ACTIVE
G_MK0=OPEN
BUILD_READY=NO
RELEASE_READY=NO
```

## Authority

- `graph/alpha2-r2-owned-device-campaign.json`
- `graph/alpha2-r2-sanitized-receipt-schema.json`
- `tools/validate-alpha2-r2-owned-device-campaign.mjs`
- `tools/validate-alpha2-r2-chain.mjs`
- `tools/reduce-alpha2-r1-signing-receipt.mjs`
- `mk0/07-plan/ALPHA2-R2-OWNED-DEVICE-CAMPAIGN.md`
- `.github/workflows/alpha2-r2-owned-device-campaign.yml`

## Closure law

R2 may pass only when OD0..OD11 all pass on the same stable-signed APK SHA256 and the committed receipt passes the sanitization schema. R2 PASS is feeder evidence only and cannot independently close Q-003, Q-004, Q-005, G-MK0, BUILD_READY or RELEASE_READY.
