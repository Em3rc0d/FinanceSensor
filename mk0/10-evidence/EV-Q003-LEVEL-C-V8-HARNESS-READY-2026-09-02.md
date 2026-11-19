# EV-Q003 — Level C v8 harness readiness — 2026-09-02

**Owner:** Q-003  
**Evidence type:** executable harness/design readiness  
**Result:** HARNESS_READY / PHYSICAL_EXECUTION_OPEN

## Purpose

Prepare the next controlled FinanceSensor-owned Gmail execution to close three remaining physical evidence gaps from Level C v7 without widening mailbox exposure:

```text
SUCCESSFUL PHYSICAL REFRESH BEFORE REVOKE   OPEN
REQUEST/RESPONSE PAYLOAD BYTE EVIDENCE      OPEN
PER-ENDPOINT LATENCY EVIDENCE               OPEN
```

This artifact does not close those gates.

## Baseline preserved from v7

v8 retains the proven v7 acquisition bounds:

```text
scope                         gmail.readonly
historical mailbox sweep      0
Gmail Search q anchor          0
anchor list attempts          <= 2
recent INBOX IDs / attempt    <= 5
anchor Subject metadata       <= 5 / attempt
changed message IDs / probe   <= 5
probe attempts                <= 2
FULL fetches                  <= 1
/profile.historyId anchor     0
MESSAGE.historyId anchor      REQUIRED
```

## New v8 refresh proof

After the bounded financial probe reaches its complete core state, v8 performs:

```text
existing refresh authority
        ↓
real OAuth refresh_token grant
        ↓
new access_token returned
        ↓
replace old bearer in local memory
        ↓
Gmail /profile using refreshed bearer
        ↓
mailbox identity agrees locally
        ↓
SUCCESSFUL_REFRESH_BEFORE_REVOKE
        ↓
provider revoke
        ↓
refresh_token grant attempted again
        ↓
old authority must be DENIED
```

A v8 PASS therefore requires both positive and negative authority evidence:

```text
REFRESH WORKS BEFORE REVOKE
AND
REFRESH FAILS AFTER REVOKE
```

The harness does not claim that waiting for the original access token's wall-clock expiry is necessary to prove the refresh grant. Instead it proves that the provider accepts the real refresh authority, returns a new bearer and Gmail accepts that refreshed bearer.

## New network evidence

All provider HTTP calls are routed through an instrumented fetch wrapper.

Persisted evidence is aggregate only by sanitized endpoint class:

```text
tokenExchange
tokenRefresh
revoke
profile
list
metadata
full
history
```

For each class the result may contain only:

```text
request count
request body byte total
response body byte total
total elapsed milliseconds
minimum elapsed milliseconds
maximum elapsed milliseconds
HTTP status aggregate
```

Measurement definitions are explicit:

```text
REQUEST BODY BYTES
  body only
  excludes URL, query, headers and TLS framing

RESPONSE BODY BYTES
  Response.clone().arrayBuffer().byteLength

LATENCY
  fetch start through complete cloned response-body read
```

This is application-layer payload/timing evidence, not packet-level or TLS-frame accounting.

## Privacy boundary

v8 explicitly records zero durable output for:

```text
raw Gmail content
financial plaintext
OAuth secrets
credential path
anchor marker
purchase marker
mailbox address
message IDs
unrelated recent Subjects
raw HTTP payload content
HTTP URL query values
```

Endpoint names are classes, not concrete URLs containing Gmail identifiers/history IDs.

## Failure behavior

A defect was found during harness preparation: an early v8 draft could clear local authority on a partial-stop path without first revoking the provider refresh authority.

That draft was immediately corrected.

Current governing behavior:

```text
POST-AUTHORIZATION FAILURE
        ↓
BEST-EFFORT PROVIDER REVOKE
        ↓
NO PASS CLAIM
        ↓
CLEAR LOCAL AUTHORITY
        ↓
SANITIZED PARTIAL EVIDENCE
```

SIGINT/SIGTERM paths also use the best-effort revoke path before process exit when authority exists.

## Executable artifacts

- `spikes/physical-ingress/live/owned-oauth-level-c-v8.mjs`
- `spikes/physical-ingress/live/RUN-FINANCESENSOR-LEVEL-C.cmd`
- `tools/validate-level-c-v8.mjs`
- `.github/workflows/package-level-c-helper.yml`
- `.github/workflows/heartbeat.yml`

## Static guard

`tools/validate-level-c-v8.mjs` requires:

```text
BOUNDED_RECENT_INBOX
SUCCESSFUL_REFRESH_REQUIRED
REFRESHED_BEARER_GMAIL_USE_REQUIRED
FAILURE_PATH_BEST_EFFORT_REVOKE
SANITIZED_NETWORK_EVIDENCE_REQUIRED
RAW_HTTP_PAYLOAD_IN_RESULT=0
URL_QUERY_VALUES_IN_RESULT=0
```

The heartbeat additionally calls:

```text
node --check spikes/physical-ingress/live/owned-oauth-level-c-v8.mjs
node tools/validate-level-c-v8.mjs
```

## CI boundary at time of preparation

The dedicated FinanceSensor self-hosted job was still queued without an assigned runner at the latest observation.

Therefore:

```text
V8 CODE WRITTEN                    YES
V8 FAIL-CLOSED DEFECT REPAIRED     YES
V8 STATIC GUARD WIRED              YES
V8 SYNTAX CHECK IN HEARTBEAT        WIRED / NOT YET EXECUTED
V8 REAL GMAIL EXECUTION             NO
V8 NETWORK NUMBERS OBSERVED         NO
V8 SUCCESSFUL REAL REFRESH          NO
V8 PHYSICAL PASS                    NO
```

## Gate movement

Before v8 preparation:

```text
REFRESH EVIDENCE                    OPEN / NO HARNESS STEP
BYTE EVIDENCE                       OPEN / NO INSTRUMENTATION
PER-ENDPOINT LATENCY                OPEN / NO INSTRUMENTATION
```

After v8 preparation:

```text
REFRESH EVIDENCE HARNESS            READY
BYTE EVIDENCE HARNESS               READY
PER-ENDPOINT LATENCY HARNESS        READY
PHYSICAL EXECUTION                  OPEN
```

## Current decision

```text
LEVEL_C_V7                          PHYSICAL PASS
LEVEL_C_V8                          HARNESS READY / NOT EXECUTED
Q-003                               ACTIVE
BUILD_READY                         false
```

## Governing laws

```text
HARNESS_READY != PHYSICAL_PASS
STATIC_GUARD_PASS != PROVIDER_PASS
QUEUED_CI != GREEN_CI
REFRESH_BEFORE_REVOKE + DENIAL_AFTER_REVOKE > DENIAL_ONLY
AGGREGATE BYTE/TIMING EVIDENCE != RAW PAYLOAD RETENTION
LEVEL_C_V8_PASS != Q-003_CLOSED
```
