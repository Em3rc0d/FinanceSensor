# EV-ALPHA2-2003-R2-PHYSICAL-RUNTIME-INCIDENT — 2026-09-08

Status: **PHYSICAL_RUNTIME_FAILURE / R2 +2003 CAMPAIGN INVALIDATED**

## Bound identity

```text
CANDIDATE=0.2.0-alpha.2+2003
SOURCE_COMMIT=c29a68e5326a187a7c82e6d66254ae05b6a4178a
SIGNED_APK_SHA256=7b30ff7d88d92b82729d1eac72c654884eafa4bcd0f9cbaef13a98d6fb18bbc6
SIGNED_APK_BYTES=182116902
SIGNER_SHA1=63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
ANDROID_PACKAGE=com.financesensor.lab.gmailconnection.r2
EXACT_SCOPE=gmail.readonly
```

## Sanitized physical observation

The stable-signed +2003 application was installed and reached the real statement-password UI on an owned Android device. Immediately after the user submitted the session-only PDF password, Flutter presented a framework assertion screen:

```text
package:flutter/src/widgets/framework.dart
InheritedElement.debugDeactivated
_dependents.isEmpty == false
```

The observation establishes a runtime defect in the statement-password dialog teardown path. It does **not** establish that the password was incorrect and it does **not** establish a parser result.

## Root-cause hypothesis promoted to code-level defect

At the observed source, `_requestStatementPassword` created a `TextEditingController` outside the dialog route and disposed it in a `finally` immediately when `showDialog` completed. A dialog result can complete before the reverse route transition has fully dismantled its widget tree. That creates an invalid resource/widget lifetime boundary during Overlay/DialogRoute teardown.

The repair moves password-input state into a dialog-owned widget lifetime and adds a regression that exercises result completion followed by the full route teardown. This evidence receipt does not claim physical remediation until a newly built and newly signed candidate passes the owned-device campaign.

## Evidence handling

- `RAW_SCREENSHOT_IN_GITHUB=0`
- `PDF_PASSWORD_IN_GITHUB=0`
- `RAW_STATEMENT_PDF_IN_GITHUB=0`
- `RAW_FINANCIAL_PLAINTEXT_IN_GITHUB=0`
- `GMAIL_IDENTIFIERS_IN_GITHUB=0`
- only the assertion class and coarse runtime stage are recorded.

## Gate interpretation

The incident proves that the application physically reached the statement-password surface after launch, but this receipt does not independently satisfy the exact evidence bundle required by OD0–OD3. No prior gate is promoted solely from navigation depth.

```text
R2_2003_PHYSICAL_CAMPAIGN=INVALIDATED
OD0=NOT_PROMOTED_FROM_INCIDENT_RECEIPT
OD1=NOT_PROMOTED_FROM_INCIDENT_RECEIPT
OD2=NOT_PROMOTED_FROM_INCIDENT_RECEIPT
OD3=NOT_PROMOTED_FROM_INCIDENT_RECEIPT
OD4=NO_PARSE_RESULT_RUNTIME_ABORT
OD5..OD11=NOT_EXECUTED
PHYSICAL_ALPHA2_PASS=NO
BUILD_READY=NO
RELEASE_READY=NO
```

## Reopen consequence

The fix changes source/APK identity. Under the frozen MK0 reopen law, a replacement candidate must:

1. receive a new candidate identity;
2. produce a new canonical APK hash;
3. reopen trusted-edge signing for that exact APK;
4. restart R2 from OD0 on one stable-signed hash.

Evidence from +2003 must never be mixed with the replacement candidate.
