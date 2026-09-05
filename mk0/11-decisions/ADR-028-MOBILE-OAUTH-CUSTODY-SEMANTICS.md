# ADR-028 — Mobile OAuth custody semantics

**Status:** ACCEPTED FOR P2 / ANDROID PHYSICAL EVIDENCE AVAILABLE / IOS PHYSICAL OPEN  
**Date:** 2026-09-03

## Context

P2 requires `ANDROID_PROTECTED_OAUTH_CUSTODY`, `IOS_PROTECTED_OAUTH_CUSTODY`, ordinary-storage/log secrecy, credential destruction on disconnect and documented restore behavior.

The earlier mobile stack wording could be misread as requiring FinanceSensor itself to persist a refresh token in a native vault on every platform. That is not the intended security property. The property is that long-lived Gmail authority must never be placed in Flutter, ordinary app storage, logs, public evidence or FinanceSensor cloud custody.

The safest platform implementation may therefore be **no app-held long-lived credential at all** when the provider SDK owns that authority.

## Decision

```text
P2 PROTECTED CUSTODY
=
NO LONG-LIVED GMAIL AUTHORITY IN FLUTTER
+
NO LONG-LIVED GMAIL AUTHORITY IN ORDINARY APP STORAGE
+
PLATFORM/PROVIDER PROTECTED AUTHORITY ONLY
+
SHORT-LIVED BEARER NATIVE/TRANSIENT ONLY
+
FAIL-CLOSED DISCONNECT + RESTORE BARRIER
```

### Android

Android uses Google Identity Services `AuthorizationClient` under ADR-026.

```text
ANDROID APP-HELD REFRESH TOKEN       NONE
ANDROID OFFLINE ACCESS               FORBIDDEN
DURABLE TOKEN IN DART                FORBIDDEN
DURABLE TOKEN IN APP FILES           FORBIDDEN
SHORT-LIVED BEARER                   KOTLIN PROCESS MEMORY ONLY
BEARER TO FLUTTER                    FORBIDDEN
PROVIDER AUTHORITY/CACHE             GOOGLE PLAY SERVICES
ORDINARY PERSISTED APP STATE         DISCONNECT BARRIER BOOLEAN ONLY
```

For Android P2, **absence of app-held long-lived Gmail authority is stronger than creating an app-owned refresh-token vault**.

```text
NO_REFRESH_TOKEN > PROTECTED_REFRESH_TOKEN
```

The Android custody claim does not depend on provider revoke being physically proven. Provider revoke remains a separate Q-003/P1 requirement. P2 Android custody asks whether FinanceSensor itself safely owns or avoids owning credentials; P1 asks whether Google-side authority is actually revoked.

### iOS

FinanceSensor selects the official Google Sign-In SDK for the iOS Gmail authorization boundary.

Current Google documentation states that:

- `restorePreviousSignIn` restores previously saved sign-in state;
- `signOut()` removes the user's credentials for the app from Keychain;
- `disconnect()` signs the user out, disconnects the account and revokes tokens;
- `refreshTokensIfNeeded` obtains fresh tokens through the SDK;
- additional Google API scopes such as Gmail are requested through the SDK's additional-scope flow.

FinanceSensor therefore MUST NOT build a second token store around the Google SDK.

```text
IOS GOOGLE AUTHORITY                 GOOGLE SIGN-IN SDK
IOS SDK DURABLE CREDENTIAL STATE     KEYCHAIN-MANAGED BY SDK
FINANCESENSOR TOKEN DUPLICATION      FORBIDDEN
TOKEN IN USERDEFAULTS                FORBIDDEN
TOKEN IN FLUTTER                     FORBIDDEN
SHORT-LIVED ACCESS TOKEN             SWIFT TRANSIENT USE ONLY
DISCONNECT                           BARRIER FIRST, THEN GIDSignIn.disconnect
RESTORE                              ONLY WHEN LOCAL BARRIER IS INACTIVE
```

The physical iOS test must verify this behavior on an owned iPhone. Static Swift source or CI alone cannot promote `IOS_PROTECTED_OAUTH_CUSTODY` to PASS.

## Shared disconnect semantics

The local disconnect barrier is authoritative before provider work on both platforms:

