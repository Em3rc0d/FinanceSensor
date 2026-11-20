# RES-001B-DIAG-EXPORT — Safe local evidence inventory contract

Status: **DESIGN PROPOSAL / NOT IMPLEMENTED / NO PHYSICAL GATE**  
Date: 2026-11-19  
Scope: FinanceSensor / PocketFinances RES-001B; installed +2020 remains unchanged.

## Evidence baseline

- RES-001B synthetic diagnosis on `8baa8670e234264cbc282fb0d4c43fccee84aab1`: reported 36/36 targeted tests PASS; private inspection NOT_RUN.
- Owned-device UI exploration later recovered **312 interpretation pending**, **5 category pending**, **5 consumption**, **2 transfers**. These are UI projections, **not** a full SQLCipher audit.
- Existing `Alpha2VaultBridge.kt` `openEncryptedDatabase()` calls `openOrCreateDatabase` and `ensureSchema()`; the latter runs DDL/metadata writes. This is **not** a true read-only entrypoint.
- Vault tables `statement_sources(source_receipt_id, terminal_state)` and `derived_evidence(...)` contain evidence and terminal states, **not** per-document reject reason codes. Six rejection causes cannot be inferred from six UI counters.

## Safety invariants (MUST)

1. No change to the installed APK, vault, credentials, keys, source evidence, transaction identities, account linkage or migrations during this contract's design/review phase.
2. Diagnostic reading must fail closed unless the encrypted DB **already exists**, the wrapped DEK **already exists**, and the existing hardware-backed wrapping key **already exists**. Never call `getOrCreateHardwareBackedWrapKey`, `loadOrCreateDek`, `openOrCreateDatabase`, `ensureSchema`, or other mutating functions in diagnostic mode.
3. Production read-only implementation must use a proven SQLCipher **read-only database open path** on the same original encrypted file, no create/write-capable handle, and no implicit schema migration. Verify exact SQLCipher Android API flags against the pinned library before coding. Require SQLCipher-version compatibility. Do not enable plaintext fallback.
4. Because SQLCipher read-only open may involve WAL/journal handling and provider behavior, prove a physical write-free gate on a synthetic encrypted database with its files/metadata checks before any private device usage. If guarantee cannot be established: STOP, do not use an unsafe fallback.
5. The query surface accepts no arbitrary SQL, no identifiers supplied by caller (tenant/account/source), and no record pagination. Return only enumerated aggregations and bounded counts with allowlisted keys.
6. No raw rows, descriptions, merchant names, account identifiers, evidence IDs, source receipt IDs, timestamps, dates, monetary values, statement period IDs, document hashes, email data, credentials, filenames, paths, or key material in the report.
7. Use in-process local, explicit user-initiated invocation only. No background daemon, HTTP server, ADB remote port, remote telemetry, cloud upload, or clipboard export without explicit user action.
8. For private data, do not print row-level values in logs, exceptions, test failures, Flutter debug output, Android logcat, or GitHub CI. Failure codes only.
9. Aggregations must be coarse and privacy-aware: allowlisted buckets, cap counts to a documented bound, suppress or combine small groups (default < 3), and avoid cross-tab combinations that reidentify individual operations. Full total pending count may be shown with user consent.
10. Always include query completeness and whether data was sourced from persisted vault, current runtime, or UI projection. Never imply a display counter proves a vault count.

## Contract A: persisted vault inventory

**Proposed local action**: `readDiagnosticAggregateV1`. Not yet an implemented MethodChannel method.

Allowed results (no private raw values):

```json
{
  "contract": "RES-001B-DIAG-EXPORT",
  "version": 1,
  "status": "COMPLETE | PARTIAL | NOT_RUN",
  "provenance": "VAULT_READ_ONLY",
  "schemaVersion": 2,
  "counts": {
    "sourceStates": {"IMPORTED": 0, "QUARANTINED": 0, "FAILED": 0, "DISCARDED": 0},
    "evidenceTotal": 0,
    "semantics": {"KNOWN": 0, "UNKNOWN": 0},
    "flow": {"INFLOW": 0, "OUTFLOW": 0, "OTHER": 0},
    "channels": {"STATEMENT": 0, "GMAIL": 0, "OTHER": 0},
    "account": {"LINKED": 0, "UNLINKED": 0},
    "processedAt": {"PRESENT": 0, "ABSENT": 0}
  },
  "limits": ["NO_ROW_EXPORT", "NO_REJECT_CAUSE_IN_VAULT"],
  "reconciliation": {"canonicalEvents": "NOT_AVAILABLE_IN_VAULT"},
  "validation": {"readOnlyGate": "PASS", "completeness": "PASS"}
}
```

