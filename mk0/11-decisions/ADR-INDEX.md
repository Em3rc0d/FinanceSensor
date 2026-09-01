# MK0 / 11 — Architecture Decision Record Index

No implementation assumption becomes permanent architecture without an ADR when the decision is consequential, difficult to reverse or changes a product invariant.

## ADR template

```text
ADR-### — Title
Status: PROPOSED | ACCEPTED | SUPERSEDED | REJECTED
Date
Context
Decision drivers
Options considered
Decision
Consequences
Risks
Security/privacy impact
Data-model impact
UX impact
Test/evidence required
Supersedes / superseded by
```

## Planned ADRs

| ADR | Decision | Status | Blocked by |
|---|---|---|---|
| ADR-001 | Tenant as financial ownership boundary | PROPOSED | Q-009 review |
| ADR-002 | Cloud Control Plane + Edge Data Plane | PROPOSED | Q-004/Q-005 |
| ADR-003 | Gmail provider adapter vs generic IMAP-first | PROPOSED | Q-003 |
| ADR-004 | Canonical event taxonomy | BLOCKED | Q-001 |
| ADR-005 | Transaction fingerprint/resolver strategy | BLOCKED | Q-002 |
| ADR-006 | Local persistence/encryption technology | OPEN | device spike/security review |
| ADR-007 | Sync event model and ordering | BLOCKED | Q-005 |
| ADR-008 | E2EE key hierarchy and recovery | BLOCKED | Q-005/security review |
| ADR-009 | Mobile implementation stack | OPEN | low-end Android spike |
| ADR-010 | Control-plane runtime/cloud platform | OPEN | architecture + cost evaluation |
| ADR-011 | Classification stack | OPEN | extraction/resolver spike |
| ADR-012 | Analytics/telemetry privacy boundary | PROPOSED | Q-004 |
| ADR-013 | Minimum supported Android baseline | OPEN | device matrix evidence |

## Decision discipline

An ADR is required when a choice affects one or more of:

- security boundary;
- financial correctness;
- tenant isolation;
- persistent schema;
- sync protocol;
- external API lock-in;
- device compatibility;
- recovery/deletion guarantees;
- signature interaction contract.

Minor implementation detail does not need an ADR.

## Rule

If code and ADR disagree, either the code is wrong or the ADR must be explicitly superseded. Silent architectural drift is not accepted.
