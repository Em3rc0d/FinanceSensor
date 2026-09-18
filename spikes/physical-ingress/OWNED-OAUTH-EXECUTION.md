# FinanceSensor-owned Gmail OAuth — Level C execution packet

**Status:** READY FOR CONTROLLED EXTERNAL AUTHORIZATION — v6 REQUIRED  
**Date:** 2026-09-01  
**Reconciled:** 2026-09-02  
**Owner:** Q-003 / ADR-017 / ADR-018

## Purpose

This packet defines the physical experiment that must prove FinanceSensor's own OAuth identity can feed the existing Gmail ingress path without weakening privacy, least privilege, provenance or parasympathetic contracts.

It is not permission to move long-lived Gmail authority or the Google Desktop client credential into CI or the FinanceSensor cloud. The v6 synthetic-anchor sequence is a **controlled proof harness**, not the production initial-sync UX.

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
short-lived bearer only
        ↓
GmailRestProvider
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
/profile.historyId treated as bootstrap startHistoryId
raw Gmail content in repository evidence
raw financial literals in CI evidence
```

## Provider-contract correction from v5

The v5 physical run proved that the authorized mailbox's `/profile.historyId` advanced after a controlled inbound message while both filtered and unfiltered `history.list` calls returned zero records from that profile-derived baseline.

Current Gmail documentation states that `history.list.startHistoryId` should be obtained from the `historyId` of a **message**, **thread**, or **previous history-list response**.

Therefore:

```text
/profile.historyId
        !=
assumed bootstrap partial-sync anchor
```

ADR-018 freezes this distinction.

## Physical v6 sequence

1. Keep the credentials JSON for the existing `FinanceSensor DEV Level-C` Desktop client on the local test machine.
2. Start the packaged v6 runner; Windows opens a file picker. Cancelling stops before OAuth.
3. FinanceSensor parses only the `installed` Desktop client material and requires its `client_id` to equal the frozen public DEV Client ID.
4. Keep the Google-issued Desktop `client_secret` only in process memory; never write the credential content/path to result evidence.
5. Initiate browser authorization requesting exactly `https://www.googleapis.com/auth/gmail.readonly`.
6. Bind callback to the initiating session with `state` and PKCE S256.
7. Exchange the code through Google's token endpoint using the observed Desktop-client contract.
8. Receive short-lived access + local refresh authority; never print/persist either in the runner/evidence.
9. Call Gmail `/profile` **only to identify the exact authorized mailbox locally**. Do not use its `historyId` as `startHistoryId`.
10. Operator sends the harmless synthetic **anchor** email shown locally and waits until it is visibly present.
11. FinanceSensor performs a targeted `messages.list` search for only the random anchor subject; `maxResults=1`. This is not a historical sweep.
12. Fetch only anchor `METADATA`, requesting only `Subject`; verify the exact marker and read that **message's `historyId`**.
13. Store that message-derived `historyId` only in process memory as the Level-C baseline.
14. Operator sends the second harmless synthetic **purchase** email shown locally and waits until visible.
15. Call `history.list(startHistoryId = anchor message historyId, historyTypes=messageAdded)`.
16. Inspect at most 5 returned changed IDs per bounded attempt using `messages.get(METADATA)` with `From`, `Date`, `Subject`.
17. Require the exact synthetic purchase marker and the existing production metadata gate.
18. Call `messages.get(FULL)` for at most one selected synthetic candidate.
19. Run the existing extraction path.
20. Repeat the same supported history window once to observe replay consistency/idempotency.
21. Revoke the controlled authorization.
22. Attempt use of the old refresh authority and require denial after revoke.
23. Clear direct in-process references to OAuth authority, Desktop credential, mailbox address and history anchor.
24. Record only aggregate, sanitized evidence.

## Hard request bounds

The runner itself, not only documentation, enforces:

```text
ANCHOR LOOKUP ATTEMPTS             <= 2
ANCHOR LIST maxResults              = 1 per attempt
HISTORY PROBE ATTEMPTS             <= 2
CHANGED IDS INSPECTED              <= 5 per probe attempt
FULL FETCHES                       <= 1
HISTORICAL MAILBOX SWEEP             0
```

The one targeted `messages.list` capability exists solely to locate the random synthetic anchor needed for documented history-anchor provenance.

## Required observations

