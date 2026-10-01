# ADR-023 — Disconnect, Tenant Deletion and Backup Semantics

**Status:** ACCEPTED FOR PRODUCTION DESIGN / PHYSICAL VERIFICATION REQUIRED  
**Date:** 2026-09-02

## Context

Q-004 already proves bounded local deletion behavior, but production semantics were still ambiguous in three places:

1. whether disconnecting Gmail destroys derived financial history;
2. what “delete my FinanceSensor data” means across local devices, cloud relay/control metadata and witnesses;
3. how backups can expire without allowing deleted tenants to reappear.

Deletion is part of the product contract, not an implementation cleanup detail.

## Decision drivers

- derived financial history belongs to the user, not to Gmail;
- disconnecting a source must terminate provider authority immediately;
- destructive deletion must be explicit and separately named;
- cloud plaintext is forbidden, but ciphertext/metadata retention still needs a deterministic policy;
- backup restoration must never resurrect deleted tenant authority;
- privacy claims must be measurable.

## Decision

FinanceSensor defines **three distinct user operations**.

### 1. Disconnect Gmail

Default behavior:

```text
OAuth authority                REVOKE / DELETE
local credential               DELETE
history cursor                 DELETE
source execution identity      RESET
future Gmail retrieval         STOP
raw Gmail content              NONE RETAINED
existing derived financial state RETAIN
```

Existing `FinancialEvidence` and canonical financial state are retained because they are user-owned derived records that may already contain reconciliation, corrections and relationships independent of the source connection.

The UI must state this plainly. “Disconnect Gmail” MUST NOT secretly mean “delete my financial history”.

### 2. Disconnect Gmail and erase Gmail-derived history

This is a separate destructive operation requiring explicit user intent.

It performs the disconnect contract above and then erases the local/synchronized state whose provenance is Gmail-derived, subject to relationship-safe deletion rules. If a canonical relationship contains mixed provenance, deletion must not corrupt unrelated user-owned state; the resolver/data-model deletion contract must define the resulting tombstone/correction semantics before implementation.

### 3. Delete FinanceSensor tenant/account

The tenant deletion contract is:

```text
provider authorities                REVOKE where applicable
local protected credentials         DELETE
local encrypted stores              DESTROY
Tenant Root Key authority           DESTROY / INVALIDATE
Recovery authority                  INVALIDATE
cloud ciphertext envelopes          DELETE
cloud tenant/control metadata       DELETE except minimal deletion receipt
witness log namespaces              DELETE / RETIRE
account-linked diagnostics          DELETE
future sync/recovery authorization  DENY
```

The first safety mechanism is **cryptographic erasure**: after tenant deletion, retained backup ciphertext must not have live decryption authority.

### Deletion tombstone / resurrection barrier

A minimal non-financial deletion tombstone may be retained only for the period required to prevent asynchronous jobs or backup restoration from recreating the tenant.

It may contain:

```text
opaque tenant deletion id
protocol/schema version
deletion epoch
requested/completed timestamps
bounded operational status
```

It must not contain financial plaintext, Gmail content, OAuth authority or a reusable decryption key.

```text
BACKUP RESTORE + DELETION TOMBSTONE
→ MUST NOT RESURRECT TENANT AUTHORITY
```

### Backup contract

Before release, the selected infrastructure must support a documented finite backup retention period.

FinanceSensor sets the architecture ceiling:

```text
BACKUP_MAX_PHYSICAL_RETENTION <= 35 days
```

A provider with a longer or indeterminate applicable retention period blocks the deletion claim until the architecture or provider is changed.

Backups created before deletion may remain physically present only inside that documented retention window and only as encrypted data with destroyed/invalidated tenant decryption authority.

The product may claim **effective cryptographic deletion** before physical backup expiry only when evidence proves the relevant keys/authorities cannot be reconstructed by the service.

### Witness deletion

Append-only witness semantics apply while a tenant is active. Tenant deletion ends the freshness contract for that namespace. Witnesses must support namespace retirement/deletion according to the same disclosed lifecycle; permanent pseudonymous witness retention is not assumed harmless.

### Aggregate telemetry

Truly non-user-attributable aggregate counters may outlive tenant deletion. Account-linked telemetry, diagnostics or deletion-job traces must follow the deletion contract or be reduced to the bounded deletion receipt above.

## Options considered

### Disconnect automatically deletes derived history

Rejected. It surprises users and conflates provider authorization with ownership of already-derived financial state.

### Disconnect always retains everything with no erase option

Rejected. Users need an explicit path to remove Gmail-derived state.

### Delete cloud rows but keep live tenant keys until backups expire

Rejected. This allows backup restoration to reconstitute deleted financial state.

### Promise instantaneous physical deletion from all backups

Rejected unless a future provider can physically prove it. FinanceSensor will not advertise guarantees stronger than the underlying system can demonstrate.

## Consequences

- UX gets distinct disconnect vs erase vs tenant-delete operations;
- data model needs provenance-aware destructive deletion;
- cloud architecture must include a resurrection barrier;
- provider selection inherits a finite backup-retention requirement;
- Privacy Inspector can expose deletion phase/status without financial content;
- Q-004 remains ACTIVE until real local/mobile/network/cloud/backup evidence verifies these semantics.

## Evidence required

- real Gmail revoke + credential deletion;
- mobile filesystem/keystore inspection after disconnect;
- provenance-aware Gmail-derived erase tests;
- multi-device tenant deletion propagation;
- cloud envelope/control-metadata deletion evidence;
- witness namespace retirement/deletion evidence;
- backup retention documentation from selected provider;
- restore-from-pre-deletion-backup test proving no tenant resurrection;
- cryptographic-erasure proof showing service cannot reconstruct tenant keys;
- Privacy Inspector mapping to measured deletion state.

## Product laws

```text
DISCONNECT SOURCE != DELETE FINANCIAL HISTORY
DELETE ROW != DELETE AUTHORITY
CRYPTOGRAPHIC ERASURE != CLAIM OF PHYSICAL BACKUP ERASURE
BACKUP RESTORE != AUTHORITY RESURRECTION
DELETION CLAIM <= MEASURED EVIDENCE
```

## Supersedes / superseded by

This ADR resolves the deletion-policy branch in Q-004 and constrains Q-005 witness/recovery retention. It does not close either quarry without physical evidence.