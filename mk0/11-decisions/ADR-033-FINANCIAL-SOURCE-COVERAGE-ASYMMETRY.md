# ADR-033 — Financial source coverage asymmetry and statement lane

**Status:** ACCEPTED FOR MK0 DESIGN / STATEMENT PHYSICAL PARSE OPEN  
**Date:** 2026-09-03

## Context

Owned-mailbox evidence shows an asymmetric financial signal. Transactional Gmail notifications provide useful evidence for purchases, transfers out, ATM withdrawals, card payments and merchant receipts, but the same mailbox must not be assumed to provide equivalent evidence for money entering savings/debit accounts.

The mailbox also contains bank statements in two operational lanes:

1. credit-card statements can arrive automatically by Gmail;
2. debit/savings statements can arrive after the user explicitly requests them from the bank.

Many statement PDFs are password protected. The password may be derived from personal identity data, so FinanceSensor must treat it as a local ephemeral secret even when the bank uses a predictable convention.

FinanceSensor is a **mobile-first product** under ADR-009. Any Windows/desktop statement runner created during MK0 exists only to obtain bounded physical evidence and to de-risk parsing/reconciliation. It is not a product surface, deployment target or authority boundary.

## Decision

FinanceSensor models financial coverage by **direction and source**, not as one global Gmail-completeness claim.

```text
NO_GMAIL_INCOME_EVIDENCE != ZERO_INCOME
OUTFLOW_COVERAGE != INFLOW_COVERAGE
GMAIL_BOOTSTRAP_COMPLETE != CASHFLOW_COMPLETE
CASHFLOW_COMPLETE REQUIRES OUTFLOW + INFLOW COVERAGE
CREDIT_STATEMENT_AUTO != DEBIT_STATEMENT_AUTO
DEBIT_STATEMENT_MANUAL_REQUEST != MANUAL_TRANSACTION_ENTRY
CARD_STATEMENT != SAVINGS_ACCOUNT_INFLOW_PROOF
WINDOWS_STATEMENT_RUNNER = MK0_EVIDENCE_HARNESS_ONLY
DESKTOP_HARNESS_PASS != MOBILE_PRODUCT_PASS
PRODUCT_STATEMENT_RUNTIME = MOBILE_DEVICE_LOCAL
```

## Mobile product boundary

The product implementation follows ADR-009:

```text
PRODUCT SURFACE
Flutter / Dart mobile app

PRIMARY PHYSICAL TARGET
Android

REQUIRED PRODUCTION TARGETS
Android + iOS

STATEMENT INGESTION
mobile device local only

FLUTTER / DART
UI + deterministic application logic + statement-domain contracts

ANDROID NATIVE BRIDGE
Kotlin for platform-owned security / credential authority

IOS NATIVE BRIDGE
Swift for platform-owned security / credential authority
```

The Windows runner in `spikes/physical-ingress/live/RUN-FINANCESENSOR-BANK-STATEMENTS.cmd` is therefore a **controlled MK0 laboratory harness**. It may prove or falsify parser, password-custody and reconciliation properties on an owned local edge, but:

- it must never ship as the FinanceSensor product;
- it must never redefine FinanceSensor as a desktop application;
- its PASS cannot promote Android/iOS statement ingestion to physical PASS;
- mobile password custody, encrypted local persistence, Gmail attachment ingestion and lifecycle behavior require their own mobile validation;
- no architecture decision may depend on Windows DPAPI being available in production.

### Source lanes

#### A. Transactional Gmail lane

Purpose: low-latency evidence where banks/merchants actually notify.

Primary strengths:
- purchases / card expenses;
- transfers out;
- ATM withdrawals where notified;
- card payments;
- merchant receipts;
- refunds/reversals where notified.

A missing incoming-money email is **not negative evidence**.

#### B. Credit statement lane

Credit-card statements delivered automatically by Gmail may be discovered by strict sender/subject/attachment adapters and used as a **reconciliation source**.

They may:
- corroborate purchases already seen in transactional Gmail;
- reveal statement-only card movements;
- reconcile fees, reversals and card-cycle totals.

They do not prove inflows into a savings/debit account.

#### C. Debit/savings statement lane

When a bank requires the user to request the statement manually, the request itself is outside FinanceSensor. Once the resulting statement reaches the trusted local edge, FinanceSensor may ingest it through the same statement pipeline.

This lane can provide both incoming and outgoing account movements and therefore supplies the missing inflow evidence needed for cash-flow reconciliation.

