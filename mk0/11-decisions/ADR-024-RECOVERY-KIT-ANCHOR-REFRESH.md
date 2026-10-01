# ADR-024 — Recovery Kit Checkpoint-Anchor Refresh Semantics

**Status:** ACCEPTED FOR PRODUCTION DESIGN / PHYSICAL VALIDATION REQUIRED  
**Date:** 2026-09-02

## Context

ADR-014 establishes user-held all-devices-lost recovery. ADR-015 establishes an independently retained minimum trusted checkpoint anchor. Q-005 still left one dangerous ambiguity: whether the Recovery Kit is a snapshot that must be continuously refreshed, whether an old kit is invalid, and what must happen after Recovery Key rotation.

A Recovery Kit that silently pretends to be the latest state is unsafe. A design that requires users to export a new kit after every checkpoint is unusable.

## Decision drivers

- Recovery Kit must remain useful offline;
- a stored checkpoint is a **minimum trusted anchor**, not proof of global latest state;
- ordinary sync must not require constant user export actions;
- Recovery Key rotation must make old kits unable to recover future epochs;
- post-disaster recovery must not resume without restoring future recovery coverage;
- kit staleness must degrade freshness confidence, not silently weaken rollback protection.

## Decision

### Recovery Kit role

A Recovery Kit contains or protects the user-held recovery authority plus enough non-financial metadata to identify its recovery protocol version and minimum trusted checkpoint anchor.

Conceptually:

```text
Recovery Kit
  ├─ recovery protocol/version
  ├─ opaque tenant recovery identifier
  ├─ Recovery Private Key or protected user-held representation
  ├─ Recovery Key generation/id
  ├─ minimum trusted checkpoint anchor
  └─ integrity/authenticity metadata
```

The kit MUST NOT claim that its checkpoint is globally latest.

### Normal refresh rule

The Recovery Kit is **event-driven, not checkpoint-driven**.

A new export is NOT required after every normal checkpoint. An older valid anchor may verify an authenticated append-only chain forward from that minimum point.

Therefore:

```text
STALE VALID KIT
→ MAY REQUIRE MORE FORWARD VERIFICATION
→ DOES NOT BECOME A “LATEST” CLAIM
→ DOES NOT BY ITSELF AUTHORIZE ROLLBACK
```

### Mandatory refresh events

A new Recovery Kit is mandatory when any of these occur:

```text
Recovery Key rotation
successful all-devices-lost recovery + N+1 cutover
recovery protocol/wire-format breaking change
recovery authority replacement
security response that invalidates prior recovery authority
```

The old kit becomes **historical-only** for epochs it legitimately covered. It MUST NOT recover or authorize future epochs after a Recovery Key rotation.

### Post-recovery safe-to-resume gate

ADR-014’s `SAFE_TO_RESUME_FUTURE_SYNC` gate is strengthened:

```text
N+1 Tenant Root Key rotated
N+1 Recovery Key rotated
N+1 RecoveryCoverage valid
new device authority valid
lost devices revoked
Revocation Barriers valid
recovered history/barrier commitments match
NEW N+1 RECOVERY KIT EXPORTED
NEW KIT INTEGRITY CHECK PASSED
USER CONFIRMED RECOVERY KIT CUSTODY
        ↓
SAFE_TO_RESUME_FUTURE_SYNC
```

FinanceSensor must not complete a disaster-recovery flow that restores sync but leaves the user without a viable future recovery artifact.

### Freshness during recovery

```text
kit anchor + valid forward checkpoint chain
→ CONSISTENT_FROM_KIT_ANCHOR

kit anchor + quorum witness confirmation
→ WITNESS_CONFIRMED_THROUGH_N (subject to ADR-022)

kit anchor + witnesses unavailable
→ latestGlobalFreshness = UNPROVEN

valid contradictory witness/checkpoint evidence
→ FAIL CLOSED / INVESTIGATION REQUIRED
```

An old-but-valid kit is therefore safe as a minimum anchor but may provide weaker freshness evidence when independent witnesses are unavailable.

### Suggested refresh UX

FinanceSensor may recommend a voluntary Recovery Kit refresh when the stored anchor becomes old by time or checkpoint distance, but the exact reminder threshold is a UX/operations parameter rather than a cryptographic validity rule.

The UI must distinguish:

```text
KIT VALIDITY
KIT RECOVERY-KEY GENERATION
ANCHOR AGE
LATEST-FRESHNESS CONFIDENCE
```

### Leakage contract

Recovery Kit export must not include financial plaintext, Gmail content, account/card identifiers or OAuth authority.

The export/import campaign must inspect QR/file/share-sheet/temp-file/cloud-backup behavior. The application must never silently upload the Recovery Private Key to the FinanceSensor control plane.

## Options considered

### Refresh after every checkpoint

Rejected as operationally hostile and unnecessary for a minimum trusted anchor model.

### Never refresh after initial setup

Rejected because Recovery Key rotation and disaster cutover require new future-epoch recovery authority.

### Treat any stale kit as invalid

Rejected. Staleness is a freshness-evidence issue, not automatically a cryptographic validity failure for covered historical epochs.

### Server-managed latest recovery kit

Rejected because it collapses the user-held recovery boundary and risks giving the service recovery authority.

## Consequences

- Recovery Kit semantics become deterministic;
- post-recovery flow gains an explicit new-kit gate;
- normal users are not forced to export after every sync;
- UI must expose anchor age without overstating freshness;
- physical export/import leakage tests remain mandatory.

## Test / evidence required

- recovery with an intentionally old-but-valid kit;
- forward verification from kit anchor;
- witness unavailable state with old kit;
- witness-ahead and divergence fail-closed cases;
- old kit rejection for future epochs after Recovery Key rotation;
- new-kit mandatory gate after physical disaster recovery;
- integrity failure/tampering detection;
- export/import on Android and iOS;
- temp-file/share-sheet/backup leakage inspection;
- loss/reinstall scenarios;
- user confirmation flow that does not expose the recovery secret to telemetry.

## Security law

```text
RECOVERY KIT ANCHOR != GLOBAL LATEST
STALE ANCHOR != ROLLBACK PERMISSION
RECOVERY KEY ROTATION => NEW KIT REQUIRED
FUTURE SYNC RESUME REQUIRES FUTURE RECOVERY COVERAGE
SERVER CUSTODY OF RECOVERY PRIVATE KEY = FORBIDDEN
```

## Supersedes / superseded by

This ADR fills the Recovery Kit refresh gap in ADR-014/ADR-015. Their recovery and checkpoint semantics remain authoritative.