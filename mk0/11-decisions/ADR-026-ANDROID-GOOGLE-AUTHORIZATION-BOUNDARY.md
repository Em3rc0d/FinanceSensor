# ADR-026 — Android Google Authorization boundary

**Status:** ACCEPTED FOR PHYSICAL VALIDATION / PARTIAL PHYSICAL EVIDENCE / REVOKE OPEN  
**Date:** 2026-09-02

## Context

FinanceSensor has a compilable Android product shell and is entering the physical connection campaign. ADR-017 correctly rejected treating a secret embedded in a distributed Android binary as a confidential OAuth boundary, but it left the final Android authorization mechanism open.

Current Google/Android guidance uses `AuthorizationClient` from Google Identity Services for Android applications that need access to Google user data. This mechanism can return a short-lived access token to the native application and can launch provider-owned consent UI when a grant is missing.

FinanceSensor does not need ordinary Gmail access from a server. Its Gmail data plane is device-local. Therefore requesting offline access merely to obtain a server authorization code and refresh token would enlarge the trust boundary without serving MK0.

The first Android R1 physical campaign demonstrated real `gmail.readonly` authorization, Gmail profile reachability and a history anchor. It also exposed an important lifecycle failure: after user-requested disconnect, the application could later observe authorization again without having proven that provider revocation had become effective. Therefore UI disconnect and provider revocation must be modeled as separate facts.

## Decision

```text
ANDROID_AUTHORIZATION_PROVIDER    = GOOGLE_AUTHORIZATION_CLIENT
ANDROID_SCOPE                     = gmail.readonly
ANDROID_OFFLINE_ACCESS            = REJECTED
ANDROID_APP_REFRESH_TOKEN_CUSTODY = NONE
SHORT_LIVED_BEARER_TO_FLUTTER     = FORBIDDEN
PACKAGE_PLUS_SHA1_BINDING         = REQUIRED
DURABLE_DISCONNECT_BARRIER        = REQUIRED
POST_REVOKE_PROVIDER_VERIFICATION = REQUIRED
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
        ↓
short-lived access token in native process memory
        ↓
Gmail native adapter / profile-history requests
        ↓
coarse state + derived financial evidence to Flutter
```

The Flutter layer never receives the bearer token.

### 2. No offline access

FinanceSensor Android MUST NOT call:

```text
requestOfflineAccess(...)
getServerAuthCode()
serverAuthCode
```

for the ordinary local Gmail path.

```text
DEVICE-LOCAL GMAIL PLANE
        +
NO SERVER GMAIL EXECUTION
        ↓
NO PRODUCT NEED FOR SERVER REFRESH AUTHORITY
```

If a future feature genuinely requires server-side Gmail execution, it requires a new ADR and privacy review rather than silently enabling offline access.

### 3. Token custody

`AuthorizationClient` / Google Play Services owns provider authorization/token-cache behavior. FinanceSensor may hold a short-lived access token only in Kotlin process memory while making an authorized request.

FinanceSensor Android does not persist a refresh token because this selected path does not request one.

```text
DURABLE REFRESH TOKEN IN DART       FORBIDDEN
DURABLE REFRESH TOKEN IN APP FILES  FORBIDDEN
SHORT TOKEN IN FLUTTER              FORBIDDEN
SHORT TOKEN IN LOGS                 FORBIDDEN
SHORT TOKEN IN EVIDENCE             FORBIDDEN
SHORT TOKEN IN CLOUD CONTROL PLANE  FORBIDDEN
```

A local disconnect barrier is explicitly allowed to persist as a boolean because it is non-secret control state, not provider authority. The Android implementation may persist only that boolean through the narrow connection-state store. Tokens, account identifiers, message data and OAuth credentials remain forbidden there.

### 4. Gmail probe boundary

The first physical Android connection slice is intentionally narrow:

```text
AuthorizationClient
        ↓ exact gmail.readonly
Gmail users/me/profile
        ↓
profile reachable
history anchor observed
message/thread aggregate counts
latency + response byte count
```

The native bridge parses the provider response locally and returns only coarse state to Flutter. It does not return the account email address, raw provider body, bearer token, message identifiers, subjects, snippets or message content.

This profile probe proves authorization/data-plane reachability. It does not yet prove full Gmail ingestion.

### 5. 401 behavior

A Gmail HTTP 401 is handled as:

```text
401
 ↓
short token removed from FinanceSensor process memory
 ↓
AuthorizationClient.clearToken(invalid token)
 ↓
REAUTH_REQUIRED
```

No hidden Gmail retry is performed by the operation.

### 6. Disconnect and revoke

User-requested disconnect is an authorization-destruction operation, not a UI toggle.

The implementation MUST perform these steps in order:

```text
USER TAPS DISCONNECT
        ↓
DURABLE LOCAL DISCONNECT BARRIER = ACTIVE
        ↓
AuthorizationClient.revokeAccess(account, gmail.readonly)
        ↓
AuthorizationClient.clearToken(previous short token)
        ↓
clear FinanceSensor in-memory authorization state
        ↓
AuthorizationClient.authorize(account + gmail.readonly)
        ↓
resolution required ?
   YES → DISCONNECTED_VERIFIED
   NO  → REVOKE_NOT_EFFECTIVE
```

Google documents `revokeAccess()` as revoking access given to the current application and states that future authorization attempts should require the user to re-consent. Google separately documents `clearToken()` as removing an access token from the local cache. FinanceSensor therefore does not assume that a successful `revokeAccess()` task alone proves both provider revocation and local token-cache destruction.

```text
REVOKE_TASK_SUCCESS != PROVIDER_REVOKE_VERIFIED
REVOKE_ACCESS        != CLEAR_TOKEN
UI_DISCONNECTED      != PROVIDER_REVOKED
```

