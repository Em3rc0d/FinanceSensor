# EV-Q003 — Production policy refresh — 2026-09-02

**Owner:** Q-003  
**Evidence type:** current provider-policy reconciliation  
**Result:** PRODUCTION PATH NARROWED / GOOGLE REVIEW STILL REQUIRED

## Purpose

Refresh the production Gmail policy gates after the physical Level-C v7 PASS without converting development evidence into a false public-launch claim.

```text
LEVEL_C_PASS != RESTRICTED_SCOPE_APPROVED
PACKAGE_DRAFTED != PUBLIC DISCLOSURE PUBLISHED
EDGE_LOCAL != SELF-DECLARED SECURITY-ASSESSMENT EXEMPTION
```

## Official findings refreshed 2026-09-02

### 1. `gmail.readonly` remains Restricted

Google's current restricted-scope list explicitly categorizes:

```text
https://www.googleapis.com/auth/gmail.readonly
```

as a Restricted Gmail scope.

FinanceSensor therefore cannot convert the controlled DEV Level-C PASS into public-production authority without the applicable Google verification process.

Source:
- https://support.google.com/cloud/answer/13464325

### 2. `gmail.metadata` is the narrower candidate Google expects us to consider

Google's minimum-scope guidance lists `gmail.metadata` as an alternative that should be considered for monitoring/reporting scenarios.

FinanceSensor cannot downscope to metadata-only because the product must extract selected transaction facts that can exist only in message body content. This makes the body-access justification a first-class verification artifact rather than an internal assumption.

Sources:
- https://support.google.com/cloud/answer/13807380
- https://developers.google.com/identity/protocols/oauth2/scopes

### 3. Public production requires verification artifacts

Current Google guidance requires production-accurate configuration and, for sensitive/restricted scopes, scope justification plus a demo showing the OAuth grant and the product functionality enabled by the requested scope.

For external production apps, branding/domain requirements include an app homepage, privacy policy and terms links on authorized/verified domains.

Sources:
- https://support.google.com/cloud/answer/13461325
- https://support.google.com/cloud/answer/15549135
- https://support.google.com/cloud/answer/15549049
- https://support.google.com/cloud/answer/13804565

FinanceSensor response:

`mk0/07-plan/GMAIL-PRODUCTION-VERIFICATION-PACKAGE.md`

### 4. Security-assessment applicability is architecture-sensitive but provider-controlled

Google's restricted-scope verification guidance states that applications that access, or have the capability to access, restricted Google user data from or through a third-party server must undergo a recurring third-party security assessment.

FinanceSensor therefore freezes the following boundary:

```text
GMAIL AUTHORITY ON SERVER          FORBIDDEN
SERVER-SIDE Gmail API              FORBIDDEN
RAW Gmail SERVER PROCESSING        FORBIDDEN
SERVER-DECRYPTABLE Gmail DATA      FORBIDDEN
```

However, FinanceSensor also uses an E2EE relay candidate for cross-device financial state. Current public guidance does not give FinanceSensor sufficient evidence to self-declare that opaque ciphertext containing Gmail-derived canonical events is categorically outside the assessment trigger.

Therefore:

```text
E2EE OPAQUE RELAY => REDUCED SERVER CAPABILITY
E2EE OPAQUE RELAY => AUTOMATIC EXEMPTION          NOT PROVEN
GOOGLE APPLICABILITY DETERMINATION                REQUIRED
```

Sources:
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://support.google.com/cloud/answer/13465431
- https://support.google.com/cloud/answer/13463817

FinanceSensor response:

`mk0/11-decisions/ADR-020-GMAIL-RESTRICTED-DATA-SERVER-BOUNDARY.md`

### 5. Limited Use / AI boundary is stricter than a generic privacy promise

Current Google verification guidance prohibits using Workspace API user data to create, train or improve generalized/foundation AI or ML models. The restriction is relevant to raw and derived data.

FinanceSensor therefore freezes for MK0:

```text
GENERALIZED Gmail-DERIVED MODEL TRAINING    FORBIDDEN
FOUNDATION MODEL IMPROVEMENT                FORBIDDEN
AD TARGETING FROM Gmail DATA                FORBIDDEN
DATA-BROKER TRANSFER                        FORBIDDEN
CREDITWORTHINESS/LENDING USE                FORBIDDEN
```

A future personalized/user-specific AI capability requires a separate policy and architecture review against then-current Limited Use requirements.

Sources:
- https://support.google.com/cloud/answer/13805798
- https://support.google.com/cloud/answer/13463817
- https://support.google.com/cloud/answer/13806988

## Gate movement

Before this refresh:

```text
PUBLIC RESTRICTED-SCOPE VERIFICATION       OPEN
SECURITY-ASSESSMENT APPLICABILITY          OPEN
PRODUCTION CONSENT/DISCLOSURE PACKAGE      OPEN
```

After this refresh:

```text
PUBLIC RESTRICTED-SCOPE VERIFICATION       OPEN / PROVIDER EXECUTION REQUIRED
SECURITY-ASSESSMENT ARCHITECTURE BOUNDARY  FROZEN
SECURITY-ASSESSMENT PROVIDER DETERMINATION OPEN
PRODUCTION VERIFICATION PACKAGE            DRAFTED
PUBLICATION / PRODUCTION DEMO               OPEN
```

This is progress, not closure.

## What this evidence does not prove

It does not prove:

- Google approval of the FinanceSensor use case;
- approval of `gmail.readonly` for production;
- exemption from CASA/security assessment;
- production Android/iOS OAuth credential handling;
- production deletion behavior;
- public privacy-policy acceptance;
- successful annual reverification.

## New authoritative artifacts

- `mk0/11-decisions/ADR-020-GMAIL-RESTRICTED-DATA-SERVER-BOUNDARY.md`
- `mk0/07-plan/GMAIL-PRODUCTION-VERIFICATION-PACKAGE.md`

## Decision

```text
Q-003                         REMAINS ACTIVE
POLICY UNKNOWN SURFACE        REDUCED
SERVER Gmail AUTHORITY        REJECTED
PRODUCTION PACKAGE STRUCTURE  READY
GOOGLE PROVIDER REVIEW        STILL REQUIRED
```

## Governing law

```text
PROVIDER POLICY > ARCHITECTURAL WISHFUL THINKING
MINIMUM SCOPE JUSTIFICATION MUST MATCH ACTUAL FEATURE
PUBLIC DISCLOSURE MUST MATCH ACTUAL DATA FLOW
PROVIDER DETERMINATION > SELF-DECLARED EXEMPTION
LEVEL_C_PASS != Q-003_CLOSED
```
