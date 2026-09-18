# EV — Gmail historical second partial run / HTTP 403 boundary

**Date:** 2026-09-03  
**Boundary:** trusted local Windows edge / Gmail historical viewer  
**Real Gmail execution:** physically observed  
**Historical coverage:** OPEN / incomplete  
**Final state:** `STOPPED_SAFE`  
**Sanitized stop class:** `GMAIL_API_HTTP_403`  
**BUILD_READY:** NO

## What was observed

A second controlled run resumed the encrypted local historical state, progressed materially beyond the prior durable checkpoint, continued producing derived financial evidence, and then stopped safely on HTTP 403 from the Gmail API.

The public evidence deliberately omits:

```text
ACCOUNT IDENTITY                          OMITTED
OAUTH CLIENT SECRET                       OMITTED
ACCESS / REFRESH TOKENS                   OMITTED
RAW GMAIL CONTENT                         OMITTED
TRANSACTION VALUES                        OMITTED
MESSAGE IDS                               OMITTED
RAW PROVIDER ERROR BODY                   OMITTED
```

The run did not reach `nextPageToken` exhaustion, so it does not prove historical completeness.

## Interpretation of HTTP 403

Google's Gmail API documentation states that HTTP 403 can represent multiple causes and that the response body's `reason` field is required to distinguish them, including usage-limit conditions such as `rateLimitExceeded` and `userRateLimitExceeded` as well as non-retryable conditions such as `domainPolicy`.

FinanceSensor therefore must not infer the exact 403 cause from the HTTP status alone.

The implementation response is fail-closed:

```text
HTTP_403_ALONE                         != RATE_LIMIT_PROVEN
HTTP_403_ALONE                         != PERMISSION_FAILURE_PROVEN
RAW_PROVIDER_BODY                      NOT PERSISTED
ALLOWLISTED_REASON_CLASSIFICATION      REQUIRED
RETRY                                  ONLY FOR EXPLICIT TRANSIENT CLASS
```

## Quota policy evidence used for hardening

The Gmail API usage-limits documentation current on 2026-09-03 states that projects under the updated May 1, 2026 quota model have:

```text
PER-USER / PER-PROJECT / PER-MINUTE    6000 quota units
users.messages.list                    5 quota units
users.messages.get                     20 quota units
```

Because the historical bootstrap performs at least one `messages.get` for each enumerated message, raw request concurrency alone is not an adequate safety control. FinanceSensor therefore introduces a method-unit governor with a local budget below the provider ceiling.

This documentation evidence does not prove that the observed 403 was a quota error. That exact classification remains open until a later physical run exposes only the allowlisted sanitized `reason` class.

## Derived-state repair finding

The second run also confirmed that several merchant labels created before the HTML-normalization fix remained visible from encrypted local state. This is expected under source-ID deduplication: the parser was fixed, but already-derived evidence was not automatically re-extracted.

The follow-up implementation may repair only such structurally invalid derived evidence by re-fetching the already-known local `sourceMessageId`. Raw Gmail content remains transient and is not added to durable state.

## Governing result

```text
REAL GMAIL PATH                         PHYSICALLY REACHED
ENCRYPTED CHECKPOINT RESUME             PHYSICALLY OBSERVED
STOPPED_SAFE                            PHYSICALLY OBSERVED
HTTP 403                                PHYSICALLY OBSERVED
EXACT 403 REASON                        OPEN
REAL HISTORICAL COVERAGE                OPEN
COMPLETE CLAIM                          NO
IOS TOUCHED                             NO
BUILD_READY                             NO
```
