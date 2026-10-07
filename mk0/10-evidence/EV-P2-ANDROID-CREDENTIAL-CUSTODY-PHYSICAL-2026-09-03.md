# EV-P2 — Android credential custody physical PASS

**Date:** 2026-09-03  
**Phase:** P2 — Mobile OAuth custody and local privacy  
**Sub-boundary:** Android  
**Claim:** `ANDROID_PROTECTED_OAUTH_CUSTODY`  
**Status:** PASS  
**P2 overall:** OPEN / iOS physical evidence required  
**Q-003/Q-004 closure:** NO  
**BUILD_READY:** NO

## Security property

Android P2 does not require FinanceSensor to invent a refresh-token vault. Under ADR-026 and ADR-028 the accepted Android property is stronger:

```text
APP-HELD REFRESH TOKEN                  NONE
OFFLINE ACCESS                          NOT REQUESTED
SHORT-LIVED BEARER                      KOTLIN PROCESS MEMORY ONLY
BEARER TO FLUTTER                       NO
ACCOUNT IDENTIFIER PERSISTENCE          NO
ORDINARY PERSISTED AUTH STATE           DISCONNECT BARRIER BOOLEAN ONLY
REAL GMAIL/OAUTH AUTHORITY IN CI        NO
```

Google Play Services owns provider authorization/token-cache behavior. FinanceSensor holds only transient short-lived authority required for the immediate Gmail request.

## Existing owned-device physical evidence

### R1 physical connection

The owned Android device physically demonstrated:

```text
REAL GOOGLE AUTHORIZATION               PASS
EXACT gmail.readonly                    PASS
GMAIL PROFILE                           PASS
APP_REFRESH_TOKEN_CUSTODY               NO
BEARER_TO_FLUTTER                       NO
```

The public R1 receipt deliberately recorded no account identity, token material or real Gmail content.

### R2 durable local disconnect

The owned-device R2 campaign physically demonstrated:

```text
LOCAL DISCONNECT                        PASS
DURABLE DISCONNECT BARRIER              PASS
APP REOPEN REMAINS DISCONNECTED         PASS
PASSIVE AUTO-RECONNECT                  NOT OBSERVED
EXPLICIT RECONNECT                      USER-ACTION ONLY
```

The stable R2 lifecycle run repeated the same local authority boundary using the frozen package/signing identity.

## Current implementation correlation

The current Kotlin bridge stores:

```text
shortLivedAccessToken: String?          MEMORY ONLY
android.accounts.Account                MEMORY ONLY
SharedPreferences                       gmail_disconnect_barrier BOOLEAN ONLY
```

It contains no offline-access request, no server auth-code path and no app refresh-token store. The account handle is not persisted and no token/account identifier is returned to Flutter.

## What this closes

```text
ANDROID_PROTECTED_OAUTH_CUSTODY         PASS
```

The Android interpretation is:

```text
NO APP-HELD LONG-LIVED GMAIL AUTHORITY
+
TRANSIENT NATIVE BEARER ONLY
+
FAIL-CLOSED LOCAL DISCONNECT BARRIER
=
ANDROID P2 CUSTODY PASS
```

## Supporting Android facts that do not yet close cross-platform P2 claims

The Android evidence also supports the Android side of:

```text
NO_TOKEN_PLAINTEXT_IN_ORDINARY_STORAGE
NO_TOKEN_GMAIL_FINANCIAL_PLAINTEXT_IN_LOGS
DISCONNECT_REMOVES_PROTECTED_CREDENTIAL
RESTORE_BEHAVIOR_DOCUMENTED
```

Those shared P2 claims are not promoted solely from Android evidence because iOS still requires its own physical execution. `RESTORE_BEHAVIOR_DOCUMENTED` is separately closed at the contract level by ADR-028 because both platform restore rules are now explicit.

## Provider revoke remains separate

This receipt does **not** claim Google provider revoke.

```text
ANDROID_P2_CUSTODY_PASS != GOOGLE_PROVIDER_REVOKE_PASS
```

The R2 old-bearer HTTP 401 criterion remains open under Q-003/P1.

## Sanitization boundary

No account identity, bearer, refresh authority, Gmail message content, provider response body, private signing material or financial plaintext is included in this public receipt.

## Governing result

```text
ANDROID P2 CREDENTIAL CUSTODY           PASS
IOS P2 CREDENTIAL CUSTODY               PHYSICAL OPEN
P2                                      PHYSICAL_EVIDENCE_REQUIRED
Q-003                                   ACTIVE
Q-004                                   ACTIVE
BUILD_READY                              NO
```
