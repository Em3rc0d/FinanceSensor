# ADR-026 — Android Google Authorization boundary

**Status:** ACCEPTED FOR PHYSICAL VALIDATION / PARTIAL PHYSICAL EVIDENCE / REVOKE RETEST REQUIRED  
**Date:** 2026-09-02

## Context

FinanceSensor uses Google Identity Services `AuthorizationClient` on Android for device-local Gmail access. The product does not need server-side Gmail execution for MK0, so ordinary Android authorization must not introduce offline access, server authorization codes or an app-held refresh token.

R1 physically proved real `gmail.readonly` authorization, Gmail profile reachability and a Gmail history anchor, but exposed a lifecycle defect: a user disconnect could later be undone by passive state observation. R2 added a durable local disconnect barrier and physically proved that the application remains disconnected across reopen/state refresh.

R2 then exposed a second ambiguity. A later explicit `Connect Gmail` action could receive an authorization result without showing fresh consent UI. Official Google OAuth documentation explains why this can be valid: OAuth approvals are shared across client IDs in the same Google Cloud project for the same logical application and scope. FinanceSensor DEV currently has multiple clients in the same project. Therefore **fresh consent UI is not a valid universal post-revoke oracle**.

At the same time, Google documents `AuthorizationClient.revokeAccess()` as revoking access given to the current application. FinanceSensor therefore needs a provider-side property that can be measured directly rather than inferred from whether a consent screen appeared.

The selected physical proof is: **after `revokeAccess()`, the exact short-lived bearer that previously reached Gmail must no longer reach the Gmail profile endpoint**.

## Decision

```text
ANDROID_AUTHORIZATION_PROVIDER     = GOOGLE_AUTHORIZATION_CLIENT
ANDROID_SCOPE                      = gmail.readonly
ANDROID_OFFLINE_ACCESS             = REJECTED
ANDROID_APP_REFRESH_TOKEN_CUSTODY  = NONE
SHORT_LIVED_BEARER_TO_FLUTTER      = FORBIDDEN
PACKAGE_PLUS_SHA1_BINDING          = REQUIRED
DURABLE_DISCONNECT_BARRIER         = REQUIRED
POST_REVOKE_OLD_BEARER_DENIAL      = REQUIRED
EXPLICIT_RECONNECT_GRANT_REUSE     = ALLOWED
PASSIVE_RECONNECT                  = FORBIDDEN
PHYSICAL_TEST_PACKAGE              = com.financesensor.lab.gmailconnection.r2
STABLE_LAB_SIGNING_IDENTITY        = REQUIRED_FOR_ITERATION
```

### 1. Android authorization path

```text
User taps Connect Gmail
        ↓
Flutter sends intent only
        ↓
Kotlin PlatformCredentialBroker
        ↓
Google AuthorizationClient.authorize()
        ↓
provider resolution UI if required
OR existing project-level grant if Google allows it
        ↓
short-lived access token in native process memory
        ↓
Gmail users/me/profile
        ↓
CONNECTED only after Gmail HTTP 2xx
        ↓
coarse state only to Flutter
```

A Google authorization result alone is not a FinanceSensor connection. Gmail must be physically reachable.

```text
OAUTH_AUTHORIZED != GMAIL_CONNECTED
```

### 2. No offline access

FinanceSensor Android MUST NOT call or rely on:

```text
requestOfflineAccess(...)
getServerAuthCode()
serverAuthCode
```

for the ordinary local Gmail path.

```text
DEVICE_LOCAL_GMAIL_PLANE
+
NO_SERVER_GMAIL_EXECUTION
=>
NO_PRODUCT_NEED_FOR_SERVER_REFRESH_AUTHORITY
```

If a future feature requires server-side Gmail execution, it requires a new ADR and privacy review.

### 3. Credential custody

Google Play Services owns provider authorization/token-cache behavior. FinanceSensor may hold a short-lived access token only in Kotlin process memory while making an authorized request.

```text
DURABLE REFRESH TOKEN IN DART       FORBIDDEN
DURABLE REFRESH TOKEN IN APP FILES  FORBIDDEN
SHORT TOKEN IN FLUTTER              FORBIDDEN
SHORT TOKEN IN LOGS                 FORBIDDEN
SHORT TOKEN IN PUBLIC EVIDENCE      FORBIDDEN
SHORT TOKEN IN CLOUD CONTROL PLANE  FORBIDDEN
```

The only connection state permitted to persist in this spike is a non-secret boolean disconnect barrier. Account identifiers, OAuth authority and Gmail content are not written into that store.

