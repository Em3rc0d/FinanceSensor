# EV-Q003 — Android R2 local disconnect PASS / provider revoke UNVERIFIED

Date: 2026-09-02
Surface: owned Android device
Artifact family: FinanceSensor Android Gmail Connection R2
Scope: `gmail.readonly`

## Sanitization boundary

This public receipt intentionally contains no screenshots, account identity, access token, Gmail message content, history identifier value, provider response body, private signing material or financial plaintext.

## Observed physical sequence

The owned-device R2 campaign physically demonstrated:

```text
R2 INSTALL                                  PASS
REAL GOOGLE AUTHORIZATION                   PASS
GMAIL PROFILE REACHABILITY                  PASS
HISTORY ANCHOR                              OBSERVED
LOCAL DISCONNECT                            PASS
PARENT CONNECTION STATUS                    UPDATED TO DISCONNECTED
DURABLE DISCONNECT BARRIER                  PASS
APP REOPEN REMAINS DISCONNECTED             PASS
PASSIVE STATE REFRESH RECONNECT             NOT OBSERVED
EXPLICIT CONNECT AFTER DISCONNECT            EXECUTED
PROVIDER FORCED RE-CONSENT                   NOT OBSERVED
PROVIDER REVOKE VERIFIED                     NO
FAIL-CLOSED UI ON SILENT GRANT               PASS
```

After user disconnect, FinanceSensor remained disconnected across screen reopen/app state refresh and exposed the local disconnect barrier as active. This closes the R1 defect where passive state observation could restore a connected state.

On a later explicit connection attempt, Google AuthorizationClient returned an existing grant without requiring a fresh consent resolution. FinanceSensor therefore reported the provider revoke as not verified and kept the local access barrier active instead of representing the account as connected.

## Provider contract comparison

Google documents `AuthorizationClient.revokeAccess()` as revoking access for the current application and states that future sign-in or authorization attempts should require the user to re-consent to requested scopes. Google separately documents `clearToken()` as clearing an access token from local cache.

References:
- https://developers.google.com/android/reference/com/google/android/gms/auth/api/identity/AuthorizationClient
- https://developers.google.com/android/guides/releases

The observed R2 provider behavior therefore does not satisfy FinanceSensor's physical acceptance criterion for verified provider revoke.

## Result

```text
ANDROID_GMAIL_CONNECTIVITY                  PASS
LOCAL_DISCONNECT_DURABILITY                 PASS
FAIL_CLOSED_REVOKE_SEMANTICS                PASS
PROVIDER_REVOKE                             UNVERIFIED / FAIL FOR CLOSURE
POST_REVOKE_FRESH_CONSENT                   NOT PROVEN
Q-003                                       ACTIVE
BUILD_READY                                 NO
```

## Governing laws

```text
LOCAL_DISCONNECT_PASS != PROVIDER_REVOKE_PASS
REVOKE_TASK_SUCCESS != PROVIDER_REVOKE_VERIFIED
CLEAR_TOKEN != REVOKE_ACCESS
SILENT_GRANT_AFTER_REVOKE != FRESH_CONSENT
FAIL_CLOSED_UI = REQUIRED
PASS != CLOSED
```

## Next physical requirement

Before Q-003 provider lifecycle closure, isolate whether the silent grant is caused by request/account selection semantics, provider propagation/caching, or another supported AuthorizationClient behavior. The next experiment must preserve the durable local disconnect barrier and may not weaken the acceptance criterion merely to turn the test green.
