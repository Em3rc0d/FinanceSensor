# EV-Q005 — All-Devices-Lost Recovery Electroshock

**Date:** 2026-09-01  
**Evidence level:** `PROVEN_AT_SPIKE`  
**Original Recovery executable baseline:** `ce2bb1ebac89e12f8defd8a163e24eadf3bb32e1`  
**Original Recovery MK0 Foundation run:** `33527184230`  
**Original Recovery E2EE job:** `99920894672`  
**Original Recovery Heartbeat:** `33527184155`  
**Load-bearing executable baseline:** `404f7f1a0f6010d583e72010876785eef00b7254`  
**Load-bearing MK0 Foundation run:** `33531479425`  
**Load-bearing E2EE job:** `99935438930`  
**Load-bearing Heartbeat run:** `33531479436`

## Result

```text
E2EE / KEY AUTHORITY / RECOVERY / PNS   PASS
TOTAL E2EE-SIDE TESTS                    51 / 51 PASS
RECOVERY TESTS                           18 / 18 PASS
KEY-AUTHORITY LOAD TESTS                  5 / 5 PASS
HEARTBEAT                                PASS
MK0 FOUNDATION                            3 / 3 JOBS PASS
ARTIFACT STATUS AUTHORITY                PASS
QUARRY STATUS                            PASS
TRACEABILITY                             PASS
PRIVACY MATRIX                           PASS
RECOVERY ADR IDENTITY GUARD              PASS
BUILD_READY                              NO
Q-005                                    ACTIVE
```

This artifact proves bounded recovery, authorization and state-transition properties in the Node feasibility model. It does **not** claim production cryptographic approval, real control-plane authorization or physical mobile recovery.

## Why a second load-bearing audit was required

The first Recovery electroshock proved that the recovery path had a cryptographic pulse. A subsequent load-bearing audit asked a stricter question:

> Can the Recovery path and the adjacent tenant-key distribution path safely carry the weight of tenant isolation, authorization changes, replay and disaster recovery without trusting a merely plausible-looking record?

That audit found two genuine design/test gaps.

### Gap A — coverage existence was weaker than authenticated coverage

The original `assertRecoveryCoverage()` proved that a matching recovery-wrap header existed. It did not yet prove all of:

```text
wrap signature is valid
header authorizer identity matches authorization record
authorizer was authorized for the same tenant + epoch
wrap is untampered
coverage is non-ambiguous
exact relay duplicates remain idempotent
```

This was inconsistent with the documented phrase **authenticated recovery coverage**.

### Gap B — normal DeviceKeyWrap authority was not fully tenant/epoch bound

The adjacent tenant-key path could verify cryptographic signatures while still relying too heavily on caller-supplied records. The spike did not yet make all of these requirements executable:

```text
authorizer header identity = authorizer authorization identity
authorizer belongs to same tenant
authorizer is authorized for target epoch
recipient belongs to same tenant
recipient is authorized for target epoch
recipient authorization is rechecked when consuming the wrap
sync-envelope origin authorization is tenant-scoped
```

Because Recovery ultimately depends on the same device/tenant authority model, this was treated as a load-bearing Recovery issue rather than unrelated cleanup.

## Repairs applied

### Authenticated/non-ambiguous RecoveryCoverage

`spikes/e2ee-sync/src/recovery.js` now validates a candidate coverage package before it can count:

```text
protocol/framing valid
        +
tenant/recovery-key/epoch context matches
        +
header authorizer identity = DeviceAuthorization identity
        +
DeviceAuthorization belongs to same tenant
        +
authorizer authorized for target epoch
        +
signature authentic
        ↓
VALID RECOVERY WRAP
```

Coverage then requires one **distinct** valid authority per declared epoch.

```text
0 distinct valid wraps  → MISSING / FAIL
1 distinct valid wrap   → COVERED
>1 distinct valid wraps → AMBIGUOUS / FAIL CLOSED
```

Repeated delivery of the exact same authenticated package is deduplicated and remains idempotent.

### Post-recovery future-sync readiness gate

`REC-012` originally proved the shape of a hardening **plan**. The load-bearing audit identified that a plan was not enough to prevent an implementation from resuming synchronization too early.

`assertPostRecoveryReadyForFutureSync()` now requires the applied state to prove:

