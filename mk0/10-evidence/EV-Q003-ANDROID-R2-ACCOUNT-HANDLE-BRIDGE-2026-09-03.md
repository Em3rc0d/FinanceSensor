# EV-Q003 — Android R2 account-handle bridge repair

**Date:** 2026-09-03  
**Node:** Q-003  
**Status:** CI_PASS_PHYSICAL_RETEST_OPEN  
**Physical provider revoke:** OPEN

## Purpose

Record the implementation repair and reproducible CI evidence for the Android R2 Gmail provider-revoke gap reproduced on an owned device as:

```text
ACCOUNT_HANDLE_UNAVAILABLE
```

This receipt does **not** claim Google provider revocation passed. The only accepted physical provider-revoke PASS remains a Gmail Profile `HTTP 401` response when FinanceSensor deliberately reuses the previous short-lived bearer after `revokeAccess()`.

## Reproduced physical boundary before the repair

The owned-device R2 sequence had already established:

```text
ANDROID GMAIL CONNECT             PHYSICAL PASS
GMAIL PROFILE                     HTTP 2xx
EXACT SCOPE                       gmail.readonly
BEARER TO FLUTTER                 NO
APP REFRESH TOKEN CUSTODY         NO
LOCAL DISCONNECT BARRIER          PASS
GOOGLE PROVIDER REVOKE            UNVERIFIED
POST-REVOKE OLD-BEARER HTTP       NO RESULT
DIAGNOSTIC                         ACCOUNT_HANDLE_UNAVAILABLE
```

The previous bridge attempted to infer the Android account through deprecated `AuthorizationResult.toGoogleSignInAccount()` / `GoogleSignInAccount` conversion. On the physical device the authorization result contained a usable short-lived bearer while that conversion did not provide the `android.accounts.Account` required by `RevokeAccessRequest`.

FinanceSensor correctly failed closed instead of promoting local disconnect into a provider-revoke claim.

## Repair

ADR-027 freezes the replacement ownership model:

```text
ACCOUNT_HANDLE_SOURCE              ANDROID_ACCOUNT_PICKER
ACCOUNT_IDENTIFIER_PERSISTENCE     FORBIDDEN
ACCOUNT_IDENTIFIER_TO_FLUTTER      FORBIDDEN
DEPRECATED_SIGNIN_ACCOUNT_BRIDGE   FORBIDDEN
AUTHORIZATION_REQUEST_ACCOUNT      EXPLICIT
REVOKE_REQUEST_ACCOUNT             SAME_IN_MEMORY_HANDLE
```

The bridge now executes:

```text
Explicit Connect
  -> Android AccountPicker (com.google)
  -> android.accounts.Account in native process memory
  -> AuthorizationRequest.setAccount(account)
  -> AuthorizationClient.authorize()
  -> short-lived bearer remains native
  -> Gmail Profile HTTP 2xx required for CONNECTED

Explicit Disconnect
  -> durable local barrier ACTIVE first
  -> RevokeAccessRequest.setAccount(same account)
  -> revokeAccess()
  -> reuse previous bearer against Gmail Profile
  -> HTTP 401 required for provider-revoke PASS
```

If process loss has removed the in-memory account handle, an explicit user Disconnect may invoke AccountPicker only to recover the handle needed for revoke. Passive state observation remains forbidden from prompting or reconnecting.

## Privacy/security boundary preserved

The repair does not persist Google account identity.

Forbidden remains:

```text
Account.name in persistent storage
Google email in persistent storage
Google account identifier in persistent storage
bearer token in Flutter
refresh token in app custody
offline access request
serverAuthCode
real OAuth/Gmail execution in public CI
private R2 signing material in repository or CI
```

The existing SharedPreferences use remains limited to the non-secret disconnect-barrier boolean.

## Implementation commit

```text
BRANCH_BASE       jett/mk0-foundation
MERGE_COMMIT      2eb1f880889059b7f7964d4aa6fe85bec4332cdb
PR                #2
TITLE             fix(android): close Q-003 account-handle revoke gap
```

Changed implementation/contract surfaces:

- `spikes/mobile-shell/native/android/MainActivity.kt`
- `tools/validate-android-gmail-bridge.mjs`
- `mk0/11-decisions/ADR-027-ANDROID-ACCOUNT-HANDLE-CUSTODY.md`

## Reproducible public CI evidence

Android Gmail Connection workflow:

```text
RUN_ID                          33764523000
WORKFLOW                        FinanceSensor Android Gmail Connection
RESULT                          SUCCESS
STATIC_BRIDGE_BOUNDARY          PASS
KOTLIN_SCAFFOLD                 PASS
ANDROID_OAUTH_COMPILE_SURFACE   PASS
FLUTTER_ANALYZE                 PASS
WIDGET_AND_BRIDGE_TESTS         PASS
ANDROID_APK_BUILD               PASS
APK_EVIDENCE                    PASS
ARTIFACT_UPLOAD                 PASS
```

