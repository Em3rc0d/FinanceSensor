# ADR-017 — Gmail OAuth Boundary: Desktop DEV Proof vs Production Mobile

**Status:** PROPOSED / CONTRACT TESTED / DESKTOP PROVIDER BEHAVIOR OBSERVED / CONTROLLED AUTHORIZATION REQUIRED  
**Date:** 2026-09-01  
**Reconciled:** 2026-09-02

## Context

FinanceSensor has already observed real Gmail provider reachability and transactional data reception through an already-authorized engineering connector. The remaining Q-003 boundary is the product's own OAuth identity and lifecycle.

The critical question is not whether Gmail can return useful data. It is how FinanceSensor obtains, stores, refreshes and revokes authorization without moving Gmail authority or raw content into the cloud control plane.

A controlled FinanceSensor-owned Google Cloud DEV project and Desktop OAuth client now exist. Physical Level-C attempts exposed a provider-specific fact that invalidated one earlier contract assumption: for this actual Desktop client, Google's token endpoint requires the Google-issued `client_secret` in the authorization-code exchange.

This ADR therefore distinguishes two different boundaries that must not be conflated:

1. **Desktop DEV proof client** — Google-issued installed-client credential is required by observed provider behavior and remains local to the test machine.
2. **Production Android/iOS client** — a secret embedded in a distributed mobile binary is not a meaningful confidential boundary and must not be treated as one; the final platform-supported authorization mechanism remains a separate physical proof.

## External facts and physical evidence

Current Google guidance for installed applications uses browser/platform authorization and rejects the old manual OOB copy/paste pattern. The Gmail Node quickstart instructs developers to create a Desktop OAuth client and download its credentials JSON for local authorization.

During FinanceSensor Level-C execution, two real authorization callbacks passed `state` validation but the token exchange returned HTTP 400 before any Gmail API request. A subsequent synthetic negative probe used the same public Client ID, a fake code and a valid-form verifier, with no Gmail access and no real credential. Google returned:

```text
error=invalid_request
error_description=client_secret is missing.
```

This provider observation controls the Desktop DEV spike design.

Official references:

- https://developers.google.com/identity/protocols/oauth2/native-app
- https://developers.google.com/workspace/gmail/api/quickstart/nodejs
- https://developers.google.com/identity/protocols/oauth2/policies
- https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://developers.google.com/identity/protocols/oauth2/scopes

Physical evidence certificate:

- `mk0/10-evidence/EV-Q003-DESKTOP-OAUTH-CLIENT-CREDENTIAL-2026-09-02.md`

## Decision drivers

- Gmail content remains device-local by default;
- the FinanceSensor cloud must not become the ordinary custodian of Gmail refresh credentials;
- request only the minimum scope required for MK0;
- credentials must be revocable and replaceable without corrupting financial state;
- a 401 must become explicit authorization state, not an infinite retry loop;
- bearer secrets and Desktop OAuth credentials must never appear in telemetry/error bodies/repository evidence;
- OAuth transport must remain replaceable independently of financial parsing/resolution;
- background refresh must obey the same parasympathetic discipline as the rest of the edge runtime;
- physical provider behavior overrides an untested protocol assumption.

## Decision

### 1. Scope

MK0 candidate scope remains exactly:

```text
https://www.googleapis.com/auth/gmail.readonly
```

FinanceSensor does not request Gmail modify/send/delete authority for this flow. The contract test rejects a broader Gmail scope set.

### 2. Authorization ownership

```text
SYSTEM BROWSER / SUPPORTED GOOGLE AUTH
        ↓ authorization response bound to local session
STATE + PKCE S256
        ↓
DEVICE-LOCAL OAUTH CREDENTIAL BROKER
        ↓ short-lived access token only
GmailRestProvider
        ↓
metadata-first / history-first ingestion
```

The cloud control plane does not receive the ordinary Gmail refresh token or the Desktop client credential as part of normal operation.

### 3. Desktop DEV credential boundary

For the controlled Desktop DEV client only:

```text
Google-downloaded installed-client credentials JSON
        ↓ local file selection
client_id + client_secret
        ↓ process memory only
Google authorization/token endpoint
        ↓
access token + refresh authority
```

Rules:

- the credentials JSON is selected locally by the operator;
- FinanceSensor validates that `installed.client_id` exactly matches the expected DEV Client ID;
- the Desktop `client_secret` is sent only to Google's token/refresh endpoint where the provider requires it;
- the runner does not copy the JSON, its path or its secret into evidence;
- the secret is not committed to GitHub, placed in CI, uploaded to FinanceSensor cloud, logged, or passed to `GmailRestProvider`;
- the runner clears its direct references to the secret and refresh authority when the probe ends or is interrupted;
- this local installed-client credential is not treated as a high-assurance confidential server secret.

Observed provider requirement does **not** justify moving the credential into cloud infrastructure.

### 4. Production mobile boundary

The final Android/iOS design remains separate from the Desktop proof harness.

For production mobile clients:

- use the supported Google/platform authorization mechanism for the selected platform;
- use system-browser/platform user consent;
- bind authorization to the initiating device/session;
- use `state` and PKCE S256 where the selected protocol/SDK path exposes those responsibilities;
- do not use OOB/manual copy-paste;
- do not make Desktop loopback redirect the production mobile contract;
- do not treat a secret embedded in a distributed mobile binary as a meaningful confidential boundary;
- store long-lived refresh authority only in protected device credential storage;
- expose short-lived access tokens to the Gmail adapter only when needed.

