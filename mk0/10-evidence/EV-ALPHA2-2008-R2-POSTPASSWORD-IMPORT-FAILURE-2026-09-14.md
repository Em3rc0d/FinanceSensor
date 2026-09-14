# EV-ALPHA2-2008-R2-POSTPASSWORD-IMPORT-FAILURE-2026-09-14

## Classification

- Candidate: `0.2.0-alpha.2+2008`
- Product source: `45b605d29fe0b90f528e4f0f952ab878080b2f0b`
- Stable signed APK SHA-256: `a6e9e9441842f9de78147d8bef0103c63c1ad5b499963303111dbb99dfcd5277`
- Stable signer SHA1: `63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0`
- Evidence class: `SANITIZED_OWNED_DEVICE_OBSERVATION`
- Observation date: `2026-09-14`

## Physical observation

The owned-device run reached the local statement-processing path on the stable-signed +2008 application. The application visibly reached all of the following public-safe states:

1. FinanceSensor launched to the disconnected landing surface.
2. The Gmail connection flow completed and the application returned to its connected surface.
3. A `BCP · SAVINGS` statement candidate was discovered and the local-only PDF-password prompt was presented.
4. After the local password interaction, the refresh stopped safely with the stable diagnostic code `ALPHA2_REFRESH_STATEMENT_IMPORT_FAILED`.
5. The financial dashboard was not produced for that refresh.

This observation is sufficient to classify +2008 as physically blocked downstream of statement discovery/password handoff. It is **not** sufficient to certify the complete R2 campaign, SQLCipher physical inspection, or release readiness.

## Root-cause boundary established from source review

The +2008 pipeline collapses any unexpected exception escaping a per-statement import into the refresh-fatal code `ALPHA2_REFRESH_STATEMENT_IMPORT_FAILED`. The per-candidate import path has several cleanup/runtime surfaces that can escape its expected sanitized outcomes, including PDF-document disposal, unexpected fetch/runtime exceptions, password-provider exceptions before byte-lifetime cleanup, and persistence exceptions outside the two explicitly handled Dart exception classes.

That behavior violates the intended isolation law: one statement that cannot be safely imported must become a candidate-local knowledge gap; it must not prevent already-safe local evidence from reaching the runtime/projection layer.

## Privacy / custody

The following were deliberately **not** committed:

- screenshots from the owned device;
- the PDF password or its length/value;
- raw PDF bytes or extracted text/geometry;
- Gmail message/attachment identifiers or contents;
- account identifiers, balances, transaction values, merchant samples, or other financial plaintext;
- OAuth tokens, signing material, keystore material, or device serial.

Only the coarse UI state sequence and the stable application diagnostic are retained.

## Governance consequence

`+2008` remains a valid historical physical observation but is blocked for continued Alpha.2 certification at the statement-import boundary. Any product-source remediation creates a new candidate identity and therefore reopens R1/R2; +2008 physical outcomes are non-inheritable by that new candidate.

`PHYSICAL_ALPHA2_PASS=NO`

`BUILD_READY=NO`

`RELEASE_READY=NO`
