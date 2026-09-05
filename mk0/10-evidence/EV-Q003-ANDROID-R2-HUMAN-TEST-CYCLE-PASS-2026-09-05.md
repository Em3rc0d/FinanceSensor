# EV-Q003 — Android R2 Human-Test Lifecycle Evidence

Date: 2026-09-05  
Candidate: `0.1.0-alpha.1+1001`  
Package: `com.financesensor.lab.gmailconnection.r2`  
Signer: `FINANCESENSOR_R2_LAB`

## Observed physical sequence

The owned-device human test completed the following visible product states:

- Gmail connected successfully on the R2 stable-signed APK.
- A bounded recent sample was analyzed on-device.
- The derived Movements surface rendered the observed movement list.
- The user triggered disconnect/revoke and the app returned to the visible `Gmail desconectado` state.
- The user then performed an explicit reconnect and the app returned to the visible `Gmail conectado` state.
- The Sensor surface rendered the bounded-scan disclosure, session-ephemeral disclosure, and deliberate 300-message limit disclosure.

## Sanitized observations

```text
GOOGLE_OAUTH_REAL=PASS
GMAIL_CONNECTED_VISIBLE=PASS
BOUNDED_SCAN_VISIBLE=PASS
MOVEMENT_LIST_RENDERED=PASS
DISCONNECT_VISIBLE_STATE=PASS
EXPLICIT_RECONNECT_VISIBLE_STATE=PASS
SENSOR_DISCLOSURES_VISIBLE=PASS
```

No merchant names, amounts, account identifiers, message content, Gmail addresses, raw financial data, device serials, local paths, secrets, tokens, passwords, or keystore material are recorded here.

## Important boundary

The screenshots establish the visible disconnect and reconnect lifecycle, but they do **not** independently prove that the provider-side revoke completed with an old-bearer denial receipt.

Therefore:

```text
LOCAL_DISCONNECT_UI=PASS
EXPLICIT_RECONNECT_UI=PASS
PROVIDER_REVOKE_TOKEN_DENIAL=INCONCLUSIVE
```

This preserves the existing fail-closed boundary: visible disconnected state is not promoted into cryptographic/provider revoke verification without direct evidence.

## Product status

```text
HUMAN_TEST_LIFECYCLE=PASS
BUILD_READY=NO
RELEASE_READY=NO
IOS_TOUCHED=0
```

This is evidence for the bounded Android engineering candidate only. It is not a production-readiness receipt.
