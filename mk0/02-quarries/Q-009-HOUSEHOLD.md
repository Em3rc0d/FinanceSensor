# Q-009 — Household / Membership Model

**Priority:** P1  
**Status:** OPEN

## Question

How much household/multi-member capability must the MK0 tenancy model support without implementing household UX prematurely?

## Required architecture readiness

```text
User
  ↓ Membership
Tenant
  ↓
FinancialIdentity[*]
Device[*]
Connection[*]
Institution[*]
Financial state
```

A Tenant must not equal a single person by schema invariant.

## Future cases to preserve

- individual with multiple phones;
- couple with joint and individual accounts;
- family financial tenant;
- small-business tenant separate from personal tenant;
- one user participating in more than one tenant.

## MK0 constraint

MK0 can expose a single-person onboarding flow while retaining the general ownership model underneath. Do not build permissions/features with no MK0 use case beyond what is necessary to avoid destructive schema assumptions.

## Questions

- Can one FinancialAccount be associated with multiple FinancialIdentities?
- How is visibility modeled for joint vs private account data later?
- Are device keys tenant-scoped or user-scoped?
- What happens when a member leaves a tenant?
- How does tenant export/delete interact with membership?

## Closure criteria

- conceptual tenancy model supports future multi-member cases;
- MK0 physical schema remains minimal;
- no `tenant == user` or `tenant == device` constraint exists;
- deferred household permissions are documented rather than accidentally implemented.
