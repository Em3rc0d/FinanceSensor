# ADR-001 — Tenant as Financial Ownership Boundary

**Status:** ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL TENANT ISOLATION REQUIRED  
**Date:** 2026-09-02

## Context

FinanceSensor must distinguish authentication identity, financial ownership, device authority and source authorization. Treating all of these as the same identifier would create schema lock-in, weaken multi-device/recovery semantics and make future household/business ownership unsafe.

The core data model already separates `User`, `Tenant`, `Membership`, `Device` and `Connection`. ADR-010 selected Supabase/PostgreSQL for the control plane and requires tenant authorization through membership + RLS.

## Decision drivers

- Financial history belongs to a financial ownership boundary, not to a specific phone.
- A user authentication identity may eventually participate in more than one tenant.
- A tenant may eventually contain more than one authorized user.
- Device cryptographic authority must remain revocable independently from account membership.
- Gmail/source authorization must remain revocable independently from tenant existence.
- Cloud control-plane authorization must not become Gmail OAuth authority.
- Every durable domain row must have an unambiguous tenant scope or an explicitly documented global/system scope.

## Decision

FinanceSensor freezes the following identity model for MK0 implementation:

```text
USER        = PRODUCT AUTHENTICATION IDENTITY
TENANT      = FINANCIAL OWNERSHIP + ISOLATION BOUNDARY
MEMBERSHIP  = USER AUTHORIZATION INTO TENANT
DEVICE      = CRYPTOGRAPHIC / EXECUTION AUTHORITY
CONNECTION  = TENANT-OWNED SOURCE CONFIGURATION
CREDENTIAL  = PROTECTED DEVICE AUTHORITY, NOT TENANT IDENTITY
```

### Core laws

```text
USER != TENANT
DEVICE != TENANT
CONNECTION != TENANT
CONNECTION != DEVICE
TENANT_ID != USER_ID BY DEFINITION
AUTHENTICATED_USER != AUTHORIZED_TENANT_MEMBER
MEMBERSHIP_AUTHORIZATION != DEVICE_CRYPTO_AUTHORITY
SUPABASE_AUTH != GOOGLE_OAUTH_AUTHORITY
```

MK0 may provision exactly one owner membership for a personal tenant, but the physical schema and APIs must not encode `tenant_id == user_id` as an invariant.

## Control-plane authorization

For tenant-scoped cloud metadata:

```text
request identity
  ↓
authenticated product user
  ↓
active tenant membership
  ↓
RLS tenant predicate
  ↓
allowed row set
```

Mobile clients may use only end-user scoped credentials appropriate for RLS. Supabase service-role authority is forbidden in the mobile application under ADR-010.

## Edge authority

Tenant membership does not imply that a device may decrypt or append financial state.

A device must separately satisfy the Q-005 enrollment/key/revocation protocol.

```text
VALID MEMBERSHIP + REVOKED DEVICE = NO DEVICE AUTHORITY
VALID DEVICE KEY + REVOKED MEMBERSHIP = NO CONTROL-PLANE TENANT AUTHORIZATION
```

Both authorization dimensions must be valid where an operation requires both.

## Gmail/source authority

A Gmail connection is tenant-owned configuration, but its long-lived OAuth authority remains on the protected local edge under ADR-017/ADR-020.

Deleting or revoking a Gmail connection must not delete the tenant by implication. Deleting the tenant must revoke/delete all connection authorities under ADR-023.

## Data-model impact

Tenant-scoped domain entities must carry `tenant_id` directly or be reachable through a relation whose tenant ownership is immutable and enforceable.

Examples include:

```text
FinancialIdentity
Connection
Institution
FinancialAccount
PaymentInstrument
SourceArtifact
FinancialEvidence
FinancialEventCandidate
CanonicalFinancialEvent
RecurringPattern
Insight
Opportunity
ReviewTask
```

Globally shared catalogs, if introduced later, require a separate explicit ADR and may not silently become tenant-readable/writeable domain state.

## Rejected alternatives

### `user_id == tenant_id`

Rejected. It makes future household/multi-membership support a migration of the security boundary rather than a normal extension.

### Device as tenant

Rejected. Device replacement/revocation would destroy ownership continuity and conflict with multi-device sync/recovery.

### Gmail account as tenant

Rejected. FinanceSensor may eventually aggregate several sources and source disconnect must not destroy user-owned derived financial history.

## Security/privacy impact

This decision reduces accidental cross-tenant coupling but does not prove physical isolation.

Required production evidence still includes:

- adversarial RLS cross-tenant tests;
- service-role absence in mobile builds;
- API authorization tests for guessed/foreign tenant IDs;
- device revocation independent from membership;
- source disconnect independent from tenant deletion;
- backup/deletion behavior under ADR-023.

## Explicit non-claims

```text
TENANCY_MODEL_FROZEN != RLS_PHYSICALLY_PROVEN
RLS_POLICY_WRITTEN    != TENANT_ISOLATION_PROVEN
ONE_OWNER_MK0         != USER_ID_EQUALS_TENANT_ID
```

## Evidence / dependencies

- `mk0/05-data-model/CORE-DATA-MODEL.md`
- `mk0/11-decisions/ADR-010-CONTROL-PLANE-RUNTIME-CLOUD.md`
- `mk0/11-decisions/ADR-017-GMAIL-MOBILE-OAUTH-BOUNDARY.md`
- `mk0/11-decisions/ADR-020-GMAIL-RESTRICTED-DATA-SERVER-BOUNDARY.md`
- `mk0/11-decisions/ADR-023-DISCONNECT-DELETION-BACKUP-SEMANTICS.md`

## Revalidation triggers

Reopen ADR-001 if:

- a required product flow cannot be represented without equating user/device/source and tenant;
- real RLS implementation reveals an unresolvable tenant-authorization contradiction;
- shared/household ownership introduces requirements incompatible with Membership;
- the control-plane provider changes tenant authorization semantics materially.

## Decision summary

```text
TENANT = FINANCIAL OWNERSHIP BOUNDARY
TENANCY_MODEL = FROZEN FOR MK0 IMPLEMENTATION
PHYSICAL_TENANT_ISOLATION = OPEN
```
