# EV-Q005 — Bounded spike vs physical production evidence boundary

**Date:** 2026-09-03  
**Node:** Q-005  
**Status:** BOUNDED_SPIKE_GREEN_PHYSICAL_OPEN  
**Q-005 closure:** NO

## Purpose

Make the existing Q-005 evidence semantics machine-enforceable so the strong bounded suite cannot be accidentally promoted into production/mobile/physical proof.

FinanceSensor currently has substantial executable feasibility evidence for local-first E2EE synchronization, recovery, revocation, anti-rollback and witness behavior. That evidence is valuable, but it is not the same class of proof as cross-platform protected-key execution, real witness failure domains, physical recovery or deletion/backup inspection.

## Existing bounded evidence

The authoritative Q-005 quarry records:

```text
FULL DISTRIBUTED SUITE          116 / 116 PASS
BOUNDED INVARIANTS             INV-SYNC-008..019
BOUNDED STATE                  PROVEN_AT_SPIKE
PRODUCTION STATE               NOT PROVEN
Q-005                          ACTIVE
```

Existing receipts include:

- `EV-Q005-PERIPHERAL-PARASYMPATHETIC-2026-09-01.md`
- `EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`
- `EV-Q005-REVOCATION-CUTOVER-2026-09-01.md`
- `EV-Q005-KNEE-STRESS-2026-09-01.md`
- `EV-Q005-ANTI-ROLLBACK-2026-09-01.md`
- `EV-Q005-WITNESS-FRESHNESS-2026-09-01.md`

These receipts remain bounded spike evidence and explicitly do not close Q-005.

## Machine-frozen physical boundary

`graph/q005-evidence.json` derives the physical closure surface from `graph/physical-closure-campaign.json`.

Q-005 is bound to these pre-closure physical phases:

```text
P0  Harness integrity                                 6 claims
P3  Transport/storage/deletion/backup inspection     8 claims
P4  Mobile production crypto interoperability        7 claims
P5  Witness crash and partition campaign             6 claims
P6  All-devices-lost recovery                         8 claims
                                                     ---------
TOTAL                                                 35 claims
```

The graph validator rejects drift between the Q-005 open-gate list and the campaign source. Adding, removing or changing a Q-005-bound physical claim requires explicit graph review rather than silently changing what “done” means.

## P4 — production crypto remains physical

ADR-021 freezes a test profile; it does not prove its implementation:

```text
HPKE BASE MODE                    RFC 9180
KEM                               DHKEM(P-256, HKDF-SHA256)
KDF                               HKDF-SHA256
WRAP AEAD                         AES-128-GCM
DEVICE SIGNING                    ECDSA P-256 + SHA-256
DOMAIN AEAD                       AES-256-GCM
PROTECTED PRIVATE KEYS            REQUIRED
EXPORTABLE LONG-LIVED FALLBACK    FORBIDDEN
```

P4 remains open until Android↔iOS wrap/unwrap and sign/verify interoperate physically, negative cases fail closed, protected key use is demonstrated and no silent exportable fallback exists.

Therefore:

```text
ADR021_PROFILE_FROZEN != MOBILE_CRYPTO_PHYSICAL_PASS
CI_CRYPTO_PASS        != PROTECTED_KEY_PHYSICAL_PASS
```

## P5 — witness topology remains physical

ADR-022 freezes the initial production topology:

```text
CONFIGURED WITNESSES              3
CONFIRMATION QUORUM               2 OF 3
MINIMUM FAILURE DOMAINS           2
MINIMUM RELAY-INDEPENDENT         1
VALID CONTRADICTION               CANNOT BE VOTED AWAY
```

The bounded witness suite proves protocol semantics under modeled conditions. P5 still requires an actually deployed multi-failure-domain campaign with crash/restart and partition/rejoin evidence.

`2-of-3` is an evidence threshold, not global consensus and not proof of globally latest state.

