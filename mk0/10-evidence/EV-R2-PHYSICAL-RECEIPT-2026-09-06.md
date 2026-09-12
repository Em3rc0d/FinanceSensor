# EV — Current R2 trusted-edge physical receipt

**Date:** 2026-09-06  
**Candidate:** `0.1.0-alpha.1+1001`

## Signed input/output binding

```text
FINANCESENSOR_R2_TRUSTED_EDGE_SIGNING=PASS
SOURCE_COMMIT=9d990fc579429cc0bc8e5c02306d8ebe4622e145
INPUT_APK_SHA256=c0a4a5a9a908ed0ea04cbb5ddef10f1343ed84cfa1db5fbe1b2ac00e0a768d1d
SIGNED_APK_SHA256=4b0f65227599eda16e25d14703da1020eaa2f87b69f6cc665997de46b084a94b
SIGNED_APK_BYTES=172908785
SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
ANDROID_OAUTH_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
```

Private signing material was not placed in GitHub and no password is recorded in this evidence.

## Owned-device observation

The current signed candidate was installed and executed on an owned Android device. User-supplied visual evidence from the controlled test session showed:

```text
Gmail connected                         PASS
exact UI scope                          gmail.readonly
bounded recent sample action            PASS
messages inspected                      300
messages opened after metadata gate      11
canonical movements shown                11
transfer separation visible              PASS
session-only disclosure visible          PASS
```

The observed screen displayed PEN spending separately from transfers and did not claim a complete bank balance.

## Hash equality with historical signed output

The new physical output SHA-256 equals the historical R2 signed APK SHA-256 already recorded for the older handoff:

```text
4b0f65227599eda16e25d14703da1020eaa2f87b69f6cc665997de46b084a94b
```

This evidence does **not** inherit the historical source provenance. The current receipt independently binds the certified input `c0a4a5...` to the stable R2 signer. Byte equality of the final signed APK is recorded as an observation, not used as a substitute for the current receipt.

## Claims allowed

```text
CURRENT_R2_PHYSICAL_SIGNING_PASS      YES
CURRENT_OWNED_DEVICE_INSTALL_PASS     YES
CURRENT_REAL_OAUTH_OBSERVED           YES
CURRENT_REAL_GMAIL_OBSERVED           YES
CURRENT_BOUNDED_SCAN_OBSERVED         YES
ALPHA2_MOBILE_INTEGRATION             OPEN
BUILD_READY                           NO
RELEASE_READY                         NO
```

## Claims forbidden

This receipt does not certify full Alpha.2 A-G mobile integration, production OAuth verification, Google restricted-scope production approval, complete monthly financial coverage, or release readiness.
