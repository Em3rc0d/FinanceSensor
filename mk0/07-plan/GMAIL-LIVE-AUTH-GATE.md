# Gmail Live Authorization Gate

**Owner:** external account authorization  
**Status:** BLOCKED_ON_CONTROLLED_AUTHORIZATION  
**Purpose:** reduce Q-003/Q-004 Level B execution to the smallest non-automatable action.

## Already prepared

```text
Gmail REST adapter             READY
one async ingress pipeline     READY
bounded list                   READY
METADATA → selected FULL       READY
historyId / incremental sync   READY
history 404 recovery           READY
privacy-safe result output     READY
remote token revoke            READY
manual isolated workflow       READY
Level A tests                  21 / 21 PASS
```

## Safety rules

- Never paste an access token into ChatGPT.
- Never commit a token, client secret or OAuth credential to GitHub.
- Do not use a personal production mailbox as the first uncontrolled experiment.
- Do not broaden scope beyond `gmail.readonly` for this spike.
- Prefer a dedicated controlled test mailbox.

## Minimal external gate

A controlled Google OAuth authorization must produce a temporary/controlled Gmail access credential for a dedicated test mailbox with candidate scope:

```text
https://www.googleapis.com/auth/gmail.readonly
```

The credential belongs only in GitHub environment:

```text
gmail-controlled-spike
  └── FINANCESENSOR_GMAIL_ACCESS_TOKEN
```

Then the prepared `Gmail Live Ingress Spike` workflow can execute without code changes.

## Evidence emitted

Aggregate operational evidence only:

```text
emails checked
FULL messages fetched
financial candidates
canonical count
review count
raw-body retention count
raw-attachment retention count
plaintext-financial-cloud counter
request counts
elapsed time
encrypted snapshot size
remote revocation result
```

Never emitted:

```text
token
message IDs
subjects
email body
merchant
amount
currency
canonical payload
```

## Closure effect

A green live run does not automatically close Q-003/Q-004. It produces Level B evidence for audit against scope, endpoint behavior, request/byte/timing observations, revoke behavior, privacy claims, Android protected-storage requirements and Google production-verification/security-assessment requirements.
