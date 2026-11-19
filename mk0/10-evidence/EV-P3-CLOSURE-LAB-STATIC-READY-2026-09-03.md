# EV-P3 — Closure Lab + deletion resurrection barrier static readiness — 2026-09-03

**Owner:** Q-004 / Q-005 / P3  
**Evidence type:** architecture decision + machine contract + adversarial executable model  
**Result:** STATIC_READY / PROVIDER_PHYSICAL_EXECUTION_OPEN

## Purpose

Remove the circular dependency that prevented FinanceSensor from physically testing cloud privacy/deletion gates before `BUILD_READY`, while keeping product implementation and real user data blocked.

## Decisions frozen

- `ADR-029-MK0-CLOSURE-LAB-EVIDENCE-INFRASTRUCTURE.md`
- `ADR-030-DELETION-RESURRECTION-BARRIER.md`

The Closure Lab is synthetic evidence infrastructure only.

```text
CLOSURE_LAB != PRODUCTION
CLOSURE_LAB != BUILD_READY
REAL_GMAIL_IN_CLOSURE_LAB = FORBIDDEN
REAL_FINANCIAL_PLAINTEXT_IN_CLOSURE_LAB = FORBIDDEN
```

## Resurrection finding

A deletion tombstone stored only inside the primary PostgreSQL restore domain is not sufficient. A pre-delete backup can restore both the old tenant authority and the database state that predates that tombstone.

Therefore P3 requires an independent restore-domain Deletion Barrier Registry and explicit restore quarantine.

```text
PRIMARY RESTORE
  -> RESTORE_QUARANTINE
  -> independent barrier lookup

DELETED
  -> DENY

registry unavailable / ambiguous
  -> RESTORE_INDETERMINATE
  -> DENY
```

## Machine contract

`graph/p3-closure-lab.json`

It binds exactly the eight P3 physical claims from `graph/physical-closure-campaign.json` while retaining:

```text
P3 = STATIC_READY_PHYSICAL_OPEN
PROVIDER ENVIRONMENT = NOT_PROVISIONED
PHYSICAL RECEIPT = ABSENT
```

## Adversarial executable evidence

Implementation:

- `spikes/e2ee-sync/src/deletion-resurrection.js`
- `spikes/e2ee-sync/test/deletion-resurrection.test.js`
- `tools/validate-p3-closure-lab.mjs`

Negative matrix covers:

1. pre-delete backup restore cannot authorize a deleted tenant;
2. registry outage fails closed;
3. unknown registry state fails closed;
4. successful no-marker lookup only continues normal authorization checks;
5. deletion invalidates device/recovery/decryption authority before primary rows disappear.

This is bounded synthetic evidence only.

## Physical gates still open

All eight P3 claims remain physical-open:

```text
FORBIDDEN_PLAINTEXT_ABSENT_FROM_NORMAL_CLOUD_PATH
RAW_GMAIL_CONTENT_NOT_DURABLE
CLOUD_ENVELOPES_DELETED
CONTROL_METADATA_DELETED
WITNESS_NAMESPACE_RETIRED_OR_DELETED
DELETION_RESURRECTION_BARRIER_ACTIVE
PRE_DELETE_BACKUP_CANNOT_RESURRECT_AUTHORITY
BACKUP_RETENTION_WITHIN_35_DAY_CEILING
```

A dedicated Supabase Closure Lab must later physically exercise the provider properties. Provider documentation and this simulation cannot be promoted to P3 PASS.

## Cost boundary

No Supabase project, branch, PITR add-on or other paid provider resource was created by this evidence step.

Any new cost-bearing provider action remains subject to explicit cost confirmation.

## Governing laws

```text
STATIC_SIMULATION != PHYSICAL_PROVIDER_RESTORE
SAME_DB_TOMBSTONE != RESURRECTION_BARRIER
REGISTRY_UNAVAILABLE != NOT_DELETED
PROVIDER_DOCUMENTATION != PHYSICAL_BACKUP_PASS
CLOSURE_LAB_PASS != PRODUCTION_PASS
P3_PASS != Q004_Q005_CLOSED
```
