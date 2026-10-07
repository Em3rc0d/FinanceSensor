# EV-ALPHA2-R2-CAMPAIGN-DESIGN-FREEZE — 2026-09-07

Status: **DESIGN_CONTRACT_PASS / R1_PASS / PHYSICAL_READY**

The OD0..OD11 campaign topology remains the frozen R2 contract. Candidate identity was reopened and rebound under the existing source/APK identity-change law; the current stable-signed authority is Alpha.2 `+2003`. R2 itself has not passed.

```text
CANDIDATE=0.2.0-alpha.2+2003
SOURCE_COMMIT=c29a68e5326a187a7c82e6d66254ae05b6a4178a
CANONICAL_INPUT_APK_SHA256=93d176b9f59b75a44ffcb9634d2a5620b2f0d63bbc75d80e2e1600a7d2cc5ad6
CANONICAL_INPUT_APK_BYTES=182090843
SIGNED_APK_SHA256=7b30ff7d88d92b82729d1eac72c654884eafa4bcd0f9cbaef13a98d6fb18bbc6
SIGNED_APK_BYTES=182116902
ANDROID_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
EXPECTED_SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
R1_TRUSTED_EDGE_SIGNING=PASS
R2_PHYSICAL_CAMPAIGN=READY
R2_NEXT_GATE=OD0_SIGNED_APK_INSTALL_AND_LAUNCH
R2_REQUIRED_GATES=12
SAME_SIGNED_CANDIDATE_REQUIRED=YES
PER_SLICE_APK_PROMOTION=NO
PUBLIC_CI_ORIGINATED_PHYSICAL_PASS=NO
RAW_TRUSTED_EDGE_EVIDENCE_IN_GITHUB=NO
SANITIZED_RECEIPTS_ONLY=YES
PHYSICAL_ALPHA2_PASS=NO
Q003_Q004_Q005=ACTIVE
G_MK0=OPEN
BUILD_READY=NO
RELEASE_READY=NO
```

## R1 receipt binding

- sanitized source: `graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2026-09-08.txt`
- reduced receipt: `graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2026-09-08.json`
- stable APK SHA256: `7b30ff7d88d92b82729d1eac72c654884eafa4bcd0f9cbaef13a98d6fb18bbc6`
- stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`

The earlier install/launch observation on the ephemeral CI-debug APK is not inherited by this differently signed stable APK. Therefore OD0 is **READY**, not PASS.

## Authority

- `graph/alpha2-r2-owned-device-campaign.json`
- `graph/alpha2-r2-sanitized-receipt-schema.json`
- `tools/validate-alpha2-r1-physical-signing-receipt.mjs`
- `tools/validate-alpha2-r2-owned-device-campaign.mjs`
- `tools/validate-alpha2-r2-chain.mjs`
- `tools/reduce-alpha2-r1-signing-receipt.mjs`
- `mk0/07-plan/ALPHA2-R2-OWNED-DEVICE-CAMPAIGN.md`
- `.github/workflows/alpha2-r2-owned-device-campaign.yml`

## Closure law

R2 may pass only when OD0..OD11 all pass on this one stable-signed APK SHA256 and the committed R2 receipt passes the sanitization schema. R2 PASS remains feeder evidence only and cannot independently close Q-003, Q-004, Q-005, G-MK0, BUILD_READY or RELEASE_READY.
