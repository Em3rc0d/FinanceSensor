# EV-Q003 — Android R1 revoke lifecycle physical finding

**Date:** 2026-09-02  
**Surface:** owned physical Android device  
**Artifact:** FinanceSensor Android Gmail Connection R1  
**Package:** `com.financesensor.lab.gmailconnection.r1`

## Evidence classification

```text
REAL ANDROID INSTALL                     PASS
REAL GOOGLE CONSENT                      PASS
EXACT gmail.readonly                     PASS
GMAIL PROFILE REACHABILITY               PASS
HISTORY ANCHOR OBSERVED                  PASS
PASSIVE RE-PROBE                         PASS
USER DISCONNECT UI                       OBSERVED
DURABLE PROVIDER REVOKE                  FAIL / NOT PROVEN
POST-REVOKE CONSENT REQUIRED             FAIL / NOT PROVEN
Q-003                                    ACTIVE
BUILD_READY                              false
```

## Sanitized observation

The owned-device campaign first established a real Gmail connection and observed a Gmail profile response with a non-empty history anchor. Repeated profile probes remained successful.

The user then invoked **Disconnect and revoke access**. The UI temporarily entered a disconnected/not-connected state. A subsequent state/reconnect cycle returned to `CONNECTED` without having demonstrated a new provider consent requirement.

No screenshot, account identity, message subject/body/snippet, provider token, message identifier, raw Gmail response, email address, OAuth credential or authorization code is stored in this public receipt.

## Interpretation

Google documents `AuthorizationClient.revokeAccess()` as revoking access given to the current application and states that future authorization attempts should require the user to re-consent to all requested scopes. Google also provides `clearToken()` separately for local token-cache destruction.

Therefore FinanceSensor must not infer provider-revoke success solely from a successful `revokeAccess()` task callback.

```text
REVOKE_TASK_SUCCESS != PROVIDER_REVOKE_VERIFIED
UI_DISCONNECTED      != PROVIDER_REVOKED
```

R1 exposed a second implementation weakness: passive `getGmailState()` called `authorize()` again. That allowed passive state refresh to reacquire/observe provider authorization after disconnect.

## Corrective action

R2 must implement and physically prove:

```text
USER DISCONNECT
      ↓
DURABLE LOCAL DISCONNECT BARRIER
      ↓
revokeAccess(account, gmail.readonly)
      ↓
clearToken(previous short token)
      ↓
clear in-memory authority
      ↓
authorize(account, gmail.readonly) as verification only
      ↓
PendingIntent required ?
 YES → DISCONNECTED_VERIFIED
 NO  → REVOKE_NOT_EFFECTIVE
```

While the disconnect barrier is active, passive state/probe calls are forbidden from restoring Gmail access. Only explicit user reauthorization may remove the barrier, and only after a successful Gmail profile probe.

## Closure impact

```text
ANDROID CONNECT / PROFILE / HISTORY       PHYSICALLY DEMONSTRATED
ANDROID REVOKE LIFECYCLE                  OPEN
P1 / P2                                   NOT CLOSED
Q-003                                     ACTIVE
G-MK0                                     BLOCKED
BUILD_READY                               false
```

This finding is treated as successful risk discovery, not as a product failure to hide. R1 remains useful evidence for the connect half of the lifecycle and as a negative test for disconnect semantics.
