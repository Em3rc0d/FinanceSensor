# EV — Alpha.2 +2003 EECC password-dialog physical failure

Date: 2026-09-08
Project: FinanceSensor
Candidate: `0.2.0-alpha.2+2003`
Stable-signed APK SHA256: `7b30ff7d88d92b82729d1eac72c654884eafa4bcd0f9cbaef13a98d6fb18bbc6`
Stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
Evidence class: SANITIZED OWNED-DEVICE OBSERVATION

## Observation

The stable-signed +2003 APK installed and launched on an owned Android device and progressed through the real local EECC flow up to the session-only PDF password dialog. Submitting the password produced a Flutter framework assertion during dialog teardown:

`_dependents.isEmpty` was not true.

No password value, raw PDF, Gmail identifier, token, financial plaintext, account number, or screenshot is committed to GitHub.

## Interpretation

This is a runtime lifecycle failure. It is **not** evidence that the supplied EECC password was incorrect and it is **not** an OD4 parser PASS/FAIL determination.

Repository diagnosis found that `TextEditingController` ownership outlived the safe dialog teardown ordering: the controller was cleared/disposed immediately after `showDialog()` returned while route dependents could still be dismantling. PR #103 moves controller custody into the dialog State and adds submit/cancel teardown regressions.

## Physical campaign consequence

The +2003 R2 campaign is stopped. Physical evidence from its stable-signed hash MUST NOT be combined with a repaired runtime candidate.

- `+2003 R1 trusted-edge signing`: HISTORICAL PASS
- `+2003 R2 physical campaign`: STOPPED / INVALIDATED FOR CONTINUATION
- OD4: NOT EVALUATED
- PHYSICAL_ALPHA2_PASS: NO
- BUILD_READY: NO
- RELEASE_READY: NO

The frozen candidate-identity reopen law applies because the runtime source and resulting APK change. A repaired candidate must receive a new candidate ID, canonical source SHA, canonical APK hash/bytes, trusted-edge signing receipt, and a fresh OD0→OD11 campaign on one exact signed APK hash.

## Repair certification

PR #103 head: `64549aaac657d001266cb9b0415826abb3465a07`
Merge SHA: `9da8101e2baf437e56235c6d4d254a3db521e563`

PR validation:
- FinanceSensor Mobile Shell run `34237708831`: SUCCESS
- Alpha.2 Integrated Runtime run `34237708863`: SUCCESS

Post-merge exact SHA validation:
- Alpha.2 Integrated Runtime run `34239131327`: SUCCESS
- FinanceSensor Mobile Shell run `34239131413`: SUCCESS
- FinanceSensor Heartbeat vital-signs: SUCCESS

The repaired runtime is therefore eligible to be cut as a new candidate, but this receipt does not itself certify the new APK or any physical gate.