### 4. Gmail connection proof

The Android connection probe remains deliberately narrow:

```text
AuthorizationClient
        ↓ exact gmail.readonly
Gmail users/me/profile
        ↓
profile reachable
history anchor observed
aggregate message/thread counts
latency + response byte count
```

The bridge does not return account email, raw provider bodies, message identifiers, subjects, snippets, bodies or bearer tokens to Flutter.

### 5. Disconnect is locally authoritative

User-requested disconnect is first and foremost a **local authority-destruction command**.

```text
USER TAPS DISCONNECT
        ↓
DURABLE LOCAL DISCONNECT BARRIER = ACTIVE
        ↓
passive getGmailState/probe cannot authorize
        ↓
AuthorizationClient.revokeAccess(account, gmail.readonly)
        ↓
probe Gmail profile WITH THE PREVIOUS BEARER
        ↓
401 / 403 ?
  YES -> PROVIDER_REVOKE_VERIFIED
  NO  -> PROVIDER_REVOKE_UNVERIFIED
        ↓
AuthorizationClient.clearToken(previous bearer)
        ↓
clear FinanceSensor in-memory authority
        ↓
remain locally DISCONNECTED either way
```

The local disconnect result never depends on a provider consent screen.

```text
UI_DISCONNECTED        != PROVIDER_REVOKED
REVOKE_TASK_SUCCESS    != PROVIDER_REVOKE_VERIFIED
CLEAR_TOKEN            != REVOKE_ACCESS
OLD_BEARER_DENIED      = DIRECT PROVIDER EVIDENCE
```

While the disconnect barrier is active:

- `getGmailState()` MUST NOT restore access;
- `probeGmail()` MUST NOT restore access;
- reopening the app MUST remain disconnected;
- only an explicit user `Connect Gmail` action may cross the barrier.

### 6. Explicit reconnect and Google cross-client authorization

Google OAuth supports cross-client identity. Consent granted to one OAuth client ID in a Google Cloud project for a scope is treated as trust in the logical application/project for that scope. A later Android authorization request in the same project may therefore receive a grant without displaying consent UI again.

Consequently:

```text
NO_FRESH_CONSENT_UI_AFTER_EXPLICIT_CONNECT != REVOKE_FAILURE
```

An explicit user reconnect is allowed to proceed through either provider path:

```text
EXPLICIT CONNECT
   ├─ provider resolution / consent UI
   └─ existing project-level grant reused by Google
             ↓
       Gmail profile HTTP 2xx
             ↓
       disconnect barrier cleared
             ↓
       CONNECTED
```

This allowance applies **only after explicit user action**. It does not weaken the passive reconnect prohibition.

```text
EXPLICIT_RECONNECT_GRANT_REUSE = ALLOWED
PASSIVE_RECONNECT              = FORBIDDEN
```

FinanceSensor may surface whether provider resolution was observed as diagnostic evidence, but lack of a consent screen is not an error by itself.

### 7. 401 behavior during normal use

A Gmail HTTP 401 outside the revoke probe is handled as:

```text
401
 ↓
short token removed from FinanceSensor memory
 ↓
AuthorizationClient.clearToken(invalid token)
 ↓
REAUTH_REQUIRED
```

No hidden Gmail retry may silently restore the session.

### 8. Stable Android lab identity

The physical OAuth package remains fixed:

```text
com.financesensor.lab.gmailconnection.r2
```

No R3/R4 package churn is allowed merely because a new APK is compiled.

GitHub-hosted debug signing certificates are ephemeral and therefore unsuitable for iterative physical OAuth work. Public CI may continue to compile/test with its ephemeral debug signer, but that signer is **compile evidence only**.

For repeatable physical Android testing, FinanceSensor must establish one controlled **stable lab signing identity** outside the public repository and public CI trust boundary. Future physical R2 APKs must be signed with that same lab identity.

```text
PUBLIC_CI_DEBUG_SIGNER      = COMPILE_ONLY
PHYSICAL_R2_SIGNER          = STABLE_LAB_IDENTITY
PRODUCTION_SIGNER           = SEPARATE / NOT CREATED BY THIS ADR
LAB_SIGNING_PRIVATE_KEY     = NEVER COMMITTED
```

The stable lab identity is not the future production signing authority.

### 9. CI boundary

Public CI may:

- compile the Kotlin bridge;
- resolve public Google Play Services dependencies;
- run synthetic Flutter/MethodChannel tests;
- build a debug APK;
- statically prove no offline-access or token-to-Flutter path exists;
- verify disconnect-barrier and old-bearer-denial code paths exist.

