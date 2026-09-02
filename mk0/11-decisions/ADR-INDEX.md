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
| ADR-016 | Opaque independent witness freshness | SPIKE-ACCEPTED / PRODUCTION WITNESS POLICY OPEN | Q-005 witness deployment/physical evidence |
| ADR-017 | Gmail mobile OAuth boundary | SPIKE-ACCEPTED / DESKTOP LEVEL-C PHYSICAL PASS / MOBILE PRODUCTION OPEN | Q-003/Q-004 mobile credential evidence |
| ADR-018 | Gmail partial-sync anchor provenance | ACCEPTED FOR LEVEL-C HARNESS / PRODUCTION INITIAL-SYNC OPEN | Q-003 production onboarding |
| ADR-019 | Gmail bootstrap without Search-index dependency | ACCEPTED FOR LEVEL-C HARNESS / PRODUCTION INITIAL-SYNC OPEN | Q-003 production onboarding |
| ADR-020 | Gmail restricted-data server boundary | ACCEPTED FOR MK0 ARCHITECTURE / GOOGLE APPLICABILITY DETERMINATION REQUIRED | Q-003/Q-004 production verification |

**Next available ADR:** `ADR-021`.

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

## ADR-016 evidence boundary

ADR-016 adds an **independent opaque witness** as a stronger freshness signal without moving financial truth outside the edge.

```text
REAL TENANT ID AT WITNESS             FORBIDDEN BY CANDIDATE CONTRACT
FINANCIAL PLAINTEXT AT WITNESS        FORBIDDEN
PER-WITNESS OPAQUE LOG ID             REQUIRED
ROLLBACK/FORK/GAP/PARENT MISMATCH     FAIL CLOSED
WITNESS AHEAD OF RELAY                RELAY_BEHIND_WITNESS
VALID SAME-SEQUENCE DIVERGENCE        WITNESS_DIVERGENCE
INSUFFICIENT INDEPENDENT EVIDENCE     EXPLICITLY UNCONFIRMED
SILENT FALLBACK TO RELAY              REJECTED
2-OF-3 SPIKE THRESHOLD                NOT A PRODUCTION DECISION
```

Evidence:

- `ADR-016-OPAQUE-WITNESS-FRESHNESS.md`
- `../04-architecture/WITNESS-FRESHNESS.md`
- `../10-evidence/EV-Q005-WITNESS-FRESHNESS-2026-09-01.md`
- `../../spikes/e2ee-sync/test/witness.test.js`

## ADR-017 evidence boundary

ADR-017 freezes the current **Gmail authorization ownership boundary**, not a completed production mobile OAuth deployment.

```text
MINIMUM SCOPE CANDIDATE            gmail.readonly
GMAIL DATA PLANE                   EDGE-LOCAL
NORMAL CLOUD REFRESH-TOKEN CUSTODY REJECTED
SHORT-LIVED TOKEN PROVIDER         CONTRACT TESTED
401                                REAUTH_REQUIRED
OOB COPY/PASTE                     REJECTED
AUTO ATTACHMENT BYTE DOWNLOAD      REJECTED
REAL PROVIDER REACHABILITY         PASS
DESKTOP DEV LEVEL-C CONSENT        PHYSICAL PASS
DESKTOP DEV TOKEN EXCHANGE         PHYSICAL PASS
PROVIDER REVOCATION                PHYSICAL PASS
PRODUCTION MOBILE CREDENTIAL       OPEN
```

Evidence:

- `ADR-017-GMAIL-MOBILE-OAUTH-BOUNDARY.md`
- `../10-evidence/EV-Q003-OWNED-OAUTH-LEVEL-C-V7-PASS-2026-09-02.md`
- `../10-evidence/EV-Q003-REAL-GMAIL-REACHABILITY-2026-09-01.md`
- `../10-evidence/EV-Q003-GMAIL-OAUTH-ADAPTER-CONTRACT-2026-09-01.md`
- `../../spikes/physical-ingress/test/gmail-rest-provider.test.js`
- `../../spikes/physical-ingress/test/real-provider-shape.test.js`

## ADR-018 / ADR-019 evidence boundary

These ADRs freeze the **controlled Level-C synchronization bootstrap**, not production onboarding.

```text
/profile.historyId AS BOOTSTRAP ANCHOR       REJECTED
MESSAGE.historyId PROVENANCE                 REQUIRED
IMMEDIATE Gmail Search q DEPENDENCY          REJECTED
BOUNDED RECENT-INBOX SUBJECT WINDOW          LEVEL-C ACCEPTED
HISTORICAL MAILBOX SWEEP                     REJECTED FOR HARNESS
LEVEL-C HARNESS                              != PRODUCTION INITIAL-SYNC UX
```

Evidence:

- `ADR-018-GMAIL-PARTIAL-SYNC-ANCHOR.md`
- `ADR-019-GMAIL-BOOTSTRAP-WITHOUT-SEARCH-INDEX.md`
- `../10-evidence/EV-Q003-OWNED-OAUTH-LEVEL-C-V7-PASS-2026-09-02.md`

## ADR-020 evidence boundary

ADR-020 freezes the **server capability boundary** for Gmail restricted data while refusing to invent a provider exemption.

```text
GMAIL OAUTH AUTHORITY ON SERVER              FORBIDDEN
SERVER-SIDE Gmail API CALLS                  FORBIDDEN
RAW Gmail PROCESSING ON SERVER               FORBIDDEN
GENERALIZED AI TRAINING FROM Gmail DATA      FORBIDDEN
E2EE OPAQUE RELAY                            ALLOWED BY ARCHITECTURE
E2EE RELAY => GOOGLE ASSESSMENT EXEMPT       NOT PROVEN
GOOGLE APPLICABILITY DETERMINATION            REQUIRED BEFORE PUBLIC LAUNCH
```

Evidence/plan:

- `ADR-020-GMAIL-RESTRICTED-DATA-SERVER-BOUNDARY.md`
- `../07-plan/GMAIL-PRODUCTION-VERIFICATION-PACKAGE.md`

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
