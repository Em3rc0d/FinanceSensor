# ADR-010 — Control-plane runtime and cloud platform

**Status:** ACCEPTED FOR MK0 IMPLEMENTATION / PHYSICAL CLOUD VALIDATION REQUIRED  
**Date:** 2026-09-02

## Context

FinanceSensor needs a cloud control plane for identity, tenant/device coordination, leases, opaque E2EE synchronization, deletion barriers and operational health. The cloud is explicitly not the normal financial data plane and must not require Gmail restricted-data processing.

The platform choice remained open even though the control-plane responsibilities were already defined in `CORE-ARCHITECTURE.md`.

## Decision drivers

- PostgreSQL relational model and transactions;
- strong row-level tenant authorization;
- mobile-compatible authentication;
- lightweight server functions for control operations;
- low operational burden during product validation;
- inspectable backup/retention behavior compatible with ADR-023;
- Flutter client support;
- ability to store opaque sync envelopes without gaining decryption authority;
- no requirement to custody Google/Gmail refresh authority;
- ability to keep independent witnesses outside the relay failure domain.

## Options considered

### Firebase-first control plane

Technically viable for mobile identity/realtime workflows, but not selected because FinanceSensor's control-plane model is strongly relational: tenant membership, devices, connections, leases, epochs, revocation barriers and append-only checkpoint metadata benefit from PostgreSQL constraints and explicit transaction semantics.

### Custom Postgres + bespoke API on a general compute provider

Technically viable and preserves maximum control.

Not selected for MK0 because it introduces infrastructure/auth/operations work before those concerns differentiate the product. The architecture keeps provider boundaries explicit so this remains a future migration option.

### Supabase

Selected for the first MK0 control-plane implementation.

Current Supabase provides:

- PostgreSQL;
- Auth;
- Row Level Security integration;
- Flutter client support;
- Edge Functions;
- daily database backups on paid plans;
- documented backup retention windows of 7, 14 or up to 30 days depending on plan, within FinanceSensor's ADR-023 maximum physical retention ceiling of 35 days.

## Decision

```text
PRIMARY CONTROL-PLANE PROVIDER       Supabase
CONTROL DATABASE                     PostgreSQL
ACCOUNT AUTH                         Supabase Auth / FinanceSensor identity
TENANT AUTHORIZATION                 database ownership/membership + RLS
SERVER CONTROL LOGIC                 SQL/RPC + Edge Functions where justified
OPAQUE E2EE RELAY                    PostgreSQL initially, payload opaque
GMAIL API EXECUTION                  FORBIDDEN IN CONTROL PLANE
GMAIL REFRESH TOKEN CUSTODY          FORBIDDEN IN CONTROL PLANE
FINANCIAL PLAINTEXT                  FORBIDDEN IN NORMAL CONTROL PLANE
FINANCIAL CIPHERTEXT DECRYPTION KEY  FORBIDDEN IN CONTROL PLANE
SERVICE ROLE IN MOBILE CLIENT        FORBIDDEN
INDEPENDENT WITNESS                  OUTSIDE relay failure domain REQUIRED
```

## Identity separation

Supabase Auth identifies a FinanceSensor account/session. It does not own Gmail provider authorization.

```text
SUPABASE SESSION
  = FinanceSensor account/control-plane authentication

GOOGLE OAUTH AUTHORITY
  = device-local provider authorization under ADR-017
```

Never:

```text
Google refresh token
      ↓
Supabase Auth metadata / Postgres / Edge Function secret
```

The Gmail refresh authority remains on an authorized device in protected credential storage.

## Initial cloud schema boundary

The initial control plane may persist classes equivalent to:

```text
tenant
membership
device
device capability/control state
connection registry metadata
processing lease
sync stream / epoch metadata
opaque encrypted envelope
checkpoint header / commitment
revocation barrier
recovery coverage metadata
opaque witness binding metadata
deletion tombstone
schema/rules version
operational health metadata
```

It MUST NOT persist normal-path fields equivalent to:

```text
email body
email subject unless separately classified and explicitly approved
attachment plaintext
merchant plaintext
transaction amount plaintext
financial category plaintext
canonical financial event plaintext
Gmail refresh token
Tenant Root Key
Recovery private key
long-lived device private key
```

The machine-readable privacy inventory remains authoritative for exact classes.

## RLS and authorization law

Every tenant-scoped table exposed through the Data API MUST:

- have RLS enabled;
- include an explicit ownership/membership predicate;
- prevent cross-tenant INSERT/UPDATE reassignment;
- use both `USING` and `WITH CHECK` where updates are allowed;
- avoid authorization based on user-editable metadata;
- keep privileged/service-role credentials outside the mobile client.

`TO authenticated` alone is not sufficient tenant authorization.

Views exposed to clients must use safe RLS-preserving semantics or remain in an unexposed schema.

Security-definer functions are exceptional, not a default workaround for RLS failures.

## Edge Function boundary

Edge Functions may perform control-plane duties such as:

- signed/authorized device enrollment coordination;
- lease transitions that require server arbitration;
- deletion workflow orchestration;
- provider-independent operational webhooks;
- bounded control metadata normalization.

