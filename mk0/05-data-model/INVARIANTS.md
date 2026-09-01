# DM-001 — Data Model Invariants

These invariants should become executable tests once the physical model exists.

## Tenancy

### INV-TEN-001
`Device != Tenant`.

### INV-TEN-002
A `Connection` belongs to a `Tenant`, not to the device currently executing it.

### INV-TEN-003
A `User` can theoretically belong to more than one Tenant; schema must not equate IDs.

### INV-TEN-004
A Tenant can contain more than one `FinancialIdentity` even if MK0 exposes one-person UX.

### INV-TEN-005
Every financial-domain entity that requires isolation has an unambiguous tenant ownership path.

## Evidence

### INV-EVD-001
A `SourceArtifact` can produce zero, one or many `FinancialEvidence` records.

### INV-EVD-002
A `FinancialEvidence` item is immutable with respect to what was extracted by a specific extractor version. Re-extraction creates a new version/record rather than silently rewriting provenance.

### INV-EVD-003
A `FinancialEvidence` item does not automatically imply a canonical transaction.

### INV-EVD-004
Multiple evidence items may support one canonical event.

### INV-EVD-005
The system can explain which source artifact(s) support a canonical event.

## Canonical financial truth

### INV-FIN-001
An internal transfer contributes **0** to income and **0** to expense totals.

### INV-FIN-002
A card payment/settlement does not count the underlying card purchases again as expense.

### INV-FIN-003
A refund is not blindly treated as ordinary income when it can be related to a previous expense.

### INV-FIN-004
A reversal changes the active economic effect of the event it reverses according to explicit semantic rules.

### INV-FIN-005
Reprocessing identical source evidence cannot increase canonical economic totals.

### INV-FIN-006
Two genuine same-merchant, same-amount purchases must remain separate when evidence supports two events.

### INV-FIN-007
Source-native transaction IDs are provenance attributes, not canonical primary keys.

### INV-FIN-008
Every canonical amount retains original currency.

### INV-FIN-009
Forecast/expected events never mutate observed historical totals as if they already occurred.

## Corrections

### INV-COR-001
A user correction never deletes historical source evidence.

### INV-COR-002
Category/merchant corrections are auditable and can be synchronized across authorized devices.

### INV-COR-003
Rejecting a candidate prevents it from silently resurfacing under identical evidence unless resolver rules/source data materially change and that re-open is auditable.

## Recurring

### INV-REC-001
A recurring pattern is derived from canonical events, not raw email count.

### INV-REC-002
A predicted next occurrence is not a canonical observed event.

### INV-REC-003
Price changes preserve historical occurrence amounts.

## Sync

### INV-SYNC-001
Per-device event sequences are monotonic.

### INV-SYNC-002
Duplicate delivery of the same encrypted sync event is idempotent.

### INV-SYNC-003
A revoked device cannot obtain new tenant key material or new sync payload authorization.

### INV-SYNC-004
Two authorized devices replaying the same complete event set converge to equivalent materialized financial state.

### INV-SYNC-005
Processing leases are optimization/coordination primitives, never the sole correctness mechanism.

## Security

### INV-SEC-001
OAuth credentials are never stored as ordinary plaintext application rows.

### INV-SEC-002
Device private key material never enters cloud plaintext storage.

### INV-SEC-003
Cloud sync payloads contain no plaintext amount, merchant, category or email content under the normal E2EE path.

### INV-SEC-004
Production logs cannot contain raw email bodies or authentication secrets.

## Testing rule

Each invariant must eventually link to one or more automated tests and one physical evidence artifact in `mk0/10-evidence/` when it is in MK0 release scope.