```text
DESKTOP_CREDENTIAL_SELECTED_LOCALLY        PASS / FAIL
DESKTOP_CLIENT_ID_MATCH                    PASS / FAIL
CLIENT_SECRET_REQUIRED_BY_PROVIDER         OBSERVED
CLIENT_SECRET_PERSISTED_BY_RUNNER          0 / FAIL
CLIENT_SECRET_IN_REPO_OR_CI                0 / FAIL
REAL_OAUTH_CONSENT                         PASS / FAIL
EXACT_SCOPE                                gmail.readonly / FAIL
PKCE_S256                                  PASS / FAIL
STATE_BINDING                              PASS / FAIL
CLOUD_REFRESH_AUTHORITY                    0 / FAIL
PROFILE_IDENTITY                           PASS / FAIL
PROFILE_HISTORY_USED_AS_START_HISTORY_ID   false / FAIL
TARGETED_ANCHOR_SEARCH                     PASS / FAIL
ANCHOR_METADATA                            PASS / FAIL
ANCHOR_SUBJECT_MATCH                       PASS / FAIL
SYNC_ANCHOR_SOURCE                         MESSAGE_HISTORY_ID / FAIL
REAL_INCREMENTAL_HISTORY                   PASS / FAIL
MESSAGE_ADDED_PATH                         PASS / FAIL
REAL_METADATA_GET                          PASS / FAIL
REAL_SELECTED_FULL_GET                     PASS / FAIL
EXTRACTION                                 PASS / FAIL
REPLAY_OBSERVED                            PASS / REVIEW
REMOTE_OR_PROVIDER_REVOCATION              PASS / FAIL
OLD_REFRESH_AUTHORITY_AFTER_REVOCATION     DENIED / FAIL
RAW_GMAIL_CONTENT_IN_REPO                  0 / FAIL
FINANCIAL_PLAINTEXT_IN_CI                  0 / FAIL
AUTH_SECRET_IN_LOGS_OR_EVIDENCE            0 / FAIL
REQUEST_COUNTS                             MEASURED
```

## Evidence identifiers

The sanitized result may retain execution timestamps, client identity as a one-way fingerprint, requested scope, bounded request counts, boolean/status gate results, anchor/probe attempt counts and allowlisted failure codes.

It must not retain:

- Google credentials JSON contents or local path;
- Desktop `client_secret`;
- refresh/access token;
- authorization code;
- PKCE verifier;
- authorized Gmail address;
- anchor or purchase marker;
- Gmail message ID/body/subject;
- real amount, account number, merchant, recipient or operation reference;
- raw provider error body containing secrets or user data.

## Failure policy

Any of the following makes Level C **FAIL**, not partial success:

```text
scope broader than gmail.readonly
wrong/mismatched Desktop credentials file
state/PKCE binding cannot be demonstrated
Desktop credential must leave local runtime
long-lived Gmail authority traverses FinanceSensor cloud
/profile.historyId used as bootstrap startHistoryId
anchor query expands beyond the synthetic marker
anchor lookup exceeds two attempts
anchor list maxResults exceeds one
historical mailbox sweep occurs
more than one FULL fetch occurs
raw financial email persists to repo/CI/evidence
401 causes uncontrolled retry
revoked authority remains usable without documented provider grace condition
secret/token appears in logs or sanitized evidence
```

A provider/policy limitation discovered during the run reopens the relevant ADR/Q-node rather than being patched around silently.

## Evidence obtained so far

- v1/v2: state-bound callback, token-exchange failures before Gmail reads.
- synthetic negative OAuth diagnostic: provider said `client_secret is missing.`
- v3: real OAuth/Gmail partial proof; exposed case-insensitive-header and completion/PASS bugs.
- v4: OAuth/history/revoke crossed but no changed ID reached metadata.
- v5: exact mailbox + profile history advancement proved; zero history records from profile-derived baseline exposed the sync-anchor provenance mismatch.

Frozen evidence includes:

- `mk0/10-evidence/EV-Q003-DESKTOP-OAUTH-CLIENT-CREDENTIAL-2026-09-02.md`
- `mk0/10-evidence/EV-Q003-LEVEL-C-V3-PARTIAL-2026-09-02.md`
- `mk0/10-evidence/EV-Q003-LEVEL-C-V4-HISTORY-GAP-2026-09-02.md`
- `mk0/10-evidence/EV-Q003-LEVEL-C-V5-PROFILE-HISTORY-ANCHOR-MISMATCH-2026-09-02.md`

## Current readiness

```text
REAL PROVIDER REACHABILITY                         PASS
REAL TRANSACTIONAL SOURCE SHAPE                    PASS
GMAIL REST ADAPTER                                  READY
CONTROLLED FINANCESENSOR DEV OAUTH ID               READY
CONTROLLED TEST USER                                READY
PRODUCT TOKEN EXCHANGE                              PHYSICALLY PASS
PRODUCT GMAIL PROFILE                               PHYSICALLY PASS
PRODUCT REVOCATION                                  PHYSICALLY PASS
MESSAGE-DERIVED HISTORY ANCHOR CONTRACT              TESTED / v6
TARGETED ANCHOR QUERY                               TESTED / v6
V6 RUNNER REQUEST GUARDS                            TESTED / CI
SUCCESSFUL END-TO-END LEVEL-C DATA PLANE             PENDING
```

`READY FOR AUTHORIZATION ≠ AUTHORIZED ≠ LEVEL C PASS`.

`LEVEL-C SYNTHETIC ANCHOR HARNESS ≠ PRODUCTION INITIAL-SYNC UX`.
