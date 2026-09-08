# EV — Alpha.2 +2004 post-password physical failure

Date: 2026-09-08
Project: FinanceSensor
Observed candidate: `0.2.0-alpha.2+2004`
Evidence class: SANITIZED PHYSICAL OBSERVATION

## Observation

On the owned Android device, the connected FinanceSensor runtime reached the strict `BCP · SAVINGS` statement password dialog. The user entered the PDF password locally and selected `Abrir localmente`. The dialog closed normally; the previous Flutter controller/dialog lifecycle assertion was not observed. The application then returned to the fail-closed product surface with `La actualización financiera se detuvo de forma segura.`

No password, PDF, Gmail identifier, attachment identifier, access token, account number, financial plaintext, or user screenshot is committed by this receipt.

## What this proves

- The +2004 password-dialog lifecycle repair crossed the previously failing UI boundary on a physical device.
- The currently observed blocker is downstream of password submission.
- This observation does **not** identify whether the remaining rejection is attachment fetch, PDF open/decryption, strict parser review, persistence, or a later global runtime stage.

## Concrete call-path defect found

Inspection of the exact +2004 runtime found that `PlatformException` / fetch errors from `fetchStatementBytes` were not converted into candidate-local statement outcomes. They escaped `_importStatementCandidate` and were collapsed by the screen-level catch into the generic safe-stop message. PR #107 isolates this class of rejection as `FETCH_REJECTED`, preserves only allow-listed coarse codes, and prevents provider message/details from entering product state.

This is a real defect matching the observed symptom, but it is **not** claimed as the physically confirmed root cause until the successor candidate is exercised.

## Reopen decision

Runtime source changed to repair the statement call path. Under `SOURCE_OR_APK_IDENTITY_CHANGE_REOPENS_SIGNING_AND_OWNED_DEVICE_CAMPAIGN`, +2004 becomes historical for this campaign and must not donate signing or R2 physical PASS to its successor.

Next candidate: `0.2.0-alpha.2+2005`.

Current claims remain fail-closed:

```text
+2004_PHYSICAL_ALPHA2_PASS=NO
+2004_CONTINUATION=STOPPED
+2005_CANONICAL_REFREEZE=IN_PROGRESS
R1_TRUSTED_EDGE_SIGNING=REOPEN_AFTER_NEW_CANONICAL_APK
R2_PHYSICAL_CAMPAIGN=BLOCKED
BUILD_READY=NO
RELEASE_READY=NO
```
