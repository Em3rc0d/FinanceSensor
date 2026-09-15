# EV-Q003 — Android R2 stable local lifecycle PASS

Date: 2026-09-03  
Surface: owned Android device  
Package: `com.financesensor.lab.gmailconnection.r2`  
Signing profile: `FINANCESENSOR_R2_LAB`

## Sanitization boundary

This public receipt intentionally contains no screenshots, account identity, access token, Gmail content, provider response body, history identifier value, signing private key, keystore password or financial plaintext.

## Physical sequence observed

Using the stable-signed R2 APK and the stable Android OAuth package/SHA binding, the owned-device run physically demonstrated:

```text
STABLE R2 INSTALL                         PASS
GOOGLE AUTHORIZATION                      PASS
GMAIL PROFILE REACHABILITY                PASS
HISTORY ANCHOR                            OBSERVED
LOCAL DISCONNECT                          PASS
DURABLE DISCONNECT BARRIER                PASS
PARENT UI STATUS                          DISCONNECTED
APP REMAINS DISCONNECTED                  PASS
PASSIVE AUTO-RECONNECT                    NOT OBSERVED
EXPLICIT USER RECONNECT                   PASS
GOOGLE PROJECT GRANT REUSE                OBSERVED
GMAIL PROFILE AFTER EXPLICIT RECONNECT    PASS
```

The reconnect occurred only after an explicit user `Connect Gmail` action. Google reused an existing project-level grant, and FinanceSensor accepted it only after Gmail profile validation succeeded.

## Interpretation

This physically closes the previously observed local lifecycle defect.

```text
DISCONNECT -> STAYS DISCONNECTED -> EXPLICIT CONNECT -> CONNECTED
```

The behavior is consistent with the R2 contract:

```text
PASSIVE_RECONNECT                  FORBIDDEN
EXPLICIT_RECONNECT_GRANT_REUSE     ALLOWED
GMAIL_HTTP_2XX_REQUIRED_FOR_CONNECTED
```

## Provider revoke remains separate

The disconnect screen still reported provider revoke as not verified in this run. Therefore this receipt does **not** claim Google provider revoke closure.

The authoritative provider-side criterion remains:

```text
PRE-REVOKE BEARER -> Gmail profile 2xx
revokeAccess(account, gmail.readonly)
SAME PREVIOUS BEARER -> Gmail profile 401/403
```

That direct previous-bearer denial has not yet been physically captured as PASS.

## Current result

```text
ANDROID_GMAIL_CONNECTIVITY               PASS
STABLE_PACKAGE+SIGNING_IDENTITY          PASS
LOCAL_DISCONNECT_DURABILITY              PASS
PASSIVE_AUTO_RECONNECT_BLOCKED           PASS
EXPLICIT_RECONNECT                       PASS
CROSS-CLIENT GRANT REUSE                 PASS / OBSERVED
PROVIDER_REVOKE                          UNVERIFIED
Q-003                                    ACTIVE
BUILD_READY                              NO
```

## Governing laws

```text
LOCAL_LIFECYCLE_PASS != PROVIDER_REVOKE_PASS
EXPLICIT_USER_CONNECT MAY USE GOOGLE CROSS_CLIENT GRANT
PASSIVE_STATE_REFRESH != EXPLICIT_RECONNECT
OAUTH_AUTHORIZED != GMAIL_CONNECTED
PASS != CLOSED
```