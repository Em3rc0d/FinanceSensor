# ADR-014 — All-Devices-Lost Recovery Without a Server Master Key

**Owner node:** Q-005 (`ACTIVE`)  
**Decision maturity:** SPIKE-ACCEPTED / PHYSICAL VALIDATION REQUIRED  
**Date:** 2026-09-01

## Context

FinanceSensor needs an explicit answer to:

> What happens when every authorized device is lost, destroyed or unavailable?

A convenient answer would be for FinanceSensor cloud to retain a master decryption key. That answer is rejected because it would give the control plane a standing capability to decrypt tenant financial truth and would materially weaken the privacy thesis.

A human password alone is also rejected for MK0 because an encrypted cloud recovery envelope creates an offline guessing target if the server dataset is stolen.

## Decision

Use an **asymmetric Recovery Key** independent from device keys.

```text
Tenant setup
    ↓
generate Recovery Keypair locally
    ↓
Recovery Public Key  ───────────────► minimized tenant metadata
Recovery Private Key ───────────────► user Recovery Kit only
    ↓
device confirms Recovery Kit saved
    ↓
private recovery material removed from ordinary app state
```

For every tenant key epoch declared recoverable:

```text
Tenant Epoch Key N
   ├─ production wrap → Device A public key
   ├─ production wrap → Device B public key
   └─ production wrap → Recovery Public Key
```

The cloud may store ciphertext wraps and minimum routing/version metadata. It never possesses the Recovery Private Key.

## Normal operation

Devices need only the recovery **public** key to create a recovery wrap for every new recoverable epoch. Therefore ordinary devices do not need to retain the Recovery Private Key, and a revoked device cannot use public recovery material to decrypt future epochs.

Creation of a recovery-wrap ciphertext does not itself make an epoch recoverable. Coverage is granted only after validation against tenant-scoped, epoch-scoped authorization evidence.

## Recovery coverage rule

A tenant epoch is not considered recoverable merely because a Recovery Public Key or recovery-wrap ciphertext exists.

```text
recoverable epoch N
        ↓
matching tenant_id
matching recovery_key_id
matching key_epoch
        +
header.authorizing_device_id = authorization-record device_id
        +
authorizer authorized for same tenant + epoch
        +
framing/signature authentic
        +
exactly one DISTINCT authentic authority for that epoch
        ↓
RECOVERY-COVERED
```

A missing, tampered, incorrectly signed, cross-tenant or unauthorized-authorizer wrap cannot count as coverage.

Exact duplicate delivery of the **same authenticated package** is idempotent. Multiple **distinct authentic** recovery packages for the same declared tenant/Recovery-Key/epoch are treated as ambiguous and fail closed until an explicit reconciliation model exists. The system must not arbitrarily select one by relay arrival order.

## All-devices-lost sequence

```text
user authenticates account
        ↓
new device requests opaque recovery wraps
        ↓
user imports Recovery Kit locally
        ↓
new device validates authenticated/non-ambiguous recovery coverage
        ↓
new device unwraps required tenant epochs locally
        ↓
financial history becomes decryptable locally
        ↓
new hardware-backed device identity generated
        ↓
lost device authorizations revoked from N+1
        ↓
new device authorization activated from N+1
        ↓
new tenant epoch N+1 generated/applied
        ↓
new Recovery Keypair generated/applied
        ↓
new Recovery Kit confirmed
        ↓
RecoveryEpochWrap N+1 authenticated under new Recovery Key
        ↓
old Recovery Key retired for future epochs
        ↓
lower-level post-recovery readiness gate passes
        ↓
new device freezes accepted historical origin stream
for every lost device in an authenticated Revocation Barrier
        ↓
final safe-to-resume gate passes
        ↓
normal future sync resumes
```

Recovery is not permission to silently reactivate lost devices or continue indefinitely on historical key material.

## Why lower-level revocation is not enough

A lost device revoked from epoch `N+1` may still hold:

```text
Tenant Root Key N
+
its historical signing private key
```

Therefore it may still be able to manufacture a cryptographically valid envelope *after* revocation while labeling it as historical epoch `N`.

A receiver that retains epoch N for legitimate history cannot infer creation time merely from a valid old signature.

Hence:

```text
VALID OLD SIGNATURE + OLD TENANT KEY
        ≠
POST-CUTOVER HISTORICAL AUTHORITY
```

The accepted historical origin stream for every lost device must be frozen by an authenticated Revocation Barrier before normal future synchronization resumes.

