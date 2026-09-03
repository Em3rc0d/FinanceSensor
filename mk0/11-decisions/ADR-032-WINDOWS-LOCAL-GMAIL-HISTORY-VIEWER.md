# ADR-032 — Windows local Gmail history viewer

**Status:** ACCEPTED FOR CONTROLLED DEV EXECUTION / REAL GMAIL PHYSICAL OPEN  
**Date:** 2026-09-03  
**Owner:** Q-003 / Gmail historical onboarding

## Context

ADR-031 freezes the semantics of historical Gmail coverage. The remaining developer need is a controlled way to exercise that contract against a real owned Gmail account and inspect the resulting derived transaction history without moving OAuth authority or raw Gmail content into GitHub, public CI or a cloud backend.

This ADR defines only the Windows DEV viewer used for that controlled execution. It does not redefine mobile custody and it does not touch iOS.

## Decision

FinanceSensor provides a Windows one-click runner:

```text
spikes/physical-ingress/live/RUN-FINANCESENSOR-GMAIL-HISTORY.cmd
```

which launches:

```text
spikes/physical-ingress/live/owned-oauth-gmail-history-viewer.mjs
```

The runner uses the existing FinanceSensor Google OAuth Desktop DEV identity. It MUST NOT create or substitute a new OAuth client.

## OAuth boundary

The requested scope is exactly:

```text
https://www.googleapis.com/auth/gmail.readonly
```

No broader Gmail scope is permitted.

The Desktop credential JSON is selected with a local file picker. Its path and contents are not written to repository evidence, dashboard output or logs.

Authorization code, PKCE verifier, access token, refresh token and Desktop client secret are process-memory authority only for this DEV viewer.

```text
TOKEN MEMORY != TOKEN DURABLE STORAGE
```

If Google returns a refresh token, it may be used in-process to keep a long historical scan alive. FinanceSensor does not durably persist that refresh token in this viewer.

## Local state

Historical derived state is stored under the current Windows user's local application-data area:

```text
%LOCALAPPDATA%\FinanceSensor\gmail-history-dev
```

The state snapshot is encrypted with:

```text
AES-256-GCM
```

The 256-bit state-encryption key is wrapped with Windows DPAPI using:

```text
DataProtectionScope.CurrentUser
```

The plaintext state key exists only transiently in the local process and is zeroed when possible after vault construction.

The encrypted snapshot may contain derived financial evidence, canonical transactions, source-id deduplication state and the temporary Gmail page cursor. It MUST NOT contain raw Gmail body content or OAuth tokens.

## Dashboard boundary

The dashboard binds only to:

```text
127.0.0.1
```

and every local API request requires an unguessable process-local session secret.

No external assets are required. Responses use `no-store` and `no-referrer` controls.

The dashboard may display the authorized mailbox and derived transaction values because it is a local user-facing surface. Those values are not repository evidence and must never be copied into CI fixtures.

## Progress semantics

While `users.messages.list` still returns a `nextPageToken`, the dashboard state is a preview:

```text
RUNNING / PAUSED / PREVIEW != COMPLETE
```

`COMPLETE` is allowed only after the historical importer reaches the end of the declared active-mailbox traversal.

The displayed product claim remains:

```text
ALL DETECTED TRANSACTION EVIDENCE
WITHIN COMPLETED GMAIL MAILBOX SCOPE
```

It MUST NOT be promoted to:

```text
ALL BANK TRANSACTIONS
```

## Resumability

A page is committed only after its messages reach terminal metadata/candidate handling and the canonical projection is rebuilt.

If the process stops after a committed page, a later controlled OAuth run may resume from the encrypted local page cursor.

If Gmail rejects that cursor, FinanceSensor restarts enumeration and relies on source-message idempotency rather than skipping an unknown range.

## Issuer coverage at this decision

Synthetic structural tests exist for:

```text
BCP
Interbank
Banco Ripley
```

Known promotional/account-management patterns remain non-transactions even when they contain currency values.

Unknown formats may be conservatively rejected or routed through the lower-authority generic receipt path. A parser miss is not permission to invent financial truth.

## Physical proof boundary

Static tests may prove:

- exact code path and scope contract;
- encrypted local vault behavior;
- fail-closed ciphertext tamper behavior;
- issuer adapter behavior on synthetic structures;
- dashboard and pagination wiring.

They do NOT prove:

- successful real OAuth for this viewer;
- completed real owned-mailbox historical coverage;
- zero raw Gmail retention as a physically measured runtime property;
- P1 revoke/refresh lifecycle closure;
- Q-003 closure.

Those remain physical/open until a controlled run produces sanitized evidence.

## iOS boundary

This ADR has no iOS implementation step.

```text
IOS_TOUCHED = 0
```

The existing deferred iOS physical debt remains unchanged.

## Governing laws

```text
VIEWER_STATIC_READY != REAL_GMAIL_PASS
PREVIEW != COMPLETE
COMPLETE_GMAIL_EVIDENCE != BANK_LEDGER_COMPLETENESS
DESKTOP_DEV_VIEWER != PRODUCTION_MOBILE_CUSTODY
TOKEN_MEMORY != TOKEN_DURABLE_STORAGE
RAW_GMAIL_BODY != DERIVED_LOCAL_STATE
DPAPI_CURRENT_USER > REPOSITORY_KEY_STORAGE
LOOPBACK_LOCAL_UI != CLOUD_FINANCIAL_PLAINTEXT
IOS_TOUCHED = 0
```
