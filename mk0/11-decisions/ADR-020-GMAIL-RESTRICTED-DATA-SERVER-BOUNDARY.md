# ADR-020 — Gmail restricted-data server boundary

Status: ACCEPTED FOR MK0 ARCHITECTURE / GOOGLE APPLICABILITY DETERMINATION REQUIRED  
Date: 2026-09-02  
Owner: Q-003 / Q-004

## Context

FinanceSensor's minimum Gmail scope candidate is:

```text
https://www.googleapis.com/auth/gmail.readonly
```

Google currently classifies `gmail.readonly` as a Restricted scope. Public production use therefore requires restricted-scope verification unless an explicit exception applies.

Google's restricted-scope verification guidance states that an application that accesses, or has the capability to access, restricted Google user data from or through a third-party server must undergo a recurring third-party security assessment. Google also retains the final verification and assessment determination.

FinanceSensor is intentionally local-first:

```text
Google OAuth + Gmail API
        ↓
authorized user device
        ↓
metadata gate
        ↓
selected FULL only
        ↓
local extraction
        ↓
canonical financial event
        ↓
optional E2EE sync
        ↓
opaque relay
```

The remaining policy ambiguity is important: an opaque E2EE relay is materially safer than server-side Gmail processing, but FinanceSensor must not self-declare that encrypted Gmail-derived data can never count as restricted-scope data transmitted through a server.

## Decision

FinanceSensor SHALL preserve a hard boundary between Gmail authority and the cloud control plane.

### The server MUST NOT

- hold Gmail access tokens;
- hold Gmail refresh tokens;
- receive OAuth authorization codes or PKCE verifiers;
- call Gmail APIs on behalf of the user;
- receive raw Gmail bodies or attachments;
- receive Gmail Subject/header plaintext for ingestion;
- receive Gmail message/thread/history identifiers as application telemetry;
- perform server-side Gmail relevance classification;
- perform server-side financial extraction from Gmail content;
- train or improve generalized AI/ML models with raw or derived Workspace API data.

### The authorized device MAY

- hold platform-protected OAuth refresh authority;
- call Gmail directly;
- perform bounded metadata-first relevance filtering;
- retrieve selected FULL messages when required;
- derive canonical financial events locally;
- discard raw Gmail content after bounded processing according to the retention contract.

### Cross-device sync

If Gmail-derived canonical events participate in sync, the relay SHALL receive only E2EE opaque protocol material under the Q-005 boundary.

```text
RELAY CAN ROUTE CIPHERTEXT
RELAY CANNOT DECRYPT FINANCIAL TRUTH
```

This architecture decision reduces server access and assessment surface. It does **not** constitute a Google-issued exemption.

Before public production verification, FinanceSensor MUST obtain or record the applicable Google verification team's determination for the actual production data flow, including whether opaque E2EE relay of Gmail-derived canonical events places the application in security-assessment scope.

Until that determination exists, launch planning SHALL assume that a security assessment may be required.

## Automatic assessment-trigger assumptions

FinanceSensor SHALL conservatively treat security assessment as required if any production design introduces one or more of:

```text
SERVER-HOSTED GMAIL OAUTH AUTHORITY
SERVER-SIDE GMAIL API CALLS
SERVER-SIDE RAW MESSAGE PROCESSING
SERVER-SIDE HEADER/METADATA INGESTION
SERVER-DECRYPTABLE GMAIL-DERIVED DATA
SERVER-SIDE Gmail-DERIVED AI/ML PROCESSING
```

Any such change requires an ADR review and reopens Q-003/Q-004 policy analysis.

## E2EE relay ambiguity

The following statement is intentionally forbidden:

```text
E2EE CIPHERTEXT => SECURITY ASSESSMENT EXEMPT
```

That conclusion is not established by current provider evidence.

The accepted statement is:

```text
E2EE OPAQUE RELAY => MINIMIZED SERVER CAPABILITY
GOOGLE ASSESSMENT APPLICABILITY => PROVIDER DETERMINATION REQUIRED
```

## Limited Use / AI boundary

Workspace API user data and Gmail-derived data SHALL NOT be used to create, train or improve generalized/foundation AI or ML models.

A future personalized model is allowed only if it independently satisfies current Google Limited Use requirements, is scoped to the specific user/user-directed feature, and receives a separate architecture/privacy review.

MK0 does not require Gmail-derived model training.

## Verification evidence required

Before Q-003 can close for public production:

1. actual production data-flow diagram matches this ADR;
2. OAuth clients and requested scope match production behavior;
3. public verification package discloses access/use/storage/sharing accurately;
4. Google restricted-scope verification is submitted/completed as applicable;
5. security-assessment applicability for the actual production topology is recorded from the provider process;
6. if assessment is required, the required CASA/approved-assessor path is completed before launch;
7. any architecture drift that expands server capability reopens this ADR.

## Current official policy references

Reviewed 2026-09-02:

- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://support.google.com/cloud/answer/13464325
- https://support.google.com/cloud/answer/13465431
- https://support.google.com/cloud/answer/13463817
- https://support.google.com/cloud/answer/13805798

## Consequences

Positive:

- Gmail authority remains edge-local;
- backend compromise does not automatically grant mailbox authority;
- raw Gmail ingress does not become cloud application state;
- the policy ambiguity is visible and fail-closed rather than hidden behind an architectural assumption.

Costs:

- server-side Gmail ingestion is unavailable as a convenience fallback;
- multi-device behavior depends on the E2EE protocol rather than centralized plaintext reconciliation;
- public launch may still require a recurring security assessment depending on Google's determination of the actual production topology.

## Governing laws

```text
SELF-HOSTED_CI != FINANCESENSOR_TRUSTED_EDGE
EDGE-LOCAL GMAIL AUTHORITY != GOOGLE ASSESSMENT EXEMPTION
OPAQUE RELAY != PROVEN POLICY EXEMPTION
PROVIDER DETERMINATION > SELF-DECLARED EXEMPTION
LIMITED USE > MODEL CONVENIENCE
ARCHITECTURE DRIFT => POLICY RE-REVIEW
```
