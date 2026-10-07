# Gmail production verification package

**Owner:** Q-003  
**Status:** PACKAGE DRAFTED / PUBLICATION + GOOGLE REVIEW OPEN  
**Policy review:** 2026-09-02

## Purpose

This package defines the evidence FinanceSensor must have ready before requesting public production verification for the restricted Gmail scope:

```text
https://www.googleapis.com/auth/gmail.readonly
```

It is a launch gate, not a claim that Google has approved the application.

## Product claim submitted for verification

FinanceSensor is a user-directed personal-finance productivity application.

The Gmail feature lets the authorized user detect and extract transaction facts from selected transactional emails on their own device so FinanceSensor can build the user's personal financial record.

```text
Gmail
  ↓
device-local bounded acquisition
  ↓
metadata-first relevance gate
  ↓
selected message body only when necessary
  ↓
device-local transaction extraction
  ↓
user-facing personal-finance feature
```

The application does not modify, send or delete Gmail messages.

## Minimum-scope justification

Requested scope:

```text
https://www.googleapis.com/auth/gmail.readonly
```

Why `gmail.metadata` is insufficient:

- `gmail.metadata` provides message metadata/headers but not message body content;
- FinanceSensor needs selected transactional message bodies to extract values that are not reliably present in headers, including amount, merchant/payee semantics and operation/reference information;
- FULL retrieval is gated locally and is not the default acquisition mode;
- FinanceSensor does not require Gmail write operations.

Why broader scopes are unnecessary:

```text
gmail.modify        NOT REQUIRED
gmail.compose       NOT REQUIRED
gmail.insert        NOT REQUIRED
mail.google.com     NOT REQUIRED
```

## Server/data-flow disclosure

Production verification materials must match ADR-020.

```text
OAUTH REFRESH AUTHORITY      DEVICE ONLY
GMAIL API CALLS              DEVICE ONLY
RAW MESSAGE CONTENT          DEVICE ONLY / EPHEMERAL
GMAIL SERVER-SIDE PARSING    FORBIDDEN
GMAIL TOKEN CLOUD CUSTODY    FORBIDDEN
GENERALIZED AI TRAINING      FORBIDDEN
```

If Gmail-derived canonical financial events are synchronized, the relay receives only E2EE opaque protocol material. FinanceSensor must not claim that this architecture automatically exempts the product from Google's security-assessment process; provider determination remains required.

## Public web package

Before submission, publish on a verified domain owned by the project:

### 1. Product homepage

Must:

- identify FinanceSensor by the same name/brand used on the OAuth consent screen;
- describe the actual user-facing product;
- not be only a login screen;
- link prominently to the privacy policy;
- link to terms/support as required by production configuration.

### 2. Privacy policy

Must clearly disclose how FinanceSensor accesses, uses, stores and/or shares Google user data.

Required FinanceSensor-specific statements:

- Gmail access is user-authorized and used to provide the personal-finance feature;
- Gmail content is processed on the authorized device;
- raw Gmail content is not used for advertising, data brokerage, creditworthiness or lending decisions;
- raw or derived Workspace API data is not used to create, train or improve generalized/foundation AI or ML models;
- use of information received from Google APIs adheres to the Google API Services User Data Policy, including Limited Use requirements;
- deletion/disconnect behavior is described accurately;
- any E2EE synchronization behavior is described without implying that Google data is plaintext-accessible to the relay.

### 3. In-product privacy disclosure

Before or during Gmail connection, the user must be able to understand:

```text
WHAT      Gmail messages relevant to financial transactions
WHY       create/update the user's personal financial record
WHERE     processed on the authorized device
SERVER    no Gmail OAuth authority or raw Gmail processing
CONTROL   user can disconnect/revoke and delete FinanceSensor data
```

The wording shown in-product must agree with the public privacy policy and OAuth consent configuration.

## Google Auth Platform configuration

Before verification submission:

- app branding is production-accurate;
- support/developer contact addresses are current;
- authorized domains are verified;
- homepage/privacy/terms URLs use the verified domain;
- audience/publishing status matches the intended public launch;
- Data Access declares exactly the production scopes;
- no stale experimental/rejected restricted scopes remain configured;
- OAuth clients listed in the project correspond to real production clients.

## Scope justification submission

The verification submission should explain:

