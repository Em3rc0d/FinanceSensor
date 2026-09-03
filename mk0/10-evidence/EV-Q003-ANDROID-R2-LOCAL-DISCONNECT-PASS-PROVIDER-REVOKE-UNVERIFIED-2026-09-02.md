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

Google also documents cross-client identity: consent granted for a scope to one OAuth client ID in a Cloud project is treated as trust in the logical application/project, and another reliably authenticated client in the same project can potentially obtain that scope without another consent prompt.

FinanceSensor development currently has multiple OAuth client identities in the same Google Cloud project, including earlier desktop proof clients and Android physical-test clients. Therefore the silent post-disconnect grant has at least two plausible provider-side explanations and cannot yet be classified as a proven `revokeAccess()` implementation failure:

1. the R2 client grant was not fully revoked; or
2. Google cross-client authorization satisfied the Android request from project-level prior approval associated with another FinanceSensor client.

References:
- https://developers.google.com/android/reference/com/google/android/gms/auth/api/identity/AuthorizationClient
- https://developer.android.com/identity/authorization
- https://developers.google.com/identity/protocols/oauth2/cross-client-identity
- https://developers.google.com/android/guides/releases

The observed R2 behavior therefore does not satisfy FinanceSensor's physical acceptance criterion for verified provider revoke, but the root cause remains unresolved.

## Result

```text
ANDROID_GMAIL_CONNECTIVITY                  PASS
LOCAL_DISCONNECT_DURABILITY                 PASS
FAIL_CLOSED_REVOKE_SEMANTICS                PASS
PROVIDER_REVOKE                             UNVERIFIED / FAIL FOR CLOSURE
POST_REVOKE_FRESH_CONSENT                   NOT PROVEN
CROSS_CLIENT_AUTHORIZATION                  PLAUSIBLE CONFOUNDER
Q-003                                       ACTIVE
BUILD_READY                                 NO
```

## Governing laws

```text
LOCAL_DISCONNECT_PASS != PROVIDER_REVOKE_PASS
REVOKE_TASK_SUCCESS != PROVIDER_REVOKE_VERIFIED
CLEAR_TOKEN != REVOKE_ACCESS
SILENT_GRANT_AFTER_REVOKE != FRESH_CONSENT
CROSS_CLIENT_GRANT != CURRENT_CLIENT_REVOKE_FAILURE
FAIL_CLOSED_UI = REQUIRED
PASS != CLOSED
```

## Next physical requirement

Before Q-003 provider lifecycle closure, run an isolated Android revoke experiment whose OAuth project does not contain a previously approved sibling client for the same scope, or otherwise prove account/client identity strongly enough to exclude cross-client authorization. Preserve the durable local disconnect barrier and do not weaken the acceptance criterion merely to turn the test green.
