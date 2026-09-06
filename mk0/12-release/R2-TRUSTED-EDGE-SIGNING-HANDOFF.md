# FinanceSensor — R2 Trusted-Edge Signing Handoff

**Candidate:** `0.1.0-alpha.1+1001`  
**Physical package:** `com.financesensor.lab.gmailconnection.r2`  
**Stable lab identity:** `FINANCESENSOR_R2_LAB`  
**Status:** STATIC READY / PHYSICAL SIGNING REQUIRED

## Exact input authority

Only the APK frozen by the current Human Test build receipt is eligible for this signing step.

```text
SOURCE_COMMIT        9d990fc579429cc0bc8e5c02306d8ebe4622e145
ARTIFACT_ID          9979184888
INPUT_APK_BYTES      172884802
INPUT_APK_SHA256     c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d
```

The signer fails closed if the input APK hash differs by even one bit.

## Stable signer authority

```text
IDENTITY             FINANCESENSOR_R2_LAB
EXPECTED_SIGNER_SHA1 63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
PRIVATE_KEY_IN_GITHUB=0
PRIVATE_KEY_IN_CI=0
PASSWORD_IN_GITHUB=0
PASSWORD_IN_CI=0
```

The alias is not trusted by name. The local helper enumerates the selected keystore and selects only the entry whose certificate SHA-1 matches the frozen R2 fingerprint.

## Trusted-edge sequence

```text
certified CI APK
      ↓
verify exact input SHA-256
      ↓
apksigner verify input APK
      ↓
select local private keystore
      ↓
find FINANCESENSOR_R2_LAB by certificate fingerprint
      ↓
sign locally
      ↓
apksigner verify output
      ↓
verify exact signer SHA-1
      ↓
write signed APK SHA-256 + sanitized receipt
      ↓
owned-device installation / OAuth physical campaign
```

Every failure deletes the output APK, `.sha256`, and `.receipt.txt` files. The output path is forbidden from being the same file as the certified input APK.

## Password boundary

The password is prompted locally and made available only to local `keytool` / `apksigner` through process environment variables for the signing session. Those environment entries and managed references are cleared afterward.

PowerShell/.NET strings do not provide a defensible deterministic zeroization guarantee. Therefore:

```text
PASSWORD_SESSION_ONLY=YES
PASSWORD_PERSISTED=NO
PASSWORD_SENT_TO_GITHUB=NO
PASSWORD_SENT_TO_PUBLIC_CI=NO
DETERMINISTIC_PASSWORD_ZEROIZATION_CLAIM=NO
```

## Physical receipt required

Static validation cannot produce the private-signing result. A successful local run must return a sanitized receipt containing only:

```text
FINANCESENSOR_R2_TRUSTED_EDGE_SIGNING=PASS
FINANCESENSOR_HUMAN_TEST_CANDIDATE=0.1.0-alpha.1+1001
SOURCE_COMMIT=9d990fc579429cc0bc8e5c02306d8ebe4622e145
INPUT_APK_SHA256=c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d
SIGNED_APK_SHA256=<physical output>
SIGNED_APK_BYTES=<physical output>
SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
PRIVATE_SIGNING_MATERIAL_IN_GITHUB=0
REAL_OAUTH_EXECUTED_BY_SIGNING_STEP=0
REAL_GMAIL_EXECUTED_BY_SIGNING_STEP=0
ALPHA2_MOBILE_INTEGRATION=OPEN
BUILD_READY=NO
RELEASE_READY=NO
```

No keystore path, alias, password, token, Gmail identity, financial content or device identifier belongs in the repository receipt.

## Prior PR #62 boundary

PR #62 contains useful historical R2 engineering evidence, but its physical signing/install/OAuth receipts were bound to a previous candidate source and a different signed APK digest:

```text
OLD_SOURCE_COMMIT       7c322a163e15a42fbfbda7dc32ee2b94dbf1b006
OLD_SIGNED_APK_SHA256   4b0f65227599eda16e25d14703da1020eaa2f87b69f6cc665997de46b084a94b
```

Those observations remain historical evidence only. They are **not inherited** as physical PASS for the current APK.

```text
OLD_SIGNED_APK_RECEIPT != CURRENT_APK_SIGNING_PASS
STATIC_SIGNER_HANDOFF_READY != PHYSICAL_SIGNING_PASS
PHYSICAL_SIGNING_PASS != REAL_OAUTH_PASS
HUMAN_TEST_READY != BUILD_READY
```
