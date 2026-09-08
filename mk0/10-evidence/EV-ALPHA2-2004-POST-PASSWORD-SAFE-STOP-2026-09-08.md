# EV — Alpha.2 +2004 post-password safe-stop observation

Date: 2026-09-08
Project: FinanceSensor
Candidate: `0.2.0-alpha.2+2004`
Canonical input APK SHA256: `14d8134bd6686291155d411e8938af632f1bba0d6ba1b94b5f86b35b13fbc1c1`
Evidence class: SANITIZED OWNED-DEVICE OBSERVATION / RUNTIME REPAIR TRIGGER

## Physical observation

On an owned Android device, the Alpha.2 runtime reached the `BCP · SAVINGS` session-only PDF password dialog. Submitting the password closed the dialog without the prior Flutter route-teardown assertion, after which the application returned to the financial home surface and reported only:

`La actualización financiera se detuvo de forma segura.`

The screenshots used to diagnose the behavior are deliberately **not committed**. No password value, Gmail message/attachment identifier, OAuth token, PDF bytes, statement plaintext, account number, merchant-level physical sample, keystore, private key, or user financial screenshot enters GitHub.

## What this observation proves

- The password dialog lifecycle repair from the prior candidate is exercised far enough for the modal to accept submission and close normally.
- The failure occurs after password submission somewhere in the remaining financial refresh orchestration.
- The existing UI collapses downstream failures into one generic safe-stop message.

## What this observation does not prove

- It does **not** prove the supplied password was incorrect.
- It does **not** prove that PDF decryption succeeded.
- It does **not** prove or fail OD4 `BCP_SAVINGS_STRICT_PARSE_OR_FAIL_CLOSED`.
- It does **not** prove SQLCipher persistence, reconciliation, account ownership, monthly coverage, Sensor projection, disconnect custody, replay, BUILD_READY, or RELEASE_READY.
- It does **not** authorize continuation of a physical campaign after runtime source changes.

## Repository diagnosis

The Alpha.2 pipeline previously treated only `Alpha2StatementPdfException` as a statement-local rejected outcome. Native attachment/fetch failures and non-PDF orchestration failures could escape the candidate import, abort `refresh()`, and then be reduced by the Flutter home screen to the same generic catch-all text. That made a valid fail-closed stop operationally opaque and prevented distinguishing an attachment/fetch rejection from a vault, strict-parser, canonical-runtime, product-gate, projection, session, or temporary-handle cleanup failure.

## Repair contract

The repair introduced by PR #106 preserves the strict boundary while making it diagnosable:

1. Expected per-statement fetch/attachment failures are isolated to that candidate as `FETCH_REJECTED`; one rejected attachment cannot silently become a whole-refresh crash.
2. `REAUTH_REQUIRED` remains systemic and becomes a stable privacy-safe `A2_SESSION_REAUTH_REQUIRED` code.
3. Vault, strict-parser, runtime, product-gate, projection, password-provider, ingress, and temporary-handle cleanup failures receive stable stage codes only. Raw exception text and raw identifiers are forbidden from the user-visible diagnostic path.
4. The BCP Savings strict adapter remains the only physical fetch-enabled statement parser. BCP Credit and Ripley remain quarantined; no generic fallback parser is introduced.
5. A BCP Savings PDF password may be reused only in memory, only for the same profile, and only for the lifetime of one explicit refresh. The broker is cleared when the refresh ends. No persistence or Dart String zeroization claim is made.
6. Opaque statement handles are released on cancel, fetch completion, PDF handling, and password-provider failure paths.
7. PDF byte buffers owned by the Dart pipeline retain their explicit zero-after-use behavior.

## Candidate consequence

Once this runtime repair is merged, the frozen source/APK identity law applies. Candidate `+2004` and any observations made on its signed hash become historical and MUST NOT be combined with a repaired candidate's physical campaign.

The next physical candidate must therefore be a new candidate (`+2005` or later), receive a new canonical source SHA and APK hash/bytes, receive a fresh trusted-edge signature/receipt, and restart the OD0→OD11 campaign using one exact signed APK hash.

Current authority remains:

```text
+2004 PHYSICAL OBSERVATION        HISTORICAL / INCOMPLETE
OD4                              NOT EVALUATED
PHYSICAL_ALPHA2_PASS              NO
Q-003 / Q-004 / Q-005             ACTIVE
G-MK0                             OPEN
BUILD_READY                       NO
RELEASE_READY                     NO
```
