# ADR-017 — Gmail Mobile OAuth Boundary

**Status:** PROPOSED / CONTRACT TESTED / CONTROLLED AUTHORIZATION REQUIRED  
**Date:** 2026-09-01

## Context

FinanceSensor has observed real Gmail provider reachability and transactional data reception through an already-authorized engineering connector. The product's own OAuth client has not yet been authorized.

The critical boundary is therefore not whether Gmail can return useful data; it is how FinanceSensor obtains, stores, refreshes and revokes authorization without moving Gmail authority or raw content into the cloud control plane.

## Current external facts

Google's current OAuth guidance for installed applications uses a browser/platform authorization flow and does not support the old manual copy/paste OOB pattern. Mobile loopback redirects are not the production contract for Android/iOS client types. Public clients cannot rely on an embedded client secret as a confidential credential. PKCE protects the authorization-code exchange. Public production use of restricted Gmail scopes requires the applicable Google verification path.

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
- OAuth transport must remain replaceable independently of financial parsing/resolution;
- background refresh must obey the same parasympathetic discipline as the rest of the edge runtime.

## Decision

### 1. Scope

MK0 candidate scope remains exactly:

```text
https://www.googleapis.com/auth/gmail.readonly
```

FinanceSensor does not request Gmail modify/send/delete authority for this flow. The contract test rejects a broader Gmail scope set.

### 2. Authorization ownership

```text
SYSTEM BROWSER / SUPPORTED PLATFORM GOOGLE AUTH
        ↓ authorization response bound to session
STATE + PKCE S256
        ↓
DEVICE-LOCAL OAUTH CREDENTIAL BROKER
        ↓ short-lived access token only
GmailRestProvider
        ↓
metadata-first ingestion
```

The cloud control plane does not receive the ordinary Gmail refresh token as part of normal operation.

### 3. Public-client rule

The mobile/client runtime does not depend on a confidential `client_secret`. Authorization-code exchange uses the client ID, redirect binding and PKCE verifier. A secret embedded in a distributed mobile client would not provide a meaningful confidential boundary and is not part of the accepted contract.

### 4. Mobile flow

For production mobile clients:

- use the supported Google/platform authorization mechanism for the selected platform;
- use system-browser/platform user consent;
- bind authorization to the initiating device/session;
- use `state` and PKCE S256 where the selected protocol/SDK path exposes those responsibilities;
- do not use OOB/manual copy-paste;
- do not make mobile loopback redirect the production contract;
- store long-lived refresh authority only in protected device credential storage;
- expose short-lived access tokens to the Gmail adapter only when needed.

The synthetic `oauth-native-contract.js` is a protocol/authority contract, not a claim that the final Android/iOS SDK callback plumbing has already been physically proven.

### 5. Credential broker / parasympathetic rule

`LocalOAuthCredentialProvider` owns the edge-local refresh authority and exposes only:

```text
getAccessToken()
onUnauthorized(...)
```

It implements:

```text
UNEXPIRED SHORT TOKEN
→ reuse locally
→ no network refresh

CONCURRENT TOKEN DEMAND
→ one in-flight refresh
→ callers share result

401 FROM GMAIL
→ invalidate short-token cache
→ return REAUTH_REQUIRED from current Gmail operation
→ no hidden retry
→ no refresh until a later explicit/scheduled demand
```

This prevents one Gmail API call from causing an uncontrolled refresh/retry loop and avoids refreshing on every Gmail request.

### 6. Gmail adapter boundary

`GmailRestProvider` receives only a short-lived bearer from the credential broker. The long-lived refresh credential does not cross into the Gmail provider call surface, provider call accounting or telemetry.

A 401 produces:

```text
REAUTH_REQUIRED
```

It does not blindly retry and does not echo the upstream provider body or bearer secret into its error.

### 7. CI boundary

The manual GitHub workflow is now explicitly a **bearer reachability probe**, not Level C OAuth authority.

```text
.github/workflows/gmail-live-spike.yml
```

It may receive one ephemeral access token for a controlled provider-reachability experiment. It must not become custodian of the long-lived refresh authority, authorization code, PKCE verifier or a mobile confidential secret.

