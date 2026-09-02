# ADR-026 — Android Google Authorization boundary

**Status:** ACCEPTED FOR PHYSICAL VALIDATION / NOT YET PHYSICALLY PROVEN  
**Date:** 2026-09-02

## Context

FinanceSensor now has a compilable Android product shell and is entering the physical connection campaign. ADR-017 correctly rejected treating a secret embedded in a distributed Android binary as a confidential OAuth boundary, but it left the final Android authorization mechanism open.

Current Google/Android guidance recommends `AuthorizationClient` from Google Identity Services for Android applications that need access to Google user data. This mechanism can return a short-lived access token to the native application and can launch provider-owned consent UI when a grant is missing.

FinanceSensor does not need ordinary Gmail access from a server. Its Gmail data plane is device-local. Therefore requesting offline access merely to obtain a server authorization code and refresh token would enlarge the trust boundary without serving MK0.

## Decision

```text
ANDROID_AUTHORIZATION_PROVIDER = GOOGLE_AUTHORIZATION_CLIENT
ANDROID_SCOPE                  = gmail.readonly
ANDROID_OFFLINE_ACCESS         = REJECTED
ANDROID_APP_REFRESH_TOKEN_CUSTODY = NONE
SHORT_LIVED_BEARER_TO_FLUTTER  = FORBIDDEN
PACKAGE_PLUS_SHA1_BINDING      = REQUIRED
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

The reason is architectural:

```text
DEVICE-LOCAL GMAIL PLANE
        +
NO SERVER GMAIL EXECUTION
        ↓
NO PRODUCT NEED FOR SERVER REFRESH AUTHORITY
```

If a future feature genuinely requires server-side Gmail execution, it requires a new ADR and privacy review rather than silently enabling offline access.

### 3. Token custody

`AuthorizationClient` / Google Play Services owns the provider authorization/token cache behavior. FinanceSensor may hold a short-lived access token only in Kotlin process memory while making an authorized request.

FinanceSensor Android does not persist a refresh token because this selected path does not request one.

```text
DURABLE REFRESH TOKEN IN DART       FORBIDDEN
DURABLE REFRESH TOKEN IN APP FILES  FORBIDDEN
SHORT TOKEN IN FLUTTER              FORBIDDEN
SHORT TOKEN IN LOGS                 FORBIDDEN
SHORT TOKEN IN EVIDENCE             FORBIDDEN
SHORT TOKEN IN CLOUD CONTROL PLANE  FORBIDDEN
```

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

No hidden retry is performed by the Gmail operation.

### 6. Disconnect

User-requested disconnect invokes `AuthorizationClient.revokeAccess()` for the connected Google account and clears FinanceSensor's in-memory authorization state.

Google documents that revoke removes the application's previously granted access for that user and clears locally cached tokens. FinanceSensor therefore treats disconnect as an authorization-destruction operation, consistent with ADR-023.

### 7. Android OAuth identity binding

Google's Android OAuth client registration binds the application package name and signing-certificate SHA-1.

FinanceSensor DEV connection APK currently uses:

```text
package = com.financesensor.lab.financesensor_mobile_shell
```

The exact signing SHA-1 is emitted by the connection build workflow for the produced APK.

A GitHub-hosted debug build may use an ephemeral debug signing certificate. Therefore a physical DEV OAuth experiment must either:

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
- prove that no offline-access or token-to-Flutter path exists statically.

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
DISCONNECT / PROVIDER REVOKE                  PASS
POST-REVOKE AUTHORIZATION REQUIRES CONSENT    PASS
LOG / EVIDENCE SECRET LEAK                    ABSENT
```

These facts require physical receipts. A green build is not enough.

## Consequences

Positive:

- no refresh token is introduced into FinanceSensor Android storage;
- no confidential client secret is embedded in the APK;
- the provider-supported Android authorization mechanism owns consent/grant handling;
- Flutter remains outside the credential boundary;
- disconnect has a provider-native revoke operation;
- native Gmail access can be incrementally expanded without changing UI architecture.

Costs:

- Android OAuth client registration must match package + signing SHA-1;
- hosted debug APK identities are unsuitable as a long-term signing strategy;
- Google Play Services availability becomes part of the Android connection capability check;
- iOS still requires its own physical authorization/custody proof.

## External anchors reviewed

Official documentation reviewed on 2026-09-02:

- Android Developers — Authorize access to Google user data;
- Google Play services — `AuthorizationClient`;
- Google Play services — `AuthorizationResult`;
- Google Play services — `RevokeAccessRequest`;
- Google OAuth 2.0 policies;
- Gmail API OAuth scopes.

Release-time versions and provider behavior must be revalidated.

## Reconciliation

ADR-026 refines the Android-specific production-mobile section of ADR-017 and the Android credential-custody requirement in ADR-009:

```text
PROTECTED_APP_REFRESH_TOKEN_CUSTODY
```

is not required when the selected platform authorization mechanism does not give FinanceSensor a refresh token at all.

For Android under this ADR, the stronger property is:

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
STATIC_BRIDGE_PASS != PHYSICAL_OAUTH_PASS
PHYSICAL_OAUTH_PASS != Q-003_CLOSED
GREEN_APK != BUILD_READY
```
