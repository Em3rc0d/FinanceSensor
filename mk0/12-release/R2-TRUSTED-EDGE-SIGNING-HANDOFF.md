# FinanceSensor — R2 Trusted-Edge Signing Handoff

**Candidate:** `0.1.0-alpha.1+1001`  
**Physical package:** `com.financesensor.lab.gmailconnection.r2`  
**Stable lab identity:** `FINANCESENSOR_R2_LAB`  
**Status:** PHYSICAL SIGNING PASS / OWNED-DEVICE OAUTH+GMAIL PASS / ALPHA.2 MOBILE INTEGRATION OPEN

The R2 trusted-edge path is now physically demonstrated for the current certified Human Test Alpha input. This closes only the signer/install/OAuth/Gmail human-test gate; it does not certify full Alpha.2 A-G mobile integration or production readiness.

## Exact static implementation receipt

```text
PR                  81
CANDIDATE_HEAD      aa57df60dba10bf133a9c4ab0f727c98c8b3a1ec
MERGE_COMMIT        7984e5670b5884d84bc613cb002b188e2cb83aa8
WORKFLOW            FinanceSensor Android Human Test Alpha
RUN_ID              34013149864
RUN_NUMBER          10
JOB_ID              101432316748
CONCLUSION          SUCCESS
POWERSHELL_PARSE    PASS
```

## Exact input authority

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

The alias is not trusted by name. The local helper selects the entry whose certificate SHA-1 matches the frozen R2 fingerprint and verifies the produced APK with `apksigner`.

## Windows password-transport repair

The first current-candidate Windows attempt exposed an implementation defect: the local `keytool.exe` did not resolve the `-storepass:env` variable reference. The repaired signer no longer depends on environment-variable password transport.

```text
keytool password input      stdin
apksigner --ks-pass         stdin
apksigner --key-pass        stdin
password in command args    NO
password in file            NO
password in GitHub          NO
```

The physical repair is recorded in `mk0/10-evidence/EV-R2-SIGNER-STDIN-FIX-2026-09-06.md`.

PowerShell/.NET strings do not provide a defensible deterministic zeroization guarantee:

```text
PASSWORD_SESSION_ONLY=YES
PASSWORD_PERSISTED=NO
DETERMINISTIC_PASSWORD_ZEROIZATION_CLAIM=NO
```

## Current physical receipt

```text
FINANCESENSOR_R2_TRUSTED_EDGE_SIGNING=PASS
FINANCESENSOR_HUMAN_TEST_CANDIDATE=0.1.0-alpha.1+1001
SOURCE_COMMIT=9d990fc579429cc0bc8e5c02306d8ebe4622e145
INPUT_APK_SHA256=c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d
SIGNED_APK_SHA256=4b0f65227599eda16e25d14703da1020eaa2f87b69f6cc665997de46b084a94b
SIGNED_APK_BYTES=172908785
SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
```

Owned-device visual evidence from the same current-candidate test session showed Gmail connected, the exact read-only scope disclosure, a successful bounded recent sample, 300 inspected messages, 11 messages opened after metadata gating, 11 displayed movements and transfers separated from spending.

Evidence: `mk0/10-evidence/EV-R2-PHYSICAL-RECEIPT-2026-09-06.md`.

## Historical equality boundary

The current stable-signed output SHA-256 equals the historical R2 output SHA-256 from PR #62. The current receipt remains authoritative because it independently binds the new certified input hash to the stable signer.

```text
CURRENT_INPUT_APK_SHA256  c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d
CURRENT_SIGNED_APK_SHA256 4b0f65227599eda16e25d14703da1020eaa2f87b69f6cc665997de46b084a94b
OLD_SOURCE_COMMIT         7c322a163e15a42fbfbda7dc32ee2b94dbf1b006
OLD_SIGNED_APK_SHA256     4b0f65227599eda16e25d14703da1020eaa2f87b69f6cc665997de46b084a94b
```

Historical provenance is not inherited merely because the final signed bytes are equal.

## Remaining boundary

```text
CURRENT_R2_PHYSICAL_SIGNING_PASS       YES
CURRENT_OWNED_DEVICE_INSTALL_PASS      YES
CURRENT_REAL_OAUTH_PASS                YES
CURRENT_REAL_GMAIL_PASS                YES
CURRENT_BOUNDED_SCAN_OBSERVED          YES
ALPHA2_MOBILE_INTEGRATION              OPEN
GOOGLE_PRODUCTION_VERIFICATION         OPEN
BUILD_READY                            NO
RELEASE_READY                          NO
```

```text
PHYSICAL_SIGNING_PASS != ALPHA2_MOBILE_INTEGRATED
REAL_OAUTH_PASS != GOOGLE_PRODUCTION_VERIFICATION
HUMAN_TEST_READY != BUILD_READY
BUILD_READY != RELEASE_READY
```