Detailed contract:

`../04-architecture/REVOCATION-CUTOVER.md`

## Lower-level post-recovery readiness rule

A recovery **plan** is not permission to resume future sync.

Before the final cutover is even considered, executable state must verify all of:

```text
current tenant key epoch = N+1
new Recovery Key is active
new device is ACTIVE from N+1 for the same tenant
all declared lost devices are REVOKED from N+1
N+1 has authenticated/non-ambiguous RecoveryCoverage under the new Recovery Key
```

Any missing condition fails closed. This distinction is intentional:

```text
PLANNED HARDENING ≠ APPLIED HARDENING ≠ VERIFIED LOWER-LEVEL READY STATE
```

## Final safe-to-resume rule

Lower-level readiness is necessary but not sufficient.

Before normal future synchronization resumes, every lost device must also have an authenticated cutover barrier signed by the newly authorized recovery device (or an equivalent trusted authority in a non-disaster revocation flow):

```text
LOWER-LEVEL READY
        +
RevocationBarrier(lost device A)
        +
RevocationBarrier(lost device B)
        +
...
        ↓
SAFE_TO_RESUME_FUTURE_SYNC
```

Each barrier binds at minimum:

```text
tenant_id
revoked_device_id
revoked_from_epoch
last_accepted_origin_sequence
history_commitment
authorizing_device_id
signature
```

A missing or tampered barrier keeps future sync blocked.

Known sequence gaps through the chosen cutoff cannot be silently certified as complete. The system either resolves the gap or freezes a lower contiguous accepted prefix with the corresponding availability tradeoff.

## Server capability

Server stores only the minimum required recovery/revocation-plane material, conceptually:

```text
recovery_key_id
recovery_public_key
key_epoch
opaque recovery-wrap ciphertext
minimum suite/version/routing metadata
tenant-scoped authorization metadata needed for verification
signed Revocation Barrier metadata
```

Server cannot decrypt a tenant epoch from those values alone.

The Revocation Barrier is security-sensitive metadata but contains no required financial payload plaintext.

## Failure semantics

### All devices lost + Recovery Kit available

```text
CRYPTOGRAPHIC RECOVERY POSSIBLE
```

subject to account authentication, compatible client version, valid authenticated/non-ambiguous recovery coverage and intact historical authorization records needed to authenticate wraps.

### Cryptographic recovery completed + one lost-device barrier missing

```text
HISTORY MAY BE RECOVERED
BUT FUTURE SYNC REMAINS BLOCKED
```

until the accepted historical cutover for every lost device is frozen.

### All devices lost + required coverage missing/invalid/ambiguous

```text
CRYPTOGRAPHIC RECOVERY BLOCKED FOR AFFECTED EPOCH
```

The application must not silently downgrade the guarantee or choose an ambiguous wrap by arrival order.

### All devices lost + Recovery Kit also lost

```text
CRYPTOGRAPHIC RECOVERY IMPOSSIBLE
```

FinanceSensor must say this plainly. The application may rebuild whatever is still obtainable from source providers after reconnecting them, but local-only corrections, historical source data no longer available upstream, annotations or other unrecoverable state may be lost.

No hidden server bypass is permitted.

## Why asymmetric recovery instead of a symmetric recovery secret stored on devices

If ordinary devices held a reusable symmetric recovery secret so they could update recovery envelopes, a revoked device possessing that secret could potentially decrypt future recovery material. A public Recovery Key solves the update problem without giving ordinary devices recovery decryption authority.

## Why not password-only recovery in MK0

A user-chosen password has uncertain entropy. If cloud recovery ciphertext is stolen, an attacker may perform offline guesses. A future password-protected Recovery Kit may use a reviewed memory-hard KDF, but the underlying recovery authority must remain high-entropy cryptographic material.

## Recovery Kit UX is not frozen here

Possible representations include a file/QR and a human-transcribable high-entropy encoding with checksum. This ADR freezes the cryptographic ownership model, authenticated coverage semantics, lower-level post-recovery hardening and final revoked-origin cutover requirement, not the final UX representation.

Do not import cryptocurrency wallet language/mechanics into consumer UX unless it improves comprehension and is directly justified.

## Security properties demonstrated at spike level

```text
REC-001..REC-018 recovery ownership + authenticated coverage + lower-level hardening
KEY-001..KEY-005 tenant/epoch/identity key authority
REV-001..REV-007 authenticated revoked-origin historical cutover
REC-019..REC-022 final safe-to-resume cutover gate
```

