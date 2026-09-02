# FinanceSensor-owned Gmail OAuth — Level C execution packet

**Status:** READY FOR CONTROLLED EXTERNAL AUTHORIZATION — v3 REQUIRED  
**Date:** 2026-09-01  
**Reconciled:** 2026-09-02  
**Owner:** Q-003 / ADR-017

## Purpose

This packet defines the physical experiment that must prove FinanceSensor's own OAuth identity can feed the existing Gmail ingress path without weakening privacy, least privilege, provenance or parasympathetic contracts.

It is not permission to move long-lived Gmail authority or the Google Desktop client credential into CI or the FinanceSensor cloud.

## Preconditions

```text
CONTROLLED GOOGLE CLOUD DEV PROJECT                         READY
GMAIL API ENABLED                                          READY
FINANCESENSOR DEV DESKTOP OAUTH CLIENT                     READY
CONTROLLED TEST USER                                       READY
EXACT REQUESTED SCOPE = gmail.readonly                     READY
GOOGLE-DOWNLOADED DESKTOP CREDENTIALS JSON                 OPERATOR-LOCAL
CONTROLLED WINDOWS/EDGE RUNTIME                            READY
```

DEV and eventual PROD OAuth projects/clients remain separate identities.

## Authority boundary

```text
Google Desktop credentials JSON
        ↓ selected locally; never uploaded
client_id + client_secret
        ↓ process memory only
Google consent in browser
        ↓ state + PKCE S256
Google token endpoint
        ↓ refresh authority stays local
LocalOAuthCredentialProvider
        ↓ short-lived bearer only
GmailRestProvider
        ↓
post-authorization Gmail history only
```

Forbidden shortcuts:

```text
cloud control plane as normal refresh-token custodian
GitHub Actions as OAuth Level-C authority
real Desktop client_secret in GitHub/CI/chat/evidence
client secret treated as mobile confidential boundary
manual OOB copy/paste flow
silent 401 retry loop
historical mailbox sweep for this proof
raw Gmail content in repository evidence
raw financial literals in CI evidence
```

## Physical sequence

1. Download the credentials JSON for the existing `FinanceSensor DEV Level-C` Desktop client directly from Google Cloud and keep it on the local test machine.
2. Start the packaged v3 runner; Windows opens a file picker and the operator selects that JSON. Cancelling stops before OAuth.
3. FinanceSensor parses only the `installed` Desktop client material and requires its `client_id` to equal the frozen public DEV Client ID.
4. FinanceSensor keeps the Google-issued Desktop `client_secret` only in process memory and never writes the credential file/path to evidence.
5. Initiate browser authorization requesting exactly `https://www.googleapis.com/auth/gmail.readonly`.
6. Bind the callback to the initiating session with `state` and PKCE S256.
7. Exchange the code using `client_id + local client_secret + redirect_uri + code + code_verifier` as required by the observed Desktop provider.
8. Receive a short-lived access token and local refresh authority; never print or persist either in the runner/evidence.
9. Call Gmail profile only to obtain the baseline `historyId`.
10. The operator sends one harmless synthetic email after authorization.
11. Call `history.list` from the baseline cursor; do **not** call `messages.list`.
12. Inspect at most 5 changed message IDs per bounded attempt using `messages.get(METADATA)`.
13. Call `messages.get(FULL)` for at most one qualifying synthetic candidate.
14. Repeat the same history window once to observe replay consistency/idempotency.
15. Revoke the controlled authorization.
16. Attempt to use the old refresh authority and require denial after revoke.
17. Clear direct in-process references to refresh authority and Desktop client credential.
18. Record only aggregate, sanitized evidence.

The runner permits at most two bounded history attempts in case Gmail propagation is delayed. It never expands into a mailbox scan.

## Required observations