This boundary is enforced by `OAUTH-013`.

### 8. MIME boundary

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

Tests:

```text
spikes/physical-ingress/test/gmail-rest-provider.test.js
spikes/physical-ingress/test/oauth-native-contract.test.js
```

Frozen properties:

```text
GMAIL-AUTH-001 dynamic short-lived token acquisition
GMAIL-AUTH-002 401 → explicit REAUTH_REQUIRED
GMAIL-AUTH-003 bearer-safe error boundary
GMAIL-MIME-001 attachment descriptors without automatic byte download

OAUTH-001 PKCE S256 + verifier bounds
OAUTH-002 exact scope + state + PKCE binding
OAUTH-003 broader Gmail scopes rejected
OAUTH-004 state mismatch fails closed
OAUTH-005 provider denial explicit
OAUTH-006 code exchange has no client secret
OAUTH-007 long-lived authority remains local
OAUTH-008 unexpired short token reused
OAUTH-009 401 invalidates cache without refreshing by itself
OAUTH-010 concurrent demand coalesces to one refresh
OAUTH-011 Gmail receives short bearer only
OAUTH-012 Gmail 401 has no hidden retry
OAUTH-013 CI cannot become long-lived OAuth authority
```

The complete physical-ingress suite remains the controlling executable evidence; test count is recorded in the evidence certificate/STATUS only after CI on the reconciled head.

## Environment separation

Testing and production Google OAuth projects remain separate. The controlled Level-C spike belongs to a DEV/testing project/account boundary and must not be treated as the eventual production OAuth configuration.

## Physical execution packet

The exact external experiment is frozen in:

`spikes/physical-ingress/OWNED-OAUTH-EXECUTION.md`

It defines preconditions, execution order, required observations, sanitized evidence and fail-closed conditions.

## Privacy impact

Credential classes remain security-sensitive. Access tokens and refresh authority are forbidden from financial telemetry and repository evidence. Gmail body/attachment plaintext remains local/transient according to Q-004.

Moving Level C into generic cloud CI merely for convenience would contradict the edge-local authority decision and is rejected.

## Remaining physical proof

ADR-017 cannot be accepted for production until at least:

```text
controlled FinanceSensor DEV OAuth identity created
controlled test user grants exactly gmail.readonly
real FinanceSensor authorization completes on controlled client runtime
real PKCE/state/platform callback path observed
platform-protected long-lived credential storage observed
adapter lists real messages
METADATA request succeeds
selected FULL request succeeds
history cursor succeeds
incremental sync succeeds
401/re-auth lifecycle observed
provider/remote revoke observed
old authority denied after revoke/disconnect
no secret logging observed
```

## Decision boundary

```text
GMAIL DATA PLANE                    EDGE-LOCAL
CLOUD REFRESH-TOKEN CUSTODY         REJECTED FOR NORMAL PATH
CI AS LEVEL-C OAUTH AUTHORITY       REJECTED
MINIMUM SCOPE                       gmail.readonly
OOB COPY/PASTE                      REJECTED
MOBILE LOOPBACK AS PROD FLOW        REJECTED
PKCE S256                           CONTRACT TESTED
STATE BINDING                       CONTRACT TESTED
CLIENT SECRET ON MOBILE             REJECTED
LOCAL CREDENTIAL BROKER             CONTRACT TESTED
SHORT-TOKEN CACHE                   CONTRACT TESTED
CONCURRENT REFRESH COALESCING       CONTRACT TESTED
401                                 INVALIDATE + REAUTH_REQUIRED
HIDDEN 401 RETRY                    REJECTED
AUTO ATTACHMENT DOWNLOAD            REJECTED
REAL PROVIDER REACHABILITY          PASS
PRODUCT OAUTH AUTHORIZATION         NOT YET EXECUTED
Q-003 / Q-004                       ACTIVE
BUILD_READY                         false
```

`CONTRACT TESTED ≠ PHYSICALLY AUTHORIZED ≠ PRODUCTION PROVEN`.
