# FinanceSensor Recovery Playbook

This is the project's defibrillator. It exists so failure has a deterministic recovery path.

## Golden rule

```text
IF A REQUIRED FINANCIAL, SECURITY OR PRIVACY INVARIANT FAILS:
DO NOT MERGE.
DO NOT RELEASE.
DO NOT MASK THE FAILURE.
```

## Triage classes

### R1 — Implementation defect

Examples: null handling, parser exception, incorrect branch condition, broken serialization.

Action: isolate failing test, patch implementation, add regression case, rerun full affected suite.

### R2 — Domain-model defect

Examples: transfer semantics wrong, refund misclassified, card settlement double-counted.

Action: stop implementation patching, reopen the governing invariant/quarry, correct the model, then update implementation and tests.

### R3 — Resolver/data-identity defect

Examples: false merge, duplicate canonical event, replay creates new expense, provider ID treated as economic identity.

Action: quarantine resolver change, reproduce with fixture, preserve evidence lineage, adjust matching rule/threshold only with benchmark evidence.

### R4 — Privacy/security defect

Examples: raw email body in logs, plaintext financial payload in cloud path, leaked token, revoked device still syncing.

Action: block release immediately, remove exposure path, rotate/revoke affected credentials where applicable, prove cleanup, add regression evidence. Never downgrade this class to cosmetic severity.

### R5 — Distributed-state defect

Examples: two devices diverge, duplicate event after replay, conflict resolution loses a user correction.

Action: freeze sync promotion, preserve event logs, reproduce deterministic replay, repair ordering/idempotency/conflict semantics before resuming.

### R6 — External-provider failure

Examples: Gmail policy/verification blocker, provider API incompatibility, OAuth change.

Action: mark source degraded/blocked, preserve provider abstraction, evaluate fallback connector without contaminating canonical financial semantics.

## Recovery sequence

```text
DETECT
  ↓
ISOLATE
  ↓
PRESERVE EVIDENCE
  ↓
CLASSIFY ROOT CAUSE
  ↓
FIX CORRECT LAYER
  ↓
ADD REGRESSION TEST
  ↓
RUN FULL RELEVANT SUITE
  ↓
PRODUCE RECOVERY EVIDENCE
  ↓
RETURN TO GREEN
```

## Main protection

`main` is treated as the stable integration line. Experimental or unresolved work stays on a branch/PR. A green single test is insufficient when a broader required suite is red.

## Data-corruption posture

If a defect could alter user-visible economic totals, the safe behavior is to prefer:

```text
UNKNOWN / NEEDS REVIEW
```

over a confident but incorrect financial statement.

## Recovery evidence

Every serious recovery should capture:

- failing commit/build;
- failed invariant/test;
- root cause;
- corrective commit;
- regression test;
- successful CI run;
- downstream model/ADR changes if applicable.

The project is considered revived only when the same failure mode is reproducibly prevented.