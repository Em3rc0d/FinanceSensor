# EV-Q003 — Desktop OAuth Client Credential Discovery — 2026-09-02

## Purpose

Freeze the physical evidence that corrected FinanceSensor's Google Desktop OAuth token-exchange contract before any Gmail mailbox access occurred.

This certificate does **not** close Q-003. It records a red-to-understanding transition that must control the next Level-C attempt.

## Controlled environment

```text
Google Cloud project:        FinanceSensor DEV / financesensor-dev
OAuth client:                FinanceSensor DEV Level-C
OAuth application type:      Desktop
Requested Gmail scope:       https://www.googleapis.com/auth/gmail.readonly
Publishing/test boundary:    External / Testing / controlled test user
Client ID custody:           public identifier
Client secret custody:       never supplied to ChatGPT/GitHub/CI during these observations
```

The public Client ID fingerprint used by sanitized evidence is:

```text
b1a059adf97746c4
```

## Real Level-C attempt #1

Runner generation: v1.

Observed sanitized result:

```text
stateBinding                  PASS
tokenExchange requests        1
token exchange                HTTP 400
Gmail profile requests        0
messages.list                 0
METADATA                      0
FULL                          0
history                       0
result                        FAIL / TOKEN_EXCHANGE_HTTP_400
```

The authorization callback was therefore reached and state-bound, but no Gmail data-plane call occurred.

## Real Level-C attempt #2

Runner generation: v2.

v2 tightened the privacy boundary before retrying:

```text
loopback redirect             http://127.0.0.1:<ephemeral-port>
messages.list                 disabled by design
historical mailbox sweep      disabled
changed messages / attempt    <= 5
FULL fetch                    <= 1
probe attempts                <= 2
```

Observed sanitized result:

```text
schemaVersion                 2
stateBinding                  PASS
loopbackRootRedirect          true
tokenExchange requests        1
token exchange HTTP status    400
token exchange error          INVALID_REQUEST
Gmail profile requests        0
messages.list                 0
METADATA                      0
FULL                          0
history                       0
probeAttempts                 0
result                        FAIL / TOKEN_EXCHANGE_INVALID_REQUEST
```

Again, no Gmail mailbox call occurred.

## Synthetic negative contract experiment

A one-purpose GitHub Actions diagnostic was created using **no Gmail authorization, no real authorization code, no refresh token and no real client secret**. It sent the public Client ID plus:

```text
grant_type       authorization_code
redirect_uri     synthetic loopback URI
code             deliberately invalid synthetic code
code_verifier    RFC-shaped synthetic verifier
```

### Run 1

```text
workflow run: 33578788725
commit:       1d4883a82c108a2b6cc4fbfbc2a7ba9ed560033b
HTTP:         400
error:        invalid_request
```

Because the same error class appeared with a completely fake authorization code, the failure was no longer attributable to the user's real consent, Gmail account or real authorization code.

### Run 2 — safe error-description capture

```text
workflow run: 33578865259
commit:       16135a7f26634e368c525da1d2872a1cde94f9a1
HTTP:         400
error:        invalid_request
```

Google's exact safe diagnostic was:

```text
client_secret is missing.
```

No financial data or OAuth secret was involved in this diagnostic, so retaining this provider description in engineering evidence does not expose user data or credential material.

## Finding

The earlier FinanceSensor contract generalized from the public/native-client principle that a distributed client cannot rely on an embedded secret as a meaningful confidential boundary. That principle remains relevant to the future production Android/iOS design, but it did **not** accurately model the physical token endpoint behavior of this Google Desktop DEV client.

For this controlled Desktop client, the observed provider requires the Google-issued installed-client `client_secret` at token exchange. The official Gmail Node quickstart's downloaded Desktop credentials JSON is consistent with this physical behavior.

Therefore:

```text
DESKTOP DEV TOKEN EXCHANGE
= client_id + local client_secret + code + redirect_uri + PKCE verifier

PRODUCTION MOBILE CONFIDENTIALITY
!= rely on an embedded client_secret
```

These are separate boundaries.

## Corrective action

FinanceSensor Level-C v3 changes the proof harness to:

1. ask the operator to select Google's downloaded Desktop credentials JSON locally;
2. validate `installed.client_id` against the frozen public FinanceSensor DEV Client ID;
3. keep `client_secret` only in local process memory;
4. send it only to Google's token/refresh endpoint;
5. never send it to `GmailRestProvider`;
6. never commit it to GitHub or place it in CI;
7. never write it or its local file path into sanitized evidence;
8. clear direct process references when the probe ends or is interrupted;
9. retain the v2 history-only Gmail privacy limits.

Contract tests and ADR-017 are updated accordingly.

## Security / privacy accounting

During the two real failures and the synthetic diagnostics:

```text
REAL GMAIL API CALLS                     0
REAL GMAIL CONTENT WRITTEN TO EVIDENCE   0
FINANCIAL PLAINTEXT WRITTEN TO EVIDENCE  0
REAL CLIENT SECRET IN GITHUB/CI          0
REAL REFRESH TOKEN IN GITHUB/CI          0
REAL AUTHORIZATION CODE IN GITHUB/CI     0
```

The failures therefore satisfy fail-closed expectations.

## Status impact

```text
Q-003 Gmail feasibility              ACTIVE
Level A contractual ingress          PASS at prior reconciled head
Level B real provider reachability   PASS
Level C state callback               PHYSICALLY OBSERVED
Level C Desktop token exchange       BLOCKED → ROOT CAUSE IDENTIFIED → v3 REQUIRED
Gmail Level C data-plane proof       NOT YET EXECUTED
Q-004 privacy                        ACTIVE
BUILD_READY                          false
```

This evidence does not permit Q-003 closure. The next valid step is a controlled v3 execution followed by history/METADATA/FULL/replay/revocation observations.

## Engineering lesson

```text
DOCUMENTATION INTERPRETATION ≠ PROVIDER BEHAVIOR
GREEN CONTRACT TEST ≠ PHYSICAL TOKEN EXCHANGE
RED PROVIDER RESPONSE → isolate → reproduce safely → understand → repair → regress
```