The local disconnect barrier is activated before provider operations and survives process/app restart. While active:

- `getGmailState()` MUST NOT silently call provider authorization and restore `CONNECTED`;
- `probeGmail()` MUST NOT restore access;
- Flutter MUST report a disconnected state;
- only an explicit user `Connect Gmail` action may start reauthorization;
- if Google still returns the existing grant without a resolution/consent path, FinanceSensor MUST remain disconnected and report `REVOKE_NOT_EFFECTIVE`.

The barrier is removed only after an explicit reauthorization flow reaches a successful Gmail profile probe.

### 7. Android OAuth identity binding

Google's Android OAuth client registration binds the application package name and signing-certificate SHA-1.

Physical debug packages are isolated per executable campaign because GitHub-hosted debug signing identities are ephemeral:

```text
R1 = com.financesensor.lab.gmailconnection.r1
R2 = com.financesensor.lab.gmailconnection.r2
```

The exact signing SHA-1 is emitted by the connection build workflow for the produced APK.

A physical DEV OAuth experiment must either:

1. register the exact package + SHA-1 of the APK being physically tested; or
2. use a controlled local DEV signing identity outside repository/CI custody.

A production signing key is never committed to this public repository.

### 8. CI boundary

Public CI may:

- compile the Kotlin bridge;
- resolve the public Google Play Services auth dependency;
- run synthetic MethodChannel/widget tests;
- build a debug APK;
- emit the public signing-certificate SHA-1 for that debug artifact;
- prove statically that no offline-access or token-to-Flutter path exists;
- verify that only a boolean disconnect barrier may use local preference storage.

Public CI may not:

- execute real user OAuth;
- receive a Google account credential;
- receive Gmail content;
- receive or persist bearer/refresh authority;
- claim physical provider success.

```text
REAL_OAUTH_EXECUTED_BY_CI = 0
REAL_GMAIL_EXECUTED_BY_CI = 0
```

### 9. Physical acceptance criteria

Android authorization remains physically open until an owned physical Android device proves at minimum:

```text
ANDROID OAUTH CLIENT PACKAGE+SHA1 MATCH       PASS
USER CONSENT UI                               OBSERVED
EXACT gmail.readonly GRANT                    PASS
SHORT TOKEN REMAINS NATIVE                    PASS
GMAIL PROFILE                                 HTTP 200
HISTORY ANCHOR                                OBSERVED
REQUEST/RESPONSE BYTES                        RECORDED SANITIZED
LATENCY                                       RECORDED SANITIZED
APP-HELD REFRESH TOKEN                        ABSENT
FLUTTER BEARER EXPOSURE                       ABSENT
LOCAL DISCONNECT BARRIER                      PASS
DISCONNECT / PROVIDER REVOKE                  PASS
POST-REVOKE AUTHORIZATION REQUIRES CONSENT    PASS
EXPLICIT RECONNECT AFTER REVOKE               PASS
LOG / EVIDENCE SECRET LEAK                    ABSENT
```

The R1 campaign currently proves the connect/profile/history portion but **does not close** provider revoke. The R2 campaign exists specifically to retest the lifecycle with a durable local barrier and explicit post-revoke verification.

## Consequences

Positive:

- no refresh token is introduced into FinanceSensor Android storage;
- no confidential client secret is embedded in the APK;
- Flutter remains outside the credential boundary;
- a user disconnect cannot be undone by passive app state refresh;
- provider revoke is verified rather than inferred from a successful API task;
- failures are surfaced as `REVOKE_NOT_EFFECTIVE` instead of being mislabeled `CONNECTED`.

Costs:

- Android OAuth client registration must match package + signing SHA-1;
- hosted debug APK identities are unsuitable as a long-term signing strategy;
- connection-state logic is now explicitly stateful because disconnect intent must survive app restart;
- Google Play Services availability and provider propagation become part of the physical lifecycle campaign;
- iOS still requires its own physical authorization/custody proof.

## External anchors reviewed

Official Google documentation reviewed on 2026-09-02 and rechecked after the R1 physical finding:

- Google Play services — `AuthorizationClient`;
- Google Play services — `RevokeAccessRequest`;
- Google Play services release notes for `revokeAccess` and `clearToken`;
- Google OAuth 2.0 policies;
- Gmail API OAuth scopes.

Release-time versions and provider behavior must be revalidated.

## Reconciliation

ADR-026 refines the Android-specific production-mobile section of ADR-017 and the Android credential-custody requirement in ADR-009.

For Android under this ADR:

```text
APP_HELD_LONG_LIVED_GMAIL_AUTHORITY = NONE
```

The iOS path remains open and must be resolved separately.

## Governing laws

```text
FLUTTER_UI != OAUTH_CREDENTIAL_BOUNDARY
PLATFORM_AUTHORIZATION > EMBEDDED_CLIENT_SECRET
NO_PRODUCT_NEED_FOR_OFFLINE_ACCESS => DO_NOT_REQUEST_OFFLINE_ACCESS
NO_REFRESH_TOKEN > PROTECTED_REFRESH_TOKEN
PROVIDER_REVOKE != UI_DISCONNECT_ONLY
REVOKE_TASK_SUCCESS != PROVIDER_REVOKE_VERIFIED
PASSIVE_STATE_REFRESH != EXPLICIT_RECONNECT
DISCONNECT_BARRIER_ACTIVE => AUTO_RECONNECT_FORBIDDEN
STATIC_BRIDGE_PASS != PHYSICAL_OAUTH_PASS
PHYSICAL_OAUTH_PASS != Q-003_CLOSED
GREEN_APK != BUILD_READY
```