```text
DESKTOP_CREDENTIAL_SELECTED_LOCALLY      PASS / FAIL
DESKTOP_CLIENT_ID_MATCH                  PASS / FAIL
CLIENT_SECRET_REQUIRED_BY_PROVIDER       OBSERVED
CLIENT_SECRET_PERSISTED_BY_RUNNER        0 / FAIL
CLIENT_SECRET_IN_REPO_OR_CI              0 / FAIL
REAL_OAUTH_CONSENT                       PASS / FAIL
EXACT_SCOPE                              gmail.readonly / FAIL
PKCE_S256                                PASS / FAIL
STATE_BINDING                            PASS / FAIL
CLOUD_REFRESH_AUTHORITY                  0 / FAIL
REAL_HISTORY_CURSOR                      PASS / FAIL
MESSAGES_LIST_USED                       0 / FAIL
REAL_INCREMENTAL_HISTORY                 PASS / FAIL
REAL_METADATA_GET                        PASS / FAIL
REAL_SELECTED_FULL_GET                   PASS / FAIL
REPLAY_OBSERVED                          PASS / REVIEW
REMOTE_OR_PROVIDER_REVOCATION            PASS / FAIL
OLD_REFRESH_AUTHORITY_AFTER_REVOCATION   DENIED / FAIL
RAW_GMAIL_CONTENT_IN_REPO                0 / FAIL
FINANCIAL_PLAINTEXT_IN_CI                0 / FAIL
AUTH_SECRET_IN_LOGS_OR_EVIDENCE          0 / FAIL
REQUEST_COUNT                            MEASURED
```

## Evidence identifiers

The sanitized result may retain:

- execution timestamps;
- client identity as a one-way fingerprint;
- requested scope;
- bounded request counts;
- boolean/status gate results;
- probe attempt count;
- allowlisted OAuth error code if a provider call fails.

It must not retain:

- Google credentials JSON contents or local path;
- Desktop `client_secret`;
- refresh token;
- access token;
- authorization code;
- PKCE verifier;
- Gmail message ID/body/subject;
- real amount, account number, merchant, recipient or operation reference;
- provider raw error body containing secrets or user data.

## Failure policy

Any of the following makes Level C **FAIL**, not partial success:

```text
scope broader than gmail.readonly
wrong/mismatched Desktop credentials file
state/PKCE binding cannot be demonstrated
Desktop credential must leave the local runtime
long-lived Gmail authority traverses FinanceSensor cloud
messages.list or historical sweep occurs in v3
raw financial email persists to repo/CI/evidence
401 causes uncontrolled retry
revoked authority remains usable without a documented provider grace condition
secret/token appears in logs or sanitized evidence
```

A provider/policy limitation discovered during the run reopens the relevant ADR/Q-node rather than being patched around silently.

## Evidence already obtained from red attempts

Two real Level-C attempts reached a state-bound callback and failed at token exchange before any Gmail call. A synthetic negative contract probe then reproduced `invalid_request` with no real grant and captured Google's safe diagnostic:

```text
client_secret is missing.
```

Frozen in:

`mk0/10-evidence/EV-Q003-DESKTOP-OAUTH-CLIENT-CREDENTIAL-2026-09-02.md`

## Current readiness

```text
REAL PROVIDER REACHABILITY                   PASS
REAL TRANSACTIONAL SOURCE SHAPE              PASS
GMAIL REST ADAPTER                            READY
CONTROLLED FINANCESENSOR DEV OAUTH ID         READY
CONTROLLED TEST USER                          READY
PKCE / STATE CONTRACT                         TESTED
STATE CALLBACK                                PHYSICALLY OBSERVED
DESKTOP CLIENT CREDENTIAL REQUIREMENT         PHYSICALLY OBSERVED
DESKTOP CREDENTIAL LOCAL-CUSTODY CONTRACT     TESTED / v3
LOCAL REFRESH AUTHORITY                       TESTED
SHORT-TOKEN CACHE                             TESTED
CONCURRENT REFRESH COALESCING                 TESTED
401 INVALIDATION / NO HIDDEN RETRY            TESTED
CI LONG-LIVED-AUTHORITY CUSTODY               FORBIDDEN
HISTORY-ONLY LEVEL-C PROBE                    v3
SUCCESSFUL PRODUCT TOKEN EXCHANGE             PENDING
SUCCESSFUL GMAIL LEVEL-C DATA PLANE           PENDING
```

`READY FOR AUTHORIZATION ≠ AUTHORIZED ≠ LEVEL C PASS`.