1. the exact FinanceSensor feature enabled by `gmail.readonly`;
2. why the feature provides an identifiable user benefit;
3. why `gmail.metadata` cannot provide selected transaction body fields;
4. why no write-capable Gmail scope is requested;
5. that retrieval is metadata-first and FULL is candidate-only;
6. that Gmail OAuth authority and Gmail API access remain device-local;
7. how deletion, revocation and disconnect are handled.

## Demo video contract

The verification demo must show the actual production application and each production OAuth client that uses the restricted scope.

Minimum sequence:

```text
FinanceSensor identity/home
        ↓
Connect Gmail
        ↓
complete OAuth consent flow in English
        ↓
consent screen shows exact app + requested scope
        ↓
return to FinanceSensor
        ↓
show the user-facing feature that requires Gmail data
        ↓
show disconnect/revoke behavior
```

The video must make the relationship between the requested scope and the visible product feature unambiguous.

## Limited Use / prohibited handling package

FinanceSensor production policy shall explicitly prohibit:

```text
Gmail-derived targeted advertising
sale to data brokers / information resellers
creditworthiness decisions
lending decisions
generalized/foundation AI training
generalized model improvement
server-side raw Gmail corpus retention
```

A future personalized/user-specific AI feature requires separate review and must remain within then-current Google Limited Use requirements.

## Security-assessment branch

Use ADR-020 as the architecture record.

```text
IF Google determines CASA/security assessment is required
    -> assessment becomes a launch-blocking gate
ELSE IF provider confirms actual topology is outside assessment trigger
    -> store provider determination as evidence
ELSE
    -> Q-003 remains OPEN
```

No self-declared exemption is sufficient.

## Deletion / disconnect evidence required

The public package and product must agree on:

- how a user disconnects Gmail;
- how OAuth authority is revoked/invalidated;
- what FinanceSensor-derived records remain after disconnect;
- how the user deletes those records;
- whether encrypted sync replicas exist and how deletion propagates;
- what operational/audit records are retained and why.

These statements must be reconciled with Q-004 and Q-005 before launch.

## Submission readiness checklist

```text
[ ] production homepage published on verified domain
[ ] privacy policy published on verified domain
[ ] terms/support published
[ ] in-product Gmail disclosure implemented
[ ] exact gmail.readonly scope configured
[ ] scope justification frozen
[ ] production OAuth clients frozen
[ ] demo video recorded against production build
[ ] disconnect/revoke behavior physically proven
[ ] deletion behavior physically proven
[ ] actual production data-flow diagram frozen
[ ] security-assessment applicability recorded from provider process
[ ] Limited Use + AI statements public
[ ] Google verification submission completed
[ ] approval/review outcome stored as evidence
```

## Current state

```text
PACKAGE STRUCTURE                 READY
POLICY SOURCES                    REFRESHED 2026-09-02
MINIMUM-SCOPE ARGUMENT            READY FOR REVIEW
LIMITED-USE STATEMENTS            READY FOR REVIEW
PUBLIC URLs                       NOT PUBLISHED
PRODUCTION MOBILE BUILD           NOT FROZEN
PRODUCTION DEMO VIDEO             NOT RECORDED
GOOGLE RESTRICTED-SCOPE REVIEW    NOT SUBMITTED
ASSESSMENT DETERMINATION          OPEN
```

## Official references reviewed 2026-09-02

- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification
- https://developers.google.com/identity/protocols/oauth2/policies
- https://support.google.com/cloud/answer/13464325
- https://support.google.com/cloud/answer/13464321
- https://support.google.com/cloud/answer/15549049
- https://support.google.com/cloud/answer/15549135
- https://support.google.com/cloud/answer/13461325
- https://support.google.com/cloud/answer/13804565
- https://support.google.com/cloud/answer/13805798
- https://support.google.com/cloud/answer/13806988
- https://support.google.com/cloud/answer/13463817

## Governing law

```text
PACKAGE DRAFTED != GOOGLE APPROVED
PUBLIC DISCLOSURE MUST MATCH ACTUAL DATA FLOW
MINIMUM SCOPE > FUTURE-PROOF SCOPE
PROVIDER DETERMINATION > SELF-DECLARED EXEMPTION
LIMITED USE > MONETIZATION OR MODEL CONVENIENCE
```