## P6 — all-devices-lost recovery remains physical

ADR-014/024 and the recovery spike establish the logical safe-to-resume model, but P6 still requires owned-device proof that:

- recovery succeeds from the intended user-held kit;
- the lost-device inventory is complete;
- revocation barriers bind recovered history;
- Tenant Root Key and Recovery Key rotate;
- N+1 RecoveryCoverage exists;
- a new kit is exported and custody confirmed;
- old devices and the old kit cannot authorize a future epoch.

Therefore:

```text
RECOVERY_SPIKE_PASS != ALL_DEVICES_LOST_PHYSICAL_PASS
SAFE_TO_RESUME_DESIGN != SAFE_TO_RESUME_PHYSICAL_PASS
```

## P3 — deletion/backup remains shared with Q-004

Q-005 inherits the physical deletion authority boundary. Opaque cloud envelopes, control metadata and witness namespaces must actually delete; pre-delete backups must not resurrect authority; applicable backup retention must remain within the 35-day architecture ceiling.

The newly frozen Q-004 metadata budget complements this boundary but does not replace P3 physical observation.

## Freshness honesty remains non-negotiable

The bounded anti-rollback and witness evidence preserves:

```text
SIGNED CHECKPOINT                 != GLOBAL LATEST
VALID CHAIN FROM ANCHOR           = CONSISTENT_FROM_ANCHOR
NO INDEPENDENT ANCHOR             = INDETERMINATE_FRESHNESS
2-OF-3 WITNESSES                  != GLOBAL CONSENSUS
GLOBAL-LATEST FRESHNESS           NOT CLAIMED
```

Q-005 may not be closed by redefining freshness semantics downward.

## P8 — closure receipt remains separate

Even after P0/P3/P4/P5/P6 pass, Q-005 closure still requires P8 to become PASS and specifically bind:

```text
Q005_RECEIPT_BINDS_CRYPTO_WITNESS_RECOVERY_EVIDENCE
RESIDUAL_RISKS_RECORDED
CLOSURE_GRAPH_REVALIDATED
```

Current campaign state:

```text
P8 = BLOCKED_BY_PRIOR_PHASES
```

## Executable guard

`tools/validate-q005-evidence.mjs` verifies:

- closure ledger keeps Q-005 ACTIVE and `buildReady=false`;
- bounded range is exactly `INV-SYNC-008..019` and remains `PROVEN_AT_SPIKE`;
- all referenced artifacts/evidence exist;
- Q-005 physical phases are exactly P0/P3/P4/P5/P6;
- the open physical gate set exactly equals the union of those phase claims;
- the union currently contains exactly 35 claims;
- P8 remains blocked and contains the Q-005 closure-receipt claim;
- forbidden evidence promotions remain explicit.

The validator is attached to the invariant/traceability ECG so future drift fails CI.

## Forbidden promotions

```text
116 / 116 PASS                       != Q005 CLOSED
PROVEN_AT_SPIKE                      != PROVEN
ADR-021 PROFILE FROZEN              != P4 PASS
ADR-022 TOPOLOGY FROZEN             != P5 PASS
RECOVERY SPIKE PASS                 != P6 PASS
SIGNED CHECKPOINT                   != GLOBAL LATEST
2-OF-3 WITNESSES                    != GLOBAL CONSENSUS
CI PASS                             != PHYSICAL KEY PROTECTION PASS
```

## Governing conclusion

```text
BOUNDED_DISTRIBUTED_SUITE            116 / 116 PASS
BOUNDED_INVARIANTS                   12 / PROVEN_AT_SPIKE
OPEN_PHYSICAL_PHASES                 5
OPEN_PHYSICAL_CLAIMS                 35
P8                                   BLOCKED_BY_PRIOR_PHASES
GLOBAL_LATEST_FRESHNESS              NOT CLAIMED
Q005                                 ACTIVE
BUILD_READY                          NO
```
