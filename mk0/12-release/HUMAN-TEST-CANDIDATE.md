# FinanceSensor — Android Human Test Candidate

Candidate: `0.1.0-alpha.1+1001`  
Surface: owned-device Android engineering candidate  
Package: `com.financesensor.lab.gmailconnection.r2`

## Purpose

This is the first build intended to be handed to a human for product testing. It is deliberately narrower than an MK0 release candidate and does **not** promote production readiness.

The candidate answers one product question with real owned data:

> Can a user connect Gmail read-only, let FinanceSensor inspect a bounded recent sample locally, see conservative derived financial movements in the mobile product surface, and disconnect again without giving Flutter or public CI credential custody?

## Alpha.2 static context

The Alpha.2 financial-memory slices A through G have completed their bounded static implementation gates with exact-SHA CI receipts. That closure is repository engineering context only; this Human Test APK remains the narrower session-only mobile candidate described below and does not silently integrate or physically certify the Alpha.2 statement/vault/reconciliation/account-graph/monthly-coverage/Sensor runtime.

```text
STATIC_A_G_CERTIFIED=YES
ALPHA2_STATIC_SLICES=7/7
ALPHA2_MOBILE_INTEGRATION=OPEN
ALPHA2_PHYSICAL_PRODUCT_PASS=NO
```

Governing boundary:

```text
STATIC_A_G_CERTIFIED != ALPHA2_MOBILE_INTEGRATED
ALPHA2_MOBILE_INTEGRATED != ALPHA2_PHYSICAL_PRODUCT_PASS
HUMAN_TEST_APK_BUILD != GLOBAL_BUILD_READY
```

## Included

- Android Google Authorization with exact `gmail.readonly` scope.
- Short-lived bearer held only in native Android memory.
- Metadata-first Gmail scan, maximum 300 recent INBOX messages per run.
- FULL retrieval only after an exact known-bank transaction signature.
- Initial bounded adapters for BCP, Interbank and Banco Ripley notification shapes already covered by the evidence engine.
- Real derived movement list in Flutter for the active session.
- Explicit separation of purchases, transfers and card payments.
- Home/Sensor/Tú surfaces that state coverage limits instead of inventing a complete financial picture.
- Provider disconnect/revoke path and local disconnect barrier.
- No financial state persistence in this alpha.

## Explicitly not included

- Alpha.2 A-G mobile runtime integration.
- Historical completeness.
- Gmail background/incremental sync.
- Statement PDF ingestion inside the Android app.
- Encrypted local ledger persistence.
- Multi-device/E2EE sync.
- Production signer.
- iOS human-test build.
- A claim that the observed sample equals bank balance, total spending or complete financial truth.

## Privacy boundary

```text
EXACT_SCOPE=gmail.readonly
METADATA_FIRST=YES
MAX_RECENT_INBOX_MESSAGES=300
FULL_ONLY_FOR_STRONG_KNOWN_BANK_CANDIDATES=YES
SESSION_ONLY_FINANCIAL_STATE=YES
RAW_GMAIL_BODY_TO_FLUTTER=NO
RAW_GMAIL_BODY_PERSISTENCE=NO
DART_BEARER_CUSTODY=0
APP_REFRESH_TOKEN_CUSTODY=0
OFFLINE_ACCESS_REQUESTED=0
REAL_GMAIL_IN_PUBLIC_CI=0
```

## Signing boundary

Public CI is compile-only and uses an ephemeral debug certificate. Real Google OAuth on the owned device must use the already frozen `FINANCESENSOR_R2_LAB` stable signing identity at the trusted edge.

```text
PUBLIC_CI_SIGNER=COMPILE_ONLY_EPHEMERAL
TRUSTED_EDGE_RESIGN_REQUIRED=YES
PRODUCTION_SIGNER=NO
```

## State

`HUMAN_TEST_READY=YES` means **the bounded candidate contract and CI artifact are ready to cross into the owned-device human test once the artifact is re-signed with the stable lab identity**. It does not mean the production release gates are closed.

```text
HUMAN_TEST_READY=YES
BUILD_READY=NO
RELEASE_READY=NO
IOS_TOUCHED=0
```

Governing law remains:

```text
HUMAN_TEST_READY != BUILD_READY
GREEN_CI != RELEASE_READY
ENGINEERING_CANDIDATE != RELEASED_FINANCIAL_SYSTEM
```
