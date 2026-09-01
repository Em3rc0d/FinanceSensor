# Q-003 — Gmail OAuth / API / Policy Feasibility

**Priority:** P0  
**Status:** OPEN

## Question

Can a public FinanceSensor app obtain and retain the Gmail access required for its intended user-benefit flow while complying with Google OAuth, restricted-scope and Limited Use requirements?

## Current evidence

Google documentation classifies Gmail content scopes such as `gmail.readonly` and `https://mail.google.com/` as restricted. IMAP over Gmail does not inherently avoid Google's OAuth/user-data policy obligations.

Primary references:

- https://developers.google.com/workspace/gmail/api/auth/scopes
- https://developers.google.com/terms/api-services-user-data-policy
- https://developers.google.com/workspace/workspace-api-user-data-developer-policy

## Architecture implication

Do not couple the product to IMAP as the universal abstraction.

Preferred interface:

```text
MailSource
├── GmailAdapter
├── MicrosoftAdapter
├── IMAPAdapter
└── LocalImportAdapter
```

For Gmail, select the narrowest production-viable permission model after policy review.

## Questions to close

1. Which exact scopes are necessary for MK0?
2. Can metadata-first filtering reduce the permission footprint or content processing?
3. What verification is required for a public consumer deployment?
4. Does the intended on-device-only processing model change security-assessment obligations?
5. What disclosure/consent wording is mandatory?
6. What are the deletion/revocation obligations?
7. Can push/history APIs reduce background polling while staying within the architecture boundary?
8. What production limits apply before and after verification?
9. Is the intended financial-monitoring use case clearly permitted under applicable-use rules?

## Non-decision

We do **not** assume that “Gmail works in development” means “Gmail is production feasible.”

## Candidate implementation spike

```text
OAuth test app
   ↓
connect test account
   ↓
request candidate minimum scope
   ↓
fetch bounded 30/90 day history
   ↓
measure metadata/content calls
   ↓
revoke access
   ↓
verify local deletion/token cleanup
```

## Closure criteria

- written mapping of feature → exact Gmail scope;
- production verification path documented;
- security-assessment applicability documented from authoritative sources;
- user consent/disclosure requirements captured;
- revocation/deletion flow specified;
- architecture updated to avoid requesting unnecessary access;
- explicit `GMAIL_FEASIBILITY PASS/FAIL` decision.
