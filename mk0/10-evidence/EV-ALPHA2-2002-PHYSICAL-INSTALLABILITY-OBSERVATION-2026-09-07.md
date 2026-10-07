# EV-ALPHA2 — +2002 physical installability observation

Date: 2026-09-07  
Surface: owned Android device / diagnostic pre-R1 observation  
Candidate family: `0.2.0-alpha.2+2002`

## Observation

The repaired Alpha.2 APK was installed on an owned Android device and launched successfully. The initial FinanceSensor / PocketFinances connection screen rendered normally.

After selecting **Conectar Gmail**, the app remained disconnected and rendered the safe user-facing authorization failure message:

```text
Google no pudo autorizar la conexión de forma segura.
```

No Gmail data, financial data, PDF content, token, account identifier or private signing material is recorded in this receipt.

## What this closes

```text
OLD_PACKAGE_PARSE_FAILURE          NOT_REPRODUCED_ON_+2002
APK_INSTALL                        OBSERVED_PASS
APP_LAUNCH                         OBSERVED_PASS
INITIAL_UI_RENDER                  OBSERVED_PASS
```

The previous `+2001` installability assumption is superseded for physical testing.

## What this does NOT close

This physical observation used a public-CI debug-signed APK. It is therefore **not** authority for R1 trusted-edge signing and **must not** be counted as OD0 of the frozen R2 campaign, because R2 requires one stable-signed APK hash for OD0→OD11.

```text
R1_TRUSTED_EDGE_SIGNING            OPEN
R2_OD0                              NOT_CLAIMED
REAL_GMAIL_AUTHORIZATION            NOT_PROVEN
REAL_GMAIL_READ                     NOT_EXECUTED
PHYSICAL_ALPHA2_PASS                NO
BUILD_READY                         NO
RELEASE_READY                       NO
```

## Signer mismatch boundary

The repair CI demonstrated that the installability APK was signed by an ephemeral Android debug certificate. The stable Android OAuth identity remains:

```text
PACKAGE
com.financesensor.lab.gmailconnection.r2

AUTHORIZED_STABLE_R2_SIGNER_SHA1
63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
```

The repaired PR artifact used a different debug certificate fingerprint. Registering an ephemeral CI fingerprint as the durable Android OAuth identity is explicitly rejected.

The Android bridge already fails closed on Google authorization status code 10 using the stable diagnostic code `AUTH_FAILED_10` / `Android OAuth signature not registered`. The user-facing UI intentionally exposes only a coarse safe message.

## Post-merge candidate authority to rebase

The exact post-merge installability build is:

```text
SOURCE_COMMIT
3e83fbaa74c31b11fb46cccfa3a5c31d882d4093

WORKFLOW
Alpha.2 Integrated Runtime

RUN_ID
34163911830

JOB_ID
101871077983

ARTIFACT_ID
10033624133

ARTIFACT_ZIP_SHA256
3f1d463fee5292ccfa1d0ec2b2b316b83183158459fee48af3afd2eca861db6c

APK_SHA256
a0351e615a7c57b142029422351d1fd384ee42430f2e06a10ceb8bd126d081cf

APK_BYTES
176012379

ANDROID_MIN_SDK
24

ANDROID_TARGET_SDK
36

APK_SIGNATURE_VERIFY
PASS

APK_AAPT2_PARSE
PASS
```

This post-merge APK is public-CI compile authority only and still requires trusted-edge re-signing with `FINANCESENSOR_R2_LAB` before any OAuth/provider result may be promoted.

## Reopen / supersession effect

Because candidate/source/APK identity changed from `+2001` to `+2002`, the old R1 v3 handoff is no longer valid input authority. The canonical candidate and R1 signing handoff must be re-frozen against the exact `+2002` post-merge artifact before the private signing boundary is crossed.

The old v1/v2/v3 bundles must not be used to sign `+2002`.