```text
USER DISCONNECT
    ↓
LOCAL BARRIER = ACTIVE
    ↓
TRANSIENT APP TOKEN AUTHORITY CLEARED
    ↓
PROVIDER/SDK DISCONNECT OR REVOKE
    ↓
APP REMAINS LOCALLY DISCONNECTED EVEN IF PROVIDER STEP FAILS
```

This prevents passive restore from silently overriding user intent.

## Shared restore semantics

```text
BARRIER ACTIVE
→ DO NOT RESTORE PROVIDER SESSION
→ DISCONNECTED

BARRIER INACTIVE
→ platform-supported restore may run
→ provider scope/token must be validated
→ Gmail provider success still required before CONNECTED
```

Therefore `RESTORE_BEHAVIOR_DOCUMENTED` can be closed at the contract level while iOS physical execution remains open.

## P2 claim partition

```text
ANDROID_PROTECTED_OAUTH_CUSTODY                 PHYSICAL RECEIPT AVAILABLE
IOS_PROTECTED_OAUTH_CUSTODY                     PHYSICAL OPEN
NO_TOKEN_PLAINTEXT_IN_ORDINARY_STORAGE          CROSS-PLATFORM PHYSICAL OPEN
NO_TOKEN_GMAIL_FINANCIAL_PLAINTEXT_IN_LOGS      CROSS-PLATFORM PHYSICAL OPEN
DISCONNECT_REMOVES_PROTECTED_CREDENTIAL          CROSS-PLATFORM PHYSICAL OPEN
RESTORE_BEHAVIOR_DOCUMENTED                     CONTRACT PASS
```

P2 itself remains `PHYSICAL_EVIDENCE_REQUIRED` until every required claim has evidence.

## Physical iOS acceptance packet

An owned iPhone run must eventually demonstrate at minimum:

```text
EXACT gmail.readonly SCOPE                      PASS
GOOGLE SIGN-IN AUTHORIZATION                    PASS
GMAIL PROFILE                                   HTTP 2xx
TOKEN TO FLUTTER                                ABSENT
TOKEN IN USERDEFAULTS/ORDINARY FILES            ABSENT
TOKEN/GMAIL PLAINTEXT IN APP LOGS               ABSENT
DISCONNECT BARRIER                              ACTIVE BEFORE SDK DISCONNECT
GIDSignIn.disconnect                            SUCCESS OR FAIL-CLOSED LOCAL STATE
RESTORE WHILE BARRIER ACTIVE                    DENIED LOCALLY
RESTORE AFTER EXPLICIT RECONNECT                VALIDATED
KEYCHAIN CREDENTIAL REMOVAL AFTER DISCONNECT    PHYSICALLY VERIFIED
```

## CI boundary

Public CI may statically inspect the Android/Swift bridges and run secret-flow guards. It may not use a real Google account, real Gmail data, bearer material or device Keychain contents and therefore cannot claim iOS physical custody PASS.

## Governing laws

```text
PROTECTED_CUSTODY != APP_MUST_STORE_REFRESH_TOKEN
NO_APP_HELD_LONG_LIVED_AUTHORITY > NEW_TOKEN_VAULT
FLUTTER_UI != CREDENTIAL_VAULT
USERDEFAULTS != TOKEN_STORE
BARRIER_FIRST > PROVIDER_RESULT_FIRST
ANDROID_P2_CUSTODY_PASS != PROVIDER_REVOKE_PASS
IOS_STATIC_READY != IOS_PHYSICAL_PASS
P2_PARTIAL_PASS != P2_PASS
P2_PASS != Q003_CLOSED
P2_PASS != Q004_CLOSED
```

## External anchors reviewed

Reviewed on 2026-09-03:

- https://developers.google.com/identity/sign-in/ios/sign-in
- https://developers.google.com/identity/sign-in/ios/disconnect
- https://developers.google.com/identity/sign-in/ios/api-access
- https://developers.google.com/identity/sign-in/ios/release

Release-time SDK behavior must be revalidated before shipping.

## Reconciliation

This ADR refines ADR-009 and ADR-017 and preserves ADR-026/ADR-027. Any earlier phrase requiring protected mobile refresh-token storage is interpreted as **protected long-lived authorization custody if such authority is app-visible**. Android's accepted ordinary path deliberately has no app-held refresh token.