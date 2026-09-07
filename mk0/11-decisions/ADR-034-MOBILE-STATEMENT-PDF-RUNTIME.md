# ADR-034 — Mobile statement PDF runtime

**Status:** ACCEPTED FOR MOBILE STATIC SPIKE / PHYSICAL DEVICE VALIDATION REQUIRED  
**Date:** 2026-09-03

## Context

FinanceSensor is a mobile-first Flutter product under ADR-009. ADR-033 introduced password-protected bank-statement ingestion but the first executable parser harness was intentionally Windows-only evidence infrastructure.

The product now needs a mobile PDF runtime that can:

- open encrypted/password-protected PDFs from in-memory bytes;
- extract text locally without a server;
- support Android and iOS;
- avoid a commercial runtime dependency for the core statement parser;
- fit the pinned Flutter 3.44.7 / Dart 3.12.2 toolchain;
- keep raw PDF bytes, decrypted text and password outside cloud/GitHub persistence.

## Decision

For the **mobile static spike**, FinanceSensor selects:

```text
MOBILE_PDF_RUNTIME             pdfrx 2.4.8
UNDERLYING_ENGINE              PDFium
LICENSE                        MIT
FLUTTER_TOOLCHAIN              3.44.7
DART_BASELINE                  3.12.2
INPUT                          Uint8List in device memory
PASSWORD                       ephemeral local operation only
TEXT_EXTRACTION                PdfPage.loadText()
NETWORK_FOR_STATEMENT_PARSE    forbidden
PRODUCT_TARGET                 Android first; iOS required
```

`pdfrx 2.4.8` is exact-pinned for this spike. Its API exposes in-memory PDF opening with a password provider, per-page text extraction and document disposal while remaining compatible with the existing FinanceSensor Flutter baseline.

### Rejected candidate: pdfrx 2.5.0

The first candidate was `pdfrx 2.5.0`. The real FinanceSensor PR CI under Flutter 3.44.7 rejected it during dependency solving because pdfrx 2.5.0 requires Flutter >=3.47.0.

FinanceSensor therefore rejects this promotion:

```text
DEPENDENCY_CONFLICT != SILENT_FRAMEWORK_UPGRADE_AUTHORITY
PDF_LIBRARY_LATEST != PRODUCT_STACK_BASELINE_OVERRIDE
```

The correct response is to select the latest compatible runtime that preserves the already-frozen mobile stack. `pdfrx 2.4.8` is that bounded candidate. Upgrading Flutter remains a separate architectural/toolchain decision and is not smuggled into a PDF feature.

This is a **technology selection for validation**, not a physical production claim.

## Product flow

```text
Gmail attachment / user-selected local statement
        ↓
Uint8List on mobile device
        ↓
Clave del PDF · local operation
        ↓
pdfrx / PDFium openData
        ↓
page text extraction
        ↓
statement parser
        ↓
derived financial evidence
        ↓
canonical resolver
        ↓
release text + dispose document + zero owned PDF working buffer
```

## Secret-memory truth boundary

The statement password is short-lived and materially different from a long-lived OAuth refresh token or private key. It may exist transiently in Flutter/Dart memory for the local import operation.

FinanceSensor guarantees for this spike:

```text
PASSWORD_PERSISTED             NO
PASSWORD_LOGGED                NO
PASSWORD_CLOUD                 NO
PASSWORD_GITHUB                NO
PASSWORD_ANALYTICS             NO
PASSWORD_AUTOFILL_PERSISTENCE  NO
```

FinanceSensor does **not** claim deterministic password-memory zeroization in Dart:

```text
DART_STRING_RELEASED != CRYPTOGRAPHIC_MEMORY_ZEROIZATION
PASSWORD_REFERENCE_DROPPED != PASSWORD_BYTES_PROVEN_WIPED
```

Dart strings are managed/immutable objects and the runtime may retain memory until garbage collection. Therefore no validator or receipt may claim `PASSWORD_MEMORY_WIPED=PASS` from Dart-level behavior alone.

Owned mutable PDF byte buffers are different: FinanceSensor can zero its own `Uint8List` working copy after document disposal and should do so.

If future threat modeling requires deterministic secret-memory erasure for the PDF password itself, the password prompt/parser boundary must move behind a native Kotlin/Swift bridge or another zeroizable native-memory mechanism. That is not currently claimed necessary for MK0.

## Why not Syncfusion as the default core parser

Syncfusion supports encrypted PDFs and text extraction, but its Flutter components are governed by commercial/community licensing terms. FinanceSensor does not need that dependency for the core statement-ingress spike when an MIT/PDFium path satisfies the required technical surface.

This does not prohibit Syncfusion for future UI features if independently justified.

## Why not the Windows PDF.js harness

The Windows PDF.js runner remains useful evidence infrastructure, but:

```text
WINDOWS_HARNESS != MOBILE_PRODUCT_RUNTIME
DESKTOP_PARSE_PASS != ANDROID_PARSE_PASS
DESKTOP_PARSE_PASS != IOS_PARSE_PASS
```

No Windows dependency enters the mobile product architecture.

## Evidence required before promotion

1. exact `pdfrx 2.4.8` dependency resolution under Flutter 3.44.7;
2. committed reproducible `pubspec.lock` produced by that same toolchain;
3. Flutter analyze/test PASS;
4. Android debug APK build with pdfrx linked;
5. synthetic mobile import-session tests proving no password/plaintext enters returned durable evidence;
6. synthetic encrypted PDF opened and text extracted on an Android runtime;
7. wrong-password failure remains sanitized and fail-closed;
8. owned Android device real-statement parse without password/raw plaintext persistence;
9. later iOS compile and owned-device proof before cross-platform production promotion.

Until those are complete:

```text
MOBILE_STATEMENT_STATIC_READY != MOBILE_STATEMENT_PHYSICAL_PASS
ANDROID_APK_BUILD_PASS != REAL_STATEMENT_PARSE_PASS
PDFRX_SELECTED != BUILD_READY
```

## Build authority

`BUILD_READY=false` remains unchanged. This ADR does not close Q-003, Q-004 or Q-005 and does not waive deferred iPhone debt.
