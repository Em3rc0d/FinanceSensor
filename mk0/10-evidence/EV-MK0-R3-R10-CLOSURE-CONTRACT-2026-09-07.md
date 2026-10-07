# EV-MK0 — R3→R10 closure contract — 2026-09-07

## Result

```text
R2_MERGE_SHA_POST_MERGE_RUNS     6/6 SUCCESS
R2_MERGE_SHA_FAILURES            0
R2_MERGE_SHA_IN_PROGRESS         0
R3_R10_CLOSURE_CONTRACT          DESIGN_FROZEN
R3_Q003                          PHYSICAL_OR_PROVIDER_OPEN
R4_Q004                          PHYSICAL_OR_PROVIDER_OPEN
R5_Q005                          CROSS_DEVICE_PHYSICAL_OPEN
R6_QUARRY_CONSENSUS              BLOCKED
R7_A001_SEC001                   AUDIT_OPEN
R8_DM001_WF001_OPS001            AUDIT_OPEN
R9_G_MK0                         BLOCKED
R10_BUILD_READY                  BLOCKED
BUILD_READY                      NO
RELEASE_READY                    NO
```

## R2 post-merge consensus completed

The R2 merge authority remains:

```text
R2_CERTIFIED_HEAD
47b5e853fb3e63c2a701551a72f253570dd853a2

R2_MERGE_SHA
3146b957cb316b9643862a37d4756ad7ae27c83c
```

A fresh GitHub Actions query for that exact merge SHA returned six completed successful workflow runs, zero failures and zero in-progress runs. This closes the previously pending post-merge CI observation only. It does **not** promote R1 physical signing, R2 physical execution, Q-003/Q-004/Q-005, G-MK0, BUILD_READY or RELEASE_READY.

## Closure-contract authority

The machine-readable closure layer is:

- `graph/mk0-r3-r10-closure-contract.json`
- `graph/mk0-r3-r10-closure-receipt-schema.json`
- `tools/validate-mk0-r3-r10-closure-contract.mjs`
- `graph/prebuild-remainder-design.json`
- `graph/closure-ledger.json`
- `graph/build-readiness.json`
- `graph/CLOSURE-RECEIPT-TEMPLATE.md`

The new layer does not duplicate the R0→R10 graph. It constrains how future R3→R10 closure claims may be made.

## Mandatory receipt properties

Every future R3→R10 closure receipt must include:

1. the exact 40-hex repository SHA where the claim is valid;
2. explicit immutable parent receipt references;
3. explicit evidence references;
4. explicit non-claims;
5. contradiction-audit result;
6. at least one explicit residual-risk entry, including a rationale when the author believes no material risk remains;
7. at least one reopen trigger;
8. sanitization pass;
9. explicit BUILD_READY and RELEASE_READY booleans.

Unknown top-level fields are rejected by the receipt schema.

## Physical/provider boundary

R3 requires more than R2 Android evidence. It retains real refresh-before-revoke, refreshed Gmail bearer acceptance, endpoint byte/latency accounting, mobile credential custody, provider revoke behavior, Google restricted-scope verification status, Google security-assessment applicability and consent/data-path reconciliation.

R4 retains real network/storage/cache/temp inspection, Android and iOS credential custody, telemetry/crash redaction, cloud/witness deletion, backup retention at or below 35 days and the pre-delete-backup resurrection barrier.

R5 retains bidirectional Android↔iOS wrap/unwrap and sign/verify, negative crypto tests, 3 witnesses with 2-of-3 quorum across at least two failure domains, crash/restart, partition/rejoin, long-offline behavior, all-devices-lost recovery, TRK and Recovery Key rotation, a new Recovery Kit and denial of the old device/old kit for a future epoch.

## Fail-closed laws

```text
PR_CI_PASS != MERGE_SHA_PASS
STATIC_PASS != PHYSICAL_PASS
R2_PHYSICAL_PASS != Q003_Q004_Q005_CLOSED
PUBLIC_CI_PHYSICAL_PROMOTION = 0
PUBLIC_CI_BUILD_READY_PROMOTION = 0
PUBLIC_CI_RELEASE_PROMOTION = 0
BUILD_READY_TRUE_REQUIRES_G_MK0_CLOSED
BUILD_READY != RELEASE_READY
```

If evidence contradicts an upstream assumption, the owning upstream node must reopen. Contradictions may not be voted away by downstream consensus.

## Explicit non-claims

This evidence does not claim:

- R1 trusted-edge physical signing PASS;
- R2 owned-device campaign PASS;
- Q-003, Q-004 or Q-005 CLOSED;
- Android+iOS production cryptography proven;
- provider/security-assessment completion;
- backup/deletion physical closure;
- A-001, SEC-001, DM-001, WF-001 or OPS-001 CLOSED;
- G-MK0 CLOSED;
- BUILD_READY;
- RELEASE_READY.

## Next executable boundary

The next private/physical authority remains R1 trusted-edge signing of the authorized Alpha.2 v3 bundle. R3→R10 are now contractually mapped but remain downstream of the required physical chain.
