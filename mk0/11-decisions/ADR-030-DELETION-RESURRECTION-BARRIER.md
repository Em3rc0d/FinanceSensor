# ADR-030 — Restore-domain-independent Deletion Resurrection Barrier

**Status:** ACCEPTED FOR PRODUCTION DESIGN / PHYSICAL P3 VALIDATION REQUIRED  
**Date:** 2026-09-03  
**Refines:** ADR-010 and ADR-023

## Context

ADR-023 requires a deleted tenant to remain deleted even if a backup created before deletion is later restored.

A tombstone stored only in the same PostgreSQL database is insufficient:

```text
T0  tenant ACTIVE
T1  backup created
T2  tenant deleted + tombstone written in same DB
T3  restore backup from T1

result:
  tenant row returns
  pre-delete authorization state returns
  same-DB tombstone disappears
```

Therefore:

```text
SAME RESTORE DOMAIN TOMBSTONE
        !=
RESURRECTION BARRIER
```

Current Supabase documentation also makes the restore boundary material: database restores/clones can restore database and Auth state, while provider backup behavior is independent from FinanceSensor tenant-deletion semantics. FinanceSensor must provide its own tenant-level resurrection defense.

## Decision drivers

- pre-delete backup restore must not reactivate a deleted tenant;
- FinanceSensor cloud must still lack financial decryption authority;
- the barrier must contain no financial/Gmail content;
- a provider/database rollback must not be interpreted as proof that deletion never happened;
- provider outage or barrier ambiguity must fail closed rather than reactivate a tenant;
- the architecture must remain testable in a synthetic Closure Lab before production.

## Decision

FinanceSensor introduces a **Deletion Barrier Registry** outside the primary control-plane database restore domain.

Each tenant receives a cryptographically random opaque `deletion_barrier_id` before it can become production-authorized.

The primary control plane may persist that opaque identifier as minimized control metadata. It is not a financial identifier and must not encode the Supabase user id, Gmail address, tenant name or financial content.

The independent registry stores only deletion-state metadata keyed by the opaque id.

Minimum record:

```text
deletion_barrier_id    opaque random identifier
protocol_version       bounded integer/version
state                  DELETED
 deletion_epoch         monotonic tenant deletion epoch
requested_at_bucket    coarse/bounded time
completed_at_bucket    coarse/bounded time
expiry_policy          bounded retention policy identifier
```

No financial plaintext, Gmail content, OAuth authority, tenant key, recovery key or device private key may enter the registry.

## Restore-domain requirement

The registry MUST NOT be rolled back by restoration of the primary FinanceSensor Supabase database.

For the first MK0 physical design, the intended shape is a separately provisioned restore domain. A second Supabase project/database is an acceptable initial candidate because its backup/PITR lifecycle is independent from restoration of the primary project. Another provider may replace it later if it satisfies the same invariant.

```text
PRIMARY CONTROL DB RESTORE
        MUST NOT
ROLL BACK DELETION BARRIER REGISTRY
```

A different schema, table or bucket metadata row inside the same primary PostgreSQL backup domain does not satisfy this requirement by itself.

## Deletion transaction semantics

Tenant deletion is a multi-system safety workflow, not one SQL `DELETE`.

```text
1. tenant state -> DELETING
2. stop new processing leases / sync admission
3. revoke source/provider authority where applicable
4. revoke/deny device and recovery authorization
5. destroy/invalidate tenant decryption authority
6. write DELETED marker to Deletion Barrier Registry
7. read-after-write verify the barrier marker
8. delete primary cloud envelopes/control rows
9. retire/delete witness namespace according to ADR-023
10. delete account-linked diagnostics
11. tenant state -> DELETED / primary row may be removed
12. deletion completion may be acknowledged
```

If step 6 or 7 fails, deletion may continue locally for safety, but the cloud workflow MUST NOT claim globally completed deletion and MUST NOT later reactivate the tenant.

## Restore quarantine

Any restore of the primary control-plane database enters an explicit `RESTORE_QUARANTINE` state before tenant authority is trusted.

For every restored tenant capable of authorization:

```text
read deletion_barrier_id
        ↓
query independent registry
        ↓
DELETED marker found
        → DENY tenant authority
        → re-delete/quarantine restored rows

registry reachable + no marker
        → eligible for normal authorization checks

registry unavailable / ambiguous
        → RESTORE_INDETERMINATE
        → DENY / QUARANTINE
        → NEVER assume ACTIVE
```

`NO MARKER OBSERVED` is only meaningful after a successful registry query. A network failure is not evidence of absence.

