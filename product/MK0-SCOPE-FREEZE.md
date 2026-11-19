# FinanceSensor MK0 — Scope Freeze

**Status:** FROZEN FOR BUILD ENTRY  
**Date:** 2026-09-02  
**Governing direction:** ADR-025 / mobile-first, Android-first

## Purpose

Freeze the smallest product surface that can prove FinanceSensor's thesis without allowing implementation to expand into unrelated personal-finance features.

## Product target

```text
PRIMARY PRODUCT                  MOBILE APPLICATION
FIRST PHYSICAL TARGET           ANDROID
REQUIRED PRODUCTION TARGET      IOS
WEB IN MK0                       NO PRODUCT PARITY COMMITMENT
DESKTOP IN MK0                   NO FIRST-CLASS PRODUCT
MOBILE BI                       YES / COMPACT + DRILL-DOWN
```

## MK0 user promise

A user can connect a supported Gmail source, let FinanceSensor locally reconstruct a trustworthy bounded financial history, understand a compact financial state, inspect why the system believes each important number, and resolve ambiguous movements.

MK0 proves foundation and trust. It is not intended to be a full personal-finance suite.

## In scope — mandatory

### Identity / ownership

- product account;
- personal tenant;
- owner membership;
- device registration/enrollment foundation.

### Source lifecycle

- Gmail connection;
- least-privilege `gmail.readonly` candidate scope;
- bounded bootstrap;
- incremental sync;
- reauthorization/revocation/disconnect semantics;
- no durable raw Gmail body as normal financial storage.

### Financial truth

- minimal structured evidence;
- canonical financial-event resolution;
- idempotency and deduplication;
- income;
- expense;
- internal/external transfer semantics;
- card settlement semantics;
- refund/reversal semantics;
- unresolved/Needs Review path;
- provenance from financial state back to evidence.

### Foundation intelligence

- merchant normalization foundation;
- basic categories;
- basic recurring detection;
- period summary;
- category summary;
- movement timeline;
- compact Financial Sensor summary.

### Mobile product surface

Mandatory primary navigation:

```text
HOME
MOVEMENTS
SENSOR
YOU
```

Mandatory signature/detail surfaces:

```text
MOVEMENT DETAIL
NEEDS REVIEW
EVIDENCE / PROVENANCE DETAIL
SOURCE CONNECTION
PRIVACY INSPECTOR
DEVICE / RECOVERY ENTRY
```

Home may include compact BI-grade information where it fits the small viewport contract:

- current period balance/difference context;
- income vs. spend summary;
- compact cash-flow trend;
- top category composition;
- upcoming/recurrent context when evidence supports it;
- Sensor callout.

### Local-first/security foundation

- SQLCipher encrypted local store;
- native protected credential/key boundary;
- opaque E2EE sync foundation;
- device enrollment/revocation foundation;
- checkpoint/witness/recovery semantics from accepted ADRs;
- control-plane tenant metadata only within approved privacy classes.

## Explicitly out of MK0

The following require an MK scope reopen or a later MK:

```text
INVESTMENTS
NET-WORTH PRODUCT SURFACE
TAX / ACCOUNTING WORKFLOWS
LOAN / CREDIT RECOMMENDATIONS
ADVANCED FORECASTING
GENERAL CONVERSATIONAL FINANCIAL AI
AUTONOMOUS PAYMENTS
BROAD DIRECT-BANK CONNECTOR COVERAGE
OUTLOOK / GENERIC IMAP PRODUCT SUPPORT
OCR / RECEIPT SCANNING PRODUCT SUPPORT
DESKTOP BI AS PRIMARY PRODUCT
WEB PRODUCT PARITY
HOUSEHOLD / BUSINESS UX
SUBSCRIPTION CANCELLATION AUTOMATION
FULL BUDGETING SUITE
```

A future-proof data model is allowed. Shipping future-domain UI/business logic in MK0 is not.

## Scope change protocol

Any proposed P0/P1 product-surface expansion must answer:

1. Which MK0 closure claim requires it?
2. Which existing artifact/gate changes?
3. Does it expand sensitive-data handling?
4. Does it change the security, tenant or sync boundary?
5. Which tests/evidence must be added?

If the feature is not required to close an MK0 claim, default decision is `DEFER`.

## Build-slice mapping

```text
B0  Mobile shell + design system + synthetic BI
B1  Native security bridge skeleton
B2  SQLCipher local repository
B3  Gmail mobile OAuth protected custody
B4  Gmail bounded bootstrap + incremental ingress
B5  Canonical resolver integration
B6  Financial read models + provenance + review
B7  Control plane + tenant RLS
B8  Opaque E2EE relay + device enrollment
B9  Checkpoint / witness / revocation
B10 Recovery / deletion / backup
B11 Physical closure campaign
```

No slice may use an out-of-scope feature as justification for changing the foundation.

## Explicit non-claims

```text
SCOPE_FROZEN != BUILD_READY
SCOPE_FROZEN != Q003_Q004_Q005_CLOSED
SCOPE_FROZEN != RELEASE_SCOPE_COMPLETE
```

## Freeze decision

```text
MK0_SCOPE = FROZEN
NEW_UNJUSTIFIED_PRODUCT_SURFACE = FORBIDDEN
BUILD_READY = STILL CONTROLLED BY G-MK0
```
