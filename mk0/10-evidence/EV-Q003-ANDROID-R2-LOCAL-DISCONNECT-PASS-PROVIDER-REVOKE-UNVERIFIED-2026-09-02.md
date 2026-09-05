# EV-Q003 — Android R2 local disconnect PASS / provider revoke retest required

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
FRESH CONSENT SCREEN                        NOT OBSERVED
FAIL-CLOSED LOCAL BARRIER                    PASS
```

After user disconnect, FinanceSensor remained disconnected across screen reopen/app state refresh and exposed the local disconnect barrier as active. This closes the R1 defect where passive state observation could restore a connected state.

## Reconciliation: fresh consent UI is not a valid universal revoke oracle

The initial interpretation treated a silent grant after explicit reconnect as evidence that provider revoke had failed. That interpretation is now superseded.

Google documents cross-client identity for OAuth clients in the same Cloud Project. Consent for a scope may be shared across those client IDs because they represent one logical application/project. FinanceSensor DEV has multiple OAuth client types in the same project. Therefore a later explicit Android `Connect Gmail` can validly receive a reusable project-level grant without displaying a new consent screen.

Accordingly:

```text
NO_FRESH_CONSENT_UI_AFTER_EXPLICIT_CONNECT != REVOKE_FAILURE
```

The provider revoke criterion has been replaced with a direct test:

```text
BEFORE REVOKE
  previous bearer -> Gmail profile 2xx

revokeAccess(account, gmail.readonly)

AFTER REVOKE
  SAME previous bearer -> Gmail profile 401/403
       ↓
  PROVIDER_REVOKE_VERIFIED
```

This direct old-bearer denial test is implemented in the current R2 code and requires a new owned-device physical run.

## Current result

```text
ANDROID_GMAIL_CONNECTIVITY                  PASS
LOCAL_DISCONNECT_DURABILITY                 PASS
PASSIVE_AUTO_RECONNECT_BLOCKED              PASS
FAIL_CLOSED_LOCAL_SEMANTICS                 PASS
FRESH_CONSENT_ORACLE                        RETIRED / INVALID FOR MULTI-CLIENT PROJECT
OLD_BEARER_POST_REVOKE_DENIAL               NOT YET PHYSICALLY RUN
PROVIDER_REVOKE                             RETEST REQUIRED
Q-003                                       ACTIVE
BUILD_READY                                 NO
```

## Governing laws

```text
LOCAL_DISCONNECT_PASS != PROVIDER_REVOKE_PASS
REVOKE_TASK_SUCCESS != PROVIDER_REVOKE_VERIFIED
CLEAR_TOKEN != REVOKE_ACCESS
OLD_BEARER_DENIAL > CONSENT_SCREEN_INFERENCE
PASSIVE_RECONNECT = FORBIDDEN
EXPLICIT_USER_RECONNECT MAY USE GOOGLE CROSS_CLIENT GRANT
PASS != CLOSED
```

## Next physical requirement

Use the same fixed R2 package and stable LAB signing identity. Do not create R3/R4 package identities merely for iteration.

The next physical run must observe the post-revoke HTTP status produced when the **pre-revoke bearer** is used once more against Gmail. The bearer itself must never be logged, exported to Flutter, committed or included in public evidence.

References:
- https://developers.google.com/android/reference/com/google/android/gms/auth/api/identity/AuthorizationClient
- https://developers.google.com/identity/protocols/oauth2/cross-client-identity
