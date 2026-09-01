# EV-Q005 — All-Devices-Lost Recovery Electroshock

**Date:** 2026-09-01  
**Evidence level:** `PROVEN_AT_SPIKE`  
**Validated executable commit:** `ce2bb1ebac89e12f8defd8a163e24eadf3bb32e1`  
**MK0 Foundation run:** `33527184230`  
**E2EE job:** `99920894672`  
**Heartbeat run:** `33527184155`

## Result

```text
E2EE / PERIPHERAL / RECOVERY SUITE   PASS
TOTAL TESTS                          40 / 40 PASS
RECOVERY TESTS                       12 / 12 PASS
HEARTBEAT                            PASS
MK0 FOUNDATION                       3 / 3 JOBS PASS
BUILD_READY                          NO
Q-005                                ACTIVE
```

This artifact proves bounded recovery properties in the Node feasibility model. It does **not** claim production cryptographic approval or physical mobile recovery.

## Recovery properties exercised

```text
REC-001 cloud view lacks tenant root key and Recovery Private Key
REC-002 wrong Recovery Private Key cannot unwrap an epoch
REC-003 one Recovery identity restores all epochs wrapped to it
REC-004 Recovery Public Key alone cannot decrypt
REC-005 recovery wrap is bound to tenant/epoch/key-id context
REC-006 ciphertext tampering fails
REC-007 Recovery Kit restores an epoch after all device private keys are gone
REC-008 rotating Recovery Key blocks old key from future-only wraps
REC-009 wrong authorizer record cannot validate a recovery wrap
REC-010 no Recovery Kit means no hidden server recovery path
REC-011 declared recoverable epochs require complete recovery-wrap coverage
REC-012 post-recovery hardening revokes lost devices and rotates tenant + recovery epochs before future sync
```

Observed result:

```text
REC-001 ... REC-012     12 / 12 PASS
```

## Whole-organism regression result

The recovery tissue was not tested in isolation only. On the same validated executable head:

```text
canonical resolver                    PASS
peripheral E2EE                       PASS
recovery                              PASS
parasympathetic scheduler             PASS
physical ingress                      PASS
closure graph                         PASS
artifact status authority             PASS
quarry status                         PASS
invariant traceability                PASS
privacy base + recovery matrix        PASS
recovery equipment guard              PASS
```

Therefore the new recovery model did not regress the already-wired financial heart, source-ingress contract, privacy boundary or graph validators in this bounded environment.

## Privacy result

The privacy ECG treats these as first-class classes:

```text
RECOVERY-PRIVATE-KEY
RECOVERY-PUBLIC-KEY
RECOVERY-EPOCH-WRAP
```

Required properties:

```text
Recovery Private Key
  cloud plaintext      FORBIDDEN
  E2EE sync             FORBIDDEN
  logging               FORBIDDEN
  ordinary app storage  NOT A NORMAL RETENTION PATH

Recovery Public Key
  cloud plaintext       ALLOWED_MINIMIZED

Recovery Epoch Wrap
  cloud view            CIPHERTEXT + MINIMUM CONTEXT ONLY
  logging               NO KEY MATERIAL
```

## Domain invariants proved at spike level

```text
INV-SYNC-008 cloud alone cannot recover a tenant epoch
INV-SYNC-009 recoverable epochs require authenticated recovery coverage
INV-SYNC-010 successful disaster recovery requires fresh authorization + epoch rotation
INV-SYNC-011 retired Recovery Key cannot decrypt future-only epochs
```

These invariants are `PROVEN_AT_SPIKE`, not release-grade `PROVEN`.

## Architecture implication

The bounded model supports this ownership topology:

```text
Tenant Key Epoch N
   ├─ wrap → authorized Device A
   ├─ wrap → authorized Device B
   └─ wrap → Recovery Public Key

Cloud
   stores public recovery metadata + opaque wraps
   does not hold recovery decryption authority

User Recovery Kit
   holds Recovery Private Key authority
```

This rejects a standing server master key while still allowing an explicit all-devices-lost recovery path.

## Recovery coverage invariant

A key epoch cannot be advertised as recoverable merely because a Recovery Public Key exists. The spike checks the stronger property:

```text
DECLARED RECOVERABLE EPOCH
        ↓
matching tenant_id
matching recovery_key_id
matching key_epoch
        ↓
recovery wrap exists
        ↓
RECOVERY-COVERED
```

Missing coverage is an explicit failure.

## Post-recovery hardening invariant

A successful disaster recovery does not reactivate lost devices or continue on the recovered historical epoch:

```text
restore through epoch N
        ↓
new device authorization starts at N+1
lost devices revoked from N+1
new tenant epoch N+1 required
new Recovery Key required
        ↓
future sync may resume
```

This is a bounded transition-plan proof. Physical device enrollment/revocation and real key generation remain future evidence.

## Explicit unrecoverable state

The model intentionally proves:

```text
all devices lost
+
Recovery Kit lost
=
no cryptographic recovery path
```

FinanceSensor must not silently substitute a server backdoor for this state. Provider data may later be re-imported where sources still retain it, but local-only state may be unrecoverable.

## Graph reconciliation

After executable proof, the recovery evidence was wired into:

```text
graph/traceability-recovery.json
graph/closure-ledger.json
STATUS.md
```

The authoritative ledger deliberately preserves:

```text
Q-005   ACTIVE
S-002   ACTIVE
T-002   PASS
G-MK0   BLOCKED
BUILD_READY false
```

No `CLOSED` or release-grade `PROVEN` state is inferred from a synthetic spike.

## What this evidence does NOT prove

- reviewed production HPKE implementation correctness;
- Android ↔ iOS cryptographic interoperability;
- Android Keystore/StrongBox physical behavior;
- Apple Keychain/Secure Enclave physical behavior;
- secure Recovery Kit export/import UX;
- screenshot/clipboard/backup leakage behavior;
- account-authentication hardening during disaster recovery;
- real cloud authorization around recovery-wrap retrieval;
- real tenant deletion of recovery metadata/backups;
- physical post-recovery device revocation and epoch rotation;
- side-channel resistance;
- penetration-test results;
- long-term recovery-key retention policy.

## Closure effect

```text
ADR-005 ownership model             SPIKE-ACCEPTED
INV-SYNC-008..011                   PROVEN_AT_SPIKE
ALL_DEVICES_LOST_RECOVERY_DESIGN    DECIDED AT LOGICAL/SPIKE LEVEL
PHYSICAL_RECOVERY                   OPEN
PRODUCTION_CRYPTO                   OPEN
Q-005                               ACTIVE
BUILD_READY                         NO
```

The next evidence level must move this design from Node feasibility to a reviewed production construction and physical mobile implementation.