Public CI may not:

- execute real user OAuth;
- receive Google account credentials;
- receive Gmail content;
- receive bearer or refresh authority;
- receive the stable physical lab signing private key;
- claim physical provider success.

```text
REAL_OAUTH_EXECUTED_BY_CI = 0
REAL_GMAIL_EXECUTED_BY_CI = 0
```

### 10. Physical acceptance criteria

Android authorization remains physically open until an owned Android device proves at minimum:

```text
ANDROID OAUTH CLIENT PACKAGE+STABLE SHA1      PASS
USER CONSENT                                  OBSERVED AT LEAST ONCE
EXACT gmail.readonly                          PASS
SHORT TOKEN REMAINS NATIVE                    PASS
GMAIL PROFILE                                 HTTP 2xx
HISTORY ANCHOR                                OBSERVED
REQUEST/RESPONSE BYTES                        RECORDED SANITIZED
LATENCY                                       RECORDED SANITIZED
APP-HELD REFRESH TOKEN                        ABSENT
FLUTTER BEARER EXPOSURE                       ABSENT
LOCAL DISCONNECT BARRIER                      PASS
APP REOPEN REMAINS DISCONNECTED               PASS
revokeAccess TASK                             SUCCESS
PREVIOUS BEARER AFTER REVOKE                  DENIED BY GMAIL
EXPLICIT RECONNECT                            PASS
CROSS-CLIENT SILENT GRANT, IF OBSERVED        ACCEPTED ONLY AFTER USER ACTION
LOG / EVIDENCE SECRET LEAK                    ABSENT
```

The previous requirement `POST-REVOKE AUTHORIZATION REQUIRES CONSENT = PASS` is retired because official Google cross-client authorization makes it an invalid universal assertion inside a multi-client project.

### 11. Physical evidence so far

R1:

```text
CONNECTIVITY              PASS
PROFILE                   PASS
HISTORY ANCHOR            OBSERVED
PASSIVE DISCONNECT SAFETY FAIL
```

R2 before this reconciliation:

```text
CONNECTIVITY              PASS
DURABLE LOCAL BARRIER     PASS
APP REOPEN DISCONNECTED   PASS
FAIL-CLOSED UI            PASS
FRESH CONSENT ORACLE      INCONCLUSIVE / INVALIDATED BY CROSS-CLIENT MODEL
```

Next R2 physical run must directly observe whether the **previous bearer is denied after `revokeAccess()`**.

## External anchors reviewed

Official Google documentation reviewed on 2026-09-02:

- AuthorizationClient: https://developers.google.com/android/reference/com/google/android/gms/auth/api/identity/AuthorizationClient
- Cross-client Identity: https://developers.google.com/identity/protocols/oauth2/cross-client-identity
- OAuth 2.0 policies: https://developers.google.com/identity/protocols/oauth2/policies
- Gmail API OAuth scopes: https://developers.google.com/workspace/gmail/api/auth/scopes

Provider behavior must be revalidated before release.

## Reconciliation

ADR-026 refines ADR-017, ADR-023 and the Android credential boundary in ADR-009. It does not change the iOS proof requirement.

```text
APP_HELD_LONG_LIVED_GMAIL_AUTHORITY = NONE
```

## Governing laws

```text
FLUTTER_UI != OAUTH_CREDENTIAL_BOUNDARY
PLATFORM_AUTHORIZATION > EMBEDDED_CLIENT_SECRET
NO_PRODUCT_NEED_FOR_OFFLINE_ACCESS => DO_NOT_REQUEST_OFFLINE_ACCESS
NO_REFRESH_TOKEN > PROTECTED_REFRESH_TOKEN
PROVIDER_REVOKE != UI_DISCONNECT_ONLY
REVOKE_TASK_SUCCESS != PROVIDER_REVOKE_VERIFIED
OLD_BEARER_DENIAL > CONSENT_SCREEN_INFERENCE
PASSIVE_STATE_REFRESH != EXPLICIT_RECONNECT
DISCONNECT_BARRIER_ACTIVE => AUTO_RECONNECT_FORBIDDEN
EXPLICIT_USER_CONNECT MAY USE GOOGLE CROSS_CLIENT GRANT
STATIC_BRIDGE_PASS != PHYSICAL_OAUTH_PASS
PHYSICAL_OAUTH_PASS != Q-003_CLOSED
GREEN_APK != BUILD_READY
```