The Desktop Level-C spike proves the FinanceSensor-owned Google authorization/data boundary. It does not claim final Android/iOS callback and credential-storage behavior is physically proven.

### 5. Credential broker / parasympathetic rule

`LocalOAuthCredentialProvider` owns edge-local refresh authority and exposes only:

```text
getAccessToken()
onUnauthorized(...)
```

For the Desktop DEV proof it may also hold the Google-issued Desktop client credential in private process memory so the provider's refresh endpoint can authenticate the installed client as required.

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

### 6. Gmail adapter boundary

`GmailRestProvider` receives only a short-lived bearer from the credential broker. Neither the refresh token nor the Desktop client credential crosses into Gmail provider calls, provider call accounting or telemetry.

A Gmail 401 produces:

```text
REAUTH_REQUIRED
```

It does not blindly retry and does not echo the upstream provider body or bearer secret into its error.

### 7. CI boundary

The manual GitHub workflow remains explicitly a **bearer reachability probe**, not Level-C OAuth authority:

```text
.github/workflows/gmail-live-spike.yml
```

It may receive one ephemeral access token for a controlled provider-reachability experiment. It must not become custodian of the long-lived refresh authority, Desktop client credential, authorization code or PKCE verifier.

The temporary synthetic negative-contract workflow used no real secret and no Gmail access. Its run IDs are frozen in the evidence certificate and the workflow is removed after evidence capture so an intentionally failing diagnostic does not remain a standing CI gate.

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

Frozen properties now include:

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
OAUTH-006 Desktop DEV exchange binds PKCE + local Google-issued client credential
OAUTH-007 refresh authority + Desktop credential remain local
OAUTH-008 unexpired short token reused
OAUTH-009 401 invalidates cache without refreshing by itself
OAUTH-010 concurrent demand coalesces to one refresh
OAUTH-011 Gmail receives short bearer only; refresh/Desktop credential do not cross
OAUTH-012 Gmail 401 has no hidden retry
OAUTH-013 CI cannot become long-lived OAuth/Desktop-credential authority
OAUTH-014 credentials JSON accepted only for exact expected installed client
```

The complete physical-ingress suite remains the controlling executable evidence; test count is recorded only after CI on a reconciled head.

## Environment separation

Testing and production Google OAuth projects remain separate. The controlled Level-C spike belongs to a DEV/testing project/account boundary and must not be treated as the eventual production OAuth configuration.

## Physical execution packet

The exact external experiment is frozen in:

`spikes/physical-ingress/OWNED-OAUTH-EXECUTION.md`

## Privacy impact

Credential classes are security-sensitive. Access tokens, refresh authority and the Desktop OAuth credential are forbidden from financial telemetry, repository evidence and normal cloud custody. Gmail body/attachment plaintext remains local/transient according to Q-004.

Moving Level C into generic cloud CI merely for convenience would contradict the edge-local authority decision and is rejected.

## Remaining physical proof

ADR-017 cannot be accepted for production until at least:

```text
controlled FinanceSensor DEV OAuth identity created                 OBSERVED
controlled test user grants exactly gmail.readonly                 IN PROGRESS
real FinanceSensor authorization completes on controlled runtime   NOT YET PASS
real PKCE/state callback path observed                              STATE PASS / EXCHANGE PENDING
Desktop provider credential requirement                            OBSERVED
adapter receives profile history cursor                            PENDING
post-authorization history sync succeeds                           PENDING
METADATA request succeeds                                          PENDING
selected FULL request succeeds                                     PENDING
replay observation succeeds                                        PENDING
provider/remote revoke observed                                    PENDING
old refresh authority denied after revoke                          PENDING
no secret logging/evidence leakage observed                        PARTIAL / CONTRACT TESTED
platform-protected mobile credential storage observed              PENDING
Android/iOS production OAuth path                                  PENDING
```

## Decision boundary

```text
GMAIL DATA PLANE                         EDGE-LOCAL
CLOUD REFRESH-TOKEN CUSTODY              REJECTED FOR NORMAL PATH
CI AS LEVEL-C OAUTH AUTHORITY            REJECTED
MINIMUM SCOPE                            gmail.readonly
OOB COPY/PASTE                           REJECTED
DESKTOP LOOPBACK AS MOBILE PROD FLOW     REJECTED
PKCE S256                                CONTRACT TESTED / CALLBACK OBSERVED
STATE BINDING                            PHYSICALLY OBSERVED
DESKTOP DEV CLIENT CREDENTIAL            LOCAL-ONLY / PROVIDER-REQUIRED
CLIENT SECRET AS MOBILE CONFIDENTIALITY  REJECTED
LOCAL CREDENTIAL BROKER                  CONTRACT TESTED
SHORT-TOKEN CACHE                        CONTRACT TESTED
CONCURRENT REFRESH COALESCING            CONTRACT TESTED
401                                      INVALIDATE + REAUTH_REQUIRED
HIDDEN 401 RETRY                         REJECTED
AUTO ATTACHMENT DOWNLOAD                 REJECTED
REAL PROVIDER REACHABILITY               PASS
PRODUCT OAUTH TOKEN EXCHANGE             NOT YET PASS
Q-003 / Q-004                            ACTIVE
BUILD_READY                              false
```

`DOCUMENTED ≠ VERIFIED`.  
`PROVIDER ASSUMPTION ≠ PROVIDER EVIDENCE`.  
`DESKTOP DEV CREDENTIAL ≠ MOBILE CONFIDENTIAL SECRET`.  
`CONTRACT TESTED ≠ PHYSICALLY AUTHORIZED ≠ PRODUCTION PROVEN`.
