# EV-Q003 — Android Gmail R1 physical connect PASS — 2026-09-02

## Classification

```text
EVIDENCE_CLASS          PHYSICAL_ANDROID / USER-OBSERVED / SANITIZED_PUBLIC_RECEIPT
SOURCE                  Trusted physical Android execution of R1 debug artifact
RAW_SCREENSHOTS         NOT COMMITTED
ACCOUNT_IDENTITY        NOT RECORDED
REAL_GMAIL_CONTENT      NOT RECORDED
TOKEN_MATERIAL          NOT RECORDED
BUILD_READY             NO
Q-003                    ACTIVE
```

This receipt records only the minimum public-safe facts supported by the physical execution. It deliberately excludes raw screenshots, account identifiers, message subjects/bodies/snippets, OAuth bearer material and other private Gmail data.

## Artifact identity

```text
ANDROID_APPLICATION_ID  com.financesensor.lab.gmailconnection.r1
ARTIFACT_KIND           DEBUG / PHYSICAL CONNECTION SPIKE
EXACT_SCOPE             https://www.googleapis.com/auth/gmail.readonly
```

The R1 package is an isolated physical-test identity used to avoid collisions with earlier debug packages. It is not the production Android application identity.

## Physical observations

The user installed the R1 artifact on a physical Android device and completed Google authorization successfully.

Observed application state after authorization:

```text
GOOGLE_AUTHORIZATION_UI_COMPLETED        PASS
GMAIL_READONLY_SCOPE                     PASS
GMAIL_PROFILE_REACHABLE                  PASS
CONNECTED_AFTER_PROVIDER_PROBE           PASS
HISTORY_ANCHOR_OBSERVED                  PASS
REPEATED_PROFILE_PROBE                   PASS
PROFILE_PROBE_LATENCY_CLASS              < 1 SECOND IN BOTH OBSERVED PROBES
MESSAGE_TOTAL_PRESENT                    PASS / EXACT VALUE REDACTED
MESSAGE_TOTAL_CHANGED_BETWEEN_PROBES      OBSERVED / EXACT VALUES REDACTED
OFFLINE_ACCESS_REQUESTED                 NO
APP_REFRESH_TOKEN_CUSTODY                NO
BEARER_TO_FLUTTER                        NO
```

The physical UI reported `Conectado` only after Gmail responded successfully and a history anchor was observed. Two consecutive physical probe observations remained successful.

## Code-path correlation

The Android bridge requires the exact `gmail.readonly` scope, obtains a short-lived access token inside Kotlin, calls:

```text
GET https://gmail.googleapis.com/gmail/v1/users/me/profile
```

and reports `CONNECTED` only after a 2xx provider response. It parses `historyId`, `messagesTotal` and `threadsTotal` from that response while exposing only coarse state/counters to Flutter.

This means the physical result demonstrates more than OAuth UI completion:

```text
OAUTH_AUTHORIZED
  + EXACT_SCOPE PRESENT
  + SHORT-LIVED TOKEN AVAILABLE TO NATIVE BRIDGE
  + GMAIL PROFILE 2XX
  + HISTORY ID PRESENT
  = PHYSICAL CONNECT/PROBE PASS
```

## What this DOES prove

```text
ANDROID_R1_INSTALLABLE_ON_PHYSICAL_DEVICE          PASS
REAL_GOOGLE_CONSENT_FLOW                            PASS
REAL_GMAIL_READONLY_AUTHORIZATION                   PASS
REAL_GMAIL_PROFILE_PROVIDER_REACHABILITY            PASS
REAL_HISTORY_ANCHOR_OBSERVATION                     PASS
REPEATED_NATIVE_GMAIL_PROFILE_PROBE                 PASS
FLUTTER_CONNECTED_STATE_AFTER_PROVIDER_SUCCESS      PASS
```

## What this does NOT prove yet

```text
PROVIDER_REVOKE_PHYSICAL                            OPEN
POST_REVOKE_ACCESS_DENIED                           OPEN
POST_REVOKE_STATE_REAUTH_REQUIRED / DISCONNECTED    OPEN
CLEAN_RECONNECT_AFTER_REVOKE                        OPEN
STABLE_PRODUCTION_SIGNING_IDENTITY                  OPEN
ANDROID PRODUCTION OAUTH CUSTODY CLOSURE            OPEN
IOS OAUTH CUSTODY                                   OPEN
GOOGLE PRODUCTION VERIFICATION / POLICY             OPEN
Q-003 CLOSED                                        NO
BUILD_READY                                          NO
```

## Next physical sequence

```text
1. Disconnect and revoke access from FinanceSensor.
2. Confirm UI leaves CONNECTED state.
3. Attempt Gmail probe without granting again; prior authority must not silently remain usable.
4. Re-authorize explicitly.
5. Confirm Gmail profile probe and history anchor succeed again.
6. Record a sanitized revoke/reconnect receipt.
```

## Governing laws

```text
PHYSICAL_CONNECT_PASS != Q-003_CLOSED
OAUTH_AUTHORIZED != GMAIL_CONNECTED
RAW_PRIVATE_EVIDENCE != PUBLIC_RECEIPT
PASS != CLOSED
BUILD_READY = NO
```
