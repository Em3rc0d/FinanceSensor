# FinanceSensor-owned Gmail OAuth — Level C execution packet

**Status:** READY FOR CONTROLLED EXTERNAL AUTHORIZATION  
**Date:** 2026-09-01  
**Owner:** Q-003 / ADR-017

## Purpose

This packet defines the physical experiment that must prove FinanceSensor's own OAuth identity can feed the existing Gmail ingress path without weakening the privacy, least-privilege, provenance or parasympathetic contracts already demonstrated by synthetic and real-provider evidence.

It is not permission to move long-lived Gmail authority into CI or the FinanceSensor cloud.

## Preconditions

The experiment starts only when all of the following exist:

```text
CONTROLLED GOOGLE CLOUD DEV PROJECT
GMAIL API ENABLED IN THAT DEV PROJECT
FINANCESENSOR-OWNED OAUTH CLIENT FOR THE ACTUAL TEST PLATFORM
CONTROLLED TEST USER ALLOWED BY THE DEV CONSENT CONFIGURATION
EXACT REQUESTED SCOPE = gmail.readonly
CONTROLLED EDGE/CLIENT RUNTIME
```

DEV and eventual PROD OAuth projects/clients are separate identities.

## Authority boundary

```text
Google consent in supported browser/platform flow
        ↓
authorization response bound to initiating session/state
        ↓
PKCE-protected code exchange
        ↓
protected edge credential store owns long-lived refresh authority
        ↓
LocalOAuthCredentialProvider
        ↓ short-lived bearer only
GmailRestProvider
        ↓
metadata-first physical ingress
```

Forbidden shortcuts:

```text
cloud control plane as normal refresh-token custodian
GitHub Actions as OAuth Level-C authority
client secret embedded in mobile client
manual OOB copy/paste flow
silent 401 retry loop
raw Gmail content in repository evidence
raw financial literals in CI evidence
```

## Physical sequence

1. Provision the controlled FinanceSensor DEV OAuth identity for the actual platform.
2. Register/allow only the controlled test user required for the experiment.
3. Initiate authorization from the controlled edge/client runtime.
4. Request exactly `https://www.googleapis.com/auth/gmail.readonly`.
5. Bind the response to the initiating session using `state` and PKCE S256.
6. Exchange the authorization code without a client secret in the public-client runtime.
7. Place long-lived refresh authority in the platform-protected credential store; never commit or print it.
8. Obtain a short-lived access token through the device-local credential broker.
9. Feed only that short-lived bearer into `GmailRestProvider`.
10. Execute bounded `messages.list`.
11. Execute `messages.get(METADATA)` for considered messages.
12. Execute `messages.get(FULL)` only for selected financial candidates.
13. Read the current Gmail history cursor/profile state.
14. Produce a controlled new-message change and exercise `history.list` incremental sync.
15. Repeat one sync window to verify idempotent replay.
16. Force/observe an authorization-invalid state; verify the current call returns `REAUTH_REQUIRED` with no hidden retry.
17. Re-authorize or refresh through the supported local authority path and verify later work resumes.
18. Disconnect/revoke the controlled Gmail authorization and verify the old authority can no longer read Gmail.
19. Verify local connection cursor/credential cleanup according to Q-004 while user-owned derived history follows the selected disconnect policy.
20. Record only aggregate, sanitized evidence.

## Required observations

```text
REAL_OAUTH_CONSENT                  PASS / FAIL
EXACT_SCOPE                         gmail.readonly / FAIL
PKCE_S256                           PASS / FAIL
STATE_BINDING                       PASS / FAIL
CLIENT_SECRET_ON_EDGE               0 / FAIL
CLOUD_REFRESH_AUTHORITY             0 / FAIL
REAL_MESSAGES_LIST                  PASS / FAIL
REAL_METADATA_GET                   PASS / FAIL
REAL_SELECTED_FULL_GET              PASS / FAIL
REAL_HISTORY_CURSOR                 PASS / FAIL
REAL_INCREMENTAL_SYNC               PASS / FAIL
REPLAY_IDEMPOTENT                   PASS / FAIL
401_HIDDEN_RETRY                    0 / FAIL
REAUTH_REQUIRED                     PASS / FAIL
REMOTE_OR_PROVIDER_REVOCATION       PASS / FAIL
OLD_AUTHORITY_AFTER_REVOCATION      DENIED / FAIL
RAW_GMAIL_CONTENT_IN_REPO           0 / FAIL
FINANCIAL_PLAINTEXT_IN_CI           0 / FAIL
AUTH_SECRET_IN_LOGS                 0 / FAIL
REQUEST_COUNT                       MEASURED
TRANSFERRED_BYTES                   MEASURED WHERE AVAILABLE
TIMING                              MEASURED
```

## Evidence identifiers

The evidence artifact may retain:

- execution date/time;
- app/client identity as a one-way fingerprint if useful;
- platform/runtime version;
- requested scope string;
- counts of list/metadata/full/history requests;
- counts of candidates/evidence/canonical results;
- timings and byte counts where available;
- boolean gate results;
- CI/repository commit SHA for the code under test.

It must not retain:

- refresh token;
- access token;
- authorization code;
- PKCE verifier;
- Gmail message body/subject;
- real amount, account number, merchant, recipient or operation reference;
- provider raw error body containing user data.

## Failure policy

Any of the following makes Level C **FAIL**, not partial success:

```text
scope broader than gmail.readonly
state/PKCE binding cannot be demonstrated
client secret required in the public mobile client
long-lived Gmail authority must traverse FinanceSensor cloud
raw financial email is persisted to repo/CI
401 causes an uncontrolled retry loop
revoked/disconnected authority remains usable without an explained provider grace condition
metadata-first boundary is bypassed without explicit evidence reason
```

A provider/policy limitation discovered during the run may reopen ADR-017/Q-003 rather than being patched around silently.

## Current readiness

```text
REAL PROVIDER REACHABILITY              PASS
REAL TRANSACTIONAL SOURCE SHAPE         PASS
GMAIL REST ADAPTER                       READY
PKCE / STATE CONTRACT                    TESTED
EXACT-SCOPE GUARD                        TESTED
NO CLIENT SECRET CONTRACT                TESTED
LOCAL REFRESH AUTHORITY                  TESTED
SHORT-TOKEN CACHE                        TESTED
CONCURRENT REFRESH COALESCING            TESTED
401 INVALIDATION / NO HIDDEN RETRY       TESTED
REFRESH AUTHORITY → GMAIL BOUNDARY       TESTED
CI LONG-LIVED-AUTHORITY CUSTODY          FORBIDDEN
CONTROLLED FINANCESENSOR DEV OAUTH ID    EXTERNAL PRECONDITION
INTERACTIVE LEVEL-C EXECUTION            NOT YET EXECUTED
```

`READY FOR AUTHORIZATION ≠ AUTHORIZED ≠ LEVEL C PASS`.
