# EV-Q005 — Revocation Cutover Load-Bearing Electroshock

**Date:** 2026-09-01  
**Evidence level:** `PROVEN_AT_SPIKE`  
**Validated executable commit:** `0d4f3b2cbf57dee811480268bab19d2ee3a5a101`  
**MK0 Foundation PR run:** `33534061519`  
**E2EE job:** `99943935742`

## Result

```text
E2EE / KEY / RECOVERY / REVOCATION / PNS   PASS
TOTAL TESTS                                 62 / 62 PASS
REVOCATION CUTOVER                           7 / 7 PASS
POST-RECOVERY CUTOVER                        4 / 4 PASS
MK0 FOUNDATION                               3 / 3 JOBS PASS
Q-005                                        ACTIVE
BUILD_READY                                  NO
```

This artifact proves a bounded revocation-cutover property in the Node feasibility model. It does **not** claim production cryptographic approval, real cloud authorization or physical mobile revocation.

## Failure discovered before this slice

The earlier model correctly moved a revoked device out of future key epoch `N+1`, but that did not completely answer this attack:

```text
device B revoked from N+1
        +
B still holds epoch N key
        +
B still holds its signing private key
        ↓
B fabricates a new envelope today
but labels/signs/encrypts it as historical epoch N
```

A receiver retaining epoch N for legitimate history could otherwise treat the fabricated envelope as delayed old history.

Therefore:

```text
KEY ROTATION ALONE
    ≠
COMPLETE FUTURE-ACCESS REVOCATION
```

while old epochs remain replayable.

## Implemented bounded control

A signed `Revocation Barrier` commits the exact accepted historical origin stream at cutover.

```text
accepted historical envelopes
        ↓
tenant/origin/epoch/signature validation
        ↓
contiguous origin sequence
        ↓
canonical envelope digest set
        ↓
history commitment
        ↓
signed cutover barrier
```

Barrier context binds:

```text
tenant_id
revoked_device_id
revoked_from_epoch
last_accepted_origin_sequence
history_commitment
authorizing_device_id
created_at
```

A valid old device signature is no longer sufficient after the cutover is frozen.

## REV executable properties

```text
REV-001 committed history tolerates relay reorder + exact duplicate delivery
REV-002 revoked device cannot append a newly fabricated old-epoch envelope
REV-003 replacing an accepted historical sequence changes commitment and fails
REV-004 relay cannot alter cutoff/history metadata without invalidating signature
REV-005 revoked device cannot sign its own cutover authority
REV-006 cross-tenant authorizer cannot validate the barrier
REV-007 unresolved origin sequence gap prevents complete cutover
```

Observed:

```text
REV-001 ... REV-007   7 / 7 PASS
```

## Post-recovery load-bearing gate

The previous lower-level gate verified:

```text
new tenant epoch
new Recovery Key
new device authorization
lost-device revocation
new-epoch RecoveryCoverage
```

This slice deliberately demonstrates that those conditions are **necessary but not the final resume authority**.

The final bounded recovery cutover gate additionally requires one valid Revocation Barrier per lost device.

```text
REC-019 lower-level hardening alone is not final resume authority
REC-020 barriers for every lost device allow safe resume
REC-021 one missing barrier blocks safe resume
REC-022 tampered barrier blocks safe resume
```

Observed:

```text
REC-019 ... REC-022   4 / 4 PASS
```

## Invariant effect

This evidence promotes the bounded property:

```text
INV-SYNC-012   PROVEN_AT_SPIKE
```

Meaning:

> A revoked device cannot create newly admissible stale-epoch history after an authenticated cutover. Historical replay remains admissible only as part of the exact accepted committed origin history (or an equivalent reviewed production commitment).

The control also strengthens the interpretation of:

```text
INV-SYNC-003 future-access revocation
INV-SYNC-010 post-recovery hardening before future sync
```

## Privacy consequence

The Revocation Barrier is not secret financial payload, but it is security-sensitive metadata.

New privacy class:

```text
REVOCATION-CUTOVER-BARRIER
```

Cloud-visible minimized fields may reveal:

```text
revoked device identity
cutover epoch
last accepted origin sequence
cutover timing
history commitment
authorizer identity
```

It does not require plaintext:

```text
amount
merchant
category
email content
financial event type
tenant root key
Recovery Private Key
```

## Availability non-claim

The barrier protects integrity. It does not force a malicious relay to disclose data it is withholding.

```text
MALICIOUS RELAY CAN WITHHOLD HISTORY
```

remains true.

If a sequence gap is known at cutover, the spike fails closed rather than certifying an apparently complete history through the gap.

## Production representation non-claim

The spike currently commits a canonical ordered digest set. Production may select:

```text
hash chain
Merkle commitment
append-only checkpoint
transparency-style structure
or equivalent reviewed mechanism
```

The property is frozen at spike level; the exact production encoding is not.

## Whole-organism result on executable commit

The same MK0 Foundation run passed:

```text
canonical-resolver   PASS
e2ee-sync            PASS
physical-ingress     PASS
```

The E2EE job reported:

```text
62 tests
62 pass
0 fail
0 skipped
```

## What this evidence does NOT prove

- Android/iOS physical revocation behavior;
- production HPKE/signature implementation correctness;
- real control-plane authorization;
- persistent cloud barrier storage integrity/availability;
- physical long-offline cutover reconciliation;
- Android ↔ iOS interoperability;
- secure enclave/keystore behavior;
- Byzantine availability;
- penetration or side-channel resistance;
- release-grade disaster recovery.

## Closure effect

```text
REVOCATION CUTOVER MODEL          PROVEN_AT_SPIKE
INV-SYNC-012                     PROVEN_AT_SPIKE
Q-005                            ACTIVE
S-002                            ACTIVE
T-002                            PASS
G-MK0                            BLOCKED
BUILD_READY                      NO
```

The next evidence level must demonstrate the same property through a reviewed production construction and physical multi-device/mobile implementation.
