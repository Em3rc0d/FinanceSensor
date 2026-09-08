# EV — Alpha.2 +2005 password-prompt fan-out physical observation

Date: 2026-09-08
Project: FinanceSensor
Observed candidate: `0.2.0-alpha.2+2005`
Evidence class: SANITIZED PHYSICAL OBSERVATION

## Observation

On the owned Android device, the exact stable-signed +2005 candidate installed and launched successfully. The real Google authorization flow reached the connected FinanceSensor product surface, and statement discovery reached the session-only `BCP · SAVINGS` password handoff.

The user entered the PDF password locally and selected `Abrir localmente`. An indistinguishable `BCP · SAVINGS` password dialog then appeared again, and the same behavior repeated. The user eventually selected `Ahora no`; the refresh then completed on the fail-closed product surface with a partial projection, observed Gmail evidence, no imported statement, and quarantined profiles still visible.

No password, raw statement PDF, Gmail identifier, attachment identifier, OAuth token, account identifier, financial plaintext, merchant-level physical sample, amount, or screenshot is committed by this receipt.

## What this proves

- The stable-signed +2005 APK crossed install and launch on the owned device.
- The stable signer/package configuration crossed the real Google authorization boundary and reached a connected session.
- The owned-device flow reached BCP Savings statement discovery and the session-only password handoff.
- The full statement import path did **not** complete; OD3/OD4 and all later R2 gates remain open.
- Choosing `Ahora no` did not fabricate a statement import, reconciliation, or complete monthly state.

This observation does **not** prove that the submitted PDF password was correct or incorrect, and it does not identify PDF decryption or strict parsing as the remaining root cause.

## Concrete defects found on the exact +2005 source

Inspection of the exact +2005 call path found two product defects consistent with the physical result:

1. `Alpha2Pipeline.refresh` invoked the password provider independently for each strong BCP Savings statement candidate. A scan containing multiple eligible statements could therefore present visually identical password dialogs repeatedly even though the user had already supplied session-only authority.
2. The dashboard counted only `REVIEW_REQUIRED` as `EECC a revisar`, hiding `PASSWORD_REQUIRED`, `FETCH_REJECTED`, and `PDF_REJECTED` outcomes behind a misleading zero.

PR #111 repairs both defects by caching the password transiently per profile for one refresh (including the `Ahora no` decision) and by counting all fail-closed eligible-statement outcomes as review attention. The transient value is not persisted, synchronized, logged, or committed. Dart `String` zeroization is not claimed.

## R2 interpretation

Historical +2005 physical evidence supports the following observations for the exact +2005 stable-signed APK only:

```text
+2005_OD0_SIGNED_APK_INSTALL_AND_LAUNCH=PASS
+2005_OD1_EXACT_GMAIL_READONLY_OAUTH=PASS
+2005_OD2_METADATA_FIRST_STATEMENT_DISCOVERY=PASS
+2005_OD3_BOUNDED_FETCH_ONLY_FOR_ALLOWED_PROFILE=OPEN
+2005_OD4_BCP_SAVINGS_STRICT_PARSE_OR_FAIL_CLOSED=OPEN
+2005_PHYSICAL_SQLCIPHER_PASS=NO
+2005_PHYSICAL_ALPHA2_PASS=NO
```

No physical PASS is inherited by a successor APK.

## Reopen decision

PR #111 changed runtime source. Under `SOURCE_OR_APK_IDENTITY_CHANGE_REOPENS_SIGNING_AND_OWNED_DEVICE_CAMPAIGN`, the +2005 R2 continuation stops here. Its successful early-gate observations remain historical diagnostic evidence only.

```text
+2005_CONTINUATION=STOPPED_SOURCE_REPAIR
+2006_CANONICAL_REFREEZE=IN_PROGRESS
R1_TRUSTED_EDGE_SIGNING=REOPEN_AFTER_NEW_CANONICAL_APK
R2_PHYSICAL_CAMPAIGN=BLOCKED
Q003_Q004_Q005=ACTIVE
G_MK0=OPEN
BUILD_READY=NO
RELEASE_READY=NO
```
