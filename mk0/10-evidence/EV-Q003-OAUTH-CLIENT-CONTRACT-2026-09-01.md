# EV-Q003 — FinanceSensor-owned OAuth client contract

**Date:** 2026-09-01  
**Quarry:** Q-003  
**ADR:** ADR-017  
**Evidence level:** CONTRACT / SYNTHETIC EDGE BOUNDARY, NOT PHYSICAL LEVEL C

## Claim under test

Before a FinanceSensor-owned Google OAuth identity is physically provisioned and consented, the client-side authority contract must already prove that the future Level-C path can preserve:

```text
least privilege
PKCE/state binding
public-client no-secret behavior
edge-local long-lived credential authority
short-lived bearer isolation
parasympathetic token reuse
bounded refresh concurrency
explicit 401 invalidation
no hidden retry
CI non-custody of long-lived OAuth authority
```

This evidence does **not** claim that Google has authorized FinanceSensor's own OAuth client.

## Campaign 1 — contract must initially fail

Test-only head:

`8fd51bcd41bc08c7a1c330b9fee7271e985d739a`

Result:

```text
HEARTBEAT      FAILURE
CANONICAL      98 / 98 PASS
DISTRIBUTED   116 / 116 PASS
OAUTH MODULE   MISSING AS EXPECTED
```

The new OAuth contract could not pass because `oauth-native-contract.js` did not exist. The failure was isolated to physical ingress.

## Campaign 1 repair

Implementation head:

`e32b8109b47e32c5daf7a46427aa287390684ff2`

Result:

```text
HEARTBEAT      SUCCESS
```

The first seven OAuth properties became executable:

```text
OAUTH-001 PKCE S256 + verifier bounds
OAUTH-002 exact gmail.readonly + state + PKCE authorization binding
OAUTH-003 broader Gmail scope set rejected
OAUTH-004 state mismatch fails closed
OAUTH-005 provider denial explicit
OAUTH-006 authorization-code exchange has no client secret
OAUTH-007 long-lived refresh authority remains local
```

## Campaign 2 — parasympathetic stress must initially fail

Test-only head:

`d21c4f0f0fc66254e247c70f8e1a1a67927e4ce2`

MK0 Foundation result:

```text
PHYSICAL INGRESS  40 / 43 PASS
FAILURES            3
```

Exact failures:

```text
OAUTH-008 access token was refreshed twice instead of cached
OAUTH-009 no explicit cache invalidation callback existed
OAUTH-010 concurrent callers caused two refreshes instead of one
```

Important surviving boundaries even while red:

```text
OAUTH-011 short bearer only crossed into Gmail provider     PASS
OAUTH-012 Gmail 401 did not cause hidden same-call retry    PASS
```

Canonical and distributed jobs remained green; the interruption was isolated to the intended OAuth lifecycle.

## Campaign 2 repair

Implementation head:

`1be33da3a40325f070b491a697f1b2dd5bf3b689`

Result:

```text
HEARTBEAT       SUCCESS
MK0 FOUNDATION  SUCCESS
```

Repair:

```text
unexpired access token cached locally
configurable expiry safety skew
one in-flight refresh shared by concurrent callers
401 invalidates short-token cache only
onUnauthorized does not refresh by itself
later explicit/scheduled demand may refresh
no hidden Gmail retry introduced
```

## CI authority hardening

The previous workflow name could be misread as the FinanceSensor-owned OAuth proof. It was therefore demoted explicitly to:

```text
Gmail Bearer Reachability Spike
```

It accepts an ephemeral access token only and is not Level C.

`OAUTH-013` guards that the workflow cannot silently grow named long-lived OAuth authority inputs.

## Reconciled executable head

Evidence head:

`5035906dbe6cd652c6b9e5f5b530d7e45fc3187c`

Observed MK0 Foundation physical-ingress result:

```text
TESTS  44
PASS   44
FAIL    0
```

Observed OAuth properties:

```text
OAUTH-001 PASS  PKCE S256 / verifier bounds
OAUTH-002 PASS  least-privilege authorization request + state
OAUTH-003 PASS  broader Gmail scopes rejected
OAUTH-004 PASS  state mismatch fails closed
OAUTH-005 PASS  authorization denial explicit
OAUTH-006 PASS  no client secret in public-client code exchange
OAUTH-007 PASS  long-lived authority local
OAUTH-008 PASS  unexpired short bearer reused
OAUTH-009 PASS  explicit invalidation without eager refresh
OAUTH-010 PASS  concurrent refresh coalescing
OAUTH-011 PASS  Gmail receives short bearer only
OAUTH-012 PASS  401 invalidation + no hidden retry
OAUTH-013 PASS  CI bearer probe cannot become long-lived authority
```

Associated complete baselines on the same branch family remain:

```text
CANONICAL RESOLVER       98 / 98 PASS
DISTRIBUTED / WITNESS   116 / 116 PASS
```

Heartbeat for the evidence head completed `SUCCESS`; MK0 Foundation completed successfully with all three jobs green.

## Secret/data handling

No production or test Gmail credential is embedded in these tests or in this certificate.

```text
REAL REFRESH TOKEN IN REPO        0
REAL ACCESS TOKEN IN REPO         0
REAL AUTHORIZATION CODE IN REPO   0
REAL PKCE VERIFIER IN EVIDENCE    0
REAL GMAIL CONTENT IN THIS FILE   0
REAL FINANCIAL LITERAL IN TESTS   0
```

Synthetic token strings exist only as explicit non-secret fixtures.

## What is proven

At contract/spike level:

```text
FinanceSensor can model a PKCE/state-protected public-client authorization boundary.
The Gmail adapter can consume a device-local credential broker.
Only a short-lived bearer must cross into GmailRestProvider.
Refresh authority need not enter the Gmail provider or FinanceSensor cloud.
Short-token reuse avoids a token-endpoint call for every Gmail API request.
Concurrent demand does not create a refresh stampede.
A Gmail 401 fails the current operation explicitly instead of looping.
CI is not the selected long-lived OAuth authority boundary.
```

## Explicit non-claims

Not yet proven:

```text
FinanceSensor-owned Google Cloud DEV OAuth client provisioning
real FinanceSensor consent screen
real platform callback binding
real Google authorization-code exchange for FinanceSensor identity
real refresh token stored in Android Keystore-backed application boundary
real provider refresh lifecycle using FinanceSensor-owned credential
real revoke/disconnect against FinanceSensor-owned OAuth grant
Google production OAuth verification approval
security-assessment determination for final architecture
```

## Next physical gate

Execute:

`spikes/physical-ingress/OWNED-OAUTH-EXECUTION.md`

The gate requires a controlled FinanceSensor-owned Google Cloud DEV OAuth identity plus interactive authorization on a controlled client runtime.

No available repository or CI mechanism is allowed to simulate this external ownership/consent boundary.

## Verdict

```text
OAUTH CLIENT CONTRACT      PASS AT SPIKE LEVEL
LEVEL-C EXECUTION PACKET   READY
FINANCESENSOR OAUTH GRANT  NOT YET AUTHORIZED
Q-003                      ACTIVE
BUILD_READY                false
```

`CONTRACT PASS ≠ LEVEL C PASS ≠ Q-003 CLOSED`.