Key new load-bearing cases:

```text
REV-001 committed history tolerates reorder/exact duplicate relay delivery
REV-002 revoked device cannot append fabricated old-epoch history after cutover
REV-003 replacement of committed historical sequence fails
REV-004 cutoff/history commitment tampering invalidates barrier signature
REV-005 revoked device cannot certify its own cutover
REV-006 cross-tenant cutover authority rejected
REV-007 unresolved origin gap prevents complete cutover
REC-019 lower-level hardening is not final resume authority
REC-020 all lost-device barriers permit safe resume
REC-021 missing one barrier blocks safe resume
REC-022 tampered barrier blocks safe resume
```

Evidence:

- `mk0/10-evidence/EV-Q005-RECOVERY-ELECTROSHOCK-2026-09-01.md`
- `mk0/10-evidence/EV-Q005-REVOCATION-CUTOVER-2026-09-01.md`

Observed bounded suite on executable commit `0d4f3b2cbf57dee811480268bab19d2ee3a5a101`:

```text
E2EE/KEY/RECOVERY/REVOCATION/PNS  62 / 62 PASS
REVOCATION CUTOVER                  7 / 7 PASS
POST-RECOVERY CUTOVER               4 / 4 PASS
MK0 FOUNDATION                      3 / 3 PASS
```

## Non-goals for MK0

- social/trusted-contact recovery;
- Shamir secret sharing;
- server-held escrow master key;
- password-only recovery;
- silent platform-cloud backup of Recovery Private Key material;
- pretending a revoked device can be forced to forget historical plaintext it already possessed;
- claiming Byzantine availability against a relay that withholds data.

## Production suite interaction

Recovery wraps must use a reviewed production construction/library. HPKE remains the leading direction, but the spike implementation is deliberately **not** the production cryptographic suite.

The cross-platform device-wrap candidate remains aligned around a suite that can be implemented safely on both Android and Apple platforms; final algorithm/library choice is still security-review work.

The production implementation must preserve the spike's **authorization semantics**, not only its cryptographic primitive choices: tenant binding, epoch binding, exact authorizer identity, recipient checks where applicable, authenticated coverage, ambiguity failure, revoked-origin historical commitment and the final post-recovery cutover gate are part of the decision.

The digest-set history commitment in the spike is not a frozen production representation. Production must select a reviewed append-only mechanism such as a hash chain, Merkle/checkpoint design or equivalent.

See:

`research/Q005-PRODUCTION-CRYPTO-2026-SOURCES.md`

## Decision state

```text
SERVER_MASTER_KEY                  REJECTED
PASSWORD_ONLY_RECOVERY             REJECTED FOR MK0
RECOVERY_PUBLIC_KEY                ACCEPTED AT LOGICAL/SPIKE LEVEL
RECOVERY_PRIVATE_KEY               USER-HELD / OFFLINE
PER_EPOCH_RECOVERY_WRAP            REQUIRED
AUTHENTICATED_RECOVERY_COVERAGE    REQUIRED
AMBIGUOUS_RECOVERY_COVERAGE        FAIL CLOSED
EXACT_WRAP_REPLAY                  IDEMPOTENT
POST-RECOVERY DEVICE HARDEN        REQUIRED
POST-RECOVERY EPOCH ROTATION       REQUIRED
POST-RECOVERY KEY ROTATION         REQUIRED
POST-RECOVERY COVERAGE N+1         REQUIRED
LOWER_LEVEL_READINESS_GATE         REQUIRED
REVOCATION_BARRIER                 REQUIRED FOR LOST/REVOKED ORIGIN CUTOVER
STALE_EPOCH_POST_CUTOVER_HISTORY   REJECTED
UNRESOLVED_CUTOVER_GAP             FAIL CLOSED
FINAL_SAFE_TO_RESUME_GATE          REQUIRED
PHYSICAL MOBILE RECOVERY           OPEN
PRODUCTION CRYPTO SUITE            OPEN
PRODUCTION HISTORY COMMITMENT      OPEN
```

## Why this ADR is not release-grade `PROVEN`

The spike proves the ownership, authorization, historical-cutover and state-transition model only. Q-005 remains `ACTIVE` and still requires reviewed production crypto/history-commitment construction, physical Android/iOS key behavior, Android↔iOS interoperability, real control-plane authorization, recovery-kit handling, barrier persistence/deletion and physical disaster-recovery evidence before release closure.
