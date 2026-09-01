# DECISION LOG

This file records product-level decisions that already have enough support to guide downstream work. Detailed implementation decisions belong in MK-specific ADRs.

| ID | Decision | Status | Rationale |
|---|---|---|---|
| D-001 | Treat email as evidence, not transaction truth | ACCEPTED | Multiple messages can represent one economic event; prevents duplicate counting and enables provenance. |
| D-002 | Tenant is the financial ownership boundary; device is an edge node | ACCEPTED | One customer may use several devices, emails, banks and accounts. |
| D-003 | Cloud is primarily a control plane | ACCEPTED | Preserves edge-first privacy while supporting multi-device coordination. |
| D-004 | Core value cannot require a large local LLM | ACCEPTED | Must work on ordinary Android devices and degrade gracefully. |
| D-005 | Financial state is derived from canonical events | ACCEPTED | Supports auditability, synchronization, corrections and deterministic reconstruction. |
| D-006 | Transfers and card settlements need explicit semantics | ACCEPTED | Avoids double-counting and false income/expense. |
| D-007 | Default UI language is non-technical and non-judgmental | ACCEPTED | Financial understanding must not require expertise or create shame. |
| D-008 | Home and Sensor overview are no-scroll surfaces | ACCEPTED | One viewport must answer the primary question immediately. |
| D-009 | Scroll is allowed for inherently sequential information | ACCEPTED | Transaction history, search, evidence, settings and legal content cannot be compressed arbitrarily. |
| D-010 | Android is the first implementation target; iOS remains a first-class architecture target | ACCEPTED | Android offers a broad target range for the initial feasibility work without designing ourselves into an Android-only model. |
| D-011 | Gmail is the first sensor but not the connector abstraction | ACCEPTED | FinanceSensor must remain email-provider and financial-source extensible. |
| D-012 | Privacy claims must be architecture-backed and inspectable | ACCEPTED | Trust cannot rely only on marketing language. |
| D-013 | Financial correctness is P0 ahead of advanced AI | ACCEPTED | Wrong ledger + excellent AI remains wrong. |
| D-014 | Source/provider transaction IDs are insufficient as canonical economic identity | ACCEPTED | Pending/posted transitions and provider changes can alter IDs. |

## Decisions still open

- exact Gmail scope and production verification path;
- E2EE key recovery model;
- exact local database/encryption technology;
- exact mobile framework/native split;
- cloud provider and sync protocol;
- minimum supported Android version/RAM after measurement;
- production monetization model;
- household membership rules beyond architecture readiness;
- exact classification stack (rules, parsers, small ML, optional local LLM).

Open decisions must not be silently converted into implementation assumptions.
