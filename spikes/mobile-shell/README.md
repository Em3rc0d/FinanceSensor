# FinanceSensor Flutter Mobile Shell

This directory contains the first **real Flutter application shell** for FinanceSensor.

It exists to validate that the mobile-first product surface can compile, render and behave like an Android application before FinanceSensor is allowed to consume real Gmail/OAuth or real financial data.

## Status

```text
SURFACE                FLUTTER MOBILE APP SHELL
PRIMARY TARGET         ANDROID DEBUG APK
DATA                   100% SYNTHETIC
NETWORK                FORBIDDEN
GOOGLE OAUTH           FORBIDDEN
REAL GMAIL             FORBIDDEN
REAL FINANCIAL DATA    FORBIDDEN
PRODUCTION CRYPTO      NOT CLAIMED
BUILD_READY            NO
```

## What this shell tests

- Flutter/Dart product stack from ADR-009;
- Android-first navigation and information hierarchy;
- mobile BI visual density;
- no-scroll Home target;
- compact cash-flow visualization;
- spending composition;
- budget progress;
- Financial Sensor prominence;
- movement search and detail;
- Needs Review / Opportunity / Change interactions;
- bottom-sheet drill-down;
- compact viewport rendering.

## What this shell does not test

It does not execute or prove:

- Gmail authorization;
- refresh-token custody;
- Android Keystore/StrongBox behavior;
- iOS Keychain/Secure Enclave behavior;
- encrypted production SQLite;
- E2EE interoperability;
- witness deployment;
- recovery;
- cloud sync;
- provider verification.

Those remain governed by Q-003/Q-004/Q-005 and the physical campaign.

## Build policy

The first CI artifact is intentionally a **debug APK**.

```text
MOBILE_SHELL != PRODUCTION_APP
DEBUG_APK != RELEASE
SYNTHETIC_DATA != FINANCIAL_EVIDENCE
APK_BUILD_PASS != BUILD_READY
```

No signing secret, API key, OAuth credential or user data is required to build this shell.

## Security boundary

The shell contains no network client dependency and no real platform-security implementation.

When production mobile work begins, security-sensitive authority follows ADR-009:

```text
Flutter/Dart
  → product UI / deterministic application logic

Kotlin / Swift native bridge
  → OAuth credential custody
  → protected device-key operations
```

Long-lived OAuth authority and private keys must never be moved into Dart as a compatibility fallback.

## Local development

The repository intentionally does not commit generated Android/iOS project scaffolding for this spike. CI materializes the Android scaffold with the pinned Flutter toolchain before analysis, tests and APK build.

The committed source of truth is:

- `pubspec.yaml`
- `lib/main.dart`
- `test/widget_test.dart`
- this contract

## Gate discipline

A successful APK proves only:

> the synthetic FinanceSensor mobile shell can be compiled and rendered using the selected Flutter stack.

It cannot change:

```text
Q-003 ACTIVE
Q-004 ACTIVE
Q-005 ACTIVE
BUILD_READY NO
PR #1 DO NOT MERGE
```
