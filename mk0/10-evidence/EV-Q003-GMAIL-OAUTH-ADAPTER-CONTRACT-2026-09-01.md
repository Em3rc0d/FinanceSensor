# EV-Q003 — Gmail OAuth Adapter Contract

**Date:** 2026-09-01  
**Owner:** Q-003 / Q-004 / S-003 / T-003  
**Evidence class:** executable transport-boundary spike  
**Production OAuth authorization:** NOT YET EXECUTED

## Purpose

Strengthen the Gmail transport boundary after real provider reachability was observed. The objective is to prove that the REST adapter can consume device-supplied short-lived credentials, fail safely when authorization expires, avoid secret reflection, and expose MIME attachment descriptors without automatically downloading attachment bytes.

## Red campaign

Tests were frozen first in:

`spikes/physical-ingress/test/gmail-rest-provider.test.js`

Red commit:

`74cb6e1c0fe57740fa3c42a9714b5038899bbc9f`

Observed:

```text
PHYSICAL INGRESS    27 / 31 PASS
NEW ASSERTIONS       0 / 4 PASS
FAIL                 4
```

Expected missing properties:

```text
GMAIL-AUTH-001 dynamic short-lived credential provider
GMAIL-AUTH-002 401 -> explicit REAUTH_REQUIRED, no infinite retry
GMAIL-AUTH-003 API error cannot reflect bearer token
GMAIL-MIME-001 descriptor-only MIME discovery without attachment download
```

## Repair

Repair commit:

`04baf88031713fba46e6e18948ed1b05774db905`

`GmailRestProvider` now supports either a controlled bounded `accessToken` or a `credentialProvider` implementing:

```text
getAccessToken()
onUnauthorized(...)
```

The adapter does not own long-lived refresh logic.

A Gmail 401 becomes:

```text
REAUTH_REQUIRED
```

The upstream error body is not copied into the thrown error, preventing accidental bearer-token reflection from becoming application telemetry/log content.

For FULL messages, the adapter recursively identifies attachment descriptors:

```text
filename
mimeType
attachmentId
size
inline
contentId
```

It does not automatically request `/attachments/{id}` bytes.

## Green result

GitHub Actions physical-ingress job on the repair commit observed:

```text
PHYSICAL INGRESS    31 / 31 PASS
FAIL                 0
```

The same MK0 Foundation run reported all three functional jobs successful:

```text
canonical-resolver  SUCCESS
e2ee-sync           SUCCESS
physical-ingress    SUCCESS
```

## What this proves

```text
DYNAMIC ACCESS-TOKEN CONTRACT        PROVEN_AT_SPIKE
EXPIRED AUTH FAILS EXPLICITLY        PROVEN_AT_SPIKE
SECRET-SAFE ADAPTER ERROR BOUNDARY   PROVEN_AT_SPIKE
MIME DESCRIPTOR DISCOVERY            PROVEN_AT_SPIKE
AUTOMATIC ATTACHMENT BYTE DOWNLOAD   0 IN TESTED PATH
```

## What this does not prove

- FinanceSensor-owned Google OAuth consent;
- actual refresh-token acquisition/rotation on Android;
- Android protected credential storage;
- production Google OAuth verification;
- production security-assessment applicability;
- every Gmail MIME topology;
- actual attachment-byte extraction policy;
- live remote revoke through FinanceSensor's own OAuth client.

## Decision

```text
REAL GMAIL PROVIDER REACHABILITY       PASS
REAL TRANSACTIONAL DATA RECEPTION      PASS
GMAIL REST ADAPTER                     READY
DEVICE CREDENTIAL PROVIDER CONTRACT    SPIKE-TESTED
FINANCESENSOR OWNED OAUTH CONSENT      WAITING FOR CONTROLLED AUTHORIZATION
Q-003                                  ACTIVE
Q-004                                  ACTIVE
BUILD_READY                            false
```