## API exposure consequence

A restored PostgreSQL row must not become authoritative merely because RLS accepts an old Auth/session state.

Therefore, tenant-authorizing control paths must enforce the restore/deletion barrier before accepting sensitive control operations. Tables or RPCs whose direct Data API exposure could bypass that barrier must remain unexposed/private or otherwise prove an equivalent fail-closed barrier.

RLS remains mandatory defense in depth; it is not the resurrection barrier by itself.

## Cryptographic erasure interaction

Deletion still destroys/invalidates tenant and recovery authority under ADR-023.

This gives two independent safety layers:

```text
RESTORED CIPHERTEXT
  cannot regain service-held decryption authority

RESTORED CONTROL ROWS
  cannot regain tenant authorization because barrier says DELETED
```

A successful barrier test does not replace cryptographic-erasure proof, and cryptographic erasure does not replace authorization denial.

## Barrier retention

The barrier must remain authoritative for at least the entire period in which any applicable pre-delete backup/PITR snapshot could be restored, plus the bounded operational restore-safety interval required by the environment.

The exact environment value must be recorded and derived from provider configuration.

```text
BARRIER_RETENTION
  >= MAX_APPLICABLE_BACKUP_OR_PITR_RETENTION
   + BOUNDED_RESTORE_SAFETY_INTERVAL
```

ADR-023's `<=35 days` ceiling applies to applicable backup physical retention. It does not require deleting the minimized barrier before it is safe to do so.

After all pre-delete restore authority has expired and the safety interval closes, the barrier may itself be removed under the disclosed deletion lifecycle.

## Barrier-registry rollback risk

This ADR proves separation from **primary** database restore. It does not pretend the barrier registry can never suffer its own rollback or operator failure.

Before production, its own backup/rollback policy and independent continuity evidence must be reviewed. Q-005 witness/checkpoint work may provide stronger future anti-rollback evidence.

```text
PRIMARY RESTORE SURVIVAL   P3 PROPERTY
BARRIER REGISTRY ANTI-ROLLBACK UNDER ITS OWN DISASTER
                           RESIDUAL / Q-005 SECURITY REVIEW
```

## Physical P3 evidence required

The P3 campaign must physically demonstrate in a dedicated Closure Lab:

1. create synthetic tenant + opaque envelope/control state;
2. record a provider backup/restore point before deletion;
3. delete tenant through the complete workflow;
4. verify independent DELETED barrier marker;
5. restore the primary project/database to the pre-delete point;
6. prove restored tenant state enters quarantine;
7. prove old session/device/control state cannot authorize future activity;
8. prove cloud envelopes/control rows are re-deleted or remain inaccessible;
9. prove barrier registry outage produces fail-closed `RESTORE_INDETERMINATE`;
10. record exact backup/PITR retention and prove it is `<=35 days`.

Raw provider identifiers/secrets stay outside GitHub. Only sanitized receipt facts may be committed.

## Options rejected

### Tombstone only in primary PostgreSQL

Rejected. A pre-delete database restore can erase the tombstone.

### Rely only on cryptographic erasure

Rejected. It protects financial confidentiality but does not by itself stop restored account/control authority from becoming active again.

### Assume operator will remember deleted tenants after restore

Rejected. Human memory is not a security primitive.

### Treat registry outage as “not deleted”

Rejected. Availability failure must not resurrect authority.

## Consequences

Positive:

- P3 obtains a falsifiable resurrection-barrier design;
- backup restore cannot silently convert stale database state into active authority;
- registry stores only minimized non-financial deletion metadata;
- cloud plaintext financial boundary remains unchanged.

Costs/risks:

- additional restore-domain dependency;
- tenant admission path needs barrier awareness;
- restore operations require quarantine/reconciliation;
- barrier registry's own rollback safety becomes a residual Q-005 concern;
- physical provider restore tests may require paid backup/PITR capability.

## Governing laws

```text
DELETE ROW != DELETE AUTHORITY
SAME_DB_TOMBSTONE != RESTORE BARRIER
RESTORE_SUCCESS != TENANT_ACTIVE
REGISTRY_UNAVAILABLE != NOT_DELETED
DELETION_MARKER > RESTORED_PRE_DELETE_STATE
CRYPTO_ERASURE + AUTHORITY_BARRIER > EITHER ALONE
PHYSICAL_PROVIDER_RESTORE > SIMULATED_RESTORE CLAIM
```

## Supersedes / superseded by

Refines ADR-023's deletion tombstone into a restore-domain-independent authorization barrier. It does not close P3/Q-004/Q-005 without physical evidence.