Note: These **zeroes are schema examples, not real findings**. Actual enum values in storage must be mapped via strict, reviewed allowlists; unmapped values go to OTHER. `evidenceTotal` may differ from canonical event totals because multiple observations can reconcile to one event. The stored `semantic_type` is evidence-level, not necessarily final canonical decision.

Scope: currently global encrypted vault only; add tenant-safe filtering **only after** ownership and runtime tenant context can be verified in native code without accepting forged tenant strings from the caller. No user-provided filters in V1.

Performance: execute single grouped SQL queries with bounded result size, read-only transaction/snapshot as supported, never iterate raw records into Dart. Reject oversized or unexpected schemas safely.

## Contract B: six document rejection reasons

Existing `statement_sources` only stores terminal state, not reject codes. The inventory can report imported/quarantined/failed/discarded counts but **cannot prove** reasons for six historic rejects.

Possible routes, in order:
1. Inspect already-existing structured local import receipts / runtime diagnostic state, **if** they retain per-document stage and stable safe error codes without revealing a document identifier.
2. If reasons are no longer persisted, state `HISTORIC_REASON_UNAVAILABLE`. Do not invent or infer them from parser vocabulary or aggregate counts.
3. Separate future instrumented retry, with explicit user approval and synthetic validation, can collect phase (`DISCOVERY/READ/DECRYPT/LAYOUT/PARSE/COMMIT`), allowlisted code, parser profile/version and retry result. Keep private mapping to originals on device, emit only pseudonymous session ordinals. **No retry permitted in this contract.**

Do not treat six UI 'review' entries as proof of six failed vault receipts. A document can be awaiting manual attention for other reasons.

## Contract C: 312 pending interpretations

Compare independently:
- persisted evidence counts by semantic and flow (vault);
- canonical event counts and classification in runtime;
- rendered UI counts.

Only compare after explicitly recording projection versions, filters, source scope and deduplication/reconciliation behavior. Do not assert `312 UNKNOWN vault rows` from `312 pending UI events`.

Use report statuses `CONFIRMED`, `PARTIAL`, `UNAVAILABLE` and `MISMATCH`. A mismatch must retain counts and reason **without exporting identifying rows**.

## Quality gate / test matrix

- Absent DB / absent DEK / absent hardware key -> `NOT_RUN`, zero creation or mutation.
- Existing v1/v2 DB -> stable read; unexpected schema -> safe error, no migration.
- Synthetic encrypted database under WAL mode -> byte-for-byte content and metadata checks before/after; check -wal/-shm presence, sizes, hashes and mtime, with known benign OS effects documented. No private-run approval until read-only guarantee is demonstrated.
- SQLite authorizer/connection mode and SQLCipher API are verified to enforce no INSERT/UPDATE/DELETE/CREATE/ALTER/PRAGMA writes, and failure is fail-closed. Do not rely solely on no-op observation.
- Repeated aggregate reads -> same values and unchanged schema version/row counts; caller cannot request raw rows.
- No identifiable values in returned JSON/logs/errors; small-cell suppression.
- Source states sum to vault source count; grouped evidence categories reconcile to evidence total; unknown enum maps to OTHER.
- UI event count vs vault evidence count allowed to differ if provenance explains reconciliation.
- Six rejection codes remain `UNAVAILABLE` unless supported by safe original diagnostic receipts.
- None of these synthetic tests constitutes an owned-device gate.

## Implementation phases and stop conditions

1. **DESIGN REVIEW** (this document): inspect dependencies and existing receipt APIs; no code changes beyond docs.
2. **ISOLATED SYNTHETIC SPIKE**: implement the strict read-only open/query behind an off-by-default diagnostic feature gate; test on an isolated encrypted synthetic fixture only. Do not sign/release a user APK.
3. **SECURITY REVIEW**: inspect full diff, threat model and tests. If `openEncryptedDatabase` or `ensureSchema` is called, reject. If SQLCipher cannot enforce read-only and no-write guarantees, STOP.
4. **OWNED-DEVICE AUTHORIZATION**: separate explicit decision after verified code and complete evidence; minimal local diagnostic build only if necessary, preserving existing installation and signing compatibility.
5. **PRIVATE INVENTORY**: single opt-in local run; export sanitized aggregates. Historical rejection diagnosis remains independent.
6. **RES-001B PRODUCT BUILD**: only after dates, review decisions, account binding, privacy, repair/migration and rollback contracts are accepted.

## Acceptance

**Design done** when reviewed and adopted; **implementation done** only after synthetic security gates pass; **physical inventory done** only when data is actually read from the owned device. No one phase substitutes for another.

Current status: **DESIGN PROPOSAL ONLY**. No claim of a real SQLCipher inspection or resolution of the six rejected statements.