Public Readiness on the same implementation head:

```text
RUN_ID                          33764523098
RESULT                          SUCCESS
CURRENT_TREE_EXPOSURE_GUARD     PASS
CI_TRUST_BOUNDARY_GUARD         PASS
FULL_HISTORY_SECRET_AUDIT       PASS
```

Heartbeat vital-signs on the same implementation head also completed successfully.

## CI artifact identity

The public-CI APK is compile evidence only:

```text
PACKAGE                         com.financesensor.lab.gmailconnection.r2
APK_SHA256                      df0eb6b543a008bc256c1ee5de3c96420f7b23449deee9f10994817563f80ed3
APK_BYTES                       151724633
CI_DEBUG_SIGNER_SHA1            D7:21:5A:AE:F3:CA:AF:ED:F5:01:94:60:6C:98:48:E0:7F:32:9C:75
PUBLIC_CI_SIGNER                COMPILE_ONLY_EPHEMERAL
REAL_OAUTH_EXECUTED_BY_CI       0
REAL_GMAIL_EXECUTED_BY_CI       0
```

It MUST NOT be substituted for the already registered physical R2 signing identity.

## Stable R2 identity remains frozen

```text
PACKAGE                         com.financesensor.lab.gmailconnection.r2
PHYSICAL_SIGNING_PROFILE        FINANCESENSOR_R2_LAB
PHYSICAL_CERT_SHA1              63:2F:3A:4C:AE:C6:86:5B:C4:02:E8:82:12:2E:33:38:A6:EF:EB:D0
NEW_PACKAGE                     NO
NEW_OAUTH_CLIENT                NO
SCOPE_CHANGE                    NO
PRIVATE_KEY_IN_PUBLIC_REPO      0
PRIVATE_KEY_IN_PUBLIC_CI        0
```

The trusted-edge stable signer remains outside the public repository and GitHub-hosted CI by design.

Therefore:

```text
CI_APK_BUILD_PASS != PHYSICAL_R2_PROVIDER_REVOKE_PASS
CI_DEBUG_SIGNER != PHYSICAL_R2_SIGNER
```

## Remaining physical test

The next stable-signed R2 physical build must execute:

```text
1. Connect Gmail
2. Gmail Profile -> HTTP 2xx
3. Disconnect and revoke
4. revokeAccess() receives the owned Account handle
5. FinanceSensor reuses the previous bearer against users/me/profile
```

Required evidence:

```text
Barrera de desconexión   Activa
Revocación Google        Verificada
Bearer anterior          Denegado
HTTP post-revoke         401
Intentos post-revoke     1..3
Diagnóstico revoke       PREVIOUS_BEARER_UNAUTHORIZED
```

Interpretation remains fail-closed:

```text
HTTP 401  -> PASS
HTTP 200  -> FAIL / bearer still valid
HTTP 403  -> AMBIGUOUS / no PASS
no HTTP   -> UNVERIFIED / no PASS
```

Until the physical stable-signed R2 returns `HTTP 401`, Q-003 remains ACTIVE and the Android provider-revoke sub-gate remains OPEN.

## Official API anchors

- Google `AuthorizationRequest.Builder`: `setAccount(Account)` binds the account used by the authorization request.
- Google `RevokeAccessRequest.Builder`: `setAccount(Account)` binds the account whose authorization is revoked.
- Google `AuthorizationResult`: legacy `toGoogleSignInAccount()` conversion is deprecated.
- Google `AccountPicker`: official Android account-selection surface used to obtain the concrete account handle.

References:

- https://developers.google.com/android/reference/com/google/android/gms/auth/api/identity/AuthorizationRequest.Builder
- https://developers.google.com/android/reference/com/google/android/gms/auth/api/identity/RevokeAccessRequest.Builder
- https://developers.google.com/android/reference/com/google/android/gms/auth/api/identity/AuthorizationResult
- https://developers.google.com/android/reference/com/google/android/gms/common/AccountPicker

## Governing conclusion

```text
ACCOUNT_HANDLE_UNAVAILABLE_CAUSE        REPAIRED_IN_IMPLEMENTATION
DEPRECATED_ACCOUNT_INFERENCE            REMOVED
ACCOUNT_IDENTIFIER_PERSISTENCE          0
PUBLIC_CI                               PASS
STABLE_R2_IDENTITY                      UNCHANGED
ANDROID_PROVIDER_REVOKE_HTTP_401        PHYSICAL_OPEN
Q003                                    ACTIVE
BUILD_READY                             NO
```
