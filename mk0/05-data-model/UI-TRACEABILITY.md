# DM ↔ Signature Wireframe Traceability

Purpose: prevent backend entities, UI surfaces and user actions from drifting into separate systems.

## Core matrix

| Domain concept | Primary screens | User-visible meaning | User action | Domain action/event candidate |
|---|---|---|---|---|
| Tenant | You / Connections / Devices | “Este espacio financiero” | manage sources/devices | TENANT/DEVICE authorization changes |
| Device | S-09 Devices | authorized phone | revoke/add | DEVICE_REVOKED / DEVICE_ENROLLED |
| Connection | S-08 Connections | connected information source | connect/reconnect/pause/revoke | CONNECTION_* |
| CanonicalFinancialEvent | S-01, S-02, S-03 | money movement | inspect/correct | CATEGORY_CORRECTED, MERCHANT_CORRECTED, EVENT_REPORTED |
| FinancialEvidence | S-03 evidence detail | “Detectado mediante…” | inspect | normally immutable/read-only |
| FinancialEventCandidate | S-06 Needs Review | unresolved movement | classify/reject | REVIEW_RESOLVED / CANDIDATE_REJECTED |
| Category | S-01, S-03 | understandable spending group | change | CATEGORY_CORRECTED |
| Merchant | S-02, S-03 | normalized counterparty | correct | MERCHANT_CORRECTED |
| RecurringPattern | S-07 | payment that repeats | inspect/confirm/dismiss later | RECURRING_* |
| Insight | S-04 | changed/review signal | acknowledge/open | INSIGHT_ACKNOWLEDGED |
| Opportunity | S-04, S-05 | possible money-preserving action | accept/dismiss | OPPORTUNITY_ACCEPTED/DISMISSED |
| ReviewTask | S-04, S-06 | “Necesitamos tu ayuda” | resolve/dismiss | REVIEW_RESOLVED |
| PeriodSummary | S-01 | Entró/Gastaste/Diferencia | drill down | read model only |
| Privacy metrics | S-10 | what was processed/stored/synced | inspect/delete navigation | privacy/admin actions |

## Mutation rules

### Evidence is not edited by user correction

When a user changes a category:

```text
FinancialEvidence remains immutable
        ↓
user correction action appended
        ↓
canonical/read model re-materialized
```

### Review does not invent source evidence

When the user classifies an uncertain movement, the system records a user-confirmation signal. It does not rewrite the original email/receipt as if it contained that category.

### Home is read-only summary

Home should not become a hidden mutation surface. Its actions are drill-down/navigation except for deliberately designed quick actions added later.

## Screen-state provenance

Every primary number shown on S-01/S-04 should be traceable:

```text
UI number
  ↓
read model field
  ↓
canonical event set / insight
  ↓
source evidence or explicit user correction
```

## Build rule

A new persistent domain entity should answer:

1. Which product problem requires it?
2. Which screen/engine reads it?
3. Which action creates/changes it?
4. Which test proves its invariants?

A new user action should answer:

1. What domain state changes?
2. Is it reversible/auditable?
3. How does it synchronize?
4. What happens on another device?

If those mappings are missing, the feature is not ready for build planning.
