# EV — Alpha.2 +2007 R2 OD0 install + launch — 2026-09-12

## Authority

- Candidate: `0.2.0-alpha.2+2007`
- Source commit: `8a4aa307b9b3328e67232c919a94994e80446331`
- Stable signed APK SHA-256: `40a275755d5ee4fad54ad29ae176d6140d111bf0655b06d48ad72d6c75ca63ab`
- Stable signed APK bytes: `182145574`
- Signer SHA-1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- Android package: `com.financesensor.lab.gmailconnection.r2`
- Exact Gmail scope contract: `gmail.readonly`

## Physical observation

The exact stable-signed +2007 APK was installed and launched on an owned Android phone. The app first rendered its loading shell and then reached an interactive application state with the refresh and disconnect controls enabled.

A later refresh attempt surfaced the generic fail-closed UI message that the financial update stopped safely. That observation is retained only as a downstream diagnostic clue; it is **not** used to claim OD1 or any later R2 subgate.

Therefore:

- `OD0 SIGNED_APK_INSTALL_AND_LAUNCH = PASS`
- `OD1 EXACT_GMAIL_READONLY_OAUTH = READY_FOR_PHYSICAL`
- `OD2..OD11 = BLOCKED_BY_PRIOR_GATE`

## Sanitization boundary

Raw screenshots are intentionally not committed. No OAuth bearer material, Gmail identifiers or content, statement files, account identifiers, merchant-level samples, private signing material, or financial plaintext are stored in GitHub evidence.

Sanitized machine receipt: `graph/physical-receipts/ALPHA2-R2-OWNED-ANDROID-OD0-2026-09-12.json`.

## Non-promotion law

This OD0 pass does not close Q-003, Q-004 or Q-005; does not close G-MK0; does not establish physical SQLCipher PASS; and does not promote BUILD_READY or RELEASE_READY.