## Password-protected PDF boundary

```text
STATEMENT_PDF_PASSWORD              LOCAL_MEMORY_ONLY
DNI_OR_IDENTITY_DERIVED_PASSWORD    NEVER_REQUESTED_IN_CHAT
PASSWORD_PERSISTENCE                FORBIDDEN
PASSWORD_LOGGING                    FORBIDDEN
PASSWORD_CLOUD_SYNC                 FORBIDDEN
PASSWORD_GITHUB                     FORBIDDEN
RAW_ENCRYPTED_PDF_CLOUD             FORBIDDEN NORMAL PATH
RAW_DECRYPTED_PDF_DURABLE           FORBIDDEN
DECRYPTED_TEXT_DURABLE              FORBIDDEN
DERIVED_FINANCIAL_EVIDENCE          ALLOWED LOCALLY UNDER EXISTING VAULT POLICY
```

The mobile UI may ask for `Clave del PDF` locally. It must not label or assume that the value is the DNI; FinanceSensor does not need to know the password's semantic origin.

A password may be retained only for the lifetime of the local statement-import operation/session. No convenience feature may silently persist it.

## Statement ingestion boundary

```text
GMAIL ATTACHMENT OR LOCAL FILE
        ↓
STRICT STATEMENT SOURCE CLASSIFIER
        ↓
ENCRYPTED PDF BYTES (TRANSIENT)
        ↓
LOCAL MOBILE PASSWORD PROMPT
        ↓
DECRYPT/PARSE IN DEVICE MEMORY
        ↓
STATEMENT ROW NORMALIZATION
        ↓
FINANCIAL EVIDENCE
        ↓
CANONICAL RESOLVER / RECONCILIATION
        ↓
WIPE/RELEASE RAW PDF + PLAINTEXT + PASSWORD
```

Statement evidence must have an immutable source-artifact identity so replay is idempotent.

## Reconciliation laws

- a statement row matching an existing Gmail expense is corroborating evidence, not a second expense;
- a debit/savings statement credit can create `INCOME` even when Gmail has no incoming notification;
- an outgoing statement row matching a Gmail transfer is merged/reviewed according to existing resolver thresholds;
- ambiguous statement rows remain `UNKNOWN`/review; they are never forced into income or expense merely to balance totals;
- `Gmail COMPLETE` continues to mean mailbox enumeration coverage only;
- `Statement period covered` must be tracked separately per account/instrument.

## UX consequence

FinanceSensor must expose source freshness/coverage separately, for example:

```text
Gmail transactional evidence      CURRENT / PARTIAL BY PROVIDER
Credit-card statement coverage    PERIOD-BASED
Debit/savings statement coverage  PERIOD-BASED / USER-REQUEST DEPENDENT
Inflow coverage                    INCOMPLETE until statement/other source covers period
Outflow coverage                   independently measured
```

A dashboard must not show a trustworthy net cash-flow claim for a period whose inflow coverage is unknown.

The user-facing statement flow belongs inside the mobile product and should conceptually be:

```text
FinanceSensor mobile
  → Estados de cuenta
  → statement discovered / selected
  → Clave del PDF · solo esta operación
  → local parse
  → reconciliation summary
  → review ambiguous movements if needed
```

## Evidence required

Before statement ingestion can be promoted from design to physical PASS:

1. synthetic classification matrix for automatic credit and requested debit statements;
2. negative tests rejecting marketing, insurance and product-contract PDFs;
3. password non-persistence tests;
4. encrypted-PDF parser test using synthetic password-protected fixture only;
5. row normalization tests for credit and debit statement formats;
6. reconciliation tests proving no Gmail + statement double count;
7. controlled owned-edge harness showing a real statement can be decrypted and parsed without persisting password/raw plaintext;
8. Android-owned-device run proving the mobile statement flow preserves the same password/raw-content boundary;
9. iOS-owned-device run remains required before cross-platform production promotion;
10. sanitized receipt that contains no account number, DNI/password, filename hash, transaction amount or raw statement text.

A Windows harness can satisfy item 7 only. It cannot satisfy items 8 or 9.

## iOS boundary

This ADR changes no iOS code and does not close any deferred iPhone debt. iOS remains a required production target and its physical statement-ingestion proof cannot be waived by an Android or Windows result.

## Build authority

This decision does not change `BUILD_READY=false` and does not close Q-003/Q-004/Q-005.
