# ADR-017 — Gmail Mobile OAuth Boundary

**Status:** PROPOSED / CONTRACT TESTED / CONTROLLED AUTHORIZATION REQUIRED  
**Date:** 2026-09-01

## Context

FinanceSensor has now observed real Gmail provider reachability and transactional data reception through an already-authorized engineering connector. The product's own OAuth client has not yet been authorized.

The critical boundary is therefore not whether Gmail can return useful data; it is how FinanceSensor obtains, stores, refreshes and revokes authorization without moving Gmail authority or raw content into the cloud control plane.

## Current external facts

Google's current OAuth guidance for installed applications requires a browser-based authorization flow and no longer supports the old manual copy/paste OOB pattern. Mobile loopback redirects are deprecated for Android/iOS client types. Google recommends platform SDKs where available and supports PKCE-style authorization-code protection. Production OAuth policy requires separate testing and production projects. `gmail.readonly` remains a restricted scope and public production use requires restricted-scope verification; third-party-server handling of restricted data may trigger security-assessment requirements.

Official references:

- https://developers.google.com/identity/protocols/oauth2/native-app
- https://developers.google.com/identity/protocols/oauth2/policies
- https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://developers.google.com/identity/protocols/oauth2/scopes

## Decision drivers

- Gmail content remains device-local by default;
- the FinanceSensor cloud must not become the ordinary custodian of Gmail refresh credentials;
- request only the minimum scope required for MK0;
- credentials must be revocable and replaceable without corrupting financial state;
- a 401 must become explicit authorization state, not an infinite retry loop;
- bearer secrets must never appear in telemetry/error bodies/repository evidence;
- OAuth transport must remain replaceable independently of financial parsing/resolution.

## Decision

### 1. Scope

MK0 candidate scope remains:

```text
https://www.googleapis.com/auth/gmail.readonly
```

FinanceSensor does not request Gmail modify/send/delete authority for this flow.

### 2. Authorization ownership

```text
SYSTEM BROWSER / PLATFORM GOOGLE AUTH
        ↓
DEVICE-LOCAL OAUTH CREDENTIAL BROKER
        ↓ short-lived access token
GmailRestProvider
        ↓
metadata-first ingestion
```

The cloud control plane does not receive the ordinary Gmail refresh token as part of normal operation.

### 3. Mobile flow

For production mobile clients:

- use the supported Google/platform authorization mechanism for the platform;
- use system-browser based user consent;
- use PKCE/state protections where applicable to the selected SDK/protocol path;
- do not use OOB/manual copy-paste;
- do not make mobile loopback redirect the production contract;
- bind returned authorization to the initiating device/session;
- store refresh authority only in protected device credential storage;
- expose short-lived access tokens to the Gmail adapter only when needed.

### 4. Adapter contract

`GmailRestProvider` accepts either a bounded access token for the controlled live spike or a `credentialProvider` implementing:

```text
getAccessToken()
onUnauthorized(...)
```

The adapter does not own the long-lived refresh flow.

A 401 produces:

```text
REAUTH_REQUIRED
```

It does not blindly loop or log the upstream error body.

### 5. MIME boundary

`messages.get(FULL)` may expose MIME parts. The adapter may return metadata-only attachment descriptors:

```text
filename
mimeType
attachmentId
size
inline
contentId
```

It does not automatically call attachment-content endpoints. Raw attachment bytes remain a separate explicit policy/retention decision.

## Tested contract

`spikes/physical-ingress/test/gmail-rest-provider.test.js` freezes:

- dynamic short-lived token acquisition;
- explicit `REAUTH_REQUIRED` on 401;
- secret-safe error handling;
- attachment descriptor discovery without automatic byte download.

## Environment separation

Testing and production Google OAuth projects must remain separate. The controlled live spike belongs to a DEV/testing project/account boundary and must not be treated as the eventual production OAuth configuration.

## Privacy impact

Credential classes remain security-sensitive. Access tokens and refresh authority are forbidden from financial telemetry and repository evidence. Gmail body/attachment plaintext remains local/transient according to Q-004.

## Remaining physical proof

ADR-017 cannot be accepted for production until at least:

```text
controlled DEV OAuth client created
controlled test user grants gmail.readonly
real FinanceSensor authorization completes
adapter lists real messages
METADATA request succeeds
selected FULL request succeeds
history cursor succeeds
incremental sync succeeds
401/re-auth lifecycle observed
remote revoke observed
Android protected credential storage observed
no secret logging observed
```

## Decision boundary

```text
GMAIL DATA PLANE                EDGE-LOCAL
CLOUD REFRESH-TOKEN CUSTODY     REJECTED FOR NORMAL PATH
MINIMUM SCOPE                   gmail.readonly
OOB COPY/PASTE                  REJECTED
MOBILE LOOPBACK AS PROD FLOW    REJECTED
DYNAMIC TOKEN PROVIDER          CONTRACT TESTED
401                             REAUTH_REQUIRED
AUTO ATTACHMENT DOWNLOAD        REJECTED
REAL PROVIDER REACHABILITY      PASS
PRODUCT OAUTH AUTHORIZATION     NOT YET EXECUTED
Q-003 / Q-004                   ACTIVE
BUILD_READY                     false
```
