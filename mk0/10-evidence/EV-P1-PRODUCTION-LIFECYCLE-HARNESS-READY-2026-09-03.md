# EV-P1 — Production lifecycle harness readiness — 2026-09-03

**Owner:** Q-003 / P1  
**Evidence type:** executable harness + fail-closed static contract  
**Result:** HARNESS_READY / PHYSICAL_EXECUTION_OPEN

## Purpose

Prepare the controlled-edge execution that can close the eight P1 claims without depending on an iPhone and without promoting ambiguous provider behavior.

This artifact does **not** claim P1 physical PASS.

## Governing provider semantics

The P1 harness follows the current Google OAuth installed-app behavior:

- the authorization-code exchange returns the actually granted scopes in the `scope` field;
- refresh uses the OAuth token endpoint and must return a new access token;
- successful programmatic revocation is HTTP `200`;
- revocation may take time to propagate;
- an invalidated refresh authority can surface as OAuth `invalid_grant`.

Authoritative provider references:

- https://developers.google.com/identity/protocols/oauth2/native-app
- https://developers.google.com/identity/protocols/oauth2/policies

## Eight P1 claims

The machine contract is `graph/p1-production-lifecycle.json` and is required to match the P1 claim set in `graph/physical-closure-campaign.json` exactly:

```text
SUCCESSFUL_REFRESH_BEFORE_REVOKE
MINIMUM_SCOPE_REFRESH
REQUEST_BYTES_ACCOUNTED
RESPONSE_BYTES_ACCOUNTED
PER_ENDPOINT_LATENCY_RECORDED
PROVIDER_REVOKE_ACCEPTED
OLD_REFRESH_AUTHORITY_DENIED
NO_REAL_GMAIL_CONTENT_IN_RESULT
```

## Scope proof

Requested scope alone is not accepted as proof.

The controlled run requires:

```text
REQUESTED SCOPE
  = https://www.googleapis.com/auth/gmail.readonly

TOKEN-EXCHANGE GRANTED SCOPE
  = exactly gmail.readonly

REFRESH RESPONSE SCOPE
  = exactly gmail.readonly
```

Any additional granted scope fails the P1 minimum-scope claim.

## Revocation proof

P1 intentionally separates provider acceptance from old-authority denial:

```text
POST /revoke
    |
    +-- HTTP 200 --------------------> PROVIDER_REVOKE_ACCEPTED candidate
    |
    +-- anything else --------------> no revoke PASS

then bounded refresh attempts
    |
    +-- HTTP 400 + invalid_grant ---> OLD_REFRESH_AUTHORITY_DENIED candidate
    |
    +-- refresh still works --------> provider grace / NOT PASS
    +-- timeout/network error ------> ambiguous / NOT PASS
    +-- HTTP 5xx -------------------> ambiguous / NOT PASS
    +-- other HTTP 4xx ------------> ambiguous / NOT PASS
```

The bounded post-revoke schedule is:

```text
0 ms
1000 ms
3000 ms
7000 ms
```

The harness therefore tolerates short provider propagation delay without converting arbitrary failure into evidence.

## Production-path endpoint coverage

The run exercises sanitized endpoint classes rather than persisting concrete URLs or query values:

```text
OAuth
  tokenExchange
  tokenRefresh
  revoke

Gmail
  profile
  list
  metadata
  full
  history
```

For every exercised class the local result records only aggregate:

```text
request count
request-body bytes
response-body bytes
complete-response latency
HTTP status counts
network-error count
```

GET request-body size is explicitly measured as zero rather than omitted.

## Bounded Gmail exposure

The lifecycle run preserves the narrow synthetic path:

```text
historical mailbox sweep        NO
Gmail Search q                  NO
anchor attempts                 <= 2
recent Inbox IDs per attempt    <= 5
history message IDs             <= 5
FULL retrieval                  <= 1
FULL target                     exact synthetic marker only
```

The randomized anchor/probe values are shown locally to the operator but are not written to result evidence.

## Public evidence boundary

The raw local result is:

`financesensor-p1-production-lifecycle-result.json`

It remains controlled-edge-only and must not be uploaded to GitHub.

The result schema contains explicit zero fields for:

```text
raw Gmail content
financial plaintext
Gmail address
message IDs
history IDs
OAuth secrets
raw HTTP payload
request URLs
synthetic marker values
```

Only after a separate local validator reduces the successful run into a sanitized receipt and binds it immutably may P1 be considered for physical promotion.

## Executable artifacts

- `spikes/physical-ingress/live/owned-oauth-p1-production-lifecycle.mjs`
- `graph/p1-production-lifecycle.json`
- `tools/validate-p1-production-lifecycle.mjs`
- `tools/validate-physical-campaign.mjs`

## Current state

```text
P0                              PHYSICAL PASS
P1 HARNESS                      READY / FAIL-CLOSED
P1 STATIC CONTRACT              READY
P1 REAL PROVIDER EXECUTION      OPEN
P1 SANITIZED RECEIPT            ABSENT
P1 IMMUTABLE RECEIPT BINDING    ABSENT
P1                              PHYSICAL_EVIDENCE_REQUIRED
Q-003                           ACTIVE
BUILD_READY                     false
```

## Governing laws

```text
REQUESTED_SCOPE != GRANTED_SCOPE
REVOKE_HTTP_200 != OLD_AUTHORITY_DENIED
ANY_NON_2XX_REFRESH != REVOCATION_PROVEN
NETWORK_ERROR != REVOCATION_PROVEN
STATIC_HARNESS_PASS != PHYSICAL_P1_PASS
P1_PASS != Q003_CLOSED
```