```text
current tenant epoch = N+1
new Recovery Key active
new device ACTIVE from N+1 for same tenant
all declared lost devices REVOKED from N+1
N+1 authenticated RecoveryCoverage under new Recovery Key
```

Only then does the model return `readyForFutureSync: true`.

### Tenant-scoped DeviceKeyWrap authority

`spikes/e2ee-sync/src/protocol.js` now makes `DeviceAuthorization` tenant-scoped in the executable model and requires tenant+epoch+identity agreement for normal key distribution.

Creation and consumption both check the relevant authorization window. A valid signature by a device associated with another tenant does not grant authority.

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
REC-011 declared recoverable epochs require complete authenticated recovery-wrap coverage
REC-012 post-recovery hardening plan requires lost-device revocation + tenant/recovery rotation
REC-013 signed authorizer identity must match supplied authorization record
REC-014 revoked authorizer cannot authorize target recovery epoch
REC-015 tampered wrap cannot satisfy RecoveryCoverage merely by existing
REC-016 distinct authentic wraps for one epoch are ambiguous and fail closed
REC-017 exact duplicate delivery of one authenticated wrap remains idempotent
REC-018 future sync remains blocked until complete post-recovery hardening is applied and verified
```

Observed result:

```text
REC-001 ... REC-018     18 / 18 PASS
```

## Adjacent key-authority load tests

```text
KEY-001 key-wrap authorizer identity cannot be impersonated
KEY-002 revoked authorizer cannot create a wrap for revoked epoch
KEY-003 recipient authorization is rechecked when consuming a tenant key
KEY-004 cross-tenant authorization cannot authorize a sync-envelope origin
KEY-005 cross-tenant recipient authorization cannot receive tenant key material
```

Observed result:

```text
KEY-001 ... KEY-005       5 / 5 PASS
```

## Whole-organism regression result

The load-bearing changes were not tested in isolation. On executable baseline `404f7f1a0f6010d583e72010876785eef00b7254`:

```text
canonical resolver                    PASS
E2EE + key authority                  PASS
recovery                              PASS
parasympathetic scheduler             PASS
physical ingress                      PASS
closure graph                         PASS
artifact status authority             PASS
quarry status                         PASS
invariant traceability                PASS
privacy base + recovery matrix        PASS
recovery equipment / ADR identity     PASS
```

The MK0 Foundation run completed all three jobs successfully and the Heartbeat completed every vital-sign step successfully.

Therefore the strengthened authorization/recovery model did not regress the already-wired financial heart, source-ingress contract, privacy boundary or graph validators in this bounded environment.

## Privacy result

The privacy ECG continues to treat these as first-class classes:

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

Tenant-scoped authorization metadata is security-sensitive metadata but is not financial payload plaintext. Its leakage/retention budget remains part of SEC-001 physical review.

## Domain invariants strengthened at spike level

```text
INV-TEN-005 tenant ownership path now has executable cross-tenant rejection support
INV-SYNC-003 device-key distribution/revocation is tenant + epoch + identity scoped
INV-SYNC-008 cloud alone cannot recover a tenant epoch
INV-SYNC-009 recoverable epochs require authenticated/non-ambiguous recovery coverage
INV-SYNC-010 successful disaster recovery requires applied+verified hardening before future sync
INV-SYNC-011 retired Recovery Key cannot decrypt future-only epochs
```

The formal Recovery traceability promotion remains bounded to `INV-SYNC-008..011 = PROVEN_AT_SPIKE`. The new key-authority tests provide additional executable support to already-wired `INV-TEN-005` and `INV-SYNC-003`; no release-grade promotion is inferred from this artifact alone.

## Architecture implication

The bounded model now supports this stronger ownership topology:

```text
Tenant T / Epoch N
   │
   ├─ DeviceAuthorization(A,T,N) ──► DeviceKeyWrap(A,T,N)
   ├─ DeviceAuthorization(B,T,N) ──► DeviceKeyWrap(B,T,N)
   └─ authorized signer in T,N ────► RecoveryEpochWrap(T,N,RK)

Cloud
   stores public/minimized authorization metadata + opaque wraps
   does not hold Recovery Private Key or tenant root-key authority

User Recovery Kit
   holds Recovery Private Key authority
