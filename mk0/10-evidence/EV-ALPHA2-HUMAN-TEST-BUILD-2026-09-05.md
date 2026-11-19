# EV — Alpha.2 Android Human Test build

Date: 2026-09-05  
Evidence class: public CI build receipt / pre-physical handoff  
Product promotion: **NO**

## Exact source

```text
BRANCH       jett/mk0-foundation
SOURCE_SHA   9d990fc579429cc0bc8e5c02306d8ebe4622e145
WORKFLOW     FinanceSensor Android Human Test Alpha
RUN_ID       33999717749
RUN_NUMBER   4
JOB_ID       101396281087
CONCLUSION   SUCCESS
```

The workflow passed, in order:

```text
Pre-physical build-readiness boundary   PASS
Alpha.2 A-G static build handoff        PASS
Human-test privacy boundary             PASS
Flutter 3.44.7 setup                    PASS
Android scaffold + native boundary      PASS
Dependency resolution                   PASS
flutter analyze                         PASS
flutter test                            22 / 22 PASS
flutter build apk --debug               PASS
candidate evidence freeze               PASS
public signing-helper packaging         PASS
artifact upload                         PASS
```

## Exact artifact

```text
ARTIFACT_ID          9979184888
ARTIFACT_NAME        financesensor-android-human-test-alpha-0.1.0
ARTIFACT_ZIP_BYTES   81786483
ARTIFACT_ZIP_SHA256  dac3afc3f816321fee3a9a0655bd70a34a037860897a5d1c684695ba3ae9966c

APK_PATH             build/app/outputs/flutter-apk/app-debug.apk
APK_BYTES            172884802
APK_SHA256           c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d
```

The ZIP digest identifies the GitHub artifact archive. The APK digest identifies the actual Android package inside the archive. They are intentionally recorded separately and must not be substituted for each other.

## Candidate contract

```text
FINANCESENSOR_HUMAN_TEST_CANDIDATE  0.1.0-alpha.1+1001
STATIC_A_G_CERTIFIED                YES
PRE_PHYSICAL_BUILD_ENTRY            PASS
HUMAN_TEST_READY                    YES
ALPHA2_MOBILE_INTEGRATION           OPEN
ALPHA2_PHYSICAL_PRODUCT_PASS        NO
BUILD_READY                         NO
RELEASE_READY                       NO

ANDROID_OAUTH_PACKAGE               com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE                         gmail.readonly
SESSION_ONLY_FINANCIAL_STATE        YES
RAW_FINANCIAL_CONTENT_PERSISTENCE   0
DART_BEARER_CUSTODY                 0
APP_REFRESH_TOKEN_CUSTODY           0
OFFLINE_ACCESS_REQUESTED            0
REAL_OAUTH_EXECUTED_BY_CI           0
REAL_GMAIL_EXECUTED_BY_CI           0
PUBLIC_CI_SIGNER                    COMPILE_ONLY_EPHEMERAL
TRUSTED_EDGE_RESIGN_REQUIRED        YES
```

## Promotion boundary

This receipt proves only that the bounded Human Test Alpha APK was built successfully from the exact source SHA above under public-safe CI constraints.

It does **not** prove:

- the stable `FINANCESENSOR_R2_LAB` signer is present on this CI APK;
- real Google OAuth succeeds on an owned Android device;
- real Gmail access succeeds;
- Alpha.2 A-G are integrated into the Android product runtime;
- real SQLCipher / Android Keystore behavior;
- physical storage, restart, reboot, backup or crypto-shred behavior;
- global `BUILD_READY` or `RELEASE_READY`.

## Next physical gate

```text
CI APK
  ↓
TRUSTED EDGE
  ↓
re-sign with FINANCESENSOR_R2_LAB
  ↓
verify stable signer + new APK SHA-256
  ↓
owned-device install
  ↓
real gmail.readonly authorization + bounded scan
```

Governing laws:

```text
CI_BUILD_PASS != TRUSTED_EDGE_SIGNED_APK
HUMAN_TEST_READY != BUILD_READY
STATIC_A_G_CERTIFIED != ALPHA2_MOBILE_INTEGRATED
APK_BUILD_PASS != RELEASE_READY
```
