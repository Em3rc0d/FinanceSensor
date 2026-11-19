# Gmail / Google OAuth Sources — 2026 Snapshot

**Research snapshot:** 2026-09-01  
**Purpose:** provenance for Q-003 and Q-004.  
**Rule:** these URLs are authoritative inputs, not permanent truth. Re-check before OAuth production verification and at least once per release train involving Gmail.

## OAuth / restricted scope classification

### Restricted scopes

https://support.google.com/cloud/answer/13464325

Observed 2026-09-01:

- `https://mail.google.com/` is restricted and explicitly includes IMAP, SMTP and POP3 usage.
- `gmail.readonly` is restricted.
- `gmail.metadata` is restricted.
- `gmail.modify` and other broad Gmail scopes are restricted.

### OAuth scopes catalogue

https://developers.google.com/identity/protocols/oauth2/scopes

Use to map exact requested scope descriptions.

### Restricted-scope verification

https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification

Observed 2026-09-01:

- consumer apps requesting restricted scopes require additional verification unless an exception applies;
- apps able to access restricted data from or through a third-party server can require a Google-approved security assessment;
- minimum necessary scopes and accurate Cloud Console declarations are required.

### Unverified apps

https://support.google.com/googleapi/answer/7454865

Observed 2026-09-01:

- unverified apps using risky OAuth scopes can show warning screens and are subject to user caps;
- this is not an acceptable commercial launch strategy.

### Verification exceptions

https://support.google.com/cloud/answer/13464323

Observed 2026-09-01:

- personal-use and development/testing/staging scenarios may qualify for verification exceptions;
- production must use a separate project from dev/test according to Google policy guidance.

## Security assessment / recertification

### Security assessment

https://support.google.com/cloud/answer/13465431

Observed 2026-09-01:

- restricted-scope apps subject to assessment use Google's current CASA/App Defense Alliance process;
- assessment verifies secure data handling and user-data deletion capability.

### Annual recertification

https://support.google.com/cloud/answer/13463816

Observed 2026-09-01:

- affected restricted-scope apps complete security reassessment on a 12-month cycle from the prior Letter of Validation.

## Gmail permitted use / Limited Use

### Google Workspace user data and developer policy

https://developers.google.com/workspace/workspace-api-user-data-developer-policy

Observed 2026-09-01:

- request only permissions necessary for a visible user-benefiting feature;
- one approved Gmail family includes apps using email information for reporting/monitoring services for user benefit;
- data sale/advertising uses are prohibited;
- data transfer and secondary use are tightly constrained;
- Gmail/Workspace-derived data may not be transferred, sold or used to determine creditworthiness or for lending;
- generalized ML/AI training with Workspace user data is restricted beyond a user-specific model for the appropriate feature;
- users' deletion requests must be honored;
- secure handling in transit and at rest is required.

FinanceSensor policy interpretation remains subject to Google's review of the exact product.

## Gmail message retrieval primitives

### List messages

https://developers.google.com/workspace/gmail/api/guides/list-messages

Observed 2026-09-01:

- `messages.list` returns message IDs/thread IDs;
- `q` supports Gmail search syntax;
- `q` cannot be used with the `gmail.metadata` scope.

### Get message

https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get

Observed 2026-09-01:

- supports `format` and `metadataHeaders[]`;
- `METADATA` returns headers/labels without body;
- `FULL` returns parsed body data;
- `gmail.readonly`, `gmail.metadata`, `gmail.modify` and `mail.google.com` can authorize the method subject to format limitations.

### Format enum

https://developers.google.com/workspace/gmail/api/reference/rest/v1/Format

Observed:

- `minimal`: ID and labels;
- `metadata`: ID, labels and headers;
- `full`: parsed body/payload;
- `raw`: base64url RFC-style message;
- full/raw are unavailable under `gmail.metadata`.

## Gmail synchronization

### Synchronize clients

https://developers.google.com/workspace/gmail/api/guides/sync

Observed 2026-09-01:

- initial/recovery full sync plus incremental partial sync is the documented model;
- `history.list` supports later change retrieval;
- stale/out-of-range history IDs can return HTTP 404 and require full resynchronization.

### History list

https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list

Use for exact `startHistoryId`, pagination and history behavior.

## Gmail push notifications

### Push guide

https://developers.google.com/workspace/gmail/api/guides/push

Observed 2026-09-01:

- standard push requires a Google Cloud Pub/Sub topic;
- the Pub/Sub topic project must match the developer project used for the watch request;
- the notification payload includes an email address and mailbox `historyId`;
- watch must be renewed at least every seven days; Google recommends daily renewal.

Privacy implication: using standard push makes mailbox identity/change metadata visible to cloud infrastructure. Q-003 therefore treats push as an optional later optimization rather than an MK0 foundation requirement.

## Revalidation triggers

This snapshot is stale and must be re-mined when any of these occur:

```text
Google changes scope classification
Google changes permitted Gmail use cases
Google changes security-assessment criteria
Google changes Limited Use terms
FinanceSensor adds server-side Gmail processing
FinanceSensor adds generalized AI training from user data
FinanceSensor introduces lending/credit product decisions
FinanceSensor introduces Gmail push
OAuth production verification begins
12 months pass since last full policy review
```