They MUST NOT perform normal Gmail retrieval, email parsing or financial plaintext inference.

## Opaque relay rule

The relay may know bounded metadata necessary to operate the protocol, but opaque envelopes must be untrusted ciphertext from the server's perspective.

```text
DEVICE A
  ↓ E2EE envelope
SUPABASE RELAY
  cannot decrypt financial payload
  ↓
DEVICE B
```

Relay database access, backup access or service-role access must not imply financial decryption authority.

## Witness independence

ADR-022 requires three configured witnesses, two-of-three confirmation, at least two failure domains and at least one relay-independent witness.

Therefore:

```text
SUPABASE CONTROL PLANE
  MAY host relay/control data
  MUST NOT count every witness as independent if co-resident
```

At least one witness used for production freshness evidence must be deployed outside the Supabase relay failure domain. The final topology is physically validated under Q-005.

## Backup and deletion compatibility

Current Supabase documentation describes paid-plan daily backup retention of 7/14/30 days and permanent removal of project data/backups when a project is deleted.

FinanceSensor tenant deletion cannot depend on deleting the entire shared Supabase project. Tenant deletion therefore uses ADR-023:

```text
revoke provider/device authority
      ↓
crypto-shred tenant/recovery authority
      ↓
delete tenant-scoped live cloud rows/envelopes
      ↓
retain minimized deletion tombstone during bounded backup window
      ↓
pre-delete backup restore MUST NOT resurrect authorization
```

Actual plan-specific backup/PITR configuration must be recorded before production and remain `<= 35 days` for FinanceSensor's chosen recovery configuration.

## Environment separation

Required minimum environments before release:

```text
LOCAL / TEST       synthetic only
DEVELOPMENT        synthetic/test tenants
STAGING            production-shaped, no real Gmail plaintext in cloud
PRODUCTION         real control plane under frozen policies
```

Development/staging identities and keys cannot silently become production authority.

## Provider portability

Supabase is the selected implementation provider, not a financial truth dependency.

Domain/protocol boundaries must prevent product invariants from depending on Supabase-specific IDs or APIs.

```text
SUPABASE PROJECT ID != TENANT ID
SUPABASE AUTH USER ID != CANONICAL FINANCIAL ID
POSTGRES ROW ID != FINANCIAL EVENT ID
```

A future provider migration must be possible without redefining canonical financial semantics or E2EE payload contents.

## Existing connected project

A Supabase project visible to the development environment currently exists under a generic name. This ADR does **not** claim or repurpose that project for FinanceSensor. Project/environment provisioning is a separate implementation action after the build gate permits it.

## Physical evidence required

Before cloud/security closure:

- dedicated FinanceSensor project/environment inventory;
- RLS cross-tenant negative tests;
- service-role absence from mobile binary/config;
- opaque-envelope server inspection proving no server decryption authority;
- deletion workflow and tombstone behavior;
- backup/PITR retention evidence;
- restore-from-pre-delete-backup resurrection test;
- Edge Function authorization tests;
- witness failure-domain evidence;
- cloud logs inspection for forbidden plaintext;
- Supabase security advisors clean/reviewed after schema creation.

## Consequences

Positive:

- removes a large infrastructure decision before implementation;
- relational control model maps naturally to PostgreSQL;
- strong mobile integration path;
- RLS gives a second authorization boundary in addition to protocol checks;
- current backup retention can fit ADR-023;
- server remains outside financial decryption authority.

Costs/risks:

- provider-specific operational dependency;
- RLS mistakes can create cross-tenant exposure and require aggressive negative testing;
- Supabase Auth token lifecycle is separate from Google OAuth and must never be conflated;
- shared-provider relay and witnesses require deliberate failure-domain separation;
- backup semantics must be continuously revalidated as provider plans/features change.

## External anchors reviewed

Reviewed 2026-09-02:

- Supabase Auth architecture and Flutter client documentation;
- Supabase Row Level Security / Data API security guidance;
- Supabase Edge Functions authorization guidance;
- Supabase Database Backups documentation: paid daily-backup retention 7/14/30 days and project deletion removes associated backups;
- FinanceSensor ADR-020, ADR-022 and ADR-023.

## Governing laws

```text
CLOUD_COORDINATES; DEVICE_OWNS_FINANCIAL_TRUTH
SUPABASE_AUTH != GOOGLE_OAUTH_AUTHORITY
SUPABASE_RELAY != FINANCIAL_DATA_PLANE
RLS_ROLE != TENANT_AUTHORIZATION_BY_ITSELF
SERVICE_ROLE_IN_MOBILE = FORBIDDEN
OPAQUE_RELAY_ACCESS != DECRYPTION_AUTHORITY
SAME_PROVIDER != INDEPENDENT_WITNESS
PROVIDER_SELECTED != PHYSICAL_CLOUD_PROVEN
```

## Supersedes / superseded by

Resolves ADR-010 tracked in `ADR-INDEX.md`. Physical cloud/deletion/witness evidence remains open under Q-004/Q-005.