```

This rejects both a standing server master key and “valid signature = valid authority” shortcuts.

## Recovery coverage invariant

A key epoch cannot be advertised as recoverable merely because a Recovery Public Key or ciphertext exists.

```text
DECLARED RECOVERABLE EPOCH
        ↓
matching tenant_id
matching recovery_key_id
matching key_epoch
        +
exact authorizer identity
        +
authorizer authorized for tenant + epoch
        +
valid framing/signature
        +
exactly one distinct authentic authority
        ↓
RECOVERY-COVERED
```

Missing, invalid or ambiguous coverage is an explicit failure. Exact duplicate relay delivery is harmless.

## Post-recovery hardening invariant

A successful disaster recovery does not reactivate lost devices or continue on the recovered historical epoch:

```text
restore through epoch N
        ↓
new device authorization ACTIVE from N+1
lost devices REVOKED from N+1
new tenant epoch N+1 APPLIED
new Recovery Key APPLIED
RecoveryCoverage(N+1) VERIFIED
        ↓
READY_FOR_FUTURE_SYNC
```

`REC-018` proves the bounded fail-closed gate. It rejects stale tenant epoch, stale Recovery Key and incomplete lost-device revocation before accepting the complete state.

This remains a logical/spike proof. Physical device enrollment/revocation and real key generation remain future evidence.

## Explicit unrecoverable state

The model intentionally preserves:

```text
all devices lost
+
Recovery Kit lost
=
no cryptographic recovery path
```

FinanceSensor must not silently substitute a server backdoor for this state. Provider data may later be re-imported where sources still retain it, but local-only state may be unrecoverable.

## Graph reconciliation

The authoritative ledger deliberately preserves:

```text
Q-005   ACTIVE
S-002   ACTIVE
T-002   PASS
G-MK0   BLOCKED
BUILD_READY false
```

No `CLOSED` or release-grade `PROVEN` state is inferred from a synthetic spike.

## Governance arrhythmias previously found and corrected

### ADR identity collision

The pre-existing ADR index already reserved `ADR-005` for transaction fingerprint/resolver strategy. Recovery therefore uses:

```text
ADR-014 — All-Devices-Lost Recovery Without a Server Master Key
```

The duplicate experimental ADR-005 recovery file was removed and CI guards against its reintroduction.

### Node status vs ADR maturity

`Q-005` is an owner graph node and remains `ACTIVE`. `SPIKE-ACCEPTED` describes the maturity of the Recovery decision, not the node status.

```text
Owner node: Q-005 (ACTIVE)
Decision maturity: SPIKE-ACCEPTED / PHYSICAL VALIDATION REQUIRED
```

## What this evidence does NOT prove

- reviewed production HPKE implementation correctness;
- Android ↔ iOS cryptographic interoperability;
- Android Keystore/StrongBox physical behavior;
- Apple Keychain/Secure Enclave physical behavior;
- secure Recovery Kit export/import UX;
- screenshot/clipboard/backup leakage behavior;
- account-authentication hardening during disaster recovery;
- real control-plane tenant authorization enforcement;
- real cloud authorization around recovery-wrap retrieval;
- real tenant deletion of recovery metadata/backups;
- real crash/restart/long-offline recovery behavior;
- physical all-devices-lost recovery;
- physical post-recovery device revocation and epoch/Recovery-Key rotation;
- side-channel resistance;
- penetration-test results;
- long-term recovery-key retention policy.

## Closure effect

```text
ADR-014 ownership/readiness model       SPIKE-ACCEPTED
RECOVERY TESTS                          18 / 18 PASS
KEY AUTHORITY LOAD TESTS                 5 / 5 PASS
E2EE/KEY/RECOVERY/PNS                   51 / 51 PASS
INV-SYNC-008..011                       PROVEN_AT_SPIKE
ALL_DEVICES_LOST_RECOVERY_DESIGN        DECIDED AT LOGICAL/SPIKE LEVEL
PHYSICAL_RECOVERY                       OPEN
PRODUCTION_CRYPTO                       OPEN
REAL CONTROL-PLANE AUTHORIZATION        OPEN
Q-005                                   ACTIVE
BUILD_READY                             NO
```

The next evidence level must move these contracts from Node feasibility to a reviewed production construction, real tenant authorization enforcement and physical mobile implementation.
