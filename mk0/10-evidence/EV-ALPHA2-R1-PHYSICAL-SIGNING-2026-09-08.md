# EV — Alpha.2 R1 Physical Trusted-Edge Signing — 2026-09-08

Status: **PASS**

## Claim

The frozen Alpha.2 `0.2.0-alpha.2+2003` canonical input was signed on the owned trusted edge with the frozen `FINANCESENSOR_R2_LAB` identity. Only the sanitized receipt was admitted to the repository.

```text
R1_TRUSTED_EDGE_SIGNING=PASS
CANDIDATE=0.2.0-alpha.2+2003
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
SANITIZATION_PASS=YES
RAW_PRIVATE_MATERIAL_COMMITTED=NO
```

## Evidence chain

1. v5 authority: SHA256 `7f3dbb0570db5e403bb83334cc46590dcc51c1e6d2c12e78f295959ba7f83f33`, 86,226,530 bytes.
2. Sanitized signer output: `graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2026-09-08.txt`.
3. Reduced receipt: `graph/physical-receipts/ALPHA2-R1-TRUSTED-EDGE-SIGNING-2026-09-08.json`.
4. Reducer: `tools/reduce-alpha2-r1-signing-receipt.mjs`.
5. Cross-state validator: `tools/validate-alpha2-r1-physical-signing-receipt.mjs`.

The interactive password prompt and all private keystore/key material are outside this evidence chain and outside GitHub.

## Downstream effect

```text
R2_OWNED_DEVICE_CAMPAIGN=READY
R2_NEXT_GATE=OD0_SIGNED_APK_INSTALL_AND_LAUNCH
```

The stable APK must itself be installed and launched. The prior `+2003` install/launch observation used the ephemeral CI-debug signature and cannot be inherited by this new stable-signed hash.

## Explicit non-claims

```text
REAL_OAUTH=OPEN
REAL_GMAIL=OPEN
PHYSICAL_SQLCIPHER=OPEN
PHYSICAL_ALPHA2_PASS=NO
Q003_Q004_Q005=ACTIVE
G_MK0=OPEN
BUILD_READY=NO
RELEASE_READY=NO
```

## Reopen triggers

R1/R2 reopen if the source commit, canonical input APK identity, Android package, Gmail scope, stable signer identity, or accepted signed APK identity changes.
