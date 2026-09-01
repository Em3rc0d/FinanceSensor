# MK0 / 11 — Architecture Decision Record Index

No implementation assumption becomes permanent architecture without an ADR when the decision is consequential, difficult to reverse or changes a product invariant.

## ADR template

```text
ADR-### — Title
Status: PROPOSED | ACCEPTED | SPIKE-ACCEPTED | SUPERSEDED | REJECTED
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

## Planned / active ADRs

| ADR | Decision | Status | Blocked by |
|---|---|---|---|
| ADR-001 | Tenant as financial ownership boundary | PROPOSED | Q-009 review |
| ADR-002 | Cloud Control Plane + Edge Data Plane | PROPOSED | Q-004/Q-005 |
| ADR-003 | Gmail provider adapter vs generic IMAP-first | PROPOSED | Q-003 |
| ADR-004 | Canonical event taxonomy | BLOCKED | Q-001 |
| ADR-005 | Transaction fingerprint/resolver strategy | BLOCKED | Q-002 |
| ADR-006 | Local persistence/encryption technology | OPEN | device spike/security review |
| ADR-007 | Sync event model and ordering | BLOCKED | Q-005 |
| ADR-008 | E2EE key hierarchy and production crypto | BLOCKED | Q-005/security review |
| ADR-009 | Mobile implementation stack | OPEN | low-end Android spike |
| ADR-010 | Control-plane runtime/cloud platform | OPEN | architecture + cost evaluation |
| ADR-011 | Classification stack | OPEN | extraction/resolver spike |
| ADR-012 | Analytics/telemetry privacy boundary | PROPOSED | Q-004 |
| ADR-013 | Minimum supported Android baseline | OPEN | device matrix evidence |
| ADR-014 | All-devices-lost recovery without server master key | SPIKE-ACCEPTED / PHYSICAL VALIDATION REQUIRED | Q-005 physical/production evidence |
| ADR-015 | Trusted checkpoint / anti-rollback model | SPIKE-ACCEPTED / PRODUCTION WITNESS DECISION REQUIRED | Q-005 physical anchor/witness evidence |

## ADR-014 evidence boundary

ADR-014 freezes only the **logical recovery ownership and hardening model**:

```text
SERVER MASTER KEY               REJECTED
PASSWORD-ONLY RECOVERY          REJECTED FOR MK0
ASYMMETRIC RECOVERY KEY         ACCEPTED AT SPIKE LEVEL
RECOVERY PRIVATE KEY            USER-HELD / OFFLINE
PER-EPOCH RECOVERY COVERAGE     REQUIRED
POST-RECOVERY DEVICE HARDENING  REQUIRED
TENANT + RECOVERY ROTATION      REQUIRED
```

Evidence:

- `ADR-014-RECOVERY-WITHOUT-SERVER-MASTER-KEY.md`
- `../10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`
- `../../spikes/e2ee-sync/test/recovery.test.js`

It does not freeze the production HPKE/AEAD/signature implementation, platform key-store behavior, Recovery Kit UX or physical disaster recovery.

## ADR-015 evidence boundary

ADR-015 freezes only the **bounded anchor-relative anti-rollback semantics**:

```text
RELAY AS SOLE TRUST ANCHOR           REJECTED
INDEPENDENT TRUSTED ANCHOR            REQUIRED FOR ROLLBACK CLAIM
SIGNED APPEND-ONLY CONTINUITY         SPIKE-ACCEPTED
ROLLBACK/FORK/GAP RELATIVE TO ANCHOR  FAIL CLOSED
NO INDEPENDENT ANCHOR                 INDETERMINATE_FRESHNESS
VALID ANCHORED HEAD                   CONSISTENT_FROM_ANCHOR
GLOBAL-LATEST FRESHNESS               UNPROVEN
```

Evidence:

- `ADR-015-TRUSTED-CHECKPOINT-ANTI-ROLLBACK.md`
- `../04-architecture/TRUSTED-CHECKPOINT.md`
- `../05-data-model/TRUSTED-CHECKPOINT-MODEL.md`
- `../10-evidence/EV-Q005-ANTI-ROLLBACK-2026-09-01.md`
- `../../spikes/e2ee-sync/test/checkpoint.test.js`

It does not freeze a production Merkle/hash-chain implementation, independent witness/transparency service, platform protected anchor storage, Recovery Kit anchor refresh cadence or globally latest Byzantine freshness semantics.

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

`SPIKE-ACCEPTED` is intentionally weaker than release-grade `PROVEN`.
