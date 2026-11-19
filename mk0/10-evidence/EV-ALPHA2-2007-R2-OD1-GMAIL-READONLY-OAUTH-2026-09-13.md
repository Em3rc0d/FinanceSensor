# EV — Alpha.2 +2007 R2 OD1 fresh Gmail readonly OAuth

Date: 2026-09-13

## Authority

- Candidate: `0.2.0-alpha.2+2007`
- Source commit: `8a4aa307b9b3328e67232c919a94994e80446331`
- Stable signed APK SHA256: `40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab`
- Stable signed APK bytes: `182145574`
- Signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- Android package: `com.financesensor.lab.gmailconnection.r2`
- Frozen Gmail scope contract: `gmail.readonly`

## Sanitized physical observation

On the owned Android phone, the same stable-signed +2007 candidate was explicitly disconnected. The application then exposed its disconnected state and `Conectar Gmail` entry point. A fresh Google account flow was completed and the application returned to its authenticated connected surface on the same installed candidate.

Immediately after the OAuth return, the local statement workflow advanced far enough to expose the session-only statement opening handoff for the allowed savings profile. That downstream handoff is recorded only as proof that control returned from Google to the authenticated application; it does **not** close OD2, OD3, or OD4.

The exact readonly scope and absence of offline-access request are frozen implementation contracts for this candidate and are validated by the static/mobile contract suite. The physical observation supplies the missing real-device OAuth execution/return evidence.

## Gate decision

`OD1 EXACT_GMAIL_READONLY_OAUTH = PASS`

Compound evidence:

- same stable-signed +2007 APK as OD0
- explicit disconnected state observed
- fresh Google OAuth/account flow executed on owned Android
- successful return to authenticated connected application state
- package remains `com.financesensor.lab.gmailconnection.r2`
- scope contract remains exactly `gmail.readonly`
- no offline-access request in the frozen authorization provider contract

## Non-claims

The later generic safe-stop surface is diagnostic only. It does not establish metadata-first ordering, bounded attachment fetch, strict statement parsing, SQLCipher persistence, reconciliation, account graph correctness, coverage, sensor projection, secret-custody closure, or replay idempotency.

Therefore:

- OD0 = PASS
- OD1 = PASS
- OD2 = READY_FOR_PHYSICAL
- OD3..OD11 = BLOCKED_BY_PRIOR_GATE
- Q-003/Q-004/Q-005 = ACTIVE
- G-MK0 = OPEN
- PHYSICAL_ALPHA2_PASS = NO
- BUILD_READY = NO
- RELEASE_READY = NO

## Evidence boundary

Raw screenshots are intentionally not committed. No token, Google identity, Gmail message/attachment identifier, statement file, statement-opening secret, account number, merchant-level sample, private signing material, or financial plaintext is stored in GitHub.
